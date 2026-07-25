import { z } from "zod"
import { eq, or } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { db } from "@/server/db"
import { users, siswa, guru, kelas, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, sanitized } from "@/server/api/trpc"

export const profilRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user
    const userEmail = user.email
    if (!userEmail) return null

    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    })
    if (!userData) return null

    let sekolahData = null
    if (userData.sekolahId) {
      sekolahData = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, userData.sekolahId),
      })
    }

    let profileData: Record<string, unknown> = {
      ...userData,
      sekolah: sekolahData ? { nama: sekolahData.namaSekolah } : null,
    }

    if (user.role === "siswa") {
      const siswaData = await db.query.siswa.findFirst({
        where: or(
          eq(siswa.usernameSiswa, userEmail),
          eq(siswa.emailSiswa, userEmail),
          eq(siswa.nisn, userEmail)
        ),
        with: {
          kelas: true,
        },
      })
      if (siswaData) {
        profileData = { ...profileData, ...siswaData, roleData: siswaData }
      }
    } else if (user.role === "guru") {
      const guruData = await db.query.guru.findFirst({
        where: or(
          eq(guru.email, userEmail),
          eq(guru.usernameGuru, userEmail)
        ),
      })
      if (guruData) {
        profileData = { ...profileData, ...guruData, roleData: guruData }
      }
    }

    return profileData
  }),

  updateProfilePhoto: protectedProcedure
    .input(sanitized(z.object({ photo: z.string() })))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      await db
        .update(users)
        .set({ photo: input.photo, updatedAt: new Date() })
        .where(eq(users.id, user.id))
      return { success: true, photo: input.photo }
    }),

  updateProfile: protectedProcedure
    .input(
      sanitized(z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        alamat: z.string().optional(),
        noHpOrtu: z.string().optional(),
        pendidikanTerakhir: z.string().optional(),
      }))
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user
      
      // Update general user table
      await db
        .update(users)
        .set({
          email: input.email || undefined,
          phone: input.phone || undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))

      const userEmail = user.email
      if (!userEmail) throw new TRPCError({ code: "BAD_REQUEST", message: "Email user tidak ditemukan" })

      if (user.role === "siswa") {
        const sData = await db.query.siswa.findFirst({
          where: or(
            eq(siswa.usernameSiswa, userEmail),
            eq(siswa.emailSiswa, userEmail),
            eq(siswa.nisn, userEmail)
          ),
        })
        if (sData) {
          await db
            .update(siswa)
            .set({
              emailSiswa: input.email || undefined,
              noHpWhatsapp: input.phone || undefined,
              alamat: input.alamat || undefined,
              noHpOrtu: input.noHpOrtu || undefined,
              updatedAt: new Date(),
            })
            .where(eq(siswa.id, sData.id))
        }
      } else if (user.role === "guru") {
        const gData = await db.query.guru.findFirst({
          where: or(
            eq(guru.email, userEmail),
            eq(guru.usernameGuru, userEmail)
          ),
        })
        if (gData) {
          await db
            .update(guru)
            .set({
              email: input.email || undefined,
              noHp: input.phone || undefined,
              alamat: input.alamat || undefined,
              pendidikanTerakhir: input.pendidikanTerakhir || undefined,
              updatedAt: new Date(),
            })
            .where(eq(guru.id, gData.id))
        }
      }

      return { success: true }
    }),
})
