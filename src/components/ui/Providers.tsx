'use client'

import { SessionProvider, signOut } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import type { Session } from 'next-auth'
import { PushPermission } from '@/components/push/PushPermission'

/**
 * TWA(Trusted Web Activity)에서 앱이 열릴 때
 * Chrome 브라우저의 세션이 공유되는 것을 방지하기 위해
 * 첫 실행 시 세션을 클리어하고 로그인 페이지로 보냄
 */
function TwaSessionGuard() {
  useEffect(() => {
    // standalone 모드(TWA/PWA)인지 확인
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (!isStandalone) return

    // TWA 첫 실행 플래그 확인 (sessionStorage는 앱 종료 시 초기화됨)
    const key = 'twa_session_initialized'
    if (sessionStorage.getItem(key)) return

    // 첫 실행 표시
    sessionStorage.setItem(key, '1')

    // 기존 세션이 있으면 로그아웃 처리
    signOut({ redirect: true, callbackUrl: '/login' })
  }, [])

  return null
}

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
        <TwaSessionGuard />
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
