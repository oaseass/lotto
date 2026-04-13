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

    const cheonjigan = calculateSaju(sy, sm, sd, profile.birthHour)

    // gender: User 모델에서 가져옴
    const genderRaw = profile.user.gender
    const gender: 'M' | 'F' = genderRaw === 'F' ? 'F' : 'M'

    const result = calculateDaeun(sy, sm, sd, gender, cheonjigan.month, cheonjigan.year)

    return NextResponse.json(result)
  } catch (error) {
    console.error('대운 계산 오류:', error)
    return NextResponse.json({ error: '계산 실패' }, { status: 500 })
  }
}
