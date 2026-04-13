// 사주 오행별 길한 방위 매핑
export const OHAENG_DIRECTION: Record<string, { directions: string[], degrees: number[] }> = {
  목: { directions: ['동', '동남'], degrees: [0, 45] },      // 목(木) = 東
  화: { directions: ['남', '남동'], degrees: [90, 135] },    // 화(火) = 南
  토: { directions: ['중앙'], degrees: [180] },              // 토(土) = 中央 (모든 방위)
  금: { directions: ['서', '서북'], degrees: [270, 315] },   // 금(金) = 西
  수: { directions: ['북', '북동'], degrees: [180, 225] },   // 수(水) = 北
}

// GPS 두 점 사이의 거리 계산 (Haversine formula) - km 단위
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 지구 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 두 GPS 좌표 사이의 방위각(bearing) 계산 - 도(degree) 단위
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const lat1Rad = (lat1 * Math.PI) / 180
  const lat2Rad = (lat2 * Math.PI) / 180

  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  const bearing = Math.atan2(y, x)
  const degrees = ((bearing * 180) / Math.PI + 360) % 360

  return degrees
}

// 방위각을 구간별 숫자로 변환 (8방위 기준)
export function bearingToOctant(bearing: number): number {
  // 0도: 북 (N)
  // 45도: 북동 (NE)
  // 90도: 동 (E)
  // 135도: 남동 (SE)
  // 180도: 남 (S)
  // 225도: 남서 (SW)
  // 270도: 서 (W)
  // 315도: 북서 (NW)
  return ((Math.round(bearing / 45) % 8) * 45 + 360) % 360
}

// 오행의 길한 방위에 포함되는지 확인
export function isInLuckyDirection(bearing: number, ohaeng: string): boolean {
  if (!OHAENG_DIRECTION[ohaeng]) return false

  // 토(土)는 모든 방위가 길함
  if (ohaeng === '토') return true

  // 방위 범위 내인지 확인 (±22.5도)
  const luckyDegrees = OHAENG_DIRECTION[ohaeng].degrees
  const tolerance = 22.5

  for (const degree of luckyDegrees) {
    const diff = Math.abs(bearing - degree)
    const minDiff = Math.min(diff, 360 - diff)
    if (minDiff <= tolerance) return true
  }

  return false
}

// 방위각을 한국식 방위 텍스트로 변환
export function bearingToKorean(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360
  const octant = Math.round(normalized / 45) % 8

  const directions = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
  return directions[octant]
}
