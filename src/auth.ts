import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "./server/db"
import { users } from "./server/db/schema"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
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
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.sekolahId = (user as { sekolahId: string | null }).sekolahId
        const userPhoto = (user as { photo?: string | null }).photo
        token.photo = userPhoto && !userPhoto.startsWith("data:") ? userPhoto : null
      }
      if (trigger === "update") {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, token.id as string),
        })
        if (dbUser) {
          const dbPhoto = dbUser.photo
          token.photo = dbPhoto && !dbPhoto.startsWith("data:") ? dbPhoto : null
          token.name = `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim()
        }
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
    async redirect({ url, baseUrl }) {
      let host = null
      let proto = "http"
      try {
        const headersList = await headers()
        host = headersList.get("host") || headersList.get("x-forwarded-host")
        proto = headersList.get("x-forwarded-proto") || "http"
      } catch (e) {
        // Headers are not available in this context
      }
      const dynamicBaseUrl = host ? `${proto}://${host}` : baseUrl
      
      if (url.startsWith("/")) return `${dynamicBaseUrl}${url}`
      try {
        const parsedUrl = new URL(url)
        const parsedBase = new URL(baseUrl)
        const parsedDynamic = new URL(dynamicBaseUrl)
        
        if (parsedUrl.origin === parsedBase.origin) {
          return `${parsedDynamic.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`
        }
        if (parsedUrl.origin === parsedDynamic.origin) {
          return url
        }
      } catch (e) {
        // ignore
      }
      return dynamicBaseUrl
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
