export const dynamic = 'force-dynamic'

import { OutcomeModerationStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { refreshPublicStoryCount } from '@/lib/social-proof/service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const outcomeId = typeof body?.outcomeId === 'string' ? body.outcomeId : ''
  const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 120) : null

  if (!outcomeId) {
    return NextResponse.json({ error: '신고 대상이 없습니다' }, { status: 400 })
  }

  const outcome = await prisma.lottoOutcome.findFirst({
    where: {
      id: outcomeId,
      shareStatus: 'SHARED',
      moderationStatus: { not: 'HIDDEN' },
      userId: { not: session.user.id },
    },
    select: {
      id: true,
      round: true,
    },
  })

  if (!outcome) {
    return NextResponse.json({ error: '신고 가능한 후기가 없습니다' }, { status: 404 })
  }

  const existingReport = await prisma.outcomeReport.findUnique({
    where: {
      outcomeId_reporterUserId: {
        outcomeId,
        reporterUserId: session.user.id,
      },
    },
  })

  if (existingReport) {
    return NextResponse.json({ error: '이미 신고한 후기입니다' }, { status: 409 })
  }

  await prisma.$transaction([
    prisma.outcomeReport.create({
      data: {
        outcomeId,
        reporterUserId: session.user.id,
        reason,
      },
    }),
    prisma.lottoOutcome.update({
      where: { id: outcomeId },
      data: {
        moderationStatus: OutcomeModerationStatus.FLAGGED,
        lastReportedAt: new Date(),
      },
    }),
  ])

  const publicStoryCount = await refreshPublicStoryCount(outcome.round)

  return NextResponse.json({
    ok: true,
    outcomeId,
    publicStoryCount,
    message: '후기를 신고했고 운영 검수 대기 상태로 전환했습니다',
  })
}