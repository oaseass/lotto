'use client'

import { useState } from 'react'

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E']

function getBallColor(n: number): string {
  if (n <= 10) return '#f7971d'
  if (n <= 20) return '#4ca9e4'
  if (n <= 30) return '#e74c3c'
  if (n <= 40) return '#888888'
  return '#5bb544'
}

// 7열 × 7행 (실제 용지 레이아웃)
const ROWS: (number | null)[][] = Array.from({ length: 7 }, (_, r) =>
  Array.from({ length: 7 }, (_, c) => {
    const n = r * 7 + c + 1
    return n <= 45 ? n : null
  })
)

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
          if (nextEmpty !== -1) setTimeout(() => setActiveGame(nextEmpty), 200)
        }
      }
      return next
    })
  }

  const clearGame = (i: number) =>
    setGames(prev => { const n = [...prev]; n[i] = []; return n })

  const filledGames = games.filter(g => g.length === 6)
  const activeNums = games[activeGame]
  const picked = activeNums.length
  const maxed = picked >= 6

  const handleSave = async () => {
    if (filledGames.length === 0) { setError('최소 1게임을 완성해주세요'); return }
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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        borderRadius: '14px 14px 0 0',
        overflow: 'hidden',
        maxHeight: '96vh',
        display: 'flex', flexDirection: 'column',
        background: '#f6f2ea',
      }}>

        {/* ── 헤더 ── */}
        <div style={{
          background: '#fff',
          borderBottom: '2px solid #c00',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
            <div>
              <div style={{ fontSize: 8, color: '#c00', fontWeight: 900, letterSpacing: 1, lineHeight: 1 }}>나눔</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#c00', letterSpacing: -0.5, lineHeight: 1 }}>Lotto</div>
            </div>
            <div style={{
              background: '#c00', color: '#fff', fontSize: 11, fontWeight: 900,
              padding: '2px 5px', borderRadius: 3, marginBottom: 2,
            }}>6/45</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#888' }}>수동(Manual)</span>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#f0f0f0', border: 'none', fontSize: 14,
              cursor: 'pointer', color: '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── 용지 영역 ── */}
          <div style={{
            margin: '10px 10px 0',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            {/* 게임 탭 A~E */}
            <div style={{ display: 'flex', background: '#f7f7f7', borderBottom: '1px solid #ddd' }}>
              {GAME_LABELS.map((label, i) => {
                const isActive = activeGame === i
                const isDone = games[i].length === 6
                return (
                  <button
                    key={label}
                    onClick={() => setActiveGame(i)}
                    style={{
                      flex: 1, padding: '7px 4px',
                      background: isActive ? '#c00' : isDone ? '#fff0f0' : 'transparent',
                      border: 'none',
                      borderRight: i < 4 ? '1px solid #ddd' : 'none',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 900, color: isActive ? '#fff' : isDone ? '#c00' : '#666' }}>
                      {label}
                    </span>
                    <span style={{ fontSize: 9, color: isActive ? 'rgba(255,255,255,0.8)' : isDone ? '#c00' : '#aaa' }}>
                      {isDone ? '완료✓' : `${games[i].length}/6`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 선택 번호 미리보기 */}
            <div style={{
              padding: '6px 10px',
              background: '#fff8f8',
              borderBottom: '1px solid #f0e8e8',
              display: 'flex', alignItems: 'center', gap: 5, minHeight: 44,
            }}>
              <span style={{
                fontSize: 11, fontWeight: 900, color: '#fff',
                background: '#c00', width: 20, height: 20, borderRadius: 3,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>{GAME_LABELS[activeGame]}</span>
              {picked === 0
                ? <span style={{ fontSize: 11, color: '#bbb' }}>번호를 선택해주세요 (6개)</span>
                : [...activeNums].sort((a, b) => a - b).map(n => (
                    <div key={n} style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${getBallColor(n)}dd, ${getBallColor(n)})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: n >= 10 ? 11 : 12, fontWeight: 900, color: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      flexShrink: 0,
                    }}>{n}</div>
                  ))
              }
              {picked > 0 && (
                <button
                  onClick={() => clearGame(activeGame)}
                  style={{
                    marginLeft: 'auto', fontSize: 11, color: '#c00',
                    background: 'none', border: '1px solid #c00',
                    borderRadius: 3, padding: '2px 7px', cursor: 'pointer', flexShrink: 0,
                  }}
                >초기화</button>
              )}
            </div>

            {/* ── 번호 격자 ── */}
            <div style={{ padding: '10px 8px 8px' }}>
              {ROWS.map((row, ri) => (
                <div key={ri} style={{
                  display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                  gap: 4, marginBottom: 4,
                }}>
                  {row.map((n, ci) => {
                    if (n === null) return <div key={`empty-${ci}`} />

                    const selected = activeNums.includes(n)
                    const disabled = maxed && !selected
                    const color = getBallColor(n)

                    return (
                      <button
                        key={n}
                        onClick={() => toggle(n)}
                        style={{
                          // 셀 전체가 탭 영역
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          padding: '4px 2px 5px',
                          background: selected ? '#fff0f0' : '#fafafa',
                          border: `1.5px solid ${selected ? color : '#e0e0e0'}`,
                          borderRadius: 5,
                          cursor: disabled ? 'default' : 'pointer',
                          opacity: disabled ? 0.25 : 1,
                          gap: 2,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        {/* 번호 텍스트 */}
                        <span style={{
                          fontSize: 10, fontWeight: selected ? 700 : 500,
                          color: selected ? color : '#555',
                          lineHeight: 1,
                        }}>
                          {String(n).padStart(2, '0')}
                        </span>
                        {/* 마킹 원 */}
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          background: selected
                            ? `radial-gradient(circle at 35% 35%, ${color}cc, ${color})`
                            : '#e8e8e8',
                          border: selected ? 'none' : '1px solid #d0d0d0',
                          boxShadow: selected ? `0 1px 4px ${color}66` : 'none',
                          transition: 'background 0.1s, box-shadow 0.1s',
                          flexShrink: 0,
                        }} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 하단 상태 */}
            <div style={{
              borderTop: '1px solid #eee', padding: '6px 12px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#fafafa',
            }}>
              <span style={{ fontSize: 11, color: maxed ? '#27ae60' : '#888', fontWeight: maxed ? 700 : 400 }}>
                {maxed ? `6개 선택 완료 ✓ — 다른 게임 탭을 눌러주세요` : `${6 - picked}개 더 선택하세요`}
              </span>
              <span style={{ fontSize: 11, color: '#c00', fontWeight: 600 }}>1,000원/게임</span>
            </div>
          </div>

          {/* 완료된 게임 요약 */}
          {filledGames.length > 0 && (
            <div style={{ margin: '8px 10px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {games.map((g, i) => g.length === 6 && (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 10px',
                  background: '#fff', border: '1px solid #e0d8d0', borderRadius: 4,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                    background: '#c00', color: '#fff', fontSize: 12, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{GAME_LABELS[i]}</span>
                  <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                    {[...g].sort((a, b) => a - b).map(n => (
                      <div key={n} style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: getBallColor(n),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: n >= 10 ? 9 : 10, fontWeight: 900, color: '#fff',
                      }}>{n}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => clearGame(i)}
                    style={{
                      fontSize: 12, color: '#aaa', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '2px 6px',
                    }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ height: 10 }} />
        </div>

        {/* ── 저장 버튼 ── */}
        <div style={{
          padding: '10px 12px',
          borderTop: '2px solid #c00',
          background: '#fff',
          flexShrink: 0,
        }}>
          {error && <p style={{ fontSize: 12, color: '#c00', textAlign: 'center', marginBottom: 8 }}>{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving || filledGames.length === 0}
            style={{
              width: '100%', height: 48,
              background: filledGames.length > 0 ? '#c00' : '#ccc',
              border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 16, fontWeight: 900,
              cursor: filledGames.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? '저장 중...' : filledGames.length > 0
              ? `${filledGames.length}게임 저장 (₩${(filledGames.length * 1000).toLocaleString()})`
              : '번호를 선택해주세요'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
