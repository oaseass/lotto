/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['k.kakaocdn.net'],
  },
  // 서버 시작 시 instrumentation 실행 (크론 잡 초기화)
  experimental: {
    instrumentationHook: true,
  },
  // 동행복권 API CORS 우회를 위한 리다이렉트
  async rewrites() {
    return [
      {
        source: '/api/dhlottery/:path*',
        destination: 'https://www.dhlottery.co.kr/:path*',
      },
    ]
  },
}

module.exports = nextConfig
