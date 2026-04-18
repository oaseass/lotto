// GET /api/lotto/my-numbers?type=auto|manual|all
// DELETE /api/lotto/my-numbers

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncRoundSocialProof } from '@/lib/social-proof/service'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') // auto | manual | all(default)
  const where: Record<string, unknown> = { userId: session.user.id }
  if (type === 'auto') where.isManual = false
  if (type === 'manual') where.isManual = true

  const numbers = await prisma.lottoNumber.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(numbers)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const rawIds: unknown[] = Array.isArray(body?.ids)
    ? body.ids
    : typeof body?.id === 'string'
      ? [body.id]
      : []

  const ids: string[] = Array.from(new Set(rawIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)))
    .slice(0, 500)

  if (ids.length === 0) {
    return NextResponse.json({ error: '삭제할 번호를 선택해주세요' }, { status: 400 })
  }

  const ownedNumbers = await prisma.lottoNumber.findMany({
    where: {
      userId: session.user.id,
      id: { in: ids },
    },
    select: {
      id: true,
      drawRound: true,
    },
  })

  if (ownedNumbers.length === 0) {
    return NextResponse.json({ error: '삭제할 번호를 찾지 못했습니다' }, { status: 404 })
  }

  const deletedIds = ownedNumbers.map(item => item.id)
  const candidateRounds = Array.from(new Set(
    ownedNumbers
      .map(item => item.drawRound)
      .filter((round): round is number => typeof round === 'number')
  ))

  const { count } = await prisma.lottoNumber.deleteMany({
    where: {
      userId: session.user.id,
      id: { in: deletedIds },
    },
  })

  let syncedRounds: number[] = []
  if (candidateRounds.length > 0) {
    const existingDraws = await prisma.lottoDraw.findMany({
      where: { round: { in: candidateRounds } },
      select: { round: true },
    })

    syncedRounds = existingDraws.map(item => item.round)
    for (const round of syncedRounds) {
      await syncRoundSocialProof(round)
    }
  }

  return NextResponse.json({
    deleted: count,
    deletedIds,
    syncedRounds,
  })
}
