'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { LottoBallSet } from '@/components/lotto/LottoBall'
import { estimateCurrentRound } from '@/lib/lotto/dhlottery'
import { AdSlot } from '@/components/ui/AdSlot'

interface DrawDetail {
  round: number
  drawDate: string
  numbers: number[]
  bonus: number
  prize1st: string | null
  winners1st: number | null
  prize2nd: string | null
  winners2nd: number | null
}

interface RankDetail {
  rank: number
  winners: number | null
  prizePerWinner: number | null
}

interface WinStore {
  name: string
  address: string
  method: string
}

function formatPrize(val: string | number | null): string {
  if (val == null) return '-'
  const n = typeof val === 'string' ? parseInt(val) : val
  if (isNaN(n)) return '-'
  if (n >= 100000000) {
    const uk = Math.floor(n / 100000000)
    const rest = Math.floor((n % 100000000) / 10000000)
    return rest > 0 ? `${uk}억 ${rest}천만원` : `${uk}억원`
  }
  if (n >= 10000000) return `${Math.floor(n / 10000000)}천만원`
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`
  return n.toLocaleString() + '원'
}

function formatDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.')
}

const RANK_COLORS = ['#dc1f1f', '#e03f0e', '#e4a816', '#007bc3', '#129f97']
const RANK_LABELS = ['1등', '2등', '3등', '4등', '5등']
const RANK_CRITERIA = ['6개 일치', '5개 + 보너스', '5개 일치', '4개 일치', '3개 일치']

export default function DrawDetailPage() {
  const params = useParams()
  const router = useRouter()
  const roundNum = parseInt(params.round as string)
  const maxRound = estimateCurrentRound()

  const [draw, setDraw] = useState<DrawDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rankDetails, setRankDetails] = useState<RankDetail[] | null>(null)
  const [winStores, setWinStores] = useState<WinStore[] | null>(null)
  const [loadingStores, setLoadingStores] = useState(false)
  const [maxDbRound, setMaxDbRound] = useState(maxRound)

  // 실제 DB 최신 회차 (추첨 전 미래 회차 버튼 방지)
  useEffect(() => {
    fetch('/api/lotto/draws?limit=1')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d[0]?.round) setMaxDbRound(d[0].round) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!roundNum) return
    setLoading(true)
    setDraw(null)
    setRankDetails(null)
    setWinStores(null)
    fetch(`/api/lotto/draws?round=${roundNum}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.numbers) setDraw(d)
        else setError('해당 회차 정보를 찾을 수 없습니다')
      })
      .catch(() => setError('데이터 로드 실패'))
      .finally(() => setLoading(false))
  }, [roundNum])

  // 당첨 통계 (2~5등) 스크래핑
  useEffect(() => {
    if (!roundNum) return
    fetch(`/api/lotto/draws/detail?round=${roundNum}`)
      .then(r => r.json())
      .then(d => { setRankDetails(d?.ranks ?? []) })
      .catch(() => setRankDetails([]))
  }, [roundNum])

  // 1등 당첨 판매점 정보 스크래핑
  useEffect(() => {
    if (!roundNum) return
    setLoadingStores(true)
    fetch(`/api/lotto/draws/winstores?round=${roundNum}`)
      .then(r => r.json())
      .then(d => { setWinStores(Array.isArray(d) ? d : (d?.stores ?? [])) })
      .catch(() => setWinStores([]))
      .finally(() => setLoadingStores(false))
  }, [roundNum])

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 4, margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error || !draw) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#888' }}>{error || '정보를 불러올 수 없습니다'}</p>
      </div>
    )
  }

  // rankDetails에서 특정 등위 데이터 가져오기 (없으면 draw에서)
  function getRankData(rank: number) {
    if (rankDetails) {
      const r = rankDetails.find(r => r.rank === rank)
      if (r) return { winners: r.winners, prize: r.prizePerWinner }
    }
    if (rank === 1) return { winners: draw!.winners1st, prize: draw!.prize1st ? parseInt(draw!.prize1st) : null }
    if (rank === 2) return { winners: draw!.winners2nd, prize: draw!.prize2nd ? parseInt(draw!.prize2nd) : null }
    return { winners: null, prize: null }
  }

  return (
    <div>
      {/* ── 헤더: 회차 선택 + 번호 표시 ── */}
      <div style={{ background: '#007bc3', padding: '16px 16px 24px', textAlign: 'center' }}>
        {/* 회차 이동 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
          <button
            onClick={() => router.push(`/draw/${roundNum - 1}`)}
            disabled={roundNum <= 1}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: roundNum <= 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
              border: 'none', color: roundNum <= 1 ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: 16, cursor: roundNum <= 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >‹</button>
          <select
            value={roundNum}
            onChange={e => router.push(`/draw/${e.target.value}`)}
            style={{
              padding: '6px 12px', borderRadius: 4,
              border: 'none', fontSize: 14, fontWeight: 700,
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              cursor: 'pointer', outline: 'none',
              appearance: 'none', WebkitAppearance: 'none',
              minWidth: 160, textAlign: 'center',
            }}
          >
            {Array.from({ length: maxDbRound }, (_, i) => maxDbRound - i).map(r => (
              <option key={r} value={r} style={{ background: '#007bc3', color: '#fff' }}>
                제{r}회 추첨
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push(`/draw/${roundNum + 1}`)}
            disabled={roundNum >= maxDbRound}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: roundNum >= maxDbRound ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.25)',
              border: 'none', color: roundNum >= maxDbRound ? 'rgba(255,255,255,0.3)' : '#fff',
              fontSize: 16, cursor: roundNum >= maxDbRound ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >›</button>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>
          {formatDate(draw.drawDate)}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LottoBallSet numbers={draw.numbers} bonus={draw.bonus} size="md" />
        </div>
      </div>

      {/* ── 당첨 통계 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>당첨 통계</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(rank => {
            const { winners, prize } = getRankData(rank)
            return (
              <div key={rank} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: rank <= 2 ? '#f7f7f7' : 'transparent',
                borderRadius: 4,
                border: rank <= 2 ? '1px solid #ebebeb' : 'none',
              }}>
                <span style={{
                  minWidth: 32, height: 24,
                  background: RANK_COLORS[rank - 1], color: '#fff',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 3,
                }}>
                  {RANK_LABELS[rank - 1]}
                </span>
                <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{RANK_CRITERIA[rank - 1]}</span>
                {winners != null ? (
                  <>
                    <span style={{ fontSize: 12, color: '#333', fontWeight: 600 }}>{winners.toLocaleString()}명</span>
                    <span style={{ fontSize: 12, color: '#007bc3', fontWeight: 700 }}>{formatPrize(prize)}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 12, color: '#bbb' }}>
                    {rankDetails === null ? '로딩 중...' : '정보 없음'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 1등 당첨 판매점 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>🏆 1등 당첨 판매점</p>
          <a
            href={`https://www.dhlottery.co.kr/store.do?method=winStoreInfo&drwNo=${draw.round}`}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: '#007bc3', textDecoration: 'none' }}
          >
            공식 사이트 →
          </a>
        </div>

        {loadingStores ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 4 }} />
          </div>
        ) : winStores && winStores.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {winStores.map((store, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: '#f7fbff', border: '1px solid #c5dcf0', borderRadius: 4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: '#dc1f1f', padding: '1px 6px', borderRadius: 3,
                  }}>1등</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{store.name}</span>
                  <span style={{
                    fontSize: 10, color: '#007bc3',
                    border: '1px solid #c5dcf0', borderRadius: 2, padding: '1px 5px', marginLeft: 'auto',
                  }}>{store.method}</span>
                </div>
                <p style={{ fontSize: 12, color: '#666' }}>{store.address}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#f7fbff', border: '1px solid #c5dcf0',
            borderRadius: 4, padding: '14px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
              판매점 정보를 불러올 수 없습니다
            </p>
            <a
              href={`https://www.dhlottery.co.kr/store.do?method=winStoreInfo&drwNo=${draw.round}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '8px 20px',
                background: '#007bc3', color: '#fff',
                fontSize: 13, fontWeight: 700,
                textDecoration: 'none', borderRadius: 2,
              }}
            >
              공식 사이트에서 확인
            </a>
          </div>
        )}
      </div>

      {/* ── 번호 패턴 분석 ── */}
      {(() => {
        const nums = draw.numbers
        const odd = nums.filter(n => n % 2 !== 0).length
        const even = nums.length - odd
        const sum = nums.reduce((a, b) => a + b, 0)
        const ranges = [
          { label: '1~10', count: nums.filter(n => n <= 10).length },
          { label: '11~20', count: nums.filter(n => n >= 11 && n <= 20).length },
          { label: '21~30', count: nums.filter(n => n >= 21 && n <= 30).length },
          { label: '31~40', count: nums.filter(n => n >= 31 && n <= 40).length },
          { label: '41~45', count: nums.filter(n => n >= 41).length },
        ]
        const sorted = [...nums].sort((a, b) => a - b)
        const consecutive = sorted.filter((n, i) => i > 0 && n === sorted[i - 1] + 1).length

        return (
          <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '16px', marginTop: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>📊 번호 패턴 분석</p>

            {/* 홀짝 / 합계 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, padding: '10px', background: '#f7f7f7', borderRadius: 4, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>홀수 / 짝수</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#333' }}>
                  <span style={{ color: '#007bc3' }}>{odd}</span>
                  <span style={{ fontWeight: 400, color: '#bbb', margin: '0 4px' }}>:</span>
                  <span style={{ color: '#e86352' }}>{even}</span>
                </p>
              </div>
              <div style={{ flex: 1, padding: '10px', background: '#f7f7f7', borderRadius: 4, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>번호 합계</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: '#333' }}>{sum}</p>
              </div>
              <div style={{ flex: 1, padding: '10px', background: '#f7f7f7', borderRadius: 4, textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>연속번호</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: consecutive > 0 ? '#e4a816' : '#ccc' }}>
                  {consecutive > 0 ? `${consecutive}쌍` : '없음'}
                </p>
              </div>
            </div>

            {/* 번호대 분포 */}
            <p style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>번호대 분포</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {ranges.map(({ label, count }) => (
                <div key={label} style={{
                  flex: 1, textAlign: 'center', padding: '6px 2px',
                  background: count > 0 ? '#f0f7ff' : '#f7f7f7',
                  border: `1px solid ${count > 0 ? '#c5dcf0' : '#e0e0e0'}`,
                  borderRadius: 4,
                }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: count > 0 ? '#007bc3' : '#ccc' }}>{count}</p>
                  <p style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
      <div style={{ padding: '0 16px', marginTop: 8, marginBottom: 16 }}>
        <AdSlot />
      </div>
    </div>
  )
}
