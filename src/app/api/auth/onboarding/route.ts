// ================================
// API: 온보딩 - 사주 프로필 저장 (소셜 로그인 신규 유저)
// POST /api/auth/onboarding
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSaju, calculateOhaengRatio, calculateYongsin } from '@/lib/saju/calculator'

let KoreanLunarCalendar: any
try { KoreanLunarCalendar = require('korean-lunar-calendar') } catch {}

function lunarToSolar(year: number, month: number, day: number, isLeap: boolean) {
  if (!KoreanLunarCalendar) return null
  try {
    const cal = new KoreanLunarCalendar()
    cal.setLunarDate(year, month, day, isLeap)
    const solar = cal.getSolarCalendar()
    if (!solar?.year) return null
    return solar as { year: number; month: number; day: number }
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 이미 프로필 있으면 중복 생성 방지
    const existing = await prisma.sajuProfile.findUnique({ where: { userId: session.user.id } })
    if (existing) {
      return NextResponse.json({ error: '이미 사주 프로필이 등록되어 있습니다' }, { status: 409 })
    }

    const { birthYear, birthMonth, birthDay, birthHour, isLunar } = await req.json()

    if (!birthYear || !birthMonth || !birthDay) {
      return NextResponse.json({ error: '생년월일을 입력해주세요' }, { status: 400 })
    }

    let solarYear = birthYear
    let solarMonth = birthMonth
    let solarDay = birthDay

    if (isLunar) {
      const converted = lunarToSolar(birthYear, birthMonth, birthDay, false)
      if (!converted) {
        return NextResponse.json({ error: '음력 변환에 실패했습니다' }, { status: 400 })
      }
      solarYear = converted.year
      solarMonth = converted.month
      solarDay = converted.day
    }

    const cheonjigan = calculateSaju(solarYear, solarMonth, solarDay, birthHour ?? null)
    const ohaeng = calculateOhaengRatio(cheonjigan)
    const yongsin = calculateYongsin(ohaeng).join(',')
    const ilju = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`

    await prisma.sajuProfile.create({
      data: {
        userId: session.user.id,
        birthYear,
        birthMonth,
        birthDay,
        birthHour: birthHour ?? null,
        isLunar: isLunar || false,
        isLeapMonth: false,
        solarYear,
        solarMonth,
        solarDay,
        cheonjigan: cheonjigan as any,
        ohaeng: ohaeng as any,
        ilju,
        yongsin,
      },
    })

    return NextResponse.json({ success: true, ilju, yongsin })
  } catch (error) {
    console.error('온보딩 오류:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
