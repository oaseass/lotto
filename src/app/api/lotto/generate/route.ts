// ================================
// API: 사주 기반 로또 번호 생성
// POST /api/lotto/generate
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateSaju, calculateOhaengRatio, calculateYongsin } from '@/lib/saju/calculator'
import { generateLottoNumbers, buildReasonPrompt } from '@/lib/lotto/generator'
import { estimateRoundByPurchaseDate } from '@/lib/lotto/dhlottery'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const { targetDate } = await req.json()
    const date = targetDate ? new Date(targetDate) : new Date()

    // 사주 프로필 조회
    const sajuProfile = await prisma.sajuProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!sajuProfile) {
      return NextResponse.json({ error: '사주 프로필을 먼저 입력해주세요' }, { status: 400 })
    }

    // 사주 계산 (양력 기준 - 음력 입력자는 solarYear 사용)
    const cheonjigan = calculateSaju(
      sajuProfile.solarYear ?? sajuProfile.birthYear,
      sajuProfile.solarMonth ?? sajuProfile.birthMonth,
      sajuProfile.solarDay ?? sajuProfile.birthDay,
      sajuProfile.birthHour
    )
    const ohaeng = calculateOhaengRatio(cheonjigan)
    const weakElements = calculateYongsin(ohaeng)
    const primary = weakElements[0]

    // 번호 생성
    const numbers = generateLottoNumbers(cheonjigan, ohaeng, date)
    const currentRound = estimateRoundByPurchaseDate(date)

    // Claude API로 해설 생성 (API 키 없으면 기본 문구 사용)
    let reason = ''
    if (anthropic) {
      try {
        const prompt = buildReasonPrompt(cheonjigan, ohaeng, numbers, date, weakElements)
        const response = await anthropic.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 300,
          messages: [{ role: 'user', content: prompt }],
        })
        reason = response.content[0].type === 'text' ? response.content[0].text : ''
      } catch {
        reason = `부족한 기운(${weakElements.join('·')})을 보충하는 번호입니다.`
      }
    } else {
      const ilja = `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`
      const OHAENG_LUCKY: Record<string, string> = { 목: '3·8', 화: '2·7', 토: '5·10', 금: '4·9', 수: '1·6' }
      const OHAENG_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
      const numOhaeng = (n: number) => {
        const last = n % 10
        const m: Record<number, string> = { 1:'수',6:'수',2:'화',7:'화',3:'목',8:'목',4:'금',9:'금',5:'토',0:'토' }
        return m[last] || ''
      }
      const primaryNums = numbers.filter(n => numOhaeng(n) === primary).join(', ')
      reason = `오늘 일진(${ilja})과 부족한 기운 ${weakElements.map(w => `${w}(${OHAENG_HANJA[w]})`).join('·')} 을 반영한 번호입니다. ` +
        (primaryNums ? `${primaryNums}은(는) 핵심 기운 ${primary} 오행 수리(끝자리 ${OHAENG_LUCKY[primary]})에 해당합니다.` : '')
    }

    // DB 저장 (LottoDraw FK 제약 때문에 drawRound는 당첨번호 동기화 후 업데이트)
    const saved = await prisma.lottoNumber.create({
      data: {
        userId: session.user.id,
        generatedDate: date,
        numbers,
        reason,
        drawRound: null,
      },
    })

    return NextResponse.json({
      id: saved.id,
      numbers,
      reason,
      drawRound: currentRound,
      sajuInfo: {
        ilju: `${cheonjigan.day.cheongan}${cheonjigan.day.jiji}`,
        yongsin: weakElements.join(','),
        ohaeng,
      },
    })
  } catch (error) {
    console.error('번호 생성 오류:', error)
    return NextResponse.json({ error: '번호 생성에 실패했습니다' }, { status: 500 })
  }
}
