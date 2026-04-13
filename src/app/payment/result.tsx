'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ================================
// 결제 성공
// ================================
export function PaymentSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) return

    // 결제 확인 API 호출
    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount) }),
    }).then(() => {
      setTimeout(() => router.push('/home'), 2000)
    })
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="text-6xl">🎉</div>
      <h1 className="text-2xl font-extrabold text-brand-gold">결제 완료!</h1>
      <p className="text-gray-400">광고가 영구 제거되었습니다</p>
      <p className="text-xs text-gray-600">잠시 후 홈으로 이동합니다...</p>
    </div>
  )
}

// ================================
// 결제 실패
// ================================
export function PaymentFailPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center space-y-4">
      <div className="text-6xl">😢</div>
      <h1 className="text-2xl font-extrabold text-red-400">결제 실패</h1>
      <p className="text-gray-400">결제가 취소되었거나 오류가 발생했습니다</p>
      <button onClick={() => router.back()} className="btn-gold px-8">
        다시 시도
      </button>
    </div>
  )
}
