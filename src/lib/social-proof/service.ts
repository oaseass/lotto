import {
  OutcomeModerationStatus,
  OutcomeShareNameMode,
  OutcomeShareStatus,
  OutcomeVerificationStatus,
  Prisma,
} from '@prisma/client'

import { prisma } from '@/lib/prisma'
import {
  getShareTemplateTextById,
  resolveSocialProofCopyVariant,
  type SocialProofTemplateId,
} from '@/lib/social-proof/templates'

type RankValue = 1 | 2 | 3 | 4 | 5

type DrawForSync = {
  round: number
  drawDate: Date
  numbers: number[]
  bonus: number
  prize1st: bigint | null
  prize2nd: bigint | null
  prize3rd: number | null
  prize4th: number | null
  prize5th: number | null
}

type EligibleNumber = {
  id: string
  userId: string
  numbers: number[]
  createdAt: Date
}

type VerifiedScanMatch = {
  qrScanId: string
  rank: number | null
  prize: number
}

export const MAX_SOCIAL_PROOF_SETS_PER_USER = 5

export function normalizeNumbers(numbers: number[]): number[] {
  return [...numbers].sort((a, b) => a - b)
}

export function numbersKey(numbers: number[]): string {
  return normalizeNumbers(numbers).join(',')
}

export function computeRank(numbers: number[], drawNumbers: number[], bonus: number): number | null {
  const normalized = normalizeNumbers(numbers)
  const drawSet = new Set(drawNumbers)
  const matched = normalized.filter(number => drawSet.has(number)).length

  if (matched === 6) return 1
  if (matched === 5 && normalized.includes(bonus)) return 2
  if (matched === 5) return 3
  if (matched === 4) return 4
  if (matched === 3) return 5
  return null
}

export function getShareTemplateText(templateId: string | null | undefined): string | null {
  return getShareTemplateTextById(templateId)
}

export function isValidShareTemplate(templateId: string | null | undefined): templateId is SocialProofTemplateId {
  if (!templateId) return false
  return getShareTemplateTextById(templateId) !== null
}

export function buildSummaryHeadline(input: {
  round: number
  verifiedRank1Count: number
  verifiedRank2Count: number
  rank3Count: number
  rank4Count: number
  rank5Count: number
  verifiedRank3Count: number
  verifiedRank4Count: number
  verifiedRank5Count: number
}, variantInput?: string | null): string {
  const variant = resolveSocialProofCopyVariant(variantInput)

  if (input.verifiedRank1Count > 0) {
    return variant === 'B'
      ? `제${input.round}회 QR 인증 1등 ${input.verifiedRank1Count}건, 진짜로 터졌어요`
      : `제${input.round}회 QR 인증 1등 ${input.verifiedRank1Count}건이 확인됐어요`
  }

  if (input.verifiedRank2Count > 0) {
    return variant === 'B'
      ? `제${input.round}회 QR 인증 2등 ${input.verifiedRank2Count}건이 잡혔어요`
      : `제${input.round}회 QR 인증 2등 ${input.verifiedRank2Count}건이 나왔어요`
  }

  const verifiedWins = input.verifiedRank3Count + input.verifiedRank4Count + input.verifiedRank5Count
  if (verifiedWins > 0) {
    return variant === 'B'
      ? `제${input.round}회 실구매 QR 인증 당첨 ${verifiedWins}건, 이번 주 반응이 왔어요`
      : `제${input.round}회 실구매 QR 인증 당첨 ${verifiedWins}건이 쌓였어요`
  }

  const appWins = input.rank3Count + input.rank4Count + input.rank5Count
  if (appWins > 0) {
    return variant === 'B'
      ? `제${input.round}회 우리 앱 추천 번호에서 적중 ${appWins}건, 꽤 세게 나왔어요`
      : `제${input.round}회 우리 앱 추천 번호에서 적중 ${appWins}건이 나왔어요`
  }

  return `제${input.round}회 앱 추천 번호 성적 집계`
}

