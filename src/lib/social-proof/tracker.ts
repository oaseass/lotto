'use client'

import {
  isKnownShareTemplateId,
  resolveSocialProofCopyVariant,
  type SocialProofCopyVariant,
} from '@/lib/social-proof/templates'

import {
  isSocialProofEventName,
  isSocialProofSurface,
  type SocialProofEventName,
  type SocialProofSurface,
} from '@/lib/social-proof/experiment'

type TrackSocialProofEventInput = {
  variant: SocialProofCopyVariant
  surface: SocialProofSurface
  eventName: SocialProofEventName
  round?: number
  path?: string
  templateId?: string | null
  sessionKey?: string | null
}

export function trackSocialProofEvent(input: TrackSocialProofEventInput) {
  if (typeof window === 'undefined') return

  const variant = resolveSocialProofCopyVariant(input.variant)
  if (!isSocialProofSurface(input.surface) || !isSocialProofEventName(input.eventName)) {
    return
  }

  const body = JSON.stringify({
    variant,
    surface: input.surface,
    eventName: input.eventName,
    round: typeof input.round === 'number' ? input.round : null,
    path: input.path ?? window.location.pathname,
    templateId: isKnownShareTemplateId(input.templateId) ? input.templateId : null,
    sessionKey: typeof input.sessionKey === 'string' ? input.sessionKey : null,
  })

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon('/api/social-proof/track', blob)
    return
  }

  void fetch('/api/social-proof/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}