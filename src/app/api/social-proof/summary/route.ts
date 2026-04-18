export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import {
  buildSummaryHeadline,
  ensureRoundSocialProof,
  getShareTemplateText,
} from '@/lib/social-proof/service'

export async function GET(req: NextRequest) {
  const roundParam = req.nextUrl.searchParams.get('round')
  const variant = req.nextUrl.searchParams.get('variant')
  const round = roundParam ? parseInt(roundParam, 10) : null

  if (roundParam && Number.isNaN(round)) {
    return NextResponse.json({ error: '잘못된 회차입니다' }, { status: 400 })
  }

  const targetRound = round ?? (await prisma.lottoDraw.findFirst({ orderBy: { round: 'desc' }, select: { round: true } }))?.round
  if (!targetRound) {
    return NextResponse.json({ summary: null, stories: [] })
  }

  const stat = await ensureRoundSocialProof(targetRound)
  if (!stat) {
    return NextResponse.json({ summary: null, stories: [] })
  }

  const stories = await prisma.lottoOutcome.findMany({
    where: {
      round: targetRound,
      isWinning: true,
      shareStatus: 'SHARED',
      moderationStatus: 'VISIBLE',
      verificationStatus: { not: 'NONE' },
    },
    orderBy: [{ sharedAt: 'desc' }, { updatedAt: 'desc' }],
    take: 3,
    include: {
      user: {
        select: { nickname: true },
      },
    },
  })

  return NextResponse.json({
    summary: {
      round: stat.round,
      drawDate: stat.lottoDraw.drawDate.toISOString(),
      headline: buildSummaryHeadline(stat, variant),
      eligibleAutoSetCount: stat.eligibleAutoSetCount,
      eligibleUserCount: stat.eligibleUserCount,
      appStats: {
        rank1Count: stat.rank1Count,
        rank2Count: stat.rank2Count,
        rank3Count: stat.rank3Count,
        rank4Count: stat.rank4Count,
        rank5Count: stat.rank5Count,
      },
      verifiedStats: {
        rank1Count: stat.verifiedRank1Count,
        rank2Count: stat.verifiedRank2Count,
        rank3Count: stat.verifiedRank3Count,
        rank4Count: stat.verifiedRank4Count,
        rank5Count: stat.verifiedRank5Count,
      },
      publicStoryCount: stat.publicStoryCount,
      totalPrizeAmount: Number(stat.totalPrizeAmount),
      verifiedPrizeAmount: Number(stat.verifiedPrizeAmount),
      ctaLabel: '이번 주 번호 받기',
    },
    stories: stories.map(story => ({
      id: story.id,
      round: story.round,
      rank: story.rank,
      prize: Number(story.prize),
      displayName: story.shareNameMode === 'NICKNAME' ? story.user.nickname : '익명 회원',
      templateId: story.shareTemplateId,
      templateText: getShareTemplateText(story.shareTemplateId),
      sharedAt: story.sharedAt?.toISOString() ?? null,
      verified: story.verificationStatus !== 'NONE',
      reviewed: true,
    })),
  })
}