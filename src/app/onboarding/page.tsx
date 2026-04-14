'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

const STEPS = ['기본정보', '생년월일', '출생시간']

export default function OnboardingPage() {
  const router = useRouter()
  const { update: updateSession } = useSession()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [gender, setGender] = useState<'M' | 'F' | ''>('')
  const [calType, setCalType] = useState<'solar' | 'lunar'>('solar')
  const [isLeapMonth, setIsLeapMonth] = useState(false)
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hour, setHour] = useState<number | null>(null)
  const [jaSubType, setJaSubType] = useState<'ya' | 'jo' | null>(null)

  const handleNext = () => {
    setError('')
    if (step === 0 && !gender) { setError('성별을 선택해주세요'); return }
    if (step === 1) {
      if (!year || !month || !day) { setError('생년월일을 모두 입력해주세요'); return }
      const y = parseInt(year), m = parseInt(month), d = parseInt(day)
      if (y < 1900 || y > 2010) { setError('올바른 연도를 입력해주세요 (1900~2010)'); return }
      if (m < 1 || m > 12) { setError('올바른 월을 입력해주세요 (1~12)'); return }
      if (d < 1 || d > 31) { setError('올바른 일을 입력해주세요 (1~31)'); return }
    }
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/saju/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear: parseInt(year),
          birthMonth: parseInt(month),
          birthDay: parseInt(day),
          birthHour: hour,
          gender,
          isLunar: calType === 'lunar',
          isLeapMonth: calType === 'lunar' ? isLeapMonth : false,
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || '저장 실패'); return }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['saju-profile-home'] }),
        queryClient.invalidateQueries({ queryKey: ['saju-profile-mypage'] }),
        queryClient.invalidateQueries({ queryKey: ['saju-profile-edit'] }),
      ])
      await updateSession()
      router.push('/home')
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    height: 42, padding: '0 10px',
    fontSize: 14, color: '#333',
    border: '1px solid #dcdcdc', borderRadius: 2,
    outline: 'none', background: '#fff', boxSizing: 'border-box', textAlign: 'center',
  }

  // 12 시진 (時辰) 정의 — 하루를 12개 2시간 구간으로 나눔
  const SIJIN = [
    { name: '자시', hanja: '子時', time: '23~01시', animal: '🐭', hour: 23, isJa: true },
    { name: '축시', hanja: '丑時', time: '01~03시', animal: '🐮', hour: 1 },
    { name: '인시', hanja: '寅時', time: '03~05시', animal: '🐯', hour: 3 },
    { name: '묘시', hanja: '卯時', time: '05~07시', animal: '🐰', hour: 5 },
    { name: '진시', hanja: '辰時', time: '07~09시', animal: '🐲', hour: 7 },
    { name: '사시', hanja: '巳時', time: '09~11시', animal: '🐍', hour: 9 },
    { name: '오시', hanja: '午時', time: '11~13시', animal: '🐴', hour: 11 },
    { name: '미시', hanja: '未時', time: '13~15시', animal: '🐑', hour: 13 },
    { name: '신시', hanja: '申時', time: '15~17시', animal: '🐒', hour: 15 },
    { name: '유시', hanja: '酉時', time: '17~19시', animal: '🐓', hour: 17 },
    { name: '술시', hanja: '戌時', time: '19~21시', animal: '🐕', hour: 19 },
    { name: '해시', hanja: '亥時', time: '21~23시', animal: '🐗', hour: 21 },
  ]

  // 선택된 시진 이름 반환
  const getSelectedSijinName = () => {
    if (hour === null) return null
    if (hour === 23) return jaSubType === 'ya' ? '야자시 (23~24시)' : '자시 (23~01시)'
    if (hour === 0) return '조자시 (0~01시)'
    return SIJIN.find(s => s.hour === hour)?.name ?? null
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        background: '#007bc3', height: 48,
        display: 'flex', alignItems: 'center', padding: '0 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'center', marginRight: step > 0 ? 28 : 0 }}>
          사주 정보 입력
        </span>
      </header>

      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* 진행 표시 */}
        <div style={{ background: '#fff', padding: '14px 16px', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? '#007bc3' : '#e0e0e0',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {STEPS.map((s, i) => (
              <span key={i} style={{ fontSize: 11, color: i <= step ? '#007bc3' : '#aaa', fontWeight: i === step ? 700 : 400 }}>
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Step 0: 성별 */}
        {step === 0 && (
          <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '20px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 6 }}>성별을 선택해주세요</p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>사주 계산에 사용됩니다</p>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['M', 'F'] as const).map(g => (
                <button key={g} onClick={() => setGender(g)} style={{
                  flex: 1, height: 56,
                  background: gender === g ? '#007bc3' : '#fff',
                  border: `2px solid ${gender === g ? '#007bc3' : '#dcdcdc'}`,
                  color: gender === g ? '#fff' : '#444',
                  fontSize: 16, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
                }}>
                  {g === 'M' ? '👨 남성' : '👩 여성'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: 생년월일 */}
        {step === 1 && (
          <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '20px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 14 }}>생년월일을 입력해주세요</p>

            {/* 양력/음력 토글 */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 }}>달력 구분</p>
              <div style={{ display: 'flex', gap: 0, border: '1px solid #dcdcdc', borderRadius: 2, overflow: 'hidden' }}>
                {(['solar', 'lunar'] as const).map(c => (
                  <button key={c} onClick={() => { setCalType(c); setIsLeapMonth(false) }} style={{
                    flex: 1, height: 38,
                    background: calType === c ? '#007bc3' : '#fff',
                    color: calType === c ? '#fff' : '#666',
                    fontSize: 13, fontWeight: calType === c ? 700 : 400,
                    border: 'none', cursor: 'pointer',
                  }}>
                    {c === 'solar' ? '양력 (陽曆)' : '음력 (陰曆)'}
                  </button>
                ))}
              </div>
            </div>

            {/* 음력 선택 시: 윤달 체크박스 */}
            {calType === 'lunar' && (
              <div style={{
                background: '#f7fbff',
                border: '1px solid #c5dcf0',
                borderRadius: 2,
                padding: '10px 14px',
                marginBottom: 16,
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <div style={{ paddingTop: 1 }}>
                  <input
                    type="checkbox"
                    id="leapMonth"
                    checked={isLeapMonth}
                    onChange={e => setIsLeapMonth(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#007bc3' }}
                  />
                </div>
                <div>
                  <label htmlFor="leapMonth" style={{ fontSize: 13, fontWeight: 700, color: '#333', cursor: 'pointer', display: 'block', marginBottom: 3 }}>
                    윤달(閏月)에 태어났습니까?
                  </label>
                  <p style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
                    윤달은 음력에서 같은 달이 두 번 오는 경우입니다.<br/>
                    예: 음력 3월이 두 번 있을 때, 두 번째 3월 = 윤3월<br/>
                    <span style={{ color: '#007bc3', fontWeight: 600 }}>모르시면 체크하지 마세요 (대부분 해당 없음)</span>
                  </p>
                </div>
              </div>
            )}

            {/* 날짜 입력 */}
            <div>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 6, fontWeight: 600 }}>
                {calType === 'solar' ? '양력' : '음력'} 생년월일
                {calType === 'lunar' && isLeapMonth && (
                  <span style={{ marginLeft: 6, color: '#007bc3', fontWeight: 700 }}>[윤달]</span>
                )}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>연도</label>
                  <input
                    type="number" value={year}
                    onChange={e => setYear(e.target.value)}
                    placeholder="1990" min="1900" max="2010"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>월</label>
                  <input
                    type="number" value={month}
                    onChange={e => setMonth(e.target.value)}
                    placeholder="1" min="1" max="12"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>일</label>
                  <input
                    type="number" value={day}
                    onChange={e => setDay(e.target.value)}
                    placeholder="1" min="1" max="30"
                    style={{ ...inputStyle, width: '100%' }}
                  />
                </div>
              </div>
            </div>

            {/* 음력 안내 */}
            {calType === 'lunar' && year && month && day && (
              <div style={{
                marginTop: 14,
                background: '#f7f7f7',
                border: '1px solid #dcdcdc',
                borderRadius: 2,
                padding: '8px 12px',
              }}>
                <p style={{ fontSize: 12, color: '#666' }}>
                  📅 입력하신 음력 <strong style={{ color: '#333' }}>
                    {year}년 {isLeapMonth ? '윤' : ''}{month}월 {day}일
                  </strong>을 양력으로 변환하여 사주를 계산합니다.
                </p>
              </div>
            )}

            {/* 양력 사주 기준 안내 */}
            <div style={{
              marginTop: 14,
              background: '#fffbf0',
              border: '1px solid #f0e0a0',
              borderRadius: 2,
              padding: '8px 12px',
            }}>
              <p style={{ fontSize: 11, color: '#886600', lineHeight: 1.6 }}>
                ℹ️ 사주(四柱)는 <strong>양력(태양력)</strong> 기준으로 계산됩니다.<br/>
                음력 입력 시 자동으로 양력으로 변환 후 계산합니다.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: 출생시간 — 12 시진 선택 */}
        {step === 2 && (
          <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '20px 16px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>출생 시진(時辰)을 선택해주세요</p>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              하루를 12구간으로 나눈 전통 시간 단위입니다 · 모르시면 &apos;모름&apos; 선택
            </p>

            {/* 안내 박스 */}
            <div style={{
              background: '#f7fbff', border: '1px solid #c5dcf0',
              borderRadius: 2, padding: '8px 12px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>
                ℹ️ <strong>시주(時柱)</strong>는 2시간 단위 시진으로 결정됩니다.<br/>
                자시(23~01시)는 야자시/조자시로 구분하면 더욱 정확합니다.
              </p>
            </div>

            {/* 모름 버튼 */}
            <button
              onClick={() => { setHour(null); setJaSubType(null) }}
              style={{
                width: '100%', height: 38, marginBottom: 10,
                background: hour === null ? '#555' : '#fff',
                border: `1px solid ${hour === null ? '#555' : '#dcdcdc'}`,
                color: hour === null ? '#fff' : '#888',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
              }}
            >
              모름 (시주 계산 제외)
            </button>

            {/* 12 시진 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {SIJIN.map((sj) => {
                const isSelected = sj.isJa
                  ? (hour === 23 || hour === 0)
                  : hour === sj.hour
                return (
                  <button
                    key={sj.name}
                    onClick={() => {
                      setHour(sj.hour)
                      if (!sj.isJa) setJaSubType(null)
                    }}
                    style={{
                      padding: '8px 4px',
                      background: isSelected ? '#007bc3' : '#fff',
                      border: `1px solid ${isSelected ? '#007bc3' : '#dcdcdc'}`,
                      color: isSelected ? '#fff' : '#333',
                      borderRadius: 2, cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{sj.animal}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{sj.name}</span>
                    <span style={{ fontSize: 9, opacity: 0.75 }}>{sj.hanja}</span>
                    <span style={{ fontSize: 10, opacity: 0.85, marginTop: 1 }}>{sj.time}</span>
                  </button>
                )
              })}
            </div>

            {/* 자시 선택 시 야자시/조자시 구분 */}
            {(hour === 23 || hour === 0) && (
              <div style={{
                marginTop: 12,
                background: '#fffbf0', border: '1px solid #f0e0a0',
                borderRadius: 2, padding: '12px 14px',
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#886600', marginBottom: 8 }}>
                  🐭 자시(子時)를 더 세분화할 수 있습니다
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setHour(23); setJaSubType('ya') }}
                    style={{
                      flex: 1, padding: '8px 6px',
                      background: hour === 23 && jaSubType === 'ya' ? '#886600' : '#fff',
                      border: `1px solid ${hour === 23 && jaSubType === 'ya' ? '#886600' : '#dcdcdc'}`,
                      color: hour === 23 && jaSubType === 'ya' ? '#fff' : '#333',
                      borderRadius: 2, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>야자시 (夜子時)</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>밤 11시 ~ 자정</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>전날 일주 기준</div>
                  </button>
                  <button
                    onClick={() => { setHour(0); setJaSubType('jo') }}
                    style={{
                      flex: 1, padding: '8px 6px',
                      background: hour === 0 && jaSubType === 'jo' ? '#886600' : '#fff',
                      border: `1px solid ${hour === 0 && jaSubType === 'jo' ? '#886600' : '#dcdcdc'}`,
                      color: hour === 0 && jaSubType === 'jo' ? '#fff' : '#333',
                      borderRadius: 2, cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>조자시 (早子時)</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>자정 ~ 새벽 1시</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>당일 일주 기준</div>
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#886600', marginTop: 6, lineHeight: 1.5 }}>
                  모르시면 그냥 자시로 두셔도 됩니다 (대부분 해당 없음)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 입력 요약 (step 2에서 표시) */}
        {step === 2 && year && month && day && (
          <div style={{ background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc', padding: '12px 16px', marginTop: 8 }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>입력 정보 확인</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, background: '#f0f7ff', border: '1px solid #c5dcf0', borderRadius: 10, padding: '2px 10px', color: '#007bc3' }}>
                {gender === 'M' ? '남성' : '여성'}
              </span>
              <span style={{ fontSize: 12, background: '#f0f7ff', border: '1px solid #c5dcf0', borderRadius: 10, padding: '2px 10px', color: '#007bc3' }}>
                {calType === 'solar' ? '양력' : `음력${isLeapMonth ? '(윤달)' : ''}`}
              </span>
              <span style={{ fontSize: 12, background: '#f0f7ff', border: '1px solid #c5dcf0', borderRadius: 10, padding: '2px 10px', color: '#007bc3' }}>
                {year}.{month.padStart(2, '0')}.{day.padStart(2, '0')}
              </span>
              {hour !== null && (
                <span style={{ fontSize: 12, background: '#f0f7ff', border: '1px solid #c5dcf0', borderRadius: 10, padding: '2px 10px', color: '#007bc3' }}>
                  {getSelectedSijinName()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 오류 */}
        {error && (
          <div style={{ padding: '8px 16px' }}>
            <div style={{ padding: '10px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#dc1f1f', borderRadius: 2 }}>
              {error}
            </div>
          </div>
        )}

        {/* 버튼 영역 */}
        <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #dcdcdc', marginTop: 8 }}>
          {step < 2 ? (
            <button onClick={handleNext} style={{
              width: '100%', height: 43,
              background: '#007bc3', border: '1px solid #005a94',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: 'pointer', borderRadius: 2,
            }}>
              다음
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={isLoading} style={{
              width: '100%', height: 43,
              background: isLoading ? '#7ab5e0' : '#007bc3',
              border: '1px solid #005a94',
              color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: isLoading ? 'wait' : 'pointer', borderRadius: 2,
            }}>
              {isLoading ? '저장 중...' : '사주 분석 시작'}
            </button>
          )}
          <div style={{ textAlign: 'center', marginTop: 10 }}>
            <Link href="/home" style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}>
              나중에 입력하기
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
