// GET /api/lotto/stores?top=20 or ?region=서울 or ?q=검색어
// or ?lat=37.5&lng=126.9&ohaeng=목&radius=10 (GPS+방위)
// or ?ohaeng=목 (사주 전국 추천)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { calculateDistance, calculateBearing, isInLuckyDirection } from '@/lib/saju/direction'

// ── 지역 오행 매핑 (한반도 방위 기준) ──────────────────────────────
// 기준점: 충북 보은 부근 (한반도 지리적 중심)
// 동쪽(목) 강원·경북·대구·울산  남쪽(화) 부산·경남·전남·제주
// 서쪽(금) 인천·전북·광주       북쪽(수) 서울·경기
// 중앙(토) 충북·충남·대전·세종
const REGION_OHAENG: [string, string][] = [
  ['강원', '목'], ['경북', '목'], ['대구', '목'], ['울산', '목'],
  ['부산', '화'], ['경남', '화'], ['전남', '화'], ['제주', '화'],
  ['충북', '토'], ['충남', '토'], ['대전', '토'], ['세종', '토'], ['경기', '토'],
  ['인천', '금'], ['전북', '금'], ['광주', '금'],
  ['서울', '수'],
]

function getRegionOhaeng(address: string): string | null {
  for (const [region, ohaeng] of REGION_OHAENG) {
    if (address.includes(region)) return ohaeng
  }
  return null
}

// 수리(數理) 오행: 천하도 수리 (1,6→수 / 2,7→화 / 3,8→목 / 4,9→금 / 0,5→토)
function getNumOhaeng(addressNumber: number | null): string | null {
  if (addressNumber == null) return null
  const n = addressNumber % 10
  if (n === 1 || n === 6) return '수'
  if (n === 2 || n === 7) return '화'
  if (n === 3 || n === 8) return '목'
  if (n === 4 || n === 9) return '금'
  return '토'
}

