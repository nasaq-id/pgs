import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, desc, sql, and, getTableColumns, getTableName, is } from "drizzle-orm"
import { PgTable } from "drizzle-orm/pg-core"
import * as fs from "fs"
import * as path from "path"
import * as dbSchema from "@/server/db/schema"
import bcrypt from "bcryptjs"
import { db } from "@/server/db"
import {
  sekolah, users, pengaturanAbsensi, pengaturanJadwal, auditLogs, siswa, guru, kelas,
  mataPelajaran, absensiSiswa, invoice, jurnalMengajar, poinSikap
} from "@/server/db/schema"
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

      const mapelCounts = await db
        .select({ sekolahId: mataPelajaran.sekolahId, count: sql<number>`count(*)` })
        .from(mataPelajaran)
        .groupBy(mataPelajaran.sekolahId)

      const absensiCounts = await db
        .select({ sekolahId: absensiSiswa.sekolahId, count: sql<number>`count(*)` })
        .from(absensiSiswa)
        .groupBy(absensiSiswa.sekolahId)

      const invoiceCounts = await db
        .select({ sekolahId: invoice.sekolahId, count: sql<number>`count(*)` })
        .from(invoice)
        .groupBy(invoice.sekolahId)

      const jurnalCounts = await db
        .select({ sekolahId: jurnalMengajar.sekolahId, count: sql<number>`count(*)` })
        .from(jurnalMengajar)
        .groupBy(jurnalMengajar.sekolahId)

      const poinCounts = await db
        .select({ sekolahId: poinSikap.sekolahId, count: sql<number>`count(*)` })
        .from(poinSikap)
        .groupBy(poinSikap.sekolahId)

      // Map counts by school ID for O(1) lookups
      const siswaMap = new Map(siswaCounts.map(c => [c.sekolahId, Number(c.count)]))
      const guruMap = new Map(guruCounts.map(c => [c.sekolahId, Number(c.count)]))
      const kelasMap = new Map(kelasCounts.map(c => [c.sekolahId, Number(c.count)]))
      const mapelMap = new Map(mapelCounts.map(c => [c.sekolahId, Number(c.count)]))
      const absensiMap = new Map(absensiCounts.map(c => [c.sekolahId, Number(c.count)]))
      const invoiceMap = new Map(invoiceCounts.map(c => [c.sekolahId, Number(c.count)]))
      const jurnalMap = new Map(jurnalCounts.map(c => [c.sekolahId, Number(c.count)]))
      const poinMap = new Map(poinCounts.map(c => [c.sekolahId, Number(c.count)]))

      // Compute stats for each school
      return schools.map(s => {
        const totalSiswa = siswaMap.get(s.id) ?? 0
        const totalGuru = guruMap.get(s.id) ?? 0
        const totalKelas = kelasMap.get(s.id) ?? 0
        const totalMapel = mapelMap.get(s.id) ?? 0
        const totalAbsensi = absensiMap.get(s.id) ?? 0
        const totalInvoice = invoiceMap.get(s.id) ?? 0
        const totalJurnal = jurnalMap.get(s.id) ?? 0
        const totalPoin = poinMap.get(s.id) ?? 0

        const totalDbRows = totalSiswa + totalGuru + totalKelas + totalMapel + totalAbsensi + totalInvoice + totalJurnal + totalPoin

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
            mapel: totalMapel,
            absensi: totalAbsensi,
            invoice: totalInvoice,
            jurnal: totalJurnal,
            poin: totalPoin,
            dbRows: totalDbRows,
            health,
          }
        }
      })
    }),

  registerSekolah: roleProtectedProcedure(["super_admin"])
    .input(sanitized(registerSekolahSchema))
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
    .input(sanitized(z.object({
      id: z.string(),
      namaSekolah: z.string().min(1, "Nama sekolah wajib diisi"),
      namaSingkat: z.string().nullable().optional(),
      npsn: z.string().nullable().optional(),
      jenjang: z.enum(["sd", "smp", "sma", "smk", "mi", "mts", "ma", "tk"]),
    })))
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
    .input(sanitized(z.object({
      userId: z.string(),
      newPassword: z.string().min(6, "Password minimal 6 karakter"),
    })))
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

  deleteSekolah: roleProtectedProcedure(["super_admin"])
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

      const [deleted] = await db
        .delete(sekolah)
        .where(eq(sekolah.id, input.id))
        .returning()

      await logAudit(ctx, {
        action: "delete",
        entity: "sekolah",
        entityId: input.id,
        metadata: { namaSekolah: existing.namaSekolah, npsn: existing.npsn },
      })

      return deleted
    }),

  getDatabaseSchema: roleProtectedProcedure(["super_admin"])
    .query(async () => {
      const tables = Object.entries(dbSchema).filter(([_, val]) => is(val, PgTable))
      const result = tables.map(([key, value]) => {
        const tableName = getTableName(value as any)
        const columnsObj = getTableColumns(value as any)
        const columns = Object.entries(columnsObj).map(([colKey, colVal]: [string, any]) => ({
          name: colVal.name,
          keyName: colKey,
          dataType: colVal.dataType,
          columnType: colVal.columnType,
          notNull: colVal.notNull,
          primaryKey: colVal.primary,
          hasDefault: colVal.hasDefault,
          enumValues: colVal.enumValues || null,
        }))

        // Inline Foreign Keys
        const pgTableVal = value as any
        const symbols = Object.getOwnPropertySymbols(pgTableVal)
        const inlineFkSymbol = symbols.find(s => s.toString() === "Symbol(drizzle:PgInlineForeignKeys)")
        const foreignKeys: any[] = []
        if (inlineFkSymbol) {
          const fks = pgTableVal[inlineFkSymbol] || []
          for (const fk of fks) {
            const ref = fk.reference()
            foreignKeys.push({
              name: fk.name || null,
              onDelete: fk.onDelete || null,
              onUpdate: fk.onUpdate || null,
              columns: ref.columns.map((c: any) => c.name),
              foreignTable: getTableName(ref.foreignTable),
              foreignColumns: ref.foreignColumns.map((c: any) => c.name),
            })
          }
        }

        return {
          keyName: key,
          tableName,
          columns,
          foreignKeys,
        }
      })

      return result
    }),

  getCodebaseHealth: roleProtectedProcedure(["super_admin"])
    .query(async () => {
      const rootPath = path.join(process.cwd(), "src")
      
      const scanDir = (dirPath: string, rootDir: string): { files: any[], tree: any } => {
        const name = path.basename(dirPath)
        const relPath = path.relative(rootDir, dirPath)
        
        let stats
        try {
          stats = fs.statSync(dirPath)
        } catch (e) {
          return { files: [], tree: null }
        }

        if (stats.isFile()) {
          let lineCount = 0
          try {
            const content = fs.readFileSync(dirPath, "utf-8")
            lineCount = content.split("\n").length
          } catch (e) {}

          let health: "critical" | "warning" | "healthy" = "healthy"
          let suggestion = "Struktur file sudah optimal. Pertahankan modularitas."
          const sizeKb = stats.size / 1024

          if (lineCount > 600 || sizeKb > 30) {
            health = "critical"
            if (dirPath.includes("components") || dirPath.includes("app")) {
              suggestion = "Pecah file UI utama menjadi sub-komponen modular di folder '_components/' untuk meningkatkan keterbacaan."
            } else if (dirPath.includes("routers") || dirPath.includes("server")) {
              suggestion = "Refaktorkan fungsi-fungsi router yang terlalu besar ke dalam sub-router terpisah atau business logic helpers."
            } else {
              suggestion = "Pecah fungsionalitas file ini menjadi modul-modul helper yang lebih kecil."
            }
          } else if (lineCount > 300) {
            health = "warning"
            if (dirPath.endsWith(".tsx")) {
              suggestion = "Pertimbangkan untuk memindahkan inline dialog, dialog modal, atau forms ke file terpisah."
            } else {
              suggestion = "Pertimbangkan refaktorisasi beberapa fungsi internal ke berkas utilitas terpisah."
            }
          }

          const fileObj = {
            path: relPath,
            name,
            lines: lineCount,
            size: stats.size,
            health,
            suggestion
          }

          return {
            files: [fileObj],
            tree: {
              name,
              path: relPath,
              type: "file",
              lines: lineCount,
              health
            }
          }
        }

        if (stats.isDirectory()) {
          let children: any[] = []
          let filesAcc: any[] = []
          
          let entries: string[] = []
          try {
            entries = fs.readdirSync(dirPath)
          } catch (e) {}

          for (const entry of entries) {
            if (entry.startsWith(".")) continue
            
            const childPath = path.join(dirPath, entry)
            const res = scanDir(childPath, rootDir)
            if (res.tree) {
              children.push(res.tree)
            }
            filesAcc = filesAcc.concat(res.files)
          }

          children.sort((a, b) => {
            if (a.type === b.type) return a.name.localeCompare(b.name)
            return a.type === "dir" ? -1 : 1
          })

          return {
            files: filesAcc,
            tree: {
              name,
              path: relPath,
              type: "dir",
              children
            }
          }
        }

        return { files: [], tree: null }
      }

      const { files, tree } = scanDir(rootPath, rootPath)
      const sortedFiles = [...files].sort((a, b) => b.lines - a.lines)

      return {
        files: sortedFiles,
        tree
      }
    }),

  getFileContent: roleProtectedProcedure(["super_admin"])
    .input(z.object({
      path: z.string()
    }))
    .query(async ({ input }) => {
      const rootPath = path.join(process.cwd(), "src")
      const resolvedPath = path.resolve(rootPath, input.path)
      
      if (!resolvedPath.startsWith(rootPath)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Akses di luar direktori src/ dilarang."
        })
      }

      try {
        if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Berkas tidak ditemukan."
          })
        }

        const content = fs.readFileSync(resolvedPath, "utf-8")
        return {
          content
        }
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Gagal membaca isi berkas."
        })
      }
    }),
})
