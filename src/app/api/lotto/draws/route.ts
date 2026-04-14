import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// BigInt 포함 draw 직렬화
function serializeDraw(draw: any) {
  return {
    ...draw,
    prize1st: draw.prize1st != null ? String(draw.prize1st) : null,
    prize2nd: draw.prize2nd != null ? String(draw.prize2nd) : null,
    drawDate: draw.drawDate instanceof Date ? draw.drawDate.toISOString() : draw.drawDate,
  }
}

// 특정 회차 또는 최근 n회차 조회 (DB에서만)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const round = searchParams.get('round')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100)

  try {
    if (round) {
      const draw = await prisma.lottoDraw.findUnique({ where: { round: parseInt(round, 10) } })
      if (!draw) return NextResponse.json({ error: '해당 회차를 찾을 수 없습니다' }, { status: 404 })
      return NextResponse.json(serializeDraw(draw))
    } else {
      const draws = await prisma.lottoDraw.findMany({ orderBy: { round: 'desc' }, take: limit })
      return NextResponse.json(draws.map(serializeDraw))
    }
  } catch (error) {
    console.error('draws route error:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
