// GET /api/lotto/draws/sync-status

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const count = await prisma.lottoDraw.count()
    const latest = await prisma.lottoDraw.findFirst({
      orderBy: { round: 'desc' },
      select: { round: true },
    })
    return NextResponse.json({ count, latest: latest?.round ?? null })
  } catch {
    return NextResponse.json({ count: 0, latest: null })
  }
}
