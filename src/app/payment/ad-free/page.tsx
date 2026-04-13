'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function AdFreePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    if (!session) {
      router.push('/login')
      return
    }

    setIsLoading(true)
    try {
      const script = document.createElement('script')
      script.src = 'https://js.tosspayments.com/v2/standard'
      document.head.appendChild(script)
      await new Promise(resolve => { script.onload = resolve })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tossPayments = (window as any).TossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!)
      await tossPayments.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: 5000 },
        orderId: `ad-free-${session.user?.id}-${Date.now()}`,
        orderName: '사주로또 광고 제거 (영구)',
        customerEmail: session.user?.email || undefined,
        customerName: session.user?.name || undefined,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      })
    } catch (error) {
      console.error('결제 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* 헤더 */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✨</div>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--amber)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            광고 없이 사용하기
          </p>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>단 한 번의 결제로 영구 광고 제거</p>
        </div>

        {/* 혜택 */}
        <div style={{
          padding: '18px', borderRadius: 18, marginBottom: 16,
          background: 'var(--bg-card)', border: '1px solid var(--line)',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {[
            '모든 광고 영구 제거',
            '번호 생성 결과 깔끔하게',
            'QR 스캔 결과 깔끔하게',
            '추가 구독료 없음',
          ].map(benefit => (
            <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%',
                background: 'rgba(212,168,67,0.12)', border: '1px solid rgba(212,168,67,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: 'var(--amber)', fontWeight: 700, flexShrink: 0,
              }}>
                ✓
              </span>
              <span style={{ fontSize: 13, color: 'var(--t1)' }}>{benefit}</span>
            </div>
          ))}
        </div>

        {/* 가격 */}
        <div style={{
          padding: '24px', borderRadius: 18, marginBottom: 20, textAlign: 'center',
          background: 'var(--bg-card)',
          border: '1px solid rgba(212,168,67,0.25)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--t3)', textDecoration: 'line-through', marginBottom: 4 }}>₩9,900</p>
          <p style={{ fontSize: 42, fontWeight: 900, color: 'var(--amber)', letterSpacing: '-2px', lineHeight: 1.1 }}>
            ₩5,000
          </p>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>일회성 결제 · 영구 적용</p>
        </div>

        <button
          onClick={handlePayment}
          disabled={isLoading}
          className="btn-primary"
          style={{ width: '100%', fontSize: 16 }}
        >
          {isLoading ? '결제 중...' : '₩5,000 결제하기'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--t3)', marginTop: 12 }}>
          토스페이먼츠 안전 결제 · 취소 불가
        </p>
      </div>
    </div>
  )
}
