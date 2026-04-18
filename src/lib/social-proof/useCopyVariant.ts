'use client'

import { useEffect, useState } from 'react'

import {
  resolveSocialProofCopyVariant,
  type SocialProofCopyVariant,
} from '@/lib/social-proof/templates'

const STORAGE_KEY = 'social-proof-copy-variant'

export function useSocialProofCopyVariant(): SocialProofCopyVariant {
  const [variant, setVariant] = useState<SocialProofCopyVariant>('A')

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (stored === 'A' || stored === 'B') {
      setVariant(stored)
      return
    }

    const nextVariant = Math.random() >= 0.5 ? 'B' : 'A'
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, nextVariant)
    }
    setVariant(resolveSocialProofCopyVariant(nextVariant))
  }, [])

  return variant
}