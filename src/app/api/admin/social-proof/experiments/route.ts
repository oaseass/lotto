export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getShareTemplateTextById } from '@/lib/social-proof/templates'

async function ensureAdmin() {
  const session = await auth()
  if (!session?.user?.id || !session.user.isAdmin) {
    return null
  }
  return session
}

type Bucket = {
  impressions: number
  primaryClicks: number
  secondaryClicks: number
}

type VariantKey = 'A' | 'B'
type SurfaceKey = 'HOME_CARD' | 'REPORT_PAGE'

type TrendBucket = {
  impressions: number
  primaryClicks: number
  secondaryClicks: number
}

type TemplateBucket = {
  variant: VariantKey
  templateId: string
  selectedSessions: Set<string>
  successfulSessions: Set<string>
}

function createBucket(): Bucket {
  return { impressions: 0, primaryClicks: 0, secondaryClicks: 0 }
}

function createTrendBucket(): TrendBucket {
  return { impressions: 0, primaryClicks: 0, secondaryClicks: 0 }
}

function toPercent(clicks: number, impressions: number) {
  if (!impressions) return 0
  return Number(((clicks / impressions) * 100).toFixed(1))
}

export async function GET(req: NextRequest) {
  const session = await ensureAdmin()
  if (!session) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const days = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get('days') ?? '7', 10) || 7))
  const roundParam = req.nextUrl.searchParams.get('round')
  const selectedRound = roundParam && /^\d+$/.test(roundParam) ? parseInt(roundParam, 10) : null
  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - (days - 1))

  const baseWhere = {
    where: {
      createdAt: { gte: since },
      ...(selectedRound ? { round: selectedRound } : {}),
    },
  }

  const [events, roundRows] = await Promise.all([
    prisma.socialProofExperimentEvent.findMany({
      ...baseWhere,
      select: {
        id: true,
        variant: true,
        surface: true,
        eventName: true,
        createdAt: true,
        templateId: true,
        sessionKey: true,
        round: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.socialProofExperimentEvent.findMany({
      where: {
        createdAt: { gte: since },
        round: { not: null },
      },
      select: { round: true },
      distinct: ['round'],
      orderBy: { round: 'desc' },
      take: 12,
    }),
  ])

  const matrix: Record<VariantKey, Record<SurfaceKey, Bucket>> = {
    A: { HOME_CARD: createBucket(), REPORT_PAGE: createBucket() },
    B: { HOME_CARD: createBucket(), REPORT_PAGE: createBucket() },
  }

  const trendKeys = Array.from({ length: days }, (_, index) => {
    const date = new Date(since)
    date.setDate(since.getDate() + index)
    return {
      date,
      key: date.toISOString().slice(0, 10),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
    }
  })
  const trendMap = new Map<string, Record<VariantKey, TrendBucket>>(
    trendKeys.map(item => [item.key, { A: createTrendBucket(), B: createTrendBucket() }])
  )
  const templateMap = new Map<string, TemplateBucket>()

  for (const row of events) {
    const variant: VariantKey = row.variant === 'B' ? 'B' : 'A'
    const trendKey = row.createdAt.toISOString().slice(0, 10)
    const trendBucket = trendMap.get(trendKey)?.[variant]

    if (row.surface === 'HOME_CARD' || row.surface === 'REPORT_PAGE') {
      const surface = row.surface as SurfaceKey
      const bucket = matrix[variant][surface]

      if (row.eventName === 'IMPRESSION') {
        bucket.impressions += 1
        if (trendBucket) trendBucket.impressions += 1
      } else if (row.eventName === 'PRIMARY_CTA_CLICK') {
        bucket.primaryClicks += 1
        if (trendBucket) trendBucket.primaryClicks += 1
      } else if (row.eventName === 'SECONDARY_CTA_CLICK') {
        bucket.secondaryClicks += 1
        if (trendBucket) trendBucket.secondaryClicks += 1
      }
      continue
    }

    if (row.surface === 'SHARE_SHEET' && row.templateId && (row.eventName === 'TEMPLATE_SELECT' || row.eventName === 'SHARE_SUCCESS')) {
      const bucketKey = `${variant}:${row.templateId}`
      const sessionKey = row.sessionKey || row.id
      const templateBucket = templateMap.get(bucketKey) ?? {
        variant,
        templateId: row.templateId,
        selectedSessions: new Set<string>(),
        successfulSessions: new Set<string>(),
      }

      if (row.eventName === 'TEMPLATE_SELECT') {
        templateBucket.selectedSessions.add(sessionKey)
      }

      if (row.eventName === 'SHARE_SUCCESS') {
        templateBucket.successfulSessions.add(sessionKey)
      }

      templateMap.set(bucketKey, templateBucket)
    }
  }

  const variants = (['A', 'B'] as const).map(variant => {
    const home = matrix[variant].HOME_CARD
    const report = matrix[variant].REPORT_PAGE
    const totalImpressions = home.impressions + report.impressions
    const totalPrimaryClicks = home.primaryClicks + report.primaryClicks
    const totalSecondaryClicks = home.secondaryClicks + report.secondaryClicks

    return {
      variant,
      totalImpressions,
      totalPrimaryClicks,
      totalSecondaryClicks,
      totalPrimaryCtr: toPercent(totalPrimaryClicks, totalImpressions),
      totalSecondaryCtr: toPercent(totalSecondaryClicks, totalImpressions),
      surfaces: {
        HOME_CARD: {
          ...home,
          primaryCtr: toPercent(home.primaryClicks, home.impressions),
          secondaryCtr: toPercent(home.secondaryClicks, home.impressions),
        },
        REPORT_PAGE: {
          ...report,
          primaryCtr: toPercent(report.primaryClicks, report.impressions),
          secondaryCtr: toPercent(report.secondaryClicks, report.impressions),
        },
      },
    }
  })

  const trends = trendKeys.map(({ key, label }) => {
    const bucket = trendMap.get(key) ?? { A: createTrendBucket(), B: createTrendBucket() }

    return {
      date: key,
      label,
      variants: {
        A: {
          impressions: bucket.A.impressions,
          primaryClicks: bucket.A.primaryClicks,
          secondaryClicks: bucket.A.secondaryClicks,
          primaryCtr: toPercent(bucket.A.primaryClicks, bucket.A.impressions),
          secondaryCtr: toPercent(bucket.A.secondaryClicks, bucket.A.impressions),
        },
        B: {
          impressions: bucket.B.impressions,
          primaryClicks: bucket.B.primaryClicks,
          secondaryClicks: bucket.B.secondaryClicks,
          primaryCtr: toPercent(bucket.B.primaryClicks, bucket.B.impressions),
          secondaryCtr: toPercent(bucket.B.secondaryClicks, bucket.B.impressions),
        },
      },
    }
  })

  const templatePerformance = (['A', 'B'] as const).map(variant => ({
    variant,
    templates: Array.from(templateMap.values())
      .filter(item => item.variant === variant)
      .map(item => ({
        templateId: item.templateId,
        templateText: getShareTemplateTextById(item.templateId),
        selectedSessions: item.selectedSessions.size,
        shareSuccessSessions: item.successfulSessions.size,
        conversionRate: toPercent(item.successfulSessions.size, item.selectedSessions.size),
      }))
      .sort((left, right) => {
        if (right.shareSuccessSessions !== left.shareSuccessSessions) {
          return right.shareSuccessSessions - left.shareSuccessSessions
        }
        return right.conversionRate - left.conversionRate
      }),
  }))

  return NextResponse.json({
    days,
    since: since.toISOString(),
    selectedRound,
    availableRounds: roundRows.map(item => item.round).filter((value): value is number => typeof value === 'number'),
    variants,
    trends,
    templatePerformance,
  })
}