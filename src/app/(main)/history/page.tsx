'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { LottoBall, LottoBallSet } from '@/components/lotto/LottoBall'
import { AdSlot } from '@/components/ui/AdSlot'

type Tab = 'numbers' | 'scans'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const [tab, setTab] = useState<Tab>('numbers')

  if (status === 'loading') {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4, margin: '0 auto' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <div>
        <div style={{
          background: '#fff', padding: '14px 16px', borderBottom: '1px solid #dcdcdc', marginBottom: 8,
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>이력</h2>
        </div>
        <div style={{
          background: '#fff',
          borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
          padding: '48px 20px', textAlign: 'center',
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"
            style={{ display: 'block', margin: '0 auto 14px' }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>로그인이 필요합니다</p>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>이력 조회는 로그인 후 이용 가능합니다</p>
          <Link href="/login" style={{
            display: 'inline-block', height: 40, padding: '0 32px', lineHeight: '38px',
            background: '#007bc3', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            border: '1px solid #005a94', borderRadius: 2,
          }}>
            로그인
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 페이지 헤더 */}
      <div style={{
        background: '#fff', padding: '14px 16px',
        borderBottom: '1px solid #dcdcdc', marginBottom: 0,
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>이력</h2>
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #129f97' }}>
        {(['numbers', 'scans'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, height: 40,
              background: tab === t ? '#fff' : '#fafafa',
              color: tab === t ? '#129f97' : '#727272',
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              border: 'none',
              borderBottom: tab === t ? '2px solid #129f97' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
            }}
          >
            {t === 'numbers' ? '저장 번호' : '스캔 이력'}
          </button>
        ))}
      </div>

      {tab === 'numbers' ? <SavedNumbers /> : <ScanHistory />}
    </div>
  )
}

// ── 필터 바 ──────────────────────────────────────────────
function FilterBar({
  years, months, selectedYear, selectedMonth,
  onYearChange, onMonthChange,
  typeOptions, selectedType, onTypeChange,
  resultCount,
}: {
  years: number[]
  months: number[]
  selectedYear: number | null
  selectedMonth: number | null
  onYearChange: (y: number | null) => void
  onMonthChange: (m: number | null) => void
  typeOptions?: { label: string; value: string }[]
  selectedType?: string
  onTypeChange?: (t: string) => void
  resultCount: number
}) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 16px' }}>
      {/* 년도 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
        <Chip label="전체" active={selectedYear === null}
          onClick={() => { onYearChange(null); onMonthChange(null) }} />
        {years.map(y => (
          <Chip key={y} label={`${y}년`} active={selectedYear === y}
            onClick={() => { onYearChange(y); onMonthChange(null) }} />
        ))}
      </div>

      {/* 월 (년도 선택 시) */}
      {selectedYear !== null && months.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginTop: 6, scrollbarWidth: 'none' }}>
          <Chip label="전월" active={selectedMonth === null} onClick={() => onMonthChange(null)} />
          {months.map(m => (
            <Chip key={m} label={`${m}월`} active={selectedMonth === m}
              onClick={() => onMonthChange(m)} />
          ))}
        </div>
      )}

      {/* 타입 필터 */}
      {typeOptions && onTypeChange && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {typeOptions.map(opt => (
            <Chip key={opt.value} label={opt.label} active={selectedType === opt.value}
              onClick={() => onTypeChange(opt.value)} />
          ))}
        </div>
      )}

      {/* 결과 수 */}
      <p style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>{resultCount}개</p>
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, height: 26, padding: '0 10px',
        background: active ? '#129f97' : '#f5f5f5',
        color: active ? '#fff' : '#555',
        fontSize: 12, fontWeight: active ? 700 : 400,
        border: 'none', borderRadius: 13, cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

