# 🎰 사주로또

사주(생년월일+생시) 기반 로또 번호 추출 서비스

---

## 📦 기술 스택

- **Frontend/Backend**: Next.js 14 (App Router, 풀스택)
- **DB**: PostgreSQL (Supabase 권장)
- **ORM**: Prisma
- **Auth**: NextAuth v5 (이메일+카카오)
- **AI 해설**: Anthropic Claude API
- **결제**: 토스페이먼츠
- **스타일**: Tailwind CSS (다크 골드 테마)

---

## 🚀 시작하기

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 설정
```bash
cp .env.local.example .env.local
# .env.local 파일을 열어서 각 값 입력
```

### 3. Supabase 프로젝트 생성
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. Settings > Database > Connection string 복사
4. `.env.local`의 `DATABASE_URL`에 붙여넣기

### 4. DB 마이그레이션
```bash
npm run db:generate
npm run db:push
```

### 5. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 접속

---

## 📁 폴더 구조

```
src/
├── app/
│   ├── (main)/          # 메인 앱 (하단 네비 포함)
│   │   ├── home/        # 홈
│   │   ├── generate/    # 번호 생성
│   │   ├── check/       # QR 당첨 확인
│   │   ├── history/     # 이력
│   │   └── stores/      # 판매점 (2차)
│   ├── (auth)/          # 인증
│   │   ├── login/
│   │   └── register/
│   ├── onboarding/      # 사주 프로필 입력
│   ├── payment/         # 광고 제거 결제
│   └── api/             # API 라우트
├── components/
│   ├── ui/              # 공통 UI
│   ├── lotto/           # 로또 관련
│   └── saju/            # 사주 관련
├── lib/
│   ├── saju/            # 사주 계산 로직
│   ├── lotto/           # 로또 번호 생성/파싱
│   ├── auth.ts          # NextAuth 설정
│   └── prisma.ts        # DB 클라이언트
└── types/               # TypeScript 타입
```

---

## 🔑 필요한 외부 서비스 및 키

| 서비스 | 용도 | 발급처 |
|---|---|---|
| Supabase | DB | https://supabase.com |
| Anthropic API | 번호 해설 | https://console.anthropic.com |
| 카카오 개발자 | 소셜 로그인 | https://developers.kakao.com |
| 토스페이먼츠 | 광고제거 결제 | https://developers.tosspayments.com |
| Google AdSense | 광고 수익 | https://adsense.google.com |

---

## 🗓️ MVP 기능 현황

### ✅ 완료
- [x] 회원가입 / 로그인 (이메일 + 카카오)
- [x] 사주 프로필 입력 (온보딩)
- [x] 사주 기반 로또 번호 생성
- [x] Claude API 번호 해설
- [x] QR 스캔 당첨 확인 (카메라 + 갤러리)
- [x] 당첨 번호 자동 동기화 (동행복권 API)
- [x] 번호/스캔 이력 저장
- [x] 광고 배너 (AdSense)
- [x] 광고 제거 결제 (₩5,000 토스페이먼츠)

### 🔜 2차 업데이트
- [ ] 판매점 추천 (GPS + 사주 매칭)
- [ ] 카카오맵 연동
- [ ] 주간 번호 알림 (푸시/이메일)
- [ ] SNS 공유 카드
- [ ] 번호 통계 대시보드

---

## ⚙️ 당첨번호 자동 업데이트

매주 토요일 밤 자동 실행 (Vercel Cron 또는 외부 크론 서버):

```bash
# vercel.json에 추가
{
  "crons": [{
    "path": "/api/lotto/draws/sync",
    "schedule": "0 21 * * 6"
  }]
}
```

---

## 📱 주요 화면

| 화면 | 경로 |
|---|---|
| 홈 | `/home` |
| 번호 생성 | `/generate` |
| QR 당첨 확인 | `/check` |
| 이력 | `/history` |
| 판매점 | `/stores` |
| 로그인 | `/login` |
| 회원가입 | `/register` |
| 사주 등록 | `/onboarding` |
| 광고 제거 결제 | `/payment/ad-free` |
