"use client"

import * as React from 'react'
import { Link } from '@/navigation'
import Image from 'next/image'
import { useTheme } from "next-themes"

import { NavItem } from '@/types/nav'
import { getSiteConfig } from '@/config/site-i18n'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/icons'
import { Locale } from '../../i18n/config'

interface MainNavProps {
  items?: NavItem[]
  locale: Locale
}

export function MainNav({ items, locale }: MainNavProps) {
  const siteConfig = getSiteConfig(locale)

  return (
    <div className="flex items-center justify-center">
      <Link href="/" className="flex items-center gap-2">
        <Image 
          src="/favicon.png" 
          alt="CodeTok Logo" 
          width={36} 
          height={36} 
          className="rounded-sm"
        />
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {siteConfig.name}
          </h1>
          <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md font-medium">
            Beta
          </span>
        </div>
      </Link>
      {items?.length ? (
        <nav className="flex gap-6">
          {items?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    'flex items-center text-sm font-medium text-muted-foreground hover:text-foreground',
                    item.disabled && 'cursor-not-allowed opacity-80',
                  )}
                >
                  {item.title}
                </Link>
              ),
          )}
        </nav>
      ) : null}
    </div>
  )
}
