import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./server/db"
import { users } from "./server/db/schema"
import { eq } from "drizzle-orm"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
          with: { sekolah: true },
        })

        if (!user || !user.active) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          role: user.role,
          sekolahId: user.sekolahId,
          photo: user.photo,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.sekolahId = (user as { sekolahId: string | null }).sekolahId
        token.photo = (user as { photo?: string | null }).photo
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          sekolahId: token.sekolahId as string | null,
          photo: token.photo as string | undefined,
        },
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 jam
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 jam
  },
})
