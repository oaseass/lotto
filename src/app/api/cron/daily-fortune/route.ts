// ================================
// 매일 오전 8시 KST (23:00 UTC) 운세 푸시
// GET /api/cron/daily-fortune
// ================================

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPush } from '@/lib/push/sender'
import { getDailyFortune } from '@/lib/saju/fortune'


export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })

  const authHeader = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  const valid = authHeader === `Bearer ${cronSecret}` || secret === cronSecret
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log: string[] = [`[${new Date().toISOString()}] 일일 운세 푸시 시작`]

  try {
    // 사주 프로필 + 푸시 토큰 있는 유저 전체 조회
    const users = await prisma.user.findMany({
      where: {
        sajuProfile: { ilju: { not: null } },
        pushTokens: { some: {} },
      },
      include: {
        sajuProfile: { select: { ilju: true } },
        pushTokens: { select: { token: true } },
      },
    })

    log.push(`대상 유저: ${users.length}명`)
    if (users.length === 0) return NextResponse.json({ ok: true, log })

    const today = new Date()

    // ilju별 메시지 그룹핑 (같은 일주 = 같은 메시지 → 배치 전송)
    const groups = new Map<string, string[]>() // body → tokens[]
    for (const user of users) {
      const ilju = user.sajuProfile!.ilju!
      const iljuChar = ilju[0]
      const fortuneMsg = getDailyFortune(iljuChar, today)
      const body = `${ilju}일주 · ${fortuneMsg}`

      if (!groups.has(body)) groups.set(body, [])
      groups.get(body)!.push(...user.pushTokens.map(t => t.token))
    }

    let totalSent = 0
    let totalFailed = 0
    for (const [body, tokens] of groups) {
      const { sent, failed } = await sendPush(
        tokens,
        '오늘의 사주 운세 ☯️',
        body,
        '/fortune'
      )
      totalSent += sent
      totalFailed += failed
    }

    log.push(`발송: ${totalSent}건 성공, ${totalFailed}건 실패`)
    return NextResponse.json({ ok: true, log })
  } catch (e: any) {
    log.push(`오류: ${e.message}`)
    return NextResponse.json({ ok: false, log }, { status: 500 })
  }
}
