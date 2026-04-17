export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDaeun } from '@/lib/saju/daeun'
import { calculateSaju } from '@/lib/saju/calculator'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const profile = await prisma.sajuProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { gender: true } } },
    })
    if (!profile) return NextResponse.json({ error: '사주 프로필 없음' }, { status: 404 })

    const sy = profile.solarYear ?? profile.birthYear
    const sm = profile.solarMonth ?? profile.birthMonth
    const sd = profile.solarDay ?? profile.birthDay

    // 저장된 cheonjigan 재사용 — calculateSaju 재실행 비용 절감
    const stored = profile.cheonjigan as any
    let monthPillar: any, yearPillar: any
    if (stored?.month && stored?.year) {
      monthPillar = stored.month
      yearPillar = stored.year
    } else {
      const cj = calculateSaju(sy, sm, sd, profile.birthHour)
      monthPillar = cj.month
      yearPillar = cj.year
    }

    const gender: 'M' | 'F' = profile.user.gender === 'F' ? 'F' : 'M'
    const result = calculateDaeun(sy, sm, sd, gender, monthPillar, yearPillar)

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800' },
    })
  } catch (error) {
    console.error('대운 계산 오류:', error)
    return NextResponse.json({ error: '계산 실패' }, { status: 500 })
  }
}
