import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc, count } from "drizzle-orm"
import { getTableColumns } from "drizzle-orm/utils"
import { db } from "@/server/db"
import bcrypt from "bcryptjs"
import { guru } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized, strictRateLimit, moderateRateLimit } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { cacheKey, getCache, setCache, invalidateCache } from "@/lib/cache"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"
import { syncUserCredentials } from "@/server/credentials"

const guruCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string().optional(),
  nipnuptk: z.string().nullable().optional(),
  nik: z.string().nullable().optional(),
  namaLengkap: z.string(),
  jenisKelamin: z.enum(["L", "P"]).nullable().optional(),
  tempatLahir: z.string().nullable().optional(),
  tanggalLahir: z.coerce.date().nullable().optional(),
  alamat: z.string().nullable().optional(),
  noHp: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  pendidikanTerakhir: z.string().nullable().optional(),
  riwayatPendidikan: z.string().nullable().optional(),
  statusKepegawaian: z.string().nullable().optional(),
  kategoriPegawai: z.string().nullable().optional(),
  tugasUtama: z.string().nullable().optional(),
  tugasTambahan: z.string().nullable().optional(),
  mulaiBertugas: z.coerce.date().nullable().optional(),
  akhirBertugas: z.coerce.date().nullable().optional(),
  jp: z.number().nullable().optional(),
  foto: z.string().nullable().optional(),
  active: z.boolean().optional(),
  usernameGuru: z.string().nullable().optional(),
  passwordGuru: z.string().nullable().optional(),
})

const guruUpdateSchema = guruCreateSchema.partial()


const GURU_CACHE_LIMITS = [1, 50, 100, 200, 500, 1000]
const guruCacheKeys = (sekolahId: string) => GURU_CACHE_LIMITS.map((l) => cacheKey("guru:getAll", sekolahId, `l${l}`))

