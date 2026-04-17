// ================================
// 관리자 API: QrScan 중복 데이터 정리
// DELETE /api/admin/cleanup-qrscans?secret=CRON_SECRET
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // (userId, round) 중복 그룹에서 가장 오래된 것(first)만 남기고 나머지 삭제
    const duplicates = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "QrScan"
      WHERE id NOT IN (
        SELECT DISTINCT ON ("userId", round) id
        FROM "QrScan"
        ORDER BY "userId", round, "scannedAt" ASC
      )
    `

    if (duplicates.length === 0) {
      return NextResponse.json({ deleted: 0, message: '중복 없음' })
    }

    const ids = duplicates.map(d => d.id)
    const { count } = await prisma.qrScan.deleteMany({
      where: { id: { in: ids } },
    })

    return NextResponse.json({ deleted: count, message: `${count}건 삭제 완료` })
  } catch (error) {
    console.error('QrScan 정리 오류:', error)
    return NextResponse.json({ error: '정리 실패' }, { status: 500 })
  }
}
