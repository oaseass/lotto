// POST /api/lotto/check-history
// 특정 번호 조합이 과거 회차에서 몇 등인지 통계

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  try {
    const { numbers } = await req.json()
    if (!Array.isArray(numbers) || numbers.length !== 6) {
      return NextResponse.json({ error: '잘못된 번호' }, { status: 400 })
    }

    // 필요한 필드만 조회 (prize 등 불필요한 컬럼 제외)
    const draws = await prisma.lottoDraw.findMany({
      orderBy: { round: 'desc' },
      take: 500,
      select: { round: true, numbers: true, bonus: true },
    })

    const numSet = new Set<number>(numbers)
    const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, checked: draws.length }

    for (const draw of draws) {
      const drawSet = new Set(draw.numbers)
      const matched = numbers.filter((n: number) => drawSet.has(n)).length
      const bonusMatch = numSet.has(draw.bonus)

      if (matched === 6) stats[1]++
      else if (matched === 5 && bonusMatch) stats[2]++
      else if (matched === 5) stats[3]++
      else if (matched === 4) stats[4]++
      else if (matched === 3) stats[5]++
    }

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
