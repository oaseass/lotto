'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/home',
    label: '홈',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? '#007bc3' : 'none'} stroke={active ? '#007bc3' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: '/fortune',
    label: '오늘의운세',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#007bc3' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7v5l3 3"/>
        <path d="M5.5 5.5l1.5 1.5M17 5.5l-1.5 1.5"/>
      </svg>
    ),
  },
  {
    href: '/check',
    label: 'QR확인',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#007bc3' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <path d="M14 14h3v3M17 14v3h3M14 17v3M17 21h3"/>
      </svg>
    ),
  },
  {
    href: '/history',
    label: '이력',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#007bc3' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8v4l2.5 2.5"/>
        <path d="M3.05 11a9 9 0 1 0 .5-3.5"/>
        <path d="M3 4.5V8h3.5"/>
      </svg>
    ),
  },
  {
    href: '/stores',
    label: '판매점',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#007bc3' : '#888'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: '#fff',
      borderTop: '1px solid #dcdcdc',
      boxShadow: '0 -1px 4px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        display: 'flex',
        maxWidth: 480, margin: '0 auto',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '8px 0 6px',
                textDecoration: 'none',
                gap: 3,
              }}
            >
              {item.icon(isActive)}
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 400,
                color: isActive ? '#007bc3' : '#888',
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
