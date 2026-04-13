'use client'

import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import type { Session } from 'next-auth'
import { PushPermission } from '@/components/push/PushPermission'

function SyncInitializer() {
  useEffect(() => {
    let isMounted = true

    // 앱 시작 시 최신 데이터 동기화
    const syncLatestData = async () => {
      try {
        const res = await fetch('/api/lotto/draws/sync', { method: 'POST' })
        if (!isMounted) return

        if (res.ok) {
          const data = await res.json()
          // synced > 0이면 정말 새로운 데이터를 받은 것
          if (data.synced > 0) {
            showToast(`✅ ${data.synced}회차 최신정보를 수신했습니다`)
          }
        }
      } catch {
        // 네트워크 에러는 무시
      }
    }

    syncLatestData()
    return () => { isMounted = false }
  }, []) // 마운트 시 1번만 실행

  return null
}

function showToast(message: string) {
  const container = document.getElementById('toast-container') || (() => {
    const div = document.createElement('div')
    div.id = 'toast-container'
    div.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;'
    document.body.appendChild(div)
    return div
  })()

  const toast = document.createElement('div')
  toast.style.cssText = `
    background:#333;color:#fff;padding:12px 16px;border-radius:6px;
    font-size:13px;margin-bottom:8px;animation:slideIn 0.3s ease-out;
    box-shadow:0 2px 8px rgba(0,0,0,0.2);
  `
  toast.textContent = message

  container.appendChild(toast)

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

export function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        retry: 1,
      },
    },
  }))

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <SyncInitializer />
        <PushPermission />
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
          }
        `}</style>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}
