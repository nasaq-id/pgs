import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { jadwalPelajaran, kelas } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const jadwalCreateSchema = z.object({
  id: z.string().optional(),
  kelasId: z.string(),
  mataPelajaranId: z.string(),
  guruId: z.string(),
  hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
  jamMulai: z.date().nullable().optional(),
  jamSelesai: z.date().nullable().optional(),
  jpMulai: z.number().nullable().optional(),
  jpCount: z.number().nullable().optional(),
})

const jadwalUpdateSchema = jadwalCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

async function getKelasIdsForSekolah(sekolahId: string | null): Promise<string[]> {
  if (!sekolahId) return []
  const rows = await db
    .select({ id: kelas.id })
    .from(kelas)
    .where(eq(kelas.sekolahId, sekolahId))
  return rows.map((r) => r.id)
}

export const jadwalRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        kelasId: z.string().optional(),
        hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]).optional(),
        sortBy: z.enum(["hari", "jamMulai"]).optional().default("jamMulai"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = []
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        conditions.push(inArray(jadwalPelajaran.kelasId, kelasIds))
      }
      if (input.kelasId) conditions.push(eq(jadwalPelajaran.kelasId, input.kelasId))
      if (input.hari) conditions.push(eq(jadwalPelajaran.hari, input.hari))
      const orderBy = input.sortOrder === "asc" ? asc(jadwalPelajaran[input.sortBy]) : desc(jadwalPelajaran[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(jadwalPelajaran)
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const result = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true, mataPelajaran: true, guru: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && result.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(jadwalCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(jadwalPelajaran).values({ ...input, id } as any).returning()
      await logAudit(ctx, { action: "create", entity: "jadwal_pelajaran", entityId: result[0]?.id, metadata: { kelasId: input.kelasId } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: jadwalUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      if (input.data.kelasId && sekolahIdFilter) {
        const kelasIds = await getKelasIdsForSekolah(sekolahIdFilter)
        if (!kelasIds.includes(input.data.kelasId)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Kelas tidak berada di sekolah Anda" })
        }
      }
      const result = await db
        .update(jadwalPelajaran)
        .set(input.data as any)
        .where(eq(jadwalPelajaran.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "jadwal_pelajaran", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db.query.jadwalPelajaran.findFirst({
        where: eq(jadwalPelajaran.id, input.id),
        with: { kelas: true },
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      if (sekolahIdFilter && existing.kelas?.sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Jadwal pelajaran tidak ditemukan" })
      }
      await db.delete(jadwalPelajaran).where(eq(jadwalPelajaran.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "jadwal_pelajaran", entityId: input.id })
      return { success: true }
    }),
})
