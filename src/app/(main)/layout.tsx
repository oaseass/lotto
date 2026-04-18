// ================================
// 메인 레이아웃 (헤더 + 바텀 네비)
// ================================
'use client'

import { BottomNav } from '@/components/ui/BottomNav'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

// 뒤로가기가 필요한 페이지와 그 부모 경로
const BACK_PAGES: Record<string, string> = {
  '/history': '/home',
  '/check': '/home',
  '/stores': '/home',
  '/fortune': '/home',
  '/report': '/home',
  '/mypage': '/home',
  '/payment/ad-free': '/mypage',
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const isHome = pathname === '/home'
  const backTo = BACK_PAGES[pathname]
  const isDrawDetail = pathname.startsWith('/draw/')
  const effectiveBackTo = backTo || (isDrawDetail ? '/home' : undefined)

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 헤더 */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: '#007bc3',
        height: 48,
        display: 'flex', alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          maxWidth: 480, width: '100%', margin: '0 auto', padding: '0 14px',
          gap: 8,
        }}>
          {/* 뒤로가기 or 로고 */}
          {!isHome && effectiveBackTo ? (
            <button
              onClick={() => router.back()}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 4px 4px 0', flexShrink: 0 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="11" fill="#fff" opacity="0.15"/>
              <circle cx="12" cy="12" r="8" fill="#fff" opacity="0.2"/>
              <text x="12" y="16.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">645</text>
            </svg>
          )}

          {/* 타이틀 */}
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', flex: 1 }}>
            {isDrawDetail
              ? `제${pathname.split('/')[2]}회 당첨번호`
              : (!isHome && effectiveBackTo
                ? ({ '/history': '이력', '/check': 'QR확인', '/stores': '판매점', '/fortune': '오늘의 운세', '/report': '회원 당첨 리포트', '/mypage': '마이페이지', '/payment/ad-free': '광고제거 결제' } as Record<string, string>)[pathname] ?? '사주로또'
                : '사주로또')}
          </span>

          {/* 홈에서만 서브타이틀 뱃지 */}
          {isHome && (
            <span style={{
              fontSize: 11, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(255,255,255,0.15)',
              padding: '2px 7px', borderRadius: 10,
            }}>
              사주 기반 번호 추천
            </span>
          )}

          {/* 유저 정보 (우측) */}
          {session?.user ? (
            <Link href="/mypage" style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 14, padding: '3px 8px 3px 4px',
              textDecoration: 'none', flexShrink: 0, marginLeft: 4,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>
                {(session.user.name || session.user.email || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 11, color: '#fff', fontWeight: 600, maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.name || session.user.email?.split('@')[0] || '내정보'}
              </span>
            </Link>
          ) : (
            <Link href="/login" style={{
              fontSize: 11, color: '#fff',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 10, padding: '3px 9px',
              textDecoration: 'none', flexShrink: 0, marginLeft: 4,
            }}>
              로그인
            </Link>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main style={{
        maxWidth: 480, margin: '0 auto',
        paddingBottom: 70,
        minHeight: 'calc(100vh - 48px)',
      }}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