// ── 저장 번호 ──────────────────────────────────────────────
function SavedNumbers() {
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['savedNumbers'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers')
      return res.json()
    },
  })

  if (isLoading) return <LoadingRows />
  if (!data?.length) return (
    <EmptyState message="저장된 번호가 없어요" sub="번호 생성 탭에서 번호를 뽑아보세요" />
  )

  // 사용 가능한 년도/월 추출
  const years: number[] = Array.from(
    new Set(data.map((d: any) => new Date(d.createdAt).getFullYear()))
  ).sort((a: any, b: any) => b - a) as number[]

  const months: number[] = filterYear
    ? Array.from(
        new Set(
          data
            .filter((d: any) => new Date(d.createdAt).getFullYear() === filterYear)
            .map((d: any) => new Date(d.createdAt).getMonth() + 1)
        )
      ).sort((a: any, b: any) => a - b) as number[]
    : []

  // 필터 적용
  const filtered = data.filter((item: any) => {
    const d = new Date(item.createdAt)
    if (filterYear && d.getFullYear() !== filterYear) return false
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false
    if (filterType === 'auto' && item.isManual) return false
    if (filterType === 'manual' && !item.isManual) return false
    return true
  })

  return (
    <div>
      <FilterBar
        years={years} months={months}
        selectedYear={filterYear} selectedMonth={filterMonth}
        onYearChange={setFilterYear} onMonthChange={setFilterMonth}
        typeOptions={[
          { label: '전체', value: 'all' },
          { label: '추천', value: 'auto' },
          { label: '수동', value: 'manual' },
        ]}
        selectedType={filterType}
        onTypeChange={setFilterType}
        resultCount={filtered.length}
      />

      {filtered.length === 0 ? (
        <EmptyState message="해당 조건의 번호가 없어요" />
      ) : (
        filtered.map((item: any) => (
          <div key={item.id} style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                {item.drawRound ? `${item.drawRound}회차` : '회차 미지정'}
                {' · '}
                {new Date(item.createdAt).toLocaleDateString('ko-KR')}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: item.isManual ? '#e4a816' : '#007bc3',
              }}>
                {item.isManual ? '수동' : '추천'}
              </span>
            </div>
            <LottoBallSet numbers={item.numbers} size="sm" />
          </div>
        ))
      )}

      <NumberStats />
      <div style={{ padding: '0 16px', marginTop: 8 }}>
        <AdSlot />
      </div>
    </div>
  )
}

const RANK_COLORS = ['#dc1f1f', '#e03f0e', '#e4a816', '#007bc3', '#129f97']
const RANK_LABELS = ['1등', '2등', '3등', '4등', '5등']

