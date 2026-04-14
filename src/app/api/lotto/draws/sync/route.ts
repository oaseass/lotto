// ================================
// API: 당첨번호 동기화
// POST /api/lotto/draws/sync
// ================================

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchLottoDraw, parseDraw, estimateCurrentRound } from '@/lib/lotto/dhlottery'

export async function POST(req: NextRequest) {
  // 보안: 내부 크론 요청만 허용 (개발 환경은 패스)
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: '권한 없음' }, { status: 401 })
    }
  }

  try {
    const body = await req.json().catch(() => ({}))
    const latestInDB = await prisma.lottoDraw.findFirst({
      orderBy: { round: 'desc' },
    })

    const currentEstimated = estimateCurrentRound()
    const startRound = body.from ?? (latestInDB ? latestInDB.round + 1 : currentEstimated - 100)
    const endRound = body.to ?? currentEstimated

    let synced = 0
    // 범위 내 기존 회차를 한 번에 조회 (N+1 방지)
    const existingRounds = await prisma.lottoDraw.findMany({
      where: { round: { gte: startRound, lte: endRound } },
      select: { round: true },
    })
    const existingSet = new Set(existingRounds.map(r => r.round))

    for (let round = startRound; round <= endRound; round++) {
      if (existingSet.has(round)) continue

      const data = await fetchLottoDraw(round)
      if (!data) continue

      await prisma.lottoDraw.create({ data: parseDraw(data) })
      synced++

      // API 과부하 방지
      await new Promise(r => setTimeout(r, 200))
    }

    // 저장된 번호들 당첨 여부 체크
    if (synced > 0) {
      await checkSavedNumbers()
    }

    return NextResponse.json({ synced, message: `${synced}회차 업데이트 완료` })
  } catch (error) {
    return NextResponse.json({ error: '동기화 실패' }, { status: 500 })
  }
}

/**
 * 저장된 번호들 당첨 여부 자동 체크
 */
async function checkSavedNumbers() {
  const latestDraw = await prisma.lottoDraw.findFirst({
    orderBy: { round: 'desc' },
  })
  if (!latestDraw) return

  // 해당 회차에 저장된 번호들 조회
  const savedNumbers = await prisma.lottoNumber.findMany({
    where: { drawRound: latestDraw.round },
    include: { user: true },
  })

  // 당첨 여부는 QR 스캔 이력과 연동하므로 여기서는 로그만
  console.log(`${latestDraw.round}회차 저장 번호 ${savedNumbers.length}개 확인 완료`)
}
