'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { estimateCurrentRound } from '@/lib/lotto/dhlottery'
import { LottoBallSet } from '@/components/lotto/LottoBall'
import { useRouter } from 'next/navigation'
import ManualLottoSheet from '@/components/lotto/ManualLottoSheet'
import ReadingSheet from '@/components/saju/ReadingSheet'
import type { IljuData } from '@/lib/saju/ilju-data'
import type { DaeunResult } from '@/lib/saju/daeun'
import { AdSlot } from '@/components/ui/AdSlot'

interface DrawInfo {
  round: number
  numbers: number[]
  bonus: number
  drawDate: string
  winners1st?: number | null
  prize1st?: string | null   // BigInt serialized as string
  winners2nd?: number | null
  prize2nd?: string | null
}

interface SavedNumber {
  id: string
  numbers: number[]
  drawRound: number | null
  createdAt: string
  rank?: number | null
  reason?: string | null
}

interface SajuProfile {
  ilju: string | null
  yongsin: string | null
  ohaeng: Record<string, number> | null
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null
}

// ── 오행 상수 ──────────────────────────────────
const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}
const OHAENG_HANJA: Record<string, string> = {
  목: '木', 화: '火', 토: '土', 금: '金', 수: '水',
}
const OHAENG_LUCKY: Record<string, string> = {
  목: '3·8', 화: '2·7', 토: '5·10', 금: '4·9', 수: '1·6',
}
const ILJU_DESC: Record<string, string> = {
  갑: '추진력·리더십', 을: '유연함·섬세함', 병: '밝음·열정', 정: '지혜·예술',
  무: '안정·신뢰', 기: '포용·성실', 경: '결단력·의리', 신: '총명·예리함',
  임: '포부·유연', 계: '통찰·감수성',
}
const OHAENG_SANGSAENG: Record<string, string> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
}
const CHEONGAN_DESC: Record<string, string> = {
  '甲': '양목', '乙': '음목', '丙': '양화', '丁': '음화', '戊': '양토',
  '己': '음토', '庚': '양금', '辛': '음금', '壬': '양수', '癸': '음수',
}
const JIJI_DESC: Record<string, string> = {
  '子': '수·쥐', '丑': '토·소', '寅': '목·호랑이', '卯': '목·토끼',
  '辰': '토·용', '巳': '화·뱀', '午': '화·말', '未': '토·양',
  '申': '금·원숭이', '酉': '금·닭', '戌': '토·개', '亥': '수·돼지',
}

// 끝자리로 오행 판별
function getNumOhaeng(n: number): string {
  const last = n % 10
  const m: Record<number, string> = { 1: '수', 6: '수', 2: '화', 7: '화', 3: '목', 8: '목', 4: '금', 9: '금', 5: '토', 0: '토' }
  return m[last] || ''
}

// 번호별 오행 역할 반환
function getNumRole(n: number, yongsin: string): { ohaeng: string; role: string; color: string } {
  const ohaeng = getNumOhaeng(n)
  const weakArr = yongsin.split(',').filter(Boolean)
  const primary = weakArr[0] || ''
  const sangsaeng = OHAENG_SANGSAENG[primary] || ''
  const color = OHAENG_COLOR[ohaeng] || '#888'
  let role = `${ohaeng}(${OHAENG_HANJA[ohaeng]}) 기운`
  if (weakArr.includes(ohaeng)) role = `부족 기운 ${ohaeng}(${OHAENG_HANJA[ohaeng]})`
  else if (ohaeng === sangsaeng) role = `상생 ${ohaeng}(${OHAENG_HANJA[ohaeng]})`
  return { ohaeng, role, color }
}

