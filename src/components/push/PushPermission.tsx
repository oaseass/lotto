'use client'

// ================================
// FCM 토큰 등록 (null 렌더링 컴포넌트)
// Providers.tsx 안에 마운트 → 로그인 유저에게만 동작
// ================================

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

export function PushPermission() {
  const { data: session } = useSession()

  useEffect(() => {
    // Firebase 미설정 또는 비로그인이면 스킵
    if (!session || !VAPID_KEY || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') return

    let mounted = true

    async function init() {
      try {
        const [{ initializeApp, getApps }, { getMessaging, getToken }] = await Promise.all([
          import('firebase/app'),
          import('firebase/messaging'),
        ])

        const firebaseConfig = {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        }

        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
        const messaging = getMessaging(app)

        // 서비스 워커 등록 (동적 생성 라우트)
        const swReg = await navigator.serviceWorker.register('/api/push/fcm-sw', {
          scope: '/',
          updateViaCache: 'none',
        })

        // 알림 권한 요청 (기존에 granted면 바로 진행)
        const permission = Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission()

        if (permission !== 'granted' || !mounted) return

        // FCM 토큰 획득
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        })

        if (!token || !mounted) return

        // 서버에 토큰 저장 (upsert - 중복 방지)
        const platform = /android/i.test(navigator.userAgent) ? 'android'
          : /iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios'
          : 'web'
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform }),
        })
      } catch {
        // 알림 거부 또는 네트워크 오류 - 무시
      }
    }

    init()
    return () => { mounted = false }
  }, [session])

  return null
}
