'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UserProfile {
  id: string
  nickname: string
  email: string
  gender: 'M' | 'F' | 'N' | null
}

interface SajuProfile {
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null
  isLunar: boolean
  isLeapMonth: boolean
}

export default function EditProfilePage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  // 회원정보
  const [nickname, setNickname] = useState('')
  const [gender, setGender] = useState<'M' | 'F' | 'N'>('N')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 사주정보
  const [birthYear, setBirthYear] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthDay, setBirthDay] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [isLunar, setIsLunar] = useState(false)
  const [isLeapMonth, setIsLeapMonth] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { data: profile } = useQuery<UserProfile | null>({
    queryKey: ['user-profile-edit'],
    queryFn: async () => {
      const res = await fetch('/api/user/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session,
  })

  const { data: sajuProfile } = useQuery<SajuProfile | null>({
    queryKey: ['saju-profile-edit'],
    queryFn: async () => {
      const res = await fetch('/api/saju/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session,
  })

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
      setGender(profile.gender || 'N')
    }
  }, [profile])

  useEffect(() => {
    if (sajuProfile) {
      setBirthYear(sajuProfile.birthYear?.toString() || '')
      setBirthMonth(sajuProfile.birthMonth?.toString() || '')
      setBirthDay(sajuProfile.birthDay?.toString() || '')
      setBirthHour(sajuProfile.birthHour?.toString() || '')
      setIsLunar(sajuProfile.isLunar || false)
      setIsLeapMonth(sajuProfile.isLeapMonth || false)
    }
  }, [sajuProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!nickname.trim()) {
      setError('이름을 입력해주세요')
      return
    }

    // 사주 정보 필수 입력 검증
    if (!birthYear || !birthMonth || !birthDay) {
      setError('사주 정보는 필수입니다. 생년월일을 입력해주세요')
      return
    }

    if (!birthHour) {
      setError('정확한 사주 분석을 위해 시간(00:00 ~ 23:30)을 입력해주세요')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다')
      return
    }

    if (newPassword && !currentPassword) {
      setError('현재 비밀번호를 입력해주세요')
      return
    }

    setIsLoading(true)
    try {
      // 회원정보 수정
      const userRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          gender: gender !== 'N' ? gender : null,
          ...(newPassword && { currentPassword, newPassword }),
        }),
      })

      const userData = await userRes.json()
      if (!userRes.ok) {
        setError(userData.error || '회원정보 수정 실패')
        setIsLoading(false)
        return
      }

      // 사주정보 필수 저장
      const [hour, minute] = birthHour.split(':').map(Number)
      const sajuRes = await fetch('/api/saju/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear: parseInt(birthYear),
          birthMonth: parseInt(birthMonth),
          birthDay: parseInt(birthDay),
          birthHour: hour + (minute === 30 ? 0.5 : 0), // 시간 + 분(30분이면 0.5)
          isLunar,
          isLeapMonth,
        }),
      })

      const sajuData = await sajuRes.json()
      if (!sajuRes.ok) {
        setError('사주 정보 저장 실패: ' + (sajuData.error || '오류'))
        setIsLoading(false)
        return
      }

      setSuccess('정보가 저장되었습니다')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // 모든 관련 쿼리 즉시 무효화
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saju-profile-home'] }),
        queryClient.invalidateQueries({ queryKey: ['saju-profile-mypage'] }),
        queryClient.invalidateQueries({ queryKey: ['saju-profile-edit'] }),
        queryClient.invalidateQueries({ queryKey: ['user-profile-edit'] }),
        queryClient.invalidateQueries({ queryKey: ['mypage-stats'] }),
      ])
      // 세션의 닉네임도 즉시 갱신
      await updateSession()

      setTimeout(() => router.push('/mypage'), 800)
    } catch (err) {
      setError('저장에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading' || !profile) {
    return <div style={{ padding: '40px 20px', textAlign: 'center' }}>로딩 중...</div>
  }

  if (!session) {
    return <div style={{ padding: '60px 20px', textAlign: 'center' }}>로그인이 필요합니다</div>
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 42, padding: '0 10px',
    fontSize: 13, color: '#333',
    border: '1px solid #dcdcdc', borderRadius: 2,
    outline: 'none', background: '#fff', boxSizing: 'border-box',
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', paddingBottom: 60 }}>
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
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center', marginRight: 28 }}>
          정보 수정
        </span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 0' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '20px', marginBottom: 8 }}>
          <form onSubmit={handleSubmit}>
            {/* ── 회원정보 섹션 ── */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 14 }}>👤 회원정보</p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 4 }}>이메일 (변경 불가)</label>
              <input type="email" value={profile?.email || ''} disabled style={{ ...inputStyle, background: '#f5f5f5', color: '#888', cursor: 'not-allowed' }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 4 }}>이름 *</label>
              <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} required style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 6 }}>성별</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[{ val: 'M', label: '남성' }, { val: 'F', label: '여성' }, { val: 'N', label: '미선택' }].map(g => (
                  <button key={g.val} type="button" onClick={() => setGender(g.val as 'M' | 'F' | 'N')} style={{
                    flex: 1, height: 40,
                    background: gender === g.val ? '#007bc3' : '#f5f5f5',
                    color: gender === g.val ? '#fff' : '#666',
                    border: '1px solid ' + (gender === g.val ? '#005a94' : '#dcdcdc'),
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
                  }}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div style={{ height: 1, background: '#f0f0f0', margin: '20px 0' }} />

            {/* ── 비밀번호 섹션 ── */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 14 }}>🔐 비밀번호 변경 (선택)</p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500, display: 'block', marginBottom: 4 }}>현재 비밀번호</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="비밀번호 변경 시만 입력" style={inputStyle} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500, display: 'block', marginBottom: 4 }}>새 비밀번호</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6자 이상" minLength={6} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#888', fontWeight: 500, display: 'block', marginBottom: 4 }}>새 비밀번호 확인</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="재입력" minLength={6} style={inputStyle} />
            </div>

            {/* 구분선 */}
            <div style={{ height: 1, background: '#f0f0f0', margin: '20px 0' }} />

            {/* ── 사주정보 섹션 (필수) ── */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 6 }}>☯️ 사주 정보 *필수</p>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>정확한 사주 분석을 위해서는 시간과 분이 필수입니다</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 3 }}>생년 *</label>
                <input type="number" value={birthYear} onChange={e => setBirthYear(e.target.value)} placeholder="1990" min="1900" max="2020" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 3 }}>월 *</label>
                <input type="number" value={birthMonth} onChange={e => setBirthMonth(e.target.value)} placeholder="1" min="1" max="12" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 3 }}>일 *</label>
                <input type="number" value={birthDay} onChange={e => setBirthDay(e.target.value)} placeholder="1" min="1" max="31" required style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 500, display: 'block', marginBottom: 3 }}>시간 * (HH:MM)</label>
                <input type="time" value={birthHour} onChange={e => setBirthHour(e.target.value)} required style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '8px 10px', background: '#f9f9f9', borderRadius: 4 }}>
                <input type="checkbox" id="isLunar" checked={isLunar} onChange={e => setIsLunar(e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="isLunar" style={{ fontSize: 12, color: '#666', cursor: 'pointer' }}>음력</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, padding: '8px 10px', background: '#f9f9f9', borderRadius: 4 }}>
                <input type="checkbox" id="isLeapMonth" checked={isLeapMonth} onChange={e => setIsLeapMonth(e.target.checked)} disabled={!isLunar} style={{ cursor: isLunar ? 'pointer' : 'not-allowed', opacity: isLunar ? 1 : 0.5 }} />
                <label htmlFor="isLeapMonth" style={{ fontSize: 12, color: isLunar ? '#666' : '#ccc', cursor: isLunar ? 'pointer' : 'not-allowed' }}>윤달</label>
              </div>
            </div>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#dc1f1f', borderRadius: 2 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fff4', border: '1px solid #b7e4c7', fontSize: 13, color: '#22c55e', borderRadius: 2 }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={isLoading} style={{
              width: '100%', height: 43,
              background: isLoading ? '#7ab5e0' : '#007bc3',
              border: '1px solid #005a94',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer', borderRadius: 2,
            }}>
              {isLoading ? '저장 중...' : '저장하기'}
            </button>
          </form>
        </div>

        <div style={{ background: '#fff', padding: '14px 16px', textAlign: 'center' }}>
          <Link href="/mypage" style={{ fontSize: 13, color: '#007bc3', textDecoration: 'none', fontWeight: 600 }}>
            ← 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
