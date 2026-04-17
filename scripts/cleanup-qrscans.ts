import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanup() {
  const dups = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "QrScan"
    WHERE id NOT IN (
      SELECT DISTINCT ON ("userId", round) id
      FROM "QrScan"
      ORDER BY "userId", round, "scannedAt" ASC
    )
  `
  console.log(`중복 레코드: ${dups.length}건`)
  if (dups.length > 0) {
    const ids = dups.map(d => d.id)
    const result = await prisma.qrScan.deleteMany({ where: { id: { in: ids } } })
    console.log(`삭제 완료: ${result.count}건`)
  } else {
    console.log('정리할 중복 없음')
  }
}

cleanup().catch(console.error).finally(() => prisma.$disconnect())
