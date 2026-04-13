/**
 * 엑셀 파일에서 로또 데이터 읽기 및 DB 로드
 * 사용: node scripts/import-excel-lotto.mjs
 */

import pkg from 'xlsx'
const { readFile } = pkg
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 엑셀 파일 읽기
    const filePath = 'D:\\facesaju\\assets\\lotto.xlsx'
    console.log(`📖 엑셀 파일 읽기: ${filePath}`)

    const workbook = readFile(filePath)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]

    if (!sheet) {
      console.error('❌ 시트를 찾을 수 없습니다')
      return
    }

    // 데이터 파싱 (A:L 열)
    const rows = []
    let rowNum = 2 // 헤더 제외 (1번째 행은 헤더)

    while (true) {
      const roundCell = sheet[`A${rowNum}`]
      if (!roundCell) break

      const round = parseInt(roundCell.v)
      if (isNaN(round)) {
        rowNum++
        continue
      }

      // B~H: 당첨번호 (6개) + 보너스
      const numbers = [
        parseInt(sheet[`B${rowNum}`]?.v) || 0,
        parseInt(sheet[`C${rowNum}`]?.v) || 0,
        parseInt(sheet[`D${rowNum}`]?.v) || 0,
        parseInt(sheet[`E${rowNum}`]?.v) || 0,
        parseInt(sheet[`F${rowNum}`]?.v) || 0,
        parseInt(sheet[`G${rowNum}`]?.v) || 0,
      ]
      const bonus = parseInt(sheet[`H${rowNum}`]?.v) || 0

      const prize1st = BigInt(sheet[`I${rowNum}`]?.v || 0)
      const winners1st = parseInt(sheet[`J${rowNum}`]?.v) || 0
      const prize2nd = BigInt(sheet[`K${rowNum}`]?.v || 0)
      const winners2nd = parseInt(sheet[`L${rowNum}`]?.v) || 0

      rows.push({
        round,
        numbers,
        bonus,
        prize1st,
        winners1st,
        prize2nd,
        winners2nd,
      })

      rowNum++
    }

    console.log(`✅ ${rows.length}개 회차 데이터 파싱 완료\n`)

    // DB에 저장
    let success = 0
    let updated = 0
    let skipped = 0

    for (const row of rows) {
      try {
        const result = await prisma.lottoDraw.upsert({
          where: { round: row.round },
          create: {
            round: row.round,
            drawDate: new Date(), // 날짜는 API에서 가져올 예정
            numbers: row.numbers,
            bonus: row.bonus,
            prize1st: row.prize1st,
            winners1st: row.winners1st,
            prize2nd: row.prize2nd,
            winners2nd: row.winners2nd,
          },
          update: {
            prize1st: row.prize1st,
            winners1st: row.winners1st,
            prize2nd: row.prize2nd,
            winners2nd: row.winners2nd,
          },
        })

        if (result.createdAt === result.updatedAt) {
          success++
        } else {
          updated++
        }
      } catch (e) {
        console.error(`❌ ${row.round}회 오류:`, e.message)
        skipped++
      }
    }

    console.log(`📊 결과:`)
    console.log(`   생성: ${success}개`)
    console.log(`   업데이트: ${updated}개`)
    console.log(`   오류: ${skipped}개\n`)

    await prisma.$disconnect()
  } catch (e) {
    console.error('❌ 오류:', e)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
