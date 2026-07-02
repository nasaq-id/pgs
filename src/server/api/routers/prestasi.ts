import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { prestasi, siswa } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

const prestasiCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  namaPrestasi: z.string(),
  tingkat: z.enum(["sekolah", "kecamatan", "kabupaten", "provinsi", "nasional", "internasional"]).nullable().optional(),
  juara: z.string().nullable().optional(),
  tanggal: z.date().nullable().optional(),
  sertifikat: z.string().nullable().optional(),
})

const prestasiUpdateSchema = prestasiCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const prestasiRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sekolahId: z.string().optional(),
        sortBy: z.enum(["namaPrestasi", "juara", "tanggal"]).optional().default("tanggal"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      const effectiveSekolahId = sekolahIdFilter || input.sekolahId
      if (effectiveSekolahId) conditions.push(eq(siswa.sekolahId, effectiveSekolahId))
      if (input.search) {
        conditions.push(
          or(
            like(prestasi.namaPrestasi, `%${input.search}%`),
            like(siswa.namaLengkap, `%${input.search}%`),
          ),
        )
      }
      const orderBy = input.sortOrder === "asc" ? asc(prestasi[input.sortBy]) : desc(prestasi[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select({
          id: prestasi.id,
          siswaId: prestasi.siswaId,
          namaPrestasi: prestasi.namaPrestasi,
          tingkat: prestasi.tingkat,
          juara: prestasi.juara,
          tanggal: prestasi.tanggal,
          sertifikat: prestasi.sertifikat,
          siswa: { id: siswa.id, namaLengkap: siswa.namaLengkap },
        })
        .from(prestasi)
        .innerJoin(siswa, eq(prestasi.siswaId, siswa.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(prestasiCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      if (sekolahIdFilter) {
        const siswaRecord = await db.query.siswa.findFirst({
          where: and(eq(siswa.id, input.siswaId), eq(siswa.sekolahId, sekolahIdFilter)),
        })
        if (!siswaRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      }
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(prestasi).values({ ...input, id } as any).returning()
      await logAudit(ctx, { action: "create", entity: "prestasi", entityId: result[0]?.id, metadata: { siswaId: input.siswaId } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: prestasiUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db
        .select({ id: prestasi.id })
        .from(prestasi)
        .innerJoin(siswa, eq(prestasi.siswaId, siswa.id))
        .where(
          sekolahIdFilter
            ? and(eq(prestasi.id, input.id), eq(siswa.sekolahId, sekolahIdFilter))
            : eq(prestasi.id, input.id),
        )
        .limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Prestasi tidak ditemukan" })
      const updateData = { ...input.data }
      delete (updateData as any).id
      const result = await db
        .update(prestasi)
        .set(updateData as any)
        .where(eq(prestasi.id, input.id))
        .returning()
      await logAudit(ctx, { action: "update", entity: "prestasi", entityId: result[0]?.id, metadata: { fields: Object.keys(updateData) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const existing = await db
        .select({ id: prestasi.id })
        .from(prestasi)
        .innerJoin(siswa, eq(prestasi.siswaId, siswa.id))
        .where(
          sekolahIdFilter
            ? and(eq(prestasi.id, input.id), eq(siswa.sekolahId, sekolahIdFilter))
            : eq(prestasi.id, input.id),
        )
        .limit(1)
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Prestasi tidak ditemukan" })
      await db.delete(prestasi).where(eq(prestasi.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "prestasi", entityId: input.id })
      return { success: true }
    }),
})
