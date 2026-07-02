import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { tagihanSpp } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"

const tagihanCreateSchema = z.object({
  id: z.string().optional(),
  siswaId: z.string(),
  noTagihan: z.string().nullable().optional(),
  bulan: z.number(),
  tahun: z.number(),
  jumlah: z.number(),
  statusPembayaran: z.enum(["pending", "lunas", "tertunggak"]).optional(),
  tanggalBayar: z.date().nullable().optional(),
})

const tagihanUpdateSchema = z.object({
  statusPembayaran: z.enum(["pending", "lunas", "tertunggak"]).optional(),
  tanggalBayar: z.date().nullable().optional(),
  jumlah: z.number().optional(),
})

export const keuanganRouter = router({
  getBySiswa: protectedProcedure
    .input(
      z.object({
        siswaId: z.string(),
        tahun: z.number().optional(),
        sortBy: z.enum(["bulan", "tahun"]).optional().default("tahun"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }),
    )
    .query(async ({ input }) => {
      const conditions = [eq(tagihanSpp.siswaId, input.siswaId)]
      if (input.tahun) conditions.push(eq(tagihanSpp.tahun, input.tahun))
      const orderBy = input.sortOrder === "asc" ? asc(tagihanSpp[input.sortBy]) : desc(tagihanSpp[input.sortBy])
      const data = await db
        .select()
        .from(tagihanSpp)
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset)
      return data
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(tagihanCreateSchema)
    .mutation(async ({ input }) => {
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(tagihanSpp)
        .values({ ...input, id } as any)
        .returning()
      return result[0]
    }),

  update: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({ id: z.string(), data: tagihanUpdateSchema }))
    .mutation(async ({ input }) => {
      const existing = await db.query.tagihanSpp.findFirst({
        where: eq(tagihanSpp.id, input.id),
      })
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Tagihan tidak ditemukan" })
      const result = await db
        .update(tagihanSpp)
        .set(input.data as any)
        .where(eq(tagihanSpp.id, input.id))
        .returning()
      return result[0]
    }),
})
