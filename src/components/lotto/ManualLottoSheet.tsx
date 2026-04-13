'use client'

import { useState } from 'react'

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E']

// 실제 로또 볼 색상
function getBallColor(n: number): string {
  if (n <= 10) return '#f7971d'
  if (n <= 20) return '#4a90d9'
  if (n <= 30) return '#e55353'
  if (n <= 40) return '#888'
  return '#5bb544'
}

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function ManualLottoSheet({ onClose, onSaved }: Props) {
  const [games, setGames] = useState<number[][]>([[], [], [], [], []])
  const [activeGame, setActiveGame] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggle = (num: number) => {
    setGames(prev => {
      const next = prev.map(g => [...g])
      const cur = next[activeGame]
      if (cur.includes(num)) {
        next[activeGame] = cur.filter(n => n !== num)
      } else if (cur.length < 6) {
        next[activeGame] = [...cur, num]
        if (cur.length + 1 === 6) {
          const nextEmpty = next.findIndex((g, i) => i > activeGame && g.length < 6)
          if (nextEmpty !== -1) setTimeout(() => setActiveGame(nextEmpty), 150)
        }
      }
      return next
    })
  }

  const clearGame = (i: number) => setGames(prev => { const n = [...prev]; n[i] = []; return n })

  const filledGames = games.filter(g => g.length === 6)

  const handleSave = async () => {
    if (filledGames.length === 0) { setError('최소 1게임을 완성해주세요 (6개 선택)'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/lotto/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: filledGames }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || '저장 실패'); return }
      onSaved(); onClose()
    } catch { setError('네트워크 오류') }
    finally { setSaving(false) }
  }

  const activeNums = games[activeGame]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        maxHeight: '94vh',
        display: 'flex', flexDirection: 'column',
        background: '#f0ece0', // 복권 용지 느낌
      }}>
        {/* ── 동행복권 헤더 ── */}
        <div style={{
          background: 'linear-gradient(180deg, #005baa 0%, #003f7f 100%)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 로고 느낌 */}
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
            }}>
              <span style={{
                fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.7)',
                letterSpacing: 1, display: 'block', marginBottom: 1,
              }}>동행복권</span>
            </div>
            <div style={{
              background: '#fff', borderRadius: 3,
              padding: '2px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#005baa', letterSpacing: 0.5 }}>LOTTO</span>
              <span style={{
                fontSize: 11, fontWeight: 900, color: '#fff',
                background: '#e74c3c', borderRadius: 3, padding: '1px 5px',
              }}>6/45</span>
            </div>
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.75)',
              background: 'rgba(255,255,255,0.15)',
              padding: '2px 8px', borderRadius: 10,
            }}>수동(Manual)</span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)', border: 'none',
            fontSize: 14, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── 복권 용지 ── */}
          <div style={{
            margin: '10px 12px',
            background: '#fffef5',
            border: '1.5px solid #c9a800',
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            {/* 점선 구분선 느낌 */}
            <div style={{
              background: 'repeating-linear-gradient(90deg, #c9a800 0px, #c9a800 4px, transparent 4px, transparent 9px)',
              height: 3,
            }} />

            {/* 게임 행들 A~E */}
            <div>
              {GAME_LABELS.map((label, i) => {
                const nums = [...games[i]].sort((a, b) => a - b)
                const isActive = activeGame === i
                const isDone = games[i].length === 6

                return (
                  <div
                    key={label}
                    onClick={() => setActiveGame(i)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      padding: '7px 10px',
                      background: isActive ? '#fef9e0' : 'transparent',
                      borderBottom: '1px solid #e8e4d0',
                      cursor: 'pointer',
                      borderLeft: isActive ? '3px solid #005baa' : '3px solid transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    {/* 게임 레이블 */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: isActive ? '#005baa' : isDone ? '#005baa' : '#c8c0a0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 900, color: '#fff',
                      flexShrink: 0, marginRight: 10,
                    }}>
                      {label}
                    </div>

                    {/* 선택된 번호 6개 (볼 스타일) */}
                    <div style={{ display: 'flex', gap: 4, flex: 1, alignItems: 'center' }}>
                      {Array.from({ length: 6 }, (_, j) => {
                        const n = nums[j]
                        const color = n ? getBallColor(n) : undefined
                        return (
                          <div key={j} style={{
                            width: 30, height: 30, borderRadius: '50%',
                            background: n
                              ? `radial-gradient(circle at 35% 35%, ${color}dd, ${color})`
                              : 'transparent',
                            border: n ? 'none' : '1.5px dashed #c8c0a0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: n && n >= 10 ? 10 : 11,
                            fontWeight: 900,
                            color: n ? '#fff' : '#ddd',
                            boxShadow: n ? '0 1px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                            flexShrink: 0,
                          }}>
                            {n || ''}
                          </div>
                        )
                      })}
                    </div>

                    {/* 상태 + 지우기 */}
                    <div style={{ flexShrink: 0, marginLeft: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isDone ? (
                        <>
                          <span style={{ fontSize: 10, color: '#27ae60', fontWeight: 700 }}>완료 ✓</span>
                          <button
                            onClick={e => { e.stopPropagation(); clearGame(i) }}
                            style={{
                              fontSize: 10, color: '#aaa', background: 'none', border: 'none',
                              cursor: 'pointer', padding: '2px 4px',
                            }}
                          >✕</button>
                        </>
                      ) : (
                        <span style={{ fontSize: 10, color: isActive ? '#005baa' : '#aaa', fontWeight: isActive ? 700 : 400 }}>
                          {games[i].length}/6
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 점선 구분선 */}
            <div style={{
              background: 'repeating-linear-gradient(90deg, #c9a800 0px, #c9a800 4px, transparent 4px, transparent 9px)',
              height: 2, margin: '0',
            }} />

            {/* 번호 선택 그리드 */}
            <div style={{ padding: '8px 10px 12px', background: '#fffef5' }}>
              <p style={{
                fontSize: 10, color: '#888', marginBottom: 7, textAlign: 'center',
                letterSpacing: 0.3,
              }}>
                ▶︎ {GAME_LABELS[activeGame]} 게임 · {activeNums.length}/6 마킹
              </p>

              {/* 9열 × 5행 (실제 로또 용지 레이아웃) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(9, 1fr)',
                gap: 5,
              }}>
                {Array.from({ length: 45 }, (_, i) => i + 1).map(n => {
                  const selected = activeNums.includes(n)
                  const inOther = games.some((g, gi) => gi !== activeGame && g.includes(n))
                  const ballColor = getBallColor(n)
                  const maxed = activeNums.length >= 6 && !selected

                  return (
                    <button
                      key={n}
                      onClick={() => toggle(n)}
                      disabled={maxed}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '50%',
                        border: selected
                          ? 'none'
                          : inOther
                          ? `1.5px solid ${ballColor}88`
                          : '1.5px solid #d8d0b8',
                        background: selected
                          ? `radial-gradient(circle at 35% 35%, ${ballColor}ee, ${ballColor})`
                          : inOther
                          ? `${ballColor}22`
                          : '#fff',
                        color: selected ? '#fff' : inOther ? ballColor : '#555',
                        fontSize: n >= 10 ? 10 : 11,
                        fontWeight: selected ? 900 : 500,
                        cursor: maxed ? 'not-allowed' : 'pointer',
                        opacity: maxed ? 0.35 : 1,
                        transition: 'all 0.1s',
                        padding: 0,
                        lineHeight: 1,
                        boxShadow: selected ? '0 1px 4px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' : 'none',
                      }}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 볼 색상 범례 */}
          <div style={{
            display: 'flex', gap: 8, justifyContent: 'center',
            padding: '0 12px 12px', flexWrap: 'wrap',
          }}>
            {[
              { range: '1~10', color: '#f7971d' },
              { range: '11~20', color: '#4a90d9' },
              { range: '21~30', color: '#e55353' },
              { range: '31~40', color: '#888' },
              { range: '41~45', color: '#5bb544' },
            ].map(({ range, color }) => (
              <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: 10, color: '#888' }}>{range}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 저장 버튼 ── */}
        <div style={{
          padding: '10px 14px',
          borderTop: '1px solid #c9a800',
          background: '#f0ece0',
        }}>
          {error && (
            <p style={{ fontSize: 12, color: '#dc1f1f', textAlign: 'center', marginBottom: 8 }}>{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || filledGames.length === 0}
            style={{
              width: '100%', height: 48,
              background: filledGames.length > 0
                ? 'linear-gradient(180deg, #005baa 0%, #003f7f 100%)'
                : '#c0b898',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: filledGames.length > 0 ? 'pointer' : 'not-allowed',
              boxShadow: filledGames.length > 0 ? '0 2px 8px rgba(0,91,170,0.35)' : 'none',
            }}
          >
            {saving ? '저장 중...' : filledGames.length > 0
              ? `${filledGames.length}게임 저장하기`
              : '번호를 선택해주세요'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
