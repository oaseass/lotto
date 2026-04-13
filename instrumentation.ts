/**
 * Next.js 서버 시작 시 실행되는 instrumentation 파일
 * 로또 자동 업데이트 크론 잡 초기화
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startLottoCron } = await import('./src/lib/cron/update-lotto.mjs')
      startLottoCron()
    } catch (e) {
      console.error('❌ 로또 크론 초기화 실패:', e)
    }
  }
}
