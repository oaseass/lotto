export const dynamic = 'force-dynamic'

import { OutcomeModerationStatus } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findTemplateIdsByQuery } from '@/lib/social-proof/templates'
import {
  getShareTemplateText,
  refreshPublicStoryCount,
} from '@/lib/social-proof/service'

async function ensureAdmin() {
  const session = await auth()
  if (!session?.user?.id || !session.user.isAdmin) {
    return null
  }
  return session
}

export async function GET(req: NextRequest) {
  const session = await ensureAdmin()
  if (!session) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const statusParam = req.nextUrl.searchParams.get('status')
  const searchQuery = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const reportedOnly = req.nextUrl.searchParams.get('reportedOnly') === '1'
  const take = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '12', 10) || 12))
  const numericSearch = /^\d+$/.test(searchQuery) ? parseInt(searchQuery, 10) : null
  const matchingTemplateIds = searchQuery ? findTemplateIdsByQuery(searchQuery) : []

  const where = {
    shareStatus: 'SHARED' as const,
    ...(statusParam && ['VISIBLE', 'FLAGGED', 'HIDDEN'].includes(statusParam)
      ? { moderationStatus: statusParam as OutcomeModerationStatus }
      : {}),
    ...(reportedOnly ? { reports: { some: {} } } : {}),
    ...(searchQuery ? {
      OR: [
        { user: { nickname: { contains: searchQuery, mode: 'insensitive' as const } } },
        { moderatedReason: { contains: searchQuery, mode: 'insensitive' as const } },
        ...(numericSearch !== null ? [{ round: numericSearch }, { numbers: { has: numericSearch } }] : []),
        ...(matchingTemplateIds.length > 0 ? [{ shareTemplateId: { in: matchingTemplateIds } }] : []),
      ],
    } : {}),
  }

  const items = await prisma.lottoOutcome.findMany({
    where,
    orderBy: [
      { lastReportedAt: 'desc' },
      { sharedAt: 'desc' },
      { updatedAt: 'desc' },
    ],
    take,
    include: {
      user: {
        select: { nickname: true },
      },
      _count: {
        select: { reports: true },
      },
    },
  })

  return NextResponse.json({
    items: items.map(item => ({
      id: item.id,
      round: item.round,
      rank: item.rank,
      prize: Number(item.prize),
      displayName: item.shareNameMode === 'NICKNAME' ? item.user.nickname : '익명 회원',
      numbers: item.numbers,
      templateText: getShareTemplateText(item.shareTemplateId),
      moderationStatus: item.moderationStatus,
      moderatedReason: item.moderatedReason,
      moderatedAt: item.moderatedAt?.toISOString() ?? null,
      reportCount: item._count.reports,
      lastReportedAt: item.lastReportedAt?.toISOString() ?? null,
      sharedAt: item.sharedAt?.toISOString() ?? null,
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await ensureAdmin()
  if (!session) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const outcomeId = typeof body?.outcomeId === 'string' ? body.outcomeId : ''
  const moderationStatus = body?.moderationStatus
  const moderatedReason = typeof body?.moderatedReason === 'string' ? body.moderatedReason.slice(0, 200) : null

  if (!outcomeId) {
    return NextResponse.json({ error: '대상 후기가 없습니다' }, { status: 400 })
  }

  if (!['VISIBLE', 'FLAGGED', 'HIDDEN'].includes(moderationStatus)) {
    return NextResponse.json({ error: '검수 상태가 잘못되었습니다' }, { status: 400 })
  }

  const updated = await prisma.lottoOutcome.update({
    where: { id: outcomeId },
    data: {
      moderationStatus,
      moderatedReason,
      moderatedAt: new Date(),
    },
    select: {
      id: true,
      round: true,
      moderationStatus: true,
      moderatedReason: true,
      moderatedAt: true,
    },
  })

  const publicStoryCount = await refreshPublicStoryCount(updated.round)

  return NextResponse.json({
    id: updated.id,
    round: updated.round,
    moderationStatus: updated.moderationStatus,
    moderatedReason: updated.moderatedReason,
    moderatedAt: updated.moderatedAt?.toISOString() ?? null,
    publicStoryCount,
  })
}