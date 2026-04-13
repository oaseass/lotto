'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PaymentFailInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorCode = searchParams.get('code')
  const errorMessage = searchParams.get('message')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', background: 'var(--bg)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>😢</div>
      <p style={{ fontSize: 22, fontWeight: 900, color: '#FF6B6B', marginBottom: 8 }}>결제 실패</p>
      <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 4 }}>
        {errorMessage || '결제가 취소되었거나 오류가 발생했습니다'}
      </p>
      {errorCode && (
        <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 24 }}>오류 코드: {errorCode}</p>
      )}
      {!errorCode && <div style={{ marginBottom: 24 }} />}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 24px', borderRadius: 14,
            background: 'linear-gradient(145deg, #E8B84B, #B8881E)',
            color: '#1A1000', fontSize: 14, fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/home')}
          style={{
            padding: '12px 24px', borderRadius: 14,
            background: 'var(--bg-raised)', border: '1px solid var(--line)',
            color: 'var(--t2)', fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  )
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <p style={{ color: 'var(--t3)' }}>로딩 중...</p>
      </div>
    }>
      <PaymentFailInner />
    </Suspense>
  )
}
