// ================================
// 대운(大運) / 세운(歲運) 계산 로직
// 명리학 원칙 기반
// ================================

const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']

// 60갑자 순서
const SIXTY_GANJI = [
  '갑자', '을축', '병인', '정묘', '무진', '기사', '경오', '신미', '임신', '계유',
  '갑술', '을해', '병자', '정축', '무인', '기묘', '경진', '신사', '임오', '계미',
  '갑신', '을유', '병술', '정해', '무자', '기축', '경인', '신묘', '임진', '계사',
  '갑오', '을미', '병신', '정유', '무술', '기해', '경자', '신축', '임인', '계묘',
  '갑진', '을사', '병오', '정미', '무신', '기유', '경술', '신해', '임자', '계축',
  '갑인', '을묘', '병진', '정사', '무오', '기미', '경신', '신유', '임술', '계해',
]

// 한자 매핑
const GANJI_HANJA: Record<string, string> = {
  '갑자': '甲子', '을축': '乙丑', '병인': '丙寅', '정묘': '丁卯', '무진': '戊辰', '기사': '己巳',
  '경오': '庚午', '신미': '辛未', '임신': '壬申', '계유': '癸酉', '갑술': '甲戌', '을해': '乙亥',
  '병자': '丙子', '정축': '丁丑', '무인': '戊寅', '기묘': '己卯', '경진': '庚辰', '신사': '辛巳',
  '임오': '壬午', '계미': '癸未', '갑신': '甲申', '을유': '乙酉', '병술': '丙戌', '정해': '丁亥',
  '무자': '戊子', '기축': '己丑', '경인': '庚寅', '신묘': '辛卯', '임진': '壬辰', '계사': '癸巳',
  '갑오': '甲午', '을미': '乙未', '병신': '丙申', '정유': '丁酉', '무술': '戊戌', '기해': '己亥',
  '경자': '庚子', '신축': '辛丑', '임인': '壬寅', '계묘': '癸卯', '갑진': '甲辰', '을사': '乙巳',
  '병오': '丙午', '정미': '丁未', '무신': '戊申', '기유': '己酉', '경술': '庚戌', '신해': '辛亥',
  '임자': '壬子', '계축': '癸丑', '갑인': '甲寅', '을묘': '乙卯', '병진': '丙辰', '정사': '丁巳',
  '무오': '戊午', '기미': '己未', '경신': '庚申', '신유': '辛酉', '임술': '壬戌', '계해': '癸亥',
}

export interface DaeunEntry {
  startAge: number
  cheongan: string
  jiji: string
  ganji: string
  hanja: string
  isCurrentDaeun: boolean
}

export interface DaeunResult {
  daeunsu: number
  direction: '순행' | '역행'
  entries: DaeunEntry[]
  currentAge: number
  seun: Array<{
    year: number
    age: number
    ganji: string
    hanja: string
    isCurrentYear: boolean
  }>
}

/**
 * 특정 연도의 세운(年干支) 계산
 * (year - 4) % 60 으로 60갑자 인덱스
 */
function getYearGanji(year: number): { ganji: string; hanja: string } {
  const idx = ((year - 4) % 60 + 60) % 60
  const ganji = SIXTY_GANJI[idx]
  return { ganji, hanja: GANJI_HANJA[ganji] ?? ganji }
}

/**
 * 월주 간지를 받아서 다음 간지(순행)를 반환
 */
function nextGanji(cheongan: string, jiji: string): { cheongan: string; jiji: string } {
  const cgIdx = CHEONGAN.indexOf(cheongan)
  const jjIdx = JIJI.indexOf(jiji)
  const nextCg = (cgIdx + 1) % 10
  const nextJj = (jjIdx + 1) % 12
  return { cheongan: CHEONGAN[nextCg], jiji: JIJI[nextJj] }
}

/**
 * 월주 간지를 받아서 이전 간지(역행)를 반환
 */
