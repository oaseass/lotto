'use client'

import { useEffect, useState } from 'react'

export function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    // 가능하면 OS 레벨에서 세로 고정
    if (typeof screen !== 'undefined' && (screen.orientation as any)?.lock) {
      ;(screen.orientation as any).lock('portrait').catch(() => {})
    }

    const check = () => {
      // 1024px 미만 = 모바일만 차단 (데스크톱은 제외)
      setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth < 1024)
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
    }
  }, [])

  if (!isLandscape) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: '#1a1a1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16,
    }}>
      <div style={{ fontSize: 52 }}>📱</div>
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
        세로 화면으로 회전해주세요
      </p>
      <p style={{ color: '#aaa', fontSize: 13 }}>
        이 앱은 세로 모드에 최적화되어 있습니다
      </p>
    </div>
  )
}
