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

  // 3. 날짜/회차 기반 매칭: drawRound가 있으면 직접 사용, 없으면 생성일 이후 첫 추첨
  const directRounds = myNumbers
    .filter(n => n.drawRound !== null)
    .map(n => n.drawRound as number)

  const hasDateEntries = myNumbers.some(n => n.drawRound === null)

  const minDate = hasDateEntries
    ? myNumbers.reduce(
        (min, n) => (n.createdAt < min ? n.createdAt : min),
        myNumbers[myNumbers.length - 1].createdAt
      )
    : null

  const drawsWhere =
    directRounds.length > 0 && hasDateEntries
      ? { OR: [{ round: { in: directRounds } }, { drawDate: { gte: minDate! } }] }
      : directRounds.length > 0
      ? { round: { in: directRounds } }
      : { drawDate: { gte: minDate! } }

  const draws = await prisma.lottoDraw.findMany({
    where: drawsWhere,
    orderBy: { drawDate: 'asc' },
    select: { round: true, numbers: true, bonus: true, drawDate: true },
  })

  const drawByRound = new Map(draws.map(d => [d.round, d]))

  // 4. 등위 + 근접 기록 계산
  const rankSummary: Record<number, object[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
  const matchDist: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  const allMatched: object[] = []
  let totalChecked = 0
  let totalMatchSum = 0

  for (const entry of myNumbers) {
    const draw = entry.drawRound !== null
      ? drawByRound.get(entry.drawRound)
      : draws.find(d => d.drawDate >= entry.createdAt)
    if (!draw) continue

    totalChecked++
    const matchedNumbers = entry.numbers.filter(n => draw.numbers.includes(n))
    const matchCount = matchedNumbers.length
    matchDist[matchCount] = (matchDist[matchCount] || 0) + 1
    totalMatchSum += matchCount

    const rank = computeRank(entry.numbers, draw.numbers, draw.bonus)
    const entryData = {
      id: entry.id,
      numbers: entry.numbers,
      matchCount,
      matchedNumbers,
      drawRound: draw.round,
      drawDate: draw.drawDate.toISOString(),
      drawNumbers: draw.numbers,
      bonus: draw.bonus,
      createdAt: entry.createdAt.toISOString(),
      isManual: entry.isManual,
      rank,
    }

    if (rank !== null) rankSummary[rank].push(entryData)
    allMatched.push(entryData)
  }

  allMatched.sort((a: any, b: any) => b.matchCount - a.matchCount)
  const bestCount = (allMatched[0] as any)?.matchCount ?? 0
  const avgCount = totalChecked > 0
    ? Math.round((totalMatchSum / totalChecked) * 10) / 10
    : 0

  const matchStats = {
    totalChecked,
    pending: myNumbers.length - totalChecked,
    distribution: matchDist,
    bestCount,
    avgCount,
    topNearMisses: allMatched.slice(0, 10),
  }

  return NextResponse.json({ total, autoCount, manualCount, topNumbers, rankSummary, matchStats })
}
