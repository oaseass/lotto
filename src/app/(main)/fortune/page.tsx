'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { CHEONGAN_OHAENG, DAILY_FORTUNE_POOL, dailySeed, getDailyFortune } from '@/lib/saju/fortune'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdSlot } from '@/components/ui/AdSlot'

interface SajuProfile {
  ilju: string | null
  yongsin: string | null
  ohaeng: Record<string, number> | null
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null
  isLunar: boolean
  cheonjigan: {
    year: { cheongan: string; jiji: string }
    month: { cheongan: string; jiji: string }
    day: { cheongan: string; jiji: string }
    hour: { cheongan: string; jiji: string } | null
  } | null
}

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}
const OHAENG_HANJA: Record<string, string> = {
  목: '木', 화: '火', 토: '土', 금: '金', 수: '水',
}

// 오행별 행운 번호 끝자리 풀 → 날짜마다 다른 2개 선택
const OHAENG_NUM_POOL: Record<string, number[][]> = {
  목: [[3,13,23,33,43], [8,18,28,38]],
  화: [[2,12,22,32,42], [7,17,27,37]],
  토: [[5,15,25,35,45], [10,20,30,40]],
  금: [[4,14,24,34,44], [9,19,29,39]],
  수: [[1,11,21,31,41], [6,16,26,36]],
}

// 오행별 행운 색상 풀
const OHAENG_COLOR_POOL: Record<string, string[]> = {
  목: ['초록', '연두', '파랑', '청록', '민트', '올리브', '에메랄드'],
  화: ['빨강', '주황', '분홍', '코랄', '버건디', '스칼렛', '오렌지'],
  토: ['황토', '노랑', '베이지', '갈색', '골드', '카키', '머스타드'],
  금: ['흰색', '금색', '은색', '아이보리', '크림', '샴페인', '펄'],
  수: ['검정', '감색', '남색', '회색', '슬레이트', '차콜', '인디고'],
}

// 오행별 행운 방위 풀
const OHAENG_DIR_POOL: Record<string, string[]> = {
  목: ['동쪽', '북동쪽', '동남쪽'],
  화: ['남쪽', '동남쪽', '남서쪽'],
  토: ['중앙', '서남쪽', '동북쪽'],
  금: ['서쪽', '북서쪽', '서남쪽'],
  수: ['북쪽', '북동쪽', '북서쪽'],
}

// 오행별 행운 오행 풀 (본인+상생 오행)
const OHAENG_LUCKY_EL_POOL: Record<string, string[]> = {
  목: ['목(木)', '수(水)', '목(木)·수(水)', '목(木)·화(火)'],
  화: ['화(火)', '목(木)', '화(火)·목(木)', '화(火)·토(土)'],
  토: ['토(土)', '화(火)', '토(土)·화(火)', '토(土)·금(金)'],
  금: ['금(金)', '토(土)', '금(金)·토(土)', '금(金)·수(水)'],
  수: ['수(水)', '금(金)', '수(水)·금(金)', '수(水)·목(木)'],
}


function getDailyLuckyNums(yongsin: string, iljuChar: string, date: Date): string {
  const pools = OHAENG_NUM_POOL[yongsin]
  if (!pools) return '3, 8'
  const n1 = pools[0][dailySeed(iljuChar, date, 11) % pools[0].length]
  const n2 = pools[1][dailySeed(iljuChar, date, 22) % pools[1].length]
  return `${n1}, ${n2}`
}

function getDailyLuckyColor(yongsin: string, iljuChar: string, date: Date): string {
  const pool = OHAENG_COLOR_POOL[yongsin] ?? []
  const i1 = dailySeed(iljuChar, date, 33) % pool.length
  const i2 = dailySeed(iljuChar, date, 44) % pool.length
  const c1 = pool[i1], c2 = pool[i2]
  return c1 === c2 ? c1 : `${c1}, ${c2}`
}

function getDailyLuckyDir(yongsin: string, iljuChar: string, date: Date): string {
  const pool = OHAENG_DIR_POOL[yongsin] ?? ['중앙']
  return pool[dailySeed(iljuChar, date, 55) % pool.length]
}