export async function syncRoundSocialProof(round: number) {
  const draw = await prisma.lottoDraw.findUnique({
    where: { round },
    select: {
      round: true,
      drawDate: true,
      numbers: true,
      bonus: true,
      prize1st: true,
      prize2nd: true,
      prize3rd: true,
      prize4th: true,
      prize5th: true,
    },
  })

  if (!draw) {
    throw new Error(`${round}회차 당첨번호를 찾을 수 없습니다`)
  }

  const rawNumbers = await prisma.lottoNumber.findMany({
    where: {
      drawRound: round,
      isManual: false,
      createdAt: { lte: draw.drawDate },
    },
    orderBy: [
      { userId: 'asc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      userId: true,
      numbers: true,
      createdAt: true,
    },
  })

  const eligibleNumbers = collectEligibleAutoNumbers(rawNumbers)
  const eligibleIds = eligibleNumbers.map(item => item.id)
  const eligibleUserIds = Array.from(new Set(eligibleNumbers.map(item => item.userId)))

  const [existingOutcomes, qrScans] = await Promise.all([
    prisma.lottoOutcome.findMany({
      where: { round },
      select: {
        lottoNumberId: true,
        shareStatus: true,
        shareNameMode: true,
        moderationStatus: true,
        moderatedReason: true,
        moderatedAt: true,
        lastReportedAt: true,
        shareTemplateId: true,
        sharedAt: true,
      },
    }),
    eligibleUserIds.length > 0
      ? prisma.qrScan.findMany({
          where: {
            round,
            userId: { in: eligibleUserIds },
          },
          orderBy: { scannedAt: 'desc' },
          select: {
            id: true,
            userId: true,
            scannedNumbers: true,
            result: true,
          },
        })
      : Promise.resolve([]),
  ])

  const existingByNumberId = new Map(existingOutcomes.map(item => [item.lottoNumberId, item]))
  const verifiedMap = buildVerifiedScanMap(qrScans)
  const drawSet = new Set(draw.numbers)
  const rankCounts = createRankCounter()
  const verifiedRankCounts = createRankCounter()

  let totalPrizeAmount = BigInt(0)
  let verifiedPrizeAmount = BigInt(0)
  let publicStoryCount = 0

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.lottoOutcome.deleteMany({
      where: eligibleIds.length > 0 ? { round, lottoNumberId: { notIn: eligibleIds } } : { round },
    }),
  ]

  for (const entry of eligibleNumbers) {
    const normalizedNumbers = normalizeNumbers(entry.numbers)
    const matchedNumbers = normalizedNumbers.filter(number => drawSet.has(number))
    const rank = computeRank(normalizedNumbers, draw.numbers, draw.bonus)
    const prize = prizeForRank(draw, rank)
    const verified = verifiedMap.get(entry.userId)?.get(numbersKey(normalizedNumbers)) ?? null
    const existing = existingByNumberId.get(entry.id)
    const canStayShared = rank !== null && verified !== null
    const shareStatus = canStayShared ? (existing?.shareStatus ?? OutcomeShareStatus.PRIVATE) : OutcomeShareStatus.PRIVATE
    const shareNameMode = existing?.shareNameMode ?? OutcomeShareNameMode.ANON
    const shareTemplateId = canStayShared ? (existing?.shareTemplateId ?? null) : null
    const sharedAt = shareStatus === OutcomeShareStatus.SHARED ? (existing?.sharedAt ?? null) : null
    const moderationStatus = existing?.moderationStatus ?? OutcomeModerationStatus.VISIBLE
    const moderatedReason = existing?.moderatedReason ?? null
    const moderatedAt = existing?.moderatedAt ?? null
    const lastReportedAt = existing?.lastReportedAt ?? null

    if (rank !== null) {
      rankCounts[rank as RankValue] += 1
      totalPrizeAmount += prize
    }

    if (verified && rank !== null) {
      verifiedRankCounts[rank as RankValue] += 1
      verifiedPrizeAmount += prize
    }

    if (shareStatus === OutcomeShareStatus.SHARED && moderationStatus === OutcomeModerationStatus.VISIBLE) {
      publicStoryCount += 1
    }

    operations.push(
      prisma.lottoOutcome.upsert({
        where: { lottoNumberId: entry.id },
        create: {
          lottoNumberId: entry.id,
          userId: entry.userId,
          round,
          numbers: normalizedNumbers,
          matchedNumbers,
          matchedCount: matchedNumbers.length,
          rank,
          prize,
          isWinning: rank !== null,
          isAutoGenerated: true,
          verificationStatus: verified ? OutcomeVerificationStatus.MATCHED_QR : OutcomeVerificationStatus.NONE,
          verifiedQrScanId: verified?.qrScanId ?? null,
          shareStatus,
          shareNameMode,
          moderationStatus,
          moderatedReason,
          moderatedAt,
          lastReportedAt,
          shareTemplateId,
          sharedAt,
        },
        update: {
          userId: entry.userId,
          round,
          numbers: normalizedNumbers,
          matchedNumbers,
          matchedCount: matchedNumbers.length,
          rank,
          prize,
          isWinning: rank !== null,
          isAutoGenerated: true,
          verificationStatus: verified ? OutcomeVerificationStatus.MATCHED_QR : OutcomeVerificationStatus.NONE,
          verifiedQrScanId: verified?.qrScanId ?? null,
          shareStatus,
          shareNameMode,
          moderationStatus,
          moderatedReason,
          moderatedAt,
          lastReportedAt,
          shareTemplateId,
          sharedAt,
        },
      })
    )
  }

  operations.push(
    prisma.appRoundStat.upsert({
      where: { round },
      create: {
        round,
        eligibleAutoSetCount: eligibleNumbers.length,
        eligibleUserCount: eligibleUserIds.length,
        rank1Count: rankCounts[1],
        rank2Count: rankCounts[2],
        rank3Count: rankCounts[3],
        rank4Count: rankCounts[4],
        rank5Count: rankCounts[5],
        verifiedRank1Count: verifiedRankCounts[1],
        verifiedRank2Count: verifiedRankCounts[2],
        verifiedRank3Count: verifiedRankCounts[3],
        verifiedRank4Count: verifiedRankCounts[4],
        verifiedRank5Count: verifiedRankCounts[5],
        publicStoryCount,
        totalPrizeAmount,
        verifiedPrizeAmount,
      },
      update: {
        eligibleAutoSetCount: eligibleNumbers.length,
        eligibleUserCount: eligibleUserIds.length,
        rank1Count: rankCounts[1],
        rank2Count: rankCounts[2],
        rank3Count: rankCounts[3],
        rank4Count: rankCounts[4],
        rank5Count: rankCounts[5],
        verifiedRank1Count: verifiedRankCounts[1],
        verifiedRank2Count: verifiedRankCounts[2],
        verifiedRank3Count: verifiedRankCounts[3],
        verifiedRank4Count: verifiedRankCounts[4],
        verifiedRank5Count: verifiedRankCounts[5],
        publicStoryCount,
        totalPrizeAmount,
        verifiedPrizeAmount,
      },
    })
  )

  await prisma.$transaction(operations)

  return {
    round,
    eligibleAutoSetCount: eligibleNumbers.length,
    eligibleUserCount: eligibleUserIds.length,
    rankCounts,
    verifiedRankCounts,
    publicStoryCount,
    totalPrizeAmount,
    verifiedPrizeAmount,
  }
}

