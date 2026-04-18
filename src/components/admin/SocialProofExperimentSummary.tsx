'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type ExperimentSummaryResponse = {
  days: number
  since: string
  selectedRound: number | null
  availableRounds: number[]
  variants: Array<{
    variant: 'A' | 'B'
    totalImpressions: number
    totalPrimaryClicks: number
    totalSecondaryClicks: number
    totalPrimaryCtr: number
    totalSecondaryCtr: number
    surfaces: {
      HOME_CARD: {
        impressions: number
        primaryClicks: number
        secondaryClicks: number
        primaryCtr: number
        secondaryCtr: number
      }
      REPORT_PAGE: {
        impressions: number
        primaryClicks: number
        secondaryClicks: number
        primaryCtr: number
        secondaryCtr: number
      }
    }
  }>
  trends: Array<{
    date: string
    label: string
    variants: {
      A: {
        impressions: number
        primaryClicks: number
        secondaryClicks: number
        primaryCtr: number
        secondaryCtr: number
      }
      B: {
        impressions: number
        primaryClicks: number
        secondaryClicks: number
        primaryCtr: number
        secondaryCtr: number
      }
    }
  }>
  templatePerformance: Array<{
    variant: 'A' | 'B'
    templates: Array<{
      templateId: string
      templateText: string | null
      selectedSessions: number
      shareSuccessSessions: number
      conversionRate: number
    }>
  }>
}

