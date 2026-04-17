export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSaju, calculateOhaengRatio, calculateYongsin } from '@/lib/saju/calculator'
import { calculateDaeun } from '@/lib/saju/daeun'
import { generateReading } from '@/lib/saju/reading-template'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const profile = await prisma.sajuProfile.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { gender: true } } },
    })
    if (!profile) return NextResponse.json({ error: '사주 프로필 없음' }, { status: 404 })

    const sy = (profile as any).solarYear ?? profile.birthYear
    const sm = (profile as any).solarMonth ?? profile.birthMonth
    const sd = (profile as any).solarDay ?? profile.birthDay

    const cheonjigan = calculateSaju(sy, sm, sd, profile.birthHour)
    const ohaeng = (profile.ohaeng as any) ?? calculateOhaengRatio(cheonjigan)
    const yongsinArr = profile.yongsin ? profile.yongsin.split(',') : null
    const yongsin = yongsinArr?.[0] ?? calculateYongsin(ohaeng)[0]
    const gender: 'M' | 'F' = (profile as any).user?.gender === 'F' ? 'F' : 'M'
    const daeun = calculateDaeun(sy, sm, sd, gender, cheonjigan.month, cheonjigan.year)

    const result = generateReading(cheonjigan, ohaeng, yongsin, daeun, sy)

    return NextResponse.json(result)
  } catch (error) {
    console.error('사주 풀이 오류:', error)
    return NextResponse.json({ error: '사주 풀이 생성 실패' }, { status: 500 })
  }
}
