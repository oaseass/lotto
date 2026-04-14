// TWA 도메인 인증용 assetlinks.json
// GET /.well-known/assetlinks.json
// 환경변수: ANDROID_PACKAGE_NAME, ANDROID_SHA256_FINGERPRINT

import { NextResponse } from 'next/server'

export async function GET() {
  const packageName = (process.env.ANDROID_PACKAGE_NAME ?? 'com.sajulotto1.app').trim()
  const fingerprint = (process.env.ANDROID_SHA256_FINGERPRINT ?? '').trim()

  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprint ? [fingerprint] : [],
      },
    },
  ]

  return NextResponse.json(assetLinks, {
    headers: { 'Content-Type': 'application/json' },
  })
}