function getDailyLuckyEl(yongsin: string, iljuChar: string, date: Date): string {
  const pool = OHAENG_LUCKY_EL_POOL[yongsin] ?? [`${yongsin}(${OHAENG_HANJA[yongsin]})`]
  return pool[dailySeed(iljuChar, date, 66) % pool.length]
}

const ILJU_FULL: Record<string, { trait: string; fortune: string; caution: string }> = {
  갑: { trait: '리더십이 강하고 추진력이 넘칩니다. 새로운 일을 시작하는 데 탁월합니다.', fortune: '목(木) 기운으로 성장과 발전의 운이 강합니다.', caution: '너무 앞서나가다 주변과 마찰이 생길 수 있습니다.' },
  을: { trait: '섬세하고 유연합니다. 예술적 감각과 사교성이 뛰어납니다.', fortune: '인내와 끈기로 결실을 맺는 운입니다.', caution: '우유부단함을 조심하세요.' },
  병: { trait: '밝고 활발하며 에너지가 넘칩니다. 사람들에게 따뜻한 영향을 줍니다.', fortune: '화(火) 기운으로 명예와 인기가 상승합니다.', caution: '과욕이나 충동적인 결정을 조심하세요.' },
  정: { trait: '지혜롭고 예술적 감수성이 풍부합니다. 섬세한 감정 표현이 특기입니다.', fortune: '창의력이 빛을 발하는 시기입니다.', caution: '감정 기복을 안정시키는 것이 중요합니다.' },
  무: { trait: '안정적이고 신뢰감을 줍니다. 든든한 버팀목 역할을 잘합니다.', fortune: '토(土) 기운으로 재물과 안정의 운이 강합니다.', caution: '변화를 두려워하지 마세요.' },
  기: { trait: '포용력이 크고 성실합니다. 꼼꼼하고 책임감이 강합니다.', fortune: '인내와 노력이 인정받는 운입니다.', caution: '과도한 걱정이 기운을 약하게 합니다.' },
  경: { trait: '결단력이 강하고 의리 있습니다. 원칙을 중시하는 성격입니다.', fortune: '금(金) 기운으로 권위와 재물운이 상승합니다.', caution: '고집이 지나치면 협력이 어려워집니다.' },
  신: { trait: '총명하고 예리합니다. 분석력과 판단력이 뛰어납니다.', fortune: '지혜로 문제를 해결하는 운이 강합니다.', caution: '지나친 비판은 인간관계를 해칩니다.' },
  임: { trait: '포부가 크고 유연합니다. 적응력이 뛰어나 어디서도 잘 지냅니다.', fortune: '수(水) 기운으로 지혜와 흐름의 운이 강합니다.', caution: '방향을 잃지 않도록 목표를 명확히 하세요.' },
  계: { trait: '통찰력이 있고 감수성이 풍부합니다. 직감이 매우 뛰어납니다.', fortune: '깊은 통찰로 기회를 잡는 운입니다.', caution: '지나친 감수성이 판단을 흐릴 수 있습니다.' },
}



