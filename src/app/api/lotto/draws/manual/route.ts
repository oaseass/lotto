// POST /api/lotto/draws/manual
// 당첨번호 수동 저장 (관리자용)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { round, numbers, bonus, drawDate } = await req.json()

    if (!round || !Array.isArray(numbers) || numbers.length !== 6 || !bonus) {
      return NextResponse.json({ error: '잘못된 데이터 형식' }, { status: 400 })
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
