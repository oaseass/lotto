// GET /api/lotto/my-numbers/stats
// 저장 번호 통계: 총 생성 수, 자주 뽑힌 번호, 등위별 당첨 이력
// drawRound가 null이어서 날짜 기반으로 매칭 (생성일 이후 첫 번째 추첨)

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function computeRank(
  myNumbers: number[],
  drawNumbers: number[],
  bonus: number
): number | null {
  const matches = myNumbers.filter(n => drawNumbers.includes(n)).length
  const bonusMatch = myNumbers.includes(bonus)
  if (matches === 6) return 1
  if (matches === 5 && bonusMatch) return 2
  if (matches === 5) return 3
  if (matches === 4) return 4
  if (matches === 3) return 5
  return null
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 저장된 모든 번호
  const myNumbers = await prisma.lottoNumber.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  if (!myNumbers.length) {
    return NextResponse.json({
      total: 0, autoCount: 0, manualCount: 0,
      topNumbers: [], rankSummary: { 1: [], 2: [], 3: [], 4: [], 5: [] },
    })
  }

  // 1. 기본 통계
  const total = myNumbers.length
  const autoCount = myNumbers.filter(n => !n.isManual).length
  const manualCount = myNumbers.filter(n => n.isManual).length

  // 2. 자주 뽑힌 번호
  const freq: Record<number, number> = {}
  for (const entry of myNumbers) {
    for (const num of entry.numbers) {
      freq[num] = (freq[num] || 0) + 1
    }
  }
  const topNumbers = Object.entries(freq)
    .map(([num, count]) => ({ num: parseInt(num, 10), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 3. 날짜 기반 매칭: 번호 생성일 이후 첫 번째 추첨 회차와 대조
  const minDate = myNumbers.reduce(
    (min, n) => (n.createdAt < min ? n.createdAt : min),
    myNumbers[myNumbers.length - 1].createdAt
  )

  const draws = await prisma.lottoDraw.findMany({
    where: { drawDate: { gte: minDate } },
    orderBy: { drawDate: 'asc' },
    select: { round: true, numbers: true, bonus: true, drawDate: true },
  })

  // 4. 등위 계산
  const rankSummary: Record<number, object[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }

  for (const entry of myNumbers) {
    // 생성일 이후 첫 번째 추첨 찾기
    const draw = draws.find(d => d.drawDate >= entry.createdAt)
    if (!draw) continue

    const rank = computeRank(entry.numbers, draw.numbers, draw.bonus)
    if (rank === null) continue

    rankSummary[rank].push({
      id: entry.id,
      numbers: entry.numbers,
      drawRound: draw.round,
      drawDate: draw.drawDate.toISOString(),
      drawNumbers: draw.numbers,
      bonus: draw.bonus,
      createdAt: entry.createdAt.toISOString(),
      isManual: entry.isManual,
    })
  }

  return NextResponse.json({ total, autoCount, manualCount, topNumbers, rankSummary })
}
