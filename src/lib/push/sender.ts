// ================================
// FCM 푸시 발송 헬퍼 (firebase-admin)
// ================================

import { prisma } from '@/lib/prisma'

let adminInitialized = false

function getFirebaseAdmin() {
  if (!process.env.FIREBASE_PROJECT_ID) return null
  if (adminInitialized) return true

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initializeApp, getApps, cert } = require('firebase-admin/app')
    if (getApps().length === 0) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    }
    adminInitialized = true
    return true
  } catch (e) {
    console.error('Firebase Admin 초기화 실패:', e)
    return null
  }
}

/**
 * 특정 토큰 배열에 푸시 발송 (최대 500개씩 분할)
 */
export async function sendPush(
  tokens: string[],
  title: string,
  body: string,
  url: string
): Promise<{ sent: number; failed: number }> {
  if (!tokens.length || !getFirebaseAdmin()) return { sent: 0, failed: 0 }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getMessaging } = require('firebase-admin/messaging')
  const messaging = getMessaging()

  let sent = 0
  let failed = 0
  const CHUNK = 500

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK)
    try {
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: { url },
        android: {
          priority: 'high',
          notification: {
            icon: 'ic_notification',
            color: '#F5C842',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
      })
      sent += res.successCount
      failed += res.failureCount

      // 만료/유효하지 않은 토큰 DB 삭제
      if (res.failureCount > 0) {
        const expiredTokens: string[] = []
        res.responses.forEach((r: any, idx: number) => {
          if (!r.success) {
            const code = r.error?.code
            if (code === 'messaging/invalid-registration-token' ||
                code === 'messaging/registration-token-not-registered') {
              expiredTokens.push(chunk[idx])
            }
          }
        })
        if (expiredTokens.length > 0) {
          await prisma.pushToken.deleteMany({
            where: { token: { in: expiredTokens } },
          })
        }
      }
    } catch (e) {
      console.error('FCM 발송 오류:', e)
      failed += chunk.length
    }
  }

  return { sent, failed }
}
