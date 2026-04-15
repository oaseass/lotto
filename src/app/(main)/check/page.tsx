'use client'

import { useState } from 'react'
import { QrScanner } from '@/components/lotto/QrScanner'
import { LottoBallSet } from '@/components/lotto/LottoBall'
import { AdSlot } from '@/components/ui/AdSlot'

interface SetResult {
  set: number
  numbers: number[]
  rank: number | null
  matchedNumbers: number[]
  bonusMatch: boolean
  prize: number
}

interface ScanResult {
  round: number
  drawDate: string
  drawNumbers: number[]
  bonus: number
  sets: SetResult[]
  totalPrize: number
}

const RANK_COLOR: Record<number, string> = {
  1: '#dc1f1f', 2: '#e03f0e', 3: '#e4a816', 4: '#007bc3', 5: '#129f97',
}

const RANK_MSG: Record<number, { title: string; sub: string; emoji: string }> = {
  1: {
    emoji: '🏆',
    title: '1등 당첨!!!',
    sub: '인생이 바뀌었습니다!! 지금 당장 복권 판매점 또는 농협은행에서 수령하세요!',
  },
  2: {
    emoji: '🎊',
    title: '2등 당첨!!',
    sub: '엄청난 행운이에요!! 수억 원의 당첨금을 꼭 챙기세요!',
  },
  3: {
    emoji: '🎉',
    title: '3등 당첨!',
    sub: '대박났어요~!! 백만원대 당첨금을 수령하세요!',
  },
  4: {
    emoji: '😄',
    title: '4등 당첨!',
    sub: '5만 원 당첨! 치킨에 맥주 한 잔은 확정이에요 🍗🍺',
  },
  5: {
    emoji: '😊',
    title: '5등 당첨!',
    sub: '5,000원 당첨! 복권 한 장 더 사볼까요? 🎟️',
  },
}

function formatPrize(n: number): string {
  if (n <= 0) return ''
  if (n >= 100000000) {
    const uk = Math.floor(n / 100000000)
    const rest = Math.floor((n % 100000000) / 10000000)
    return rest > 0 ? `${uk}억 ${rest}천만원` : `${uk}억원`
  }
  if (n >= 10000000) return `${Math.floor(n / 10000000)}천만원`
  if (n >= 1000000) return `${Math.floor(n / 100000) / 10}백만원`
  return `${n.toLocaleString()}원`
}

