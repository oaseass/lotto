'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { AdSlot } from '@/components/ui/AdSlot'

const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주',
]

const REGION_EMOJI: Record<string, string> = {
  서울: '🏙️', 경기: '🌆', 인천: '✈️', 부산: '🌊', 대구: '🍎', 광주: '💎',
  대전: '🚄', 울산: '🏭', 세종: '🏛️', 강원: '🏔️', 충북: '🌲', 충남: '🌾',
  전북: '🌻', 전남: '🐄', 경북: '🍑', 경남: '🦋', 제주: '🌴',
}

const OHAENG_COLOR: Record<string, string> = {
  목: '#5bb544', 화: '#e86352', 토: '#e4a816', 금: '#8f8f8f', 수: '#1994da',
}

interface TopStore {
  id?: string
  name: string
  address: string
  district?: string | null
  lat?: number | null
  lng?: number | null
  winCount1st: number
  lastUpdated?: string
  distance?: number
  bearing?: number
  isLucky?: boolean
}

export default function StoresPage() {
  const { data: session } = useSession()
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [showSajuRecommend, setShowSajuRecommend] = useState(false)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [userOhaeng, setUserOhaeng] = useState<string | null>(null)
  const [permission, setPermission] = useState<'pending' | 'granted' | 'denied'>('pending')

  // 사주 프로필 로드
  useEffect(() => {
    if (session && !userOhaeng) {
      fetch('/api/saju/profile')
        .then(r => r.ok ? r.json() : null)
        .then(p => p?.yongsin && setUserOhaeng(p.yongsin))
        .catch(() => {})
    }
  }, [session, userOhaeng])

  // GPS 위치 요청
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setPermission('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setPermission('granted')
      },
      () => setPermission('denied'),
    )
  }

  const { data: dbStores, isLoading } = useQuery<TopStore[]>({
    queryKey: ['stores', selectedRegion, gpsLocation, userOhaeng, showSajuRecommend],
    queryFn: async () => {
      let url = '/api/lotto/stores'

      if (showSajuRecommend && gpsLocation && userOhaeng) {
        url += `?lat=${gpsLocation.lat}&lng=${gpsLocation.lng}&ohaeng=${userOhaeng}&radius=2&top=10`
      } else if (selectedRegion) {
        url += `?region=${encodeURIComponent(selectedRegion)}`
      } else {
        url += '?top=20'
      }

      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
  })

  const displayStores = dbStores || []

  return (
    <div>
      {/* ── 헤더 ── */}
      <div style={{ background: '#007bc3', padding: '16px 16px 20px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
          🏪 로또 판매점
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          1등 다수 배출 판매점 · 지역별 검색
        </p>
      </div>

      {/* ── 공식 사이트 바로가기 ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #dcdcdc',
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 8,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 4,
          background: '#f0f7ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 18,
        }}>🔍</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 1 }}>동행복권 공식 판매점 검색</p>
          <p style={{ fontSize: 11, color: '#888' }}>내 주변 모든 판매점 실시간 검색</p>
        </div>
        <a
          href="https://www.dhlottery.co.kr/store.do?method=topStore&pageGubun=L645"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 12px',
            background: '#007bc3', color: '#fff',
            fontSize: 12, fontWeight: 700,
            textDecoration: 'none', borderRadius: 2, flexShrink: 0,
          }}
        >
          검색하기
        </a>
      </div>

      {/* ── 지역 선택 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '12px 16px', marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#333', marginBottom: 10 }}>지역별 보기</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button
            onClick={() => {
              setSelectedRegion(null)
              setShowSajuRecommend(false)
            }}
            style={{
              padding: '5px 12px', borderRadius: 14,
              background: !selectedRegion && !showSajuRecommend ? '#007bc3' : '#f5f5f5',
              color: !selectedRegion && !showSajuRecommend ? '#fff' : '#555',
              border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            전체
          </button>
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => {
                setSelectedRegion(r === selectedRegion ? null : r)
                setShowSajuRecommend(false)
              }}
              style={{
                padding: '5px 10px', borderRadius: 14,
                background: selectedRegion === r ? '#007bc3' : '#f5f5f5',
                color: selectedRegion === r ? '#fff' : '#555',
                border: 'none', fontSize: 12, cursor: 'pointer',
              }}
            >
              {REGION_EMOJI[r]} {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── 사주 기반 판매점 추천 ── */}
      {session && userOhaeng && (
        <div style={{
          background: '#f5f0ff', border: '1px solid #e8d5f2',
          borderRadius: 8, padding: '14px 16px', marginBottom: 8, marginLeft: 8, marginRight: 8,
        }}>
          {!showSajuRecommend ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', marginBottom: 10 }}>
                🧭 사주 기반 판매점 추천
              </p>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
                {userOhaeng} 오행의 길한 방위에 있는 판매점을 추천합니다<br/>
                저마다의 용신 오행 방위에서 운이 더 잘 풀릴 수 있어요
              </p>
              <button
                onClick={() => {
                  if (permission === 'pending') requestLocation()
                  else if (permission === 'granted') setShowSajuRecommend(true)
                }}
                style={{
                  width: '100%', height: 36,
                  background: permission === 'denied' ? '#ddd' : '#6d28d9',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}
              >
                {permission === 'pending' ? '위치정보 허용 후 추천받기' :
                 permission === 'granted' ? (showSajuRecommend ? '일반 보기로 돌아가기' : '추천 판매점 보기') :
                 '위치정보 권한 거부됨'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowSajuRecommend(false)}
              style={{
                width: '100%', height: 36,
                background: '#f5f5f5', color: '#333',
                fontSize: 12, fontWeight: 600,
                border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer',
              }}
            >
              ← 일반 보기로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* ── 판매점 목록 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', marginBottom: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px 8px', borderBottom: '1px solid #f0f0f0',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
            🏆 {showSajuRecommend ? '사주 궁합 판매점' : '1등 다수 배출 판매점'}
            {selectedRegion && !showSajuRecommend && <span style={{ color: '#007bc3', marginLeft: 4 }}>({selectedRegion})</span>}
          </p>
          {isLoading && <span style={{ fontSize: 11, color: '#888' }}>로딩 중...</span>}
        </div>

        {displayStores.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏪</div>
            <p style={{ fontSize: 13, color: '#888' }}>해당 판매점이 없습니다</p>
          </div>
        ) : (
          displayStores.map((store, i) => (
            <div key={store.id || i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px',
              borderBottom: i < displayStores.length - 1 ? '1px solid #f5f5f5' : 'none',
            }}>
              {/* 순위 */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: i === 0 ? '#e4a816' : i === 1 ? '#9e9e9e' : i === 2 ? '#cd7f32' : '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 900,
                color: i < 3 ? '#fff' : '#888',
              }}>
                {i + 1}
              </div>
              {/* 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{store.name}</p>
                  {store.isLucky && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: '#fff',
                      background: OHAENG_COLOR[userOhaeng!] || '#666',
                      padding: '1px 6px', borderRadius: 2,
                    }}>
                      길한 방위
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📍 {store.address}
                </p>
                {store.distance !== undefined && (
                  <p style={{ fontSize: 10, color: '#007bc3', marginTop: 2 }}>
                    📌 {store.distance.toFixed(1)}km 떨어짐
                  </p>
                )}
              </div>
              {/* 1등 횟수 */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#dc1f1f',
                  background: '#fff5f5', border: '1px solid #ffd5d5',
                  padding: '2px 8px', borderRadius: 3,
                }}>
                  1등 {store.winCount1st}회
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── 사주 기반 판매점 추천 ── */}
      <div style={{ padding: '0 16px', marginBottom: 8 }}><AdSlot /></div>
      {session && userOhaeng && (
        <div style={{
          background: '#f5f0ff', border: '1px solid #e8d5f2',
          borderRadius: 8, padding: '14px 16px', marginBottom: 8, marginLeft: 8, marginRight: 8,
        }}>
          {!showSajuRecommend ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6d28d9', marginBottom: 10 }}>
                🧭 사주 기반 판매점 추천
              </p>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
                {userOhaeng} 오행의 길한 방위에 있는 판매점을 추천합니다<br/>
                저마다의 용신 오행 방위에서 운이 더 잘 풀릴 수 있어요
              </p>
              <button
                onClick={() => {
                  if (permission === 'pending') requestLocation()
                  else if (permission === 'granted') setShowSajuRecommend(true)
                }}
                style={{
                  width: '100%', height: 36,
                  background: permission === 'denied' ? '#ddd' : '#6d28d9',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                }}
              >
                {permission === 'pending' ? '위치정보 허용 후 추천받기' :
                 permission === 'granted' ? (showSajuRecommend ? '일반 보기로 돌아가기' : '추천 판매점 보기') :
                 '위치정보 권한 거부됨'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowSajuRecommend(false)}
              style={{
                width: '100%', height: 36,
                background: '#f5f5f5', color: '#333',
                fontSize: 12, fontWeight: 600,
                border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer',
              }}
            >
              ← 일반 보기로 돌아가기
            </button>
          )}
        </div>
      )}

      {/* ── 당첨번호 회차별 판매점 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #dcdcdc', padding: '14px 16px', marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>
          📋 회차별 당첨 판매점 조회
        </p>
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
          특정 회차의 1등·2등 당첨 판매점을 확인하려면<br/>
          당첨번호 페이지에서 조회하거나 공식 사이트를 이용하세요
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/home" style={{
            flex: 1, height: 40, lineHeight: '38px', textAlign: 'center',
            background: '#f5f5f5', border: '1px solid #dcdcdc', color: '#444',
            fontSize: 12, textDecoration: 'none', borderRadius: 2,
          }}>
            최근 당첨번호 보기
          </Link>
          <a
            href="https://www.dhlottery.co.kr/gameInfo.do?method=lotto645"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, height: 40, lineHeight: '38px', textAlign: 'center',
              background: '#007bc3', color: '#fff',
              fontSize: 12, fontWeight: 700,
              textDecoration: 'none', borderRadius: 2,
            }}
          >
            공식 사이트
          </a>
        </div>
      </div>
      <div style={{ padding: '0 16px', marginTop: 8, marginBottom: 16 }}><AdSlot /></div>
    </div>
  )
}
