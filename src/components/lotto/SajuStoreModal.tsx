'use client'

import { useState, useEffect } from 'react'
import { OHAENG_DIRECTION } from '@/lib/saju/direction'

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}

interface StoreResult {
  id?: string
  name: string
  address: string
  winCount1st: number
  distance?: number
  bearing?: number
  isLucky?: boolean
}

interface Props {
  onClose: () => void
  gpsLocation: { lat: number; lng: number }
  userOhaeng: string
  isAdFree?: boolean
}

function bearingLabel(bearing: number): string {
  const labels = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
  return labels[Math.round(((bearing % 360) + 360) % 360 / 45) % 8]
}

function calcScore(store: StoreResult, maxWin: number): number {
  let score = 0
  if (store.isLucky) score += 50
  if (maxWin > 0) score += Math.round((store.winCount1st / maxWin) * 30)
  if (store.distance !== undefined) score += Math.round(Math.max(0, 20 - store.distance * 4))
  return Math.min(99, Math.max(10, score))
}

export default function SajuStoreModal({ onClose, gpsLocation, userOhaeng, isAdFree }: Props) {
  const [phase, setPhase] = useState<'ad' | 'loading' | 'result'>(isAdFree ? 'loading' : 'ad')
  const [countdown, setCountdown] = useState(5)
  const [stores, setStores] = useState<StoreResult[]>([])
  const [error, setError] = useState('')

  const luckyDirs = OHAENG_DIRECTION[userOhaeng]?.directions.join(' · ') || '전 방위'

  // 광고 카운트다운
  useEffect(() => {
    if (phase !== 'ad' || countdown <= 0) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // AdSense 초기화
  useEffect(() => {
    if (phase === 'ad' && AD_CLIENT) {
      try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}) } catch {}
    }
  }, [phase])

  const fetchStores = async () => {
    setPhase('loading')
    try {
      const res = await fetch(
        `/api/lotto/stores?lat=${gpsLocation.lat}&lng=${gpsLocation.lng}&ohaeng=${encodeURIComponent(userOhaeng)}&radius=5&top=20`
      )
      if (!res.ok) throw new Error()
      const data: StoreResult[] = await res.json()
      setStores(data.slice(0, 3))
      setPhase('result')
    } catch {
      setError('판매점 정보를 불러오지 못했습니다')
      setPhase('result')
    }
  }

  // isAdFree면 바로 로드
  useEffect(() => {
    if (isAdFree) fetchStores()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        borderRadius: '16px 16px 0 0',
        background: '#fff',
        maxHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: '#f9f5ff',
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#6d28d9' }}>🧭 사주 맞춤 판매점 추천</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              <span style={{ color: OHAENG_COLOR[userOhaeng] || '#6d28d9', fontWeight: 700 }}>{userOhaeng} 오행</span>
              {' '}· 길한 방위: <strong>{luckyDirs}</strong>
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#ece5fa', border: 'none',
            fontSize: 14, cursor: 'pointer', color: '#6d28d9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* ── 광고 단계 ── */}
        {phase === 'ad' && (
          <div style={{
            padding: '20px 16px 24px', flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6, textAlign: 'center' }}>
              광고를 시청하면
            </p>
            <p style={{ fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 1.7, marginBottom: 20 }}>
              <strong style={{ color: '#6d28d9' }}>내 사주 맞춤 판매점 3곳</strong>을
              <br/>직접 찍어서 알려드립니다
            </p>

            {/* 광고 영역 */}
            <div style={{
              width: '100%', minHeight: 120, background: '#f5f5f5',
              border: '1px dashed #ddd', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20, overflow: 'hidden', flexShrink: 0,
            }}>
              {AD_CLIENT ? (
                <ins
                  className="adsbygoogle"
                  style={{ display: 'block', width: '100%', minHeight: 100 }}
                  data-ad-client={AD_CLIENT}
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <p style={{ fontSize: 11, color: '#bbb' }}>광 고</p>
                </div>
              )}
            </div>

            {/* 카운트다운 버튼 */}
            <div style={{ width: '100%', position: 'relative' }}>
              {countdown > 0 && (
                <div style={{
                  position: 'absolute', top: -8, right: -4,
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#6d28d9', color: '#fff',
                  fontSize: 12, fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}>{countdown}</div>
              )}
              <button
                onClick={countdown <= 0 ? fetchStores : undefined}
                disabled={countdown > 0}
                style={{
                  width: '100%', height: 50,
                  background: countdown > 0
                    ? `linear-gradient(to right, #6d28d9 ${(5 - countdown) * 20}%, #e0d5f7 ${(5 - countdown) * 20}%)`
                    : '#6d28d9',
                  color: countdown > 0 ? '#9d7dd4' : '#fff',
                  fontSize: 14, fontWeight: 700,
                  border: 'none', borderRadius: 10,
                  cursor: countdown > 0 ? 'default' : 'pointer',
                  transition: 'background 0.5s',
                }}
              >
                {countdown > 0
                  ? `잠시만요... (${countdown}초)`
                  : '✨ 내 사주 맞춤 판매점 3곳 보기'}
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#bbb', marginTop: 12, textAlign: 'center' }}>
              광고 시청 후 추천 결과가 잠금 해제됩니다
            </p>
          </div>
        )}

        {/* ── 로딩 ── */}
        {phase === 'loading' && (
          <div style={{ padding: '60px 16px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🧭</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', marginBottom: 6 }}>
              사주 방위 분석 중...
            </p>
            <p style={{ fontSize: 12, color: '#888' }}>
              {userOhaeng} 오행 기준 주변 판매점을 탐색합니다
            </p>
          </div>
        )}

        {/* ── 결과 ── */}
        {phase === 'result' && (
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
            {error || stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>😔</div>
                <p style={{ fontSize: 13, color: '#888' }}>
                  {error || '주변에 추천 판매점이 없습니다'}
                </p>
                <p style={{ fontSize: 12, color: '#bbb', marginTop: 6 }}>
                  현재 위치 5km 이내 데이터 없음
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 14, textAlign: 'center' }}>
                  현재 위치 기준 <strong style={{ color: '#6d28d9' }}>{userOhaeng} 오행 길한 방위</strong> 추천 TOP {stores.length}
                </p>

                {(() => {
                  const maxWin = Math.max(...stores.map(s => s.winCount1st), 1)
                  return stores.map((store, i) => {
                    const score = calcScore(store, maxWin)
                    const dirLabel = store.bearing !== undefined ? bearingLabel(store.bearing) : ''
                    const rankColor = i === 0 ? '#e4a816' : i === 1 ? '#9e9e9e' : '#cd7f32'

                    return (
                      <div key={store.id || i} style={{
                        background: store.isLucky ? '#f9f5ff' : '#fafafa',
                        border: `1.5px solid ${store.isLucky ? '#c4a0e8' : '#e8e8e8'}`,
                        borderRadius: 12, padding: '14px 12px', marginBottom: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          {/* 순위 */}
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: rankColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 900, color: '#fff',
                          }}>{i + 1}</div>

                          {/* 정보 */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{store.name}</p>
                              {store.isLucky && (
                                <span style={{
                                  fontSize: 10, fontWeight: 600, color: '#fff',
                                  background: OHAENG_COLOR[userOhaeng] || '#6d28d9',
                                  padding: '1px 6px', borderRadius: 3,
                                }}>
                                  길한 방위
                                </span>
                              )}
                            </div>
                            <p style={{
                              fontSize: 11, color: '#777', marginBottom: 8,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              📍 {store.address}
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              {store.distance !== undefined && (
                                <span style={{ fontSize: 11, color: '#007bc3', fontWeight: 600 }}>
                                  📌 {store.distance.toFixed(1)}km
                                </span>
                              )}
                              {dirLabel && (
                                <span style={{ fontSize: 11, color: '#6d28d9', fontWeight: 600 }}>
                                  🧭 {dirLabel} 방향
                                </span>
                              )}
                              <span style={{ fontSize: 11, color: '#dc1f1f', fontWeight: 600 }}>
                                🏆 1등 {store.winCount1st}회
                              </span>
                            </div>
                          </div>

                          {/* 사주 궁합 점수 */}
                          <div style={{
                            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                            background: `conic-gradient(${OHAENG_COLOR[userOhaeng] || '#6d28d9'} ${score * 3.6}deg, #eee ${score * 3.6}deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%',
                              background: '#fff',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#333', lineHeight: 1 }}>{score}</span>
                              <span style={{ fontSize: 8, color: '#aaa', lineHeight: 1 }}>점</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}

                <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
                  점수: 방위 적합도(50) + 당첨 이력(30) + 거리(20) 종합
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
