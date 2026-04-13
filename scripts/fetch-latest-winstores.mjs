/**
 * 최신 회차 당첨 판매점 fetch → 엑셀 추가 + DB 저장
 * 데이터 출처: redinfo.co.kr HTML 파싱
 * 사용: node --env-file=.env.local scripts/fetch-latest-winstores.mjs
 */

import pkg from 'xlsx'
const { readFile, writeFile, utils } = pkg
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EXCEL_PATH = 'D:\\facesaju\\assets\\lotto.xlsx'

async function fetchStores(round) {
  const url = `https://www.redinfo.co.kr/lotto/w/store?no=${round}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html, */*',
      'X-Requested-With': 'XMLHttpRequest',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const html = json.html ?? json

  // 1등 판매점 섹션만 추출
  const win1Start = html.indexOf('class="list-item this-win1')
  if (win1Start === -1) return []
  const win2Start = html.indexOf('class="list-item this-win2', win1Start)
  const win1Block = html.slice(win1Start, win2Start > win1Start ? win2Start : html.length)

  const stores = []
  const items = win1Block.split('<div class="item">')
  for (let i = 1; i < items.length; i++) {
    const block = items[i]
    const gubunMatch = block.match(/this-gubun-(\d)/)
    const method = gubunMatch?.[1] === '2' ? '수동' : '자동'
    const nameMatch = block.match(/<div class="name">([\s\S]*?)<\/div>/)
    const name = nameMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
    const addrMatch = block.match(/data-addr="([^"]+)"/)
    const address = addrMatch?.[1]?.trim()
    if (name && address) stores.push({ name, address, method })
  }
  return stores
}

async function main() {
  const roundArg = process.argv[2] ? parseInt(process.argv[2]) : null

  // 회차 결정: 인자 있으면 그 회차, 없으면 DB 최신 회차
  let round
  if (roundArg) {
    round = roundArg
    console.log(`지정 회차: ${round}회`)
  } else {
    const latest = await prisma.lottoDraw.findFirst({ orderBy: { round: 'desc' } })
    if (!latest) { console.error('DB에 회차 정보 없음'); process.exit(1) }
    round = latest.round
    console.log(`최신 회차: ${round}회`)
  }

  // 이미 DB에 있으면 스킵
  const existing = await prisma.lottoDrawStore.count({ where: { round } })
  if (existing > 0) {
    console.log(`${round}회차 판매점 이미 DB에 있음 (${existing}개) → 스킵`)
    process.exit(0)
  }

  // redinfo에서 판매점 fetch
  console.log(`${round}회차 판매점 조회 중... (redinfo.co.kr)`)
  let stores
  try {
    stores = await fetchStores(round)
  } catch (e) {
    console.error('fetch 실패:', e.message)
    process.exit(1)
  }

  if (stores.length === 0) {
    console.log('판매점 정보 없음 (아직 미발표 또는 파싱 실패)')
    process.exit(0)
  }
  console.log(`${stores.length}개 판매점 조회 완료:`)
  stores.forEach(s => console.log(`  [${s.method}] ${s.name} - ${s.address}`))

  // DB 저장
  await prisma.lottoDrawStore.createMany({
    data: stores.map(s => ({ round, name: s.name, address: s.address, method: s.method ?? null })),
    skipDuplicates: true,
  })
  console.log(`DB 저장 완료`)

  // 엑셀 판매점 시트에 추가
  try {
    const wb = readFile(EXCEL_PATH)
    if (!wb.SheetNames.includes('판매점')) {
      const ws = utils.aoa_to_sheet([['회차', '판매점명', '주소', '구분']])
      wb.SheetNames.push('판매점')
      wb.Sheets['판매점'] = ws
    }
    const ws = wb.Sheets['판매점']
    const current = utils.sheet_to_json(ws, { header: 1 })
    const newRows = stores.map(s => [round, s.name, s.address, s.method ?? ''])
    wb.Sheets['판매점'] = utils.aoa_to_sheet([...current, ...newRows])
    writeFile(wb, EXCEL_PATH)
    console.log(`엑셀 추가 완료`)
  } catch (e) {
    console.error('엑셀 저장 실패 (DB는 저장됨):', e.message)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
