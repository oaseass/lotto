'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다')
      } else {
        router.push('/home')
      }
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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        background: '#007bc3', height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>사주로또</span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 60px' }}>

        {/* 로고 영역 */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #dcdcdc',
          padding: '28px 20px 22px', textAlign: 'center',
          marginBottom: 8,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#007bc3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>645</span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 4 }}>로그인</p>
          <p style={{ fontSize: 13, color: '#888' }}>사주로또 서비스를 이용하세요</p>
        </div>

        {/* 폼 */}
        <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
          <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이메일</label>
              <input type="email" name="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 주소" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>비밀번호</label>
              <input type="password" name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호" required style={inputStyle} />
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
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
              <span style={{ fontSize: 12, color: '#aaa' }}>또는</span>
              <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            </div>
            <button
              onClick={() => signIn('kakao', { callbackUrl: '/home' })}
              style={{
                width: '100%', height: 43,
                background: '#FEE500', border: '1px solid #E6CF00',
                color: '#3C1E1E', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M9 1C4.58 1 1 3.914 1 7.5c0 2.29 1.52 4.3 3.81 5.45l-.97 3.6 4.19-2.76c.63.09 1.28.14 1.97.14 4.42 0 8-2.914 8-6.5S13.42 1 9 1z" fill="#3C1E1E"/>
              </svg>
              카카오로 로그인
            </button>
          </div>
        </div>

        <div style={{
          background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
          padding: '14px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#888' }}>아직 회원이 아니신가요?</span>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 600, color: '#007bc3', textDecoration: 'none' }}>
              회원가입 →
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <Link href="/find-id" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>아이디 찾기</Link>
            <span style={{ fontSize: 12, color: '#dcdcdc' }}>|</span>
            <Link href="/find-password" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>비밀번호 찾기</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
