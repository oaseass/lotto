'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { estimateCurrentRound, resolveNumberDrawRound } from '@/lib/lotto/dhlottery'
import HistoryScopeToggle, { type HistoryScope } from '@/components/lotto/HistoryScopeToggle'
import { LottoBallSet } from '@/components/lotto/LottoBall'
import SocialProofCard from '@/components/lotto/SocialProofCard'
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

interface WinStoreInfo {
  name: string
  address: string
  method?: string | null
}

interface SavedNumber {
  id: string
  numbers: number[]
  drawRound: number | null
  generatedDate?: string
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

function formatDrawDateLabel(isoDate: string | null | undefined): string {
  if (!isoDate) return ''

  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}년 ${month}월 ${day}일 추첨`
}

function isCurrentPurchasableNumber(item: SavedNumber, currentRound: number): boolean {
  return resolveNumberDrawRound(item.drawRound, item.generatedDate ?? item.createdAt) === currentRound
}

function getDaysUntilDraw(date: Date): number {
  const day = date.getDay()
  const hour = date.getHours()

  if (day === 6 && hour >= 20) return 7
  if (day === 6) return 0
  return 6 - day
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
    if (!showIljuDetail || !profile?.ilju || iljuData) return
    fetchIljuData(profile.ilju)
  }, [fetchIljuData, iljuData, profile?.ilju, showIljuDetail])

  const { data: daeunData } = useQuery<DaeunResult | null>({
    queryKey: ['daeun-home'],
    queryFn: async () => {
      const res = await fetch('/api/saju/daeun')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!profile?.ilju && showIljuDetail,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px 8px',
        borderBottom: '1px solid #f0f0f0',
        gap: 8,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>내 사주 분석</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#888' }}>
            {profile.birthYear}.{String(profile.birthMonth).padStart(2, '0')}.{String(profile.birthDay).padStart(2, '0')}
            {profile.birthHour != null ? ` ${profile.birthHour}시` : ''}
          </span>
          <button
            onClick={onEdit}
            style={{
              fontSize: 11,
              color: '#007bc3',
              background: 'none',
              border: '1px solid #007bc3',
              borderRadius: 2,
              padding: '2px 8px',
              cursor: 'pointer',
              lineHeight: 1.5,
            }}
          >
            수정
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 4,
            background: primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>{ilju}</span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{ilju}일주</span>
              <span style={{ fontSize: 11, color: '#888' }}>{ILJU_DESC[iljuChar] || ''}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#666' }}>부족 기운</span>
              {weakArr.map(w => (
                <span
                  key={w}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#fff',
                    background: OHAENG_COLOR[w] || '#888',
                    padding: '1px 8px',
                    borderRadius: 2,
                  }}
                >
                  {w}({OHAENG_HANJA[w]})
                </span>
              ))}
              <span style={{ fontSize: 11, color: '#888' }}>
                행운 끝수 {primaryYongsin ? OHAENG_LUCKY[primaryYongsin] : '-'}
              </span>
            </div>
          </div>
        </div>

        {ohaengEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {ohaengEntries.map(([element, value]) => (
              <div key={element} style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: OHAENG_COLOR[element] || '#ddd',
                    opacity: 0.3 + (value / totalOhaeng) * 0.7,
                    marginBottom: 3,
                  }}
                />
                <p style={{ fontSize: 10, color: OHAENG_COLOR[element] || '#888', fontWeight: 700 }}>
                  {element}({OHAENG_HANJA[element]})
                </p>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#444' }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {weakArr.length > 0 && (
          <div style={{
            background: '#f7fbff',
            borderLeft: '3px solid #007bc3',
            borderRadius: '0 2px 2px 0',
            padding: '8px 10px',
            marginBottom: 10,
          }}>
            <p style={{ fontSize: 12, color: '#444', lineHeight: 1.6 }}>
              팁 {getSajuComment(primaryYongsin)}
            </p>
          </div>
        )}

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
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, color: '#555' }}>현재 대운</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#007bc3' }}>
              {currentDaeun.ganji}({currentDaeun.hanja})
            </span>
            <span style={{ fontSize: 11, color: '#888' }}>만 {currentDaeun.startAge}세 시작</span>
          </div>
        )}

        <button
          onClick={() => setShowIljuDetail(value => !value)}
          style={{
            width: '100%',
            height: 34,
            background: showIljuDetail ? '#f0f7ff' : '#fff',
            border: `1px solid ${showIljuDetail ? '#007bc3' : '#dcdcdc'}`,
            color: showIljuDetail ? '#007bc3' : '#555',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {iljuData ? `${iljuData.hanja} 일주 특성 보기` : '일주 특성 보기'}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{ transform: showIljuDetail ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
          >
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {showIljuDetail && (
          <div style={{
            marginTop: 10,
            border: '1px solid #dce8f5',
            borderRadius: 4,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease',
          }}>
            <div style={{
              background: primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3',
              padding: '10px 14px',
            }}>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                {iljuData ? `${iljuData.hanja} 일주 특성` : `${ilju} 일주 특성`}
              </p>
              {iljuData && (
                <>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{iljuData.summary}</p>
                  {iljuData.hanja.length >= 2 && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                      {iljuData.hanja[0]}({CHEONGAN_DESC[iljuData.hanja[0]] ?? ''}) · {iljuData.hanja[1]}({JIJI_DESC[iljuData.hanja[1]] ?? ''})
                    </p>
                  )}
                </>
              )}
            </div>

            {loadingIlju ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4].map(index => (
                  <div key={index} className="skeleton" style={{ height: 14, borderRadius: 2 }} />
                ))}
              </div>
            ) : iljuData ? (
              <div style={{ padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: '성격', value: iljuData.personality },
                  { label: '직업 적성', value: iljuData.career },
                  { label: '대인 관계', value: iljuData.relationship },
                  { label: '재물 흐름', value: iljuData.fortune },
                  { label: '주의 사항', value: iljuData.caution },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 12, color: '#444', lineHeight: 1.65 }}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ padding: '14px', fontSize: 12, color: '#888', textAlign: 'center' }}>
                일주 데이터를 불러오지 못했습니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface HomeHistoryEntry {
  item: SavedNumber
  mode: 'AUTO' | 'MANUAL'
  rowLabel: string
}

function getHistoryBallPalette(number: number): { bg: string; color: string } {
  if (number <= 10) return { bg: '#f7c948', color: '#6b4e00' }
  if (number <= 20) return { bg: '#7cc7ff', color: '#0f4870' }
  if (number <= 30) return { bg: '#ff8f70', color: '#7a2208' }
  if (number <= 40) return { bg: '#c5ccd6', color: '#46515f' }
  return { bg: '#8fd36f', color: '#1f5f12' }
}

function HistoryNumberPills({ numbers }: { numbers: number[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {numbers.map(number => {
        const palette = getHistoryBallPalette(number)

        return (
          <span
            key={number}
            style={{
              minWidth: 22,
              height: 22,
              padding: '0 5px',
              borderRadius: 999,
              background: palette.bg,
              color: palette.color,
              fontSize: 10,
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {number}
          </span>
        )
      })}
    </div>
  )
}

function HomeHistoryRoundCard({
  round,
  entries,
  rankLabel,
  onOpenHistory,
}: {
  round: number
  entries: HomeHistoryEntry[]
  rankLabel: Record<number, { text: string; bg: string }>
  onOpenHistory: () => void
}) {
  const autoCount = entries.filter(entry => entry.mode === 'AUTO').length
  const manualCount = entries.filter(entry => entry.mode === 'MANUAL').length
  const previewEntries = entries.slice(0, 2)

  return (
    <div style={{
      border: '1px solid #dbe5ee',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
      background: '#fff',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '9px 11px',
        background: '#f4f8fb',
        borderBottom: '1px solid #e4edf4',
      }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 900, color: '#16324f', marginBottom: 2 }}>제 {round}회</p>
          <p style={{ fontSize: 10, color: '#6b7b88' }}>
            {autoCount > 0 ? `자동 ${autoCount}` : '자동 0'}
            {' · '}
            {manualCount > 0 ? `수동 ${manualCount}` : '수동 0'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            height: 24,
            padding: '0 9px',
            borderRadius: 999,
            background: '#fff',
            border: '1px solid #d0d9e3',
            color: '#556371',
            fontSize: 10,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
          }}>
            총 {entries.length}장
          </span>
          <button
            type="button"
            onClick={onOpenHistory}
            style={{
              height: 24,
              padding: '0 10px',
              borderRadius: 999,
              border: 'none',
              background: '#16324f',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            전체
          </button>
        </div>
      </div>

      <div style={{ padding: '0 10px 8px' }}>
        {previewEntries.map((entry, index) => {
          const outcomeLabel = entry.item.rank ? rankLabel[entry.item.rank]?.text : '확인 전'
          const outcomeColor = entry.item.rank ? rankLabel[entry.item.rank]?.bg : '#94a3b8'

          return (
            <div
              key={entry.item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '52px minmax(0, 1fr) auto',
                gap: 8,
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: index === previewEntries.length - 1 && entries.length <= previewEntries.length ? 'none' : '1px solid #edf2f7',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 40,
                  height: 18,
                  padding: '0 7px',
                  borderRadius: 999,
                  background: entry.mode === 'AUTO' ? '#e8f4ff' : '#f4ebff',
                  color: entry.mode === 'AUTO' ? '#007bc3' : '#8f35c8',
                  fontSize: 10,
                  fontWeight: 800,
                }}>
                  {entry.mode === 'AUTO' ? '자동' : '수동'}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{entry.rowLabel}</span>
              </div>

              <div style={{ minWidth: 0 }}>
                <HistoryNumberPills numbers={entry.item.numbers} />
                <p style={{ fontSize: 10, color: '#8b97a3', marginTop: 4 }}>등록 {formatDate(entry.item.createdAt)}</p>
              </div>

              <span style={{
                fontSize: 10,
                fontWeight: 800,
                color: outcomeColor,
                whiteSpace: 'nowrap',
                justifySelf: 'end',
              }}>
                {outcomeLabel}
              </span>
            </div>
          )
        })}

        {entries.length > previewEntries.length && (
          <button
            type="button"
            onClick={onOpenHistory}
            style={{
              width: '100%',
              height: 30,
              marginTop: 8,
              border: '1px dashed #cbd7e3',
              borderRadius: 9,
              background: '#f8fbfd',
              color: '#556371',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            나머지 {entries.length - previewEntries.length}장 더 보기
          </button>
        )}
      </div>
    </div>
  )
}

// ── 메인 홈 페이지 ──────────────────────────────────
export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const round = estimateCurrentRound()
  const [homeDataReady, setHomeDataReady] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<HistoryScope>('all')
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
    const timer = window.setTimeout(() => setHomeDataReady(true), 220)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!toastMsg) return

    const timer = window.setTimeout(() => setToastMsg(''), 2200)
    return () => window.clearTimeout(timer)
  }, [toastMsg])

  // 최신 당첨번호 — staleTime 1시간 (실제 추첨은 주 1회)
  const { data: draw, isLoading: loadingDraw, isFetching: refreshingDraw, refetch: refetchDraw } = useQuery<DrawInfo | null>({
    queryKey: ['latest-draw'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/draws?limit=1')
      if (!res.ok) return null
      const draws = await res.json()
      return draws?.[0]?.numbers ? draws[0] : null
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  })

  const { data: winStores = [] } = useQuery<WinStoreInfo[]>({
    queryKey: ['home-win-stores', draw?.round],
    queryFn: async () => {
      if (!draw?.round) return []
      const res = await fetch(`/api/lotto/draws/winstores?round=${draw.round}`)
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!draw?.round,
    staleTime: 60 * 60 * 1000,
  })

  const { data: sajuProfile } = useQuery<SajuProfile | null>({
    queryKey: ['saju-profile-home'],
    queryFn: async () => {
      const res = await fetch('/api/saju/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session && homeDataReady,
    staleTime: 5 * 60 * 1000,
  })

  const { data: savedList, isLoading: loadingList } = useQuery<SavedNumber[]>({
    queryKey: ['home-saved'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers?type=auto')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!session && homeDataReady,
    staleTime: 60 * 1000,
  })

  const { data: manualList, isLoading: loadingManual } = useQuery<SavedNumber[]>({
    queryKey: ['home-manual'],
    queryFn: async () => {
      const res = await fetch('/api/lotto/my-numbers?type=manual')
      if (!res.ok) return []
      const data = await res.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!session && homeDataReady,
    staleTime: 60 * 1000,
  })

  const visibleSavedList = historyFilter === 'all'
    ? savedList ?? []
    : (savedList ?? []).filter(item => isCurrentPurchasableNumber(item, round))

  const visibleManualList = historyFilter === 'all'
    ? manualList ?? []
    : (manualList ?? []).filter(item => isCurrentPurchasableNumber(item, round))

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
  const daysLeft = getDaysUntilDraw(new Date())
  const autoWinStoreCount = winStores.filter(store => store.method?.includes('자동')).length
  const manualWinStoreCount = winStores.filter(store => store.method?.includes('수동')).length
  const hasWinStoreBreakdown = autoWinStoreCount + manualWinStoreCount > 0
    && autoWinStoreCount + manualWinStoreCount === (draw?.winners1st ?? 0)

  const RANK_LABEL: Record<number, { text: string; bg: string }> = {
    1: { text: '1등', bg: '#dc1f1f' },
    2: { text: '2등', bg: '#e03f0e' },
    3: { text: '3등', bg: '#e4a816' },
    4: { text: '4등', bg: '#007bc3' },
    5: { text: '5등', bg: '#129f97' },
  }

  const topActionStyle: React.CSSProperties = {
    height: 38,
    borderRadius: 10,
    border: '1px solid #dce7ef',
    background: '#fff',
    color: '#16324f',
    fontSize: 12,
    fontWeight: 700,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  }

  const homeHistoryGroups = (() => {
    const combined = [
      ...visibleSavedList.map(item => ({
        item,
        mode: 'AUTO' as const,
        displayRound: resolveNumberDrawRound(item.drawRound, item.generatedDate ?? item.createdAt),
      })),
      ...visibleManualList.map(item => ({
        item,
        mode: 'MANUAL' as const,
        displayRound: resolveNumberDrawRound(item.drawRound, item.generatedDate ?? item.createdAt),
      })),
    ].sort((left, right) => {
      if (right.displayRound !== left.displayRound) return right.displayRound - left.displayRound
      return new Date(right.item.createdAt).getTime() - new Date(left.item.createdAt).getTime()
    })

    const groups: Array<{ round: number; entries: HomeHistoryEntry[] }> = []

    for (const entry of combined) {
      let group = groups.find(item => item.round === entry.displayRound)
      if (!group) {
        group = { round: entry.displayRound, entries: [] }
        groups.push(group)
      }

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const rowIndex = group.entries.length
      group.entries.push({
        item: entry.item,
        mode: entry.mode,
        rowLabel: alphabet[rowIndex] ?? String(rowIndex + 1),
      })
    }

    return groups.slice(0, 4)
  })()

  const handleRefreshDraw = async () => {
    await refetchDraw()
    setToastMsg('최신 당첨정보를 다시 확인했습니다.')
  }

  const handleShareCurrentDraw = async () => {
    if (!draw) return

    const title = `제${draw.round}회 로또 당첨번호`
    const text = `${title} ${draw.numbers.join(', ')} + 보너스 ${draw.bonus}`
    const url = `${window.location.origin}/draw/${draw.round}`

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${text}\n${url}`)
        setToastMsg('당첨번호 링크를 복사했습니다.')
        return
      }

      setToastMsg('공유 기능을 사용할 수 없습니다.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setToastMsg('당첨번호 공유를 완료하지 못했습니다.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 48,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#f5f5f5',
      zIndex: 1,
    }}>
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

      {/* ── AI 사주 풀이 시트 ── */}
      {showReadingSheet && (
        <ReadingSheet onClose={() => setShowReadingSheet(false)} />
      )}

      <div style={{
        flexShrink: 0,
        background: '#f5f5f5',
        boxShadow: '0 6px 16px rgba(22,50,79,0.08)',
      }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
          <div style={{ padding: '12px 16px 14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 60px', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={handleRefreshDraw}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#12a3a8' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6"/>
                    <path d="M3 12a9 9 0 0 1 15.55-5.94L21 8"/>
                    <path d="M3 22v-6h6"/>
                    <path d="M21 12a9 9 0 0 1-15.55 5.94L3 16"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>{refreshingDraw ? '확인중' : '업데이트'}</span>
                </div>
              </button>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: '#16324f', marginBottom: 4, letterSpacing: '-0.4px' }}>
                  제{draw?.round ?? round - 1}회 당첨번호
                </p>
                <p style={{ fontSize: 12, color: '#7b8794' }}>{formatDrawDateLabel(draw?.drawDate)}</p>
              </div>

              <Link href="/check" style={{ textDecoration: 'none', color: '#11a7b3' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <path d="M14 14h3v3M17 14v3h3M14 17v3M17 21h3"/>
                  </svg>
                  <span style={{ fontSize: 10, fontWeight: 700 }}>QR코드</span>
                </div>
              </Link>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
              {loadingDraw ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  {[...Array(7)].map((_, index) => (
                    <div key={index} className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
                  ))}
                </div>
              ) : draw ? (
                <LottoBallSet numbers={draw.numbers} bonus={draw.bonus} size="sm" />
              ) : (
                <p style={{ fontSize: 12, color: '#8b97a3' }}>당첨번호를 불러오지 못했습니다.</p>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginBottom: 12 }}>
              <Link href={draw ? `/draw/${draw.round}` : `/draw/${round - 1}`} style={topActionStyle}>회차 상세</Link>
              <Link href="/check" style={topActionStyle}>QR 당첨 확인</Link>
              <button type="button" onClick={handleShareCurrentDraw} style={topActionStyle}>당첨번호 공유</button>
            </div>

            <div style={{ border: '1px solid #e3ebf2', borderRadius: 14, overflow: 'hidden', background: '#f9fbfd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid #e3ebf2' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4b5b6b' }}>1등 당첨금액</p>
                <p style={{ fontSize: 17, fontWeight: 900, color: '#16324f', letterSpacing: '-0.3px' }}>
                  {draw?.prize1st ? formatPrize(draw.prize1st) : '-'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '12px 14px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#4b5b6b' }}>1등 당첨복권</p>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 16, fontWeight: 900, color: '#16324f', letterSpacing: '-0.3px' }}>
                    {draw?.winners1st != null ? `${draw.winners1st}개` : '-'}
                  </p>
                  {hasWinStoreBreakdown && (
                    <p style={{ fontSize: 11, color: '#7b8794', marginTop: 2 }}>
                      자동 {autoWinStoreCount} · 수동 {manualWinStoreCount}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

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

        {genError && (
          <div style={{ padding: '0 16px 8px' }}>
            <div style={{ padding: '8px 12px', background: '#fff5f5', border: '1px solid #ffd5d5', borderRadius: 2, fontSize: 12, color: '#dc1f1f' }}>
              {genError}
            </div>
          </div>
        )}
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 16,
      }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(90deg, #16b8c5 0%, #1cc2ae 100%)',
          color: '#fff',
        }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 900, marginBottom: 2, letterSpacing: '-0.3px' }}>내 로또 복권 히스토리</p>
            <p style={{ fontSize: 10, opacity: 0.92 }}>최근 저장 번호만 먼저 간단하게 보기</p>
          </div>
          <Link
            href={session ? '/history' : '/login'}
            style={{
              height: 28,
              padding: '0 11px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.35)',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {session ? '전체보기' : '로그인'}
          </Link>
        </div>

        {!session ? (
          <div style={{ padding: '16px 16px 18px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#16324f', marginBottom: 6 }}>저장 번호와 QR 결과를 한곳에서 보세요</p>
            <p style={{ fontSize: 12, color: '#7b8794', lineHeight: 1.65, marginBottom: 16 }}>
              로그인하면 자동 추천 번호와 수동 입력 번호를 회차별 히스토리로 정리해드립니다.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
              <Link href="/register" style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 999,
                background: '#007bc3',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}>회원가입</Link>
              <Link href="/login" style={{
                height: 38,
                padding: '0 18px',
                borderRadius: 999,
                border: '1px solid #d7dfe7',
                background: '#fff',
                color: '#4b5b6b',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
              }}>로그인</Link>
            </div>
          </div>
        ) : !homeDataReady || loadingList || loadingManual ? (
          <div style={{ padding: '10px 12px' }}>
            {[...Array(2)].map((_, index) => (
              <div key={index} className="skeleton" style={{ height: 98, borderRadius: 12, marginBottom: index === 1 ? 0 : 8 }} />
            ))}
          </div>
        ) : (
          <>
            <div style={{ padding: '8px 12px 0' }}>
              <HistoryScopeToggle value={historyFilter} currentRound={round} onChange={setHistoryFilter} />
            </div>

            {homeHistoryGroups.length > 0 ? (
              <div style={{ padding: '8px 12px 2px' }}>
                {homeHistoryGroups.map(group => (
                  <HomeHistoryRoundCard
                    key={group.round}
                    round={group.round}
                    entries={group.entries}
                    rankLabel={RANK_LABEL}
                    onOpenHistory={() => router.push('/history')}
                  />
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px 16px 18px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#16324f', marginBottom: 6 }}>아직 정리된 복권 히스토리가 없습니다</p>
                <p style={{ fontSize: 12, color: '#7b8794', lineHeight: 1.65, marginBottom: 14 }}>
                  자동 추천 번호를 저장하거나 수동 번호를 입력하면 이 화면에 회차별로 깔끔하게 정리됩니다.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button type="button" onClick={handleGenerate} style={{
                    height: 38,
                    padding: '0 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: '#007bc3',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>번호 뽑기</button>
                  <button type="button" onClick={() => setShowManualSheet(true)} style={{
                    height: 38,
                    padding: '0 18px',
                    borderRadius: 999,
                    border: '1px solid #d7dfe7',
                    background: '#fff',
                    color: '#4b5b6b',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>수동 입력</button>
                </div>
              </div>
            )}
          </>
        )}
        </div>

      {/* ── 사주 정보 카드 ── */}
      {session && homeDataReady && (
        <SajuCard
          profile={sajuProfile ?? null}
          onSetup={() => router.push('/mypage/edit')}
          onEdit={() => router.push('/mypage/edit')}
        />
      )}

      {/* ── AI 사주 풀이 버튼 ── */}
      {session && homeDataReady && sajuProfile?.ilju && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '0 16px 12px', marginBottom: 8 }}>
          <button
            onClick={() => setShowReadingSheet(true)}
            style={{
              width: '100%',
              height: 38,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #8f35c8 100%)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
            }}
          >
            🔮 AI 사주 풀이 받기
          </button>
        </div>
      )}

      {homeDataReady && <SocialProofCard />}

      {/* ── 광고 ── */}
      {homeDataReady && <div style={{ padding: '0 16px', marginBottom: 8 }}>
        <AdSlot />
      </div>}

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
      {homeDataReady && <div style={{ padding: '0 16px', marginBottom: 16 }}><AdSlot /></div>}
      </div>
    </div>
  )
}
