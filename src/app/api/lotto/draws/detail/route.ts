// 당첨 통계 (1~5등) - DB 우선, 없으면 api.lotto-haru.kr에서 가져와 DB에 캐시
// GET /api/lotto/draws/detail?round=1218

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const round = parseInt(req.nextUrl.searchParams.get('round') || '0')
  if (!round) return NextResponse.json({ ranks: [] })

  try {
    // 1. DB에서 조회
    const draw = await prisma.lottoDraw.findUnique({ where: { round } })
    if (!draw) return NextResponse.json({ ranks: [] })

    // 2. 이미 3등 데이터 있으면 DB에서 바로 리턴
    if (draw.winners3rd != null) {
      return NextResponse.json({
        ranks: [
          { rank: 1, winners: draw.winners1st, prizePerWinner: draw.prize1st != null ? Number(draw.prize1st) : null },
          { rank: 2, winners: draw.winners2nd, prizePerWinner: draw.prize2nd != null ? Number(draw.prize2nd) : null },
          { rank: 3, winners: draw.winners3rd, prizePerWinner: draw.prize3rd },
          { rank: 4, winners: draw.winners4th, prizePerWinner: draw.prize4th },
          { rank: 5, winners: draw.winners5th, prizePerWinner: draw.prize5th },
        ],
      })
    }

    // 3. DB에 없으면 lotto-haru.kr에서 가져와 저장
    const res = await fetch(
      `https://api.lotto-haru.kr/win/analysis.json?chasu=${round}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      }
    )
    if (!res.ok) return NextResponse.json({ ranks: [] })

    const data = await res.json()
    const item = data?.[0]
    if (!item?.win) return NextResponse.json({ ranks: [] })

    const w3 = item.win.win3?.count ?? null
    const p3 = item.win.win3?.payout ?? null
    const w4 = item.win.win4?.count ?? null
    const p4 = item.win.win4?.payout ?? null
    const w5 = item.win.win5?.count ?? null
    const p5 = item.win.win5?.payout ?? null

    // 4. DB에 캐시
    if (w3 != null) {
      await prisma.lottoDraw.update({
        where: { round },
        data: {
          winners3rd: w3,
          prize3rd: p3,
          winners4th: w4,
          prize4th: p4,
          winners5th: w5,
          prize5th: p5,
        },
      })
    }

    return NextResponse.json({
      ranks: [
        { rank: 1, winners: draw.winners1st, prizePerWinner: draw.prize1st != null ? Number(draw.prize1st) : null },
        { rank: 2, winners: draw.winners2nd, prizePerWinner: draw.prize2nd != null ? Number(draw.prize2nd) : null },
        { rank: 3, winners: w3, prizePerWinner: p3 },
        { rank: 4, winners: w4, prizePerWinner: p4 },
        { rank: 5, winners: w5, prizePerWinner: p5 },
      ],
    })
  } catch {
    return NextResponse.json({ ranks: [] })
  }
}
