// scripts/recalc-saju.mjs
// 기존 사주 프로필을 새 만세력(lunar-javascript) 기반으로 재계산
// Run: node --env-file=.env.local scripts/recalc-saju.mjs

const { PrismaClient } = await import('@prisma/client')
const { Solar } = await import('lunar-javascript')

const prisma = new PrismaClient()

// ── 천간/지지 한자 → 한글 매핑
const TG_ZH_TO_KOR = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
}
const DZ_ZH_TO_KOR = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진',
  '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유',
  '戌': '술', '亥': '해',
}
const CHEONGAN = ['갑','을','병','정','무','기','경','신','임','계']
const JIJI     = ['자','축','인','묘','진','사','오','미','신','유','술','해']

const CHEONGAN_OHAENG = {
  갑:'목',을:'목',병:'화',정:'화',무:'토',기:'토',경:'금',신:'금',임:'수',계:'수',
}
const JIJI_OHAENG = {
  자:'수',축:'토',인:'목',묘:'목',진:'토',사:'화',오:'화',미:'토',신:'금',유:'금',술:'토',해:'수',
}
const JIJANGAN = {
  자:['임','계'],축:['기','신','계'],인:['무','병','갑'],묘:['갑','을'],
  진:['을','계','무'],사:['무','경','병'],오:['기','정'],미:['정','을','기'],
  신:['무','임','경'],유:['경','신'],술:['신','정','무'],해:['무','갑','임'],
}
const OHAENG_SANGSAENG = { 목:'화',화:'토',토:'금',금:'수',수:'목' }

function parseGanZhi(gz) {
  if (!gz || gz.length < 2) return null
  const tg = TG_ZH_TO_KOR[gz[0]]
  const dz = DZ_ZH_TO_KOR[gz[1]]
  if (!tg || !dz) return null
  return { cheongan: tg, jiji: dz }
}

function calcHourPillar(hour, dayCG) {
  let shizhiIdx
  if (hour === 23) shizhiIdx = 0
  else shizhiIdx = Math.floor((hour + 1) / 2) % 12
  const jiji = JIJI[shizhiIdx]
  const dayIdx = CHEONGAN.indexOf(dayCG)
  const BASE_SHIGAN = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const cheonganIdx = (BASE_SHIGAN[dayIdx] + shizhiIdx) % 10
  return { cheongan: CHEONGAN[cheonganIdx], jiji }
}

function calculateSaju(sy, sm, sd, hour) {
  const solar = Solar.fromYmd(sy, sm, sd)
  const lunar = solar.getLunar()
  const yearGZ  = parseGanZhi(lunar.getYearInGanZhi())
  const monthGZ = parseGanZhi(lunar.getMonthInGanZhi())
  const dayGZ   = parseGanZhi(lunar.getDayInGanZhi())
  if (!yearGZ || !monthGZ || !dayGZ) throw new Error('사주 계산 실패')
  const hourPillar = (hour !== null && hour !== undefined) ? calcHourPillar(Math.floor(hour), dayGZ.cheongan) : null
  return { year: yearGZ, month: monthGZ, day: dayGZ, hour: hourPillar }
}

function calculateOhaengRatio(cj) {
  const ratio = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const pillars = [cj.year, cj.month, cj.day, cj.hour]
  for (const pillar of pillars) {
    if (!pillar) continue
    ratio[CHEONGAN_OHAENG[pillar.cheongan]] += 1
    ratio[JIJI_OHAENG[pillar.jiji]] += 1
    const jijangan = JIJANGAN[pillar.jiji]
    if (jijangan) {
      jijangan.forEach((cg, i) => {
        ratio[CHEONGAN_OHAENG[cg]] += i === jijangan.length - 1 ? 0.3 : 0.2
      })
    }
  }
  for (const k of Object.keys(ratio)) ratio[k] = Math.round(ratio[k] * 10) / 10
  return ratio
}

function calculateYongsin(ohaeng) {
  const entries = Object.entries(ohaeng).sort((a, b) => a[1] - b[1])
  const absent = entries.filter(([, v]) => v === 0)
  if (absent.length > 0) return OHAENG_SANGSAENG[absent[0][0]]
  const weakest  = entries[0][0]
  const strongest = entries[entries.length - 1][0]
  if (entries[entries.length - 1][1] >= entries[0][1] * 2.5) {
    const SANGGEUIK = { 목:'금', 화:'수', 토:'목', 금:'화', 수:'토' }
    return SANGGEUIK[strongest]
  }
  return OHAENG_SANGSAENG[weakest]
}

async function main() {
  const profiles = await prisma.sajuProfile.findMany()
  console.log(`재계산 대상: ${profiles.length}명`)

  let updated = 0, failed = 0
  for (const p of profiles) {
    try {
      const sy = p.solarYear ?? p.birthYear
      const sm = p.solarMonth ?? p.birthMonth
      const sd = p.solarDay ?? p.birthDay
      const hour = p.birthHour

      const cj = calculateSaju(sy, sm, sd, hour)
      const ohaeng = calculateOhaengRatio(cj)
      const yongsin = calculateYongsin(ohaeng)
      const ilju = `${cj.day.cheongan}${cj.day.jiji}`

      await prisma.sajuProfile.update({
        where: { id: p.id },
        data: { cheonjigan: cj, ohaeng, ilju, yongsin },
      })
      console.log(`  ✓ userId=${p.userId} → 일주:${ilju} 용신:${yongsin}`)
      updated++
    } catch (e) {
      console.error(`  ✗ userId=${p.userId}: ${e.message}`)
      failed++
    }
  }
  console.log(`\n완료: ${updated}명 업데이트, ${failed}명 실패`)
}

main().finally(() => prisma.$disconnect())
