export default function TermsPage() {
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px', fontFamily: 'sans-serif', color: '#333', lineHeight: 1.7 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>서비스 이용약관</h1>
      <p style={{ fontSize: 12, color: '#888', marginBottom: 32 }}>시행일: 2026년 4월 15일</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제1조 (목적)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          본 약관은 사주로또(이하 "서비스")가 제공하는 사주 기반 로또 번호 추천 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제2조 (서비스 제공)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          서비스는 사주 정보를 기반으로 로또 번호를 추천하는 기능을 제공합니다. 제공되는 번호는 참고용이며, 당첨을 보장하지 않습니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제3조 (회원가입 및 계정)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          이용자는 이메일 또는 카카오 계정을 통해 회원가입할 수 있으며, 하나의 계정만 이용 가능합니다. 타인의 정보를 도용하는 행위는 금지됩니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제4조 (개인정보 보호)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          서비스는 이용자의 개인정보를 <a href="/privacy" style={{ color: '#007bc3' }}>개인정보 처리방침</a>에 따라 보호합니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제5조 (이용 제한)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          다음 행위는 금지됩니다: 서비스를 상업적 목적으로 무단 이용하는 행위, 타인의 개인정보를 수집하는 행위, 서비스 운영을 방해하는 행위.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제6조 (면책 조항)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          서비스가 제공하는 로또 번호 추천은 사주 이론에 기반한 참고 정보이며, 실제 로또 당첨을 보장하지 않습니다. 이에 따른 손해에 대해 서비스는 책임지지 않습니다.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>제7조 (약관 변경)</h2>
        <p style={{ fontSize: 13, color: '#444' }}>
          약관이 변경될 경우 서비스 내 공지사항을 통해 사전 고지합니다.
        </p>
      </section>

      <p style={{ fontSize: 12, color: '#aaa', borderTop: '1px solid #f0f0f0', paddingTop: 16, marginTop: 16 }}>
        문의: 서비스 내 고객센터
      </p>
    </div>
  )
}
