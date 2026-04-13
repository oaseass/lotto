'use client'

import { useState } from 'react'

const GAME_LABELS = ['A', 'B', 'C', 'D', 'E']
const GAME_COLORS = ['#e86352', '#e4a816', '#5bb544', '#007bc3', '#8f35c8']

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function ManualLottoSheet({ onClose, onSaved }: Props) {
  // games[i] = 선택된 번호 set
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
        // 6개 채워지면 다음 빈 게임으로 자동 이동
        if (cur.length + 1 === 6) {
          const nextEmpty = next.findIndex((g, i) => i > activeGame && g.length < 6)
          if (nextEmpty !== -1) setTimeout(() => setActiveGame(nextEmpty), 150)
        }
      }
      return next
    })
  }

  const filledGames = games.filter(g => g.length === 6)

  const handleSave = async () => {
    if (filledGames.length === 0) {
      setError('최소 1게임을 완성해주세요 (6개 선택)')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/lotto/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games: filledGames }),
      })
      if (!res.ok) {
        let errorMsg = '저장 실패'
        try { const d = await res.json(); errorMsg = d.error || errorMsg } catch {}
        setError(errorMsg)
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 12px',
          borderBottom: '1px solid #eee',
          background: '#fff',
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>수동 번호 입력</p>
            <p style={{ fontSize: 11, color: '#888' }}>게임당 6개 선택 · 최대 5게임</p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#f0f0f0', border: 'none',
            fontSize: 16, cursor: 'pointer', color: '#666',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* 로또 용지 */}
          <div style={{
            margin: '12px 14px',
            background: '#fffdf0',
            border: '2px solid #d4a800',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* 로또 용지 상단 */}
            <div style={{
              background: 'linear-gradient(135deg, #007bc3 0%, #005a94 100%)',
              padding: '10px 14px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>LOTTO 6/45</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>수동(Manual)</span>
            </div>

            {/* 게임 탭 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e0c800', background: '#fffae0' }}>
              {GAME_LABELS.map((label, i) => {
                const count = games[i].length
                const done = count === 6
                return (
                  <button
                    key={label}
                    onClick={() => setActiveGame(i)}
                    style={{
                      flex: 1, height: 40,
                      background: activeGame === i ? GAME_COLORS[i] : 'transparent',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}
                  >
                    <span style={{
                      fontSize: 13, fontWeight: 700,
                      color: activeGame === i ? '#fff' : done ? GAME_COLORS[i] : '#999',
                    }}>{label}</span>
                    <span style={{ fontSize: 9, color: activeGame === i ? 'rgba(255,255,255,0.9)' : '#bbb' }}>
                      {done ? '✓' : `${count}/6`}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* 현재 게임 선택 현황 */}
            <div style={{ padding: '10px 14px 6px', background: '#fffdf0' }}>
              <div style={{ display: 'flex', gap: 6, minHeight: 38, alignItems: 'center', flexWrap: 'wrap' }}>
                {games[activeGame].length === 0 ? (
                  <span style={{ fontSize: 12, color: '#bbb' }}>번호를 선택하세요</span>
                ) : (
                  [...games[activeGame]].sort((a, b) => a - b).map(n => (
                    <div
                      key={n}
                      onClick={() => toggle(n)}
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: GAME_COLORS[activeGame],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#fff',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    >{n}</div>
                  ))
                )}
              </div>
            </div>

            {/* 번호 격자 (1~45) */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)',
              gap: 4, padding: '8px 12px 14px',
              background: '#fffdf0',
            }}>
              {Array.from({ length: 45 }, (_, i) => i + 1).map(n => {
                const selected = games[activeGame].includes(n)
                const otherGame = games.findIndex((g, i) => i !== activeGame && g.includes(n))
                return (
                  <button
                    key={n}
                    onClick={() => toggle(n)}
                    style={{
                      aspectRatio: '1',
                      borderRadius: '50%',
                      border: selected
                        ? `2px solid ${GAME_COLORS[activeGame]}`
                        : otherGame >= 0
                        ? `1.5px solid ${GAME_COLORS[otherGame]}55`
                        : '1.5px solid #e0e0e0',
                      background: selected
                        ? GAME_COLORS[activeGame]
                        : otherGame >= 0
                        ? `${GAME_COLORS[otherGame]}22`
                        : '#fff',
                      color: selected ? '#fff' : otherGame >= 0 ? GAME_COLORS[otherGame] : '#444',
                      fontSize: n >= 10 ? 11 : 12,
                      fontWeight: selected ? 900 : 500,
                      cursor: games[activeGame].length >= 6 && !selected ? 'not-allowed' : 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >{n}</button>
                )
              })}
            </div>
          </div>

          {/* 게임 요약 */}
          <div style={{ padding: '0 14px 12px' }}>
            {games.map((g, i) => g.length === 6 && (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', marginBottom: 4,
                background: `${GAME_COLORS[i]}10`,
                border: `1px solid ${GAME_COLORS[i]}40`,
                borderRadius: 6,
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: '#fff',
                  background: GAME_COLORS[i], padding: '2px 8px', borderRadius: 3,
                  flexShrink: 0,
                }}>{GAME_LABELS[i]}</span>
                <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                  {[...g].sort((a, b) => a - b).map(n => (
                    <div key={n} style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: GAME_COLORS[i],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 900, color: '#fff',
                    }}>{n}</div>
                  ))}
                </div>
                <button
                  onClick={() => setGames(prev => { const n = [...prev]; n[i] = []; return n })}
                  style={{
                    fontSize: 11, color: '#999', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '2px 6px', borderRadius: 3,
                    flexShrink: 0,
                  }}
                >지우기</button>
              </div>
            ))}
          </div>
        </div>

        {/* 저장 버튼 */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #eee', background: '#fff' }}>
          {error && (
            <p style={{ fontSize: 12, color: '#dc1f1f', textAlign: 'center', marginBottom: 8 }}>{error}</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || filledGames.length === 0}
            style={{
              width: '100%', height: 48,
              background: filledGames.length > 0 ? '#007bc3' : '#ccc',
              border: 'none', borderRadius: 8,
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: filledGames.length > 0 ? 'pointer' : 'not-allowed',
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
