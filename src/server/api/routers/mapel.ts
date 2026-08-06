import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, or, like, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { mataPelajaran } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter, requireSekolahId } from "@/server/api/tenant"

const mapelCreateSchema = z.object({
  id: z.string().optional(),
  sekolahId: z.string(),
  namaMapel: z.string(),
  kodeMapel: z.string().nullable().optional(),
  kelompok: z.enum(["A", "B", "C", "muatan_lokal"]).nullable().optional(),
  kkm: z.number().optional(),
  aktif: z.boolean().optional(),
  urutan: z.number().optional(),
})

const mapelUpdateSchema = mapelCreateSchema.partial()


export const mapelRouter = router({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tingkat: z.string().optional(),
        sortBy: z.enum(["namaMapel", "kodeMapel", "urutan"]).optional().default("urutan"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = []
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      if (input.search) {
        conditions.push(
          or(like(mataPelajaran.namaMapel, `%${input.search}%`), like(mataPelajaran.kodeMapel, `%${input.search}%`)),
        )
      }
      const orderBy = input.sortOrder === "asc" ? asc(mataPelajaran[input.sortBy]) : desc(mataPelajaran[input.sortBy])
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined
      const data = await db.query.mataPelajaran.findMany({
        where: whereClause,
        orderBy,
        limit: input.limit,
        offset: input.offset,
        with: {
          pengampu: {
            with: {
              kelas: true,
              guru: true,
            },
          },
        },
      })

      if (input.tingkat && input.tingkat !== "semua") {
        const selectedTingkat = input.tingkat.trim().toLowerCase()
        return data.filter((item) => {
          if (!item.pengampu || item.pengampu.length === 0) return false
          return item.pengampu.some((p) => {
            if (!p.kelas) return false
            const kTingkat = (p.kelas.tingkat || "").trim().toLowerCase()
            const kNama = (p.kelas.namaKelas || "").trim().toLowerCase()
            return kTingkat === selectedTingkat || kTingkat.includes(selectedTingkat) || kNama.startsWith(selectedTingkat)
          })
        })
      }

      return data
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const sekolahIdFilter = getSekolahIdFilter(ctx)
      const conditions = [eq(mataPelajaran.id, input.id)]
      if (sekolahIdFilter) conditions.push(eq(mataPelajaran.sekolahId, sekolahIdFilter))
      const result = await db.query.mataPelajaran.findFirst({
        where: and(...conditions),
        with: { sekolah: true },
      })
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      return result
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(mapelCreateSchema))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const id = input.id || crypto.randomUUID()
      const result = await db.insert(mataPelajaran).values({ ...input, id, sekolahId } as any).returning()
      await logAudit(ctx, { action: "create", entity: "mata_pelajaran", entityId: result[0]?.id, metadata: { namaMapel: input.namaMapel } })
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({ id: z.string(), data: mapelUpdateSchema })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(mataPelajaran.id, input.id), eq(mataPelajaran.sekolahId, sekolahId)]
      const existing = await db.query.mataPelajaran.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      const result = await db
        .update(mataPelajaran)
        .set(input.data as any)
        .where(and(...conditions))
        .returning()
      await logAudit(ctx, { action: "update", entity: "mata_pelajaran", entityId: result[0]?.id, metadata: { fields: Object.keys(input.data) } })
      return result[0]
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const conditions = [eq(mataPelajaran.id, input.id), eq(mataPelajaran.sekolahId, sekolahId)]
      const existing = await db.query.mataPelajaran.findFirst({ where: and(...conditions) })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Mata pelajaran tidak ditemukan" })
      await db.delete(mataPelajaran).where(and(...conditions))
      await logAudit(ctx, { action: "delete", entity: "mata_pelajaran", entityId: input.id })
      return { success: true }
    }),

  reorder: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      items: z.array(z.object({ id: z.string(), urutan: z.number() })),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      for (const item of input.items) {
        const conditions = [eq(mataPelajaran.id, item.id), eq(mataPelajaran.sekolahId, sekolahId)]
        await db.update(mataPelajaran).set({ urutan: item.urutan }).where(and(...conditions))
      }
      await logAudit(ctx, { action: "reorder", entity: "mata_pelajaran", metadata: { count: input.items.length } })
      return { success: true }
    }),

  generateFromKMA: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({
      items: z.array(z.object({
        kode: z.string().min(1),
        nama: z.string().min(1),
        kelompok: z.enum(["A", "B", "C", "muatan_lokal"]),
        jumlahJam: z.number().min(0).max(60),
      })),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const result = await upsertMapelList(sekolahId, input.items)
      await logAudit(ctx, { action: "generate_kma", entity: "mata_pelajaran", metadata: { ...result, source: "kma_1503_2025" } })
      return result
    }),

  importBulk: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(sanitized(z.object({
      items: z.array(z.object({
        kode: z.string().optional(),
        nama: z.string().min(1),
        kelompok: z.enum(["A", "B", "C", "muatan_lokal"]).optional(),
        jumlahJam: z.number().min(0).max(60).optional(),
        kkm: z.number().min(0).max(100).optional(),
      })),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const result = await upsertMapelList(sekolahId, input.items.map((i) => ({
        kode: i.kode || "",
        nama: i.nama,
        kelompok: i.kelompok || "A",
        jumlahJam: i.jumlahJam ?? 0,
        kkm: i.kkm,
      })))
      await logAudit(ctx, { action: "import_xlsx", entity: "mata_pelajaran", metadata: result })
      return result
    }),
})

