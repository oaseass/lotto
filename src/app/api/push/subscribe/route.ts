// POST /api/push/subscribe  — FCM 토큰 저장
// DELETE /api/push/subscribe — FCM 토큰 삭제

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { token, platform = 'android' } = await req.json()
  if (!token) {
    return NextResponse.json({ error: 'token이 필요합니다' }, { status: 400 })
  }

  await prisma.pushToken.upsert({
    where: { token },
    create: { userId: session.user.id, token, platform },
    update: { userId: session.user.id, platform },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { token } = await req.json()
  if (!token) {
    return NextResponse.json({ error: 'token이 필요합니다' }, { status: 400 })
  }

  await prisma.pushToken.deleteMany({
    where: { token, userId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
