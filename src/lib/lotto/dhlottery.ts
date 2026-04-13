// ================================
// 로또 당첨번호 API 연동 (api.lotto-haru.kr)
// ================================

const LOTTO_HARU_BASE = 'https://api.lotto-haru.kr'

export interface LottoDrawData {
  round: number
  drawDate: string      // 'YYYY-MM-DD'
  numbers: number[]    // [n1, n2, n3, n4, n5, n6]
  bonus: number
  prize1st: number     // 1등 당첨금 (원)
  winners1st: number   // 1등 당첨자 수
  prize2nd: number
  winners2nd: number
}

interface HaruAnalysisItem {
  chasu: number
  date: string
  ball: number[]
  bonusBall: number
  win: {
    win1: { count: number; payout: number }
    win2: { count: number; payout: number }
  }
}

async function fetchHaru(path: string): Promise<HaruAnalysisItem[] | null> {
  try {
    const res = await fetch(`${LOTTO_HARU_BASE}${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    return data as HaruAnalysisItem[]
  } catch {
    return null
  }
}

/**
 * 특정 회차 당첨 번호 조회
 */
export async function fetchLottoDraw(round: number): Promise<LottoDrawData | null> {
  const items = await fetchHaru(`/win/analysis.json?chasu=${round}`)
  if (!items) return null
  return parseHaruItem(items[0])
}

/**
 * 최신 회차 당첨 번호 조회
 */
export async function fetchLatestDraw(): Promise<LottoDrawData | null> {
  const items = await fetchHaru('/win/analysis.json')
  if (!items) return null
  return parseHaruItem(items[0])
}

/**
 * 현재 날짜 기반 회차 추정 (1회차: 2002-12-07)
 */
export function estimateCurrentRound(): number {
  const BASE_DATE = new Date('2002-12-07')
  const today = new Date()
  const diffMs = today.getTime() - BASE_DATE.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks + 1
}

function parseHaruItem(item: HaruAnalysisItem): LottoDrawData {
  return {
    round: item.chasu,
    drawDate: item.date,
    numbers: item.ball,
    bonus: item.bonusBall,
    prize1st: item.win?.win1?.payout ?? 0,
    winners1st: item.win?.win1?.count ?? 0,
    prize2nd: item.win?.win2?.payout ?? 0,
    winners2nd: item.win?.win2?.count ?? 0,
  }
}

/**
 * LottoDrawData → DB 저장 형식 변환
 */
export function parseDraw(data: LottoDrawData) {
  return {
    round: data.round,
    drawDate: new Date(data.drawDate),
    numbers: data.numbers,
    bonus: data.bonus,
    prize1st: BigInt(Math.round(data.prize1st)),
    winners1st: data.winners1st,
    prize2nd: BigInt(Math.round(data.prize2nd)),
    winners2nd: data.winners2nd,
  }
}

// ─── 하위 호환용 타입 alias ───────────────────────────────
export type DhLotteryResponse = LottoDrawData
