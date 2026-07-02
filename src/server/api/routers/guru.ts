import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { guru, sekolah } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const guruCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  nipnuptk: z.string().nullable().optional(),
  nik: z.string().nullable().optional(),
  namaLengkap: z.string(),
  jenisKelamin: z.enum(["L", "P"]).nullable().optional(),
  tempatLahir: z.string().nullable().optional(),
  tanggalLahir: z.date().nullable().optional(),
  alamat: z.string().nullable().optional(),
  noHp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  pendidikanTerakhir: z.string().nullable().optional(),
  statusKepegawaian: z.string().nullable().optional(),
  kategoriPegawai: z.string().nullable().optional(),
  tugasUtama: z.string().nullable().optional(),
  tugasTambahan: z.string().nullable().optional(),
  mulaiBertugas: z.date().nullable().optional(),
  akhirBertugas: z.date().nullable().optional(),
  jp: z.number().nullable().optional(),
  foto: z.string().nullable().optional(),
  active: z.boolean().optional(),
  usernameGuru: z.string().nullable().optional(),
  passwordGuru: z.string().nullable().optional(),
})

const guruUpdateSchema = guruCreateSchema.partial()

function getSekolahIdFilter(ctx: { session: { user: { role?: string; sekolahId?: string } } }) {
  const { role, sekolahId } = ctx.session.user
  if (role === "super_admin") return null
  return sekolahId ?? null
}

export const guruRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        sortBy: z.enum(["namaLengkap", "nipnuptk", "createdAt"]).optional().default("namaLengkap"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(guru.namaLengkap, `%${input.search}%`), like(guru.nipnuptk, `%${input.search}%`)))
      }
      const orderBy = input.sortOrder === "asc" ? asc(guru[input.sortBy]) : desc(guru[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db
        .select()
        .from(guru)
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
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const result = await db.query.guru.findFirst({
        where: and(...conditions),
        with: { sekolah: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(guruCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(guru).values({ ...input, id, sekolahId } as any).returning()
      return result[0]
    }),

  bulkCreate: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      data: z.array(guruCreateSchema.omit({ sekolahId: true })),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const now = new Date()
      const values = input.data.map((d) => ({
        ...d,
        id: d.id || crypto.randomUUID(),
        sekolahId,
        updatedAt: now,
      }))
      const result = await db.insert(guru).values(values as any).returning()
      return result
    }),

  getAllExport: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(guru.namaLengkap, `%${input.search}%`), like(guru.nipnuptk, `%${input.search}%`)))
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      return db.select().from(guru).where(whereClause).orderBy(asc(guru.namaLengkap))
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: guruUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      const result = await db
        .update(guru)
        .set({ ...input.data, updatedAt: new Date() })
        .where(and(...conditions))
        .returning()
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx as any)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      await db.delete(guru).where(and(...conditions))
      return { success: true }
    }),
})
