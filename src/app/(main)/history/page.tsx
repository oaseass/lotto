'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { resolveNumberDrawRound } from '@/lib/lotto/dhlottery'
import { LottoBall, LottoBallSet } from '@/components/lotto/LottoBall'
import { AdSlot } from '@/components/ui/AdSlot'

type Tab = 'numbers' | 'scans'
interface SavedHistoryNumber {
  id: string
  numbers: number[]
  drawRound: number | null
  generatedDate?: string
  createdAt: string
  isManual: boolean
}

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
type QuickPeriod = null | '1m' | '3m' | '6m' | 'this_year'

function FilterBar({
  years, months, selectedYear, selectedMonth,
  onYearChange, onMonthChange,
  quickPeriod, onQuickPeriod,
  typeOptions, selectedType, onTypeChange,
  resultOptions, selectedResult, onResultChange,
  resultCount,
}: {
  years: number[]
  months: number[]
  selectedYear: number | null
  selectedMonth: number | null
  onYearChange: (y: number | null) => void
  onMonthChange: (m: number | null) => void
  quickPeriod: QuickPeriod
  onQuickPeriod: (p: QuickPeriod) => void
  typeOptions?: { label: string; value: string }[]
  selectedType?: string
  onTypeChange?: (t: string) => void
  resultOptions?: { label: string; value: string }[]
  selectedResult?: string
  onResultChange?: (v: string) => void
  resultCount: number
}) {
  const QUICK = [
    { label: '이번달', value: '1m' as QuickPeriod },
    { label: '최근3달', value: '3m' as QuickPeriod },
    { label: '최근6달', value: '6m' as QuickPeriod },
    { label: '올해', value: 'this_year' as QuickPeriod },
  ]

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 16px' }}>
      {/* 빠른 기간 */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
        <Chip label="전체" active={quickPeriod === null && selectedYear === null}
          onClick={() => { onQuickPeriod(null); onYearChange(null); onMonthChange(null) }} />
        {QUICK.map(q => (
          <Chip key={q.value!} label={q.label} active={quickPeriod === q.value}
            onClick={() => { onQuickPeriod(q.value); onYearChange(null); onMonthChange(null) }} />
        ))}
      </div>

      {/* 년도 (빠른기간 미선택 시) */}
      {quickPeriod === null && years.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginTop: 6, scrollbarWidth: 'none' }}>
          {years.map(y => (
            <Chip key={y} label={`${y}년`} active={selectedYear === y}
              onClick={() => { onYearChange(selectedYear === y ? null : y); onMonthChange(null) }} />
          ))}
        </div>
      )}

      {/* 월 (년도 선택 시) */}
      {quickPeriod === null && selectedYear !== null && months.length > 0 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginTop: 6, scrollbarWidth: 'none' }}>
          <Chip label="전체월" active={selectedMonth === null} onClick={() => onMonthChange(null)} />
          {months.map(m => (
            <Chip key={m} label={`${m}월`} active={selectedMonth === m}
              onClick={() => onMonthChange(selectedMonth === m ? null : m)} />
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

      {/* 당첨여부 필터 */}
      {resultOptions && onResultChange && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {resultOptions.map(opt => (
            <Chip key={opt.value} label={opt.label} active={selectedResult === opt.value}
              onClick={() => onResultChange(opt.value)} />
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

function actionButtonStyle(active: boolean, disabled: boolean, danger = false): React.CSSProperties {
  return {
    height: 32,
    padding: '0 12px',
    borderRadius: 999,
    border: danger
      ? `1px solid ${disabled ? '#f2d8d8' : '#f0b7b7'}`
      : `1px solid ${active ? '#129f97' : '#d7dde4'}`,
    background: danger
      ? (disabled ? '#fff7f7' : '#fff2f2')
      : (active ? '#e8faf6' : '#fff'),
    color: danger ? (disabled ? '#d7a8a8' : '#c24141') : (active ? '#129f97' : '#55606d'),
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
  }
}

// ── 저장 번호 ──────────────────────────────────────────────
const PAGE_SIZE = 10

function SavedNumbers() {
  const queryClient = useQueryClient()
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>(null)
  const [page, setPage] = useState(1)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [filterYear, filterMonth, filterType, quickPeriod])

  const { data, isLoading } = useQuery<SavedHistoryNumber[]>({
    queryKey: ['savedNumbers'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  if (isLoading) return <LoadingRows />
  if (!data?.length) return (
    <EmptyState message="저장된 번호가 없어요" sub="번호 생성 탭에서 번호를 뽑아보세요" />
  )

  const now = new Date()
  const cutoff = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() - months); return d }
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

  const years: number[] = Array.from(
    new Set(data.map(item => new Date(item.createdAt).getFullYear()))
  ).sort((a, b) => b - a)

  const months: number[] = filterYear
    ? Array.from(
        new Set(
          data
            .filter(item => new Date(item.createdAt).getFullYear() === filterYear)
            .map(item => new Date(item.createdAt).getMonth() + 1)
        )
      ).sort((a, b) => a - b)
    : []

  const filtered = data.filter(item => {
    const createdAt = new Date(item.createdAt)
    if (quickPeriod === '1m' && createdAt < cutoff(1)) return false
    if (quickPeriod === '3m' && createdAt < cutoff(3)) return false
    if (quickPeriod === '6m' && createdAt < cutoff(6)) return false
    if (quickPeriod === 'this_year' && createdAt < thisYearStart) return false
    if (!quickPeriod && filterYear && createdAt.getFullYear() !== filterYear) return false
    if (!quickPeriod && filterMonth && createdAt.getMonth() + 1 !== filterMonth) return false
    if (filterType === 'auto' && item.isManual) return false
    if (filterType === 'manual' && !item.isManual) return false
    return true
  })

  const filteredIds = filtered.map(item => item.id)
  const selectedIdSet = new Set(selectedIds)
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => selectedIdSet.has(item.id))
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const invalidateNumberQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['savedNumbers'] }),
      queryClient.invalidateQueries({ queryKey: ['myNumberStats'] }),
      queryClient.invalidateQueries({ queryKey: ['mypage-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['home-auto'] }),
      queryClient.invalidateQueries({ queryKey: ['home-manual'] }),
      queryClient.invalidateQueries({ queryKey: ['social-proof-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['social-proof-summary-page'] }),
      queryClient.invalidateQueries({ queryKey: ['social-proof-rounds'] }),
      queryClient.invalidateQueries({ queryKey: ['social-proof-stories'] }),
    ])
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]
    )
  }

  const handleToggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedIds([])
      return
    }

    setSelectedIds(filteredIds)
  }

  const handleDeleteNumbers = async (ids: string[], label: string) => {
    const uniqueIds = Array.from(new Set(ids))
    if (uniqueIds.length === 0 || isDeleting) return

    const confirmMessage = uniqueIds.length === 1
      ? `${label}를 삭제할까요?\n연결된 적중 집계도 함께 갱신됩니다.`
      : `${uniqueIds.length}개 번호를 삭제할까요?\n연결된 적중 집계도 함께 갱신됩니다.`

    if (!window.confirm(confirmMessage)) return

    setIsDeleting(true)
    setActionMessage(null)

    try {
      const response = await fetch('/api/lotto/my-numbers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: uniqueIds }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setActionMessage({
          type: 'error',
          text: payload?.error || '번호 삭제에 실패했어요',
        })
        return
      }

      const deletedIds = Array.isArray(payload?.deletedIds)
        ? payload.deletedIds.filter((value: unknown): value is string => typeof value === 'string')
        : uniqueIds
      const deletedIdSet = new Set(deletedIds)

      setSelectedIds(current => current.filter(id => !deletedIdSet.has(id)))
      setPage(1)
      await invalidateNumberQueries()
      setActionMessage({
        type: 'success',
        text: `${payload?.deleted ?? deletedIds.length}개 번호를 삭제했어요`,
      })
    } catch {
      setActionMessage({
        type: 'error',
        text: '네트워크 오류로 번호 삭제에 실패했어요',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div>
      <FilterBar
        years={years} months={months}
        selectedYear={filterYear} selectedMonth={filterMonth}
        onYearChange={setFilterYear} onMonthChange={setFilterMonth}
        quickPeriod={quickPeriod} onQuickPeriod={setQuickPeriod}
        typeOptions={[
          { label: '전체', value: 'all' },
          { label: '추천', value: 'auto' },
          { label: '수동', value: 'manual' },
        ]}
        selectedType={filterType}
        onTypeChange={setFilterType}
        resultCount={filtered.length}
      />

      <div style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '10px 16px' }}>
        {actionMessage && (
          <div style={{
            marginBottom: 10,
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 700,
            background: actionMessage.type === 'success' ? '#eefaf4' : '#fff5f5',
            color: actionMessage.type === 'success' ? '#18794e' : '#c24141',
            border: `1px solid ${actionMessage.type === 'success' ? '#cae9d8' : '#ffd2d2'}`,
          }}>
            {actionMessage.text}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setIsEditMode(current => !current)
                setSelectedIds([])
              }}
              disabled={isDeleting}
              style={actionButtonStyle(isEditMode, isDeleting)}
            >
              {isEditMode ? '선택 종료' : '선택 삭제'}
            </button>

            <button
              onClick={() => handleDeleteNumbers(filteredIds, filtered.length === data.length ? '현재 목록' : '현재 필터 목록')}
              disabled={filtered.length === 0 || isDeleting}
              style={actionButtonStyle(false, filtered.length === 0 || isDeleting, true)}
            >
              {filtered.length === data.length ? '전체 삭제' : '현재 필터 전체 삭제'}
            </button>

            {isEditMode && (
              <button
                onClick={handleToggleSelectAllFiltered}
                disabled={filtered.length === 0 || isDeleting}
                style={actionButtonStyle(allFilteredSelected, filtered.length === 0 || isDeleting)}
              >
                {allFilteredSelected ? '전체 해제' : '현재 필터 전체 선택'}
              </button>
            )}
          </div>

          {isEditMode && (
            <button
              onClick={() => handleDeleteNumbers(selectedIds, '선택한 번호')}
              disabled={selectedIds.length === 0 || isDeleting}
              style={actionButtonStyle(false, selectedIds.length === 0 || isDeleting, true)}
            >
              선택 {selectedIds.length}개 삭제
            </button>
          )}
        </div>

        {isEditMode && (
          <p style={{ fontSize: 11, color: '#888', marginTop: 8 }}>
            필터한 목록에서 체크한 번호만 한 번에 삭제할 수 있어요.
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="해당 조건의 번호가 없어요" />
      ) : (
        <>
          {paged.map(item => {
            const displayRound = resolveNumberDrawRound(item.drawRound, item.generatedDate ?? item.createdAt)
            return (
              <div key={item.id} style={{
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {isEditMode && (
                    <button
                      onClick={() => handleToggleSelect(item.id)}
                      style={{
                        width: 22,
                        height: 22,
                        marginTop: 2,
                        borderRadius: 6,
                        border: `1px solid ${selectedIdSet.has(item.id) ? '#129f97' : '#d7dde4'}`,
                        background: selectedIdSet.has(item.id) ? '#129f97' : '#fff',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      {selectedIdSet.has(item.id) ? '✓' : ''}
                    </button>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        제{displayRound}회차
                        {' · '}
                        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: item.isManual ? '#e4a816' : '#007bc3',
                        }}>
                          {item.isManual ? '수동' : '추천'}
                        </span>
                        <button
                          onClick={() => handleDeleteNumbers([item.id], '이 번호')}
                          disabled={isDeleting}
                          style={{
                            height: 28,
                            padding: '0 10px',
                            borderRadius: 999,
                            border: '1px solid #f1c9c9',
                            background: '#fff5f5',
                            color: '#c24141',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: isDeleting ? 'wait' : 'pointer',
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                    <LottoBallSet numbers={item.numbers} size="sm" />
                  </div>
                </div>
              </div>
            )
          })}

          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
              padding: '12px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0',
            }}>
              <button
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page === 1}
                style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: page === 1 ? '#f5f5f5' : '#129f97',
                  color: page === 1 ? '#ccc' : '#fff',
                  border: 'none', cursor: page === 1 ? 'default' : 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >‹</button>
              <span style={{ fontSize: 13, color: '#555' }}>
                <span style={{ fontWeight: 700, color: '#333' }}>{page}</span>
                {' / '}{totalPages}
                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 8 }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}
                </span>
              </span>
              <button
                onClick={() => setPage(current => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
                style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: page === totalPages ? '#f5f5f5' : '#129f97',
                  color: page === totalPages ? '#ccc' : '#fff',
                  border: 'none', cursor: page === totalPages ? 'default' : 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >›</button>
            </div>
          )}
        </>
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
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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

      {/* ── 근접 기록 ── */}
      {stats.matchStats && stats.matchStats.totalChecked > 0 && (
        <CloseMatchSection matchStats={stats.matchStats} />
      )}
    </div>
  )
}

// ── 근접 기록 대시보드 ─────────────────────────────────────
function CloseMatchSection({ matchStats }: { matchStats: any }) {
  const { totalChecked, pending, distribution, bestCount, avgCount, topNearMisses } = matchStats
  const maxInDist = Math.max(...(Object.values(distribution) as number[]))

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>
        🎯 근접 기록
        <span style={{ fontSize: 11, fontWeight: 500, color: '#888', marginLeft: 8 }}>
          추첨 완료 {totalChecked}세트{pending > 0 ? ` · 대기 중 ${pending}세트` : ''}
        </span>
      </p>

      {/* 요약 카드 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[
          { label: '최고 기록', value: `${bestCount}개 일치`, color: bestCount >= 4 ? '#dc1f1f' : bestCount >= 3 ? '#007bc3' : '#333' },
          { label: '평균 일치', value: `${avgCount}개`, color: '#333' },
          { label: '추첨 완료', value: `${totalChecked}세트`, color: '#129f97' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', background: '#f7f7f7', borderRadius: 4 }}>
            <p style={{ fontSize: 15, fontWeight: 900, color }}>{value}</p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* 일치 개수 분포 바 */}
      <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>일치 개수 분포</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
        {([6, 5, 4, 3, 2, 1, 0] as number[]).map(count => {
          const n = (distribution[count] || 0) as number
          const pct = maxInDist > 0 ? Math.max(n > 0 ? 4 : 0, (n / maxInDist) * 100) : 0
          const barColor = count >= 5 ? '#dc1f1f' : count === 4 ? '#e03f0e' : count === 3 ? '#e4a816' : count === 2 ? '#007bc3' : '#c8c8c8'
          return (
            <div key={count} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#888', width: 30, flexShrink: 0, textAlign: 'right' }}>{count}개</span>
              <div style={{ flex: 1, height: 16, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 11, color: '#555', width: 22, flexShrink: 0 }}>{n}</span>
            </div>
          )
        })}
      </div>

      {/* 상위 근접 기록 TOP 5 */}
      {(topNearMisses as any[]).length > 0 && (
        <>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>상위 근접 기록</p>
          {(topNearMisses as any[]).slice(0, 5).map((entry: any) => (
            <div key={entry.id} style={{
              padding: '10px 12px', marginBottom: 8,
              background: entry.matchCount >= 4 ? '#fff5f5' : entry.matchCount >= 3 ? '#f7fbff' : '#fafafa',
              border: `1px solid ${entry.matchCount >= 4 ? '#ffd5d5' : entry.matchCount >= 3 ? '#c5dcf0' : '#ebebeb'}`,
              borderRadius: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: 900,
                  color: entry.matchCount >= 5 ? '#dc1f1f' : entry.matchCount >= 4 ? '#e03f0e' : entry.matchCount >= 3 ? '#007bc3' : '#888',
                }}>
                  {entry.matchCount}개 일치
                </span>
                {entry.rank !== null && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: '#fff',
                    background: RANK_COLORS[entry.rank - 1],
                    padding: '1px 6px', borderRadius: 2,
                  }}>{entry.rank}등</span>
                )}
                <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>제{entry.drawRound}회</span>
              </div>
              <LottoBallSet numbers={entry.numbers} matchedNumbers={entry.matchedNumbers} size="sm" />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// ── 스캔 이력 ──────────────────────────────────────────────
function ScanDetailModal({ scan, onClose }: { scan: any; onClose: () => void }) {
  const { data: draw } = useQuery({
    queryKey: ['draw-detail', scan.round],
    queryFn: async () => {
      const res = await fetch(`/api/lotto/draws?round=${scan.round}`)
      if (!res.ok) return null
      return res.json()
    },
    staleTime: Infinity,
  })

  const winNums: number[] = draw
    ? [draw.num1, draw.num2, draw.num3, draw.num4, draw.num5, draw.num6]
    : []
  const bonus: number = draw?.bonusNum ?? 0

  const scannedSets: { set: number; numbers: number[] }[] = Array.isArray(scan.scannedNumbers)
    ? scan.scannedNumbers : []
  const results: { set: number; rank: number; prize: number }[] = Array.isArray(scan.result)
    ? scan.result : []

  const rankLabel: Record<number, string> = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' }
  const rankBg: Record<number, string> = {
    1: '#dc1f1f', 2: '#e4a816', 3: '#e4a816', 4: '#1994da', 5: '#888',
  }

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
        maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '14px 16px 12px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>
              🎰 {scan.round}회차 상세 결과
            </p>
            <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
              스캔일: {new Date(scan.scannedAt).toLocaleDateString('ko-KR')}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#f5f5f5', border: 'none',
            fontSize: 14, cursor: 'pointer', color: '#555',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '14px 16px' }}>
          {/* 당첨번호 */}
          <div style={{
            background: '#f9f9ff', borderRadius: 10,
            padding: '12px 14px', marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#555', marginBottom: 8 }}>
              🏆 {scan.round}회차 당첨번호
            </p>
            {draw ? (
              <LottoBallSet numbers={winNums} bonus={bonus} size="sm" />
            ) : (
              <p style={{ fontSize: 12, color: '#aaa' }}>불러오는 중...</p>
            )}
          </div>

          {/* 세트별 결과 */}
          {scannedSets.length === 0 ? (
            <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '20px 0' }}>
              번호 정보가 없습니다
            </p>
          ) : (
            scannedSets.map(({ set, numbers }) => {
              const res = results.find(r => r.set === set)
              const matchedNums = winNums.length > 0
                ? numbers.filter(n => winNums.includes(n))
                : []
              const isWin = res && res.rank >= 1 && res.rank <= 5

              return (
                <div key={set} style={{
                  background: '#fff',
                  border: `1.5px solid ${isWin ? '#ffd5d5' : '#f0f0f0'}`,
                  borderRadius: 10, padding: '11px 12px', marginBottom: 8,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 7,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>
                      {String.fromCharCode(64 + set)}세트
                    </span>
                    {res ? (
                      res.rank >= 1 && res.rank <= 5 ? (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: '#fff',
                          background: rankBg[res.rank],
                          padding: '2px 8px', borderRadius: 10,
                        }}>
                          {rankLabel[res.rank]} · ₩{Number(res.prize).toLocaleString()}
                        </span>
                      ) : (
                        <span style={{
                          fontSize: 11, color: '#aaa',
                          background: '#f5f5f5', border: '1px solid #e0e0e0',
                          padding: '2px 8px', borderRadius: 10,
                        }}>낙첨</span>
                      )
                    ) : null}
                  </div>
                  <LottoBallSet numbers={numbers} matchedNumbers={matchedNums} size="sm" />
                </div>
              )
            })
          )}

          {/* 합계 */}
          {Number(scan.totalPrize) > 0 && (
            <div style={{
              background: '#fff5f5', border: '1px solid #ffd5d5',
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>총 당첨금</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#dc1f1f' }}>
                ₩{Number(scan.totalPrize).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScanHistory() {
  const [filterYear, setFilterYear] = useState<number | null>(null)
  const [filterMonth, setFilterMonth] = useState<number | null>(null)
  const [quickPeriod, setQuickPeriod] = useState<QuickPeriod>(null)
  const [filterResult, setFilterResult] = useState<string>('all')
  const [selectedScan, setSelectedScan] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['scanHistory'],
    queryFn: async () => {
      const res = await fetch('/api/qr/scan')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  if (isLoading) return <LoadingRows />
  if (!data?.length) return (
    <EmptyState message="스캔 이력이 없어요" sub="로그인 상태에서 스캔한 복권만 저장돼요. 로그인 없이 확인한 티켓은 이력에 남지 않습니다." />
  )

  const now = new Date()
  const cutoff = (months: number) => { const d = new Date(now); d.setMonth(d.getMonth() - months); return d }
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

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
    // 빠른 기간
    if (quickPeriod === '1m' && d < cutoff(1)) return false
    if (quickPeriod === '3m' && d < cutoff(3)) return false
    if (quickPeriod === '6m' && d < cutoff(6)) return false
    if (quickPeriod === 'this_year' && d < thisYearStart) return false
    // 년/월
    if (!quickPeriod && filterYear && d.getFullYear() !== filterYear) return false
    if (!quickPeriod && filterMonth && d.getMonth() + 1 !== filterMonth) return false
    // 당첨여부
    if (filterResult === 'win' && Number(scan.totalPrize) === 0) return false
    if (filterResult === 'lose' && Number(scan.totalPrize) > 0) return false
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
        quickPeriod={quickPeriod} onQuickPeriod={setQuickPeriod}
        resultOptions={[
          { label: '전체', value: 'all' },
          { label: '당첨', value: 'win' },
          { label: '낙첨', value: 'lose' },
        ]}
        selectedResult={filterResult}
        onResultChange={setFilterResult}
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
          <div key={scan.id}
            onClick={() => setSelectedScan(scan)}
            style={{
              background: '#fff', borderBottom: '1px solid #f0f0f0',
              padding: '12px 16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 3 }}>
                {scan.round}회차
              </p>
              <p style={{ fontSize: 12, color: '#888' }}>
                {new Date(scan.scannedAt).toLocaleDateString('ko-KR')}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
              <span style={{ fontSize: 12, color: '#ccc' }}>›</span>
            </div>
          </div>
        ))
      )}
      <div style={{ padding: '0 16px', marginTop: 8 }}><AdSlot /></div>
      {selectedScan && (
        <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} />
      )}
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
