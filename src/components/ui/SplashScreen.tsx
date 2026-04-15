'use client'

import { useEffect, useState } from 'react'

const SHOW_DURATION = 1800
const FADE_DURATION = 400

export function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    setVisible(true)
    const fadeTimer = setTimeout(() => setFading(true), SHOW_DURATION)
    const hideTimer = setTimeout(() => setVisible(false), SHOW_DURATION + FADE_DURATION)
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer) }
  }, [])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#060d25',
      opacity: fading ? 0 : 1,
      transition: `opacity ${FADE_DURATION}ms ease-out`,
      pointerEvents: fading ? 'none' : 'auto',
    }}>
      <img
        src="/splash.png"
        alt="사주로또"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
      />
    </div>
  )
}
