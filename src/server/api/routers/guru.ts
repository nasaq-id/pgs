import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, like, or, desc, asc, count } from "drizzle-orm"
import { db } from "@/server/db"
import bcrypt from "bcryptjs"
import { guru, users } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

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
      const sekolahIdFilter = getSekolahIdFilter(ctx)
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
      let passwordHash = input.passwordGuru || null
      if (passwordHash) passwordHash = await bcrypt.hash(passwordHash, 12)
      const result = await db.insert(guru).values({ ...input, id, passwordGuru: passwordHash, sekolahId } as any).returning()
      const email = input.usernameGuru || input.email || input.nipnuptk || ""
      if (email) {
        const nameParts = (input.namaLengkap || "").split(" ")
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""
        const userRecord = await db.query.users.findFirst({ where: eq(users.email, email) })
        const userPhoto = input.foto || null

        if (userRecord) {
          await db
            .update(users)
            .set({
              firstName,
              lastName,
              photo: userPhoto,
              password: passwordHash || userRecord.password,
            })
            .where(eq(users.email, email))
            .execute()
        } else {
          await db
            .insert(users)
            .values({
              id: crypto.randomUUID(),
              email,
              firstName,
              lastName,
              password: passwordHash || "$2b$12$kBIO9Jl5ilOB/vjpf.1NjOzwXIyAiqIkcPs2CN31YZI9/9wF3GIk6",
              role: "guru",
              sekolahId,
              photo: userPhoto,
              active: true,
            })
            .execute()
        }
      }
      await logAudit(ctx, { action: "create", entity: "guru", entityId: result[0]?.id, metadata: { namaLengkap: input.namaLengkap } })
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
      const usersToCreate: any[] = []
      const values = input.data.map((d) => {
        const id = d.id || crypto.randomUUID()
        let passwordHash = d.passwordGuru || null
        if (passwordHash) passwordHash = bcrypt.hashSync(passwordHash, 12)
        if (passwordHash) {
          const email = d.usernameGuru || d.email || d.nipnuptk || ""
          const nameParts = (d.namaLengkap || "").split(" ")
          usersToCreate.push({
            id: crypto.randomUUID(),
            email,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            password: passwordHash,
            role: "guru",
            sekolahId,
            active: true,
          })
        }
        return { ...d, id, passwordGuru: passwordHash, sekolahId, updatedAt: now }
      })
      const result = await db.insert(guru).values(values as any).returning()
      for (const u of usersToCreate) {
        await db.insert(users).values(u).execute()
      }
      await logAudit(ctx, { action: "bulk_create", entity: "guru", metadata: { count: result.length } })
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
      return db.select().from(guru).where(whereClause).orderBy(asc(guru.namaLengkap))
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: guruUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
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
        const userRecord = await db.query.users.findFirst({ where: eq(users.email, email) })
        const firstName = rest.namaLengkap?.split(" ")[0] || existing.namaLengkap?.split(" ")[0] || ""
        const lastName = rest.namaLengkap?.split(" ").slice(1).join(" ") || existing.namaLengkap?.split(" ").slice(1).join(" ") || ""
        const photo = rest.foto !== undefined ? rest.foto : existing.foto

        const dataToUpdate: Record<string, any> = {
          firstName,
          lastName,
          photo,
        }
        if (passwordHash) {
          dataToUpdate.password = passwordHash
        }

        if (userRecord) {
          await db
            .update(users)
            .set(dataToUpdate)
            .where(eq(users.email, email))
            .execute()
        } else {
          await db
            .insert(users)
            .values({
              id: crypto.randomUUID(),
              email,
              firstName,
              lastName,
              password: passwordHash || "$2b$12$kBIO9Jl5ilOB/vjpf.1NjOzwXIyAiqIkcPs2CN31YZI9/9wF3GIk6",
              role: "guru",
              sekolahId: existing.sekolahId,
              photo,
              active: true,
            })
            .execute()
        }
      }
      await logAudit(ctx, { action: "update", entity: "guru", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      await db.delete(guru).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "guru", entityId: input.id })
      return { success: true }
    }),

  resetPassword: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(guru.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(guru.sekolahId, sekolahIdFilter))
      const existing = await db.query.guru.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Guru tidak ditemukan" })
      const passwordHash = await bcrypt.hash(input.password, 12)
      await db.update(guru).set({ passwordGuru: passwordHash }).where(and(...conditions))
       const email = existing.usernameGuru || existing.nipnuptk || ""
       if (email) {
         const userRecord = await db.query.users.findFirst({ where: eq(users.email, email) })
         if (userRecord) {
           await db.update(users).set({ password: passwordHash }).where(eq(users.email, email)).execute()
         } else {
           const nameParts = (existing.namaLengkap || "").split(" ")
           await db.insert(users).values({
             id: crypto.randomUUID(),
             email,
             firstName: nameParts[0] || "",
             lastName: nameParts.slice(1).join(" ") || "",
             password: passwordHash,
             role: "guru",
             sekolahId: existing.sekolahId,
             active: true,
           }).execute()
         }
       }
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
