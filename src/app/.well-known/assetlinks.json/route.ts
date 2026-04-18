// TWA 도메인 인증용 assetlinks.json
// GET /.well-known/assetlinks.json
// 환경변수: ANDROID_PACKAGE_NAME, ANDROID_SHA256_FINGERPRINT

import { NextResponse } from 'next/server'

export async function GET() {
  const packageName = 'com.sajulotto1.app'
  const fingerprint = 'A7:1F:1F:15:07:FA:B4:98:31:13:4A:34:16:12:BE:D8:2B:13:60:21:C6:89:5A:1B:14:C2:F6:72:13:3E:2C:65'

  const assetLinks = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]

  return NextResponse.json(assetLinks, {
    headers: { 'Content-Type': 'application/json' },
  })
}
