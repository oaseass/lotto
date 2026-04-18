'use client'

// ================================
// 관리자 페이지 - 당첨번호 동기화
// ================================

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import SocialProofExperimentSummary from '@/components/admin/SocialProofExperimentSummary'
import SocialProofModerationPanel from '@/components/admin/SocialProofModerationPanel'

export default function AdminPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [round, setRound] = useState('')
  const [numbers, setNumbers] = useState('')
  const [bonus, setBonus] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (authStatus === 'unauthenticated' || (authStatus === 'authenticated' && !(session?.user as any)?.isAdmin)) {
      router.replace('/login')
    }
  }, [authStatus, session, router])

  if (authStatus === 'loading' || !session || !(session?.user as any)?.isAdmin) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>확인 중...</div>
  }

  // 직접 입력 저장
  const handleManualSave = async () => {
    const nums = numbers.split(/[\s,]+/).map(Number).filter(n => n >= 1 && n <= 45)
    const bnusNo = parseInt(bonus)
    const drwNo = parseInt(round)

    if (nums.length !== 6 || isNaN(bnusNo) || isNaN(drwNo)) {
      setStatus('오류: 회차, 번호 6개, 보너스 번호를 올바르게 입력하세요')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/lotto/draws/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round: drwNo,
          numbers: nums,
          bonus: bnusNo,
          drawDate: date || new Date().toISOString().split('T')[0],
        }),
      })
      const data = await res.json()
      setStatus(res.ok ? `✓ ${drwNo}회차 저장 완료` : `오류: ${data.error}`)
      if (res.ok) { setRound(''); setNumbers(''); setBonus(''); setDate('') }
    } catch {
      setStatus('네트워크 오류')
    } finally {
      setIsSaving(false)
    }
  }

  // lotto-haru.kr API로 특정 회차 자동 가져오기
  const [autoRound, setAutoRound] = useState('')
  const handleAutoFetch = async () => {
    const r = parseInt(autoRound)
    if (isNaN(r) || r < 1) { setStatus('오류: 회차 번호를 입력하세요'); return }
    setIsSaving(true)
    setStatus(`${r}회차 데이터 조회 중...`)
    try {
      // 서버사이드 sync를 특정 회차로 호출
      const res = await fetch('/api/lotto/draws/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: r, to: r }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data.synced > 0 ? `✓ ${r}회차 저장 완료` : `${r}회차는 이미 저장되어 있거나 데이터가 없습니다`)
        if (data.synced > 0) setAutoRound('')
      } else {
        setStatus(`오류: ${data.error}`)
      }
    } catch {
      setStatus('네트워크 오류')
    } finally {
      setIsSaving(false)
    }
  }

  // 최신 회차 일괄 자동 동기화
  const handleBulkSync = async () => {
    setIsSaving(true)
    setStatus('최신 회차 동기화 중...')
    try {
      const res = await fetch('/api/lotto/draws/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      setStatus(res.ok ? `✓ ${data.message}` : `오류: ${data.error}`)
      if (res.ok) loadSyncInfo()
    } catch {
      setStatus('네트워크 오류')
    } finally {
      setIsSaving(false)
    }
  }

  // 동기화 상태 조회
  const [syncInfo, setSyncInfo] = useState<{ count: number; latest: number | null } | null>(null)
  const loadSyncInfo = async () => {
    const res = await fetch('/api/lotto/draws/sync-status')
    if (res.ok) setSyncInfo(await res.json())
  }

  useEffect(() => { loadSyncInfo() }, [])

  return (
    <div style={{
      maxWidth: 480, margin: '0 auto', padding: '24px 16px 100px',
      fontFamily: '-apple-system, system-ui, sans-serif',
      background: 'var(--bg)', minHeight: '100vh', color: 'var(--t1)',
    }}>
      <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>
        관리자 — 당첨번호 관리
      </h1>
      <p style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>
        api.lotto-haru.kr을 통해 당첨번호를 자동으로 가져옵니다
      </p>

      {/* 동기화 상태 */}
      {syncInfo && (
        <div style={{
          padding: '14px 16px', borderRadius: 14, marginBottom: 20,
          background: 'var(--bg-card)', border: '1px solid var(--line)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--t2)' }}>
            DB에 <strong style={{ color: 'var(--amber)' }}>{syncInfo.count}개</strong> 회차 저장됨
            {syncInfo.latest && ` · 최신 ${syncInfo.latest}회차`}
          </p>
        </div>
      )}

      {/* 방법 1: 자동 동기화 (최신 미저장 회차 전부) */}
      <div style={{
        padding: '18px', borderRadius: 16, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--line)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
          방법 1. 자동 동기화 (권장)
        </p>
        <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.6 }}>
          DB에 없는 최신 회차들을 api.lotto-haru.kr에서 자동으로 가져옵니다.
        </p>
        <button
          onClick={handleBulkSync}
          disabled={isSaving}
          style={{
            width: '100%', padding: '11px', borderRadius: 12,
            background: 'linear-gradient(145deg, #E8B84B, #B8881E)',
            color: '#1A1000', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
          }}
        >
          {isSaving ? '동기화 중...' : '최신 회차 자동 동기화'}
        </button>
      </div>

      {/* 방법 2: 특정 회차 자동 가져오기 */}
      <div style={{
        padding: '18px', borderRadius: 16, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--line)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
          방법 2. 특정 회차 가져오기
        </p>
        <p style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12, lineHeight: 1.6 }}>
          회차 번호를 입력하면 api.lotto-haru.kr에서 해당 회차 데이터를 가져옵니다.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number" value={autoRound} onChange={e => setAutoRound(e.target.value)}
            placeholder="회차 번호 (예: 1218)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={handleAutoFetch}
            disabled={isSaving || !autoRound}
            style={{
              padding: '10px 16px', borderRadius: 10,
              background: autoRound ? 'linear-gradient(145deg, #E8B84B, #B8881E)' : 'var(--bg-raised)',
              color: autoRound ? '#1A1000' : 'var(--t3)',
              fontSize: 13, fontWeight: 700, border: 'none',
              cursor: autoRound ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap',
            }}
          >
            가져오기
          </button>
        </div>
      </div>

      {/* 방법 3: 직접 입력 */}
      <div style={{
        padding: '18px', borderRadius: 16, marginBottom: 16,
        background: 'var(--bg-card)', border: '1px solid var(--line)',
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 12 }}>
          방법 3. 직접 입력
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>회차</label>
            <input
              type="number" value={round} onChange={e => setRound(e.target.value)}
              placeholder="1218"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>추첨일 (YYYY-MM-DD)</label>
            <input
              type="date" value={date} onChange={e => setDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>
            당첨번호 6개 (공백 또는 쉼표 구분)
          </label>
          <input
            type="text" value={numbers} onChange={e => setNumbers(e.target.value)}
            placeholder="3 12 22 33 41 44"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: 'var(--t3)', display: 'block', marginBottom: 4 }}>보너스 번호</label>
          <input
            type="number" value={bonus} onChange={e => setBonus(e.target.value)}
            placeholder="7"
            style={{ ...inputStyle, width: '50%' }}
          />
        </div>

        <button
          onClick={handleManualSave}
          disabled={isSaving}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            background: 'linear-gradient(145deg, #E8B84B, #B8881E)',
            color: '#1A1000', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer',
          }}
        >
          직접 입력 저장
        </button>
      </div>

      {/* 상태 메시지 */}
      {status && (
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: status.startsWith('✓') ? 'rgba(125,218,88,0.08)' : 'rgba(255,100,100,0.08)',
          border: `1px solid ${status.startsWith('✓') ? 'rgba(125,218,88,0.2)' : 'rgba(255,100,100,0.2)'}`,
          fontSize: 13, color: status.startsWith('✓') ? '#7DDA58' : (status.includes('중...') ? 'var(--amber)' : '#FF6B6B'),
        }}>
          {status}
        </div>
      )}

      <div style={{ height: 16 }} />
      <SocialProofExperimentSummary />
      <SocialProofModerationPanel />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'var(--bg-raised)', border: '1px solid var(--line)',
  color: 'var(--t1)', fontSize: 13,
  boxSizing: 'border-box',
}
