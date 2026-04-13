'use client'

import { useSession } from 'next-auth/react'
import { AdBanner, AdRemovePrompt } from './AdBanner'

interface AdSlotProps {
  slot?: string
  format?: 'banner' | 'rectangle'
}

export function AdSlot({ slot, format }: AdSlotProps) {
  const { data: session } = useSession()
  const isAdFree = session?.user?.isAdFree ?? false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <AdBanner slot={slot} format={format} isAdFree={isAdFree} />
      <AdRemovePrompt isAdFree={isAdFree} />
    </div>
  )
}
