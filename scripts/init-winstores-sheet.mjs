/**
 * lotto.xlsx에 "판매점" 시트 초기화 (헤더만)
 * 사용: node scripts/init-winstores-sheet.mjs
 */

import pkg from 'xlsx'
const { readFile, writeFile, utils } = pkg

const EXCEL_PATH = 'D:\\facesaju\\assets\\lotto.xlsx'

const wb = readFile(EXCEL_PATH)

if (wb.SheetNames.includes('판매점')) {
  console.log('이미 판매점 시트가 존재합니다.')
  const ws = wb.Sheets['판매점']
  const data = utils.sheet_to_json(ws, { header: 1 })
  console.log(`현재 데이터: ${data.length - 1}개 행 (헤더 제외)`)
} else {
  // 헤더만 있는 새 시트 생성
  const data = [['회차', '판매점명', '주소', '구분']]
  const ws = utils.aoa_to_sheet(data)
  wb.SheetNames.push('판매점')
  wb.Sheets['판매점'] = ws
  writeFile(wb, EXCEL_PATH)
  console.log('판매점 시트 생성 완료')
}
