'use client'

// 공식 동행복권 볼 색상 기준
function getBallClass(number: number, isBonus?: boolean): string {
  if (isBonus) return 'ball-bonus'
  if (number <= 10) return 'ball-yellow'
  if (number <= 20) return 'ball-blue'
  if (number <= 30) return 'ball-red'
  if (number <= 40) return 'ball-gray'
  return 'ball-green'
}

const SIZES = {
  sm: 30,
  md: 36,
  lg: 46,
}

interface LottoBallProps {
  number: number
  size?: 'sm' | 'md' | 'lg'
  isBonus?: boolean
  isMatched?: boolean
  animate?: boolean
  dimmed?: boolean
}

export function LottoBall({
  number, size = 'md', isBonus = false, isMatched = false, animate = false, dimmed = false,
}: LottoBallProps) {
  const px = SIZES[size]
  return (
    <span
      className={`lotto-ball ${dimmed ? '' : getBallClass(number, isBonus)} ${animate ? 'ball-rolling' : ''}`}
      style={{
        width: px, height: px,
        fontSize: size === 'lg' ? 18 : size === 'md' ? 15 : 13,
        outline: isMatched ? '2.5px solid #333' : undefined,
        outlineOffset: isMatched ? 1 : undefined,
        ...(dimmed ? {
          background: '#e2e2e2',
          color: '#aaa',
          boxShadow: 'none',
        } : {}),
      }}
    >
      {number}
    </span>
  )
}

interface LottoBallSetProps {
  numbers: number[]
  bonus?: number
  matchedNumbers?: number[]
  size?: 'sm' | 'md' | 'lg'
  animate?: boolean
}

export function LottoBallSet({
  numbers, bonus, matchedNumbers = [], size = 'md', animate = false,
}: LottoBallSetProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      {numbers.map((num, i) => (
        <LottoBall
          key={i}
          number={num}
          size={size}
          isMatched={matchedNumbers.includes(num)}
          dimmed={matchedNumbers.length > 0 && !matchedNumbers.includes(num)}
          animate={animate}
        />
      ))}
      {bonus !== undefined && (
        <>
          <span style={{ color: '#bbb', fontSize: 14, margin: '0 2px', fontWeight: 700 }}>+</span>
          <LottoBall number={bonus} size={size} isBonus isMatched={matchedNumbers.includes(bonus)} />
        </>
      )}
    </div>
  )
}
