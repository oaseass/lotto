/**
 * APK lotto_history.db → Supabase PostgreSQL 전체 임포트
 * 사용: node scripts/import-from-apk.mjs
 */

import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

const APK_DB_PATH = 'C:/Users/지니/Downloads/lotto_base/assets/db/lotto_history.db'

async function main() {
  if (!fs.existsSync(APK_DB_PATH)) {
    console.error('APK DB 파일을 찾을 수 없습니다:', APK_DB_PATH)
    process.exit(1)
  }

  console.log('\n🎰 APK lotto_history.db → PostgreSQL 임포트')
  console.log(`   소스: ${APK_DB_PATH}\n`)

  // SQLite에서 전체 데이터 읽기
  const sqlite = new Database(APK_DB_PATH, { readonly: true })
  const rows = sqlite.prepare(
    'SELECT drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, ' +
    'bnusNo, firstWinamnt, firstPrzwnerCo FROM lotto_win ORDER BY drwNo'
  ).all()
  sqlite.close()

  console.log(`   SQLite 레코드: ${rows.length}개`)

  // DB에 이미 있는 회차 조회
  const existing = await prisma.lottoDraw.findMany({ select: { round: true } })
  const existingSet = new Set(existing.map(d => d.round))
  console.log(`   PostgreSQL 기존: ${existingSet.size}개`)

  const toInsert = rows.filter(r => !existingSet.has(r.drwNo))
  console.log(`   신규 삽입 대상: ${toInsert.length}개\n`)

  if (toInsert.length === 0) {
    console.log('✅ 이미 모든 데이터가 DB에 있습니다!\n')
    await prisma.$disconnect()
    return
  }

  // 배치 삽입 (100개씩)
  const BATCH = 100
  let inserted = 0
  const start = Date.now()

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)

    await prisma.$transaction(
      batch.map(r => prisma.lottoDraw.upsert({
        where: { round: r.drwNo },
        create: {
          round: r.drwNo,
          drawDate: new Date(r.drwNoDate),
          numbers: [r.drwtNo1, r.drwtNo2, r.drwtNo3, r.drwtNo4, r.drwtNo5, r.drwtNo6],
          bonus: r.bnusNo,
          prize1st: BigInt(r.firstWinamnt || 0),
          winners1st: r.firstPrzwnerCo || 0,
        },
        update: {},
      }))
    )

    inserted += batch.length
    const pct = Math.round((inserted / toInsert.length) * 100)
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    process.stdout.write(`\r   진행: ${inserted}/${toInsert.length} (${pct}%)  경과: ${elapsed}s  `)
  }

  const totalTime = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n\n✅ 완료! 삽입: ${inserted}개  소요: ${totalTime}초`)

  const total = await prisma.lottoDraw.count()
  console.log(`📊 PostgreSQL 총 회차 수: ${total}개\n`)

  await prisma.$disconnect()
}

main().catch(async e => {
  // better-sqlite3 없으면 python 방식으로 폴백
  if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message?.includes('better-sqlite3')) {
    console.log('better-sqlite3 미설치. Python 방식으로 전환합니다...\n')
    await importViaPython()
  } else {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }
})

async function importViaPython() {
  // Python으로 SQLite 읽기 → JSON 임시 파일
  const { execSync } = await import('child_process')
  const tmpJson = path.join(process.cwd(), 'scripts', '_lotto_data.json')

  const pyScript = `
import sqlite3, json
conn = sqlite3.connect(r'${APK_DB_PATH.replace(/\\/g, '\\\\')}')
cur = conn.cursor()
cur.execute('SELECT drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo, firstWinamnt, firstPrzwnerCo FROM lotto_win ORDER BY drwNo')
rows = [{'drwNo':r[0],'drwNoDate':r[1],'drwtNo1':r[2],'drwtNo2':r[3],'drwtNo3':r[4],'drwtNo4':r[5],'drwtNo5':r[6],'drwtNo6':r[7],'bnusNo':r[8],'firstWinamnt':r[9],'firstPrzwnerCo':r[10]} for r in cur.fetchall()]
conn.close()
with open(r'${tmpJson.replace(/\\/g, '\\\\')}', 'w') as f: json.dump(rows, f)
print(len(rows))
`
  const count = execSync(`python -c "${pyScript.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`).toString().trim()
  console.log(`Python으로 ${count}개 레코드 읽음`)

  const rows = JSON.parse(fs.readFileSync(tmpJson, 'utf-8'))
  fs.unlinkSync(tmpJson)

  const existing = await prisma.lottoDraw.findMany({ select: { round: true } })
  const existingSet = new Set(existing.map(d => d.round))
  const toInsert = rows.filter(r => !existingSet.has(r.drwNo))
  console.log(`신규 삽입 대상: ${toInsert.length}개\n`)

  const BATCH = 100
  let inserted = 0
  const start = Date.now()

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH)
    await prisma.$transaction(
      batch.map(r => prisma.lottoDraw.upsert({
        where: { round: r.drwNo },
        create: {
          round: r.drwNo,
          drawDate: new Date(r.drwNoDate),
          numbers: [r.drwtNo1, r.drwtNo2, r.drwtNo3, r.drwtNo4, r.drwtNo5, r.drwtNo6],
          bonus: r.bnusNo,
          prize1st: BigInt(r.firstWinamnt || 0),
          winners1st: r.firstPrzwnerCo || 0,
        },
        update: {},
      }))
    )
    inserted += batch.length
    const pct = Math.round((inserted / toInsert.length) * 100)
    process.stdout.write(`\r   진행: ${inserted}/${toInsert.length} (${pct}%)  경과: ${((Date.now() - start)/1000).toFixed(1)}s  `)
  }

  const total = await prisma.lottoDraw.count()
  console.log(`\n\n✅ 완료! 삽입: ${inserted}개  총 DB: ${total}개\n`)
  await prisma.$disconnect()
}
