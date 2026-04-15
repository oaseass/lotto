// ================================
// NextAuth 설정
// ================================

import NextAuth from 'next-auth'
import type { OAuthConfig } from 'next-auth/providers'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// PKCE 없이 동작하는 커스텀 카카오 프로바이더
function KakaoCustomProvider(): OAuthConfig<any> {
  return {
    id: 'kakao',
    name: 'Kakao',
    type: 'oauth',
    authorization: {
      url: 'https://kauth.kakao.com/oauth/authorize',
      params: { scope: 'profile_nickname account_email', response_type: 'code' },
    },
    token: {
      url: 'https://kauth.kakao.com/oauth/token',
      async conform(response: Response): Promise<Response | undefined> {
        // Log actual Kakao token response for debugging
        const clone = response.clone()
        const text = await clone.text()
        console.log('[Kakao token conform] status:', response.status, 'body:', text.slice(0, 500))
        return undefined
      },
    },
    userinfo: { url: 'https://kapi.kakao.com/v2/user/me' },
    clientId: process.env.KAKAO_CLIENT_ID,
    clientSecret: process.env.KAKAO_CLIENT_SECRET,
    client: { token_endpoint_auth_method: 'client_secret_post' },
    checks: ['state'],
    profile(profile: any) {
      return {
        id: String(profile.id),
        name: profile.kakao_account?.profile?.nickname ?? '카카오유저',
        email: profile.kakao_account?.email ?? `kakao_${profile.id}@kakao.local`,
        image: profile.kakao_account?.profile?.profile_image_url ?? null,
      }
    },
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: [
    process.env.AUTH_SECRET!,
    'change-me-to-a-random-32-char-string',
  ],
  debug: true,
  providers: [
    // 이메일+비번 로그인
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.passwordHash) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.nickname,
        }
      },
    }),
    // 카카오 소셜 로그인
    ...(process.env.KAKAO_CLIENT_ID ? [KakaoCustomProvider()] : []),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  cookies: {
    state: {
      name: 'authjs.state',
      options: { httpOnly: true, sameSite: 'none', path: '/', secure: true },
    },
    sessionToken: {
      name: 'authjs.session-token',
      options: { httpOnly: true, sameSite: 'lax', path: '/', secure: true },
    },
  },
  callbacks: {
    // 카카오 로그인 시 DB에 유저 upsert
    async signIn({ user, account, profile }) {
      if (account?.provider === 'kakao') {
        try {
          const kakaoProfile = profile as any
          console.log('[Kakao signIn] profile keys:', Object.keys(kakaoProfile || {}))
          const email = kakaoProfile?.kakao_account?.email
            || kakaoProfile?.email
            || `kakao_${kakaoProfile?.id}@kakao.local`
          const nickname = kakaoProfile?.kakao_account?.profile?.nickname
            || kakaoProfile?.name
            || '카카오유저'

          console.log('[Kakao signIn] email:', email, 'nickname:', nickname)

          let dbUser = await prisma.user.findUnique({ where: { email } })
          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: { email, nickname, passwordHash: null },
            })
          }
          user.id = dbUser.id
          user.email = dbUser.email
          user.name = dbUser.nickname
          console.log('[Kakao signIn] success, userId:', dbUser.id)
        } catch (err) {
          console.error('[Kakao signIn] 실패:', err)
          return false
        }
      }
      return true
    },

    async jwt({ token, user, trigger }) {
      try {
        if (user) {
          token.id = user.id
          const [dbUser, sajuProfile] = await Promise.all([
            prisma.user.findUnique({
              where: { id: user.id as string },
              select: { isAdFree: true },
            }),
            prisma.sajuProfile.findUnique({
              where: { userId: user.id as string },
              select: { yongsin: true },
            }),
          ])
          token.isAdFree = dbUser?.isAdFree ?? false
          token.yongsin = sajuProfile?.yongsin ?? null
          token.hasSajuProfile = !!sajuProfile
        }
        if (trigger === 'update' && token.id) {
          const [dbUser, sajuProfile] = await Promise.all([
            prisma.user.findUnique({
              where: { id: token.id as string },
              select: { isAdFree: true },
            }),
            prisma.sajuProfile.findUnique({
              where: { userId: token.id as string },
              select: { yongsin: true },
            }),
          ])
          token.isAdFree = dbUser?.isAdFree ?? false
          token.yongsin = sajuProfile?.yongsin ?? null
          token.hasSajuProfile = !!sajuProfile
        }
      } catch (err) {
        console.error('[jwt callback] 실패:', err)
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
        session.user.isAdFree = (token.isAdFree as boolean) ?? false
        session.user.yongsin = (token.yongsin as string | null) ?? null
        session.user.hasSajuProfile = (token.hasSajuProfile as boolean) ?? false
      }
      return session
    },
  },
})
