// ================================
// API: QR 스캔 당첨 확인
// POST /api/qr/scan
// GET  /api/qr/scan (이력 조회)
// ================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseQrCode, calculateResult } from '@/lib/lotto/generator'
import { fetchLottoDraw, parseDraw } from '@/lib/lotto/dhlottery'

// QR 스캔 처리
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const { qrData } = await req.json()

    // QR 파싱
    const parsed = parseQrCode(qrData)
    if (!parsed) {
      return NextResponse.json({ error: '유효하지 않은 QR 코드입니다' }, { status: 400 })
    }

    const { round, sets } = parsed

    // 당첨번호 조회 (DB 우선, 없으면 API) — upsert로 race condition 방지
    let draw = await prisma.lottoDraw.findUnique({ where: { round } })
    if (!draw) {
      const apiData = await fetchLottoDraw(round)
      if (!apiData) {
        return NextResponse.json({
          error: `${round}회차 당첨번호가 아직 발표되지 않았습니다`,
        }, { status: 404 })
      }
      const parseData = parseDraw(apiData)
      draw = await prisma.lottoDraw.upsert({
        where: { round },
        update: {},
        create: parseData,
      })
    }

    // 당첨 결과 계산
    const result = calculateResult(sets, draw.numbers, draw.bonus)
    const totalPrize = result.reduce((sum, r) => sum + r.prize, 0)

    // 원본 스캔 번호를 결과에 포함
    const setsWithNumbers = result.map((r, i) => ({ ...r, numbers: sets[i] }))

    // 로그인 사용자면 이력 저장 (실패해도 스캔 결과는 반환)
    if (session?.user?.id) {
      try {
        await prisma.qrScan.create({
          data: {
            userId: session.user.id,
            round,
            scannedNumbers: sets.map((nums, i) => ({ set: i + 1, numbers: nums })),
            result,
            totalPrize: BigInt(totalPrize),
          },
        })
      } catch (e) {
        console.error('QrScan 저장 실패:', e)
      }
    }

    const vParam = new URL(qrData).searchParams.get('v') ?? ''
    return NextResponse.json({
      round,
      drawDate: draw.drawDate,
      drawNumbers: draw.numbers,
      bonus: draw.bonus,
      sets: setsWithNumbers,
      totalPrize,
      _dbg: { setsCount: sets.length, vLen: vParam.length, v: vParam },
    })
  } catch (error) {
    console.error('QR 스캔 오류:', error)
    return NextResponse.json({ error: '스캔 처리에 실패했습니다' }, { status: 500 })
  }
}

// 스캔 이력 조회
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const scans = await prisma.qrScan.findMany({
      where: { userId: session.user.id },
      orderBy: { scannedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        round: true,
        totalPrize: true,
        scannedAt: true,
      },
    })

    return NextResponse.json(scans)
  } catch (error) {
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}
