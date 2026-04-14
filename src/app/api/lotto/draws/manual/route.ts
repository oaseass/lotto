// POST /api/lotto/draws/manual
// 당첨번호 수동 저장 (관리자용)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // 관리자 인증
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  const auth = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  if (auth !== `Bearer ${cronSecret}` && secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { round, numbers, bonus, drawDate } = await req.json()

    if (!round || !Array.isArray(numbers) || numbers.length !== 6 || !bonus) {
      return NextResponse.json({ error: '잘못된 데이터 형식' }, { status: 400 })
    }

    // 번호 유효성 검사 (1~45, 중복 없음, 보너스 중복 없음)
    const sorted = numbers.map(Number)
    const allNums = [...sorted, Number(bonus)]
    if (allNums.some(n => n < 1 || n > 45) || new Set(allNums).size !== 7) {
      return NextResponse.json({ error: '번호는 1~45 사이 중복 없이 7개(본번6+보너스1)여야 합니다' }, { status: 400 })
    }

    const existing = await prisma.lottoDraw.findUnique({ where: { round } })
    if (existing) {
      return NextResponse.json({ error: `${round}회차는 이미 저장되어 있습니다` }, { status: 409 })
    }

    const draw = await prisma.lottoDraw.create({
      data: {
        round,
        numbers: numbers.map(Number),
        bonus: Number(bonus),
        drawDate: drawDate ? new Date(drawDate) : new Date(),
      },
    })

    return NextResponse.json({ success: true, round: draw.round })
  } catch (error) {
    console.error('Manual draw save error:', error)
    return NextResponse.json({ error: '저장 실패' }, { status: 500 })
  }
}
