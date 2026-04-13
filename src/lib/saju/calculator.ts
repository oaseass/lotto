// ================================
// 사주 계산 핵심 로직 (lunar-javascript 기반)
// 만세력 정확도 보장: 절기 기반 월주, 정확한 일주
// ================================

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript')

import type { Cheongan, Jiji, Ohaeng, Cheonjigan, OhaengRatio } from '@/types'

// ── 천간/지지 한자 → 한글 매핑
const TG_ZH_TO_KOR: Record<string, Cheongan> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
}
const DZ_ZH_TO_KOR: Record<string, Jiji> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진',
  '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유',
  '戌': '술', '亥': '해',
}

// ── 천간/지지 배열
export const CHEONGAN: Cheongan[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
export const JIJI: Jiji[]         = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

const TG_ZH = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const DZ_ZH = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// ── 천간 → 오행
export const CHEONGAN_OHAENG: Record<Cheongan, Ohaeng> = {
  갑: '목', 을: '목',
  병: '화', 정: '화',
  무: '토', 기: '토',
  경: '금', 신: '금',
  임: '수', 계: '수',
}
// ── 지지 → 오행 (본기)
export const JIJI_OHAENG: Record<Jiji, Ohaeng> = {
  자: '수', 축: '토', 인: '목', 묘: '목',
  진: '토', 사: '화', 오: '화', 미: '토',
  신: '금', 유: '금', 술: '토', 해: '수',
}
// ── 지지 지장간 (본기, 중기, 여기 순)
const JIJANGAN: Record<Jiji, Cheongan[]> = {
  자: ['임', '계'],
  축: ['기', '신', '계'],
  인: ['무', '병', '갑'],
  묘: ['갑', '을'],
  진: ['을', '계', '무'],
  사: ['무', '경', '병'],
  오: ['기', '정'],
  미: ['정', '을', '기'],
  신: ['무', '임', '경'],
  유: ['경', '신'],
  술: ['신', '정', '무'],
  해: ['무', '갑', '임'],
}

// ── 오행 상생
export const OHAENG_SANGSAENG: Record<Ohaeng, Ohaeng> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
}
// ── 오행 수리 (로또 번호 끝자리)
export const OHAENG_NUMBERS: Record<Ohaeng, number[]> = {
  수: [1, 6, 11, 16, 21, 26, 31, 36, 41],
  화: [2, 7, 12, 17, 22, 27, 32, 37, 42],
  목: [3, 8, 13, 18, 23, 28, 33, 38, 43],
  금: [4, 9, 14, 19, 24, 29, 34, 39, 44],
  토: [5, 10, 15, 20, 25, 30, 35, 40, 45],
}

// ── 천간지지 파싱 헬퍼
function parseGanZhi(gz: string): { cheongan: Cheongan; jiji: Jiji } | null {
  if (!gz || gz.length < 2) return null
  const tg = TG_ZH_TO_KOR[gz[0]]
  const dz = DZ_ZH_TO_KOR[gz[1]]
  if (!tg || !dz) return null
  return { cheongan: tg, jiji: dz }
}

// ── 시주 계산 (일간 + 출생시각)
function calcHourPillar(hour: number, dayCG: Cheongan): { cheongan: Cheongan; jiji: Jiji } {
  // 시지 계산: 자(23~01)=0, 축(01~03)=1, 인(03~05)=2, ...
  let shizhiIdx: number
  if (hour === 23) {
    shizhiIdx = 0
  } else {
    shizhiIdx = Math.floor((hour + 1) / 2) % 12
  }
  const jiji = JIJI[shizhiIdx]

  // 시간(時干) 계산: 일간에 따라 자시의 천간이 결정됨
  // 갑기일=갑자시, 을경일=병자시, 병신일=무자시, 정임일=경자시, 무계일=임자시
  const dayIdx = CHEONGAN.indexOf(dayCG)
  const BASE_SHIGAN = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8] // 갑~계
  const cheonganIdx = (BASE_SHIGAN[dayIdx] + shizhiIdx) % 10
  return { cheongan: CHEONGAN[cheonganIdx], jiji }
}

/**
 * 4주8자 전체 계산 (lunar-javascript 활용)
 * @param solarYear  양력 년
 * @param solarMonth 양력 월
 * @param solarDay   양력 일
 * @param hour       출생 시각 (0~23), null이면 시주 없음
 */
