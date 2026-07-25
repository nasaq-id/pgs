import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, between, desc, asc, gte, lte, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jurnalMengajar, kelas, jadwalPelajaran, guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

const jurnalCreateSchema = z.object({
  id: z.string().optional(),
  guruId: z.string(),
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  jadwalPelajaranId: z.string().nullable().optional(),
  tanggal: z.coerce.date(),
  judulJurnal: z.string().nullable().optional(),
  tujuanPembelajaran: z.string().nullable().optional(),
  materiKonten: z.string().nullable().optional(),
  kegiatanPembelajaran: z.string().nullable().optional(),
  catatan: z.string().nullable().optional(),
  statusKehadiran: z.string().nullable().optional(),
  detailKehadiran: z.string().nullable().optional(),
  status: z.enum(["draft", "selesai"]).optional(),
  jamMulai: z.coerce.date().nullable().optional(),
  jamSelesai: z.coerce.date().nullable().optional(),
})

const jurnalUpdateSchema = jurnalCreateSchema.partial()


async function getKelasIdsForSekolah(sekolahId: string | null): Promise<string[]> {
  if (!sekolahId) return []
  const rows = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.sekolahId, sekolahId))
  return rows.map((r) => r.id)
}

export const lmsRouter = router({
  getCurrentGuru: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.session.user.role !== "guru") return null
      const userEmail = ctx.session.user.email
      if (!userEmail) return null
      const sekolahId = ctx.session.user.sekolahId
      const record = await db.query.guru.findFirst({
        where: and(
          or(
            eq(guru.email, userEmail),
            eq(guru.usernameGuru, userEmail),
            eq(guru.nipnuptk, userEmail)
          ),
          sekolahId ? eq(guru.sekolahId, sekolahId) : undefined,
        )
      })
      return record ?? null
    }),

  getJurnal: protectedProcedure
    .input(
      z.object({
        guruId: z.string().optional(),
        kelasId: z.string().optional(),
        tanggal: z.coerce.date().optional(),
        tanggalMulai: z.coerce.date().optional(),
        tanggalSelesai: z.coerce.date().optional(),
        sortBy: z.enum(["tanggal", "createdAt"]).optional().default("tanggal"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = []
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      if (sekolahIdFilter) {
        conditions.push(eq(kelas.sekolahId, sekolahIdFilter))
      }

      if (ctx.session.user.role === "guru") {
        const userEmail = ctx.session.user.email
        if (userEmail) {
          const guruRecord = await db.query.guru.findFirst({
            where: or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          })
          if (guruRecord) {
            conditions.push(eq(jurnalMengajar.guruId, guruRecord.id))
          } else {
            conditions.push(eq(jurnalMengajar.guruId, "impossible-nonexistent-guru-id"))
          }
        } else {
          conditions.push(eq(jurnalMengajar.guruId, "impossible-nonexistent-guru-id"))
        }
      } else if (input.guruId) {
        conditions.push(eq(jurnalMengajar.guruId, input.guruId))
      }

      if (input.kelasId) conditions.push(eq(jurnalMengajar.kelasId, input.kelasId))
      if (input.tanggal) {
        const start = new Date(input.tanggal)
        start.setHours(0, 0, 0, 0)
        const end = new Date(input.tanggal)
        end.setHours(23, 59, 59, 999)
        conditions.push(between(jurnalMengajar.tanggal, start, end))
      }
      if (input.tanggalMulai && input.tanggalSelesai) {
        conditions.push(between(jurnalMengajar.tanggal, input.tanggalMulai, input.tanggalSelesai))
      } else if (input.tanggalMulai) {
        conditions.push(gte(jurnalMengajar.tanggal, input.tanggalMulai))
      } else if (input.tanggalSelesai) {
        conditions.push(lte(jurnalMengajar.tanggal, input.tanggalSelesai))
      }
      const orderBy = input.sortOrder === "asc" ? asc(jurnalMengajar[input.sortBy]) : desc(jurnalMengajar[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select({
          id: jurnalMengajar.id,
          guruId: jurnalMengajar.guruId,
          kelasId: jurnalMengajar.kelasId,
          mataPelajaranId: jurnalMengajar.mataPelajaranId,
          jadwalPelajaranId: jurnalMengajar.jadwalPelajaranId,
          tanggal: jurnalMengajar.tanggal,
          judulJurnal: jurnalMengajar.judulJurnal,
          tujuanPembelajaran: jurnalMengajar.tujuanPembelajaran,
          materiKonten: jurnalMengajar.materiKonten,
          kegiatanPembelajaran: jurnalMengajar.kegiatanPembelajaran,
          catatan: jurnalMengajar.catatan,
          statusKehadiran: jurnalMengajar.statusKehadiran,
          detailKehadiran: jurnalMengajar.detailKehadiran,
          status: jurnalMengajar.status,
          jamMulai: jurnalMengajar.jamMulai,
          jamSelesai: jurnalMengajar.jamSelesai,
          createdAt: jurnalMengajar.createdAt,
          updatedAt: jurnalMengajar.updatedAt,
        })
        .from(jurnalMengajar)
        .innerJoin(kelas, eq(jurnalMengajar.kelasId, kelas.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  createJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(sanitized(jurnalCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }

      if (ctx.session.user.role === "guru") {
        const userEmail = ctx.session.user.email
        if (userEmail) {
          const guruRecord = await db.query.guru.findFirst({
            where: or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          })
          if (!guruRecord || guruRecord.id !== input.guruId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Anda hanya dapat membuat jurnal untuk diri sendiri" })
          }
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akses ditolak" })
        }
      }

      const kelasRecord = await db.query.kelas.findFirst({
        where: eq(kelas.id, input.kelasId),
      })
      if (!kelasRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kelas tidak ditemukan" })
      }
      const sekolahId = kelasRecord.sekolahId

      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(jurnalMengajar)
        .values({ ...input, id, sekolahId } as any)
        .returning()
      await logAudit(ctx, { action: "create", entity: "jurnal_mengajar", entityId: result[0]?.id, metadata: { kelasId: input.kelasId } })
      return result[0]
    }),

  updateJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string(), data: jurnalUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const existing = await db.query.jurnalMengajar.findFirst({
        where: eq(jurnalMengajar.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      }

      if (ctx.session.user.role === "guru") {
        const userEmail = ctx.session.user.email
        if (userEmail) {
          const guruRecord = await db.query.guru.findFirst({
            where: or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          })
          if (!guruRecord || existing.guruId !== guruRecord.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Anda hanya dapat mengedit jurnal Anda sendiri" })
          }
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akses ditolak" })
        }
      }

      const result = await db
        .update(jurnalMengajar)
        .set({ ...input.data, updatedAt: new Date() })
        .where(eq(jurnalMengajar.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "jurnal_mengajar", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  deleteJurnal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const existing = await db.query.jurnalMengajar.findFirst({
        where: eq(jurnalMengajar.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jurnal tidak ditemukan" })
      }

      if (ctx.session.user.role === "guru") {
        const userEmail = ctx.session.user.email
        if (userEmail) {
          const guruRecord = await db.query.guru.findFirst({
            where: or(
              eq(guru.email, userEmail),
              eq(guru.usernameGuru, userEmail),
              eq(guru.nipnuptk, userEmail)
            )
          })
          if (!guruRecord || existing.guruId !== guruRecord.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Anda hanya dapat menghapus jurnal Anda sendiri" })
          }
        } else {
          throw new TRPCError({ code: "FORBIDDEN", message: "Akses ditolak" })
        }
      }

      await db.delete(jurnalMengajar).where(eq(jurnalMengajar.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "jurnal_mengajar", entityId: input.id })
      return { success: true }
    }),

  generateJurnalDariJadwal: roleProtectedProcedure(["super_admin", "admin_sekolah", "guru"])
    .input(z.object({
      guruId: z.string(),
      tanggal: z.coerce.date(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const hariList = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
      const hari = hariList[input.tanggal.getDay()] as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"

      const jadwalList = await db
        .select()
        .from(jadwalPelajaran)
        .where(and(
          eq(jadwalPelajaran.guruId, input.guruId),
          eq(jadwalPelajaran.hari, hari),
          eq(jadwalPelajaran.sekolahId, sekolahId),
        ))

      if (jadwalList.length === 0) {
        return { created: 0, message: `Tidak ada jadwal untuk hari ${hari}` }
      }

      const startOfDay = new Date(input.tanggal)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(input.tanggal)
      endOfDay.setHours(23, 59, 59, 999)

      const created: any[] = []
      for (const jadwal of jadwalList) {
        const existing = await db
          .select()
          .from(jurnalMengajar)
          .where(and(
            eq(jurnalMengajar.guruId, input.guruId),
            eq(jurnalMengajar.kelasId, jadwal.kelasId),
            eq(jurnalMengajar.mataPelajaranId, jadwal.mataPelajaranId),
            eq(jurnalMengajar.sekolahId, sekolahId),
            between(jurnalMengajar.tanggal, startOfDay, endOfDay),
          ))
          .limit(1)

        if (existing.length === 0) {
          const id = crypto.randomUUID()
          const result = await db
            .insert(jurnalMengajar)
            .values({
              id,
              sekolahId,
              guruId: input.guruId,
              kelasId: jadwal.kelasId,
              mataPelajaranId: jadwal.mataPelajaranId,
              jadwalPelajaranId: jadwal.id,
              tanggal: startOfDay,
              jamMulai: jadwal.jamMulai,
              jamSelesai: jadwal.jamSelesai,
              status: "draft",
            })
            .returning()
          created.push(result[0])
        }
      }

      await logAudit(ctx, { action: "generate_jurnal", entity: "jurnal_mengajar", entityId: input.guruId, metadata: { tanggal: input.tanggal.toISOString(), jumlah: created.length } })
      return { created: created.length, data: created }
    }),

  generateAllJurnalForDay: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ tanggal: z.coerce.date() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      const hariList = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
      const hari = hariList[input.tanggal.getDay()] as "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu"

      const startOfDay = new Date(input.tanggal)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(input.tanggal)
      endOfDay.setHours(23, 59, 59, 999)

      const guruRecords = await db
        .select({ id: guru.id })
        .from(guru)
        .where(eq(guru.sekolahId, sekolahId))

      if (guruRecords.length === 0) return { created: 0 }

      const guruIds = guruRecords.map((g) => g.id)

      const jadwalList = await db
        .select()
        .from(jadwalPelajaran)
        .where(and(
          eq(jadwalPelajaran.hari, hari),
          inArray(jadwalPelajaran.guruId, guruIds),
        ))

      if (jadwalList.length === 0) return { created: 0 }

      let createdCount = 0
      for (const jadwal of jadwalList) {
        const existing = await db
          .select()
          .from(jurnalMengajar)
          .where(and(
            eq(jurnalMengajar.guruId, jadwal.guruId),
            eq(jurnalMengajar.kelasId, jadwal.kelasId),
            eq(jurnalMengajar.mataPelajaranId, jadwal.mataPelajaranId),
            gte(jurnalMengajar.tanggal, startOfDay),
            lte(jurnalMengajar.tanggal, endOfDay),
          ))
          .limit(1)

        if (existing.length === 0) {
          await db.insert(jurnalMengajar).values({
            id: crypto.randomUUID(),
            sekolahId,
            guruId: jadwal.guruId,
            kelasId: jadwal.kelasId,
            mataPelajaranId: jadwal.mataPelajaranId,
            jadwalPelajaranId: jadwal.id,
            tanggal: startOfDay,
            jamMulai: jadwal.jamMulai,
            jamSelesai: jadwal.jamSelesai,
            status: "draft",
          })
          createdCount++
        }
      }

      await logAudit(ctx, { action: "generate_all_jurnal", entity: "jurnal_mengajar", entityId: sekolahId, metadata: { tanggal: input.tanggal.toISOString(), created: createdCount } })
      return { created: createdCount }
    }),
})
