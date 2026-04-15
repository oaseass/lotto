'use client'

import { useEffect, useState } from 'react'

const SHOW_DURATION = 1800  // ms before fade starts
const FADE_DURATION = 400   // ms for fade-out transition

export function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // 세션당 1회만 표시 (페이지 이동 시에는 안 나옴)
    if (typeof sessionStorage === 'undefined') return
    if (sessionStorage.getItem('splash_shown')) return

    sessionStorage.setItem('splash_shown', '1')
    setVisible(true)

    const fadeTimer = setTimeout(() => setFading(true), SHOW_DURATION)
    const hideTimer = setTimeout(() => setVisible(false), SHOW_DURATION + FADE_DURATION)

    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#060d25',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <img
        src="/splash.jpg"
        alt="사주로또"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
        }}
      />
    </div>
  )
}
