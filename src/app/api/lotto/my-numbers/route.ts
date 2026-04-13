// GET /api/lotto/my-numbers?type=auto|manual|all

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