export async function ensureRoundSocialProof(round: number) {
  let stat = await prisma.appRoundStat.findUnique({
    where: { round },
    include: {
      lottoDraw: {
        select: {
          drawDate: true,
        },
      },
    },
  })

  if (!stat) {
    await syncRoundSocialProof(round)
    stat = await prisma.appRoundStat.findUnique({
      where: { round },
      include: {
        lottoDraw: {
          select: {
            drawDate: true,
          },
        },
      },
    })
  }

  return stat
}

export async function refreshPublicStoryCount(round: number) {
  const publicStoryCount = await prisma.lottoOutcome.count({
    where: {
      round,
      isWinning: true,
      shareStatus: OutcomeShareStatus.SHARED,
      moderationStatus: OutcomeModerationStatus.VISIBLE,
      verificationStatus: { not: OutcomeVerificationStatus.NONE },
    },
  })

  await prisma.appRoundStat.upsert({
    where: { round },
    create: {
      round,
      publicStoryCount,
    },
    update: {
      publicStoryCount,
    },
  })

  return publicStoryCount
}

function collectEligibleAutoNumbers(entries: EligibleNumber[]): EligibleNumber[] {
  const eligible: EligibleNumber[] = []
  const state = new Map<string, { count: number; keys: Set<string> }>()

  for (const entry of entries) {
    const key = numbersKey(entry.numbers)
    const userState = state.get(entry.userId) ?? { count: 0, keys: new Set<string>() }

    if (userState.keys.has(key)) {
      state.set(entry.userId, userState)
      continue
    }

    if (userState.count >= MAX_SOCIAL_PROOF_SETS_PER_USER) {
      state.set(entry.userId, userState)
      continue
    }

    userState.keys.add(key)
    userState.count += 1
    state.set(entry.userId, userState)
    eligible.push(entry)
  }

  return eligible
}

