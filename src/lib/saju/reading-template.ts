// src/lib/saju/reading-template.ts
// DB 기반 무료 사주 통변 생성기

import { getIljuData } from './ilju-data'
import type { DaeunResult } from './daeun'
import type { OhaengRatio, Cheonjigan } from '@/types'

const OHAENG_DESC: Record<string, string> = {
  목: '성장과 도전', 화: '열정과 표현', 토: '안정과 신뢰', 금: '결단과 완성', 수: '지혜와 유연',
}
const OHAENG_LUCKY: Record<string, string> = {
  목: '3·8', 화: '2·7', 토: '5·10', 금: '4·9', 수: '1·6',
}
const OHAENG_COLOR: Record<string, string> = {
  목: '청색·녹색', 화: '적색·주황', 토: '황색·갈색', 금: '흰색·금색', 수: '흑색·청색',
}
const OHAENG_DIRECTION: Record<string, string> = {
  목: '동쪽', 화: '남쪽', 토: '중앙', 금: '서쪽', 수: '북쪽',
}
const JIJI_ANIMAL: Record<string, string> = {
  자: '쥐', 축: '소', 인: '범', 묘: '토끼', 진: '용', 사: '뱀',
  오: '말', 미: '양', 신: '원숭이', 유: '닭', 술: '개', 해: '돼지',
}
const CHEONGAN_DESC: Record<string, string> = {
  갑: '양목의 기운으로 강한 추진력', 을: '음목의 기운으로 섬세한 적응력',
  병: '양화의 기운으로 뜨거운 열정', 정: '음화의 기운으로 깊은 지혜',
  무: '양토의 기운으로 든든한 포용력', 기: '음토의 기운으로 세심한 성실함',
  경: '양금의 기운으로 강인한 결단력', 신: '음금의 기운으로 날카로운 통찰력',
  임: '양수의 기운으로 넓은 포부', 계: '음수의 기운으로 깊은 감수성',
}

// 오행 중 가장 강한/약한 것 찾기
function getStrongestOhaeng(ohaeng: OhaengRatio): string {
  return Object.entries(ohaeng).sort((a, b) => b[1] - a[1])[0][0]
}
function getWeakestOhaeng(ohaeng: OhaengRatio): string {
  return Object.entries(ohaeng).sort((a, b) => a[1] - b[1])[0][0]
}

export interface ReadingResult {
  sections: Record<string, string>
  ilju: string
  iljuHanja: string
  currentDaeun: string
  currentSeun: string
}

export function generateReading(
  cheonjigan: Cheonjigan,
  ohaeng: OhaengRatio,
  yongsin: string,
  daeunResult: DaeunResult,
  birthYear: number,
): ReadingResult {
  const ilju = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`
  const iljuInfo = getIljuData(ilju)
  const currentDaeun = daeunResult.entries.find(e => e.isCurrentDaeun)
  const currentSeun = daeunResult.seun.find(s => s.isCurrentYear)
  const strongest = getStrongestOhaeng(ohaeng)
  const weakest = getWeakestOhaeng(ohaeng)
  const currentYear = new Date().getFullYear()

  // ── 섹션 1: 성격과 재능 ──
  const ilganDesc = CHEONGAN_DESC[cheonjigan.day.cheongan] ?? ''
  const sec1 = [
    iljuInfo
      ? `${iljuInfo.hanja}(${ilju})일주로, ${iljuInfo.summary}. ${iljuInfo.personality}`
      : `${ilju}일주로, ${ilganDesc}을 타고났습니다.`,
    `사주에서 ${strongest}(${OHAENG_DESC[strongest] ?? ''}) 기운이 가장 강하여 ${OHAENG_DESC[strongest] ?? ''} 방면에서 두각을 나타냅니다.`,
    iljuInfo ? iljuInfo.career : `${ilganDesc}을 살려 전문 분야에서 역량을 발휘하세요.`,
  ].join(' ')

  // ── 섹션 2: 현재 운세 ──
  const daeunText = currentDaeun
    ? `현재 ${currentDaeun.ganji}(${currentDaeun.hanja}) 대운(${currentDaeun.startAge}세 시작)을 지나고 있습니다.`
    : `대운의 흐름을 살펴보면`
  const seunText = currentSeun
    ? `올해 ${currentYear}년은 ${currentSeun.ganji}(${currentSeun.hanja}) 세운으로, ${OHAENG_DESC[getSeunOhaeng(currentSeun.ganji)] ?? '변화와 성장'} 기운이 강한 해입니다.`
    : `올해는 변화와 성장의 기운이 흐릅니다.`
  const nextSeun = daeunResult.seun.find(s => s.year === currentYear + 1)
  const nextSeunText = nextSeun
    ? `내년 ${currentYear + 1}년 ${nextSeun.ganji} 세운을 미리 준비하면 좋습니다.`
    : ''
  const sec2 = [daeunText, seunText, nextSeunText].filter(Boolean).join(' ')

  // ── 섹션 3: 재물과 기회 ──
  const fortuneBase = iljuInfo?.fortune ?? `${ilju}일주는 꾸준한 노력으로 재물을 쌓습니다.`
  const luckyNum = OHAENG_LUCKY[yongsin] ?? ''
  const luckyColor = OHAENG_COLOR[yongsin] ?? ''
  const luckyDir = OHAENG_DIRECTION[yongsin] ?? ''
  const sec3 = [
    fortuneBase,
    `용신이 ${yongsin}(${OHAENG_DESC[yongsin] ?? ''})이므로 끝자리가 ${luckyNum}인 번호와 ${luckyColor} 계열이 행운을 부릅니다.`,
    `${luckyDir} 방향의 활동이 재물운을 높여줍니다.`,
  ].join(' ')

  // ── 섹션 4: 주의와 조언 ──
  const cautionBase = iljuInfo?.caution ?? `충동적인 결정보다 신중한 판단이 중요합니다.`
  const weakDesc = OHAENG_DESC[weakest] ?? ''
  const relText = iljuInfo?.relationship ?? '신뢰를 쌓는 인간관계가 중요합니다.'
  const sec4 = [
    cautionBase,
    `사주에서 ${weakest}(${weakDesc}) 기운이 상대적으로 약하니 이 부분을 보완하는 노력이 필요합니다.`,
    relText,
  ].join(' ')

  return {
    sections: {
      '성격과 재능': sec1,
      '현재 운세': sec2,
      '재물과 기회': sec3,
      '주의와 조언': sec4,
    },
    ilju,
    iljuHanja: iljuInfo?.hanja ?? '',
    currentDaeun: currentDaeun ? `${currentDaeun.ganji}(${currentDaeun.hanja})` : '',
    currentSeun: currentSeun ? `${currentSeun.ganji}(${currentSeun.hanja})` : '',
  }
}

// 세운 간지로 오행 추출 (첫 글자 천간 기준)
function getSeunOhaeng(ganji: string): string {
  const CHEONGAN_OHAENG: Record<string, string> = {
    갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
    기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
  }
  return CHEONGAN_OHAENG[ganji[0]] ?? '토'
}