function prevGanji(cheongan: string, jiji: string): { cheongan: string; jiji: string } {
  const cgIdx = CHEONGAN.indexOf(cheongan)
  const jjIdx = JIJI.indexOf(jiji)
  const prevCg = (cgIdx - 1 + 10) % 10
  const prevJj = (jjIdx - 1 + 12) % 12
  return { cheongan: CHEONGAN[prevCg], jiji: JIJI[prevJj] }
}

/**
 * 간지 문자열 조합
 */
function makeGanji(cheongan: string, jiji: string): string {
  return cheongan + jiji
}

/**
 * 대운수 계산 (절기 근사값 사용: 매월 6일)
 */
function calcDaeunsu(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  isForward: boolean,
): number {
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay)

  let days: number

  if (isForward) {
    // 순행: 생일로부터 다음 절기(다음달 6일)까지 일수
    // 이번달 6일이 생일 이후면 이번달 6일을 쓰고, 아니면 다음달 6일
    let nextJeolgi = new Date(birthYear, birthMonth - 1, 6)
    if (nextJeolgi <= birthDate) {
      nextJeolgi = new Date(birthYear, birthMonth, 6)
    }
    days = Math.ceil((nextJeolgi.getTime() - birthDate.getTime()) / 86400000)
  } else {
    // 역행: 지난 절기(이번달 6일 또는 이전달 6일)부터 생일까지 일수
    let prevJeolgi = new Date(birthYear, birthMonth - 1, 6)
    if (prevJeolgi >= birthDate) {
      prevJeolgi = new Date(birthYear, birthMonth - 2, 6)
    }
    days = Math.ceil((birthDate.getTime() - prevJeolgi.getTime()) / 86400000)
  }

  const daeunsu = Math.round(days / 3)
  return Math.max(1, daeunsu)
}

/**
 * 대운/세운 전체 계산
 */
export function calculateDaeun(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  gender: 'M' | 'F',
  monthPillar: { cheongan: string; jiji: string },
  yearPillar: { cheongan: string; jiji: string },
): DaeunResult {
  // 년주 천간 양/음 판별: 갑,병,무,경,임 = 양(인덱스 0,2,4,6,8)
  const yearCgIdx = CHEONGAN.indexOf(yearPillar.cheongan)
  const isYangYear = yearCgIdx % 2 === 0

  // 양남/음녀 → 순행, 음남/양녀 → 역행
  const isForward = (gender === 'M' && isYangYear) || (gender === 'F' && !isYangYear)
  const direction: '순행' | '역행' = isForward ? '순행' : '역행'

  // 대운수 계산
  const daeunsu = calcDaeunsu(birthYear, birthMonth, birthDay, isForward)

  // 현재 나이
  const currentYear = new Date().getFullYear()
  const currentAge = currentYear - birthYear

  // 대운 10개 생성
  const entries: DaeunEntry[] = []
  let cg = monthPillar.cheongan
  let jj = monthPillar.jiji

  for (let i = 0; i < 10; i++) {
    const startAge = daeunsu + i * 10

    // 순행/역행에 따라 다음 간지 계산
    const next = isForward ? nextGanji(cg, jj) : prevGanji(cg, jj)
    cg = next.cheongan
    jj = next.jiji

    const ganji = makeGanji(cg, jj)
    const hanja = GANJI_HANJA[ganji] ?? ganji
    const isCurrentDaeun = startAge <= currentAge && currentAge < startAge + 10

    entries.push({
      startAge,
      cheongan: cg,
      jiji: jj,
      ganji,
      hanja,
      isCurrentDaeun,
    })
  }

  // 세운: 현재 연도 기준 -3년 ~ +6년 (총 10개)
  const seun = []
  for (let offset = -3; offset <= 6; offset++) {
    const year = currentYear + offset
    const age = year - birthYear
    const { ganji, hanja } = getYearGanji(year)
    seun.push({
      year,
      age,
      ganji,
      hanja,
      isCurrentYear: year === currentYear,
    })
  }

  return {
    daeunsu,
    direction,
    entries,
    currentAge,
    seun,
  }
}
