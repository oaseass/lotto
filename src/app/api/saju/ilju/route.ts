import { NextRequest, NextResponse } from 'next/server'
import { getIljuData, ILJU_DATA } from '@/lib/saju/ilju-data'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (key) {
    const data = getIljuData(key)
    if (!data) return NextResponse.json({ error: '해당 일주 데이터가 없습니다' }, { status: 404 })
    return NextResponse.json(data)
  }
  // key 없으면 전체 반환
  return NextResponse.json(Object.values(ILJU_DATA))
}
