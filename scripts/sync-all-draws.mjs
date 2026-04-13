/**
 * 1회차~현재 회차 전체 당첨번호 동기화 스크립트
 * 사용: node scripts/sync-all-draws.mjs
 * 옵션: node scripts/sync-all-draws.mjs --from=1100 --to=1218
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 현재 회차 계산 (1회차: 2002-12-07)
function estimateCurrentRound() {
  const BASE_DATE = new Date('2002-12-07')
  const today = new Date()
  const diffMs = today.getTime() - BASE_DATE.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1
}

// dhlottery API 한 회차 조회
async function fetchDraw(round, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(
        `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
            'Referer': 'https://www.dhlottery.co.kr/gameInfo.do?method=lotto645',
          },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      if (!data || data.returnValue !== 'success') return null
      return data
    } catch {
      if (i < retries - 1) await sleep(1000)
    }
  }
  return null
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  // 인수 파싱
  const args = process.argv.slice(2)
  const fromArg = args.find(a => a.startsWith('--from='))
  const toArg = args.find(a => a.startsWith('--to='))

  const currentRound = estimateCurrentRound()
  const fromRound = fromArg ? parseInt(fromArg.split('=')[1]) : 1
  const toRound = toArg ? parseInt(toArg.split('=')[1]) : currentRound

  console.log(`\n🎰 동행복권 당첨번호 전체 동기화`)
  console.log(`   범위: ${fromRound}회 ~ ${toRound}회 (총 ${toRound - fromRound + 1}회차)`)
  console.log(`   현재 추정 최신 회차: ${currentRound}회\n`)

  // DB에 이미 있는 회차 조회
  const existing = await prisma.lottoDraw.findMany({
    where: { round: { gte: fromRound, lte: toRound } },
    select: { round: true },
  })
  const existingSet = new Set(existing.map(d => d.round))

  // 누락된 회차 목록
  const missing = []
  for (let r = fromRound; r <= toRound; r++) {
    if (!existingSet.has(r)) missing.push(r)
  }

  console.log(`   DB 기존: ${existingSet.size}개  /  누락: ${missing.length}개\n`)

  if (missing.length === 0) {
    console.log('✅ 모든 회차 데이터가 이미 DB에 있습니다!\n')
    await prisma.$disconnect()
    return
  }

  // 배치 처리 (5개씩 병렬)
  const BATCH_SIZE = 5
  const BATCH_DELAY = 300 // ms between batches
  let synced = 0
  let failed = 0

  const startTime = Date.now()

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE)

    const results = await Promise.all(
      batch.map(async round => {
        const data = await fetchDraw(round)
        if (!data) return { round, ok: false }

        try {
          await prisma.lottoDraw.upsert({
            where: { round },
            create: {
              round: data.drwNo,
              drawDate: new Date(data.drwNoDate),
              numbers: [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6],
              bonus: data.bnusNo,
              prize1st: BigInt(data.firstWinamnt ?? 0),
              winners1st: data.firstPrzwnerCo ?? 0,
              prize2nd: BigInt(data.secondWinamnt ?? 0),
              winners2nd: data.secondPrzwnerCo ?? 0,
            },
            update: {
              prize2nd: BigInt(data.secondWinamnt ?? 0),
              winners2nd: data.secondPrzwnerCo ?? 0,
            },
          })
          return { round, ok: true }
        } catch (e) {
          console.error(`  ❌ ${round}회 저장 오류:`, e.message)
          return { round, ok: false }
        }
      })
    )

    for (const r of results) {
      if (r.ok) synced++
      else failed++
    }

    // 진행률 출력
    const progress = Math.min(i + BATCH_SIZE, missing.length)
    const pct = Math.round((progress / missing.length) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const eta = elapsed > 0
      ? (((Date.now() - startTime) / progress) * (missing.length - progress) / 1000).toFixed(0)
      : '?'

    process.stdout.write(
      `\r   진행: ${progress}/${missing.length} (${pct}%)  저장: ${synced}  실패: ${failed}  경과: ${elapsed}s  예상잔여: ${eta}s  `
    )

    if (i + BATCH_SIZE < missing.length) {
      await sleep(BATCH_DELAY)
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n\n✅ 완료! 저장: ${synced}회차  실패: ${failed}회차  소요: ${totalTime}초`)

  // 최종 DB 카운트
  const total = await prisma.lottoDraw.count()
  console.log(`📊 DB 총 회차 수: ${total}개\n`)

  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
