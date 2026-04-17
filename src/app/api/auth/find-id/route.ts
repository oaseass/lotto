// ================================
// API: 아이디(이메일) 찾기
// POST /api/auth/find-id
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`
}

export async function POST(req: NextRequest) {
  try {
    const { nickname } = await req.json()

    if (!nickname?.trim()) {
      return NextResponse.json({ error: '이름을 입력해주세요' }, { status: 400 })
    }

    const users = await prisma.user.findMany({
      where: { nickname: nickname.trim() },
      select: { email: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    if (users.length === 0) {
      return NextResponse.json({ error: '해당 이름으로 가입된 계정이 없습니다' }, { status: 404 })
    }

    return NextResponse.json({
      accounts: users.map(u => ({
        email: maskEmail(u.email),
        createdAt: u.createdAt,
      })),
    })
  } catch (error) {
    console.error('아이디 찾기 오류:', error)
    return NextResponse.json({ error: '처리 중 오류가 발생했습니다' }, { status: 500 })
  }
}
