import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and } from "drizzle-orm"
import { db } from "@/server/db"
import { pengaturanJadwal, agendaKhusus } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"

export const pengaturanJadwalRouter = router({
  get: protectedProcedure
    .input(z.object({ sekolahId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const result = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      return result
    }),

  upsert: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      id: z.string().optional(),
      durasiJP: z.number().min(15).max(120),
      hariAktif: z.string(),
      jamMulai: z.string(),
      jamPulang: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const existing = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      if (existing) {
        const result = await db
          .update(pengaturanJadwal)
          .set({ durasiJP: input.durasiJP, hariAktif: input.hariAktif, jamMulai: input.jamMulai, jamPulang: input.jamPulang })
          .where(eq(pengaturanJadwal.id, existing.id))
          .returning()
        return result[0]
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(pengaturanJadwal)
        .values({ id, sekolahId, durasiJP: input.durasiJP, hariAktif: input.hariAktif, jamMulai: input.jamMulai, jamPulang: input.jamPulang })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_jadwal", entityId: result[0]?.id, metadata: {} })
      return result[0]
    }),

  getAgenda: protectedProcedure
    .input(z.object({ hari: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) return []
      const conditions = [eq(agendaKhusus.sekolahId, sekolahId)]
      if (input.hari) conditions.push(eq(agendaKhusus.hari, input.hari as any))
      const result = await db
        .select()
        .from(agendaKhusus)
        .where(and(...conditions))
        .orderBy(agendaKhusus.urutan)
      return result
    }),

  upsertAgenda: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      id: z.string().optional(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      nama: z.string().min(1),
      icon: z.string().optional(),
      jamMulai: z.string(),
      jamSelesai: z.string(),
      urutan: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      if (input.id) {
        const result = await db
          .update(agendaKhusus)
          .set({ hari: input.hari, nama: input.nama, icon: input.icon || "clock", jamMulai: input.jamMulai, jamSelesai: input.jamSelesai, urutan: input.urutan })
          .where(eq(agendaKhusus.id, input.id))
          .returning()
        return result[0]
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(agendaKhusus)
        .values({ id, sekolahId, hari: input.hari, nama: input.nama, icon: input.icon || "clock", jamMulai: input.jamMulai, jamSelesai: input.jamSelesai, urutan: input.urutan })
        .returning()
      await logAudit(ctx, { action: "create", entity: "agenda_khusus", entityId: result[0]?.id, metadata: {} })
      return result[0]
    }),

  deleteAgenda: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.delete(agendaKhusus).where(eq(agendaKhusus.id, input.id))
      await logAudit(ctx, { action: "delete", entity: "agenda_khusus", entityId: input.id })
      return { success: true }
    }),
})
