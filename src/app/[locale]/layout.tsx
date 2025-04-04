import '@/styles/globals.css'
import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Locale, locales } from '../../../i18n/config'
import { setRequestLocale, getLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

import { getSiteConfig } from '@/config/site-i18n'
import { fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'
import { SiteHeader } from '@/components/site-header'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params: nonAwaitedParams,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const params = await nonAwaitedParams;
  const locale = params.locale as Locale;
  await setRequestLocale(locale);
  
  const siteConfig = getSiteConfig(locale)
  
  // Set different title formats based on locale
  const pageTitle = locale === 'zh-cn' 
    ? 'CodeTok - 分享AI作品，连接美好世界' 
    : 'CodeTok - Sharing AI Projects To Connect A Better World';
  
  return {
    title: {
      default: pageTitle,
      template: `%s - ${siteConfig.name}`,
    },
    description: siteConfig.description,
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
  }
}

export default async function RootLayout({
  children,
  params: nonAwaitedParams,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const params = await nonAwaitedParams;
  const locale = params.locale as Locale;
  await setRequestLocale(locale);
  
  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Could not load messages for locale ${locale}`, error);
    messages = {};
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable,
          inter.className,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="relative flex min-h-screen flex-col">
              <SiteHeader locale={locale} />
              <div className="flex-1">{children}</div>
            </div>
            <TailwindIndicator />
            <Toaster />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
