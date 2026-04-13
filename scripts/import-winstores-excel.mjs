/**
 * 엑셀 "판매점" 시트에서 DB로 임포트
 * 사용: node --env-file=.env.local scripts/import-winstores-excel.mjs
 */

import pkg from 'xlsx'
const { readFile, utils } = pkg
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EXCEL_PATH = 'D:\\facesaju\\assets\\lotto.xlsx'

async function main() {
  const wb = readFile(EXCEL_PATH)
  if (!wb.SheetNames.includes('판매점')) {
    console.log('판매점 시트 없음. scripts/init-winstores-sheet.mjs 먼저 실행하세요.')
    process.exit(0)
  }

  const ws = wb.Sheets['판매점']
  const rows = utils.sheet_to_json(ws) // 헤더 기반 객체 배열

  if (rows.length === 0) {
    console.log('판매점 시트에 데이터 없음')
    process.exit(0)
  }

  console.log(`${rows.length}개 행 읽기 완료`)

  let saved = 0, skipped = 0
  for (const row of rows) {
    const round = Number(row['회차'])
    const name = String(row['판매점명'] || '').trim()
    const address = String(row['주소'] || '').trim()
    const method = row['구분'] ? String(row['구분']).trim() : null

    if (!round || !name) { skipped++; continue }

    try {
      await prisma.lottoDrawStore.upsert({
        where: { round_name: { round, name } },
        create: { round, name, address, method: method || null },
        update: { address, method: method || null },
      })
      saved++
    } catch {
      // FK 오류 등 → 스킵
      skipped++
    }
  }

  console.log(`완료: 저장 ${saved}개, 스킵 ${skipped}개`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
