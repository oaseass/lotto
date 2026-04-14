// 1등 당첨 판매점 정보 (DB에서만 조회)
// GET /api/lotto/draws/winstores?round=1218

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const round = parseInt(req.nextUrl.searchParams.get('round') || '0', 10)
  if (!round) return NextResponse.json([])

  try {
    const stores = await prisma.lottoDrawStore.findMany({ where: { round } })
    return NextResponse.json(stores.map(s => ({ name: s.name, address: s.address, method: s.method })))
  } catch (error) {
    console.error('winstores error:', error)
    return NextResponse.json([])
  }
}
