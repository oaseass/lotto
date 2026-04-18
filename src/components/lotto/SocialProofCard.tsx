'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { getSocialProofUiCopy } from '@/lib/social-proof/templates'
import { trackSocialProofEvent } from '@/lib/social-proof/tracker'
import { useSocialProofCopyVariant } from '@/lib/social-proof/useCopyVariant'

type SocialProofSummaryResponse = {
  summary: {
    round: number
    headline: string
    eligibleAutoSetCount: number
    eligibleUserCount: number
    appStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
    verifiedStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
    publicStoryCount: number
  } | null
  stories: Array<{
    id: string
    round: number
    rank: number | null
    displayName: string
    templateText: string | null
    verified: boolean
    reviewed: boolean
  }>
}

function buildRankParts(stats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }) {
  const parts = [
    stats.rank1Count > 0 ? `1등 ${stats.rank1Count}건` : null,
    stats.rank2Count > 0 ? `2등 ${stats.rank2Count}건` : null,
    stats.rank3Count > 0 ? `3등 ${stats.rank3Count}건` : null,
    stats.rank4Count > 0 ? `4등 ${stats.rank4Count}건` : null,
    stats.rank5Count > 0 ? `5등 ${stats.rank5Count}건` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : '아직 적중 데이터가 없습니다'
}

export default function SocialProofCard() {
  const variant = useSocialProofCopyVariant()
  const uiCopy = getSocialProofUiCopy(variant)
  const impressionTrackedRef = useRef(false)

  const { data, isLoading } = useQuery<SocialProofSummaryResponse>({
    queryKey: ['social-proof-summary', variant],
    queryFn: async () => {
      const response = await fetch(`/api/social-proof/summary?variant=${variant}`)
      if (!response.ok) {
        throw new Error('사회적 증거 요약을 불러오지 못했습니다')
      }
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const summary = data?.summary ?? null
  const stories = data?.stories ?? []

  useEffect(() => {
    if (!summary || impressionTrackedRef.current) return
    impressionTrackedRef.current = true
    trackSocialProofEvent({
      variant,
      surface: 'HOME_CARD',
      eventName: 'IMPRESSION',
      round: summary.round,
    })
  }, [summary, variant])

  if (isLoading) {
    return (
      <div style={{ background: '#fff', marginBottom: 8, borderBottom: '1px solid #dcdcdc', padding: '14px 16px 16px' }}>
        <div className="skeleton" style={{ width: '45%', height: 14, borderRadius: 6, marginBottom: 12 }} />
        <div className="skeleton" style={{ width: '100%', height: 58, borderRadius: 12, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 38, borderRadius: 10 }} />
      </div>
    )
  }

  if (!summary) {
    return null
  }

  const appParts = buildRankParts(summary.appStats)
  const verifiedParts = buildRankParts(summary.verifiedStats)

  const handlePrimaryCtaClick = () => {
    trackSocialProofEvent({
      variant,
      surface: 'HOME_CARD',
      eventName: 'PRIMARY_CTA_CLICK',
      round: summary.round,
    })
  }

  const handleSecondaryCtaClick = () => {
    trackSocialProofEvent({
      variant,
      surface: 'HOME_CARD',
      eventName: 'SECONDARY_CTA_CLICK',
      round: summary.round,
    })
  }

  return (
    <div style={{ background: '#fff', marginBottom: 8, borderBottom: '1px solid #dcdcdc', padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#15436b', marginBottom: 4 }}>
            {uiCopy.homeTitle}
          </p>
          <p style={{ fontSize: 11, color: '#6b7b88' }}>
            {uiCopy.homeSubtitle
              .replace('{round}', String(summary.round))
              .replace('{eligible}', String(summary.eligibleAutoSetCount))}
          </p>
        </div>
        <Link href="/report" style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', textDecoration: 'none' }}>
          전체 리포트
        </Link>
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #f8fcff 0%, #eef7ff 55%, #fff6df 100%)',
        border: '1px solid #d9ecfb',
        borderRadius: 14,
        padding: '14px 14px 12px',
        boxShadow: '0 6px 16px rgba(0,123,195,0.08)',
      }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: '#16324f', marginBottom: 10, letterSpacing: '-0.2px' }}>
          {summary.headline}
        </p>
        <p style={{ fontSize: 11, color: '#5e7286', lineHeight: 1.5, marginBottom: 10 }}>
          {uiCopy.homeDisclaimer}
        </p>

        <div style={{ display: 'grid', gap: 8, marginBottom: stories.length > 0 ? 10 : 14 }}>
          <div style={{ background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#007bc3', marginBottom: 5 }}>추천 적중</p>
            <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{appParts}</p>
          </div>
          <div style={{ background: 'rgba(20,86,56,0.06)', borderRadius: 10, padding: '10px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#14683f', marginBottom: 5 }}>실구매 QR 인증</p>
            <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>{verifiedParts}</p>
          </div>
        </div>

        {stories.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 10, fontWeight: 800, color: '#7a5c00', marginBottom: 8 }}>
              {uiCopy.homeStoriesLabel.replace('{count}', String(summary.publicStoryCount))}
            </p>
            <div style={{ display: 'grid', gap: 6 }}>
              {stories.slice(0, 2).map(story => (
                <div key={story.id} style={{
                  background: 'rgba(255,255,255,0.94)',
                  border: '1px solid #f1e3ab',
                  borderRadius: 10,
                  padding: '9px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#333' }}>{story.displayName}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9a6b00', background: '#fff4c9', borderRadius: 999, padding: '2px 6px' }}>
                      {story.rank}등 · QR 인증
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#176a46', background: '#e7f7ee', borderRadius: 999, padding: '2px 6px' }}>
                      {uiCopy.reviewBadge}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: '#667085', lineHeight: 1.45 }}>
                    {story.templateText || '당첨 후기를 공유했어요'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/generate" style={{
            flex: 1,
            textAlign: 'center',
            height: 38,
            lineHeight: '38px',
            background: '#007bc3',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            borderRadius: 10,
            textDecoration: 'none',
          }} onClick={handlePrimaryCtaClick}>
            {uiCopy.homePrimaryCta}
          </Link>
          <Link href="/report" style={{
            flex: 1,
            textAlign: 'center',
            height: 38,
            lineHeight: '38px',
            background: '#fff',
            color: '#15436b',
            fontSize: 12,
            fontWeight: 800,
            borderRadius: 10,
            border: '1px solid #cfe3f1',
            textDecoration: 'none',
          }} onClick={handleSecondaryCtaClick}>
            {uiCopy.homeSecondaryCta}
          </Link>
        </div>
      </div>
    </div>
  )
}