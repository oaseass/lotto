'use client'

import { useState, useEffect } from 'react'

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}
const OHAENG_LABEL: Record<string, string> = {
  목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)',
}
const OHAENG_HANJA: Record<string, string> = {
  목: '木', 화: '火', 토: '土', 금: '金', 수: '水',
}

interface StoreResult {
  id?: string
  name: string
  address: string
  winCount1st: number
  sajuScore?: number
  regionOhaeng?: string | null
  numOhaeng?: string | null
  distance?: number
}

interface Props {
  onClose: () => void
  userOhaeng: string
  isAdFree?: boolean
}

function buildReasonLines(store: StoreResult, weakElements: string[]): string[] {
  const lines: string[] = []
  const regionWeights = [50, 30, 20]
  const numWeights = [20, 12, 8]

  const rIdx = weakElements.indexOf(store.regionOhaeng ?? '')
  if (rIdx >= 0) {
    const rank = ['핵심', '보조', '3차'][rIdx]
    const pts = regionWeights[rIdx] ?? 10
    lines.push(`🌏 방위 기운: ${store.regionOhaeng}(${OHAENG_HANJA[store.regionOhaeng!]}) — ${rank} 부족 기운과 일치 (+${pts}점)`)
  } else if (store.regionOhaeng) {
    lines.push(`🌏 방위 기운: ${store.regionOhaeng}(${OHAENG_HANJA[store.regionOhaeng]}) — 용신과 불일치`)
  }

  const nIdx = weakElements.indexOf(store.numOhaeng ?? '')
  if (nIdx >= 0) {
    const rank = ['핵심', '보조', '3차'][nIdx]
    const pts = numWeights[nIdx] ?? 5
    lines.push(`🔢 수리 기운: ${store.numOhaeng}(${OHAENG_HANJA[store.numOhaeng!]}) — ${rank} 부족 기운과 일치 (+${pts}점)`)
  } else if (store.numOhaeng) {
    lines.push(`🔢 수리 기운: ${store.numOhaeng}(${OHAENG_HANJA[store.numOhaeng]}) — 용신과 불일치`)
  }

  lines.push(`🏆 1등 당첨 ${store.winCount1st}회 배출 실적`)

  if (store.sajuScore !== undefined) {
    lines.push(`✨ 종합 사주 궁합 점수: ${store.sajuScore}점`)
  }

  if (store.distance !== undefined) {
    lines.push(`📌 현재 위치에서 ${store.distance.toFixed(1)}km 이내`)
  }

  return lines
}

