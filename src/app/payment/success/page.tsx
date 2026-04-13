'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PaymentSuccessInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'processing' | 'done' | 'error'>('processing')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      return
    }

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount: parseInt(amount) }),
    })
      .then(res => {
        if (res.ok) {
          setStatus('done')
          setTimeout(() => router.push('/home'), 2500)
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', background: 'var(--bg)', textAlign: 'center',
    }}>
      {status === 'processing' && (
        <>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--amber)' }}>결제 확인 중...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </>
      )}

      {status === 'done' && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--amber)', marginBottom: 8 }}>결제 완료!</p>
          <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 4 }}>광고가 영구 제거되었습니다</p>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>잠시 후 홈으로 이동합니다...</p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
          <p style={{ fontSize: 20, fontWeight: 900, color: '#FF6B6B', marginBottom: 8 }}>결제 확인 실패</p>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>결제는 완료되었을 수 있습니다. 고객센터에 문의해주세요.</p>
          <button
            onClick={() => router.push('/home')}
            style={{
              padding: '12px 32px', borderRadius: 14,
              background: 'linear-gradient(145deg, #E8B84B, #B8881E)',
              color: '#1A1000', fontSize: 14, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}
          >
            홈으로
          </button>
        </>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--t3)' }}>로딩 중...</p>
      </div>
    }>
      <PaymentSuccessInner />
    </Suspense>
  )
}
