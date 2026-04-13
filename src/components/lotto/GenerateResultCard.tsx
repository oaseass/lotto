'use client'

// ================================
// 번호 생성 결과 카드
// ================================

import { useState } from 'react'
import { LottoBallSet } from './LottoBall'
import type { GenerateResponse } from '@/types'

interface GenerateResultCardProps {
  result: GenerateResponse
  onSave?: () => void
}

const OHAENG_COLOR: Record<string, string> = {
  목: 'text-ohaeng-mok',
  화: 'text-ohaeng-hwa',
  토: 'text-ohaeng-to',
  금: 'text-ohaeng-geum',
  수: 'text-ohaeng-su',
}

export function GenerateResultCard({ result, onSave }: GenerateResultCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(result.numbers.join(', '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card-dark animate-fade-in-up">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400">{result.drawRound}회차 추천 번호</p>
          <p className="text-sm font-bold text-brand-gold">
            일주: {result.sajuInfo.ilju} &nbsp;|&nbsp;
            부족 기운:{' '}
            {result.sajuInfo.yongsin.split(',').map((w, i) => (
              <span key={w} className={OHAENG_COLOR[w] || 'text-white'}>
                {i > 0 ? '·' : ''}{w}
              </span>
            ))}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 border border-gray-600 rounded-lg px-2 py-1
                       active:scale-95 transition-all"
          >
            {copied ? '✓ 복사됨' : '복사'}
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="text-xs text-brand-gold border border-brand-gold rounded-lg px-2 py-1
                         active:scale-95 transition-all"
            >
              저장
            </button>
          )}
        </div>
      </div>

      {/* 번호 볼 */}
      <div className="flex justify-center py-4">
        <LottoBallSet numbers={result.numbers} size="lg" animate />
      </div>

      {/* 오행 분포 */}
      <div className="flex gap-2 justify-center mt-2 flex-wrap">
        {Object.entries(result.sajuInfo.ohaeng).map(([k, v]) => (
          <span
            key={k}
            className={`ohaeng-badge border border-current ${OHAENG_COLOR[k] || ''}`}
          >
            {k} {v as number}
          </span>
        ))}
      </div>

      {/* 번호 근거 */}
      {result.reason && (
        <div className="mt-4 p-3 rounded-xl text-sm text-gray-300 leading-relaxed"
          style={{ background: 'var(--bg-raised, #1C1916)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--amber, #D4A843)' }}>이 번호가 선택된 이유</p>
          {result.reason}
        </div>
      )}
    </div>
  )
}
