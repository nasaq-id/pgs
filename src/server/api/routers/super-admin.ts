import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/server/db"
import { sekolah, users, pengaturanAbsensi, pengaturanJadwal } from "@/server/db/schema"
import { router, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const registerSekolahSchema = z.object({
  namaSekolah: z.string().min(1, "Nama sekolah wajib diisi"),
  namaSingkat: z.string().optional(),
  npsn: z.string().optional(),
  jenjang: z.enum(["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]),
  adminEmail: z.string().min(3, "Username/Email admin minimal 3 karakter"),
  adminName: z.string().min(1, "Nama admin wajib diisi"),
  adminPassword: z.string().min(6, "Password minimal 6 karakter"),
})

export const superAdminRouter = router({
  listSekolah: roleProtectedProcedure(["super_admin"])
    .query(async () => {
      return db
        .select()
        .from(sekolah)
        .orderBy(desc(sekolah.createdAt))
    }),

  registerSekolah: roleProtectedProcedure(["super_admin"])
    .input(registerSekolahSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Check if email/username already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.adminEmail),
      })
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username/Email admin sudah terdaftar di sistem",
        })
      }

      // 2. Check NPSN if provided
      if (input.npsn) {
        const existingSekolah = await db.query.sekolah.findFirst({
          where: eq(sekolah.npsn, input.npsn),
        })
        if (existingSekolah) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Sekolah dengan NPSN ${input.npsn} sudah terdaftar`,
          })
        }
      }

      const newSekolahId = crypto.randomUUID()
      const newAdminId = crypto.randomUUID()
      const hashedPassword = await bcrypt.hash(input.adminPassword, 10)

      // 3. Database transaction
      const result = await db.transaction(async (tx) => {
        // Insert sekolah
        const [insertedSekolah] = await tx
          .insert(sekolah)
          .values({
            id: newSekolahId,
            namaSekolah: input.namaSekolah,
            namaSingkat: input.namaSingkat || null,
            npsn: input.npsn || null,
            jenjang: input.jenjang,
            active: true,
          })
          .returning()

        // Insert first admin user
        await tx.insert(users).values({
          id: newAdminId,
          email: input.adminEmail,
          password: hashedPassword,
          firstName: input.adminName,
          role: "admin_sekolah",
          sekolahId: newSekolahId,
          active: true,
        })

        // Insert default pengaturan absensi
        await tx.insert(pengaturanAbsensi).values({
          id: crypto.randomUUID(),
          sekolahId: newSekolahId,
          jamMasuk: "07:00",
          jamPulang: "14:00",
          toleransi: 15,
        })

        // Insert default pengaturan jadwal
        await tx.insert(pengaturanJadwal).values({
          id: crypto.randomUUID(),
          sekolahId: newSekolahId,
          durasiJP: 40,
          jamMulai: "07:00",
        })

        return insertedSekolah
      })

      await logAudit(ctx, {
        action: "create",
        entity: "sekolah",
        entityId: newSekolahId,
        metadata: { namaSekolah: input.namaSekolah, adminEmail: input.adminEmail },
      })

      return result
    }),

  toggleSekolahActive: roleProtectedProcedure(["super_admin"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.sekolah.findFirst({
        where: eq(sekolah.id, input.id),
      })
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sekolah tidak ditemukan",
        })
      }

      const newStatus = !existing.active
      const [updated] = await db
        .update(sekolah)
        .set({ active: newStatus })
        .where(eq(sekolah.id, input.id))
        .returning()

      await logAudit(ctx, {
        action: "update",
        entity: "sekolah",
        entityId: input.id,
        metadata: { active: newStatus },
      })

      return updated
    }),
})
