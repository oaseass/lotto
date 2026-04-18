export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getShareTemplateText,
  isValidShareTemplate,
  refreshPublicStoryCount,
} from '@/lib/social-proof/service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const outcomeId = typeof body?.outcomeId === 'string' ? body.outcomeId : ''
  const shareStatus = body?.shareStatus
  const shareNameMode = body?.shareNameMode
  const shareTemplateId = typeof body?.shareTemplateId === 'string' ? body.shareTemplateId : null

  if (!outcomeId) {
    return NextResponse.json({ error: '공유 대상이 없습니다' }, { status: 400 })
  }

  if (!['PRIVATE', 'SHARED', 'HIDDEN'].includes(shareStatus)) {
    return NextResponse.json({ error: '공유 상태가 잘못되었습니다' }, { status: 400 })
  }

  if (!['ANON', 'NICKNAME'].includes(shareNameMode)) {
    return NextResponse.json({ error: '공개 방식이 잘못되었습니다' }, { status: 400 })
  }

  if (shareStatus === 'SHARED' && !isValidShareTemplate(shareTemplateId)) {
    return NextResponse.json({ error: '공유 문구가 잘못되었습니다' }, { status: 400 })
  }

  const outcome = await prisma.lottoOutcome.findFirst({
    where: {
      id: outcomeId,
      userId: session.user.id,
    },
    select: {
      id: true,
      round: true,
      rank: true,
      isWinning: true,
      verificationStatus: true,
    },
  })

  if (!outcome) {
    return NextResponse.json({ error: '결과를 찾을 수 없습니다' }, { status: 404 })
  }

  if (!outcome.isWinning || outcome.rank === null || outcome.verificationStatus === 'NONE') {
    return NextResponse.json({ error: 'QR 인증된 당첨 결과만 공유할 수 있습니다' }, { status: 400 })
  }

  const updated = await prisma.lottoOutcome.update({
    where: { id: outcomeId },
    data: {
      shareStatus,
      shareNameMode,
      shareTemplateId: shareStatus === 'SHARED' ? shareTemplateId : null,
      sharedAt: shareStatus === 'SHARED' ? new Date() : null,
    },
    select: {
      id: true,
      round: true,
      rank: true,
      shareStatus: true,
      shareNameMode: true,
      shareTemplateId: true,
      sharedAt: true,
    },
  })

  const publicStoryCount = await refreshPublicStoryCount(updated.round)

  return NextResponse.json({
    id: updated.id,
    round: updated.round,
    rank: updated.rank,
    shareStatus: updated.shareStatus,
    shareNameMode: updated.shareNameMode,
    shareTemplateId: updated.shareTemplateId,
    templateText: getShareTemplateText(updated.shareTemplateId),
    sharedAt: updated.sharedAt?.toISOString() ?? null,
    publicStoryCount,
  })
}