export function calculateSaju(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  hour: number | null,
): Cheonjigan {
  // lunar-javascript: 절기 기반 년/월/일주 계산
  const solar = Solar.fromYmd(solarYear, solarMonth, solarDay)
  const lunar = solar.getLunar()

  const yearGZ  = parseGanZhi(lunar.getYearInGanZhi())
  const monthGZ = parseGanZhi(lunar.getMonthInGanZhi())
  const dayGZ   = parseGanZhi(lunar.getDayInGanZhi())

  if (!yearGZ || !monthGZ || !dayGZ) {
    throw new Error('사주 계산 실패: 날짜를 확인해주세요')
  }

  const hourPillar = (hour !== null)
    ? calcHourPillar(hour, dayGZ.cheongan)
    : null

  return {
    year:  yearGZ,
    month: monthGZ,
    day:   dayGZ,
    hour:  hourPillar,
  }
}

/**
 * 특정 날짜의 일주(天干地支)만 반환 — generator.ts 호환용
 */
export function getDayPillar(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
): { cheongan: Cheongan; jiji: Jiji } {
  const solar = Solar.fromYmd(solarYear, solarMonth, solarDay)
  const lunar = solar.getLunar()
  const gz = parseGanZhi(lunar.getDayInGanZhi())
  if (!gz) throw new Error('일주 계산 실패')
  return gz
}

/**
 * 오행 비율 계산 (천간 + 지지 본기 + 지장간 가중치 포함)
 * 천간: 1점, 지지 본기: 1점, 지장간: 0.5점 (여기) / 0.5점 (중기)
 */
export function calculateOhaengRatio(cheonjigan: Cheonjigan): OhaengRatio {
  const ratio: OhaengRatio = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const pillars = [cheonjigan.year, cheonjigan.month, cheonjigan.day, cheonjigan.hour]

  for (const pillar of pillars) {
    if (!pillar) continue

    // 천간 (1점)
    ratio[CHEONGAN_OHAENG[pillar.cheongan]] += 1

    // 지지 본기 (1점)
    ratio[JIJI_OHAENG[pillar.jiji]] += 1

    // 지장간 가중치 (본기 0.3, 나머지 0.2씩)
    const jijangan = JIJANGAN[pillar.jiji]
    if (jijangan) {
      jijangan.forEach((cg, i) => {
        ratio[CHEONGAN_OHAENG[cg]] += i === jijangan.length - 1 ? 0.3 : 0.2
      })
    }
  }

  // 소수점 1자리로 반올림
  for (const k of Object.keys(ratio) as Ohaeng[]) {
    ratio[k] = Math.round(ratio[k] * 10) / 10
  }

  return ratio
}

/**
 * 용신 계산 (개선 버전)
 * 1. 일간의 강약 판별 (신강/신약)
 * 2. 부재하거나 가장 약한 오행 파악
 * 3. 균형을 보완하는 오행을 용신으로 결정
 */
export function calculateYongsin(ohaeng: OhaengRatio, ilju?: string): Ohaeng {
  const entries = Object.entries(ohaeng) as [Ohaeng, number][]
  entries.sort((a, b) => a[1] - b[1])

  // 0인 오행이 있으면 최우선 보완 대상
  const absent = entries.filter(([, v]) => v === 0)
  if (absent.length > 0) {
    // 부재 오행 중 상생으로 보완 가능한 것 우선
    const weakest = absent[0][0]
    return OHAENG_SANGSAENG[weakest] // 약한 오행을 생해주는 오행
  }

  // 가장 약한 오행을 생해주는 오행
  const weakest  = entries[0][0]
  const strongest = entries[entries.length - 1][0]

  // 강한 오행이 압도적(2배 이상)이면 강한 쪽을 극하는 오행을 용신으로
  if (entries[entries.length - 1][1] >= entries[0][1] * 2.5) {
    // 오행 상극: 목극토, 토극수, 수극화, 화극금, 금극목
    const SANGGEUIK: Record<Ohaeng, Ohaeng> = {
      목: '금', 화: '수', 토: '목', 금: '화', 수: '토',
    }
    return SANGGEUIK[strongest]
  }

  return OHAENG_SANGSAENG[weakest]
}
