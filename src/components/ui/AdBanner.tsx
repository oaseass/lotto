'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

interface AdBannerProps {
  slot?: string
  format?: 'banner' | 'rectangle'
  isAdFree?: boolean
}

export function AdBanner({ slot = 'default', format = 'banner', isAdFree = false }: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!AD_CLIENT || isAdFree) return
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adsbygoogle = (window as any).adsbygoogle || []
      adsbygoogle.push({})
    } catch {}
  }, [isAdFree])

  if (isAdFree || !AD_CLIENT) return null

  return (
    <div ref={adRef} style={{
      width: '100%', overflow: 'hidden', borderRadius: 14,
      background: 'var(--bg-card)', border: '1px solid var(--line)',
      minHeight: 60,
    }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format === 'rectangle' ? 'rectangle' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function AdRemovePrompt({ isAdFree = false }: { isAdFree?: boolean }) {
  if (isAdFree || !AD_CLIENT) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 12,
      border: '1px solid var(--line)',
    }}>
      <span style={{ fontSize: 12, color: 'var(--t3)' }}>광고가 불편하신가요?</span>
      <Link href="/payment/ad-free" style={{
        fontSize: 12, fontWeight: 700, color: 'var(--amber)', textDecoration: 'none',
      }}>
        ₩5,000으로 영구 제거 →
      </Link>
    </div>
  )
}
