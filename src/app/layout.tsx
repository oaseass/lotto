// ================================
// 루트 레이아웃
// ================================

import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'
import { Providers } from '@/components/ui/Providers'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: '사주로또 - 내 사주에 맞는 로또 번호',
  description: '생년월일과 생시를 입력하면 사주에 맞는 로또 번호를 추출해드립니다',
  manifest: '/manifest.json',
  themeColor: '#F5C842',
  openGraph: {
    title: '사주로또',
    description: '내 사주에 맞는 로또 번호',
    type: 'website',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="ko" className="dark">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <Providers session={session}>
          <SplashScreen />
          {children}
        </Providers>
      </body>
    </html>
  )
}
