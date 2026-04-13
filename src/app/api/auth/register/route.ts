// ================================
// API: 회원가입 (사주 정보 포함)
// POST /api/auth/register
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { calculateSaju, calculateOhaengRatio, calculateYongsin } from '@/lib/saju/calculator'

export async function POST(req: NextRequest) {
  try {
    const { nickname, email, password, gender, saju } = await req.json()

    if (!nickname || !email || !password) {
      return NextResponse.json({ error: '필수 정보를 입력해주세요' }, { status: 400 })
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
        // 사주 계산
        const cheonjigan = calculateSaju(
          saju.birthYear,
          saju.birthMonth,
          saju.birthDay,
          saju.birthHour || null,
        )

        const ohaeng = calculateOhaengRatio(cheonjigan)
        const yongsin = calculateYongsin(ohaeng).join(',')
        const ilju = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`

        // 양력 변환 (음력 → 양력)
        const solarDate = saju.isLunar
          ? lunarToSolar(saju.birthYear, saju.birthMonth, saju.birthDay)
          : { year: saju.birthYear, month: saju.birthMonth, day: saju.birthDay }

        await prisma.sajuProfile.create({
          data: {
            userId: user.id,
            birthYear: saju.birthYear,
            birthMonth: saju.birthMonth,
            birthDay: saju.birthDay,
            birthHour: saju.birthHour || null,
            isLunar: saju.isLunar || false,
            solarYear: solarDate.year,
            solarMonth: solarDate.month,
            solarDay: solarDate.day,
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

// 간단한 음력→ 양력 변환 (근사치)
function lunarToSolar(year: number, month: number, day: number) {
  // 실제로는 정확한 변환 테이블이 필요하지만, 여기서는 간단한 근사치 사용
  // 대부분의 경우 1-2개월 차이
  let solarYear = year
  let solarMonth = month + 1
  let solarDay = day

  if (solarMonth > 12) {
    solarMonth -= 12
    solarYear += 1
  }

  if (solarDay > 28) solarDay = Math.min(solarDay, 28)

  return { year: solarYear, month: solarMonth, day: solarDay }
}
