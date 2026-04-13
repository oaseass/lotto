'use client'

import { useSession, signOut } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReadingSheet from '@/components/saju/ReadingSheet'
import type { IljuData } from '@/lib/saju/ilju-data'
import type { DaeunResult } from '@/lib/saju/daeun'

interface SajuProfile {
  ilju: string | null
  yongsin: string | null
  birthYear: number
  birthMonth: number
  birthDay: number
  birthHour: number | null
  isLunar: boolean
  isLeapMonth: boolean
}

interface Stats {
  total: number
  autoCount: number
  wins: number
  ranked: { rank: number; count: number }[]
}

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}
const CHEONGAN_DESC: Record<string, string> = {
  '甲': '양목', '乙': '음목', '丙': '양화', '丁': '음화', '戊': '양토',
  '己': '음토', '庚': '양금', '辛': '음금', '壬': '양수', '癸': '음수',
}
const JIJI_DESC: Record<string, string> = {
  '子': '수·쥐', '丑': '토·소', '寅': '목·호랑이', '卯': '목·토끼',
  '辰': '토·용', '巳': '화·뱀', '午': '화·말', '未': '토·양',
  '申': '금·원숭이', '酉': '금·닭', '戌': '토·개', '亥': '수·돼지',
}

export default function MyPage() {
  const { data: session, status, update: updateSession } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showIljuDetail, setShowIljuDetail] = useState(false)
  const [showReadingSheet, setShowReadingSheet] = useState(false)
  const [iljuData, setIljuData] = useState<IljuData | null>(null)
  const [loadingIlju, setLoadingIlju] = useState(false)

  const fetchIljuData = useCallback(async (ilju: string) => {
    setLoadingIlju(true)
    try {
      const res = await fetch(`/api/saju/ilju?key=${encodeURIComponent(ilju)}`)
      if (res.ok) setIljuData(await res.json())
    } finally {
      setLoadingIlju(false)
    }
  }, [])

  // 마이페이지 포커스 시 사주 프로필 최신화
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['saju-profile-mypage'] })
    queryClient.invalidateQueries({ queryKey: ['mypage-stats'] })
    updateSession()
  }, [])

  const { data: sajuProfile } = useQuery<SajuProfile | null>({
    queryKey: ['saju-profile-mypage'],
    queryFn: async () => {
      const res = await fetch('/api/saju/profile')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session,
  })

  useEffect(() => {
    if (sajuProfile?.ilju) fetchIljuData(sajuProfile.ilju)
  }, [sajuProfile?.ilju, fetchIljuData])

  const { data: stats } = useQuery<Stats>({
    queryKey: ['mypage-stats'],
    queryFn: async (): Promise<Stats> => {
      const res = await fetch('/api/lotto/my-numbers/stats')
      if (!res.ok) return { total: 0, autoCount: 0, wins: 0, ranked: [] }
      const data = await res.json()
      const rankSummary: Record<number, any[]> = data.rankSummary ?? {}
      const ranked = [1, 2, 3, 4, 5]
        .filter(r => (rankSummary[r]?.length ?? 0) > 0)
        .map(r => ({ rank: r, count: rankSummary[r].length }))
      const wins = ranked.reduce((s, r) => s + r.count, 0)
      return {
        total: data.total ?? 0,
        autoCount: data.autoCount ?? 0,
        wins,
        ranked,
      }
    },
    enabled: !!session,
  })

  const { data: daeunData } = useQuery<DaeunResult | null>({
    queryKey: ['daeun'],
    queryFn: async () => {
      const res = await fetch('/api/saju/daeun')
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session && !!sajuProfile?.ilju,
  })

  if (status === 'loading') {
    return <div style={{ padding: '40px 20px', textAlign: 'center' }}>
      <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4, margin: '0 auto' }} />
    </div>
  }

  if (!session) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: '#333', marginBottom: 8 }}>로그인이 필요합니다</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <Link href="/login" style={{
            padding: '10px 24px', background: '#007bc3', color: '#fff',
            fontSize: 13, fontWeight: 600, textDecoration: 'none', borderRadius: 2,
          }}>로그인</Link>
          <Link href="/register" style={{
            padding: '10px 24px', background: '#fff', color: '#444',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
            border: '1px solid #dcdcdc', borderRadius: 2,
          }}>회원가입</Link>
        </div>
      </div>
    )
  }

  const user = session.user
  const initial = (user?.name || user?.email || '?')[0].toUpperCase()

  return (
    <div>
      {/* AI 사주 통변 시트 */}
      {showReadingSheet && (
        <ReadingSheet onClose={() => setShowReadingSheet(false)} />
      )}

      {/* 프로필 카드 */}
      <div style={{
        background: '#007bc3', padding: '24px 16px 28px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          border: '2px solid rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initial}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            {user?.name || '회원'}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{user?.email}</p>
        </div>
        <button
          onClick={() => router.push('/mypage/edit')}
          style={{
            padding: '6px 12px', background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            borderRadius: 2, cursor: 'pointer', flexShrink: 0,
          }}
        >
          수정
        </button>
      </div>

      {/* 사주 정보 요약 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>내 사주 정보</p>
          <button
            onClick={() => router.push('/mypage/edit')}
            style={{
              fontSize: 12, color: '#007bc3', background: 'none',
              border: '1px solid #007bc3', borderRadius: 2,
              padding: '3px 10px', cursor: 'pointer',
            }}
          >
            {sajuProfile?.ilju ? '수정' : '입력하기'}
          </button>
        </div>
        {sajuProfile?.ilju ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 4, flexShrink: 0,
              background: sajuProfile.yongsin ? OHAENG_COLOR[sajuProfile.yongsin.split(',')[0]] : '#007bc3',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 900, color: '#fff',
            }}>
              {sajuProfile.ilju}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 2 }}>
                {sajuProfile.ilju}일주 · 부족기운 {sajuProfile.yongsin?.split(',').join('·')}
              </p>
              <p style={{ fontSize: 12, color: '#888' }}>
                {sajuProfile.birthYear}.{String(sajuProfile.birthMonth).padStart(2,'0')}.{String(sajuProfile.birthDay).padStart(2,'0')}
                {sajuProfile.isLunar ? ` (음력${sajuProfile.isLeapMonth ? ' 윤달' : ''})` : ' (양력)'}
                {sajuProfile.birthHour != null ? ` · ${sajuProfile.birthHour}시` : ''}
              </p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#888' }}>사주 정보를 입력하면 맞춤 번호를 추천받을 수 있어요</p>
        )}

        {/* 일주 특성 보기 토글 */}
        {sajuProfile?.ilju && (
          <div style={{ marginTop: 12 }}>
            <button
              onClick={() => setShowIljuDetail(v => !v)}
              style={{
                width: '100%', height: 34,
                background: showIljuDetail ? '#f0f7ff' : '#fff',
                border: `1px solid ${showIljuDetail ? '#007bc3' : '#dcdcdc'}`,
                color: showIljuDetail ? '#007bc3' : '#555',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer', borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              {iljuData ? `${iljuData.hanja}일주 특성 보기` : '일주 특성 보기'}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: showIljuDetail ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {showIljuDetail && (
              <div style={{
                marginTop: 10,
                border: '1px solid #dce8f5',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  background: sajuProfile.yongsin ? OHAENG_COLOR[sajuProfile.yongsin.split(',')[0]] : '#007bc3',
                  padding: '10px 14px',
                }}>
                  <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 2 }}>
                    {iljuData ? iljuData.hanja : sajuProfile.ilju}일주 특성
                  </p>
                  {iljuData && (
                    <>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                        {iljuData.summary}
                      </p>
                      {iljuData.hanja.length >= 2 && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>
                          {iljuData.hanja[0]}({CHEONGAN_DESC[iljuData.hanja[0]] ?? ''}) · {iljuData.hanja[1]}({JIJI_DESC[iljuData.hanja[1]] ?? ''})
                        </p>
                      )}
                    </>
                  )}
                </div>

                {loadingIlju ? (
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[1,2,3,4].map(i => (
                      <div key={i} className="skeleton" style={{ height: 14, borderRadius: 2 }} />
                    ))}
                  </div>
                ) : iljuData ? (
                  <div style={{ padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { icon: '📖', label: '성격', value: iljuData.personality },
                      { icon: '💼', label: '직업 적성', value: iljuData.career },
                      { icon: '🤝', label: '인간관계', value: iljuData.relationship },
                      { icon: '💰', label: '재물운', value: iljuData.fortune },
                      { icon: '⚠️', label: '주의사항', value: iljuData.caution },
                    ].map(({ icon, label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>{icon}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#007bc3', marginBottom: 2 }}>{label}</p>
                          <p style={{ fontSize: 12, color: '#444', lineHeight: 1.65 }}>{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ padding: '14px', fontSize: 12, color: '#888', textAlign: 'center' }}>
                    일주 데이터를 불러올 수 없습니다
                  </p>
                )}
              </div>
            )}

            {/* AI 사주 통변 버튼 */}
            <button
              onClick={() => setShowReadingSheet(true)}
              style={{
                width: '100%', height: 36, marginTop: 8,
                background: 'linear-gradient(135deg, #1a1a2e 0%, #8f35c8 100%)',
                border: 'none', borderRadius: 4,
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              🔮 AI 사주 통변 받기
            </button>
          </div>
        )}
      </div>

      {/* 대운/세운 */}
      {daeunData && (
        <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px', marginTop: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 4 }}>내 대운 흐름</p>
          <p style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
            대운수: {daeunData.daeunsu}세 시작 · {daeunData.direction}
          </p>

          {/* 대운 가로 스크롤 */}
          <div style={{ overflowX: 'auto', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, paddingBottom: 4, minWidth: 'max-content' }}>
              {daeunData.entries.map((entry) => (
                <div
                  key={entry.startAge}
                  style={{
                    minWidth: 54, padding: '8px 6px', textAlign: 'center',
                    background: entry.isCurrentDaeun ? '#007bc3' : '#f7f7f7',
                    border: `1px solid ${entry.isCurrentDaeun ? '#007bc3' : '#e0e0e0'}`,
                    borderRadius: 4,
                  }}
                >
                  <p style={{
                    fontSize: 10,
                    color: entry.isCurrentDaeun ? 'rgba(255,255,255,0.8)' : '#888',
                    marginBottom: 3,
                  }}>
                    {entry.startAge}세{entry.isCurrentDaeun ? ' ★' : ''}
                  </p>
                  <p style={{
                    fontSize: 14, fontWeight: 900,
                    color: entry.isCurrentDaeun ? '#fff' : '#333',
                    letterSpacing: '-0.5px',
                  }}>
                    {entry.ganji}
                  </p>
                  <p style={{
                    fontSize: 10,
                    color: entry.isCurrentDaeun ? 'rgba(255,255,255,0.7)' : '#aaa',
                    marginTop: 2,
                  }}>
                    {entry.hanja}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 세운 */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 8 }}>세운</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {daeunData.seun.map((s) => (
                <div
                  key={s.year}
                  style={{
                    padding: '5px 9px', borderRadius: 4, textAlign: 'center',
                    background: s.isCurrentYear ? '#f0f7ff' : '#f7f7f7',
                    border: `1.5px solid ${s.isCurrentYear ? '#007bc3' : '#e0e0e0'}`,
                  }}
                >
                  <p style={{
                    fontSize: 10,
                    color: s.isCurrentYear ? '#007bc3' : '#888',
                    fontWeight: s.isCurrentYear ? 700 : 400,
                    marginBottom: 1,
                  }}>
                    {s.year}
                  </p>
                  <p style={{
                    fontSize: 13, fontWeight: 700,
                    color: s.isCurrentYear ? '#007bc3' : '#333',
                  }}>
                    {s.ganji}
                  </p>
                  <p style={{ fontSize: 9, color: '#aaa' }}>{s.age}세</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 통계 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px', marginTop: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>번호 생성 통계</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: '생성된 번호', value: stats?.total ?? '-', unit: '세트', href: '/history' },
            { label: '사주 추천', value: stats?.autoCount ?? '-', unit: '세트', href: '/history' },
            { label: '당첨 횟수', value: stats?.wins ?? 0, unit: '회', href: '/history?tab=win' },
          ].map(({ label, value, unit, href }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              style={{
                background: '#f7f7f7', borderRadius: 4, padding: '12px 8px', textAlign: 'center',
                border: '1px solid #eee', cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 20, fontWeight: 900, color: '#007bc3' }}>{value}</p>
              <p style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{unit}</p>
              <p style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{label}</p>
            </button>
          ))}
        </div>
        {stats?.ranked && stats.ranked.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {stats.ranked.map(({ rank, count }) => (
              <span key={rank} style={{
                fontSize: 12, padding: '3px 10px',
                background: ['#dc1f1f','#e03f0e','#e4a816','#007bc3','#129f97'][rank-1] || '#888',
                color: '#fff', borderRadius: 10, fontWeight: 700,
              }}>
                {rank}등 {count}회
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 메뉴 목록 */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginTop: 8 }}>
        {[
          { label: '번호 이력', desc: '생성한 번호 전체 보기', href: '/history', icon: '📋' },
          { label: 'QR 당첨 확인', desc: '구매한 복권 당첨 확인', href: '/check', icon: '📱' },
          { label: '오늘의 운세', desc: '내 사주 기반 오늘 운세', href: '/fortune', icon: '☯️' },
        ].map(({ label, desc, href, icon }, i, arr) => (
          <Link key={href} href={href} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px',
            borderBottom: i < arr.length - 1 ? '1px solid #f5f5f5' : 'none',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>{label}</p>
              <p style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </Link>
        ))}
      </div>

      {/* 광고 제거 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #dcdcdc',
        padding: '14px 16px', marginTop: 8,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>🚫</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>광고 제거</p>
          <p style={{ fontSize: 12, color: '#888', marginTop: 1 }}>5,000원으로 광고 없이 사용하기</p>
        </div>
        <Link href="/payment/ad-free" style={{
          fontSize: 12, fontWeight: 700, color: '#fff',
          background: '#e4a816', border: 'none',
          borderRadius: 2, padding: '5px 12px', textDecoration: 'none',
        }}>
          결제하기
        </Link>
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: '16px', marginTop: 8 }}>
        {!showLogoutConfirm ? (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            style={{
              width: '100%', height: 42,
              background: '#fff', border: '1px solid #dcdcdc',
              color: '#888', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', borderRadius: 2,
            }}
          >
            로그아웃
          </button>
        ) : (
          <div style={{
            background: '#fff', border: '1px solid #dcdcdc',
            borderRadius: 4, padding: '16px',
          }}>
            <p style={{ fontSize: 13, color: '#333', textAlign: 'center', marginBottom: 14 }}>
              정말 로그아웃 하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, height: 40, background: '#fff',
                  border: '1px solid #dcdcdc', color: '#444',
                  fontSize: 13, cursor: 'pointer', borderRadius: 2,
                }}
              >
                취소
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/home' })}
                style={{
                  flex: 1, height: 40, background: '#dc1f1f',
                  border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', borderRadius: 2,
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: '#bbb' }}>사주로또 v1.0 · 문의: support@sajulotto.com</p>
      </div>

    </div>
  )
}
