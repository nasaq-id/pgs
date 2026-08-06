import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { prestasi, siswa } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"

const prestasiCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  namaPrestasi: z.string(),
  tingkat: z.enum(["sekolah", "kecamatan", "kabupaten", "provinsi", "nasional", "internasional"]).nullable().optional(),
  juara: z.string().nullable().optional(),
  tanggal: z.coerce.date().nullable().optional(),
  sertifikat: z.string().nullable().optional(),
})

const prestasiUpdateSchema = prestasiCreateSchema.partial()


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
      const sekolahIdFilter = getSekolahIdFilter(ctx)
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
    .input(sanitized(prestasiCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = requireSekolahId(ctx)
      const siswaRecord = await db.query.siswa.findFirst({
        where: eq(siswa.id, input.siswaId),
      })
      if (!siswaRecord) throw new TRPCError({ code: "NOT_FOUND", message: "Siswa tidak ditemukan" })
      const sekolahId = siswaRecord.sekolahId

      if (sekolahId !== sekolahIdFilter) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Siswa tidak berada di sekolah Anda" })
      }

      const id = input.id || crypto.randomUUID()
      const result = await db.insert(prestasi).values({ ...input, id, sekolahId } as any).returning()
      await logAudit(ctx, { action: "create", entity: "prestasi", entityId: result[0]?.id, metadata: { siswaId: input.siswaId } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: prestasiUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const whereClause = and(eq(prestasi.id, input.id), eq(prestasi.sekolahId, sekolahId))

      const updateData = { ...input.data }
      delete (updateData as any).id
      const [updated] = await db
        .update(prestasi)
        .set(updateData as any)
        .where(whereClause)
        .returning()
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Prestasi tidak ditemukan" })
      await logAudit(ctx, { action: "update", entity: "prestasi", entityId: updated.id, metadata: { fields: Object.keys(updateData) } })
      return updated
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const whereClause = and(eq(prestasi.id, input.id), eq(prestasi.sekolahId, sekolahId))

      const [deleted] = await db.delete(prestasi).where(whereClause).returning()
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Prestasi tidak ditemukan" })
      await logAudit(ctx, { action: "delete", entity: "prestasi", entityId: input.id })
      return { success: true }
    }),
})