const DAILY_CAUTION_POOL: Record<string, string[]> = {
  목: [
    '서두르면 실수가 납니다. 충분한 준비 후 행동하세요.',
    '고집보다는 타인의 의견도 경청하는 자세가 필요합니다.',
    '과도한 추진력이 주변과의 갈등을 유발할 수 있습니다.',
    '건강, 특히 간·쓸개 계통에 주의가 필요합니다.',
    '금전적 충동 결정을 삼가세요. 신중한 소비가 필요합니다.',
    '자존심을 내세우다 중요한 기회를 놓칠 수 있습니다.',
    '분노·감정 조절에 각별히 유의하세요.',
    '지나친 낙관주의는 현실 판단을 흐립니다.',
  ],
  화: [
    '감정이 과열되기 쉬운 날입니다. 충동적인 발언을 조심하세요.',
    '과욕이 화를 부를 수 있습니다. 욕심을 자제하세요.',
    '화(火) 기운이 과하면 심장·혈압에 무리가 올 수 있습니다.',
    '빠른 행동보다 신중한 검토가 먼저입니다.',
    '인간관계에서 감정 다툼이 생기지 않도록 인내하세요.',
    '지출이 늘어나기 쉬운 날입니다. 계획된 소비를 유지하세요.',
    '자만심이 판단력을 흐립니다. 겸손하세요.',
    '성급한 결론이 나중에 후회로 이어질 수 있습니다.',
  ],
  토: [
    '변화에 지나치게 저항하면 기회를 놓칩니다.',
    '우유부단함이 결정을 지연시킬 수 있습니다.',
    '식습관을 점검하세요. 위장 건강에 신경써야 합니다.',
    '고집과 완고함이 인간관계를 단절시킵니다.',
    '안주하는 자세가 성장을 막을 수 있습니다.',
    '지나친 걱정과 불안이 에너지를 소진시킵니다.',
    '무거운 책임감 때문에 자신을 소홀히 하지 마세요.',
    '돈 문제에서 타인에게 지나치게 의존하지 마세요.',
  ],
  금: [
    '지나친 완벽주의가 스트레스를 유발합니다.',
    '비판적인 말이 인간관계에 상처를 줍니다.',
    '폐·호흡기 건강에 주의가 필요합니다.',
    '원칙을 고집하다 융통성이 없어 보일 수 있습니다.',
    '냉정함이 지나치면 주변과 거리감이 생깁니다.',
    '재물 집착이 더 중요한 가치를 놓치게 합니다.',
    '독단적인 판단보다 다양한 의견을 수렴하세요.',
    '일에서 타인과 협력하는 자세가 필요합니다.',
  ],
  수: [
    '감수성이 예민해져 감정 기복이 심할 수 있습니다.',
    '방향을 잃지 않도록 목표를 명확히 해야 합니다.',
    '신장·방광 건강에 신경쓰세요.',
    '지나친 의심이 신뢰 관계를 해칩니다.',
    '우유부단함보다 결단력이 필요한 날입니다.',
    '과도한 걱정이 직관력을 흐립니다. 마음을 비우세요.',
    '불필요한 곳에 에너지를 낭비하지 마세요.',
    '남의 일에 지나치게 개입하면 피로감이 쌓입니다.',
  ],
}

// 날짜 + 일주 기반으로 오늘의 운세/주의사항 선택 (같은 날 같은 사람 = 항상 같은 문구)
function getDailyMsg(pool: string[], iljuChar: string, date: Date, salt: number): string {
  return pool[dailySeed(iljuChar, date, salt) % pool.length]
}


function getDailyCaution(iljuChar: string, date: Date): string {
  const ohaeng = CHEONGAN_OHAENG[iljuChar] ?? '토'
  return getDailyMsg(DAILY_CAUTION_POOL[ohaeng], iljuChar, date, 99)
}

const JIJI_MEANING: Record<string, string> = {
  자: '子 (쥐)', 축: '丑 (소)', 인: '寅 (호랑이)', 묘: '卯 (토끼)',
  진: '辰 (용)', 사: '巳 (뱀)', 오: '午 (말)', 미: '未 (양)',
  신: '申 (원숭이)', 유: '酉 (닭)', 술: '戌 (개)', 해: '亥 (돼지)',
}

// 날짜 기반 운세 점수 계산 (1~100)
function getFortuneScore(yongsin: string | null, date: Date): number {
  if (!yongsin) return 55
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const base = { 목: 60, 화: 65, 토: 55, 금: 70, 수: 60 }[yongsin] ?? 55
  // seed 기반으로 ±30 범위 내에서 변동
  const variation = ((seed * 31337 + 17) % 61) - 30
  return Math.min(100, Math.max(1, base + variation))
}

