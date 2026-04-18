'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LottoBallSet } from '@/components/lotto/LottoBall'
import type { GenerateResponse } from '@/types'
import { AdSlot } from '@/components/ui/AdSlot'

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}

interface HistoryStats {
  1: number; 2: number; 3: number; 4: number; 5: number; checked: number
}

function ResultCard({ result, index }: { result: GenerateResponse; index: number }) {
  const [history, setHistory] = useState<HistoryStats | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(result.numbers.join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCheckHistory = async () => {
    if (history) { setHistory(null); return }
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/lotto/check-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: result.numbers }),
      })
      setHistory(await res.json())
    } finally {
      setLoadingHistory(false)
    }
  }

  const isNew = index === 0

  // 새 번호 생성 시 자동으로 당첨이력 조회
  useEffect(() => {
    if (isNew) handleCheckHistory()
  }, [])

  return (
    <div style={{
      background: '#fff',
      borderTop: isNew ? '2px solid #007bc3' : '1px solid #dcdcdc',
      borderBottom: '1px solid #dcdcdc',
      marginBottom: 8,
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px',
        borderBottom: '1px solid #f0f0f0',
        background: isNew ? '#f0f7ff' : '#fafafa',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isNew && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#fff',
              background: '#007bc3', padding: '1px 6px', borderRadius: 2,
            }}>NEW</span>
          )}
          <span style={{ fontSize: 12, color: '#666' }}>
            일주 <strong style={{ color: '#333' }}>{result.sajuInfo.ilju}</strong>
            {' · '}용신 <strong style={{ color: OHAENG_COLOR[result.sajuInfo.yongsin] || '#333' }}>{result.sajuInfo.yongsin}</strong>
          </span>
        </div>
        <button
          onClick={handleCopy}
          style={{
            fontSize: 11, color: copied ? '#007bc3' : '#888',
            background: '#fff', border: '1px solid #dcdcdc',
            borderRadius: 2, padding: '3px 8px', cursor: 'pointer',
          }}
        >
          {copied ? '✓ 복사됨' : '복사'}
        </button>
      </div>

      {/* 번호 볼 */}
      <div style={{ padding: '14px 14px 10px' }}>
        <LottoBallSet numbers={result.numbers} size="md" animate={isNew} />
      </div>

      {/* 오행 배지 */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '0 14px 12px' }}>
        {Object.entries(result.sajuInfo.ohaeng).map(([k, v]) => (
          <span key={k} className="ohaeng-badge" style={{ color: OHAENG_COLOR[k] || '#666' }}>
            {k} {v as number}
          </span>
        ))}
      </div>

      {/* 선택 이유 */}
      {result.reason && (
        <div style={{
          margin: '0 14px 12px',
          padding: '10px 12px',
          background: '#f7fbff',
          borderLeft: '3px solid #007bc3',
          borderRadius: '0 2px 2px 0',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 4 }}>
            이 번호가 선택된 이유
          </p>
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{result.reason}</p>
        </div>
      )}

      {/* 당첨 이력 조회 버튼 */}
      <div style={{ padding: '0 14px 14px' }}>
        <button
          onClick={handleCheckHistory}
          disabled={loadingHistory}
          style={{
            width: '100%', height: 36,
            background: '#fff', border: '1px solid #dcdcdc',
            fontSize: 13, fontWeight: 500,
            color: history ? '#007bc3' : '#666',
            cursor: 'pointer', borderRadius: 2,
          }}
        >
          {loadingHistory ? '조회 중...' : history ? '▲ 이력 닫기' : '과거 당첨 이력 조회'}
        </button>

        {history && (
          <div style={{ marginTop: 8, background: '#f7f7f7', border: '1px solid #dcdcdc', borderRadius: 2, padding: '12px 10px' }}>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
              최근 {history.checked}회차 기준
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {([1, 2, 3, 4, 5] as const).map(rank => {
                const count = history[rank]
                const rankColors = ['#e86352', '#1994da', '#e4a816', '#5bb544', '#888']
                return (
                  <div key={rank} style={{
                    flex: 1, textAlign: 'center', padding: '8px 4px',
                    background: count > 0 ? '#fff' : 'transparent',
                    border: `1px solid ${count > 0 ? rankColors[rank - 1] : '#e0e0e0'}`,
                    borderRadius: 2,
                  }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: count > 0 ? rankColors[rank - 1] : '#ccc' }}>
                      {count}
                    </p>
                    <p style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{rank}등</p>
                  </div>
                )
              })}
            </div>
            {([1, 2, 3, 4, 5] as const).every(r => history[r] === 0) && (
              <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 8 }}>
                {history.checked === 0
                  ? '저장된 회차 데이터가 없습니다'
                  : `조회한 ${history.checked}회차 중 당첨 이력 없음`}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<GenerateResponse[]>([])
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (!session) { router.push('/login'); return }
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/lotto/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: new Date().toISOString() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === '사주 프로필을 먼저 입력해주세요') { router.push('/onboarding'); return }
        setError(data.error || '오류가 발생했습니다')
        return
      }
      setResults(prev => [data, ...prev].slice(0, 10))
      queryClient.invalidateQueries({ queryKey: ['savedNumbers'] })
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{
        background: '#fff', padding: '14px 16px',
        borderBottom: '1px solid #dcdcdc',
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 2 }}>번호 생성</h2>
        <p style={{ fontSize: 12, color: '#888' }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </p>
      </div>

      {/* 생성 버튼 */}
      <div style={{ padding: '12px 16px', background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          style={{
            width: '100%', height: 46,
            background: isLoading ? '#7ab5e0' : '#007bc3',
            border: '1px solid #005a94',
            color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: isLoading ? 'wait' : 'pointer',
            borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {isLoading ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              사주 분석 중...
            </>
          ) : (
            results.length > 0 ? `번호 다시 뽑기 (${results.length}/10)` : '내 사주로 번호 뽑기'
          )}
        </button>

        {error && (
          <div style={{
            marginTop: 8, padding: '8px 12px',
            background: '#fff5f5', border: '1px solid #ffd5d5',
            fontSize: 13, color: '#dc1f1f', textAlign: 'center', borderRadius: 2,
          }}>
            {error}
          </div>
        )}
      </div>

      {/* 결과 목록 */}
      {results.length > 0 ? (
        <div className="animate-fade-in-up">
          {results.map((result, i) => (
            <ResultCard key={result.id} result={result} index={i} />
          ))}
        </div>
      ) : (
        <div style={{
          padding: '40px 20px', textAlign: 'center',
          background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎰</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>
            사주 기반 번호를 추천해드립니다
          </p>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            생년월일과 사주 오행을 분석하여<br/>나에게 맞는 번호를 골라드려요
          </p>
        </div>
      )}
      <div style={{ padding: '0 16px', marginTop: 8 }}>
        <AdSlot />
      </div>
    </div>
  )
}
