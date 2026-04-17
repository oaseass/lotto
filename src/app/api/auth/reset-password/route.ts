// ================================
// API: 비밀번호 재설정
// POST /api/auth/reset-password
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, nickname, newPassword } = await req.json()

    if (!email || !nickname || !newPassword) {
      return NextResponse.json({ error: '필수 정보를 입력해주세요' }, { status: 400 })
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json({ error: '비밀번호는 8자 이상 72자 이하로 입력해주세요' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // 이메일+닉네임 불일치 시에도 동일한 에러 반환 (보안상 이메일 존재 여부 노출 방지)
    if (!user || user.nickname !== nickname) {
      return NextResponse.json({ error: '이메일 또는 이름이 올바르지 않습니다' }, { status: 400 })
    }

    // 소셜 전용 계정은 비밀번호 없음
    if (!user.passwordHash) {
      return NextResponse.json({ error: '소셜 로그인 계정은 비밀번호를 변경할 수 없습니다' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
