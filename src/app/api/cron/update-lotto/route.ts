// 매주 토요일 20:50 KST (11:50 UTC) 자동 실행
// 데이터 출처: api.lotto-haru.kr (당첨번호/등위별 통계)
//            redinfo.co.kr (1등 당첨판매점 HTML 파싱)

export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function fetchDraw(round: number) {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(
        `https://api.lotto-haru.kr/win/analysis.json?chasu=${round}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000),
          cache: 'no-store',
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      const item = data?.[0]
      if (!item?.ball?.length) return null
      return {
        drwNo: item.chasu as number,
        numbers: item.ball as number[],
        bonus: item.bonusBall as number,
        drawDate: new Date(item.date as string),
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
    } catch {
      if (i < 2) await new Promise(r => setTimeout(r, 1000))
    }
  }
  return null
}

async function fetchWinStores(round: number) {
  try {
    const res = await fetch(
      `https://www.redinfo.co.kr/lotto/w/store?no=${round}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Accept': 'text/html, */*',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    const html: string = json.html ?? json

    // 1등 판매점 섹션만 추출
    const win1Start = html.indexOf('class="list-item this-win1')
    if (win1Start === -1) return []
    const win2Start = html.indexOf('class="list-item this-win2', win1Start)
    const win1Block = html.slice(win1Start, win2Start > win1Start ? win2Start : html.length)

    const stores: { name: string; address: string; method: string }[] = []
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
  } catch {
    return []
  }
}

function estimateCurrentRound() {
  const BASE = new Date('2002-12-07')
  const diff = Date.now() - BASE.getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
}

export async function GET(req: NextRequest) {
  // 보안: Vercel이 자동으로 Authorization 헤더 추가, 또는 secret 쿼리로 수동 테스트
  const authHeader = req.headers.get('authorization')
  const secret = req.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret) {
    const valid = authHeader === `Bearer ${cronSecret}` || secret === cronSecret
    if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const round = estimateCurrentRound()
  const log: string[] = [`[${new Date().toISOString()}] 회차: ${round}`]

  try {
    // 1. 당첨번호 fetch
    const data = await fetchDraw(round)
    if (!data) {
      log.push('당첨번호 조회 실패 (추첨 전이거나 API 오류)')
      return NextResponse.json({ ok: false, log })
    }

    // 2. DB 저장
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
    log.push(`당첨번호 저장: ${data.numbers.join(',')} +${data.bonus}`)

    // 3. 판매점 fetch + 저장
    const storeCount = await prisma.lottoDrawStore.count({ where: { round: data.drwNo } })
    if (storeCount === 0) {
      const stores = await fetchWinStores(data.drwNo)
      if (stores.length > 0) {
        await prisma.lottoDrawStore.createMany({ data: stores.map((s: {name:string;address:string;method:string|null}) => ({ ...s, round: data.drwNo })), skipDuplicates: true })
        log.push(`판매점 ${stores.length}개 저장`)
      } else {
        log.push('판매점 정보 없음')
      }
    } else {
      log.push(`판매점 이미 존재 (${storeCount}개)`)
    }

    return NextResponse.json({ ok: true, round: data.drwNo, log })
  } catch (e: any) {
    log.push(`오류: ${e.message}`)
    return NextResponse.json({ ok: false, log }, { status: 500 })
  }
}
