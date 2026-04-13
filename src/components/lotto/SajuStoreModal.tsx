'use client'

import { useState, useEffect } from 'react'

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}
const OHAENG_LABEL: Record<string, string> = {
  목: '목(木)', 화: '화(火)', 토: '토(土)', 금: '금(金)', 수: '수(水)',
}

interface StoreResult {
  id?: string
  name: string
  address: string
  winCount1st: number
  sajuScore?: number
  regionOhaeng?: string | null
  numOhaeng?: string | null
}

interface Props {
  onClose: () => void
  userOhaeng: string
  isAdFree?: boolean
}

export default function SajuStoreModal({ onClose, userOhaeng, isAdFree }: Props) {
  const [phase, setPhase] = useState<'ad' | 'loading' | 'result'>(isAdFree ? 'loading' : 'ad')
  const [countdown, setCountdown] = useState(5)
  const [stores, setStores] = useState<StoreResult[]>([])
  const [error, setError] = useState('')

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
        `/api/lotto/stores?ohaeng=${encodeURIComponent(userOhaeng)}&top=3`
      )
      if (!res.ok) throw new Error()
      const data: StoreResult[] = await res.json()
      setStores(data)
      setPhase('result')
    } catch {
      setError('판매점 정보를 불러오지 못했습니다')
      setPhase('result')
    }
  }

  useEffect(() => {
    if (isAdFree) fetchStores()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              용신 <span style={{ color: OHAENG_COLOR[userOhaeng] || '#6d28d9', fontWeight: 700 }}>
                {OHAENG_LABEL[userOhaeng] || userOhaeng}
              </span> 기반 · 지역오행 + 번지수리 + 당첨실적 종합
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
              <strong style={{ color: '#6d28d9' }}>전국에서 내 사주와 가장 잘 맞는</strong><br/>
              판매점 3곳을 찍어드립니다
            </p>

            {/* 선정 기준 설명 */}
            <div style={{
              width: '100%', background: '#f5f0ff', borderRadius: 8,
              padding: '10px 14px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6d28d9', marginBottom: 6 }}>선정 기준</p>
              {[
                { icon: '🗺️', label: '지역 오행 (50점)', desc: '한반도 방위 기준 지역의 오행 일치 여부' },
                { icon: '🔢', label: '번지 수리 (20점)', desc: '판매점 번지번호 수리 오행 일치 여부' },
                { icon: '🏆', label: '당첨 실적 (30점)', desc: '역대 1등 당첨 횟수 반영' },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#555' }}>{label}</span>
                    <span style={{ fontSize: 11, color: '#888' }}> — {desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 광고 영역 */}
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
                {countdown > 0 ? `잠시만요... (${countdown}초)` : '✨ 내 사주 맞춤 판매점 3곳 보기'}
              </button>
            </div>
          </div>
        )}

        {/* ── 로딩 ── */}
        {phase === 'loading' && (
          <div style={{ padding: '60px 16px', textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🔮</div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#6d28d9', marginBottom: 6 }}>사주 분석 중...</p>
            <p style={{ fontSize: 12, color: '#888' }}>
              {OHAENG_LABEL[userOhaeng]} 용신 기준 전국 판매점 분석 중
            </p>
          </div>
        )}

        {/* ── 결과 ── */}
        {phase === 'result' && (
          <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>
            {error || stores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 13, color: '#888' }}>{error || '추천 판매점을 찾지 못했습니다'}</p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 12, color: '#888', marginBottom: 14, textAlign: 'center' }}>
                  <strong style={{ color: '#6d28d9' }}>{OHAENG_LABEL[userOhaeng]} 용신</strong> 기준
                  전국 판매점 사주 궁합 TOP {stores.length}
                </p>

                {stores.map((store, i) => (
                  <div key={store.id || i} style={{
                    background: '#f9f5ff',
                    border: '1.5px solid #c4a0e8',
                    borderRadius: 12, padding: '14px 12px', marginBottom: 10,
                  }}>
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
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>
                          {store.name}
                        </p>
                        <p style={{
                          fontSize: 11, color: '#777', marginBottom: 8,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          📍 {store.address}
                        </p>

                        {/* 선정 이유 뱃지 */}
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                          {store.regionOhaeng === userOhaeng && (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: OHAENG_COLOR[userOhaeng] || '#6d28d9',
                              color: '#fff', padding: '2px 7px', borderRadius: 10,
                            }}>
                              🗺️ 지역오행 {OHAENG_LABEL[store.regionOhaeng]}
                            </span>
                          )}
                          {store.numOhaeng === userOhaeng && (
                            <span style={{
                              fontSize: 10, fontWeight: 700,
                              background: '#6d28d9', color: '#fff',
                              padding: '2px 7px', borderRadius: 10,
                            }}>
                              🔢 번지수리 {OHAENG_LABEL[store.numOhaeng]}
                            </span>
                          )}
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
                          background: `conic-gradient(${OHAENG_COLOR[userOhaeng] || '#6d28d9'} ${store.sajuScore * 3.6}deg, #eee ${store.sajuScore * 3.6}deg)`,
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
                  </div>
                ))}

                <p style={{ fontSize: 10, color: '#ccc', textAlign: 'center', marginTop: 4, lineHeight: 1.6 }}>
                  지역오행(50) + 번지수리(20) + 당첨실적(30) 합산 · 전국 상위 200개 대상
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
