export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px', fontFamily: 'sans-serif', color: '#333', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>개인정보 처리방침</h1>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 32 }}>시행일: 2026년 4월 15일</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>1. 수집하는 개인정보 항목</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          서비스는 다음 정보를 수집합니다:
        </p>
        <ul style={{ fontSize: 13, color: '#444', paddingLeft: 20, marginTop: 8 }}>
          <li>이메일 주소, 닉네임 (회원가입 시)</li>
          <li>생년월일, 생시 (사주 분석 시 - 선택)</li>
          <li>카카오 계정 정보 (카카오 로그인 이용 시)</li>
          <li>서비스 이용 기록 (로또 번호 생성 이력, QR 스캔 이력)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>2. 개인정보 수집·이용 목적</h2>
        <ul style={{ fontSize: 13, color: '#444', paddingLeft: 20 }}>
          <li>회원 식별 및 서비스 제공</li>
          <li>사주 기반 로또 번호 추천 서비스 제공</li>
          <li>서비스 이용 이력 조회</li>
          <li>광고 게재 (Google AdSense)</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>3. 개인정보 보관 기간</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          회원 탈퇴 시 즉시 삭제합니다. 단, 관계 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>4. 제3자 제공</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 단, Google AdSense 광고 서비스 운영을 위해 Google에 익명화된 사용 데이터가 전달될 수 있습니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>5. 이용자 권리</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          이용자는 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있으며, 회원 탈퇴를 통해 개인정보 삭제를 요청할 수 있습니다.
        </p>
      </section>

      <p style={{ fontSize: 12, color: '#aaa', borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
        문의: 서비스 내 고객센터
      </p>
    </div>
  )
}
