// ================================
// API: 토스페이먼츠 결제 확인
// POST /api/payment/confirm
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { paymentKey, orderId, amount } = await req.json()

    if (amount !== 5000) {
      return NextResponse.json({ error: '잘못된 결제 금액' }, { status: 400 })
    }

    // 토스페이먼츠 결제 확인
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    if (!tossRes.ok) {
      const err = await tossRes.json()
      return NextResponse.json({ error: err.message }, { status: 400 })
    }

    const payment = await tossRes.json()

    // DB 저장 + 광고 제거 플래그 설정
    await prisma.$transaction([
      prisma.adFreePurchase.create({
        data: {
          userId: session.user.id,
          amount: 5000,
          paymentKey,
          paymentMethod: payment.method,
          status: 'DONE',
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { isAdFree: true },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('결제 확인 오류:', error)
    return NextResponse.json({ error: '결제 확인 실패' }, { status: 500 })
  }
}
