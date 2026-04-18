import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  isSocialProofEventName,
  isSocialProofSurface,
} from '@/lib/social-proof/experiment'
import {
  isKnownShareTemplateId,
  resolveSocialProofCopyVariant,
} from '@/lib/social-proof/templates'

export async function POST(req: NextRequest) {
  const session = await auth()
  const body = await req.json().catch(() => null)

  const variant = resolveSocialProofCopyVariant(body?.variant)
  const surface = typeof body?.surface === 'string' && isSocialProofSurface(body.surface)
    ? body.surface
    : null
  const eventName = typeof body?.eventName === 'string' && isSocialProofEventName(body.eventName)
    ? body.eventName
    : null
  const round = typeof body?.round === 'number' && Number.isFinite(body.round) ? body.round : null
  const path = typeof body?.path === 'string' ? body.path.slice(0, 120) : null
  const templateId = typeof body?.templateId === 'string' && isKnownShareTemplateId(body.templateId)
    ? body.templateId
    : null
  const sessionKey = typeof body?.sessionKey === 'string' ? body.sessionKey.slice(0, 80) : null

  if (!surface || !eventName) {
    return NextResponse.json({ error: '잘못된 이벤트입니다' }, { status: 400 })
  }

  await prisma.socialProofExperimentEvent.create({
    data: {
      userId: session?.user?.id ?? null,
      variant,
      surface,
      eventName,
      round,
      path,
      templateId,
      sessionKey,
    },
  })

  return NextResponse.json({ ok: true })
}