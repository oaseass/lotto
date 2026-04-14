// ================================
// API: 회원가입 (사주 정보 포함)
// POST /api/auth/register
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
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
    const { nickname, email, password, gender, saju } = await req.json()

    if (!nickname || !email || !password) {
      return NextResponse.json({ error: '필수 정보를 입력해주세요' }, { status: 400 })
    }

    // 이메일 형식 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '올바른 이메일 형식을 입력해주세요' }, { status: 400 })
    }

    // 비밀번호 길이 검증 (bcrypt는 72바이트 초과 시 잘림)
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: '비밀번호는 8자 이상 72자 이하로 입력해주세요' }, { status: 400 })
    }

    // 중복 이메일 체크
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 })
    }

    // 비번 해시
    const passwordHash = await bcrypt.hash(password, 12)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        nickname,
        gender: gender || null,
      },
    })

    // 사주 정보가 있다면 저장
    if (saju?.birthYear && saju?.birthMonth && saju?.birthDay) {
      try {
        // 1) 음력이면 먼저 양력으로 변환
        let solarYear = saju.birthYear
        let solarMonth = saju.birthMonth
        let solarDay = saju.birthDay

        if (saju.isLunar) {
          const converted = lunarToSolar(saju.birthYear, saju.birthMonth, saju.birthDay, saju.isLeapMonth ?? false)
          if (!converted) throw new Error('음력 변환 실패')
          solarYear = converted.year
          solarMonth = converted.month
          solarDay = converted.day
        }

        // 2) 양력 기준으로 사주 계산
        const cheonjigan = calculateSaju(solarYear, solarMonth, solarDay, saju.birthHour || null)
        const ohaeng = calculateOhaengRatio(cheonjigan)
        const yongsin = calculateYongsin(ohaeng).join(',')
        const ilju = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`

        await prisma.sajuProfile.create({
          data: {
            userId: user.id,
            birthYear: saju.birthYear,
            birthMonth: saju.birthMonth,
            birthDay: saju.birthDay,
            birthHour: saju.birthHour || null,
            isLunar: saju.isLunar || false,
            isLeapMonth: saju.isLeapMonth ?? false,
            solarYear,
            solarMonth,
            solarDay,
            cheonjigan: cheonjigan as any,
            ohaeng: ohaeng as any,
            ilju,
            yongsin,
          },
        })
      } catch (err) {
        console.error('사주 계산 오류:', err)
        // 사주 정보 오류는 무시하고 사용자는 생성
      }
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      nickname: user.nickname,
    }, { status: 201 })
  } catch (error) {
    console.error('회원가입 오류:', error)
    return NextResponse.json({ error: '회원가입에 실패했습니다' }, { status: 500 })
  }
}
