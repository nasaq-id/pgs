import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, asc } from "drizzle-orm"
import { db } from "@/server/db"
import { pengaturanJadwal, timelineItem } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { getSekolahIdFilter } from "@/server/api/tenant"

export const pengaturanJadwalRouter = router({
  get: protectedProcedure
    .input(z.object({ sekolahId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const result = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      return result ?? null
    }),

  upsert: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      id: z.string().optional(),
      durasiJP: z.number().min(15).max(120),
      jamMulai: z.string(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const existing = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      if (existing) {
        const wasChanged = existing.durasiJP !== input.durasiJP || existing.jamMulai !== input.jamMulai
        const result = await db
          .update(pengaturanJadwal)
          .set({ durasiJP: input.durasiJP, jamMulai: input.jamMulai })
          .where(eq(pengaturanJadwal.id, existing.id))
          .returning()
        if (wasChanged) {
          await recalculateJpTimes(existing.id)
        }
        return result[0]
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(pengaturanJadwal)
        .values({ id, sekolahId, durasiJP: input.durasiJP, jamMulai: input.jamMulai })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_jadwal", entityId: result[0]?.id, metadata: {} })
      return result[0]
    }),

  getTimeline: protectedProcedure
    .input(z.object({ hari: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) return []
      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      if (!pengaturan) return []
      const conditions = [eq(timelineItem.pengaturanJadwalId, pengaturan.id)]
      if (input.hari) conditions.push(eq(timelineItem.hari, input.hari as any))
      const result = await db
        .select()
        .from(timelineItem)
        .where(and(...conditions))
        .orderBy(asc(timelineItem.urutan))
      return result
    }),

  upsertTimeline: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      id: z.string().optional(),
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      tipe: z.enum(["jp", "pembiasaan", "upacara", "istirahat", "sholat", "lainnya"]),
      label: z.string().optional(),
      jamMulai: z.string(),
      jamSelesai: z.string(),
      urutan: z.number(),
      warna: z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })
      if (input.id) {
        const result = await db
          .update(timelineItem)
          .set({
            hari: input.hari,
            tipe: input.tipe,
            label: input.label,
            jamMulai: input.jamMulai,
            jamSelesai: input.jamSelesai,
            urutan: input.urutan,
            warna: input.warna,
          })
          .where(and(eq(timelineItem.id, input.id), eq(timelineItem.sekolahId, sekolahId)))
          .returning()
        if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Item timeline tidak ditemukan" })
        await logAudit(ctx, { action: "update", entity: "timeline_item", entityId: input.id, metadata: {} })
        return result[0]
      }
      const id = crypto.randomUUID()
      const result = await db
        .insert(timelineItem)
        .values({
          id,
          sekolahId,
          pengaturanJadwalId: pengaturan.id,
          hari: input.hari,
          tipe: input.tipe,
          label: input.label,
          jamMulai: input.jamMulai,
          jamSelesai: input.jamSelesai,
          urutan: input.urutan,
          warna: input.warna,
        })
        .returning()
      await logAudit(ctx, { action: "create", entity: "timeline_item", entityId: result[0]?.id, metadata: {} })
      return result[0]
    }),

  deleteTimeline: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const [deleted] = await db.delete(timelineItem).where(and(eq(timelineItem.id, input.id), eq(timelineItem.sekolahId, sekolahId))).returning()
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Item timeline tidak ditemukan" })

      // Re-sequence remaining items for the same day
      const remaining = await db
        .select()
        .from(timelineItem)
        .where(and(
          eq(timelineItem.pengaturanJadwalId, deleted.pengaturanJadwalId),
          eq(timelineItem.hari, deleted.hari),
        ))
        .orderBy(asc(timelineItem.urutan))

      for (let i = 0; i < remaining.length; i++) {
        const item = remaining[i]
        const newUrutan = i + 1
        if (item.urutan !== newUrutan) {
          await db
            .update(timelineItem)
            .set({ urutan: newUrutan })
            .where(eq(timelineItem.id, item.id))
        }
      }

      await recalculateJpTimes(deleted.pengaturanJadwalId)
      await logAudit(ctx, { action: "delete", entity: "timeline_item", entityId: input.id })
      return { success: true }
    }),

  applyTemplateToDays: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      sourceHari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      targetHari: z.array(z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const pengaturan = await db.query.pengaturanJadwal.findFirst({
        where: eq(pengaturanJadwal.sekolahId, sekolahId),
      })
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })

      const sourceItems = await db
        .select()
        .from(timelineItem)
        .where(and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.sourceHari as any),
        ))
        .orderBy(asc(timelineItem.urutan))

      for (const target of input.targetHari) {
        if (target === input.sourceHari) continue
        await db.delete(timelineItem).where(and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, target as any),
        ))
        for (const item of sourceItems) {
          await db.insert(timelineItem).values({
            id: crypto.randomUUID(),
            sekolahId,
            pengaturanJadwalId: pengaturan.id,
            hari: target,
            tipe: item.tipe,
            label: item.label,
            jamMulai: item.jamMulai,
            jamSelesai: item.jamSelesai,
            urutan: item.urutan,
            warna: item.warna,
          })
        }
      }

      await logAudit(ctx, { action: "apply_template", entity: "timeline_item", entityId: input.sourceHari, metadata: { targetHari: input.targetHari } })
      return { success: true }
    }),
})

async function recalculateJpTimes(pengaturanJadwalId: string) {
  const pengaturan = await db.query.pengaturanJadwal.findFirst({
    where: eq(pengaturanJadwal.id, pengaturanJadwalId),
  })
  if (!pengaturan) return

  const durasi = pengaturan.durasiJP ?? 40
  const [startH, startM] = (pengaturan.jamMulai ?? "07:00").split(":").map(Number)
  const startMinutes = startH * 60 + startM

  const existingItems = await db
    .select()
    .from(timelineItem)
    .where(and(
      eq(timelineItem.pengaturanJadwalId, pengaturanJadwalId),
      eq(timelineItem.tipe, "jp"),
    ))
    .orderBy(asc(timelineItem.hari), asc(timelineItem.urutan))

  const byHari = new Map<string, typeof existingItems>()
  for (const item of existingItems) {
    const arr = byHari.get(item.hari) || []
    arr.push(item)
    byHari.set(item.hari, arr)
  }

  for (const [, items] of byHari) {
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      const jpStartMin = startMinutes + idx * durasi
      const jpEndMin = jpStartMin + durasi

      const jamMulai = `${String(Math.floor(jpStartMin / 60)).padStart(2, "0")}:${String(jpStartMin % 60).padStart(2, "0")}`
      const jamSelesai = `${String(Math.floor(jpEndMin / 60)).padStart(2, "0")}:${String(jpEndMin % 60).padStart(2, "0")}`

      await db
        .update(timelineItem)
        .set({ jamMulai, jamSelesai })
        .where(eq(timelineItem.id, item.id))
    }
  }
}