function NumberStats() {
  const [expandedRank, setExpandedRank] = useState<number | null>(null)

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['myNumberStats'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers/stats')
      if (!res.ok) throw new Error('stats fetch failed')
      return res.json()
    },
  })

  if (isLoading) return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="skeleton" style={{ height: 14, borderRadius: 2 }} />
      ))}
    </div>
  )

  if (isError || !stats || !stats.total) return null

  const totalWins = [1, 2, 3, 4, 5].reduce((s: number, r: number) => s + (stats.rankSummary[r]?.length ?? 0), 0)

  return (
    <div style={{ marginTop: 8 }}>
      {/* ── 번호 통계 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>📊 번호 통계</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: '총 세트', value: stats.total },
            { label: '추천', value: stats.autoCount, color: '#007bc3' },
            { label: '수동', value: stats.manualCount, color: '#e4a816' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '8px 4px',
              background: '#f7f7f7', borderRadius: 4,
            }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: color || '#333' }}>{value}</p>
              <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>자주 뽑힌 번호</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {stats.topNumbers.map(({ num, count }: { num: number; count: number }) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <LottoBall number={num} size="sm" />
              <span style={{ fontSize: 10, color: '#aaa' }}>{count}회</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 역대 당첨 이력 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>
          🏆 역대 당첨 이력
          {totalWins > 0 && (
            <span style={{ fontSize: 11, fontWeight: 500, color: '#888', marginLeft: 8 }}>총 {totalWins}회</span>
          )}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[1, 2, 3, 4, 5].map(rank => {
            const entries: any[] = stats.rankSummary[rank] ?? []
            const count = entries.length
            const isExpanded = expandedRank === rank
            return (
              <div key={rank}>
                <button
                  onClick={() => count > 0 ? setExpandedRank(isExpanded ? null : rank) : undefined}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: count > 0 ? '#f7f7f7' : 'transparent',
                    border: count > 0 ? '1px solid #ebebeb' : '1px solid transparent',
                    borderRadius: 4, cursor: count > 0 ? 'pointer' : 'default',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    minWidth: 32, height: 24, fontSize: 11, fontWeight: 700, color: '#fff',
                    background: RANK_COLORS[rank - 1], borderRadius: 3,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{RANK_LABELS[rank - 1]}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: count > 0 ? 700 : 400, color: count > 0 ? '#333' : '#ccc' }}>
                    {count > 0 ? `${count}회` : '0회'}
                  </span>
                  {count > 0 && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                </button>
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, paddingLeft: 4 }}>
                    {entries.map((entry: any) => {
                      const myMatched = entry.numbers.filter((n: number) => entry.drawNumbers.includes(n))
                      const bonusMatched = entry.numbers.includes(entry.bonus)
                      return (
                        <div key={entry.id} style={{
                          padding: '10px 12px',
                          background: '#f7fbff', border: '1px solid #c5dcf0', borderRadius: 4,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>제{entry.drawRound}회</span>
                            <span style={{ fontSize: 11, color: '#888' }}>{entry.drawDate.slice(0, 10).replace(/-/g, '.')}</span>
                            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, color: entry.isManual ? '#e4a816' : '#007bc3' }}>
                              {entry.isManual ? '수동' : '추천'}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                            내 번호 ({myMatched.length}개{rank === 2 && bonusMatched ? ' + 보너스' : ''} 일치)
                          </p>
                          <LottoBallSet numbers={entry.numbers} matchedNumbers={myMatched} size="sm" />
                          <p style={{ fontSize: 11, color: '#888', marginTop: 8, marginBottom: 4 }}>당첨번호</p>
                          <LottoBallSet numbers={entry.drawNumbers} bonus={entry.bonus} matchedNumbers={myMatched} size="sm" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 스캔 이력 ──────────────────────────────────────────────
function ScanHistory() {
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['scanHistory'],
    queryFn: async () => {
      const res = await fetch('/api/qr/scan')
      return res.json()
    },
  })

  if (isLoading) return <LoadingRows />
  if (!data?.length) return (
    <EmptyState message="스캔 이력이 없어요" sub="QR 당첨 확인 탭에서 복권을 스캔해보세요" />
  )

  // 사용 가능한 년도/월 추출
  const years: number[] = Array.from(
    new Set(data.map((d: any) => new Date(d.scannedAt).getFullYear()))
  ).sort((a: any, b: any) => b - a) as number[]

  const months: number[] = filterYear
    ? Array.from(
        new Set(
          data
            .filter((d: any) => new Date(d.scannedAt).getFullYear() === filterYear)
            .map((d: any) => new Date(d.scannedAt).getMonth() + 1)
        )
      ).sort((a: any, b: any) => a - b) as number[]
    : []

  // 필터 적용
  const filtered = data.filter((scan: any) => {
    const d = new Date(scan.scannedAt)
    if (filterYear && d.getFullYear() !== filterYear) return false
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false
    return true
  })

  const totalPrize = filtered.reduce((s: number, d: any) => s + Number(d.totalPrize), 0)
  const winCount = filtered.filter((d: any) => Number(d.totalPrize) > 0).length

  return (
    <div>
      <FilterBar
        years={years} months={months}
        selectedYear={filterYear} selectedMonth={filterMonth}
        onYearChange={setFilterYear} onMonthChange={setFilterMonth}
        resultCount={filtered.length}
      />

      {/* 통계 (필터 기준) */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        background: '#fff', borderBottom: '1px solid #dcdcdc',
      }}>
        {[
          { label: '총 스캔', value: `${filtered.length}장` },
          { label: '당첨 횟수', value: `${winCount}회` },
          { label: '총 당첨금', value: totalPrize > 0 ? `₩${totalPrize.toLocaleString()}` : '-' },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: '14px 8px', textAlign: 'center',
            borderRight: i < 2 ? '1px solid #f0f0f0' : undefined,
          }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#007bc3', marginBottom: 3 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#888' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="해당 조건의 스캔 이력이 없어요" />
      ) : (
        filtered.map((scan: any) => (
          <div key={scan.id} style={{
            background: '#fff', borderBottom: '1px solid #f0f0f0',
            padding: '12px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 3 }}>
                {scan.round}회차
              </p>
              <p style={{ fontSize: 12, color: '#888' }}>
                {new Date(scan.scannedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            {Number(scan.totalPrize) > 0 ? (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#dc1f1f' }}>
                ₩{Number(scan.totalPrize).toLocaleString()}
              </span>
            ) : (
              <span style={{
                fontSize: 11, color: '#888',
                background: '#f5f5f5', border: '1px solid #dcdcdc',
                padding: '2px 8px', borderRadius: 2,
              }}>낙첨</span>
            )}
          </div>
        ))
      )}
      <div style={{ padding: '0 16px', marginTop: 8 }}><AdSlot /></div>
    </div>
  )
}

function LoadingRows() {
  return (
    <div>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ padding: '14px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
          <div className="skeleton" style={{ width: '40%', height: 12, borderRadius: 3, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[...Array(6)].map((_, j) => (
              <div key={j} className="skeleton" style={{ width: 30, height: 30, borderRadius: '50%' }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div style={{
      padding: '48px 20px', textAlign: 'center',
      background: '#fff', borderTop: '1px solid #f0f0f0',
    }}>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>{message}</p>
      {sub && <p style={{ fontSize: 12, color: '#888' }}>{sub}</p>}
    </div>
  )
}
