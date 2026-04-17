import 'next-auth'
import { JWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
      isAdFree: boolean
      isAdmin: boolean
      yongsin: string | null
      hasSajuProfile: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isAdFree?: boolean
    isAdmin?: boolean
    yongsin?: string | null
    hasSajuProfile?: boolean
  }
}
