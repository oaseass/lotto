// POST /api/lotto/stores/sync-odcloud
// 최근 N 회차 1등 당첨 판매점을 집계해서 LottoStore DB 갱신
// (기존 odcloud 방식 → dhlottery selectLtWnShp.do 방식으로 교체)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { estimateCurrentRound } from '@/lib/lotto/dhlottery'

interface DhStore {
  ltShpId: string
  shpNm: string
  shpAddr: string
  shpLat: number | null
  shpLot: number | null
}

async function fetchRoundWinStores(round: number): Promise<DhStore[]> {
  try {
    const res = await fetch(
      `https://www.dhlottery.co.kr/wnprchsplcsrch/selectLtWnShp.do?srchWnShpRnk=1&srchLtEpsd=${round}&srchShpLctn=`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.dhlottery.co.kr/wnprchsplcsrch/home',
          'X-Requested-With': 'XMLHttpRequest',
        },
      }
    )
    if (!res.ok) return []
    const json = await res.json()
    return json?.data?.list ?? []
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const current = estimateCurrentRound()
  // 기본: 최근 2년치 (104주)
  const from: number = body.from ?? 1
  const to: number = body.to ?? current

  // ltShpId 기준으로 집계
  const storeMap = new Map<string, {
    name: string
    address: string
    lat: number | null
    lng: number | null
    count: number
  }>()

  let fetchedRounds = 0
  const CHUNK_SIZE = 50          // 한 번에 처리할 회차 수
  const DELAY_IN_CHUNK = 100     // 청크 내 요청 간격 (ms)
  const DELAY_BETWEEN_CHUNKS = 3000  // 청크 간 쉬는 시간 (ms)

  for (let round = from; round <= to; round++) {
    const stores = await fetchRoundWinStores(round)
    for (const s of stores) {
      const key = s.ltShpId
      if (!key) continue
      const existing = storeMap.get(key)
      if (existing) {
        existing.count++
      } else {
        storeMap.set(key, {
          name: s.shpNm?.trim() ?? '',
          address: s.shpAddr?.trim() ?? '',
          lat: s.shpLat ?? null,
          lng: s.shpLot ?? null,
          count: 1,
        })
      }
    }
    fetchedRounds++
    await new Promise(r => setTimeout(r, DELAY_IN_CHUNK))

    // 청크 경계마다 긴 휴식
    if (fetchedRounds % CHUNK_SIZE === 0) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN_CHUNKS))
    }
  }

  if (storeMap.size === 0) {
    return NextResponse.json({ error: '수집된 판매점 없음 (API 일시 차단 가능성)' }, { status: 500 })
  }

  // 수집 성공 후에만 기존 데이터 교체 (순서 중요: 삭제 전 수집 완료)
  const rows = [...storeMap.values()]
    .sort((a, b) => b.count - a.count)

  await prisma.lottoStore.deleteMany()
  await prisma.lottoStore.createMany({
    data: rows.map(s => ({
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      district: s.address.split(' ')[0] || null,
      winCount1st: s.count,
    })),
  })

  return NextResponse.json({
    ok: true,
    rounds: fetchedRounds,
    stores: rows.length,
    top5: rows.slice(0, 5).map(s => ({ name: s.name, count: s.count, address: s.address })),
  })
}
