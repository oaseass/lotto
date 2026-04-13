// ================================
// API: 사주 프로필 저장/조회
// GET  /api/saju/profile
// POST /api/saju/profile
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSaju, calculateOhaengRatio, calculateYongsin } from '@/lib/saju/calculator'

// korean-lunar-calendar: 음력 → 양력 변환
let KoreanLunarCalendar: any
try {
  KoreanLunarCalendar = require('korean-lunar-calendar')
} catch {}

function lunarToSolar(year: number, month: number, day: number, isLeap: boolean): { year: number; month: number; day: number } | null {
  if (!KoreanLunarCalendar) return null
  try {
    const cal = new KoreanLunarCalendar()
    cal.setLunarDate(year, month, day, isLeap)
    const solar = cal.getSolarCalendar()
    if (!solar || !solar.year) return null
    return solar
  } catch {
    return null
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const profile = await prisma.sajuProfile.findUnique({
    where: { userId: session.user.id },
  })

  return NextResponse.json(profile)
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { birthYear, birthMonth, birthDay, birthHour, isLunar, isLeapMonth, gender, calendarType } = await req.json()

    const isLunarFlag = isLunar ?? (calendarType === 'lunar')
    const isLeapFlag = isLeapMonth ?? false

    // 음력이면 양력으로 변환
    let solarYear = birthYear
    let solarMonth = birthMonth
    let solarDay = birthDay

    if (isLunarFlag) {
      const converted = lunarToSolar(birthYear, birthMonth, birthDay, isLeapFlag)
      if (!converted) {
        return NextResponse.json(
          { error: '음력 날짜 변환에 실패했습니다. 날짜를 확인해주세요.' },
          { status: 400 }
        )
      }
      solarYear = converted.year
      solarMonth = converted.month
      solarDay = converted.day
    }

    // 사주 계산 (양력 기준)
    const cheonjigan = calculateSaju(solarYear, solarMonth, solarDay, birthHour ?? null)
    const ohaeng = calculateOhaengRatio(cheonjigan)
    const yongsin = calculateYongsin(ohaeng).join(',')
    const ilju = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`

    const profile = await prisma.sajuProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        // 원본 입력값
        birthYear,
        birthMonth,
        birthDay,
        birthHour: birthHour ?? null,
        isLunar: isLunarFlag,
        isLeapMonth: isLeapFlag,
        // 변환된 양력
        solarYear,
        solarMonth,
        solarDay,
        // 사주 계산 결과
        cheonjigan: cheonjigan as object,
        ohaeng: ohaeng as object,
        ilju,
        yongsin,
      },
      update: {
        birthYear,
        birthMonth,
        birthDay,
        birthHour: birthHour ?? null,
        isLunar: isLunarFlag,
        isLeapMonth: isLeapFlag,
        solarYear,
        solarMonth,
        solarDay,
        cheonjigan: cheonjigan as object,
        ohaeng: ohaeng as object,
        ilju,
        yongsin,
      },
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('사주 프로필 저장 오류:', error)
    return NextResponse.json({ error: '저장에 실패했습니다' }, { status: 500 })
  }
}
