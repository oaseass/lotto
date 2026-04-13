// ================================
// 사주로또 타입 정의
// ================================

// 오행
export type Ohaeng = '목' | '화' | '토' | '금' | '수'

// 천간
export type Cheongan =
  | '갑' | '을' | '병' | '정' | '무'
  | '기' | '경' | '신' | '임' | '계'

// 지지
export type Jiji =
  | '자' | '축' | '인' | '묘' | '진' | '사'
  | '오' | '미' | '신' | '유' | '술' | '해'

// 사주 프로필
export interface SajuProfile {
  id: string
  userId: string
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null
  isLunar: boolean
  cheonjigan: Cheonjigan | null
  ohaeng: OhaengRatio | null
  ilju: string | null
  yongsin: Ohaeng | null
}

// 천간지지 4주8자
export interface Cheonjigan {
  year: { cheongan: Cheongan; jiji: Jiji }   // 년주
  month: { cheongan: Cheongan; jiji: Jiji }  // 월주
  day: { cheongan: Cheongan; jiji: Jiji }    // 일주
  hour: { cheongan: Cheongan; jiji: Jiji } | null // 시주
}

// 오행 비율
export interface OhaengRatio {
  목: number
  화: number
  토: number
  금: number
  수: number
}

// 로또 번호 세트
export interface LottoNumbers {
  id: string
  userId: string
  generatedDate: string
  numbers: number[]
  reason: string | null
  drawRound: number | null
  createdAt: string
}

// 로또 당첨 회차
export interface LottoDraw {
  id: string
  round: number
  drawDate: string
  numbers: number[]
  bonus: number
  prize1st: number | null
  winners1st: number | null
}

// QR 스캔 결과
export interface QrScanResult {
  id: string
  userId: string
  round: number
  scannedNumbers: ScannedSet[]
  result: ScanResultItem[] | null
  totalPrize: number
  scannedAt: string
}

export interface ScannedSet {
  set: number
  numbers: number[]
}

export interface ScanResultItem {
  set: number
  rank: number | null  // 1~5등, null = 낙첨
  matchedNumbers: number[]
  bonusMatch: boolean
  prize: number
}

// 번호 생성 요청
export interface GenerateRequest {
  userId: string
  targetDate: string  // YYYY-MM-DD
}

// 번호 생성 응답
export interface GenerateResponse {
  id: string
  numbers: number[]
  reason: string
  drawRound: number
  sajuInfo: {
    ilju: string
    yongsin: Ohaeng
    ohaeng: OhaengRatio
  }
}

// 사용자
export interface User {
  id: string
  email: string
  nickname: string
  gender: string | null
  isAdFree: boolean
  sajuProfile: SajuProfile | null
}
