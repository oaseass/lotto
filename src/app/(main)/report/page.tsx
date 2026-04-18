'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getSocialProofUiCopy } from '@/lib/social-proof/templates'
import { trackSocialProofEvent } from '@/lib/social-proof/tracker'
import { useSocialProofCopyVariant } from '@/lib/social-proof/useCopyVariant'

type SummaryResponse = {
  summary: {
    round: number
    drawDate: string
    headline: string
    eligibleAutoSetCount: number
    eligibleUserCount: number
    appStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
    verifiedStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
    publicStoryCount: number
    totalPrizeAmount: number
    verifiedPrizeAmount: number
  } | null
}

type RoundsResponse = {
  items: Array<{
    round: number
    drawDate: string
    eligibleAutoSetCount: number
    eligibleUserCount: number
    publicStoryCount: number
    appStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
    verifiedStats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }
  }>
}

type StoriesResponse = {
  items: Array<{
    id: string
    round: number
    rank: number | null
    prize: number
    displayName: string
    templateText: string | null
    verified: boolean
    reviewed: boolean
    sharedAt: string | null
  }>
}

function formatPrize(value: number): string {
  if (!value) return '0원'
  return value.toLocaleString('ko-KR') + '원'
}

function compactRankText(stats: { rank1Count: number; rank2Count: number; rank3Count: number; rank4Count: number; rank5Count: number }) {
  const parts = [
    stats.rank1Count ? `1등 ${stats.rank1Count}` : null,
    stats.rank2Count ? `2등 ${stats.rank2Count}` : null,
    stats.rank3Count ? `3등 ${stats.rank3Count}` : null,
    stats.rank4Count ? `4등 ${stats.rank4Count}` : null,
    stats.rank5Count ? `5등 ${stats.rank5Count}` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : '적중 없음'
}

export default function ReportPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const variant = useSocialProofCopyVariant()
  const uiCopy = getSocialProofUiCopy(variant)
  const impressionTrackedRef = useRef(false)
  const [toast, setToast] = useState('')
  const [reportingId, setReportingId] = useState('')

  const summaryQuery = useQuery<SummaryResponse>({
    queryKey: ['social-proof-summary-page', variant],
    queryFn: async () => {
      const response = await fetch(`/api/social-proof/summary?variant=${variant}`)
      if (!response.ok) throw new Error('요약 조회 실패')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const roundsQuery = useQuery<RoundsResponse>({
    queryKey: ['social-proof-rounds'],
    queryFn: async () => {
      const response = await fetch('/api/social-proof/rounds?limit=8')
      if (!response.ok) throw new Error('회차 리포트 조회 실패')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const storiesQuery = useQuery<StoriesResponse>({
    queryKey: ['social-proof-stories'],
    queryFn: async () => {
      const response = await fetch('/api/social-proof/stories?limit=10')
      if (!response.ok) throw new Error('공개 후기 조회 실패')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const summary = summaryQuery.data?.summary ?? null
  const rounds = roundsQuery.data?.items ?? []
  const stories = storiesQuery.data?.items ?? []
  const isLoading = summaryQuery.isLoading || roundsQuery.isLoading || storiesQuery.isLoading

  useEffect(() => {
    if (!summary || impressionTrackedRef.current) return
    impressionTrackedRef.current = true
    trackSocialProofEvent({
      variant,
      surface: 'REPORT_PAGE',
      eventName: 'IMPRESSION',
      round: summary.round,
    })
  }, [summary, variant])

  const handleReportStory = async (outcomeId: string) => {
    if (!session?.user?.id) {
      router.push('/login')
      return
    }

    setReportingId(outcomeId)
    setToast('')
    try {
      const response = await fetch('/api/social-proof/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomeId }),
      })
      const data = await response.json()
      if (!response.ok) {
        setToast(data.error || '후기 신고에 실패했습니다')
        return
      }

      setToast('후기를 신고했고 공개 피드에서 검수 대기로 전환했습니다')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-proof-stories'] }),
        queryClient.invalidateQueries({ queryKey: ['social-proof-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['social-proof-summary-page'] }),
        queryClient.invalidateQueries({ queryKey: ['social-proof-rounds'] }),
      ])
    } catch {
      setToast('네트워크 오류로 신고에 실패했습니다')
    } finally {
      setReportingId('')
    }
  }

  return (
    <div>
      <div style={{ background: '#fff', padding: '14px 16px', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 2 }}>회원 당첨 리포트</h2>
        <p style={{ fontSize: 12, color: '#888' }}>{uiCopy.reportSubtitle}</p>
      </div>

      {toast && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ background: '#1f2937', color: '#fff', borderRadius: 12, padding: '10px 12px', fontSize: 12, fontWeight: 700 }}>
            {toast}
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: '12px 16px' }}>
          <div className="skeleton" style={{ width: '100%', height: 132, borderRadius: 16, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 14, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 14 }} />
        </div>
      ) : (
        <>
          {summary && (
            <div style={{ padding: '0 16px 12px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #153d5a 0%, #1b6292 65%, #d9a62e 130%)',
                color: '#fff',
                borderRadius: 18,
                padding: '18px 16px',
                boxShadow: '0 10px 24px rgba(21,61,90,0.18)',
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>{uiCopy.reportSummaryLabel}</p>
                <p style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.4px' }}>{summary.headline}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.82)', marginBottom: 14 }}>
                  제{summary.round}회 · 추천 {summary.eligibleAutoSetCount}세트 · {summary.eligibleUserCount}명 참여 · 공개 후기는 검수 완료분만 노출
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 12px' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>추천 적중</p>
                    <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>{compactRankText(summary.appStats)}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '11px 12px' }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.72)', marginBottom: 6 }}>{uiCopy.reportVerifiedLabel}</p>
                    <p style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>{compactRankText(summary.verifiedStats)}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: '5px 10px' }}>
                    누적 당첨금 {formatPrize(summary.totalPrizeAmount)}
                  </span>
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: '5px 10px' }}>
                    인증 당첨금 {formatPrize(summary.verifiedPrizeAmount)}
                  </span>
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: '5px 10px' }}>
                    공개 후기 {summary.publicStoryCount}건
                  </span>
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#333' }}>회차별 성적</p>
              <p style={{ fontSize: 11, color: '#888' }}>최근 {rounds.length}개 회차</p>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {rounds.map(item => (
                <div key={item.round} style={{ background: '#fff', border: '1px solid #e7edf3', borderRadius: 14, padding: '14px 14px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: '#16324f' }}>제{item.round}회</p>
                    <p style={{ fontSize: 11, color: '#7c8a96' }}>{new Date(item.drawDate).toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ background: '#f8fbff', borderRadius: 10, padding: '9px 10px' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#007bc3', marginBottom: 5 }}>추천 적중</p>
                      <p style={{ fontSize: 12, color: '#334155' }}>{compactRankText(item.appStats)}</p>
                    </div>
                    <div style={{ background: '#f6fbf7', borderRadius: 10, padding: '9px 10px' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#1e7a46', marginBottom: 5 }}>실구매 QR 인증</p>
                      <p style={{ fontSize: 12, color: '#334155' }}>{compactRankText(item.verifiedStats)}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>추천 {item.eligibleAutoSetCount}세트</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>참여 {item.eligibleUserCount}명</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>공개 후기 {item.publicStoryCount}건</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '0 16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#333' }}>공개 후기</p>
              <p style={{ fontSize: 11, color: '#888' }}>{uiCopy.reportStoriesHint}</p>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {stories.length > 0 ? stories.map(story => (
                <div key={story.id} style={{ background: '#fff', border: '1px solid #e9edf2', borderRadius: 14, padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>{story.displayName}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#14683f', background: '#e9f7ee', borderRadius: 999, padding: '3px 7px' }}>
                      제{story.round}회 {story.rank}등 · QR 인증
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#0f5f97', background: '#eef7ff', borderRadius: 999, padding: '3px 7px' }}>
                      {uiCopy.reviewBadge}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#5b6773', lineHeight: 1.55, marginBottom: 7 }}>
                    {story.templateText || '당첨 후기를 공유했어요'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 11, color: '#97a0aa' }}>
                      {story.sharedAt ? new Date(story.sharedAt).toLocaleString('ko-KR') : ''}
                    </p>
                    <button
                      onClick={() => handleReportStory(story.id)}
                      disabled={reportingId === story.id}
                      style={{
                        border: '1px solid #ead4d4',
                        background: '#fff7f7',
                        color: '#9a4141',
                        borderRadius: 999,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: reportingId === story.id ? 'wait' : 'pointer',
                      }}
                    >
                      {reportingId === story.id ? '신고 중...' : '후기 신고'}
                    </button>
                  </div>
                </div>
              )) : (
                <div style={{ background: '#fff', border: '1px solid #e9edf2', borderRadius: 14, padding: '20px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#777' }}>아직 공개된 당첨 후기가 없습니다</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}