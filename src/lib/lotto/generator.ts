// ================================
// 로또 번호 생성 로직 (사주 기반)
// ================================

import {
  OHAENG_NUMBERS,
  OHAENG_SANGSAENG,
  getDayPillar,
  JIJI_OHAENG,
  CHEONGAN_OHAENG,
  calculateYongsin,
} from '@/lib/saju/calculator'
import type { Cheonjigan, OhaengRatio, Ohaeng } from '@/types'

/**
 * 사주 기반 로또 번호 생성 (결정론적 - 같은 사주+날짜 = 같은 번호)
 */
export function generateLottoNumbers(
  cheonjigan: Cheonjigan,
  ohaeng: OhaengRatio,
  targetDate: Date
): number[] {
  const yongsin = calculateYongsin(ohaeng)
  const sangsaeng = OHAENG_SANGSAENG[yongsin]

  // 조회 날짜의 일진
  const todayPillar = getDayPillar(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    targetDate.getDate()
  )
  const todayOhaeng = JIJI_OHAENG[todayPillar.jiji]
  const todayCheonganOhaeng = CHEONGAN_OHAENG[todayPillar.cheongan]

  // 번호 풀 구성 (용신 + 상생 + 오늘 일진 오행)
  const primaryPool = OHAENG_NUMBERS[yongsin]       // 용신 오행 번호 (3개)
  const secondaryPool = OHAENG_NUMBERS[sangsaeng]   // 상생 오행 번호 (2개)
  const todayPool = OHAENG_NUMBERS[todayOhaeng]     // 오늘 일진 오행 (1개)

  // 시드 생성 (사주 + 날짜 기반 결정론적)
  const seed = createSeed(cheonjigan, targetDate)

  // 각 풀에서 번호 추출
  const numbers = new Set<number>()

  // 용신 오행에서 3개
  pickFromPool(primaryPool, 3, seed, numbers)
  // 상생 오행에서 2개
  pickFromPool(secondaryPool, 2, seed + 1, numbers)
  // 오늘 일진에서 1개
  pickFromPool(todayPool, 1, seed + 2, numbers)

  // 6개 미만이면 보완
  if (numbers.size < 6) {
    const allPool = OHAENG_NUMBERS[todayCheonganOhaeng]
    pickFromPool(allPool, 6 - numbers.size, seed + 3, numbers)
  }

  return Array.from(numbers).sort((a, b) => a - b)
}

/**
 * 시드 생성 (사주 기반 + 호출 시각으로 매번 다른 번호)
 */
function createSeed(cheonjigan: Cheonjigan, targetDate: Date): number {
  const dateNum = targetDate.getFullYear() * 10000 +
    (targetDate.getMonth() + 1) * 100 +
    targetDate.getDate()

  const ilju = cheonjigan.day
  const ilja = ilju.cheongan.charCodeAt(0) + ilju.jiji.charCodeAt(0)

  // 밀리초 단위 시각을 더해 매 호출마다 다른 시드
  const timeSeed = Date.now() % 99991

  return (dateNum + ilja + timeSeed) % 99991
}

/**
 * LCG 난수 생성기 (시드 기반)
 */
function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/**
 * 풀에서 n개 추출
 */
function pickFromPool(
  pool: number[],
  count: number,
  seed: number,
  result: Set<number>
): void {
  const rand = lcg(seed)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  let added = 0
  for (const num of shuffled) {
    if (added >= count) break
    if (!result.has(num) && num >= 1 && num <= 45) {
      result.add(num)
      added++
    }
  }
}

/**
 * 번호 근거 텍스트 생성용 프롬프트 데이터
 */
export function buildReasonPrompt(
  cheonjigan: Cheonjigan,
  ohaeng: OhaengRatio,
  numbers: number[],
  targetDate: Date,
  yongsin: Ohaeng
): string {
  const todayPillar = getDayPillar(
    targetDate.getFullYear(),
    targetDate.getMonth() + 1,
    targetDate.getDate()
  )

  return `당신은 사주명리학 전문가입니다. 다음 사주 정보를 바탕으로 로또 번호가 선택된 이유를 한국어로 간결하게 2~3문장으로 설명해주세요.

사주 정보:
- 일주: ${cheonjigan.day.cheongan}${cheonjigan.day.jiji}
- 오행 분포: 목${ohaeng.목} 화${ohaeng.화} 토${ohaeng.토} 금${ohaeng.금} 수${ohaeng.수}
- 용신: ${yongsin}
- 오늘 일진: ${todayPillar.cheongan}${todayPillar.jiji}

선택된 번호: ${numbers.join(', ')}

설명은 전문적이고 신뢰감 있게 작성하되, 어렵지 않게 일반인도 이해할 수 있도록 해주세요.`
}

/**
 * QR 코드에서 로또 번호 파싱
 * 동행복권 QR 형식: https://m.dhlottery.co.kr/qr.do?method=winQr&v=1162q031522273241q...
 */
export function parseQrCode(qrData: string): {
  round: number
  sets: number[][]
} | null {
  try {
    const url = new URL(qrData)
    const v = url.searchParams.get('v')
    if (!v) return null

    // v 파라미터 파싱: 회차q번호6개q번호6개...
    const parts = v.split('q')
    const round = parseInt(parts[0])
    const sets: number[][] = []

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.length === 12) {
        // 6개 번호 (각 2자리)
        const nums: number[] = []
        for (let j = 0; j < 12; j += 2) {
          nums.push(parseInt(part.substring(j, j + 2)))
        }
        sets.push(nums)
      }
    }

    return { round, sets }
  } catch {
    return null
  }
}

/**
 * 당첨 결과 계산
 */
export function calculateResult(
  scannedSets: number[][],
  drawNumbers: number[],
  bonusNumber: number
): Array<{
  set: number
  rank: number | null
  matchedNumbers: number[]
  bonusMatch: boolean
  prize: number
}> {
  return scannedSets.map((set, idx) => {
    const matched = set.filter(n => drawNumbers.includes(n))
    const bonusMatch = set.includes(bonusNumber)
    const matchCount = matched.length

    let rank: number | null = null
    if (matchCount === 6) rank = 1
    else if (matchCount === 5 && bonusMatch) rank = 2
    else if (matchCount === 5) rank = 3
    else if (matchCount === 4) rank = 4
    else if (matchCount === 3) rank = 5

    // 고정 당첨금 (5등만 고정, 나머지는 변동)
    const prize = rank === 5 ? 5000 : 0

    return {
      set: idx + 1,
      rank,
      matchedNumbers: matched,
      bonusMatch,
      prize,
    }
  })
}