export default function SajuStoreModal({ onClose, userOhaeng, isAdFree }: Props) {
  const weakElements = userOhaeng.split(',').filter(Boolean)
  const primary = weakElements[0] || '수'
  const [phase, setPhase] = useState<'ad' | 'loading' | 'result'>('ad')
  const [countdown, setCountdown] = useState(isAdFree ? 0 : 5)
  const [stores, setStores] = useState<StoreResult[]>([])
  const [error, setError] = useState('')
  const [useLocation, setUseLocation] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // 광고 카운트다운
  useEffect(() => {
    if (phase !== 'ad' || countdown <= 0 || isAdFree) return
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown, isAdFree])

  // AdSense 초기화
  useEffect(() => {
    if (phase === 'ad' && AD_CLIENT && !isAdFree) {
      try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}) } catch {}
    }
  }, [phase, isAdFree])

  const fetchStores = async (lat?: number, lng?: number) => {
    setPhase('loading')
    try {
      let url = `/api/lotto/stores?ohaeng=${encodeURIComponent(userOhaeng)}&top=3`
      if (lat !== undefined && lng !== undefined) {
        url += `&lat=${lat}&lng=${lng}&radius=10`
      }
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data: StoreResult[] = await res.json()
      setStores(data)
      setPhase('result')
    } catch {
      setError('판매점 정보를 불러오지 못했습니다')
      setPhase('result')
    }
  }

  const handleFetch = async () => {
    if (useLocation) {
      setLocationLoading(true)
      setLocationError('')
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
        )
        setLocationLoading(false)
        await fetchStores(pos.coords.latitude, pos.coords.longitude)
      } catch {
        setLocationLoading(false)
        setLocationError('위치 정보를 가져오지 못했습니다. 전국으로 검색합니다.')
        await fetchStores()
      }
    } else {
      await fetchStores()
    }
  }

  const rankColors = ['#e4a816', '#9e9e9e', '#cd7f32']

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
              {weakElements.map((w, i) => (
                <span key={w}>
                  <span style={{ color: OHAENG_COLOR[w] || '#6d28d9', fontWeight: 700 }}>
                    {OHAENG_LABEL[w] || w}
                  </span>
                  {i < weakElements.length - 1 ? ' · ' : ''}
                </span>
              ))} 기운이 닿는 곳을 찾아드립니다
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#ece5fa', border: 'none',
            fontSize: 14, cursor: 'pointer', color: '#6d28d9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* ── 광고/초기 단계 ── */}
        {phase === 'ad' && (
          <div style={{
            padding: '20px 16px 24px', flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6, textAlign: 'center' }}>
              잠깐, 운명의 실을 잇는 중
            </p>
            <p style={{ fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 1.8, marginBottom: 20 }}>
              천지의 기운과 수리의 흐름을 읽어<br/>
              <strong style={{ color: '#6d28d9' }}>당신의 사주와 가장 잘 맞는</strong><br/>
              판매점 3곳을 점지해 드립니다
            </p>

            {/* 광고 영역 (isAdFree가 아닐 때만) */}
            {!isAdFree && (
              <div style={{
                width: '100%', minHeight: 100, background: '#f5f5f5',
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
                  <p style={{ fontSize: 11, color: '#bbb' }}>광 고</p>
                )}
              </div>
            )}

            {/* 현재 위치 반영 체크박스 */}
            <div style={{
              width: '100%', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
              background: useLocation ? '#f0eaff' : '#f5f5f5',
              border: `1px solid ${useLocation ? '#c4a0e8' : '#e0e0e0'}`,
              borderRadius: 8, padding: '10px 12px',
              transition: 'all 0.2s',
            }}>
              <input
                id="use-location"
                type="checkbox"
                checked={useLocation}
                onChange={e => { setUseLocation(e.target.checked); setLocationError('') }}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#6d28d9' }}
              />
              <label htmlFor="use-location" style={{
                fontSize: 13, fontWeight: 600,
                color: useLocation ? '#6d28d9' : '#555',
                cursor: 'pointer', flex: 1,
              }}>
                📍 현재 위치 반영
              </label>
              <span style={{ fontSize: 11, color: useLocation ? '#9d7dd4' : '#aaa' }}>
                {useLocation ? '반경 10km 내 추천' : '전국 범위 추천'}
              </span>
            </div>
            {locationError && (
              <p style={{ fontSize: 11, color: '#e86352', marginBottom: 8, textAlign: 'center', width: '100%' }}>
                ⚠️ {locationError}
              </p>
            )}

            {/* 카운트다운 + 조회 버튼 */}
            <div style={{ width: '100%', position: 'relative' }}>
              {!isAdFree && countdown > 0 && (
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
                onClick={(!isAdFree && countdown > 0) || locationLoading ? undefined : handleFetch}
                disabled={(!isAdFree && countdown > 0) || locationLoading}
                style={{
                  width: '100%', height: 50,
                  background: (!isAdFree && countdown > 0)
                    ? `linear-gradient(to right, #6d28d9 ${(5 - countdown) * 20}%, #e0d5f7 ${(5 - countdown) * 20}%)`
                    : '#6d28d9',
                  color: (!isAdFree && countdown > 0) ? '#9d7dd4' : '#fff',
                  fontSize: 14, fontWeight: 700,
                  border: 'none', borderRadius: 10,
                  cursor: ((!isAdFree && countdown > 0) || locationLoading) ? 'default' : 'pointer',
                  transition: 'background 0.5s',
                }}
              >
                {locationLoading
                  ? '📍 위치 확인 중...'
                  : (!isAdFree && countdown > 0)
                    ? `잠시만요... (${countdown}초)`
                    : '✨ 내 사주 맞춤 판매점 3곳 보기'}
              </button>
            </div>
          </div>
        )}

        {/* ── 로딩 ── */}
        {phase === 'loading' && (
          <div style={{ padding: '60px 16px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔮</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', marginBottom: 6 }}>운명의 실을 잇는 중...</p>
            <p style={{ fontSize: 12, color: '#888' }}>
              {weakElements.map(w => OHAENG_LABEL[w]).join(' · ')} 기운이 닿는 곳을 찾고 있습니다
            </p>
          </div>
        )}

        {/* ── 결과 ── */}
        {phase === 'result' && (
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
            {error || stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 13, color: '#888' }}>{error || '추천 판매점을 찾지 못했습니다'}</p>
                {!error && useLocation && (
                  <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>반경 10km 내 사주 맞춤 판매점이 없습니다</p>
                )}
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 14, textAlign: 'center' }}>
                  <strong style={{ color: '#6d28d9' }}>{weakElements.map(w => OHAENG_LABEL[w]).join(' · ')}</strong> 부족 기운을<br/>
                  가장 잘 채워줄 판매점 {stores.length}곳을 점지했습니다
                </p>

                {stores.map((store, i) => {
                  const isExpanded = expandedIdx === i
                  const reasonLines = buildReasonLines(store, weakElements)
                  return (
                    <div
                      key={store.id || i}
                      style={{
                        background: '#f9f5ff',
                        border: `1.5px solid ${isExpanded ? '#6d28d9' : '#c4a0e8'}`,
                        borderRadius: 12, padding: '14px 12px', marginBottom: 10,
                        cursor: 'pointer',
                        transition: 'border-color 0.15s',
                      }}
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        {/* 순위 */}
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: rankColors[i],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 900, color: '#fff',
                        }}>{i + 1}</div>

                        {/* 정보 */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
                              {store.name}
                            </p>
                            <span style={{ fontSize: 11, color: '#9d7dd4', flexShrink: 0, marginLeft: 8 }}>
                              {isExpanded ? '▲ 접기' : '▼ 사유'}
                            </span>
                          </div>
                          <p style={{
                            fontSize: 11, color: '#777', marginBottom: 8,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            📍 {store.address}
                          </p>

                          {/* 선정 이유 뱃지 */}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                            {weakElements.map((w, idx) => (
                              store.regionOhaeng === w && (
                                <span key={`r${w}`} style={{
                                  fontSize: 10, fontWeight: 700,
                                  background: OHAENG_COLOR[w] || '#6d28d9',
                                  color: '#fff', padding: '2px 7px', borderRadius: 10,
                                }}>
                                  🌏 {idx === 0 ? '핵심' : idx === 1 ? '보조' : '3차'} 방위 일치
                                </span>
                              )
                            ))}
                            {weakElements.map((w, idx) => (
                              store.numOhaeng === w && (
                                <span key={`n${w}`} style={{
                                  fontSize: 10, fontWeight: 700,
                                  background: '#6d28d9', color: '#fff',
                                  padding: '2px 7px', borderRadius: 10,
                                }}>
                                  ✨ {idx === 0 ? '핵심' : idx === 1 ? '보조' : '3차'} 수리 일치
                                </span>
                              )
                            ))}
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: '#dc1f1f', color: '#fff',
                              padding: '2px 7px', borderRadius: 10,
                            }}>
                              🏆 1등 {store.winCount1st}회
                            </span>
                          </div>
                        </div>

                        {/* 사주 궁합 점수 */}
                        {store.sajuScore !== undefined && (
                          <div style={{
                            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                            background: `conic-gradient(${OHAENG_COLOR[primary] || '#6d28d9'} ${store.sajuScore * 3.6}deg, #eee ${store.sajuScore * 3.6}deg)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: '50%', background: '#fff',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 900, color: '#333', lineHeight: 1 }}>{store.sajuScore}</span>
                              <span style={{ fontSize: 8, color: '#aaa', lineHeight: 1 }}>점</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ── 선정 사유 (펼쳐짐) ── */}
                      {isExpanded && (
                        <div style={{
                          marginTop: 12,
                          padding: '10px 12px',
                          background: '#fff',
                          borderRadius: 8,
                          border: '1px solid #e8d5f2',
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', marginBottom: 8 }}>
                            📋 이 판매점이 선정된 이유
                          </p>
                          {reasonLines.map((line, li) => (
                            <div key={li} style={{
                              fontSize: 12, color: '#444', lineHeight: 1.7,
                              paddingBottom: li < reasonLines.length - 1 ? 6 : 0,
                              borderBottom: li < reasonLines.length - 1 ? '1px solid #f0eaff' : 'none',
                              marginBottom: li < reasonLines.length - 1 ? 6 : 0,
                            }}>
                              {line}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
                  방위의 기운 · 수리의 흐름 · 당첨의 실적을 종합하여 선정
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