type MapelBulkItem = { kode: string; nama: string; kelompok: "A" | "B" | "C" | "muatan_lokal"; jumlahJam: number; kkm?: number }

/**
 * Upsert daftar mapel (generate kurikulum / import XLSX):
 * cocokkan berdasarkan kode atau nama yang sama di sekolah yang sama,
 * lalu susun ulang urutan mengikuti urutan input.
 */
async function upsertMapelList(sekolahId: string, items: MapelBulkItem[]) {
  let added = 0
  let updated = 0
  const existingList = await db.query.mataPelajaran.findMany({
    where: eq(mataPelajaran.sekolahId, sekolahId),
  })

  for (const item of items) {
    const kode = item.kode.trim().toUpperCase()
    const existing = existingList.find(
      (e) =>
        (e.kodeMapel && e.kodeMapel.trim().toUpperCase() === kode && kode !== "") ||
        e.namaMapel.trim().toLowerCase() === item.nama.trim().toLowerCase()
    )
    if (existing) {
      await db
        .update(mataPelajaran)
        .set({
          namaMapel: item.nama.trim(),
          kodeMapel: kode || existing.kodeMapel,
          kelompok: item.kelompok,
          jumlahJam: item.jumlahJam,
          ...(item.kkm !== undefined ? { kkm: item.kkm } : {}),
        })
        .where(eq(mataPelajaran.id, existing.id))
      updated++
    } else {
      await db.insert(mataPelajaran).values({
        id: crypto.randomUUID(),
        sekolahId,
        namaMapel: item.nama.trim(),
        kodeMapel: kode || null,
        kelompok: item.kelompok,
        jumlahJam: item.jumlahJam,
        ...(item.kkm !== undefined ? { kkm: item.kkm } : {}),
      })
      added++
    }
  }

  // Susun ulang urutan: mapel yang diinput mengikuti urutan input, sisanya di belakang
  const orderIndex = new Map<string, number>()
  items.forEach((item, idx) => {
    const kode = item.kode.trim().toUpperCase()
    orderIndex.set(`${kode}|${item.nama.trim().toLowerCase()}`, idx)
  })
  const all = await db.query.mataPelajaran.findMany({
    where: eq(mataPelajaran.sekolahId, sekolahId),
  })
  const sorted = all
    .slice()
    .sort((a, b) => {
      const ka = `${(a.kodeMapel || "").toUpperCase()}|${a.namaMapel.toLowerCase()}`
      const kb = `${(b.kodeMapel || "").toUpperCase()}|${b.namaMapel.toLowerCase()}`
      const ia = orderIndex.get(ka) ?? orderIndex.get(`|${a.namaMapel.toLowerCase()}`) ?? 999
      const ib = orderIndex.get(kb) ?? orderIndex.get(`|${b.namaMapel.toLowerCase()}`) ?? 999
      if (ia !== ib) return ia - ib
      return (a.urutan ?? 0) - (b.urutan ?? 0)
    })
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].urutan !== i + 1) {
      await db.update(mataPelajaran).set({ urutan: i + 1 }).where(eq(mataPelajaran.id, sorted[i].id))
    }
  }

  return { added, updated, total: sorted.length }
}
