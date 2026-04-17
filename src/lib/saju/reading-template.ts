// src/lib/saju/reading-template.ts
// DB 기반 사주 풀이 생성기

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
// 오행-신체 대응
const OHAENG_BODY: Record<string, string> = {
  목: '간과 담, 눈, 근육·힘줄',
  화: '심장과 소장, 혈액순환',
  토: '비장과 위, 소화기',
  금: '폐와 대장, 피부·호흡기',
  수: '신장과 방광, 뼈·귀',
}
// 오행 체질 특성
const OHAENG_CONSTITUTION: Record<string, string> = {
  목: '활동적이고 유연한 체질로 규칙적인 스트레칭과 간 건강 관리가 중요합니다',
  화: '열이 많은 체질로 과로를 피하고 충분한 수면과 심혈관 건강에 신경 쓰세요',
  토: '소화기가 약할 수 있으니 규칙적인 식사와 과음·과식을 조심하세요',
  금: '호흡기와 피부가 민감할 수 있으니 건조한 환경과 스트레스에 주의하세요',
  수: '신장·방광 관련 에너지가 중요하며 냉증·부종 예방을 위해 보온에 신경 쓰세요',
}
// 오행 맞는 직업군
const OHAENG_CAREER: Record<string, string> = {
  목: '교육, 의료, 환경, 식품, 출판·언론',
  화: '예술, 방송, 마케팅, 요식업, IT',
  토: '부동산, 금융, 농업, 건설, 행정',
  금: '법률, 의료기기, 제조, 금융·투자, 경찰·군인',
  수: '연구, 철학, 역술, 유통·무역, 수산업',
}
const CHEONGAN_DESC: Record<string, string> = {
  갑: '양목의 기운으로 강한 추진력', 을: '음목의 기운으로 섬세한 적응력',
  병: '양화의 기운으로 뜨거운 열정', 정: '음화의 기운으로 깊은 지혜',
  무: '양토의 기운으로 든든한 포용력', 기: '음토의 기운으로 세심한 성실함',
  경: '양금의 기운으로 강인한 결단력', 신: '음금의 기운으로 날카로운 통찰력',
  임: '양수의 기운으로 넓은 포부', 계: '음수의 기운으로 깊은 감수성',
}
const CHEONGAN_OHAENG: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
}

