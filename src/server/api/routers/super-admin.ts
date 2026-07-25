import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc, sql, and } from "drizzle-orm"
import bcrypt from "bcryptjs"
import { db } from "@/server/db"
import { sekolah, users, pengaturanAbsensi, pengaturanJadwal, auditLogs, siswa, guru, kelas } from "@/server/db/schema"
import { router, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
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
      // 1. Get raw schools
      const schools = await db
        .select()
        .from(sekolah)
        .orderBy(desc(sekolah.createdAt))

      // 2. Fetch aggregates grouped by sekolahId
      const siswaCounts = await db
        .select({ sekolahId: siswa.sekolahId, count: sql<number>`count(*)` })
        .from(siswa)
        .groupBy(siswa.sekolahId)

      const guruCounts = await db
        .select({ sekolahId: guru.sekolahId, count: sql<number>`count(*)` })
        .from(guru)
        .groupBy(guru.sekolahId)

      const kelasCounts = await db
        .select({ sekolahId: kelas.sekolahId, count: sql<number>`count(*)` })
        .from(kelas)
        .groupBy(kelas.sekolahId)

      // Map counts by school ID for O(1) lookups
      const siswaMap = new Map(siswaCounts.map(c => [c.sekolahId, Number(c.count)]))
      const guruMap = new Map(guruCounts.map(c => [c.sekolahId, Number(c.count)]))
      const kelasMap = new Map(kelasCounts.map(c => [c.sekolahId, Number(c.count)]))

      // Compute stats for each school
      return schools.map(s => {
        const totalSiswa = siswaMap.get(s.id) ?? 0
        const totalGuru = guruMap.get(s.id) ?? 0
        const totalKelas = kelasMap.get(s.id) ?? 0

        // Calculate health state:
        // - "abu" : suspended/inactive
        // - "merah" : active but has 0 students
        // - "kuning" : active but has 0 teachers
        // - "hijau" : active and has both students & teachers
        let health: "hijau" | "kuning" | "merah" | "abu" = "hijau"
        if (!s.active) {
          health = "abu"
        } else if (totalSiswa === 0) {
          health = "merah"
        } else if (totalGuru === 0) {
          health = "kuning"
        }

        return {
          ...s,
          stats: {
            siswa: totalSiswa,
            guru: totalGuru,
            kelas: totalKelas,
            health,
          }
        }
      })
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

  updateSekolah: roleProtectedProcedure(["super_admin"])
    .input(z.object({
      id: z.string(),
      namaSekolah: z.string().min(1, "Nama sekolah wajib diisi"),
      namaSingkat: z.string().nullable().optional(),
      npsn: z.string().nullable().optional(),
      jenjang: z.enum(["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]),
    }))
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

      const [updated] = await db
        .update(sekolah)
        .set({
          namaSekolah: input.namaSekolah,
          namaSingkat: input.namaSingkat || null,
          npsn: input.npsn || null,
          jenjang: input.jenjang,
        })
        .where(eq(sekolah.id, input.id))
        .returning()

      await logAudit(ctx, {
        action: "update",
        entity: "sekolah",
        entityId: input.id,
        metadata: { namaSekolah: input.namaSekolah, npsn: input.npsn },
      })

      return updated
    }),

  getPlatformMetrics: roleProtectedProcedure(["super_admin"])
    .query(async () => {
      const [sekolahCount] = await db.select({ count: sql<number>`count(*)` }).from(sekolah)
      const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users)
      const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
      
      const activeSekolah = await db.select({ count: sql<number>`count(*)` }).from(sekolah).where(eq(sekolah.active, true))
      const suspendedSekolah = await db.select({ count: sql<number>`count(*)` }).from(sekolah).where(eq(sekolah.active, false))

      return {
        totalSchools: sekolahCount?.count ?? 0,
        activeSchools: activeSekolah[0]?.count ?? 0,
        suspendedSchools: suspendedSekolah[0]?.count ?? 0,
        totalUsers: usersCount?.count ?? 0,
        totalAuditLogs: auditCount?.count ?? 0,
      }
    }),

  listGlobalAuditLogs: roleProtectedProcedure(["super_admin"])
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const logs = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          entity: auditLogs.entity,
          entityId: auditLogs.entityId,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
          userEmail: users.email,
          userFirstName: users.firstName,
          sekolahNama: sekolah.namaSekolah,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .leftJoin(sekolah, eq(auditLogs.sekolahId, sekolah.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      return logs
    }),

  listSekolahAdmins: roleProtectedProcedure(["super_admin"])
    .input(z.object({ sekolahId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          active: users.active,
        })
        .from(users)
        .where(and(
          eq(users.sekolahId, input.sekolahId),
          eq(users.role, "admin_sekolah")
        ))
        .orderBy(users.email)
    }),

  resetAdminPassword: roleProtectedProcedure(["super_admin"])
    .input(z.object({
      userId: z.string(),
      newPassword: z.string().min(6, "Password minimal 6 karakter"),
    }))
    .mutation(async ({ ctx, input }) => {
      const userToReset = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      })
      if (!userToReset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User tidak ditemukan",
        })
      }

      if (userToReset.role !== "admin_sekolah") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Hanya akun admin sekolah yang dapat direset melalui menu ini",
        })
      }

      const hashedPassword = await bcrypt.hash(input.newPassword, 10)
      const [updated] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, input.userId))
        .returning()

      await logAudit(ctx, {
        action: "update",
        entity: "users",
        entityId: input.userId,
        metadata: { reset_admin_password: true, email: userToReset.email },
      })

      return { success: true, email: updated.email }
    }),
})
