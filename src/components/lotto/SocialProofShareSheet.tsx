'use client'

import { useEffect, useRef, useState } from 'react'

import {
  getShareTemplatesByVariant,
  getSocialProofUiCopy,
  type SocialProofTemplateId,
} from '@/lib/social-proof/templates'
import { trackSocialProofEvent } from '@/lib/social-proof/tracker'
import { useSocialProofCopyVariant } from '@/lib/social-proof/useCopyVariant'

export interface ShareableOutcome {
  set: number
  outcomeId: string
  round: number
  rank: number
  numbers: number[]
  shareStatus: 'PRIVATE' | 'SHARED' | 'HIDDEN'
  shareNameMode: 'ANON' | 'NICKNAME'
  shareTemplateId: string | null
}

interface ShareSheetProps {
  visible: boolean
  outcome: ShareableOutcome | null
  onClose: () => void
  onSaved: (payload: {
    outcomeId: string
    shareStatus: 'PRIVATE' | 'SHARED' | 'HIDDEN'
    shareNameMode: 'ANON' | 'NICKNAME'
    shareTemplateId: string | null
  }) => void
}

export default function SocialProofShareSheet({ visible, outcome, onClose, onSaved }: ShareSheetProps) {
  const variant = useSocialProofCopyVariant()
  const uiCopy = getSocialProofUiCopy(variant)
  const templateEntries = getShareTemplatesByVariant(variant)
  const lastTrackedSelectionRef = useRef('')
  const [shareStatus, setShareStatus] = useState<'PRIVATE' | 'SHARED' | 'HIDDEN'>('SHARED')
  const [shareNameMode, setShareNameMode] = useState<'ANON' | 'NICKNAME'>('ANON')
  const [templateId, setTemplateId] = useState<SocialProofTemplateId>('FOLLOW_RECOMMENDATION')
  const [shareSessionKey, setShareSessionKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!templateEntries.some(([key]) => key === templateId)) {
      setTemplateId(templateEntries[0]?.[0] ?? 'FOLLOW_RECOMMENDATION')
    }
  }, [templateEntries, templateId])

  useEffect(() => {
    if (!visible || !outcome) return

    lastTrackedSelectionRef.current = ''
    setShareSessionKey(createShareSessionKey())
    setShareStatus(outcome.shareStatus === 'HIDDEN' ? 'HIDDEN' : (outcome.shareStatus || 'SHARED'))
    setShareNameMode(outcome.shareNameMode || 'ANON')
    setTemplateId((outcome.shareTemplateId as SocialProofTemplateId) || templateEntries[0]?.[0] || 'FOLLOW_RECOMMENDATION')
    setError('')
    setIsSubmitting(false)
  }, [visible, outcome, templateEntries])

  useEffect(() => {
    if (!visible || !outcome || shareStatus !== 'SHARED' || !shareSessionKey) return

    const trackedKey = `${shareSessionKey}:${templateId}`
    if (lastTrackedSelectionRef.current === trackedKey) {
      return
    }

    lastTrackedSelectionRef.current = trackedKey
    trackSocialProofEvent({
      variant,
      surface: 'SHARE_SHEET',
      eventName: 'TEMPLATE_SELECT',
      round: outcome.round,
      templateId,
      sessionKey: shareSessionKey,
    })
  }, [outcome, shareSessionKey, shareStatus, templateId, variant, visible])

  if (!visible || !outcome) return null

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/social-proof/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcomeId: outcome.outcomeId,
          shareStatus,
          shareNameMode,
          shareTemplateId: shareStatus === 'SHARED' ? templateId : null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || '공유 설정 저장에 실패했습니다')
        return
      }

      if (data.shareStatus === 'SHARED') {
        trackSocialProofEvent({
          variant,
          surface: 'SHARE_SHEET',
          eventName: 'SHARE_SUCCESS',
          round: outcome.round,
          templateId: data.shareTemplateId || templateId,
          sessionKey: shareSessionKey,
        })
      }

      onSaved({
        outcomeId: outcome.outcomeId,
        shareStatus: data.shareStatus,
        shareNameMode: data.shareNameMode,
        shareTemplateId: data.shareTemplateId,
      })
      onClose()
    } catch {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={onClose}>
      <div style={{
        width: '100%', background: '#fff', borderRadius: '18px 18px 0 0',
        padding: '18px 16px 20px', boxShadow: '0 -8px 28px rgba(0,0,0,0.18)',
      }} onClick={event => event.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#222', marginBottom: 4 }}>{uiCopy.shareSheetTitle}</p>
            <p style={{ fontSize: 12, color: '#777' }}>{outcome.set}번 게임 · {outcome.rank}등 당첨 · {uiCopy.shareSheetSubtitle}</p>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer' }}>
            ✕
          </button>
        </div>

        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6 }}>공개 방식</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShareStatus('SHARED')} style={toggleStyle(shareStatus === 'SHARED')}>
                공개
              </button>
              <button onClick={() => setShareStatus('PRIVATE')} style={toggleStyle(shareStatus === 'PRIVATE')}>
                비공개
              </button>
              <button onClick={() => setShareStatus('HIDDEN')} style={toggleStyle(shareStatus === 'HIDDEN')}>
                숨김
              </button>
            </div>
          </div>

          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6 }}>이름 표시</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShareNameMode('ANON')} style={toggleStyle(shareNameMode === 'ANON')}>
                익명
              </button>
              <button onClick={() => setShareNameMode('NICKNAME')} style={toggleStyle(shareNameMode === 'NICKNAME')}>
                닉네임
              </button>
            </div>
          </div>

          {shareStatus === 'SHARED' && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#666', marginBottom: 6 }}>{uiCopy.shareTemplateLabel}</p>
              <div style={{ display: 'grid', gap: 6 }}>
                {templateEntries.map(([key, label]) => (
                  <button key={key} onClick={() => setTemplateId(key)} style={{
                    textAlign: 'left',
                    borderRadius: 10,
                    border: templateId === key ? '1px solid #007bc3' : '1px solid #d9dfe5',
                    background: templateId === key ? '#eef7ff' : '#fff',
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#334155',
                    cursor: 'pointer',
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: 10, background: '#fff5f5', color: '#cc2b2b', fontSize: 12, borderRadius: 10, padding: '10px 12px' }}>
            {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={isSubmitting} style={{
          width: '100%', height: 42, borderRadius: 10, border: 'none', cursor: isSubmitting ? 'wait' : 'pointer',
          background: '#007bc3', color: '#fff', fontSize: 13, fontWeight: 800,
        }}>
          {isSubmitting ? '저장 중...' : '공유 설정 저장'}
        </button>
      </div>
    </div>
  )
}

function toggleStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 38,
    borderRadius: 10,
    border: active ? '1px solid #007bc3' : '1px solid #d8dee4',
    background: active ? '#eef7ff' : '#fff',
    color: active ? '#007bc3' : '#55606d',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  }
}

function createShareSessionKey() {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }

  return `share_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}