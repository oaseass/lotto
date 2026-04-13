"""
APK lotto_history.db → PostgreSQL 전체 임포트
사용: python scripts/import-apk-data.py
"""

import sqlite3
import json
import sys
import os
import urllib.request
import urllib.parse

APK_DB = r'C:\Users\지니\Downloads\lotto_base\assets\db\lotto_history.db'

# .env.local에서 DATABASE_URL 읽기
def get_db_url():
    env_file = r'D:\sajulotto\.env.local'
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.strip().split('=', 1)[1].strip('"\'')
    return os.environ.get('DATABASE_URL', '')

def main():
    print('\n🎰 APK lotto_history.db → PostgreSQL 임포트')
    print(f'   소스: {APK_DB}\n')

    if not os.path.exists(APK_DB):
        print(f'❌ APK DB 파일 없음: {APK_DB}')
        sys.exit(1)

    # SQLite 읽기
    conn = sqlite3.connect(APK_DB)
    cur = conn.cursor()
    cur.execute('''
        SELECT drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6,
               bnusNo, firstWinamnt, firstPrzwnerCo
        FROM lotto_win ORDER BY drwNo
    ''')
    rows = cur.fetchall()
    conn.close()
    print(f'   SQLite 레코드: {len(rows)}개')

    # JSON으로 저장 (Node.js에서 읽도록)
    data = []
    for r in rows:
        data.append({
            'round': r[0],
            'drawDate': r[1],
            'n1': r[2], 'n2': r[3], 'n3': r[4],
            'n4': r[5], 'n5': r[6], 'n6': r[7],
            'bonus': r[8],
            'prize1st': str(r[9] or 0),
            'winners1st': r[10] or 0,
        })

    out_path = r'D:\sajulotto\scripts\_apk_data.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f)

    print(f'   JSON 저장 완료: {out_path}')
    print(f'   총 {len(data)}개 회차 데이터\n')
    print('✅ 다음 명령으로 DB에 임포트하세요:')
    print('   node scripts/import-from-json.mjs\n')

if __name__ == '__main__':
    main()
