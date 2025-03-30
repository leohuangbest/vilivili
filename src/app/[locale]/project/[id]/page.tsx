'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Locale } from '../../../../../i18n/config'
import { renderTSX } from '@/lib/tsx-compiler'

interface ProjectData {
  projectId: string
  title?: string
  description?: string
  files: string[]
  mainFile: string
  fileContents: Record<string, string>
  hasTsxFiles?: boolean
  views?: number
  createdAt?: string
}

export default function ProjectPage() {
  const params = useParams()
  const locale = params.locale as Locale
  const projectId = params.id as string
  
  const [projectData, setProjectData] = useState<ProjectData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showingFrame, setShowingFrame] = useState(true)
  const tsxPreviewRef = useRef<HTMLDivElement>(null)
  
  // 互动状态
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [commentsCount, setCommentsCount] = useState(0)
  
  // 渐进式加载状态
  const [basicInfoLoaded, setBasicInfoLoaded] = useState(false)
  const [filesLoaded, setFilesLoaded] = useState(false)
  
  // 加载项目数据 - 使用渐进式加载
  useEffect(() => {
    // 创建一个基本信息加载完成的标志
    let isMounted = true
    
    const fetchProjectData = async () => {
      try {
        const apiUrl = `/api/projects/${projectId}`;
        
        // 先显示加载状态
        setIsLoading(true)
        
        // 使用AbortController以便在组件卸载时取消请求
        const controller = new AbortController()
        const signal = controller.signal
        
        // 发起请求
        const response = await fetch(apiUrl, { signal })
        
        if (!isMounted) return
        
        if (response.status === 404) {
          document.location.href = `/${locale}/not-found`;
          return;
        }
        
        if (!response.ok) {
          throw new Error(
            locale === 'zh-cn' 
              ? '无法加载项目，请检查链接是否正确'
              : 'Failed to load project, please check if the link is correct'
          )
        }
        
        // 直接解析JSON数据，不要尝试同时使用getReader()和json()
        const data = await response.json()
        
        if (!isMounted) return
        
        // 设置基本项目信息，允许UI开始渲染核心内容
        setProjectData(data)
        setSelectedFile(data.mainFile)
        setBasicInfoLoaded(true)
        
        // 如果文件列表加载完成，也标记加载状态为完成
        if (data.fileContents && Object.keys(data.fileContents).length > 0) {
          setFilesLoaded(true)
          setIsLoading(false)
        }
        
        // 预加载下一个随机项目数据
        prefetchNextProject()
        
      } catch (error) {
        if (!isMounted) return
        
        console.error('Error loading project:', error)
        setError(
          typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : locale === 'zh-cn' 
              ? '加载项目失败'
              : 'Failed to load project'
        )
        setIsLoading(false)
      }
    }
    
    fetchProjectData()
    
    // 清理函数
    return () => {
      isMounted = false
    }
  }, [projectId, locale])
  
  // 预加载下一个随机项目的数据
  const prefetchNextProject = async () => {
    try {
      // 使用 fetchPriority 降低此请求的优先级，不干扰当前页面加载
      const response = await fetch('/api/projects/random', {
        priority: 'low',
      } as RequestInit) // 使用类型断言
      
      // 只预取数据但不会处理，以便将其缓存在浏览器中
      if (response.ok) {
        const data = await response.json()
        
        // 预加载项目页面
        const nextPageUrl = `/${locale}/project/${data.projectId}`
        const link = document.createElement('link')
        link.rel = 'prefetch'
        link.href = nextPageUrl
        document.head.appendChild(link)
      }
    } catch (error) {
      // 静默失败，这只是优化
      console.warn('Error prefetching next project:', error)
    }
  }
  
  // 渲染加载状态的骨架屏
  const renderSkeleton = () => {
    return (
      <div className="animate-pulse">
        <div className="flex flex-1 overflow-hidden">
          {/* 文件列表骨架 */}
          <div className="w-64 bg-gray-100 p-4 border-r">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
              ))}
            </div>
          </div>
          
          {/* 主内容区骨架 */}
          <div className="flex-1 flex flex-col overflow-hidden relative p-4">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="flex-1 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  
  // 跳转到随机项目 - 优化为使用URL替换而不是整页刷新
  const handleRandomProject = async () => {
    try {
      // 先显示加载状态，同时保留当前页面
      setIsLoading(true)
      
      const response = await fetch('/api/projects/random')
      
      if (!response.ok) {
        throw new Error(
          locale === 'zh-cn' 
            ? '无法加载随机项目'
            : 'Failed to load random project'
        )
      }
      
      const data = await response.json()
      
      // 使用history.pushState替代整页刷新，保持已加载的资源
      const nextUrl = `/${locale}/project/${data.projectId}`
      window.history.pushState({}, '', nextUrl)
      
      // 重新加载项目数据
      setProjectData(data)
      setSelectedFile(data.mainFile)
      setBasicInfoLoaded(true)
      
      // 如果文件列表加载完成，标记加载状态为完成
      if (data.fileContents && Object.keys(data.fileContents).length > 0) {
        setFilesLoaded(true)
        setIsLoading(false)
      } else {
        setFilesLoaded(false)
      }
    } catch (error) {
      console.error('Error loading random project:', error)
      setIsLoading(false)
      alert(
        locale === 'zh-cn' 
          ? '加载随机项目失败，请稍后再试'
          : 'Failed to load random project, please try again later'
      )
    }
  }

  // 跳转到下一个随机项目 - 使用相同的优化逻辑
  const handleNextProject = async () => {
    // 重用优化后的随机项目导航逻辑
    handleRandomProject()
  }
  
  // 滑动手势初始化
  useEffect(() => {
    let touchstartX = 0
    let touchendX = 0
    let touchstartY = 0
    let touchendY = 0
    
    const handleTouchStart = (e: TouchEvent) => {
      touchstartX = e.changedTouches[0].screenX
      touchstartY = e.changedTouches[0].screenY
    }
    
    const handleTouchEnd = (e: TouchEvent) => {
      touchendX = e.changedTouches[0].screenX
      touchendY = e.changedTouches[0].screenY
      handleSwipeGesture()
    }
    
    const handleSwipeGesture = () => {
      // 上滑超过50像素，加载下一个项目
      if (touchendY < touchstartY - 50) {
        handleNextProject()
      }
      // 下滑超过50像素，也加载一个随机项目
      else if (touchendY > touchstartY + 50) {
        handleRandomProject()
      }
    }
    
    // 添加滑动手势事件监听
    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])
  
  const toggleFrame = () => {
    setShowingFrame(!showingFrame)
  }
  
  const getFileType = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html': return 'HTML'
      case 'css': return 'CSS'
      case 'js': case 'jsx': case 'ts': case 'tsx': return 'JavaScript'
      default: return 'Code'
    }
  }
  
  // 是否为TSX文件
  const isTsxFile = selectedFile?.endsWith('.tsx')
  
  // 获取文件的MIME类型
  const getMimeType = (filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'html': return 'text/html'
      case 'css': return 'text/css'
      case 'js': return 'application/javascript'
      case 'jsx': case 'ts': case 'tsx': return 'application/javascript'
      case 'json': return 'application/json'
      case 'xml': return 'application/xml'
      case 'svg': return 'image/svg+xml'
      case 'png': return 'image/png'
      case 'jpg': case 'jpeg': return 'image/jpeg'
      case 'gif': return 'image/gif'
      default: return 'text/plain'
    }
  }
  
  // 为HTML内容创建完整的HTML结构
  const createFullHtml = (content: string, filename: string): string => {
    // 如果是HTML文件且不包含DOCTYPE或HTML标签，添加基本结构
    if (filename.endsWith('.html') && !content.toLowerCase().includes('<!doctype') && !content.toLowerCase().includes('<html')) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${filename}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body>
${content}
</body>
</html>`;
    }
    return content;
  }
  
  // 构建预览URL
  const previewUrl = showingFrame && projectData?.mainFile
    ? projectData.fileContents[projectData.mainFile].startsWith('http')
      ? projectData.fileContents[projectData.mainFile]
      : projectData.mainFile.endsWith('.html')
        ? `data:${getMimeType(projectData.mainFile)};charset=utf-8,${encodeURIComponent(createFullHtml(projectData.fileContents[projectData.mainFile], projectData.mainFile))}`
        : '' // 非HTML文件不使用iframe预览
    : ''
    
  // 是否显示代码编辑器视图（在带框架模式中非HTML文件也显示为代码）
  const showCodeView = !showingFrame || (showingFrame && !projectData?.mainFile.endsWith('.html'))
  
  // 渲染函数改进，支持渐进式加载
  if (isLoading && !basicInfoLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto mb-4"></div>
          <p>{locale === 'zh-cn' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    )
  }
  
  if (error || !projectData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            {locale === 'zh-cn' ? '错误' : 'Error'}
          </h1>
          <p className="mb-6">{error}</p>
          <Link href={`/${locale}`}>
            <Button>
              {locale === 'zh-cn' ? '返回首页' : 'Back to Home'}
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-screen">
      {/* 主体内容 - 左右8:2布局 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧主内容区 (80%) */}
        <div className="w-4/5 flex flex-col relative overflow-hidden">
          {/* 上下滑动按钮 - TikTok风格 */}
          <div className="absolute right-4 bottom-4 z-10 flex flex-col gap-2">
            {/* 上滑按钮 */}
            <button 
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
              aria-label={locale === 'zh-cn' ? '上一个项目' : 'Previous project'}
              onClick={handleRandomProject}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            
            {/* 下滑按钮 */}
            <button 
              className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
              aria-label={locale === 'zh-cn' ? '下一个项目' : 'Next project'}
              onClick={handleNextProject}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
          
          {showingFrame && projectData.mainFile.endsWith('.html') ? (
            // HTML预览
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Code Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
            />
          ) : (
            // 代码编辑器视图 - 简化，只显示当前选择的文件
            <div className="flex flex-col h-full">
              {selectedFile && (
                <>
                  <div className="bg-gray-800 text-white py-2 px-4 text-sm font-mono flex justify-between items-center">
                    <div>{selectedFile} - {getFileType(selectedFile)}</div>
                    {isTsxFile && (
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-blue-600 text-xs rounded">TSX</span>
                      </div>
                    )}
                  </div>
                  
                  {isTsxFile ? (
                    // TSX文件预览模式
                    <div className="flex flex-col h-full">
                      <div className="bg-gray-50 flex-1 overflow-auto">
                        {/* TSX编译预览区 */}
                        <div ref={tsxPreviewRef} className="h-full w-full"></div>
                      </div>
                      <div className="bg-gray-100 p-2 border-t">
                        <div className="font-mono text-xs p-2 bg-white rounded border">
                          <pre className="whitespace-pre-wrap">{projectData.fileContents[selectedFile]}</pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // 普通代码预览
                    <pre className="flex-1 overflow-auto p-4 bg-gray-50 font-mono text-sm">
                      {projectData.fileContents[selectedFile]}
                    </pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        
        {/* 右侧交互区 (20%) */}
        <div className="w-1/5 border-l bg-gray-50 flex flex-col">
          {/* 项目信息区 */}
          <div className="p-4 border-b">
            {projectData.title && (
              <h2 className="font-medium text-lg mb-2 line-clamp-2">{projectData.title}</h2>
            )}
            {projectData.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-3">{projectData.description}</p>
            )}
            {projectData.createdAt && (
              <div className="text-xs text-gray-500">
                {new Date(projectData.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
          
          {/* 文件选择区 */}
          {projectData.files.length > 1 && (
            <div className="p-4 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {locale === 'zh-cn' ? '文件' : 'Files'}
              </label>
              <select 
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedFile || ''}
                onChange={(e) => setSelectedFile(e.target.value)}
              >
                {projectData.files.map(file => (
                  <option key={file} value={file}>{file}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* 主要功能按钮 */}
          <div className="p-4 border-b">
            <div className="flex flex-col gap-3">
              {/* 随机项目按钮 */}
              <button
                onClick={handleRandomProject}
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-md py-2 px-3 text-sm font-medium transition-colors"
                disabled={isLoading}
              >
                <span className={`text-xl ${isLoading ? '' : 'group-hover:animate-spin'}`}>🎲</span>
                <span>{locale === 'zh-cn' ? '随机项目' : 'Random Project'}</span>
              </button>
              
              {/* 查看代码/预览切换按钮 */}
              <button
                onClick={toggleFrame}
                className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-300 rounded-md py-2 px-3 text-sm font-medium transition-colors"
                disabled={isLoading}
              >
                {showingFrame ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"></polyline>
                      <polyline points="8 6 2 12 8 18"></polyline>
                    </svg>
                    <span>{locale === 'zh-cn' ? '查看代码' : 'View Code'}</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>{locale === 'zh-cn' ? '查看效果' : 'View Preview'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* 交互按钮区 */}
          <div className="p-4 flex flex-col gap-3">
            {/* 点赞按钮 */}
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="flex items-center justify-center gap-2 hover:bg-gray-100 rounded-md py-2 px-3 text-sm transition-colors"
            >
              {isLiked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#f43f5e" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              )}
              <span>{locale === 'zh-cn' ? '点赞' : 'Like'}</span>
              <span className="text-gray-500">{likesCount > 0 ? likesCount : ''}</span>
            </button>
            
            {/* 评论按钮 */}
            <button 
              className="flex items-center justify-center gap-2 hover:bg-gray-100 rounded-md py-2 px-3 text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>{locale === 'zh-cn' ? '评论' : 'Comment'}</span>
              <span className="text-gray-500">{commentsCount > 0 ? commentsCount : ''}</span>
            </button>
            
            {/* 收藏按钮 */}
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="flex items-center justify-center gap-2 hover:bg-gray-100 rounded-md py-2 px-3 text-sm transition-colors"
            >
              {isBookmarked ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
              )}
              <span>{locale === 'zh-cn' ? '收藏' : 'Save'}</span>
            </button>
            
            {/* 分享按钮 */}
            <button 
              className="flex items-center justify-center gap-2 hover:bg-gray-100 rounded-md py-2 px-3 text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
              <span>{locale === 'zh-cn' ? '分享' : 'Share'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 