export const guruRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        statusKepegawaian: z.string().optional(),
        kategoriPegawai: z.string().optional(),
        sortBy: z.enum(["namaLengkap", "nipnuptk", "createdAt"]).optional().default("namaLengkap"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)

      const runQuery = async () => {
        const conditions = []
        if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
        if (input.search) {
          conditions.push(or(like(guru.namaLengkap, `%${input.search}%`), like(guru.nipnuptk, `%${input.search}%`)))
        }
        if (input.statusKepegawaian) {
          if (input.statusKepegawaian === "GTY") {
            conditions.push(or(eq(guru.statusKepegawaian, "GTY"), like(guru.statusKepegawaian, "%GTY%")))
          } else if (input.statusKepegawaian === "GTT") {
            conditions.push(or(eq(guru.statusKepegawaian, "GTT"), like(guru.statusKepegawaian, "%GTT%")))
          } else if (input.statusKepegawaian === "Honor") {
            conditions.push(or(eq(guru.statusKepegawaian, "Honor"), like(guru.statusKepegawaian, "%Honor%")))
          } else {
            conditions.push(eq(guru.statusKepegawaian, input.statusKepegawaian))
          }
        }
        if (input.kategoriPegawai) {
          conditions.push(eq(guru.kategoriPegawai, input.kategoriPegawai))
        }
        const orderBy = input.sortOrder === "asc" ? asc(guru[input.sortBy]) : desc(guru[input.sortBy])
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined
        const { passwordGuru, ...guruColumns } = getTableColumns(guru)
          void passwordGuru
        return db
          .select({ ...guruColumns })
          .from(guru)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(input.limit)
          .offset(input.offset)
      }

      // Cache varian tanpa filter (dropdown utama). Key ikut limit — banyak
      // pemanggil pakai limit berbeda (50/200/500/1000). passwordGuru tidak
      // ikut di-cache (hash kredensial, bukan data tampilan).
      const isDefault =
        !input.search && !input.statusKepegawaian && !input.kategoriPegawai &&
        input.offset === 0 && input.sortBy === "namaLengkap" && input.sortOrder === "asc"
      if (isDefault) {
        const key = cacheKey("guru:getAll", sekolahIdFilter || "all", `l${input.limit}`)
        const cached = await getCache<typeof guru.$inferSelect[]>(key)
        if (cached !== null) return cached
        const data = await runQuery()
        const cacheData = data.map((record) => {
          const copy = { ...record } as Record<string, unknown>
          delete copy.passwordGuru
          return copy
        })
        await setCache(key, cacheData, 300)
        return cacheData as typeof guru.$inferSelect[]
      }
      return runQuery()
    }),

  // Endpoint ringan untuk dropdown/select — kolom minimal, tanpa passwordGuru.
  getLookup: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().optional().default(500),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(guru.namaLengkap, `%${input.search}%`), like(guru.nipnuptk, `%${input.search}%`)))
      }
      return db
        .select({
          id: guru.id,
          sekolahId: guru.sekolahId,
          nipnuptk: guru.nipnuptk,
          namaLengkap: guru.namaLengkap,
          foto: guru.foto,
          statusKepegawaian: guru.statusKepegawaian,
          kategoriPegawai: guru.kategoriPegawai,
          tugasUtama: guru.tugasUtama,
          jp: guru.jp,
          active: guru.active,
        })
        .from(guru)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(guru.namaLengkap))
        .limit(input.limit)
        .offset(input.offset)
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const { passwordGuru, ...guruColumns } = getTableColumns(guru)
          void passwordGuru
      const result = await db
        .select({ ...guruColumns })
        .from(guru)
        .where(and(...conditions))
        .limit(1)
      if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      return result[0]
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(guruCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const id = input.id || crypto.randomUUID()
      let passwordHash = input.passwordGuru || null
      if (passwordHash) passwordHash = await bcrypt.hash(passwordHash, 12)
      const result = await db.insert(guru).values({ ...input, id, passwordGuru: passwordHash, sekolahId } as any).returning()
      await syncUserCredentials({
        email: input.usernameGuru || input.email || input.nipnuptk || "",
        role: "guru",
        sekolahId,
        namaLengkap: input.namaLengkap,
        photo: input.foto || null,
        passwordHash,
      })
      await logAudit(ctx, { action: "create", entity: "guru", entityId: result[0]?.id, metadata: { namaLengkap: input.namaLengkap } })
      await invalidateCache(guruCacheKeys(sekolahId))
      return result[0]
    }),

  bulkCreate: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"]).use(moderateRateLimit)
    .input(sanitized(z.object({
      data: z.array(guruCreateSchema.omit({ sekolahId: true })),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const now = new Date()
      const usersToCreate: any[] = []
      const values = input.data.map((d) => {
        const id = d.id || crypto.randomUUID()
        let passwordHash = d.passwordGuru || null
        if (passwordHash) passwordHash = bcrypt.hashSync(passwordHash, 12)
        if (passwordHash) {
          usersToCreate.push({
            email: d.usernameGuru || d.email || d.nipnuptk || "",
            role: "guru" as const,
            sekolahId,
            namaLengkap: d.namaLengkap,
            passwordHash,
            createIfMissing: true,
          })
        }
        return { ...d, id, passwordGuru: passwordHash, sekolahId, updatedAt: now }
      })
      const result = await db.insert(guru).values(values as any).returning()
      for (const u of usersToCreate) {
        await syncUserCredentials(u)
      }
      await logAudit(ctx, { action: "bulk_create", entity: "guru", metadata: { count: result.length } })
      await invalidateCache(guruCacheKeys(sekolahId))
      return result
    }),

  getAllExport: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(or(like(guru.namaLengkap, `%${input.search}%`), like(guru.nipnuptk, `%${input.search}%`)))
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const { passwordGuru, ...guruColumns } = getTableColumns(guru)
          void passwordGuru
      return db.select({ ...guruColumns }).from(guru).where(whereClause).orderBy(asc(guru.namaLengkap))
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: guruUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(guru.id, input.id), eq(guru.sekolahId, sekolahId)]
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      const { passwordGuru, ...rest } = input.data
      let passwordHash = passwordGuru || null
      if (passwordHash) passwordHash = await bcrypt.hash(passwordHash, 12)
      const updateData = { ...rest, passwordGuru: passwordHash || existing.passwordGuru, updatedAt: new Date() }
      const result = await db
        .update(guru)
        .set(updateData)
        .where(and(...conditions))
        .returning()
      const email = input.data.usernameGuru || existing.email || existing.usernameGuru || existing.nipnuptk || ""
      if (email) {
        await syncUserCredentials({
          email,
          role: "guru",
          sekolahId: existing.sekolahId,
          namaLengkap: rest.namaLengkap || existing.namaLengkap,
          photo: rest.foto !== undefined ? rest.foto : existing.foto,
          passwordHash,
        })
      }
      await logAudit(ctx, { action: "update", entity: "guru", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      await invalidateCache(guruCacheKeys(sekolahId))
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(guru.id, input.id), eq(guru.sekolahId, sekolahId)]
      const [result] = await db.delete(guru).where(and(...conditions)).returning()
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      await logAudit(ctx, { action: "delete", entity: "guru", entityId: input.id })
      await invalidateCache(guruCacheKeys(sekolahId))
      return { success: true }
    }),

  resetPassword: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"]).use(strictRateLimit)
    .input(z.object({ id: z.string(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(guru.id, input.id), eq(guru.sekolahId, sekolahId)]
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      const passwordHash = await bcrypt.hash(input.password, 12)
      await db.update(guru).set({ passwordGuru: passwordHash }).where(and(...conditions))
      await syncUserCredentials({
        email: existing.usernameGuru || existing.nipnuptk || "",
        role: "guru",
        sekolahId: existing.sekolahId,
        namaLengkap: existing.namaLengkap,
        passwordHash,
      })
      await logAudit(ctx, { action: "reset_password", entity: "guru", entityId: input.id })
      return { success: true }
    }),

  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      
      const totalCond: any[] = []
      if (sekolahIdFilter) totalCond.push(eq(guru.sekolahId, sekolahIdFilter))
      const [totalResult] = await db.select({ count: count() }).from(guru).where(and(...totalCond))
      
      const activeCond: any[] = [eq(guru.active, true)]
      if (sekolahIdFilter) activeCond.push(eq(guru.sekolahId, sekolahIdFilter))
      const [activeResult] = await db.select({ count: count() }).from(guru).where(and(...activeCond))
      
      const maleCond: any[] = [eq(guru.active, true), eq(guru.jenisKelamin, "L")]
      if (sekolahIdFilter) maleCond.push(eq(guru.sekolahId, sekolahIdFilter))
      const [maleResult] = await db.select({ count: count() }).from(guru).where(and(...maleCond))
      
      const femaleCond: any[] = [eq(guru.active, true), eq(guru.jenisKelamin, "P")]
      if (sekolahIdFilter) femaleCond.push(eq(guru.sekolahId, sekolahIdFilter))
      const [femaleResult] = await db.select({ count: count() }).from(guru).where(and(...femaleCond))

      return {
        total: Number(totalResult?.count ?? 0),
        active: Number(activeResult?.count ?? 0),
        male: Number(maleResult?.count ?? 0),
        female: Number(femaleResult?.count ?? 0),
      }
    }),
})
