'use client'

export type HistoryScope = 'current' | 'all'

interface Props {
  value: HistoryScope
  currentRound: number
  onChange: (next: HistoryScope) => void
}

export default function HistoryScopeToggle({ value, currentRound, onChange }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '10px 16px', background: '#fff', borderBottom: '1px solid #f0f0f0',
    }}>
      <p style={{ fontSize: 11, color: '#888' }}>
        {value === 'current' ? `제${currentRound}회 구매 가능 번호만 표시 중` : '전체 번호 이력 표시 중'}
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          onClick={() => onChange('current')}
          style={{
            height: 28, padding: '0 10px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: value === 'current' ? '#007bc3' : '#f1f1f1',
            color: value === 'current' ? '#fff' : '#666',
            fontSize: 11, fontWeight: value === 'current' ? 700 : 500,
          }}
        >
          이번 회차만
        </button>
        <button
          onClick={() => onChange('all')}
          style={{
            height: 28, padding: '0 10px', borderRadius: 14,
            border: 'none', cursor: 'pointer',
            background: value === 'all' ? '#007bc3' : '#f1f1f1',
            color: value === 'all' ? '#fff' : '#666',
            fontSize: 11, fontWeight: value === 'all' ? 700 : 500,
          }}
        >
          전체 이력
        </button>
      </div>
    </div>
  )
}