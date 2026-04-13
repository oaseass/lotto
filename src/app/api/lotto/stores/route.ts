// GET /api/lotto/stores?top=20 or ?region=서울 or ?q=검색어 or ?lat=37.5&lng=126.9&ohaeng=목&radius=2
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { calculateDistance, calculateBearing, isInLuckyDirection } from '@/lib/saju/direction'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const region = searchParams.get('region')
  const q = searchParams.get('q')?.trim()
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  const ohaeng = searchParams.get('ohaeng')
  const radius = parseFloat(searchParams.get('radius') || '2')
  const top = parseInt(searchParams.get('top') || '20')

  try {
    // 인터넷 판매 채널 제외
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

    if (lat && lng) {
      where = {
        ...where,
        lat: { not: null },
        lng: { not: null },
      }
    }

    let stores = await prisma.lottoStore.findMany({
      where,
      orderBy: { winCount1st: 'desc' },
      take: top * 2, // GPS 필터링 전에 더 많이 가져오기
      select: {
        id: true,
        name: true,
        address: true,
        district: true,
        lat: true,
        lng: true,
        winCount1st: true,
        phone: true,
        lastUpdated: true,
      },
    })

    // GPS 기반 필터링 및 정렬
    if (lat && lng && ohaeng) {
      const filteredStores = stores
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
          // 길한 방위 우선, 그 다음 거리순
          if (a.isLucky !== b.isLucky) return a.isLucky ? -1 : 1
          if (a.distance !== b.distance) return a.distance - b.distance
          return b.winCount1st - a.winCount1st
        })
        .slice(0, top)

      return NextResponse.json(filteredStores)
    }

    return NextResponse.json(stores.slice(0, top))
  } catch (error) {
    console.error('Store fetch error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
