/**
 * 매주 토요일 20:50에 최신 로또 회차 자동 업데이트
 * 데이터 출처: api.lotto-haru.kr (당첨번호/등위별 통계)
 *            redinfo.co.kr (1등 당첨판매점 HTML 파싱)
 * 크론 실행 시간: 토요일 20:50 (추첨 후 약 50분)
 */

import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import { createRequire } from 'module'

const prisma = new PrismaClient()
const require = createRequire(import.meta.url)
const XLSX = require('xlsx')
const EXCEL_PATH = 'D:\\facesaju\\assets\\lotto.xlsx'

// 현재 회차 계산 (1회차: 2002-12-07)
function estimateCurrentRound() {
  const BASE_DATE = new Date('2002-12-07')
  const today = new Date()
  const diffMs = today.getTime() - BASE_DATE.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1
}

// api.lotto-haru.kr에서 한 회차 데이터 가져오기
async function fetchDraw(round) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(
        `https://api.lotto-haru.kr/win/analysis.json?chasu=${round}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      const item = data?.[0]
      if (!item?.ball?.length) return null
      return {
        drwNo: item.chasu,
        numbers: item.ball,
        bonus: item.bonusBall,
        drawDate: new Date(item.date),
        prize1st: item.win?.win1?.payout ?? 0,
        winners1st: item.win?.win1?.count ?? 0,
        prize2nd: item.win?.win2?.payout ?? 0,
        winners2nd: item.win?.win2?.count ?? 0,
        prize3rd: item.win?.win3?.payout ?? null,
        winners3rd: item.win?.win3?.count ?? null,
        prize4th: item.win?.win4?.payout ?? null,
        winners4th: item.win?.win4?.count ?? null,
        prize5th: item.win?.win5?.payout ?? null,
        winners5th: item.win?.win5?.count ?? null,
      }
    } catch (e) {
      if (i < 2) await sleep(1000)
    }
  }
  return null
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// 엑셀 파일에 새 회차 데이터 추가
function appendToExcel(drawData, stores) {
  try {
    const wb = XLSX.readFile(EXCEL_PATH)

    // 1. Lotto 시트에 당첨번호 추가
    const lottoWs = wb.Sheets['Lotto']
    const lottoData = XLSX.utils.sheet_to_json(lottoWs, { header: 1 })
    // 이미 있는지 확인
    const exists = lottoData.slice(1).some(row => row[0] === drawData.round)
    if (!exists) {
      lottoData.unshift([
        drawData.round,
        drawData.numbers[0], drawData.numbers[1], drawData.numbers[2],
        drawData.numbers[3], drawData.numbers[4], drawData.numbers[5],
        drawData.bonus,
        Number(drawData.prize1st), drawData.winners1st,
        Number(drawData.prize2nd), drawData.winners2nd,
      ])
      wb.Sheets['Lotto'] = XLSX.utils.aoa_to_sheet(lottoData)
    }

    // 2. 판매점 시트에 판매점 추가
    if (stores.length > 0) {
      if (!wb.SheetNames.includes('판매점')) {
        wb.SheetNames.push('판매점')
        wb.Sheets['판매점'] = XLSX.utils.aoa_to_sheet([['회차', '판매점명', '주소', '구분']])
      }
      const storeWs = wb.Sheets['판매점']
      const storeData = XLSX.utils.sheet_to_json(storeWs, { header: 1 })
      // 이 회차 데이터가 없을 때만 추가
      const storeExists = storeData.slice(1).some(row => row[0] === drawData.round)
      if (!storeExists) {
        const newRows = stores.map(s => [drawData.round, s.name, s.address, s.method ?? ''])
        wb.Sheets['판매점'] = XLSX.utils.aoa_to_sheet([...storeData, ...newRows])
      }
    }

    XLSX.writeFile(wb, EXCEL_PATH)
    console.log(`  엑셀 저장 완료 (${EXCEL_PATH})`)
  } catch (e) {
    console.error('  엑셀 저장 실패:', e.message)
  }
}

// 최신 회차 1개 업데이트
async function updateLatestDraw() {
  try {
    const currentRound = estimateCurrentRound()
    console.log(`\n🎰 [로또 자동 업데이트] ${new Date().toLocaleString()}`)
    console.log(`📊 예상 회차: ${currentRound}회`)

    const data = await fetchDraw(currentRound)
    if (!data) {
      console.log('⚠️  데이터 조회 실패 (아직 추첨 결과가 없을 수 있음)')
      return
    }

    await prisma.lottoDraw.upsert({
      where: { round: data.drwNo },
      create: {
        round: data.drwNo,
        drawDate: data.drawDate,
        numbers: data.numbers,
        bonus: data.bonus,
        prize1st: BigInt(data.prize1st ?? 0),
        winners1st: data.winners1st ?? 0,
        prize2nd: BigInt(data.prize2nd ?? 0),
        winners2nd: data.winners2nd ?? 0,
        prize3rd: data.prize3rd ?? null,
        winners3rd: data.winners3rd ?? null,
        prize4th: data.prize4th ?? null,
        winners4th: data.winners4th ?? null,
        prize5th: data.prize5th ?? null,
        winners5th: data.winners5th ?? null,
      },
      update: {
        prize2nd: BigInt(data.prize2nd ?? 0),
        winners2nd: data.winners2nd ?? 0,
        prize3rd: data.prize3rd ?? null,
        winners3rd: data.winners3rd ?? null,
        prize4th: data.prize4th ?? null,
        winners4th: data.winners4th ?? null,
        prize5th: data.prize5th ?? null,
        winners5th: data.winners5th ?? null,
      },
    })

    // 당첨판매점 저장 (DB에 없을 때만)
    let savedStores = []
    const storeCount = await prisma.lottoDrawStore.count({ where: { round: data.drwNo } })
    if (storeCount === 0) {
      try {
        const storeRes = await fetch(`https://www.redinfo.co.kr/lotto/w/store?no=${data.drwNo}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'text/html, */*',
            'X-Requested-With': 'XMLHttpRequest',
          },
          signal: AbortSignal.timeout(15000),
        })
        if (storeRes.ok) {
          const json = await storeRes.json()
          const html = json.html ?? json

          const win1Start = html.indexOf('class="list-item this-win1')
          if (win1Start !== -1) {
            const win2Start = html.indexOf('class="list-item this-win2', win1Start)
            const win1Block = html.slice(win1Start, win2Start > win1Start ? win2Start : html.length)
            const items = win1Block.split('<div class="item">')
            savedStores = []
            for (let i = 1; i < items.length; i++) {
              const block = items[i]
              const gubunMatch = block.match(/this-gubun-(\d)/)
              const method = gubunMatch?.[1] === '2' ? '수동' : '자동'
              const nameMatch = block.match(/<div class="name">([\s\S]*?)<\/div>/)
              const name = nameMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
              const addrMatch = block.match(/data-addr="([^"]+)"/)
              const address = addrMatch?.[1]?.trim()
              if (name && address) savedStores.push({ round: data.drwNo, name, address, method })
            }
            if (savedStores.length > 0) {
              await prisma.lottoDrawStore.createMany({ data: savedStores, skipDuplicates: true })
              console.log(`  당첨판매점 ${savedStores.length}개 저장`)
            }
          }
        }
      } catch (e) {
        console.error('당첨판매점 저장 실패:', e.message)
      }
    }

    // 엑셀 파일 업데이트
    appendToExcel({
      round: data.drwNo,
      numbers: data.numbers,
      bonus: data.bonus,
      prize1st: BigInt(data.prize1st ?? 0),
      winners1st: data.winners1st ?? 0,
      prize2nd: BigInt(data.prize2nd ?? 0),
      winners2nd: data.winners2nd ?? 0,
    }, savedStores)

    console.log(`✅ ${data.drwNo}회 업데이트 완료`)
    console.log(`   당첨번호: ${data.numbers.join(', ')} + ${data.bonus}`)
    console.log(`   1등: ${data.prize1st?.toLocaleString()} (${data.winners1st}명)`)
  } catch (e) {
    console.error('❌ 오류:', e.message)
  }
}

// 크론 잡 설정
export function startLottoCron() {
  // 매주 토요일 20:50
  const job = cron.schedule('50 20 * * 6', async () => {
    await updateLatestDraw()
  })

  console.log('🕐 로또 자동 업데이트 스케줄 시작: 매주 토요일 20:50')
  return job
}

// 수동 실행
if (process.argv[1].includes('update-lotto.mjs')) {
  updateLatestDraw().then(() => {
    prisma.$disconnect()
    process.exit(0)
  })
}

export default { startLottoCron, updateLatestDraw }
