import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      sekolahId: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    sekolahId: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    sekolahId: string | null
  }
}
