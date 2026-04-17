'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [isLunar, setIsLunar] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    } else if (status === 'authenticated' && session.user.hasSajuProfile) {
      router.replace('/home')
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!birthYear || !birthMonth || !birthDay || !birthHour) {
      setError('사주 정보는 모두 필수입니다')
      return
    }

    setIsLoading(true)
    try {
      const [hour, minute] = birthHour.split(':').map(Number)
      const birthHourFloat = hour + (minute >= 30 ? 0.5 : 0)

      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear: parseInt(birthYear),
          birthMonth: parseInt(birthMonth),
          birthDay: parseInt(birthDay),
          birthHour: birthHourFloat,
          isLunar,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '저장에 실패했습니다')
        return
      }

      await update()
      router.replace('/home')
    } catch {
      setError('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, padding: '0 10px',
    fontSize: 13, color: '#333',
    border: '1px solid #dcdcdc', borderRadius: 2,
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  if (status === 'loading') {
    return <div style={{ minHeight: '100vh', background: '#060d25' }} />
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{
        background: '#007bc3', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>사주로또</span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 60px' }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '24px 20px 16px', textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>☯️</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 6 }}>사주 정보 입력</p>
          <p style={{ fontSize: 13, color: '#888', lineHeight: 1.5 }}>
            정확한 사주 분석을 위해<br/>생년월일시를 입력해주세요
          </p>
        </div>

        <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>생년 *</label>
                <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1990" min="1900" max="2020" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>월 *</label>
                <input type="number" value={birthMonth} onChange={e => setBirthMonth(e.target.value)} placeholder="1" min="1" max="12" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>일 *</label>
                <input type="number" value={birthDay} onChange={e => setBirthDay(e.target.value)} placeholder="1" min="1" max="31" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>시간 * (HH:MM)</label>
                <input type="time" value={birthHour} onChange={e => setBirthHour(e.target.value)} required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 12px', background: '#f9f9f9', borderRadius: 2 }}>
              <input
                type="checkbox"
                id="isLunar"
                checked={isLunar}
                onChange={e => setIsLunar(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="isLunar" style={{ fontSize: 12, color: '#666', cursor: 'pointer', flex: 1 }}>
                음력입니다
              </label>
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#dc1f1f', borderRadius: 2 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} style={{
              width: '100%', height: 43,
              background: isLoading ? '#7ab5e0' : '#007bc3',
              border: '1px solid #005a94',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer', borderRadius: 2,
            }}>
              {isLoading ? '처리 중...' : '사주 분석 시작하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
