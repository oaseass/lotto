// ================================
// NextAuth 설정
// ================================

import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import KakaoProvider from 'next-auth/providers/kakao'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  // PrismaAdapter는 OAuth 저장용이지만 JWT strategy와 충돌 가능
  // 유저 관리는 /api/auth/register에서 직접 처리
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
    // 카카오 소셜 로그인 (CLIENT_ID 설정 시 활성화)
    ...(process.env.KAKAO_CLIENT_ID ? [KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    })] : []),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    newUser: '/onboarding',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // 로그인 시 1회만 DB 조회 → JWT에 저장
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
      }
      // 결제 완료 또는 사주 프로필 저장 후 session.update() 호출 시 재조회
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
      }
      return token
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string
        session.user.isAdFree = (token.isAdFree as boolean) ?? false
        session.user.yongsin = (token.yongsin as string | null) ?? null
      }
      return session
    },
  },
})