// 점수 구간별 멘트
function getScoreComment(score: number): { title: string; message: string; emoji: string } {
  if (score <= 10) return {
    emoji: '😰',
    title: '흉한날',
    message: '오늘은 운기가 많이 약합니다. 중요한 결정이나 시작은 미루고, 조용히 내면을 돌보는 하루를 보내세요. 무리한 행동보다 쉬는 것이 최선입니다.',
  }
  if (score <= 20) return {
    emoji: '😟',
    title: '흉한날',
    message: '오늘은 자중하는 것이 좋습니다. 투자나 중요한 약속은 가급적 피하고, 말과 행동을 신중히 하세요. 인내심을 발휘하면 내일이 더 나아질 것입니다.',
  }
  if (score <= 30) return {
    emoji: '😕',
    title: '흉한날',
    message: '주변 환경이 다소 불안정합니다. 새로운 도전보다는 현재 일을 마무리하는 데 집중하세요. 가까운 사람과의 소통으로 안정을 찾는 것이 좋습니다.',
  }
  if (score <= 40) return {
    emoji: '😐',
    title: '흉한날',
    message: '특별히 좋지도 나쁘지도 않은 하루입니다. 일상적인 업무에 충실하고, 큰 기대나 걱정 없이 차분하게 지내세요. 소소한 즐거움을 찾아보는 하루입니다.',
  }
  if (score <= 50) return {
    emoji: '🙂',
    title: '평범한날',
    message: '무난한 하루가 예상됩니다. 평소 하던 일을 꾸준히 이어가면 좋습니다. 작은 준비와 노력이 나중에 좋은 결과로 이어질 수 있습니다.',
  }
  if (score <= 60) return {
    emoji: '😊',
    title: '평범한날',
    message: '오늘은 운기가 서서히 올라오고 있습니다. 미뤄두었던 일을 처리하거나 새로운 계획을 세우기 좋은 날입니다. 긍정적인 마음으로 임해보세요.',
  }
  if (score <= 70) return {
    emoji: '😄',
    title: '운수좋은날',
    message: '운기가 좋은 날입니다. 평소 망설이던 일을 시작하거나 중요한 만남을 갖기에 좋습니다. 적극적으로 행동하면 좋은 결과를 얻을 수 있습니다.',
  }
  if (score <= 80) return {
    emoji: '😁',
    title: '운수좋은날',
    message: '오늘은 강한 운기가 흐르고 있습니다. 도전적인 목표를 세우고 실행에 옮기기 좋습니다. 주변 사람들과의 협력도 큰 시너지를 낼 수 있습니다.',
  }
  if (score <= 90) return {
    emoji: '🤩',
    title: '운수대통',
    message: '매우 강한 행운의 기운이 함께합니다. 중요한 결정, 새 출발, 만남 모두 오늘이 적기입니다. 자신감을 갖고 적극적으로 나아가세요!',
  }
  return {
    emoji: '🌟',
    title: '운수대통',
    message: '하늘의 기운이 가득한 최고의 날입니다! 오래 준비해온 일을 실행하거나 인생의 큰 전환점을 맞이하기에 더없이 좋은 날입니다. 로또도 도전해보세요!',
  }
}

