// GET /api/admin/cleanup-lotto-duplicates?secret=CRON_SECRET
// 같은 userId + 같은 numbers 배열을 가진 중복 LottoNumber 제거 (가장 오래된 것 보존)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 전체 조회
  const all = await prisma.lottoNumber.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true, numbers: true, createdAt: true },
  })

  const seen = new Map<string, string>() // key → first id
  const toDelete: string[] = []

  for (const row of all) {
    const key = `${row.userId}|${[...row.numbers].sort((a, b) => a - b).join(',')}`
    if (seen.has(key)) {
      toDelete.push(row.id)
    } else {
      seen.set(key, row.id)
    }
  }

  if (toDelete.length === 0) {
    return NextResponse.json({ deleted: 0, message: '중복 없음' })
  }

  await prisma.lottoNumber.deleteMany({ where: { id: { in: toDelete } } })
  return NextResponse.json({ deleted: toDelete.length, message: `${toDelete.length}건 삭제 완료` })
}