const RANGE_OPTIONS = [7, 14, 30] as const

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export default function SocialProofExperimentSummary() {
  const [days, setDays] = useState<(typeof RANGE_OPTIONS)[number]>(7)
  const [selectedRound, setSelectedRound] = useState<number | 'ALL'>('ALL')
  const { data, isLoading } = useQuery<ExperimentSummaryResponse>({
    queryKey: ['social-proof-experiment-summary', days, selectedRound],
    queryFn: async () => {
      const params = new URLSearchParams({ days: String(days) })
      if (selectedRound !== 'ALL') {
        params.set('round', String(selectedRound))
      }

      const response = await fetch(`/api/admin/social-proof/experiments?${params.toString()}`)
      if (!response.ok) {
        throw new Error('A/B 성과를 불러오지 못했습니다')
      }
      return response.json()
    },
    staleTime: 60 * 1000,
  })

  return (
    <div style={{
      padding: '18px', borderRadius: 16, marginBottom: 16,
      background: 'var(--bg-card)', border: '1px solid var(--line)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>사회적 증거 A/B 반응</p>
          <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5 }}>노출, 클릭률, 문구별 공유 전환을 variant별로 비교합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGE_OPTIONS.map(option => (
            <button
              key={option}
              onClick={() => setDays(option)}
              style={{
                minWidth: 48,
                height: 32,
                borderRadius: 999,
                border: `1px solid ${days === option ? '#B8881E' : 'var(--line)'}`,
                background: days === option ? 'rgba(232,184,75,0.16)' : 'var(--bg-raised)',
                color: days === option ? '#E8B84B' : 'var(--t2)',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {option}일
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          onClick={() => setSelectedRound('ALL')}
          style={roundFilterStyle(selectedRound === 'ALL')}
        >
          전체 회차
        </button>
        {data?.availableRounds.map(round => (
          <button
            key={round}
            onClick={() => setSelectedRound(round)}
            style={roundFilterStyle(selectedRound === round)}
          >
            {round}회
          </button>
        ))}
      </div>

      {isLoading ? (
        <>
          <div className="skeleton" style={{ width: '100%', height: 136, borderRadius: 14, marginBottom: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 168, borderRadius: 14 }} />
        </>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {data?.variants.map(item => (
            <div key={item.variant} style={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-raised)', padding: '14px 14px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 900, color: item.variant === 'A' ? '#E8B84B' : '#78C4FF', marginBottom: 4 }}>Variant {item.variant}</p>
                  <p style={{ fontSize: 11, color: 'var(--t3)' }}>전체 노출 {item.totalImpressions}회 · 주 CTA CTR {formatPercent(item.totalPrimaryCtr)} · 보조 CTA CTR {formatPercent(item.totalSecondaryCtr)}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={pillStyle}>주 클릭 {item.totalPrimaryClicks}</span>
                  <span style={pillStyle}>보조 클릭 {item.totalSecondaryClicks}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={surfaceStyle}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>홈 카드</p>
                  <p style={metricStyle}>노출 {item.surfaces.HOME_CARD.impressions}</p>
                  <p style={metricStyle}>주 CTA {item.surfaces.HOME_CARD.primaryClicks}회 · CTR {formatPercent(item.surfaces.HOME_CARD.primaryCtr)}</p>
                  <p style={metricStyle}>보조 CTA {item.surfaces.HOME_CARD.secondaryClicks}회 · CTR {formatPercent(item.surfaces.HOME_CARD.secondaryCtr)}</p>
                </div>

                <div style={surfaceStyle}>
                  <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--t1)', marginBottom: 6 }}>리포트</p>
                  <p style={metricStyle}>노출 {item.surfaces.REPORT_PAGE.impressions}</p>
                  <p style={metricStyle}>주 CTA {item.surfaces.REPORT_PAGE.primaryClicks}회 · CTR {formatPercent(item.surfaces.REPORT_PAGE.primaryCtr)}</p>
                  <p style={metricStyle}>보조 CTA {item.surfaces.REPORT_PAGE.secondaryClicks}회 · CTR {formatPercent(item.surfaces.REPORT_PAGE.secondaryCtr)}</p>
                </div>
              </div>
            </div>
          ))}

          <div style={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-raised)', padding: '14px 14px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>날짜별 주 CTA 추이</p>
                <p style={{ fontSize: 11, color: 'var(--t3)' }}>막대 높이는 일자별 주 CTA CTR입니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...pillStyle, color: '#E8B84B' }}>A variant</span>
                <span style={{ ...pillStyle, color: '#78C4FF' }}>B variant</span>
              </div>
            </div>

            {data?.trends && data.trends.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.trends.length}, minmax(0, 1fr))`, gap: 6, alignItems: 'end' }}>
                {(() => {
                  const maxCtr = Math.max(5, ...data.trends.flatMap(item => [item.variants.A.primaryCtr, item.variants.B.primaryCtr]))

                  return data.trends.map(item => (
                    <div key={item.date} style={{ display: 'grid', justifyItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, height: 92, width: '100%' }}>
                        <div title={`A ${formatPercent(item.variants.A.primaryCtr)} / 노출 ${item.variants.A.impressions}`} style={barStyle(item.variants.A.primaryCtr, maxCtr, '#E8B84B')} />
                        <div title={`B ${formatPercent(item.variants.B.primaryCtr)} / 노출 ${item.variants.B.impressions}`} style={barStyle(item.variants.B.primaryCtr, maxCtr, '#78C4FF')} />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 2 }}>{item.label}</p>
                        <p style={{ fontSize: 10, color: 'var(--t2)' }}>{item.variants.A.impressions + item.variants.B.impressions}회</p>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            ) : (
              <div style={{ ...surfaceStyle, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--t3)' }}>선택한 기간에 추이 데이터가 없습니다.</p>
              </div>
            )}
          </div>

          <div style={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg-raised)', padding: '14px 14px 12px' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 }}>후기 문구 전환</p>
            <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>선택 세션 대비 실제 공유 성공 수를 문구별로 비교합니다.</p>

            <div style={{ display: 'grid', gap: 10 }}>
              {data?.templatePerformance.map(group => (
                <div key={group.variant} style={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg-card)', padding: '11px 12px' }}>
                  <p style={{ fontSize: 12, fontWeight: 900, color: group.variant === 'A' ? '#E8B84B' : '#78C4FF', marginBottom: 8 }}>Variant {group.variant}</p>
                  {group.templates.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {group.templates.map(item => (
                        <div key={item.templateId} style={{ borderRadius: 10, background: 'var(--bg-raised)', border: '1px solid var(--line)', padding: '10px 11px' }}>
                          <p style={{ fontSize: 12, color: 'var(--t1)', lineHeight: 1.5, marginBottom: 6 }}>{item.templateText || item.templateId}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={pillStyle}>선택 {item.selectedSessions}</span>
                            <span style={pillStyle}>공유 성공 {item.shareSuccessSessions}</span>
                            <span style={{ ...pillStyle, color: '#7DDA58' }}>전환율 {formatPercent(item.conversionRate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ ...surfaceStyle, textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: 'var(--t3)' }}>아직 문구 선택 데이터가 없습니다.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const pillStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--t2)',
  background: 'rgba(255,255,255,0.04)',
  borderRadius: 999,
  padding: '5px 10px',
  border: '1px solid var(--line)',
}

const surfaceStyle: React.CSSProperties = {
  borderRadius: 12,
  background: 'var(--bg-card)',
  border: '1px solid var(--line)',
  padding: '11px 12px',
}

const metricStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--t2)',
  lineHeight: 1.6,
}

function roundFilterStyle(active: boolean): React.CSSProperties {
  return {
    flex: '0 0 auto',
    height: 30,
    borderRadius: 999,
    border: `1px solid ${active ? '#B8881E' : 'var(--line)'}`,
    background: active ? 'rgba(232,184,75,0.16)' : 'var(--bg-raised)',
    color: active ? '#E8B84B' : 'var(--t2)',
    fontSize: 11,
    fontWeight: 800,
    padding: '0 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }
}

function barStyle(value: number, maxValue: number, color: string): React.CSSProperties {
  const safeHeight = value > 0 ? Math.max(8, (value / maxValue) * 80) : 4
  return {
    width: 10,
    height: safeHeight,
    borderRadius: '6px 6px 0 0',
    background: color,
    boxShadow: `0 6px 16px ${color}33`,
  }
}