// ── 이번 달 운기 달력 ──────────────────────────────────────
function MonthCalendar({ yongsin, iljuChar }: { yongsin: string; iljuChar: string }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState<Date | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7  // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const selectedScore = selected ? getFortuneScore(yongsin, selected) : null
  const selectedComment = selected && selectedScore !== null ? getScoreComment(selectedScore) : null

  const bestDays: { day: number; score: number; dow: string }[] = []
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const score = getFortuneScore(yongsin, date)
    if (score >= 75) bestDays.push({ day: d, score, dow: DOW[date.getDay()] })
  }
  bestDays.sort((a, b) => b.score - a.score)

  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', fontSize: 20, color: '#555' }}>‹</button>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>
          📅 {year}년 {month + 1}월 운기 달력
        </p>
        <button onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 8px', fontSize: 20, color: '#555' }}>›</button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['월','화','수','목','금','토','일'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, color: '#aaa', paddingBottom: 4 }}>{d}</div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} />
          const score = getFortuneScore(yongsin, date)
          const isToday = date.getTime() === today.getTime()
          const isSelected = selected?.getTime() === date.getTime()
          const isBest = score >= 80
          const bg = isSelected ? '#333' : score >= 80 ? '#dc1f1f' : score >= 65 ? '#007bc3' : score >= 50 ? '#e4a816' : '#e0e0e0'
          const textColor = score >= 50 ? '#fff' : '#888'
          return (
            <button key={date.getDate()} onClick={() => setSelected(isSelected ? null : date)} style={{
              height: 40, borderRadius: 4, background: bg, color: isSelected ? '#fff' : textColor,
              border: isToday ? '2px solid #000' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 900 : 500, lineHeight: 1 }}>{date.getDate()}</span>
              {isBest && <span style={{ fontSize: 8, lineHeight: 1 }}>★</span>}
            </button>
          )
        })}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        {[['#dc1f1f', '대길(80+)'], ['#007bc3', '중길(65+)'], ['#e4a816', '평길(50+)'], ['#e0e0e0', '흉(~49)']].map(([color, label]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, color: '#888' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* 선택된 날 상세 */}
      {selected && selectedComment && (
        <div style={{ background: '#f7f7f7', borderRadius: 4, padding: '10px 12px', marginTop: 10, border: '1px solid #e0e0e0' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>
            {selected.getMonth() + 1}월 {selected.getDate()}일 {DOW[selected.getDay()]}요일
            <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 8 }}>운기 {selectedScore}점</span>
          </p>
          <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>
            {selectedComment.emoji} {selectedComment.title} — {selectedComment.message}
          </p>
        </div>
      )}

      {/* 구매 추천일 */}
      {bestDays.length > 0 && (
        <div style={{ background: '#fff5e6', borderRadius: 4, padding: '10px 12px', marginTop: 10, border: '1px solid #f5a623' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#e03f0e', marginBottom: 6 }}>
            ★ {month + 1}월 구매 추천일
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {bestDays.slice(0, 6).map(({ day, score, dow }) => (
              <span key={day} style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                background: score >= 80 ? '#dc1f1f' : '#007bc3',
                padding: '3px 10px', borderRadius: 10,
              }}>
                {day}일({dow}) {score}점
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FortunePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const today = new Date()

  // 날짜 선택 상태 (오늘 ~ 7일 후)
  const [selectedDate, setSelectedDate] = useState(0) // 0 = 오늘, 1~7 = 오늘 이후 N일

  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + selectedDate)
  const isToday = selectedDate === 0
  const DOW = ['일', '월', '화', '수', '목', '금', '토']
  const dow = DOW[targetDate.getDay()]
  const dateLabel = isToday ? '오늘' : `${selectedDate}일 후`
  const dateStr = `${targetDate.getFullYear()}년 ${targetDate.getMonth() + 1}월 ${targetDate.getDate()}일 (${dow})`

  const { data: profile, isLoading } = useQuery<SajuProfile | null>({
    queryKey: ['saju-profile-fortune'],
    queryFn: async () => {
      const res = await fetch('/api/saju/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session,
  })

  if (status === 'loading' || isLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4, margin: '0 auto' }} />
      </div>
    )
  }

  if (!session) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>☯</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 8 }}>로그인이 필요합니다</p>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>로그인 후 오늘의 운세를 확인하세요</p>
        <Link href="/login" style={{
          display: 'inline-block', padding: '10px 28px',
          background: '#007bc3', color: '#fff',
          fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 2,
        }}>
          로그인
        </Link>
      </div>
    )
  }

  if (!profile?.ilju) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 8 }}>사주 정보가 없습니다</p>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>생년월일을 입력하면 오늘의 운세를 볼 수 있어요</p>
        <button onClick={() => router.push('/mypage/edit')} style={{
          padding: '10px 28px',
          background: '#007bc3', color: '#fff',
          fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 2, cursor: 'pointer',
        }}>
          사주 정보 입력하기
        </button>
      </div>
    )
  }

  const { ilju, yongsin, ohaeng, cheonjigan } = profile
  const weakArr = yongsin ? yongsin.split(',').filter(Boolean) : []
  const primaryYongsin = weakArr[0] || ''
  const iljuChar = ilju?.[0] || ''
  const iljuJiji = ilju?.[1] || ''
  const iljuInfo = ILJU_FULL[iljuChar]
  const ohaengEntries = ohaeng ? Object.entries(ohaeng).sort((a, b) => b[1] - a[1]) : []
  const totalOhaeng = ohaengEntries.reduce((s, [, v]) => s + v, 0)
  const fortuneScore = getFortuneScore(primaryYongsin, targetDate)
  const scoreComment = getScoreComment(fortuneScore)

  const scoreColor =
    fortuneScore >= 81 ? '#dc1f1f' :
    fortuneScore >= 61 ? '#007bc3' :
    fortuneScore >= 41 ? '#e4a816' : '#888'

  return (
    <div>
      {/* ── 날짜 선택 + 운세 점수 ── */}
      <div style={{
        background: '#007bc3', padding: '20px 16px 24px',
        textAlign: 'center',
      }}>
        {/* 날짜 선택 버튼 */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {Array.from({ length: 8 }, (_, i) => {
            const d = new Date(today)
            d.setDate(today.getDate() + i)
            const dayStr = DOW[d.getDay()]
            const label = `${d.getMonth() + 1}/${d.getDate()}(${dayStr})`
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(i)}
                style={{
                  padding: '4px 10px', borderRadius: 14,
                  background: selectedDate === i ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: selectedDate === i ? '#007bc3' : '#fff',
                  fontSize: 12, fontWeight: selectedDate === i ? 700 : 500,
                  border: 'none', cursor: 'pointer',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* 날짜 표시 */}
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 6 }}>
          {dateStr} {isToday ? '오늘의 운세' : `운세 미리보기`}
        </p>

        {/* 점수 원 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          border: '3px solid rgba(255,255,255,0.5)',
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 34, fontWeight: 900, color: '#fff' }}>{fortuneScore}</span>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>100점 만점</p>

        {/* 점수 구간 멘트 */}
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '12px 16px',
          margin: '0 4px',
        }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{scoreComment.emoji} {scoreComment.title}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7 }}>
            {scoreComment.message}
          </p>
        </div>
      </div>

      {/* ── 4주 8자 ── */}
      {cheonjigan && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>사주팔자 (四柱八字)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: '시주', pillar: cheonjigan.hour, empty: '시(時)불명' },
              { label: '일주', pillar: cheonjigan.day, empty: '' },
              { label: '월주', pillar: cheonjigan.month, empty: '' },
              { label: '년주', pillar: cheonjigan.year, empty: '' },
            ].map(({ label, pillar, empty }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{label}</p>
                {pillar ? (
                  <>
                    <div style={{
                      width: 44, height: 44, margin: '0 auto 4px',
                      background: label === '일주' ? (primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3') : '#f5f5f5',
                      border: `1px solid ${label === '일주' ? 'transparent' : '#e0e0e0'}`,
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 900,
                      color: label === '일주' ? '#fff' : '#333',
                    }}>
                      {pillar.cheongan}
                    </div>
                    <div style={{
                      width: 44, height: 44, margin: '0 auto',
                      background: '#f5f5f5', border: '1px solid #e0e0e0',
                      borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, fontWeight: 700, color: '#333',
                    }}>
                      {pillar.jiji}
                    </div>
                    <p style={{ fontSize: 9, color: '#888', marginTop: 4 }}>
                      {JIJI_MEANING[pillar.jiji] || pillar.jiji}
                    </p>
                  </>
                ) : (
                  <div style={{ padding: '8px 0', fontSize: 11, color: '#bbb' }}>{empty}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 일주 분석 ── */}
      <div style={{ padding: '0 16px', marginTop: 8 }}><AdSlot /></div>
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 4, flexShrink: 0,
            background: primaryYongsin ? OHAENG_COLOR[primaryYongsin] : '#007bc3',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{ilju}</span>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 2 }}>{ilju}일주</p>
            <p style={{ fontSize: 12, color: '#888' }}>{JIJI_MEANING[iljuJiji] || iljuJiji} 띠 기운</p>
          </div>
        </div>

        {iljuInfo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: '#f7fbff', borderRadius: 4, padding: '10px 12px', borderLeft: '3px solid #007bc3' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 4 }}>✨ 성격 · 특성</p>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.7 }}>{iljuInfo.trait}</p>
            </div>
            <div style={{ background: '#f7fff7', borderRadius: 4, padding: '10px 12px', borderLeft: '3px solid #5bb544' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#5bb544', marginBottom: 4 }}>🍀 {dateLabel} 운세</p>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.7 }}>{getDailyFortune(iljuChar, targetDate)}</p>
            </div>
            <div style={{ background: '#fffbf0', borderRadius: 4, padding: '10px 12px', borderLeft: '3px solid #e4a816' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#e4a816', marginBottom: 4 }}>⚠️ 주의사항</p>
              <p style={{ fontSize: 12, color: '#444', lineHeight: 1.7 }}>{getDailyCaution(iljuChar, targetDate)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 오행 분석 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>오행 분포 (五行)</p>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {ohaengEntries.map(([el, val]) => (
            <div key={el} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: Math.max(8, (val / totalOhaeng) * 60 + 8), borderRadius: '3px 3px 0 0',
                background: OHAENG_COLOR[el] || '#ddd',
                marginBottom: 4, transition: 'height 0.3s',
              }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: OHAENG_COLOR[el] || '#888' }}>
                {el}({OHAENG_HANJA[el]})
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{val}</p>
            </div>
          ))}
        </div>
        {weakArr.length > 0 && (
          <div style={{ background: '#f5f5f5', borderRadius: 4, padding: '10px 12px' }}>
            <p style={{ fontSize: 12, color: '#333', lineHeight: 1.7 }}>
              {weakArr.map((w, i) => (
                <span key={w}>
                  <strong style={{ color: OHAENG_COLOR[w] }}>{i === 0 ? '핵심' : '보조'} 부족: {w}({OHAENG_HANJA[w]})</strong>
                  {i < weakArr.length - 1 ? ' · ' : ''}
                </span>
              ))}
              {' '}— 이 기운을 보충하면 운이 상승합니다
            </p>
          </div>
        )}
      </div>

      {/* ── 오늘의 행운 정보 ── */}
      <div style={{ padding: '0 16px', marginTop: 8 }}><AdSlot /></div>

      {/* ── 이번 달 운기 달력 ── */}
      <MonthCalendar yongsin={primaryYongsin} iljuChar={iljuChar} />
      {primaryYongsin && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>🍀 {dateLabel} 행운</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: '행운 번호', value: getDailyLuckyNums(primaryYongsin, iljuChar, targetDate), icon: '🔢' },
              { label: '행운 색상', value: getDailyLuckyColor(primaryYongsin, iljuChar, targetDate), icon: '🎨' },
              { label: '행운 방위', value: getDailyLuckyDir(primaryYongsin, iljuChar, targetDate), icon: '🧭' },
              { label: '행운 오행', value: getDailyLuckyEl(primaryYongsin, iljuChar, targetDate), icon: '⚡' },
            ].map(({ label, value, icon }) => (
              <div key={label} style={{
                background: '#f7f7f7', borderRadius: 4,
                padding: '10px 12px',
                border: '1px solid #eee',
              }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{icon} {label}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 로또 번호 생성 유도 ── */}
      <div style={{
        background: '#007bc3', padding: '20px 16px',
        textAlign: 'center', marginTop: 8, marginBottom: 8,
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {dateLabel} 운세를 바탕으로 번호를 뽑아보세요!
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 14 }}>
          부족한 기운({weakArr.join('·')})의 수리로 이번 주 행운 번호를 추천드립니다
        </p>
        <Link href="/home" style={{
          display: 'inline-block', padding: '10px 28px',
          background: '#fff', color: '#007bc3',
          fontSize: 14, fontWeight: 700, textDecoration: 'none',
          borderRadius: 2,
        }}>
          홈에서 번호 뽑기 →
        </Link>
      </div>

      <div style={{ padding: '0 16px', marginBottom: 8 }}><AdSlot /></div>
    </div>
  )
}
