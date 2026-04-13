/**
 * _apk_data.json → PostgreSQL 임포트
 * 사용: node scripts/import-from-json.mjs
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()
const JSON_PATH = new URL('./_apk_data.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

async function main() {
  console.log('\n🎰 JSON → PostgreSQL 임포트')
  console.log(`   소스: ${JSON_PATH}\n`)

  const rows = JSON.parse(readFileSync(JSON_PATH, 'utf-8'))
  console.log(`   JSON 레코드: ${rows.length}개`)

  // 기존 회차 조회
  const existing = await prisma.lottoDraw.findMany({ select: { round: true } })
  const existingSet = new Set(existing.map(d => d.round))
  console.log(`   DB 기존: ${existingSet.size}개`)

  const toInsert = rows.filter(r => !existingSet.has(r.round))
  console.log(`   신규 삽입: ${toInsert.length}개\n`)

  if (toInsert.length === 0) {
    console.log('✅ 이미 모든 데이터가 DB에 있습니다!')
    await prisma.$disconnect()
    return
  }

  const BATCH = 100
  let inserted = 0
  const start = Date.now()

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)

    await prisma.$transaction(
      batch.map(r => prisma.lottoDraw.upsert({
        where: { round: r.round },
        create: {
          round: r.round,
          drawDate: new Date(r.drawDate),
          numbers: [r.n1, r.n2, r.n3, r.n4, r.n5, r.n6],
          bonus: r.bonus,
          prize1st: BigInt(r.prize1st || 0),
          winners1st: r.winners1st || 0,
        },
        update: {},
      }))
    )

    inserted += batch.length
    const pct = Math.round((inserted / toInsert.length) * 100)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    process.stdout.write(`\r   진행: ${inserted}/${toInsert.length} (${pct}%)  경과: ${elapsed}s  `)
  }

  const total = await prisma.lottoDraw.count()
  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n\n✅ 완료! 삽입: ${inserted}개  소요: ${elapsed}초`)
  console.log(`📊 DB 총 회차 수: ${total}개\n`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
