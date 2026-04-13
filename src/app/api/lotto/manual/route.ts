// POST /api/lotto/manual
// 수동 입력 번호 저장 (게임당 6개, 최대 5게임)

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  try {
    const { games } = await req.json()
    // games: number[][] — [[1,2,3,4,5,6], [7,8,9,10,11,12], ...]

    if (!Array.isArray(games) || games.length === 0 || games.length > 5) {
      return NextResponse.json({ error: '1~5게임까지 입력 가능합니다' }, { status: 400 })
    }

    for (const g of games) {
      if (!Array.isArray(g) || g.length !== 6) {
        return NextResponse.json({ error: '각 게임은 6개 번호를 선택해야 합니다' }, { status: 400 })
      }
      if (g.some(n => n < 1 || n > 45) || new Set(g).size !== 6) {
        return NextResponse.json({ error: '1~45 사이의 중복 없는 번호 6개를 선택해주세요' }, { status: 400 })
      }
    }

    const userId = session.user.id

    const saved = await prisma.lottoNumber.createMany({
      data: games.map((numbers: number[]) => ({
        userId,
        generatedDate: new Date(),
        numbers: [...numbers].sort((a, b) => a - b),
        drawRound: null,   // 추첨 전이라 DB에 회차 레코드 없음 → null로 저장
        isManual: true,
      })),
    })

    return NextResponse.json({ count: saved.count })
  } catch {
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }
}
