'use client'

import { useEffect, useState } from 'react'

const SHOW_DURATION = 1800
const FADE_DURATION = 400

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [imgReady, setImgReady] = useState(false)

  useEffect(() => {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const navType = entries.length > 0
      ? entries[0].type
      : ((performance as any).navigation?.type === 0 ? 'navigate' : 'reload')

    if (navType !== 'navigate') {
      setVisible(false)
      return
    }

    // 이미 캐시된 경우 즉시 준비
    const img = new Image()
    img.onload = () => setImgReady(true)
    img.src = '/splash.jpg'
    if (img.complete) setImgReady(true)

    const fadeTimer = setTimeout(() => setFading(true), SHOW_DURATION)
    const hideTimer = setTimeout(() => setVisible(false), SHOW_DURATION + FADE_DURATION)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#f5f5f5',
      opacity: fading ? 0 : 1,
      transition: `opacity ${FADE_DURATION}ms ease-out`,
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <img
        src="/splash.jpg"
        alt="사주로또"
        onLoad={() => setImgReady(true)}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          opacity: imgReady ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </div>
  )
}
