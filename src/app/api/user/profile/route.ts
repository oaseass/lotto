// ================================
// API: 회원 정보 조회/수정
// GET /api/user/profile - 조회
// PUT /api/user/profile - 수정
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// 회원 정보 조회
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        nickname: true,
        email: true,
        gender: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('회원 정보 조회 오류:', error)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

// 회원 정보 수정
export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { nickname, gender, currentPassword, newPassword } = await req.json()

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })
    }

    // 비밀번호 변경 시 현재 비밀번호 검증
    if (newPassword) {
      if (!currentPassword || !user.passwordHash) {
        return NextResponse.json({ error: '현재 비밀번호를 입력해주세요' }, { status: 400 })
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValid) {
        return NextResponse.json({ error: '현재 비밀번호가 일치하지 않습니다' }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다' }, { status: 400 })
      }
    }

    // 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(nickname && { nickname }),
        ...(gender && { gender }),
        ...(newPassword && { passwordHash: await bcrypt.hash(newPassword, 12) }),
      },
      select: {
        id: true,
        nickname: true,
        email: true,
        gender: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('회원 정보 수정 오류:', error)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}