export default function CheckPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)

  const handleScan = async (qrData: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '처리 중 오류가 발생했습니다'); return }
      setResult(data)
      setScanned(true)
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => { setResult(null); setError(''); setScanned(false) }

  // 최고 등수 계산
  const bestRank = result?.sets.reduce<number | null>((best, s) => {
    if (s.rank === null) return best
    return best === null ? s.rank : Math.min(best, s.rank)
  }, null) ?? null
  const hasPrize = bestRank !== null

  return (
    <div>
      <div style={{
        background: '#fff', padding: '14px 16px',
        borderBottom: '1px solid #dcdcdc', marginBottom: 0,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 2 }}>QR 당첨 확인</h2>
        <p style={{ fontSize: 12, color: '#888' }}>로또 용지의 QR코드를 스캔하세요</p>
      </div>

      {!scanned && !isLoading && (
        <div style={{ padding: '12px 16px' }}>
          <QrScanner onScan={handleScan} onError={setError} />
          <div style={{ marginTop: 12 }}><AdSlot /></div>
        </div>
      )}

      {isLoading && (
        <div style={{
          padding: '48px 20px', textAlign: 'center',
          background: '#fff', borderTop: '1px solid #dcdcdc',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#007bc3" strokeWidth="2" strokeLinecap="round"
            style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#007bc3' }}>당첨 확인 중...</p>
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{
            padding: '12px 14px',
            background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: 2,
            marginBottom: 10,
          }}>
            <p style={{ fontSize: 13, color: '#dc1f1f', marginBottom: 8 }}>{error}</p>
            <button onClick={handleReset} style={{
              width: '100%', height: 36,
              background: '#fff', border: '1px solid #dcdcdc',
              fontSize: 13, color: '#666', cursor: 'pointer', borderRadius: 2,
            }}>다시 스캔</button>
          </div>
        </div>
      )}

      {result && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', zIndex: 1000,
        }} onClick={() => scanned && handleReset()}>
          <div style={{
            width: '100%', background: '#fff', borderRadius: '20px 20px 0 0',
            maxHeight: '90vh', overflow: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }} onClick={e => e.stopPropagation()}>

            {/* 닫기 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <button onClick={handleReset} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#f5f5f5', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>

            {/* 당첨 헤더 — 등수 있을 때만 */}
            {hasPrize && bestRank && (
              <div style={{
                background: bestRank <= 2
                  ? 'linear-gradient(135deg, #dc1f1f 0%, #e03f0e 100%)'
                  : bestRank === 3
                  ? 'linear-gradient(135deg, #e4a816 0%, #f5c842 100%)'
                  : 'linear-gradient(135deg, #007bc3 0%, #129f97 100%)',
                padding: '24px 20px 20px',
                textAlign: 'center',
              }}>
                <p style={{ fontSize: 48, lineHeight: 1, marginBottom: 6 }}>{RANK_MSG[bestRank].emoji}</p>
                <p style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 6, letterSpacing: '-0.5px' }}>
                  {RANK_MSG[bestRank].title}
                </p>
                {result.totalPrize > 0 && (
                  <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8, letterSpacing: '-1px' }}>
                    {formatPrize(result.totalPrize)}
                  </p>
                )}
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  {RANK_MSG[bestRank].sub}
                </p>
              </div>
            )}

            <div style={{ padding: '16px' }}>
              {/* 당첨번호 */}
              <div style={{
                background: '#f7fbff', padding: '14px 16px',
                borderRadius: 8, marginBottom: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{result.round}회차 당첨번호</span>
                  <span style={{ fontSize: 12, color: '#888' }}>
                    {new Date(result.drawDate).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <LottoBallSet numbers={result.drawNumbers} bonus={result.bonus} size="sm" />
              </div>

              {/* 게임별 결과 */}
              {result.sets.map(set => (
                <div key={set.set} style={{
                  background: '#fff',
                  border: `1px solid ${set.rank ? RANK_COLOR[set.rank] : '#f0f0f0'}`,
                  borderRadius: 8, padding: '12px 14px', marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>{set.set}번 게임</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {set.prize > 0 && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: RANK_COLOR[set.rank!] }}>
                          {formatPrize(set.prize)}
                        </span>
                      )}
                      {set.rank ? (
                        <span style={{
                          fontSize: 12, fontWeight: 700, color: '#fff',
                          background: RANK_COLOR[set.rank] || '#888',
                          padding: '2px 8px', borderRadius: 2,
                        }}>{set.rank}등 당첨</span>
                      ) : (
                        <span style={{
                          fontSize: 11, color: '#888',
                          background: '#f5f5f5', border: '1px solid #dcdcdc',
                          padding: '2px 8px', borderRadius: 2,
                        }}>낙첨</span>
                      )}
                    </div>
                  </div>
                  <LottoBallSet
                    numbers={set.numbers || []}
                    matchedNumbers={set.matchedNumbers}
                    size="sm"
                  />
                </div>
              ))}

              {/* 합산 결과 — 낙첨 시만 표시 */}
              {!hasPrize && (
                <div style={{
                  background: '#f7f7f7', border: '1px solid #dcdcdc',
                  borderRadius: 8, padding: '18px 16px',
                  textAlign: 'center', marginTop: 6, marginBottom: 14,
                }}>
                  <p style={{ fontSize: 22, marginBottom: 4 }}>😢</p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 4 }}>아쉽게도 낙첨이에요</p>
                  <p style={{ fontSize: 12, color: '#888' }}>사주 기운을 보충하고 다음 주를 기대해보세요!</p>
                </div>
              )}

              <button onClick={handleReset} style={{
                width: '100%', height: 43,
                background: '#007bc3', border: '1px solid #005a94',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', borderRadius: 6, marginBottom: 20,
              }}>
                다시 스캔하기
              </button>
            </div>
          </div>

          <style>{`
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: '0 16px', marginTop: 8 }}><AdSlot /></div>
    </div>
  )
}
