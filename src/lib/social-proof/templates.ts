export type SocialProofCopyVariant = 'A' | 'B'

export const SOCIAL_PROOF_TEMPLATE_REGISTRY = {
  FOLLOW_RECOMMENDATION: { variant: 'A', text: '추천 번호 그대로 샀는데 바로 적중했어요' },
  SMALL_BUT_HAPPY: { variant: 'A', text: '작아도 당첨은 당첨이라 기분이 꽤 좋네요' },
  NICE_START: { variant: 'A', text: '이번 회차는 시작이 좋네요. 다음 회차도 기대 중이에요' },
  KEEP_GOING: { variant: 'A', text: '이번 흐름 괜찮아서 다음 회차도 여기서 다시 뽑을 생각이에요' },
  B_DIRECT_HIT: { variant: 'B', text: '이 앱 번호로 바로 적중 잡았어요' },
  B_REAL_WIN: { variant: 'B', text: '말만이 아니라 실제 당첨이 나왔어요' },
  B_WEEKLY_HOOK: { variant: 'B', text: '이번 주엔 이 조합이 진짜 먹혔어요' },
  B_KEEP_USING: { variant: 'B', text: '다음 회차도 여기서 다시 번호 받을 생각입니다' },
} as const

export type SocialProofTemplateId = keyof typeof SOCIAL_PROOF_TEMPLATE_REGISTRY

export const SOCIAL_PROOF_UI_COPY = {
  A: {
    homeTitle: '지난 회차 실제 적중 현황',
    homeSubtitle: '제{round}회 기준 · 추천 {eligible}세트 중 실제 결과만 모았습니다',
    homeDisclaimer: '추천 적중과 QR 인증 당첨을 분리해서 보여드립니다. 공개 후기는 운영 검수 후 노출됩니다.',
    homeStoriesLabel: '검수 완료 후기 {count}건',
    homePrimaryCta: '이번 주 번호 받기',
    homeSecondaryCta: '회차별 리포트 보기',
    reportSubtitle: '추천 적중, QR 인증, 운영 검수 완료 후기를 한 번에 보여줍니다',
    reportSummaryLabel: '최신 요약',
    reportVerifiedLabel: 'QR 인증',
    reportStoriesHint: 'QR 인증 + 운영 검수 완료 후기만 표시',
    reviewBadge: '검수 완료',
    shareSheetTitle: '당첨 이력 공유',
    shareSheetSubtitle: '검수 완료 후 홈과 리포트에 노출됩니다',
    shareTemplateLabel: '후기 문구',
  },
  B: {
    homeTitle: '지난 회차 우리 앱 적중 장면',
    homeSubtitle: '제{round}회 기준 · 추천 {eligible}세트 중 실제 당첨 흐름만 추렸습니다',
    homeDisclaimer: '추천 적중과 실구매 QR 인증을 따로 보여드려 신뢰를 살렸습니다. 공개 후기는 검수 완료분만 노출됩니다.',
    homeStoriesLabel: '실제 공개 후기 {count}건',
    homePrimaryCta: '이번 주도 번호 받기',
    homeSecondaryCta: '당첨 리포트 확인',
    reportSubtitle: '우리 앱 추천 적중, 실구매 인증, 검수 완료 후기까지 한 번에 확인할 수 있습니다',
    reportSummaryLabel: '이번 회차 반응',
    reportVerifiedLabel: '실구매 인증',
    reportStoriesHint: '실제 QR 인증 + 검수 완료 후기만 공개합니다',
    reviewBadge: '실제 후기',
    shareSheetTitle: '당첨 장면 공개',
    shareSheetSubtitle: '검수 완료 후 홈과 리포트에서 실제 후기처럼 노출됩니다',
    shareTemplateLabel: '후기 문구 세트',
  },
} as const

export function resolveSocialProofCopyVariant(value?: string | null): SocialProofCopyVariant {
  return value === 'B' ? 'B' : 'A'
}

export function getSocialProofUiCopy(variant: SocialProofCopyVariant) {
  return SOCIAL_PROOF_UI_COPY[variant]
}

export function getShareTemplatesByVariant(variant: SocialProofCopyVariant): Array<[SocialProofTemplateId, string]> {
  return (Object.entries(SOCIAL_PROOF_TEMPLATE_REGISTRY) as Array<[SocialProofTemplateId, { variant: SocialProofCopyVariant; text: string }]>)
    .filter(([, entry]) => entry.variant === variant)
    .map(([key, entry]) => [key, entry.text])
}

export function getShareTemplateTextById(templateId: string | null | undefined): string | null {
  if (!templateId) return null
  return SOCIAL_PROOF_TEMPLATE_REGISTRY[templateId as SocialProofTemplateId]?.text ?? null
}

export function isKnownShareTemplateId(templateId: string | null | undefined): templateId is SocialProofTemplateId {
  if (!templateId) return false
  return templateId in SOCIAL_PROOF_TEMPLATE_REGISTRY
}

export function findTemplateIdsByQuery(query: string): SocialProofTemplateId[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return []

  return (Object.entries(SOCIAL_PROOF_TEMPLATE_REGISTRY) as Array<[SocialProofTemplateId, { text: string }]>)
    .filter(([, entry]) => entry.text.toLowerCase().includes(normalized))
    .map(([key]) => key)
}