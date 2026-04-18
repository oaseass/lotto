'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

const SKIP_SPLASH_ONCE_KEY = 'skip-splash-once'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'basic' | 'saju'>('basic')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'N'>('N')

  // 사주 정보
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [isLunar, setIsLunar] = useState(false)

  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isKakaoLoading, setIsKakaoLoading] = useState(false)

  const handleBasicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nickname || !email || !password) {
      setError('필수 정보를 입력해주세요')
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }

    setStep('saju')
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // 사주 정보 필수 검증
    if (!birthYear || !birthMonth || !birthDay || !birthHour) {
      setError('사주 정보는 모두 필수입니다')
      setIsLoading(false)
      return
    }

    try {
      // 회원가입
      const [hour, minute] = birthHour.split(':').map(Number)

      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          email,
          password,
          gender: gender !== 'N' ? gender : null,
          saju: {
            birthYear: parseInt(birthYear),
            birthMonth: parseInt(birthMonth),
            birthDay: parseInt(birthDay),
            birthHour: hour + (minute >= 30 ? 0.5 : 0),
            isLunar,
          },
        }),
      })

      const registerData = await registerRes.json()
      if (!registerRes.ok) {
        setError(registerData.error || '회원가입에 실패했습니다')
        return
      }

      // 자동 로그인
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        router.push('/home')
      } else {
        router.push('/login')
      }
    } catch (err) {
      setError('회원가입에 실패했습니다')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKakaoSignIn = async () => {
    if (isLoading || isKakaoLoading) return

    setError('')
    setIsKakaoLoading(true)

    sessionStorage.setItem(SKIP_SPLASH_ONCE_KEY, 'true')

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => resolve())
    })

    try {
      await signIn('kakao', { callbackUrl: '/home' })
    } catch {
      sessionStorage.removeItem(SKIP_SPLASH_ONCE_KEY)
      setIsKakaoLoading(false)
      setError('카카오 로그인 연결에 실패했습니다. 다시 시도해주세요')
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
        <button onClick={() => step === 'basic' ? router.back() : setStep('basic')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center', marginRight: 28 }}>
          회원가입 {step === 'saju' ? '(2/2)' : '(1/2)'}
        </span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 60px' }}>

        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
          {step === 'basic' ? (
            <form onSubmit={handleBasicSubmit}>

              {/* 카카오 간편가입 */}
              <button
                type="button"
                disabled={isLoading || isKakaoLoading}
                onClick={() => void handleKakaoSignIn()}
                style={{
                  width: '100%', height: 44,
                  background: '#FEE500', border: 'none',
                  borderRadius: 4,
                  cursor: isLoading || isKakaoLoading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 700, color: '#191919',
                  marginBottom: 16,
                  opacity: isLoading || isKakaoLoading ? 0.7 : 1,
                }}
              >
                {isKakaoLoading ? (
                  <>
                    <span style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: '2px solid rgba(25,25,25,0.22)',
                      borderTopColor: '#191919',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    로그인 중입니다...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
                      <path d="M12 3C6.477 3 2 6.477 2 11c0 2.9 1.573 5.453 3.965 7.028L5 21l3.357-1.763C9.396 19.71 10.67 20 12 20c5.523 0 10-3.477 10-9S17.523 3 12 3z"/>
                    </svg>
                    카카오로 간편가입
                  </>
                )}
              </button>
              {isKakaoLoading && (
                <div style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  borderRadius: 4,
                  background: '#fffbea',
                  border: '1px solid #f1dd8f',
                  fontSize: 12,
                  color: '#6d5500',
                  textAlign: 'center',
                }}>
                  카카오 로그인 중입니다. 잠시만 기다려주세요.
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
                <span style={{ fontSize: 11, color: '#aaa', whiteSpace: 'nowrap' }}>또는 이메일로 가입</span>
                <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이름 *</label>
                <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="이름" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>성별</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ val: 'M', label: '남성' }, { val: 'F', label: '여성' }, { val: 'N', label: '선택 안함' }].map(g => (
                    <button
                      key={g.val}
                      type="button"
                      onClick={() => setGender(g.val as 'M' | 'F' | 'N')}
                      style={{
                        flex: 1, height: 40,
                        background: gender === g.val ? '#007bc3' : '#f5f5f5',
                        color: gender === g.val ? '#fff' : '#666',
                        border: '1px solid ' + (gender === g.val ? '#005a94' : '#dcdcdc'),
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
                      }}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>이메일 *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="이메일 주소" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#444', fontWeight: 500, display: 'block', marginBottom: 4 }}>비밀번호 *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="비밀번호 (8자 이상)" required minLength={8} style={inputStyle} />
              </div>

              {error && (
                <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#dc1f1f', borderRadius: 2 }}>
                  {error}
                </div>
              )}

              <button type="submit" style={{
                width: '100%', height: 43,
                background: '#007bc3',
                border: '1px solid #005a94',
                color: '#fff', fontSize: 15, fontWeight: 600,
                cursor: 'pointer', borderRadius: 2,
              }}>
                다음 (사주 정보)
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 14 }}>☯️ 사주 정보 *필수</p>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>정확한 사주 분석을 위해 시간과 분을 포함하여 입력해주세요</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 3 }}>생년 *</label>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                marginBottom: 8,
              }}>
                {isLoading ? '처리 중...' : '회원가입 완료'}
              </button>

              <button
                type="button"
                onClick={() => setStep('basic')}
                style={{
                  width: '100%', height: 40,
                  background: '#f5f5f5',
                  border: '1px solid #dcdcdc',
                  color: '#666', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', borderRadius: 2,
                }}
              >
                이전
              </button>
            </form>
          )}
        </div>

        {step === 'basic' && (
          <div style={{
            background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 13, color: '#888' }}>이미 회원이신가요?</span>
            <Link href="/login" style={{ fontSize: 13, fontWeight: 600, color: '#007bc3', textDecoration: 'none' }}>
              로그인 →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
