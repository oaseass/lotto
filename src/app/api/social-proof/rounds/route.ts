export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { ensureRoundSocialProof } from '@/lib/social-proof/service'

export async function GET(req: NextRequest) {
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10) || 1)
  const limit = Math.min(24, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '12', 10) || 12))
  const fromRound = parseInt(req.nextUrl.searchParams.get('fromRound') ?? '', 10)
  const toRound = parseInt(req.nextUrl.searchParams.get('toRound') ?? '', 10)

  if (Number.isNaN(fromRound) !== Number.isNaN(toRound) && (req.nextUrl.searchParams.get('fromRound') || req.nextUrl.searchParams.get('toRound'))) {
    return NextResponse.json({ error: '회차 범위가 잘못되었습니다' }, { status: 400 })
  }

  const latestDraw = await prisma.lottoDraw.findFirst({ orderBy: { round: 'desc' }, select: { round: true } })
  if (!latestDraw) {
    return NextResponse.json({ items: [], pagination: { page, limit, total: 0, hasMore: false } })
  }

  const latestStat = await prisma.appRoundStat.findFirst({ orderBy: { round: 'desc' }, select: { round: true } })
  if (!latestStat || latestStat.round < latestDraw.round) {
    await ensureRoundSocialProof(latestDraw.round)
  }

  const where = !Number.isNaN(fromRound) && !Number.isNaN(toRound)
    ? { round: { gte: Math.min(fromRound, toRound), lte: Math.max(fromRound, toRound) } }
    : undefined

  const [total, items] = await Promise.all([
    prisma.appRoundStat.count({ where }),
    prisma.appRoundStat.findMany({
      where,
      orderBy: { round: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        lottoDraw: {
          select: { drawDate: true },
        },
      },
    }),
  ])

  return NextResponse.json({
    items: items.map(item => ({
      round: item.round,
      drawDate: item.lottoDraw.drawDate.toISOString(),
      eligibleAutoSetCount: item.eligibleAutoSetCount,
      eligibleUserCount: item.eligibleUserCount,
      appStats: {
        rank1Count: item.rank1Count,
        rank2Count: item.rank2Count,
        rank3Count: item.rank3Count,
        rank4Count: item.rank4Count,
        rank5Count: item.rank5Count,
      },
      verifiedStats: {
        rank1Count: item.verifiedRank1Count,
        rank2Count: item.verifiedRank2Count,
        rank3Count: item.verifiedRank3Count,
        rank4Count: item.verifiedRank4Count,
        rank5Count: item.verifiedRank5Count,
      },
      publicStoryCount: item.publicStoryCount,
      totalPrizeAmount: Number(item.totalPrizeAmount),
      verifiedPrizeAmount: Number(item.verifiedPrizeAmount),
    })),
    pagination: {
      page,
      limit,
      total,
      hasMore: page * limit < total,
    },
  })
}