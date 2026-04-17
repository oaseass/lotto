'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = 'verify' | 'reset' | 'done'

export default function FindPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('verify')
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, padding: '0 10px',
    fontSize: 13, color: '#333',
    border: '1px solid #dcdcdc', borderRadius: 2,
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      // 이메일+닉네임 조합이 유효한지 확인 (빈 newPassword로 시도하면 400 오류 → 페이지 이동 안 함)
      // 대신 서버에 verify 전용 요청을 바로 보내지 않고 step만 전환
      // (서버는 reset 요청 시 한 번에 검증)
      if (!email || !nickname) {
        setError('이메일과 이름을 모두 입력해주세요')
        return
      }
      setStep('reset')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nickname, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '비밀번호 재설정에 실패했습니다')
        // 이메일/이름 불일치 오류일 때만 인증 단계로 되돌아감
        if (data.error?.includes('이메일 또는 이름')) setStep('verify')
      } else {
        setStep('done')
      }
    } catch {
      setError('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{
        background: '#007bc3', height: 48,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <button onClick={() => step === 'verify' ? router.back() : setStep('verify')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center', marginRight: 28 }}>비밀번호 찾기</span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 60px' }}>

        {step === 'done' ? (
          <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '40px 20px', textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 8 }}>비밀번호가 변경되었습니다</p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>새 비밀번호로 로그인해주세요</p>
            <button
              onClick={() => signIn('credentials', { email, password: newPassword, callbackUrl: '/home' })}
              style={{
                width: '100%', height: 43,
                background: '#007bc3', border: '1px solid #005a94',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', borderRadius: 2,
              }}
            >
              바로 로그인
            </button>
          </div>
        ) : step === 'verify' ? (
          <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
              가입 시 입력한 이메일과 이름을 확인합니다.
            </p>
            <form onSubmit={handleVerify}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이메일 *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="가입 이메일" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이름 *</label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="가입 시 입력한 이름" required style={inputStyle} />
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
                다음
              </button>
            </form>
          </div>
        ) : (
          <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
              새 비밀번호를 입력해주세요.
            </p>
            <form onSubmit={handleReset}>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>새 비밀번호 *</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="새 비밀번호 (8자 이상)" required minLength={8} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>비밀번호 확인 *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="비밀번호 확인" required style={inputStyle} />
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
                marginBottom: 8,
              }}>
                {isLoading ? '처리 중...' : '비밀번호 변경'}
              </button>
              <button type="button" onClick={() => setStep('verify')} style={{
                width: '100%', height: 40, background: '#f5f5f5',
                border: '1px solid #dcdcdc', color: '#666', fontSize: 13, cursor: 'pointer', borderRadius: 2,
              }}>
                이전
              </button>
            </form>
          </div>
        )}

        <div style={{
          background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
          padding: '14px 20px', display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          <Link href="/login" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>로그인</Link>
          <span style={{ fontSize: 13, color: '#dcdcdc' }}>|</span>
          <Link href="/find-id" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>아이디 찾기</Link>
        </div>
      </div>
    </div>
  )
}
