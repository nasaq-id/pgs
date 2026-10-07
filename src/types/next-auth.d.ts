import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      sekolahId: string | null
      photo?: string | null
      isImpersonating?: boolean
      originalRole?: string
      impersonatedTargetName?: string
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    sekolahId: string | null
    photo?: string | null
    isImpersonating?: boolean
    originalRole?: string
    impersonatedTargetName?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    sekolahId: string | null
    photo?: string | null
    isImpersonating?: boolean
    originalRole?: string
    impersonatedTargetName?: string
  }
}

