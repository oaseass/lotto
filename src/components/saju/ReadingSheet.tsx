'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { AdBanner } from '@/components/ui/AdBanner'

interface ReadingResult {
  ilju: string
  iljuHanja: string
  currentDaeun: string
  currentSeun: string
  sections: Record<string, string>
  raw: string
}

interface Props {
  onClose: () => void
}

const SECTION_ICONS: Record<string, string> = {
  '성격과 재능': '🌟',
  '현재 운세': '🔮',
  '재물과 기회': '💰',
  '주의와 조언': '💡',
}

const SECTION_COLORS: Record<string, string> = {
  '성격과 재능': '#007bc3',
  '현재 운세': '#8f35c8',
  '재물과 기회': '#e4a816',
  '주의와 조언': '#5bb544',
}

const AD_SECONDS = 5

export default function ReadingSheet({ onClose }: Props) {
  const { data: session } = useSession()
  const isAdFree = session?.user?.isAdFree ?? false

  const [step, setStep] = useState<'idle' | 'ad' | 'loading' | 'result'>('idle')
  const [result, setResult] = useState<ReadingResult | null>(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(AD_SECONDS)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 카운트다운
  useEffect(() => {
    if (step !== 'ad') return
    setCountdown(AD_SECONDS)
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const handleStart = () => {
    if (isAdFree) {
      doGenerate()
    } else {
      setStep('ad')
    }
  }

  const doGenerate = async () => {
    setStep('loading')
    setError('')
    try {
      const res = await fetch('/api/saju/reading', { method: 'POST' })
      if (!res.ok) {
        let msg = 'AI 통변 생성 실패'
        try { const d = await res.json(); msg = d.error || msg } catch {}
        setError(msg)
        setStep('idle')
        return
      }
      setResult(await res.json())
      setStep('result')
    } catch {
      setError('네트워크 오류가 발생했습니다')
      setStep('idle')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#fff',
        borderRadius: '16px 16px 0 0',
        overflow: 'hidden',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 헤더 */}
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '16px 16px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
              🔮 AI 사주 통변
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
              사주 데이터 기반으로 심층 분석합니다
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            fontSize: 16, cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px' }}>

          {/* ── IDLE: 시작 전 ── */}
          {step === 'idle' && (
            <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>☯️</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 8 }}>
                AI가 사주를 심층 분석해드립니다
              </p>
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.7, marginBottom: 24 }}>
                일주·오행·대운·세운을 종합하여<br/>
                성격, 현재 운세, 재물운, 조언을<br/>
                개인화된 통변으로 제공합니다
              </p>
              {error && (
                <p style={{
                  fontSize: 12, color: '#dc1f1f', marginBottom: 12,
                  padding: '8px 12px', background: '#fff5f5',
                  border: '1px solid #ffd5d5', borderRadius: 4,
                }}>{error}</p>
              )}
              <button
                onClick={handleStart}
                style={{
                  width: '100%', height: 48,
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #8f35c8 100%)',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isAdFree ? '내 사주 통변 받기' : '광고 보고 통변 받기'}
              </button>
              {!isAdFree && (
                <p style={{ fontSize: 11, color: '#bbb', marginTop: 10 }}>
                  짧은 광고 시청 후 결과를 확인하실 수 있습니다
                </p>
              )}
            </div>
          )}

          {/* ── AD: 광고 시청 ── */}
          {step === 'ad' && (
            <div style={{ padding: '8px 0' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#333', textAlign: 'center', marginBottom: 4 }}>
                잠시 광고를 확인해주세요
              </p>
              <p style={{ fontSize: 11, color: '#888', textAlign: 'center', marginBottom: 16 }}>
                {countdown > 0 ? `${countdown}초 후 통변을 받으실 수 있습니다` : '준비되었습니다!'}
              </p>

              {/* 광고 영역 */}
              <div style={{
                minHeight: 100, marginBottom: 16,
                borderRadius: 10, overflow: 'hidden',
                border: '1px solid #eee',
                background: '#fafafa',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AdBanner format="rectangle" isAdFree={false} />
              </div>

              {/* 프로그레스 바 */}
              <div style={{
                height: 4, background: '#f0f0f0', borderRadius: 2,
                marginBottom: 16, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: 'linear-gradient(90deg, #8f35c8, #007bc3)',
                  width: `${((AD_SECONDS - countdown) / AD_SECONDS) * 100}%`,
                  transition: 'width 1s linear',
                }} />
              </div>

              <button
                onClick={doGenerate}
                disabled={countdown > 0}
                style={{
                  width: '100%', height: 48,
                  background: countdown > 0
                    ? '#e0e0e0'
                    : 'linear-gradient(135deg, #1a1a2e 0%, #8f35c8 100%)',
                  border: 'none', borderRadius: 8,
                  color: countdown > 0 ? '#aaa' : '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: countdown > 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                }}
              >
                {countdown > 0 ? `${countdown}초 대기 중...` : '✨ 통변 받기'}
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                border: '4px solid #f0f0f0',
                borderTop: '4px solid #8f35c8',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }} />
              <p style={{ fontSize: 13, color: '#888' }}>사주를 분석 중입니다...</p>
              <p style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>잠시만 기다려주세요</p>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && result && (
            <div>
              {/* 요약 배지 */}
              <div style={{
                background: '#f7f0ff', border: '1px solid #d4aaff',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 6,
                  background: '#8f35c8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900, color: '#fff', flexShrink: 0,
                }}>{result.ilju}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
                    {result.iljuHanja}일주
                  </p>
                  <p style={{ fontSize: 11, color: '#666' }}>
                    대운 {result.currentDaeun} · 세운 {result.currentSeun}
                  </p>
                </div>
              </div>

              {/* 섹션별 통변 */}
              {['성격과 재능', '현재 운세', '재물과 기회', '주의와 조언'].map(key => {
                const text = result.sections[key]
                if (!text) return null
                return (
                  <div key={key} style={{
                    marginBottom: 14,
                    border: `1px solid ${SECTION_COLORS[key]}33`,
                    borderRadius: 8, overflow: 'hidden',
                  }}>
                    <div style={{
                      background: `${SECTION_COLORS[key]}15`,
                      padding: '8px 12px',
                      borderBottom: `1px solid ${SECTION_COLORS[key]}22`,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      <span style={{ fontSize: 14 }}>{SECTION_ICONS[key]}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: SECTION_COLORS[key] }}>{key}</span>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#fff' }}>
                      <p style={{ fontSize: 13, color: '#333', lineHeight: 1.75 }}>{text}</p>
                    </div>
                  </div>
                )
              })}

              <button
                onClick={() => { setStep('idle'); setResult(null); setError('') }}
                style={{
                  width: '100%', height: 40, marginTop: 4,
                  background: '#fff', border: '1px solid #dcdcdc',
                  fontSize: 13, color: '#666', cursor: 'pointer', borderRadius: 6,
                }}
              >
                🔄 다시 분석하기
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}