function calcSajuScore(
  store: { address: string; addressNumber?: number | null; winCount1st: number },
  weakOhaeng: string[],  // 부족 기운 우선순위 순 (1~3개)
  maxWin: number
): { score: number; regionOhaeng: string | null; numOhaeng: string | null } {
  let score = 0
  const regionOhaeng = getRegionOhaeng(store.address)
  const numOhaeng = getNumOhaeng(store.addressNumber ?? null)

  // 지역 오행: 1순위 50점, 2순위 30점, 3순위 20점
  const regionWeights = [50, 30, 20]
  // 번지 수리: 1순위 20점, 2순위 12점, 3순위 8점
  const numWeights = [20, 12, 8]

  weakOhaeng.forEach((oh, idx) => {
    if (regionOhaeng === oh) score += regionWeights[idx] ?? 10
    if (numOhaeng === oh) score += numWeights[idx] ?? 5
  })
  if (maxWin > 0) score += Math.round((store.winCount1st / maxWin) * 30) // 당첨 실적: 30점

  return { score, regionOhaeng, numOhaeng }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')
  const q = searchParams.get('q')?.trim()
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  const ohaeng = searchParams.get('ohaeng')
  const radius = parseFloat(searchParams.get('radius') || '10')
  const top = parseInt(searchParams.get('top') || '20', 10)

  try {
    const excludeInternet: Prisma.LottoStoreWhereInput = {
      NOT: { address: { contains: 'dhlottery' } },
    }

    let where: Prisma.LottoStoreWhereInput = excludeInternet

    if (q) {
      where = {
        ...excludeInternet,
        OR: [
          { name: { contains: q } },
          { address: { contains: q } },
        ],
      }
    } else if (region) {
      where = {
        ...excludeInternet,
        OR: [
          { address: { contains: region } },
          { district: { contains: region } },
        ],
      }
    }

    // ── 사주 전국 추천 모드 (ohaeng만, lat/lng 없음) ──────────────────
    if (ohaeng && !lat && !lng) {
      const weakOhaeng = ohaeng.split(',').filter(Boolean) // 쉼표 구분 배열
      const candidates = await prisma.lottoStore.findMany({
        where,
        orderBy: { winCount1st: 'desc' },
        take: 200,
        select: {
          id: true, name: true, address: true, district: true,
          addressNumber: true, winCount1st: true,
          lat: true, lng: true, phone: true,
        },
      })

      const maxWin = candidates[0]?.winCount1st ?? 1

      const scored = candidates
        .map(store => {
          const { score, regionOhaeng, numOhaeng } = calcSajuScore(store, weakOhaeng, maxWin)
          return { ...store, sajuScore: score, regionOhaeng, numOhaeng }
        })
        .sort((a, b) => b.sajuScore - a.sajuScore)
        .slice(0, top)

      return NextResponse.json(scored)
    }

    // ── 사주 + 위치 반경 모드 (ohaeng + lat + lng) ──────────────────
    if (ohaeng && lat !== null && lng !== null) {
      const weakOhaeng = ohaeng.split(',').filter(Boolean)
      const latDelta = radius / 111
      const lngDelta = radius / 88
      const candidates = await prisma.lottoStore.findMany({
        where: {
          ...excludeInternet,
          lat: { gte: lat - latDelta, lte: lat + latDelta },
          lng: { gte: lng - lngDelta, lte: lng + lngDelta },
        },
        orderBy: { winCount1st: 'desc' },
        take: 200,
        select: {
          id: true, name: true, address: true, district: true,
          addressNumber: true, winCount1st: true, lat: true, lng: true,
        },
      })

      const inRadius = candidates.filter(
        s => s.lat != null && s.lng != null && calculateDistance(lat, lng, s.lat, s.lng) <= radius
      )

      const maxWin = inRadius.reduce((m, s) => Math.max(m, s.winCount1st), 1)
      const scored = inRadius
        .map(store => {
          const { score, regionOhaeng, numOhaeng } = calcSajuScore(store, weakOhaeng, maxWin)
          const distance = calculateDistance(lat, lng, store.lat!, store.lng!)
          return { ...store, sajuScore: score, regionOhaeng, numOhaeng, distance }
        })
        .sort((a, b) => b.sajuScore - a.sajuScore)
        .slice(0, top)

      return NextResponse.json(scored)
    }

    // GPS 바운딩 박스 pre-filter
    if (lat && lng) {
      const latDelta = radius / 111
      const lngDelta = radius / 88
      where = {
        ...where,
        lat: { gte: lat - latDelta, lte: lat + latDelta },
        lng: { gte: lng - lngDelta, lte: lng + lngDelta },
      }
    }

    let stores = await prisma.lottoStore.findMany({
      where,
      orderBy: { winCount1st: 'desc' },
      take: lat && lng ? undefined : top * 2,
      select: {
        id: true, name: true, address: true, district: true,
        lat: true, lng: true, winCount1st: true,
        phone: true, lastUpdated: true,
      },
    })

    // GPS+방위 정렬
    if (lat && lng && ohaeng) {
      const withDistance = stores
        .map(store => {
          if (!store.lat || !store.lng) return null
          const distance = calculateDistance(lat, lng, store.lat, store.lng)
          if (distance > radius) return null
          const bearing = calculateBearing(lat, lng, store.lat, store.lng)
          const isLucky = isInLuckyDirection(bearing, ohaeng)
          return { ...store, distance, bearing, isLucky }
        })
        .filter((s): s is typeof stores[0] & { distance: number; bearing: number; isLucky: boolean } => s !== null)
        .sort((a, b) => {
          if (a.isLucky !== b.isLucky) return a.isLucky ? -1 : 1
          if (a.distance !== b.distance) return a.distance - b.distance
          return b.winCount1st - a.winCount1st
        })

      return NextResponse.json(withDistance.slice(0, top))
    }

    return NextResponse.json(stores.slice(0, top))
  } catch (error) {
    console.error('Store fetch error:', error)
    return NextResponse.json({ error: '판매점 조회 중 오류가 발생했습니다' }, { status: 500 })
  }
}
