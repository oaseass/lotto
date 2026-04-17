'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function FindIdPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [result, setResult] = useState<{ email: string; createdAt: string }[] | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '조회에 실패했습니다')
      } else {
        setResult(data.accounts)
      }
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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      <header style={{
        background: '#007bc3', height: 48,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center', marginRight: 28 }}>아이디 찾기</span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 60px' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
            가입 시 입력한 이름으로 아이디(이메일)를 찾을 수 있습니다.
          </p>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이름 *</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="가입 시 입력한 이름"
                required
                style={inputStyle}
              />
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
              {isLoading ? '조회 중...' : '아이디 찾기'}
            </button>
          </form>
        </div>

        {result && (
          <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 12 }}>조회 결과</p>
            {result.map((acc, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: '#f0f7ff',
                border: '1px solid #c0d8f0', borderRadius: 2, marginBottom: 8,
              }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#007bc3' }}>{acc.email}</span>
                <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                  가입일: {new Date(acc.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            ))}
            <Link href="/login" style={{
              display: 'block', marginTop: 12, textAlign: 'center',
              fontSize: 14, color: '#007bc3', fontWeight: 600, textDecoration: 'none',
            }}>
              로그인하러 가기 →
            </Link>
          </div>
        )}

        <div style={{
          background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
          padding: '14px 20px', display: 'flex', justifyContent: 'center', gap: 16,
        }}>
          <Link href="/login" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>로그인</Link>
          <span style={{ fontSize: 13, color: '#dcdcdc' }}>|</span>
          <Link href="/find-password" style={{ fontSize: 13, color: '#888', textDecoration: 'none' }}>비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  )
}
