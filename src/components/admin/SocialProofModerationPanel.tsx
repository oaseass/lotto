'use client'

import { useEffect, useState } from 'react'

type ModerationItem = {
  id: string
  round: number
  rank: number | null
  prize: number
  displayName: string
  numbers: number[]
  templateText: string | null
  moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN'
  moderatedReason: string | null
  moderatedAt: string | null
  reportCount: number
  lastReportedAt: string | null
  sharedAt: string | null
}

const STATUS_OPTIONS: Array<{ label: string; value: 'FLAGGED' | 'VISIBLE' | 'HIDDEN' }> = [
  { label: '검수 대기', value: 'FLAGGED' },
  { label: '노출 중', value: 'VISIBLE' },
  { label: '숨김', value: 'HIDDEN' },
]

export default function SocialProofModerationPanel() {
  const [filter, setFilter] = useState<'FLAGGED' | 'VISIBLE' | 'HIDDEN'>('FLAGGED')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [reportedOnly, setReportedOnly] = useState(true)
  const [items, setItems] = useState<ModerationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

  const loadItems = async (nextFilter = filter, nextQuery = query, nextReportedOnly = reportedOnly) => {
    setLoading(true)
    setMessage('')
    try {
      const params = new URLSearchParams({ status: nextFilter, limit: '12' })
      if (nextQuery.trim()) params.set('q', nextQuery.trim())
      if (nextReportedOnly) params.set('reportedOnly', '1')

      const response = await fetch(`/api/admin/social-proof/stories?${params.toString()}`)
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || '후기 검수 목록을 불러오지 못했습니다')
        return
      }
      setItems(data.items ?? [])
    } catch {
      setMessage('네트워크 오류로 후기 검수 목록을 불러오지 못했습니다')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems(filter, query, reportedOnly)
  }, [filter, query, reportedOnly])

  const handleModeration = async (item: ModerationItem, moderationStatus: 'VISIBLE' | 'FLAGGED' | 'HIDDEN', moderatedReason: string) => {
    setBusyId(item.id)
    setMessage('')
    try {
      const response = await fetch('/api/admin/social-proof/stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcomeId: item.id,
          moderationStatus,
          moderatedReason,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || '검수 상태를 저장하지 못했습니다')
        return
      }
      setMessage('후기 검수 상태를 저장했습니다')
      await loadItems(filter)
    } catch {
      setMessage('네트워크 오류로 검수 저장에 실패했습니다')
    } finally {
      setBusyId('')
    }
  }

  return (
    <div style={{
      padding: '18px', borderRadius: 16, marginBottom: 16,
      background: 'var(--bg-card)', border: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>
            회원 후기 검수
          </p>
          <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.6 }}>
            신고가 들어온 후기는 공개 피드에서 빠지고, 여기서 노출 여부를 결정합니다.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {STATUS_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            style={{
              padding: '8px 12px', borderRadius: 999,
              border: filter === option.value ? '1px solid #E8B84B' : '1px solid var(--line)',
              background: filter === option.value ? 'rgba(232,184,75,0.16)' : 'var(--bg-raised)',
              color: filter === option.value ? 'var(--amber)' : 'var(--t2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                setQuery(searchInput.trim())
              }
            }}
            placeholder="회차, 번호, 닉네임, 후기 문구 검색"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--bg-raised)',
              color: 'var(--t1)',
              fontSize: 12,
            }}
          />
          <button
            onClick={() => setQuery(searchInput.trim())}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #E8B84B',
              background: 'rgba(232,184,75,0.16)',
              color: 'var(--amber)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            검색
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--t2)' }}>
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={event => setReportedOnly(event.target.checked)}
          />
          신고가 들어온 후기만 보기
        </label>
      </div>

      {message && (
        <div style={{
          padding: '10px 12px', borderRadius: 12, marginBottom: 12,
          background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.18)',
          color: 'var(--amber)', fontSize: 12,
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>후기 검수 목록 불러오는 중...</div>
      ) : items.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map(item => (
            <div key={item.id} style={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-raised)', padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>제{item.round}회 {item.rank}등</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6b5b00', background: 'rgba(232,184,75,0.12)', borderRadius: 999, padding: '3px 7px' }}>
                    신고 {item.reportCount}회
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: '3px 7px' }}>
                    {item.moderationStatus}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--t3)' }}>{item.displayName}</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55, marginBottom: 8 }}>
                {item.templateText || '기본 후기 문구'}
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>
                번호: {item.numbers.join(', ')}
              </p>
              <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                마지막 신고 {item.lastReportedAt ? new Date(item.lastReportedAt).toLocaleString('ko-KR') : '없음'}
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleModeration(item, 'VISIBLE', '운영 검수 후 노출 허용')}
                  disabled={busyId === item.id}
                  style={actionButtonStyle('#0d6b44')}
                >
                  노출 허용
                </button>
                <button
                  onClick={() => handleModeration(item, 'HIDDEN', '운영 검수 후 숨김 처리')}
                  disabled={busyId === item.id}
                  style={actionButtonStyle('#9f2b2b')}
                >
                  숨김 처리
                </button>
                <button
                  onClick={() => handleModeration(item, 'FLAGGED', '추가 검수 대기')}
                  disabled={busyId === item.id}
                  style={actionButtonStyle('#8a6c00')}
                >
                  검수 보류
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--t3)' }}>현재 조건에 맞는 후기가 없습니다.</div>
      )}
    </div>
  )
}

function actionButtonStyle(color: string): React.CSSProperties {
  return {
    flex: 1,
    padding: '9px 10px',
    borderRadius: 10,
    border: 'none',
    background: color,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  }
}