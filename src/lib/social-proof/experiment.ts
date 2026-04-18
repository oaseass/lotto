export const SOCIAL_PROOF_SURFACES = ['HOME_CARD', 'REPORT_PAGE', 'SHARE_SHEET'] as const
export type SocialProofSurface = (typeof SOCIAL_PROOF_SURFACES)[number]

export const SOCIAL_PROOF_EVENT_NAMES = ['IMPRESSION', 'PRIMARY_CTA_CLICK', 'SECONDARY_CTA_CLICK', 'TEMPLATE_SELECT', 'SHARE_SUCCESS'] as const
export type SocialProofEventName = (typeof SOCIAL_PROOF_EVENT_NAMES)[number]

export function isSocialProofSurface(value: string): value is SocialProofSurface {
  return (SOCIAL_PROOF_SURFACES as readonly string[]).includes(value)
}

export function isSocialProofEventName(value: string): value is SocialProofEventName {
  return (SOCIAL_PROOF_EVENT_NAMES as readonly string[]).includes(value)
}