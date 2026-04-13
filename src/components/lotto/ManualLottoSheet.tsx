'use client'

import { useState } from 'react'

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E']

// 실제 로또 볼 색상
function getBallColor(n: number): string {
  if (n <= 10) return '#f7971d'
  if (n <= 20) return '#4ca9e4'
  if (n <= 30) return '#e74c3c'
  if (n <= 40) return '#888'
  return '#5bb544'
}

// 7열 × 7행 배열 (실제 용지와 동일)
const ROWS: (number | null)[][] = (() => {
  const rows: (number | null)[][] = []
  for (let r = 0; r < 7; r++) {
    const row: (number | null)[] = []
    for (let c = 0; c < 7; c++) {
      const n = r * 7 + c + 1
      row.push(n <= 45 ? n : null)
    }
    rows.push(row)
  }
  return rows
})()

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
          if (nextEmpty !== -1) setTimeout(() => setActiveGame(nextEmpty), 180)
        }
      }
      return next
    })
  }

  const clearGame = (i: number) =>
    setGames(prev => { const n = [...prev]; n[i] = []; return n })

  const filledGames = games.filter(g => g.length === 6)

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

  const activeNums = games[activeGame]
  const picked = activeNums.length

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
        maxHeight: '95vh',
        display: 'flex', flexDirection: 'column',
        background: '#f8f4ec',
      }}>

        {/* ── 나눔 로또 헤더 ── */}
        <div style={{
          background: '#fff',
          borderBottom: '2px solid #c00',
          padding: '8px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* 로고 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 8, color: '#c00', fontWeight: 900, letterSpacing: 1 }}>나눔</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#c00', letterSpacing: -0.5, lineHeight: 1.1 }}>
                Lotto
              </div>
            </div>
            <div style={{
              background: '#c00', color: '#fff',
              fontSize: 11, fontWeight: 900,
              padding: '2px 5px', borderRadius: 3,
              marginLeft: 4, alignSelf: 'flex-end', marginBottom: 2,
            }}>
              6/45
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#888' }}>수동(Manual)</span>
            <button onClick={onClose} style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#f0f0f0', border: 'none',
              fontSize: 14, cursor: 'pointer', color: '#555',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── 용지 영역 ── */}
          <div style={{
            margin: '10px 10px 0',
            background: '#fff',
            border: '1px solid #bbb',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            {/* 게임 탭 (A~E) - 실제 용지처럼 각 게임 컬럼 헤더 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
              {GAME_LABELS.map((label, i) => {
                const isActive = activeGame === i
                const isDone = games[i].length === 6
                return (
                  <button
                    key={label}
                    onClick={() => setActiveGame(i)}
                    style={{
                      flex: 1, padding: '5px 2px',
                      background: isActive ? '#c00' : isDone ? '#ffe8e8' : '#f7f7f7',
                      border: 'none',
                      borderRight: i < 4 ? '1px solid #ddd' : 'none',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 1,
                    }}
                  >
                    <span style={{
                      fontSize: 13, fontWeight: 900,
                      color: isActive ? '#fff' : isDone ? '#c00' : '#555',
                    }}>
                      {label}
                    </span>
                    <span style={{
                      fontSize: 9,
                      color: isActive ? 'rgba(255,255,255,0.85)' : isDone ? '#c00' : '#aaa',
                    }}>
                      {isDone ? '완료✓' : `${games[i].length}/6`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 선택된 번호 미리보기 행 */}
            <div style={{
              background: '#fff8f8',
              borderBottom: '1px solid #eee',
              padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 5,
              minHeight: 42,
            }}>
              <span style={{ fontSize: 10, color: '#c00', fontWeight: 700, flexShrink: 0, marginRight: 2 }}>
                {GAME_LABELS[activeGame]}
              </span>
              {picked === 0 ? (
                <span style={{ fontSize: 11, color: '#bbb' }}>번호를 마킹하세요 (6개)</span>
              ) : (
                [...activeNums].sort((a, b) => a - b).map(n => (
                  <div key={n} style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 35%, ${getBallColor(n)}dd, ${getBallColor(n)})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: n >= 10 ? 10 : 11, fontWeight: 900, color: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    flexShrink: 0,
                  }}>
                    {n}
                  </div>
                ))
              )}
              {picked > 0 && (
                <button
                  onClick={() => clearGame(activeGame)}
                  style={{
                    marginLeft: 'auto', fontSize: 10, color: '#c00',
                    background: 'none', border: '1px solid #c00',
                    borderRadius: 3, padding: '2px 7px', cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >초기화</button>
              )}
            </div>

            {/* ── 번호 격자 (7열 × 7행, 실제 용지 레이아웃) ── */}
            <div style={{ padding: '8px 8px 10px', background: '#fff' }}>
              {ROWS.map((row, ri) => (
                <div
                  key={ri}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 3 }}
                >
                  {row.map((n, ci) => {
                    if (n === null) {
                      // 빈 셀 (46~49 위치)
                      return <div key={ci} />
                    }
                    const selected = activeNums.includes(n)
                    const inOther = games.findIndex((g, gi) => gi !== activeGame && g.includes(n))
                    const maxed = picked >= 6 && !selected
                    const ballColor = getBallColor(n)

                    return (
                      <button
                        key={n}
                        onClick={() => toggle(n)}
                        disabled={maxed}
                        style={{
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          padding: '3px 0',
                          background: selected ? '#fff8f8' : 'transparent',
                          border: selected ? `1px solid ${ballColor}88` : '1px solid #e8e8e8',
                          borderRadius: 4,
                          cursor: maxed ? 'not-allowed' : 'pointer',
                          opacity: maxed ? 0.3 : 1,
                          transition: 'all 0.1s',
                          gap: 1,
                        }}
                      >
                        {/* 번호 */}
                        <span style={{
                          fontSize: 9,
                          fontWeight: selected ? 700 : 500,
                          color: selected ? ballColor : inOther >= 0 ? `${getBallColor(n)}aa` : '#444',
                          lineHeight: 1,
                        }}>
                          {String(n).padStart(2, '0')}
                        </span>
                        {/* 마킹 원 (실제 용지의 마킹 위치) */}
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: selected
                            ? `radial-gradient(circle at 35% 35%, ${ballColor}dd, ${ballColor})`
                            : inOther >= 0
                            ? `${getBallColor(n)}33`
                            : '#f0f0f0',
                          border: selected
                            ? 'none'
                            : `1px solid ${inOther >= 0 ? getBallColor(n) + '66' : '#d0d0d0'}`,
                          boxShadow: selected ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
                          transition: 'all 0.1s',
                        }} />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 하단 안내 */}
            <div style={{
              borderTop: '1px solid #eee',
              padding: '5px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#fafafa',
            }}>
              <span style={{ fontSize: 10, color: '#888' }}>
                {picked < 6 ? `${6 - picked}개 더 선택하세요` : '6개 선택 완료 ✓'}
              </span>
              <span style={{ fontSize: 10, color: '#c00', fontWeight: 600 }}>1,000원/게임</span>
            </div>
          </div>

          {/* 전체 게임 요약 */}
          {filledGames.length > 0 && (
            <div style={{ margin: '8px 10px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {games.map((g, i) => g.length === 6 && (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 8px',
                  background: '#fff',
                  border: '1px solid #e0d8d0',
                  borderRadius: 4,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 900,
                    color: '#fff', background: '#c00',
                    width: 18, height: 18, borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{GAME_LABELS[i]}</span>
                  <div style={{ display: 'flex', gap: 3, flex: 1 }}>
                    {[...g].sort((a, b) => a - b).map(n => (
                      <div key={n} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: getBallColor(n),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 900, color: '#fff',
                      }}>{n}</div>
                    ))}
                  </div>
                  <button
                    onClick={() => clearGame(i)}
                    style={{
                      fontSize: 10, color: '#aaa', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '2px 4px',
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
        }}>
          {error && (
            <p style={{ fontSize: 12, color: '#c00', textAlign: 'center', marginBottom: 8 }}>{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || filledGames.length === 0}
            style={{
              width: '100%', height: 46,
              background: filledGames.length > 0 ? '#c00' : '#ccc',
              border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 15, fontWeight: 900,
              cursor: filledGames.length > 0 ? 'pointer' : 'not-allowed',
              letterSpacing: 0.5,
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