function createRankCounter(): Record<RankValue, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
}

function prizeForRank(draw: DrawForSync, rank: number | null): bigint {
  if (rank === 1) return draw.prize1st ?? BigInt(0)
  if (rank === 2) return draw.prize2nd ?? BigInt(0)
  if (rank === 3) return BigInt(draw.prize3rd ?? 0)
  if (rank === 4) return BigInt(draw.prize4th ?? 0)
  if (rank === 5) return BigInt(draw.prize5th ?? 5000)
  return BigInt(0)
}

function buildVerifiedScanMap(
  scans: Array<{ id: string; userId: string; scannedNumbers: unknown; result: unknown }>
): Map<string, Map<string, VerifiedScanMatch>> {
  const userMap = new Map<string, Map<string, VerifiedScanMatch>>()

  for (const scan of scans) {
    const scannedSets = parseScannedSets(scan.scannedNumbers)
    const resultBySet = new Map(parseScanResults(scan.result).map(item => [item.set, item]))
    const numberMap = userMap.get(scan.userId) ?? new Map<string, VerifiedScanMatch>()

    for (const set of scannedSets) {
      const key = numbersKey(set.numbers)
      if (numberMap.has(key)) continue

      const result = resultBySet.get(set.set)
      numberMap.set(key, {
        qrScanId: scan.id,
        rank: result?.rank ?? null,
        prize: result?.prize ?? 0,
      })
    }

    userMap.set(scan.userId, numberMap)
  }

  return userMap
}

function parseScannedSets(value: unknown): Array<{ set: number; numbers: number[] }> {
  if (!Array.isArray(value)) return []

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const set = typeof record.set === 'number' ? record.set : null
    const numbers = Array.isArray(record.numbers)
      ? record.numbers.filter((number): number is number => typeof number === 'number')
      : []

    if (set === null || numbers.length !== 6) return []
    return [{ set, numbers: normalizeNumbers(numbers) }]
  })
}

function parseScanResults(value: unknown): Array<{ set: number; rank: number | null; prize: number }> {
  if (!Array.isArray(value)) return []

  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return []
    const record = item as Record<string, unknown>
    const set = typeof record.set === 'number' ? record.set : null
    const rank = typeof record.rank === 'number' ? record.rank : null
    const prize = typeof record.prize === 'number' ? record.prize : 0

    if (set === null) return []
    return [{ set, rank, prize }]
  })
}