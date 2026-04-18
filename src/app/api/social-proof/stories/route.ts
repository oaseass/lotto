export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { getShareTemplateText } from '@/lib/social-proof/service'

export async function GET(req: NextRequest) {
  const roundParam = req.nextUrl.searchParams.get('round')
  const limit = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10) || 20))
  const round = roundParam ? parseInt(roundParam, 10) : null

  if (roundParam && Number.isNaN(round)) {
    return NextResponse.json({ error: '잘못된 회차입니다' }, { status: 400 })
  }

  const stories = await prisma.lottoOutcome.findMany({
    where: {
      ...(round ? { round } : {}),
      isWinning: true,
      shareStatus: 'SHARED',
      moderationStatus: 'VISIBLE',
      verificationStatus: { not: 'NONE' },
    },
    orderBy: [{ sharedAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    include: {
      user: {
        select: { nickname: true },
      },
    },
  })

  return NextResponse.json({
    items: stories.map(story => ({
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