// scripts/sync-winstores.mjs
// Run: node --env-file=.env.local scripts/sync-winstores.mjs

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()

async function fetchStores(round) {
  try {
    const url = `https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=1&srchLtEpsd=${round}&srchShpLctn=`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.dhlottery.co.kr/' }
    })
    if (!res.ok) return []
    const json = await res.json()
    const list = json.wnshpList ?? json.list ?? []
    return list
      .map(item => ({
        round,
        name: item.bplcNm || item.bplnm || '',
        address: item.bplcAddr || item.bpladdr || '',
        method: item.bplcPrntYn === 'Y' ? '자동' : '수동',
      }))
      .filter(s => s.name && !s.address.includes('dhlottery'))
  } catch { return [] }
}

async function main() {
  // 모든 LottoDraw 회차 조회
  const draws = await prisma.lottoDraw.findMany({ select: { round: true }, orderBy: { round: 'asc' } })
  // 이미 판매점 데이터가 있는 회차 조회
  const existing = await prisma.lottoDrawStore.findMany({ select: { round: true }, distinct: ['round'] })
  const existingRounds = new Set(existing.map(e => e.round))

  const missing = draws.filter(d => !existingRounds.has(d.round))
  console.log(`전체 ${draws.length}회차 중 ${missing.length}개 회차 판매점 수집 필요`)

  let saved = 0, failed = 0
  for (let i = 0; i < missing.length; i++) {
    const { round } = missing[i]
    const stores = await fetchStores(round)
    if (stores.length > 0) {
      await prisma.lottoDrawStore.createMany({ data: stores, skipDuplicates: true })
      saved++
    } else {
      failed++
    }
    if ((i + 1) % 10 === 0) {
      console.log(`  진행: ${i + 1}/${missing.length} (저장 ${saved}개 회차, 실패 ${failed}개)`)
      await new Promise(r => setTimeout(r, 500)) // 10회마다 0.5초 대기
    } else {
      await new Promise(r => setTimeout(r, 80)) // 80ms 간격
    }
  }
  console.log(`\n완료: ${saved}개 회차 저장, ${failed}개 회차 데이터 없음`)
}

main().finally(() => prisma.$disconnect())