function getSajuComment(yongsin: string): string {
  const comments: Record<string, string> = {
    목: `목(木) 기운이 행운을 돕습니다. ${OHAENG_LUCKY['목']} 끝 번호에 집중하세요.`,
    화: `화(火) 기운이 행운을 돕습니다. ${OHAENG_LUCKY['화']} 끝 번호에 집중하세요.`,
    토: `토(土) 기운이 행운을 돕습니다. ${OHAENG_LUCKY['토']} 끝 번호에 집중하세요.`,
    금: `금(金) 기운이 행운을 돕습니다. ${OHAENG_LUCKY['금']} 끝 번호에 집중하세요.`,
    수: `수(水) 기운이 행운을 돕습니다. ${OHAENG_LUCKY['수']} 끝 번호에 집중하세요.`,
  }
  return comments[yongsin] || '사주 기반 번호를 생성해보세요.'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}.${dd} ${hh}:${min}`
}

function formatPrize(prizeStr: string): string {
  const n = parseInt(prizeStr)
  if (isNaN(n)) return prizeStr
  if (n >= 100000000) {
    const uk = Math.floor(n / 100000000)
    const rest = Math.floor((n % 100000000) / 10000000)
    return rest > 0 ? `${uk}억 ${rest}천만원` : `${uk}억원`
  }
  if (n >= 10000000) return `${Math.floor(n / 10000000)}천만원`
  return n.toLocaleString() + '원'
}

// ── 슬롯머신 애니메이션 모달 ──────────────────────────────────
function GenerateModal({
  visible,
  animNums,
  finalNums,
  settled,
  yongsin,
  onClose,
}: {
  visible: boolean
  animNums: number[]
  finalNums: number[] | null
  settled: boolean[]
  yongsin: string | null
  onClose: () => void
}) {
  if (!visible) return null

  const displayNums = finalNums
    ? finalNums.map((n, i) => (settled[i] ? n : animNums[i] ?? 0))
    : animNums

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#fff', borderRadius: 8,
        padding: '28px 24px 24px',
        width: 320, textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* 타이틀 */}
        <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>
          {finalNums && settled.every(Boolean) ? '✨ 번호 추출 완료!' : '🎴 사주 기운으로 번호 추출 중...'}
        </p>
        {yongsin && (
          <p style={{ fontSize: 12, color: OHAENG_COLOR[yongsin.split(',')[0]] || '#888', marginBottom: 20, fontWeight: 600 }}>
            부족 기운: {yongsin.split(',').map(w => `${w}(${OHAENG_HANJA[w]})`).join(' · ')} · {OHAENG_LUCKY[yongsin.split(',')[0]]} 끝 번호 중심
          </p>
        )}

        {/* 볼 6개 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 22 }}>
          {displayNums.map((n, i) => {
            const isSettled = !!finalNums && settled[i]
            const ohaeng = isSettled ? getNumOhaeng(n) : ''
            const bg = isSettled
              ? (OHAENG_COLOR[ohaeng] || '#007bc3')
              : '#dce8f5'
            return (
              <div
                key={i}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: isSettled ? 15 : 13,
                  fontWeight: 900,
                  color: isSettled ? '#fff' : '#555',
                  transition: isSettled ? 'background 0.3s, transform 0.2s' : 'none',
                  transform: isSettled ? 'scale(1.12)' : 'scale(1)',
                  boxShadow: isSettled ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
                }}
              >
                {n > 0 ? n : '?'}
              </div>
            )
          })}
        </div>

        {/* 완료 후 버튼 */}
        {finalNums && settled.every(Boolean) && (
          <button
            onClick={onClose}
            style={{
              width: '100%', height: 40,
              background: '#007bc3', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', borderRadius: 4,
            }}
          >
            확인
          </button>
        )}

        {/* 스피닝 인디케이터 */}
        {!finalNums && (
          <p style={{ fontSize: 11, color: '#aaa' }}>잠시만 기다려주세요...</p>
        )}
      </div>
    </div>
  )
}

// ── 사주 카드 ──────────────────────────────────
function SajuCard({ profile, onSetup, onEdit }: {
  profile: SajuProfile | null
  onSetup: () => void
  onEdit: () => void
}) {
  const [showIljuDetail, setShowIljuDetail] = useState(false)
  const [iljuData, setIljuData] = useState<IljuData | null>(null)
  const [loadingIlju, setLoadingIlju] = useState(false)

  const fetchIljuData = useCallback(async (ilju: string) => {
    setLoadingIlju(true)
    try {
      const res = await fetch(`/api/saju/ilju?key=${encodeURIComponent(ilju)}`)
      if (res.ok) setIljuData(await res.json())
    } finally {
      setLoadingIlju(false)
    }
  }, [])

  useEffect(() => {
    if (profile?.ilju) fetchIljuData(profile.ilju)
  }, [profile?.ilju, fetchIljuData])

  const { data: daeunData } = useQuery<DaeunResult | null>({
    queryKey: ['daeun-home'],
    queryFn: async () => {
      const res = await fetch('/api/saju/daeun')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!profile?.ilju,
  })

  const currentDaeun = daeunData?.entries.find(e => e.isCurrentDaeun)

  if (!profile?.ilju) {
    return (
      <div style={{
        background: '#fff', borderBottom: '1px solid #dcdcdc',
        padding: '16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: '#f0f7ff', border: '2px solid #007bc3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>☯</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>내 사주 정보를 입력해주세요</p>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>생년월일·시간을 입력하면<br/>사주 기반 번호를 추천해드립니다</p>
        </div>
        <button onClick={onSetup} style={{
          height: 34, padding: '0 14px',
          background: '#007bc3', border: '1px solid #005a94',
          color: '#fff', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', borderRadius: 2, flexShrink: 0,
        }}>입력하기</button>
      </div>
    )
  }

  const { ilju, yongsin, ohaeng } = profile
  const weakArr = yongsin ? yongsin.split(',').filter(Boolean) : []
  const primaryYongsin = weakArr[0] || ''
  const iljuChar = ilju?.[0] || ''
  const ohaengEntries = ohaeng ? Object.entries(ohaeng).sort((a, b) => b[1] - a[1]) : []
  const totalOhaeng = ohaengEntries.reduce((s, [, v]) => s + v, 0)

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>내 사주 분석</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#888' }}>
            {profile.birthYear}.{String(profile.birthMonth).padStart(2, '0')}.{String(profile.birthDay).padStart(2, '0')}
            {profile.birthHour != null ? ` ${profile.birthHour}시` : ''}
          </span>
          <button onClick={onEdit} style={{
            fontSize: 11, color: '#007bc3', background: 'none',
            border: '1px solid #007bc3', borderRadius: 2, padding: '2px 8px',
            cursor: 'pointer', lineHeight: 1.5,
          }}>수정</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: 4,
            background: primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3', flexShrink: 0,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{ilju}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{ilju}일주</span>
              <span style={{ fontSize: 11, color: '#888' }}>{ILJU_DESC[iljuChar] || ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>부족 기운</span>
              {weakArr.map(w => (
                <span key={w} style={{
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  background: OHAENG_COLOR[w] || '#888',
                  padding: '1px 8px', borderRadius: 2,
                }}>
                  {w}({OHAENG_HANJA[w]})
                </span>
              ))}
              <span style={{ fontSize: 11, color: '#888' }}>행운수: {primaryYongsin ? OHAENG_LUCKY[primaryYongsin] : '-'}</span>
            </div>
          </div>
        </div>

        {ohaengEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {ohaengEntries.map(([el, val]) => (
              <div key={el} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  height: 4, borderRadius: 2,
                  background: OHAENG_COLOR[el] || '#ddd',
                  opacity: 0.3 + (val / totalOhaeng) * 0.7, marginBottom: 3,
                }} />
                <p style={{ fontSize: 10, color: OHAENG_COLOR[el] || '#888', fontWeight: 700 }}>
                  {el}({OHAENG_HANJA[el]})
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>{val}</p>
              </div>
            ))}
          </div>
        )}

        {weakArr.length > 0 && (
          <div style={{
            background: '#f7fbff', borderLeft: '3px solid #007bc3',
            borderRadius: '0 2px 2px 0', padding: '8px 10px', marginBottom: 10,
          }}>
            <p style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
              💡 {getSajuComment(primaryYongsin)}
            </p>
          </div>
        )}

        {/* 현재 대운 한 줄 표시 */}
        {currentDaeun && (
          <div style={{
            background: '#f0f7ff',
            border: '1px solid #dce8f5',
            borderRadius: 4,
            padding: '7px 10px',
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span style={{ fontSize: 11, color: '#555' }}>현재 대운</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#007bc3' }}>
              {currentDaeun.ganji}({currentDaeun.hanja})
            </span>
            <span style={{ fontSize: 11, color: '#888' }}>· {currentDaeun.startAge}세 시작</span>
          </div>
        )}

        {/* 일주 특성 보기 토글 버튼 */}
        <button
          onClick={() => setShowIljuDetail(v => !v)}
          style={{
            width: '100%', height: 34,
            background: showIljuDetail ? '#f0f7ff' : '#fff',
            border: `1px solid ${showIljuDetail ? '#007bc3' : '#dcdcdc'}`,
            color: showIljuDetail ? '#007bc3' : '#555',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}
        >
          {iljuData ? `${iljuData.hanja}일주 특성 보기` : '일주 특성 보기'}
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: showIljuDetail ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {/* 일주 특성 상세 패널 */}
        {showIljuDetail && (
          <div style={{
            marginTop: 10,
            border: '1px solid #dce8f5',
            borderRadius: 4,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}>
            {/* 헤더 */}
            <div style={{
              background: primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3',
              padding: '10px 14px',
            }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                {iljuData ? iljuData.hanja : ilju}일주 특성
              </p>
              {iljuData && (
                <>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                    {iljuData.summary}
                  </p>
                  {iljuData.hanja.length >= 2 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
                      {iljuData.hanja[0]}({CHEONGAN_DESC[iljuData.hanja[0]] ?? ''}) · {iljuData.hanja[1]}({JIJI_DESC[iljuData.hanja[1]] ?? ''})
                    </p>
                  )}
                </>
              )}
            </div>

            {loadingIlju ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="skeleton" style={{ height: 14, borderRadius: 2 }} />
                ))}
              </div>
            ) : iljuData ? (
              <div style={{ padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '📖', label: '성격', value: iljuData.personality },
                  { icon: '💼', label: '직업 적성', value: iljuData.career },
                  { icon: '🤝', label: '인간관계', value: iljuData.relationship },
                  { icon: '💰', label: '재물운', value: iljuData.fortune },
                  { icon: '⚠️', label: '주의사항', value: iljuData.caution },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 2 }}>{label}</p>
                      <p style={{ fontSize: 12, color: '#444', lineHeight: 1.65 }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ padding: '14px', fontSize: 12, color: '#888', textAlign: 'center' }}>
                일주 데이터를 불러올 수 없습니다
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 번호 행 (클릭 시 사주 근거 + 당첨이력 펼치기) ──────────────────────────────────
interface HistoryStats { 1: number; 2: number; 3: number; 4: number; 5: number; checked: number }

function NumberRow({
  item,
  isLast,
  yongsin,
  rankLabel,
}: {
  item: SavedNumber
  isLast: boolean
  yongsin: string | null
  rankLabel: Record<number, { text: string; bg: string }>
}) {
  const [expanded, setExpanded] = useState(false)
  const [history, setHistory] = useState<HistoryStats | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const numRoles = yongsin ? item.numbers.map(n => getNumRole(n, yongsin)) : null

  const loadHistory = async () => {
    if (history || loadingHistory) return
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/lotto/check-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: item.numbers }),
      })
      setHistory(await res.json())
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #f0f0f0' }}>
      {/* 기본 행 */}
      <div
        onClick={() => {
          setExpanded(e => !e)
          if (!expanded) loadHistory()
        }}
        style={{
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer',
          background: expanded ? '#f7fbff' : '#fff',
          transition: 'background 0.15s',
        }}
      >
        {/* 회차 */}
        <div style={{ width: 44, flexShrink: 0 }}>
          <p style={{ fontSize: 10, color: '#888', marginBottom: 1 }}>회차</p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{item.drawRound ?? '-'}</p>
        </div>
        {/* 번호 볼 */}
        <div style={{ flex: 1 }}>
          <LottoBallSet numbers={item.numbers} size="sm" />
        </div>
        {/* 생성일시 + 결과 */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <p style={{ fontSize: 10, color: '#bbb', marginBottom: 3 }}>{formatDate(item.createdAt)}</p>
          {item.rank ? (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#fff',
              background: rankLabel[item.rank]?.bg || '#888',
              padding: '2px 7px', borderRadius: 2,
            }}>
              {rankLabel[item.rank]?.text}
            </span>
          ) : (
            <span style={{
              fontSize: 10, color: '#888',
              background: '#f5f5f5', border: '1px solid #e0e0e0',
              padding: '2px 6px', borderRadius: 2,
            }}>-</span>
          )}
        </div>
        {/* 펼치기 화살표 */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#bbb" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </div>

      {/* 펼쳐진 사주 근거 */}
      {expanded && (
        <div style={{
          background: '#f7fbff',
          borderTop: '1px solid #e0eef8',
          padding: '12px 16px 14px',
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* 번호별 오행 색상 분류 */}
          {numRoles && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 8 }}>
                🎴 번호별 사주 오행 구성
              </p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {item.numbers.map((n, i) => {
                  const { color, role } = numRoles[i]
                  return (
                    <div key={n} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, color: '#fff',
                        marginBottom: 3,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                      }}>
                        {n}
                      </div>
                      <p style={{ fontSize: 9, color: color, fontWeight: 700, lineHeight: 1.3 }}>
                        {role.split(' ')[0]}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* 범례 */}
              {yongsin && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {yongsin.split(',').filter(Boolean).map((w, idx) => (
                    <span key={w} style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 10,
                      background: OHAENG_COLOR[w], color: '#fff', fontWeight: idx === 0 ? 700 : 600,
                    }}>
                      ● {idx === 0 ? '핵심' : '보조'} 부족 기운 {w}({OHAENG_HANJA[w]}) — {OHAENG_LUCKY[w]} 끝
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {/* reason 텍스트 */}
          {item.reason && (
            <div style={{
              background: '#fff',
              border: '1px solid #dce8f5',
              borderRadius: 4, padding: '10px 12px',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 4 }}>📖 사주 분석 근거</p>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.75 }}>{item.reason}</p>
            </div>
          )}

          {/* 과거 당첨 이력 */}
          <div style={{ marginTop: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#333', marginBottom: 6 }}>🏆 과거 당첨 이력</p>
            {loadingHistory ? (
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="skeleton" style={{ flex: 1, height: 44, borderRadius: 4 }} />
                ))}
              </div>
            ) : history ? (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([1,2,3,4,5] as const).map(rank => {
                    const count = history[rank]
                    const colors = ['#dc1f1f','#e03f0e','#e4a816','#007bc3','#129f97']
                    return (
                      <div key={rank} style={{
                        flex: 1, textAlign: 'center', padding: '6px 4px',
                        background: count > 0 ? '#fff' : '#f5f5f5',
                        border: `1px solid ${count > 0 ? colors[rank-1] : '#e0e0e0'}`,
                        borderRadius: 4,
                      }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: count > 0 ? colors[rank-1] : '#ccc' }}>{count}</p>
                        <p style={{ fontSize: 10, color: '#888' }}>{rank}등</p>
                      </div>
                    )
                  })}
                </div>
                <p style={{ fontSize: 10, color: '#bbb', marginTop: 5, textAlign: 'right' }}>
                  최근 {history.checked}회차 기준
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 홈 페이지 ──────────────────────────────────
export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const round = estimateCurrentRound()
  const [draw, setDraw] = useState<DrawInfo | null>(null)
  const [loadingDraw, setLoadingDraw] = useState(true)
  const [genError, setGenError] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [showManualSheet, setShowManualSheet] = useState(false)
  const [showReadingSheet, setShowReadingSheet] = useState(false)

  // 슬롯머신 애니메이션 상태
  const [modalVisible, setModalVisible] = useState(false)
  const [animNums, setAnimNums] = useState<number[]>([0, 0, 0, 0, 0, 0])
  const [finalNums, setFinalNums] = useState<number[] | null>(null)
  const [settled, setSettled] = useState<boolean[]>([false, false, false, false, false, false])
  const animIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        // 최신 회차 조회 (sync는 SyncInitializer에서 처리)
        const drawRes = await fetch('/api/lotto/draws?limit=1')
        if (drawRes.ok) {
          const draws = await drawRes.json()
          if (draws?.[0]?.numbers) setDraw(draws[0])
        }
      } catch {}
      setLoadingDraw(false)
    }
    init()
  }, [])

  const { data: sajuProfile } = useQuery<SajuProfile | null>({
    queryKey: ['saju-profile-home'],
    queryFn: async () => {
      const res = await fetch('/api/saju/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session,
  })

  const { data: savedList, isLoading: loadingList } = useQuery<SavedNumber[]>({
    queryKey: ['home-saved'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers?type=auto')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data.slice(0, 10) : []
    },
    enabled: !!session,
  })

  const { data: manualList, isLoading: loadingManual } = useQuery<SavedNumber[]>({
    queryKey: ['home-manual'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers?type=manual')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data.slice(0, 20) : []
    },
    enabled: !!session,
  })

  // 슬롯머신 시작
  const startAnim = () => {
    setModalVisible(true)
    setFinalNums(null)
    setSettled([false, false, false, false, false, false])
    animIntervalRef.current = setInterval(() => {
      setAnimNums(Array.from({ length: 6 }, () => Math.floor(Math.random() * 45) + 1))
    }, 80)
  }

  // 숫자 하나씩 고정
  const settleNumbers = (nums: number[]) => {
    if (animIntervalRef.current) clearInterval(animIntervalRef.current)
    setFinalNums(nums)
    nums.forEach((_, i) => {
      setTimeout(() => {
        setSettled(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, i * 180)
    })
  }

  const handleGenerate = async () => {
    if (!session) { router.push('/login'); return }
    if (!sajuProfile?.ilju) { router.push('/onboarding'); return }
    setGenError('')
    startAnim()
    try {
      const res = await fetch('/api/lotto/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: new Date().toISOString() }),
      })
      if (!res.ok) {
        if (animIntervalRef.current) clearInterval(animIntervalRef.current)
        setModalVisible(false)
        const d = await res.json()
        setGenError(d.error || '번호 생성 실패')
        return
      }
      const data = await res.json()
      settleNumbers(data.numbers)
    } catch {
      if (animIntervalRef.current) clearInterval(animIntervalRef.current)
      setModalVisible(false)
      setGenError('번호 생성 중 오류가 발생했습니다')
    }
  }

  const handleModalClose = () => {
    setModalVisible(false)
    setFinalNums(null)
    setSettled([false, false, false, false, false, false])
    queryClient.refetchQueries({ queryKey: ['home-saved'] })
  }
  const daysLeft = (() => {
    const d = new Date().getDay()
    return d === 6 ? 0 : 6 - d
  })()

  const RANK_LABEL: Record<number, { text: string; bg: string }> = {
    1: { text: '1등', bg: '#dc1f1f' },
    2: { text: '2등', bg: '#e03f0e' },
    3: { text: '3등', bg: '#e4a816' },
    4: { text: '4등', bg: '#007bc3' },
    5: { text: '5등', bg: '#129f97' },
  }

  return (
    <div>
      {/* ── 토스트 메시지 ── */}
      {toastMsg && (
        <div style={{
          position: 'fixed', top: 56, left: '50%', transform: 'translateX(-50%)',
          background: '#333', color: '#fff', fontSize: 12, fontWeight: 600,
          padding: '9px 18px', borderRadius: 20, zIndex: 300,
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap', animation: 'fadeIn 0.2s ease',
        }}>
          {toastMsg}
        </div>
      )}

      {/* ── 슬롯머신 애니메이션 모달 ── */}
      <GenerateModal
        visible={modalVisible}
        animNums={animNums}
        finalNums={finalNums}
        settled={settled}
        yongsin={sajuProfile?.yongsin ?? null}
        onClose={handleModalClose}
      />

      {/* ── 수동 입력 시트 ── */}
      {showManualSheet && (
        <ManualLottoSheet
          onClose={() => setShowManualSheet(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['home-manual'] })}
        />
      )}

      {/* ── AI 사주 통변 시트 ── */}
      {showReadingSheet && (
        <ReadingSheet onClose={() => setShowReadingSheet(false)} />
      )}

      {/* ── 사주 정보 카드 ── */}
      {session && (
        <SajuCard
          profile={sajuProfile ?? null}
          onSetup={() => router.push('/mypage/edit')}
          onEdit={() => router.push('/mypage/edit')}
        />
      )}

      {/* ── AI 사주 통변 버튼 ── */}
      {session && sajuProfile?.ilju && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '0 16px 12px' }}>
          <button
            onClick={() => setShowReadingSheet(true)}
            style={{
              width: '100%', height: 36,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #8f35c8 100%)',
              border: 'none', borderRadius: 4,
              color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}
          >
            🔮 AI 사주 통변 받기
          </button>
        </div>
      )}

      {/* ── 최신 당첨번호 (클릭 → 상세) ── */}
      <Link href={draw ? `/draw/${draw.round}` : `/draw/${round - 1}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={{ background: '#fff', marginBottom: 8, borderBottom: '1px solid #dcdcdc' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 16px 8px',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>제{draw?.round ?? round - 1}회 당첨번호</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {draw?.drawDate && (
                <span style={{ fontSize: 11, color: '#888' }}>{draw.drawDate.slice(0, 10).replace(/-/g, '.')}</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
          <div style={{ padding: '4px 16px 10px' }}>
            {loadingDraw ? (
              <div style={{ display: 'flex', gap: 5 }}>
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                ))}
              </div>
            ) : draw ? (
              <>
                <LottoBallSet numbers={draw.numbers} bonus={draw.bonus} size="sm" />
                {/* 1등/2등 당첨 정보 */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {draw.winners1st != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#fff',
                        background: '#dc1f1f', padding: '1px 6px', borderRadius: 3,
                      }}>1등</span>
                      <span style={{ fontSize: 11, color: '#555' }}>
                        {draw.winners1st}명
                      </span>
                      {draw.prize1st && (
                        <span style={{ fontSize: 11, color: '#333', fontWeight: 600 }}>
                          · {formatPrize(draw.prize1st)}
                        </span>
                      )}
                    </div>
                  )}
                  {draw.winners2nd != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#fff',
                        background: '#e03f0e', padding: '1px 6px', borderRadius: 3,
                      }}>2등</span>
                      <span style={{ fontSize: 11, color: '#555' }}>
                        {draw.winners2nd}명
                      </span>
                      {draw.prize2nd && (
                        <span style={{ fontSize: 11, color: '#333', fontWeight: 600 }}>
                          · {formatPrize(draw.prize2nd)}
                        </span>
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>탭하면 판매점 정보 →</span>
                </div>
              </>
            ) : (
              <p style={{ fontSize: 12, color: '#888', padding: '6px 0' }}>당첨번호 데이터가 없습니다</p>
            )}
          </div>
        </div>
      </Link>

      {/* ── 현재 회차 + 번호뽑기 ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #dcdcdc',
        padding: '12px 16px 14px',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>
              제 <strong style={{ color: '#333' }}>{round}</strong>회 복권추첨
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#007bc3', letterSpacing: '-0.5px' }}>
              {daysLeft === 0 ? '오늘 추첨!' : `추첨 D-${daysLeft}`}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 38, padding: '0 14px',
              background: '#007bc3', border: '1px solid #005a94',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', borderRadius: 2, whiteSpace: 'nowrap',
            }}
          >
            번호 뽑기
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
        {/* 수동 입력 버튼 */}
        <button
          onClick={() => setShowManualSheet(true)}
          style={{
            width: '100%', height: 36,
            background: '#fff', border: '1px solid #007bc3',
            color: '#007bc3', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', borderRadius: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#007bc3" strokeWidth="2" strokeLinecap="round">
            <path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5"/>
            <path d="M17.5 2.5a2.121 2.121 0 0 1 3 3L12 14l-4 1 1-4 7.5-7.5z"/>
          </svg>
          수동 번호 직접 입력하기
        </button>
      </div>

      {/* 생성 오류 */}
      {genError && (
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ padding: '8px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: 2, fontSize: 12, color: '#dc1f1f' }}>
            {genError}
          </div>
        </div>
      )}

      {/* ── 내 사주 추천 번호 ── */}
      <h3 style={{
        position: 'relative', height: 53, lineHeight: '51px',
        margin: 0, padding: '0 10px',
        fontWeight: 700, fontSize: 15, color: '#333',
        borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
        background: '#f7f7f7',
      }}>
        내 사주 추천 번호
        {session && (
          <Link href="/history" style={{
            position: 'absolute', right: 10, top: '50%', marginTop: -12,
            padding: '4px 10px 4px 0', fontSize: 11, fontWeight: 500, color: '#888',
            textDecoration: 'none',
            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='9' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M9 18l6-6-6-6'/%3E%3C/svg%3E") right center no-repeat`,
          }}>
            전체보기
          </Link>
        )}
      </h3>

      {/* 번호 목록 */}
      {!session ? (
        <div style={{
          background: '#fff', borderBottom: '1px solid #dcdcdc',
          padding: '32px 20px', textAlign: 'center', marginBottom: 8,
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round"
            style={{ display: 'block', margin: '0 auto 12px' }}>
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6 }}>번호 저장하고 당첨 알림 받기</p>
          <p style={{ fontSize: 12, color: '#888', lineHeight: 1.6, marginBottom: 18 }}>
            로그인하면 사주 기반 번호 생성과<br/>당첨 여부 이력을 관리할 수 있어요
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Link href="/register" style={{
              height: 40, padding: '0 24px', lineHeight: '38px',
              background: '#007bc3', color: '#fff', fontSize: 13, fontWeight: 600,
              textDecoration: 'none', border: '1px solid #005a94', borderRadius: 2,
            }}>회원가입</Link>
            <Link href="/login" style={{
              height: 40, padding: '0 24px', lineHeight: '38px',
              background: '#fff', color: '#444', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', border: '1px solid #dcdcdc', borderRadius: 2,
            }}>로그인</Link>
          </div>
        </div>
      ) : loadingList ? (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="skeleton" style={{ width: 44, height: 12, borderRadius: 2 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%' }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : savedList && savedList.length > 0 ? (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: '#888', padding: '6px 16px 2px', borderBottom: '1px solid #f5f5f5' }}>
            💡 번호를 탭하면 사주 근거를 볼 수 있어요
          </p>
          {savedList.map((item, i) => (
            <NumberRow
              key={item.id}
              item={item}
              isLast={i === savedList.length - 1}
              yongsin={sajuProfile?.yongsin ?? null}
              rankLabel={RANK_LABEL}
            />
          ))}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
            <button
              onClick={handleGenerate}
              style={{
                width: '100%', height: 40, background: '#fff',
                border: '1px solid #007bc3', color: '#007bc3',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
              }}
            >
              + 번호 추가 생성하기
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: '#fff', borderBottom: '1px solid #dcdcdc',
          padding: '32px 20px', textAlign: 'center', marginBottom: 8,
        }}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 1.6 }}>
            아직 생성된 번호가 없습니다.<br/>사주 기반 번호를 뽑아보세요!
          </p>
          <button onClick={handleGenerate} style={{
            height: 40, padding: '0 28px',
            background: '#007bc3', border: '1px solid #005a94',
            color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', borderRadius: 2,
          }}>번호 뽑기</button>
        </div>
      )}

      {/* ── 내 수동 번호 ── */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}><AdSlot /></div>
      {session && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            height: 44, padding: '0 12px 0 10px',
            borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
            background: '#f7f7f7',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#333' }}>내 수동 번호</span>
            <button
              onClick={() => setShowManualSheet(true)}
              style={{
                height: 30, padding: '0 12px',
                background: '#007bc3', border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
              입력
            </button>
          </div>

          {loadingManual ? (
            <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
              {[...Array(2)].map((_, i) => (
                <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
                  <div className="skeleton" style={{ width: 44, height: 12, borderRadius: 2 }} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[...Array(6)].map((_, j) => (
                      <div key={j} className="skeleton" style={{ width: 26, height: 26, borderRadius: '50%' }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : manualList && manualList.length > 0 ? (
            <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: '#888', padding: '6px 16px 2px', borderBottom: '1px solid #f5f5f5' }}>
                ✏️ 직접 입력한 번호 · 탭하면 당첨이력을 확인할 수 있어요
              </p>
              {manualList.map((item, i) => (
                <NumberRow
                  key={item.id}
                  item={item}
                  isLast={i === manualList.length - 1}
                  yongsin={null}
                  rankLabel={RANK_LABEL}
                />
              ))}
              <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
                <button
                  onClick={() => setShowManualSheet(true)}
                  style={{
                    width: '100%', height: 40, background: '#fff',
                    border: '1px solid #007bc3', color: '#007bc3',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 2,
                  }}
                >+ 번호 추가 입력하기</button>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff', borderBottom: '1px solid #dcdcdc',
              padding: '24px 20px', textAlign: 'center', marginBottom: 8,
            }}>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 1.6 }}>
                직접 고른 번호를 저장하고<br/>과거 당첨이력을 확인해보세요
              </p>
              <button onClick={() => setShowManualSheet(true)} style={{
                height: 40, padding: '0 28px',
                background: '#007bc3', border: 'none',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', borderRadius: 2,
              }}>수동 번호 입력하기</button>
            </div>
          )}
        </>
      )}

      {/* ── QR 당첨 확인 ── */}
      <Link href="/check" style={{
        display: 'flex', alignItems: 'center', padding: '14px 16px',
        background: '#fff', borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
        textDecoration: 'none', marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, background: '#f0f7ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 12, flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bc3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M17 14v3h3M14 17v3M17 21h3"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 1 }}>QR 당첨 확인</p>
          <p style={{ fontSize: 12, color: '#888' }}>구매한 복권 QR코드로 당첨 여부 확인</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </Link>

      {/* ── 판매점 ── */}
      <Link href="/stores" style={{
        display: 'flex', alignItems: 'center', padding: '14px 16px',
        background: '#fff',
        borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
        textDecoration: 'none',
        marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4, background: '#f0f7ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginRight: 12, flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#007bc3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 1 }}>판매점 추천</p>
          <p style={{ fontSize: 12, color: '#888' }}>1등 다수 배출 판매점 · 지역별 검색</p>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </Link>

      {/* ── 광고 ── */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <AdSlot />
      </div>

      {/* ── 안내 ── */}
      <div style={{
        borderTop: '1px solid #dcdcdc', borderBottom: '1px solid #dcdcdc',
        background: '#f7fbff', padding: '14px 16px', marginBottom: 8,
      }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#007bc3', marginBottom: 5 }}>사주로또란?</p>
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.7 }}>
          생년월일과 출생시간으로 계산한 사주(四柱) 오행(五行) 데이터를 바탕으로 개인에게 맞는 로또 번호를 추천해드립니다.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ padding: '0 16px', marginBottom: 16 }}><AdSlot /></div>
    </div>
  )
}