function getStrongestOhaeng(ohaeng: OhaengRatio): string {
  return Object.entries(ohaeng).sort((a, b) => b[1] - a[1])[0][0]
}
function getWeakestOhaeng(ohaeng: OhaengRatio): string {
  return Object.entries(ohaeng).sort((a, b) => a[1] - b[1])[0][0]
}
function getSeunOhaeng(ganji: string): string {
  return CHEONGAN_OHAENG[ganji[0]] ?? '토'
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
  const ilganDesc = CHEONGAN_DESC[cheonjigan.day.cheongan] ?? ''

  // ── 섹션 1: 성격과 재능 ──
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
  const seunOhaeng = currentSeun ? getSeunOhaeng(currentSeun.ganji) : ''
  const seunText = currentSeun
    ? `올해 ${currentYear}년은 ${currentSeun.ganji}(${currentSeun.hanja}) 세운으로, ${OHAENG_DESC[seunOhaeng] ?? '변화와 성장'} 기운이 강한 해입니다.`
    : `올해는 변화와 성장의 기운이 흐릅니다.`
  const nextSeun = daeunResult.seun.find(s => s.year === currentYear + 1)
  const nextSeunText = nextSeun
    ? `내년 ${currentYear + 1}년 ${nextSeun.ganji} 세운을 미리 준비하면 좋습니다.`
    : ''
  const daeunInteraction = currentDaeun && currentSeun
    ? `대운 ${currentDaeun.ganji}과 세운 ${currentSeun.ganji}의 흐름이 겹쳐 ${(getSeunOhaeng(currentDaeun.ganji) === getSeunOhaeng(currentSeun.ganji)) ? '같은 기운이 이중으로 작용하여 해당 분야가 특히 활발한 시기입니다.' : '서로 다른 기운이 교차하며 균형을 찾는 것이 중요합니다.'}`
    : ''
  const sec2 = [daeunText, seunText, daeunInteraction, nextSeunText].filter(Boolean).join(' ')

  // ── 섹션 3: 직업과 진로 ──
  const careerBase = iljuInfo?.career ?? `${ilganDesc}을 살려 전문 분야에서 역량을 발휘하세요.`
  const strongCareer = OHAENG_CAREER[strongest] ?? ''
  const yongsinCareer = OHAENG_CAREER[yongsin] ?? ''
  const sec3 = [
    careerBase,
    strongCareer ? `${strongest} 기운이 강한 사주는 ${strongCareer} 계열에서 강점을 발휘합니다.` : '',
    yongsinCareer ? `용신 ${yongsin} 기운을 활용한 ${yongsinCareer} 분야에서 특히 운이 뒷받침됩니다.` : '',
    currentDaeun ? `현재 ${currentDaeun.ganji} 대운 중 경력 전환이나 새로운 기회를 탐색하기 좋은 시기입니다.` : '',
  ].filter(Boolean).join(' ')

  // ── 섹션 4: 재물과 기회 ──
  const fortuneBase = iljuInfo?.fortune ?? `${ilju}일주는 꾸준한 노력으로 재물을 쌓습니다.`
  const luckyNum = OHAENG_LUCKY[yongsin] ?? ''
  const luckyColor = OHAENG_COLOR[yongsin] ?? ''
  const luckyDir = OHAENG_DIRECTION[yongsin] ?? ''
  const seunFinance = currentSeun
    ? `올해 ${seunOhaeng === yongsin ? `${currentSeun.ganji} 세운이 용신과 같은 기운으로 재물운이 활발합니다.` : `${currentSeun.ganji} 세운에 용신 에너지를 잘 활용하면 안정적인 수익을 기대할 수 있습니다.`}`
    : ''
  const sec4 = [
    fortuneBase,
    `용신이 ${yongsin}(${OHAENG_DESC[yongsin] ?? ''})이므로 끝자리가 ${luckyNum}인 번호와 ${luckyColor} 계열이 행운을 부릅니다.`,
    `${luckyDir} 방향의 활동이 재물운을 높여줍니다.`,
    seunFinance,
  ].filter(Boolean).join(' ')

  // ── 섹션 5: 건강과 체질 ──
  const strongBody = OHAENG_BODY[strongest] ?? ''
  const weakBody = OHAENG_BODY[weakest] ?? ''
  const constitution = OHAENG_CONSTITUTION[weakest] ?? ''
  const sec5 = [
    `${strongest} 기운이 강한 체질로 ${strongBody} 기능이 발달되어 있습니다.`,
    `반면 ${weakest} 기운이 약해 ${weakBody} 쪽을 특히 챙겨야 합니다.`,
    constitution,
    currentDaeun ? `현재 ${currentDaeun.ganji} 대운 중 심리적 스트레스가 신체에 영향을 줄 수 있으니 규칙적인 운동과 충분한 휴식이 도움됩니다.` : '',
  ].filter(Boolean).join(' ')

  // ── 섹션 6: 애정과 인연 ──
  const relBase = iljuInfo?.relationship ?? '신뢰를 쌓는 인간관계가 중요합니다.'
  const loveSeun = currentSeun
    ? `올해 ${currentSeun.ganji} 세운에는 ${['목', '화'].includes(seunOhaeng) ? '이성 인연이 적극적으로 나타나는 시기로, 새로운 만남에 열린 자세를 유지하세요.' : ['금', '수'].includes(seunOhaeng) ? '기존 관계를 깊게 다지는 것이 유리한 해입니다.' : '안정적인 관계를 지향하며 성급한 결정보다 신중한 선택이 좋습니다.'}`
    : ''
  const sec6 = [
    relBase,
    `${ilju}일주는 ${strongest} 기운이 강하여 ${strongest === '목' || strongest === '화' ? '활발하고 솔직한 감정 표현으로 이성에게 호감을 삽니다.' : strongest === '금' ? '원칙을 중시하고 자기관리가 철저해 신뢰감 있는 파트너가 됩니다.' : strongest === '수' ? '깊은 감수성과 배려심으로 상대방의 마음을 잘 읽습니다.' : '성실하고 헌신적인 모습으로 안정적인 관계를 이어갑니다.'}`,
    loveSeun,
  ].filter(Boolean).join(' ')

  // ── 섹션 7: 주의와 조언 ──
  const cautionBase = iljuInfo?.caution ?? `충동적인 결정보다 신중한 판단이 중요합니다.`
  const weakDesc = OHAENG_DESC[weakest] ?? ''
  const sec7 = [
    cautionBase,
    `사주에서 ${weakest}(${weakDesc}) 기운이 상대적으로 약하니 이 부분을 보완하는 노력이 필요합니다.`,
    `용신 ${yongsin} 기운을 강화하기 위해 ${OHAENG_COLOR[yongsin] ?? ''} 계열의 물건을 가까이하고, ${OHAENG_DIRECTION[yongsin] ?? ''} 방향으로의 활동을 늘려보세요.`,
  ].join(' ')

  return {
    sections: {
      '성격과 재능': sec1,
      '현재 운세': sec2,
      '직업과 진로': sec3,
      '재물과 기회': sec4,
      '건강과 체질': sec5,
      '애정과 인연': sec6,
      '주의와 조언': sec7,
    },
    ilju,
    iljuHanja: iljuInfo?.hanja ?? '',
    currentDaeun: currentDaeun ? `${currentDaeun.ganji}(${currentDaeun.hanja})` : '',
    currentSeun: currentSeun ? `${currentSeun.ganji}(${currentSeun.hanja})` : '',
  }
}
