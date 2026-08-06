import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { db } from "@/server/db"
import { pengaturanKalender } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { DEFAULT_KALDIK, isValidMmDd, resolveSemesterYear, suggestSemesterDates } from "@/server/kaldik"

const mmDdSchema = z.string().regex(/^\d{2}-\d{2}$/, "Format harus MM-DD")

const HARI_LIBUR_ENUM = z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])

function parseHariLiburMingguan(raw: string | null | undefined): string[] {
  if (!raw) return ["sabtu", "minggu"]
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : ["sabtu", "minggu"]
  } catch {
    return ["sabtu", "minggu"]
  }
}

export const pengaturanKalenderRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
    const result = await db.query.pengaturanKalender.findFirst({
      where: eq(pengaturanKalender.sekolahId, sekolahId),
    })
    if (!result) return null
    return {
      ...result,
      hariLiburMingguan: parseHariLiburMingguan(result.hariLiburMingguan),
      hariLiburMingguanGuru: parseHariLiburMingguan(result.hariLiburMingguanGuru),
    }
  }),

  upsert: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      id: z.string().optional(),
      tanggalMulaiGanjil: mmDdSchema,
      tanggalSelesaiGanjil: mmDdSchema,
      tanggalMulaiGenap: mmDdSchema,
      tanggalSelesaiGenap: mmDdSchema,
      selaraskanSenin: z.boolean(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      for (const [key, value] of Object.entries(input) as [string, unknown][]) {
        if (typeof value === "string" && !isValidMmDd(value)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Tanggal default tidak valid: ${key}` })
        }
      }

      const existing = await db.query.pengaturanKalender.findFirst({
        where: eq(pengaturanKalender.sekolahId, sekolahId),
      })
      if (existing) {
        const result = await db
          .update(pengaturanKalender)
          .set({
            tanggalMulaiGanjil: input.tanggalMulaiGanjil,
            tanggalSelesaiGanjil: input.tanggalSelesaiGanjil,
            tanggalMulaiGenap: input.tanggalMulaiGenap,
            tanggalSelesaiGenap: input.tanggalSelesaiGenap,
            selaraskanSenin: input.selaraskanSenin,
            updatedAt: new Date(),
          })
          .where(eq(pengaturanKalender.id, existing.id))
          .returning()
        await logAudit(ctx, { action: "update", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: {} })
        return result[0]
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(pengaturanKalender)
        .values({
          id,
          sekolahId,
          tanggalMulaiGanjil: input.tanggalMulaiGanjil,
          tanggalSelesaiGanjil: input.tanggalSelesaiGanjil,
          tanggalMulaiGenap: input.tanggalMulaiGenap,
          tanggalSelesaiGenap: input.tanggalSelesaiGenap,
          selaraskanSenin: input.selaraskanSenin,
        })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: {} })
      return result[0]
    }),

  setHariLiburMingguan: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      hariLibur: z.array(HARI_LIBUR_ENUM).min(1, "Minimal 1 hari libur dipilih"),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      const serialized = JSON.stringify(input.hariLibur)

      const existing = await db.query.pengaturanKalender.findFirst({
        where: eq(pengaturanKalender.sekolahId, sekolahId),
      })

      if (existing) {
        const result = await db
          .update(pengaturanKalender)
          .set({ hariLiburMingguan: serialized, updatedAt: new Date() })
          .where(eq(pengaturanKalender.id, existing.id))
          .returning()
        await logAudit(ctx, { action: "update", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: { field: "hari_libur_mingguan" } })
        return result[0]
      }

      const result = await db
        .insert(pengaturanKalender)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          hariLiburMingguan: serialized,
        })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: { field: "hari_libur_mingguan" } })
      return result[0]
    }),

  setHariLiburMingguanGuru: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      hariLibur: z.array(HARI_LIBUR_ENUM).min(1, "Minimal 1 hari libur dipilih"),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })

      const serialized = JSON.stringify(input.hariLibur)

      const existing = await db.query.pengaturanKalender.findFirst({
        where: eq(pengaturanKalender.sekolahId, sekolahId),
      })

      if (existing) {
        const result = await db
          .update(pengaturanKalender)
          .set({ hariLiburMingguanGuru: serialized, updatedAt: new Date() })
          .where(eq(pengaturanKalender.id, existing.id))
          .returning()
        await logAudit(ctx, { action: "update", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: { field: "hari_libur_mingguan_guru" } })
        return result[0]
      }

      const result = await db
        .insert(pengaturanKalender)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          hariLiburMingguanGuru: serialized,
        })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_kalender", entityId: result[0]?.id, metadata: { field: "hari_libur_mingguan_guru" } })
      return result[0]
    }),

  suggestTahunAjaran: protectedProcedure
    .input(sanitized(z.object({
      namaTahunAjaran: z.string().optional(),
      semester: z.enum(["ganjil", "genap"]),
    })))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      const config = sekolahId
        ? await db.query.pengaturanKalender.findFirst({
            where: eq(pengaturanKalender.sekolahId, sekolahId),
          })
        : null
      const year = resolveSemesterYear(input.namaTahunAjaran ?? "", input.semester)
      return suggestSemesterDates(year, input.semester, config ?? DEFAULT_KALDIK)
    }),
})
