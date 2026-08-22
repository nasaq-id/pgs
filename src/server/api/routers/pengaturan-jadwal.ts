import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, asc, gt, sql, inArray } from "drizzle-orm"
import { db } from "@/server/db"
import { pengaturanJadwal, timelineItem } from "@/server/db/schema"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "@/server/api/trpc"
import { logAudit } from "@/server/audit"
import { requireSekolahId } from "@/server/api/tenant"
import { cacheKey, getOrSetCache, invalidateCache } from "@/lib/cache"

async function getPengaturanJadwal(sekolahId: string) {
  const allSettings = await db.query.pengaturanJadwal.findMany({
    where: eq(pengaturanJadwal.sekolahId, sekolahId),
    orderBy: [asc(pengaturanJadwal.createdAt)],
  })

  if (allSettings.length === 0) {
    const id = crypto.randomUUID()
    const inserted = await db
      .insert(pengaturanJadwal)
      .values({
        id,
        sekolahId,
        durasiJP: 40,
        jamMulai: "07:00",
        teacherExceptionsJson: {},
      })
      .returning()
    return inserted[0]!
  }

  const primary = allSettings[0]!

  if (allSettings.length > 1) {
    const duplicateIds = allSettings.slice(1).map((s) => s.id)
    await db
      .update(timelineItem)
      .set({ pengaturanJadwalId: primary.id })
      .where(inArray(timelineItem.pengaturanJadwalId, duplicateIds))
    await db
      .delete(pengaturanJadwal)
      .where(inArray(pengaturanJadwal.id, duplicateIds))
  }

  return primary
}

export const pengaturanJadwalRouter = router({
  get: protectedProcedure
    .input(z.object({ sekolahId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      return getOrSetCache(cacheKey("pengaturanJadwal:get", sekolahId), async () => {
        return getPengaturanJadwal(sekolahId)
      }, 300)
    }),

  upsert: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      id: z.string().optional(),
      durasiJP: z.number().min(15).max(120),
      jamMulai: z.string(),
      teacherExceptionsJson: z.any().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const existing = await getPengaturanJadwal(sekolahId)
      if (existing) {
        const wasChanged = existing.durasiJP !== input.durasiJP || existing.jamMulai !== input.jamMulai
        const result = await db
          .update(pengaturanJadwal)
          .set({
            durasiJP: input.durasiJP,
            jamMulai: input.jamMulai,
            teacherExceptionsJson: input.teacherExceptionsJson ?? existing.teacherExceptionsJson
          })
          .where(eq(pengaturanJadwal.id, existing.id))
          .returning()
        if (wasChanged) {
          await recalculateJpTimes(existing.id)
        }
        await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
        return result[0]
      }
      const id = input.id || crypto.randomUUID()
      const result = await db
        .insert(pengaturanJadwal)
        .values({
          id,
          sekolahId,
          durasiJP: input.durasiJP,
          jamMulai: input.jamMulai,
          teacherExceptionsJson: input.teacherExceptionsJson ?? {}
        })
        .returning()
      await logAudit(ctx, { action: "create", entity: "pengaturan_jadwal", entityId: result[0]?.id, metadata: {} })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return result[0]
    }),

  /**
   * Tandai jadwal sebagai baru terbit / diperbarui (set lastPublishedAt = now).
   * Dipanggil dari tombol "Kirim Pemberitahuan / Kirim Pembaruan" di halaman
   * jadwal — meniru perilaku prototipe akademik. Role dibatasi sama dengan
   * router notifikasi.create (hanya admin yang boleh publish + kirim notif).
   */
  publish: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const existing = await getPengaturanJadwal(sekolahId)
      if (existing) {
        const result = await db
          .update(pengaturanJadwal)
          .set({ lastPublishedAt: new Date(), version: sql`${pengaturanJadwal.version} + 1` })
          .where(eq(pengaturanJadwal.id, existing.id))
          .returning()
        await logAudit(ctx, { action: "publish", entity: "pengaturan_jadwal", entityId: existing.id, metadata: {} })
        await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
        return result[0]
      }
      const id = crypto.randomUUID()
      const result = await db
        .insert(pengaturanJadwal)
        .values({
          id,
          sekolahId,
          lastPublishedAt: new Date(),
          version: 2,
        })
        .returning()
      await logAudit(ctx, { action: "publish", entity: "pengaturan_jadwal", entityId: id, metadata: {} })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return result[0]
    }),

  getTimeline: protectedProcedure
    .input(z.object({ hari: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) return []

      const runQuery = async () => {
        const pengaturan = await getPengaturanJadwal(sekolahId)
        if (!pengaturan) return []
        const conditions = [eq(timelineItem.pengaturanJadwalId, pengaturan.id)]
        if (input.hari) conditions.push(eq(timelineItem.hari, input.hari as any))
        return db
          .select()
          .from(timelineItem)
          .where(and(...conditions))
          .orderBy(asc(timelineItem.urutan))
      }

      if (!input.hari) {
        return getOrSetCache(cacheKey("pengaturanJadwal:getTimeline", sekolahId), runQuery, 300)
      }
      return runQuery()
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
      const pengaturan = await getPengaturanJadwal(sekolahId)
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
        await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
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
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return result[0]
    }),

  addJpItem: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const pengaturan = await getPengaturanJadwal(sekolahId)

      const existingItems = await db
        .select()
        .from(timelineItem)
        .where(and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.hari as any),
        ))
        .orderBy(asc(timelineItem.urutan))

      const durasi = pengaturan.durasiJP ?? 40
      const startMinutes = timeToMinutes(pengaturan.jamMulai ?? "07:00")

      let nextStartMinutes = startMinutes
      if (existingItems.length > 0) {
        const lastItem = existingItems[existingItems.length - 1]
        nextStartMinutes = timeToMinutes(lastItem.jamSelesai)
      }

      const nextEndMinutes = nextStartMinutes + durasi
      const newUrutan = existingItems.length + 1
      const id = crypto.randomUUID()

      const [inserted] = await db
        .insert(timelineItem)
        .values({
          id,
          sekolahId,
          pengaturanJadwalId: pengaturan.id,
          hari: input.hari,
          tipe: "jp",
          label: null,
          jamMulai: minutesToTime(nextStartMinutes),
          jamSelesai: minutesToTime(nextEndMinutes),
          urutan: newUrutan,
        })
        .returning()

      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return inserted
    }),

  insertActivityItem: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(sanitized(z.object({
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      tipe: z.enum(["jp", "pembiasaan", "upacara", "istirahat", "sholat", "lainnya"]),
      label: z.string().optional(),
      jamMulai: z.string(),
      jamSelesai: z.string(),
      insertAfterUrutan: z.number().nullable().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const pengaturan = await getPengaturanJadwal(sekolahId)

      const existingItems = await db
        .select()
        .from(timelineItem)
        .where(and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.hari as any),
        ))
        .orderBy(asc(timelineItem.urutan))

      let targetUrutan = existingItems.length + 1
      if (input.insertAfterUrutan !== null && input.insertAfterUrutan !== undefined) {
        targetUrutan = input.insertAfterUrutan + 1
        await db.update(timelineItem)
          .set({ urutan: sql`${timelineItem.urutan} + 1` })
          .where(and(
            eq(timelineItem.pengaturanJadwalId, pengaturan.id),
            eq(timelineItem.hari, input.hari as any),
            sql`${timelineItem.urutan} >= ${targetUrutan}`,
          ))
      }

      const id = crypto.randomUUID()
      const [inserted] = await db
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
          urutan: targetUrutan,
        })
        .returning()

      await recalculateJpTimes(pengaturan.id)
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return inserted
    }),

  deleteTimeline: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const [deleted] = await db.delete(timelineItem).where(and(eq(timelineItem.id, input.id), eq(timelineItem.sekolahId, sekolahId))).returning()
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Item timeline tidak ditemukan" })

      // Re-sequence urutan dalam 1 statement SQL (geser -1 untuk semua item setelah yang dihapus)
      await db.update(timelineItem)
        .set({ urutan: sql`${timelineItem.urutan} - 1` })
        .where(and(
          eq(timelineItem.pengaturanJadwalId, deleted.pengaturanJadwalId),
          eq(timelineItem.hari, deleted.hari),
          gt(timelineItem.urutan, deleted.urutan),
        ))

      await recalculateJpTimes(deleted.pengaturanJadwalId)
      await logAudit(ctx, { action: "delete", entity: "timeline_item", entityId: input.id })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return { success: true }
    }),

  /**
   * Hapus seluruh item timeline dalam satu hari (opsional filter tipe).
   * Menggantikan pola delete-per-item yang lambat (O(n) round-trip + O(n²) update).
   */
  clearTimelineDay: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      hari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      tipe: z.enum(["jp", "pembiasaan", "upacara", "istirahat", "sholat", "lainnya"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const pengaturan = await getPengaturanJadwal(sekolahId)
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })

      const conditions = [
        eq(timelineItem.pengaturanJadwalId, pengaturan.id),
        eq(timelineItem.hari, input.hari as any),
      ]
      if (input.tipe) conditions.push(eq(timelineItem.tipe, input.tipe))

      const deleted = await db.delete(timelineItem).where(and(...conditions)).returning({ id: timelineItem.id })

      const sisaJp = await db.query.timelineItem.findFirst({
        where: and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.hari as any),
          eq(timelineItem.tipe, "jp"),
        ),
        columns: { id: true },
      })
      if (sisaJp) await recalculateJpTimes(pengaturan.id)

      await logAudit(ctx, { action: "clear_timeline_day", entity: "timeline_item", metadata: { hari: input.hari, tipe: input.tipe ?? null, count: deleted.length } })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return { success: true, count: deleted.length }
    }),

  /**
   * Hapus SELURUH timeline item (semua hari) milik pengaturan sekolah.
   * Hard delete — 1 statement SQL, tanpa re-sequence (data kosong total).
   */
  clearAllTimeline: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({}))
    .mutation(async ({ ctx }) => {
      const sekolahId = requireSekolahId(ctx)
      const pengaturan = await getPengaturanJadwal(sekolahId)
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })

      const deleted = await db.delete(timelineItem).where(eq(timelineItem.pengaturanJadwalId, pengaturan.id)).returning({ id: timelineItem.id })

      await logAudit(ctx, { action: "clear_all_timeline", entity: "timeline_item", metadata: { count: deleted.length } })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return { success: true, count: deleted.length }
    }),

  /**
   * Hapus timeline item untuk beberapa hari sekaligus (multi-day).
   * Hard delete — 1 statement SQL (IN clause), tanpa re-sequence per item.
   */
  clearTimelineDays: roleProtectedProcedure(["super_admin", "admin_sekolah", "tu"])
    .input(z.object({
      hari: z.array(z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]).optional()),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = requireSekolahId(ctx)
      const pengaturan = await getPengaturanJadwal(sekolahId)
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })

      const hari = (input.hari ?? []).filter((h): h is "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu" => Boolean(h))
      if (hari.length === 0) {
        return { success: true, count: 0 }
      }

      const deleted = await db.delete(timelineItem).where(and(
        eq(timelineItem.pengaturanJadwalId, pengaturan.id),
        inArray(timelineItem.hari, hari),
      )).returning({ id: timelineItem.id })

      await logAudit(ctx, { action: "clear_timeline_days", entity: "timeline_item", metadata: { hari, count: deleted.length } })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
      return { success: true, count: deleted.length }
    }),

  applyTemplateToDays: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({
      sourceHari: z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"]),
      targetHari: z.array(z.enum(["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"])),
    }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "BAD_REQUEST", message: "Sekolah ID required" })
      const pengaturan = await getPengaturanJadwal(sekolahId)
      if (!pengaturan) throw new TRPCError({ code: "NOT_FOUND", message: "Pengaturan jadwal belum dibuat" })

      const sourceItems = await db
        .select()
        .from(timelineItem)
        .where(and(
          eq(timelineItem.pengaturanJadwalId, pengaturan.id),
          eq(timelineItem.hari, input.sourceHari as any),
        ))
        .orderBy(asc(timelineItem.urutan))

      const validTargets = input.targetHari.filter((t) => t !== input.sourceHari)
      if (validTargets.length === 0 || sourceItems.length === 0) {
        return { success: true }
      }

      await db.delete(timelineItem).where(and(
        eq(timelineItem.pengaturanJadwalId, pengaturan.id),
        inArray(timelineItem.hari, validTargets as any),
      ))

      const newRows = []
      for (const target of validTargets) {
        for (const item of sourceItems) {
          newRows.push({
            id: crypto.randomUUID(),
            sekolahId,
            pengaturanJadwalId: pengaturan.id,
            hari: target as any,
            tipe: item.tipe,
            label: item.label,
            jamMulai: item.jamMulai,
            jamSelesai: item.jamSelesai,
            urutan: item.urutan,
            warna: item.warna,
          })
        }
      }

      if (newRows.length > 0) {
        await db.insert(timelineItem).values(newRows)
      }

      await logAudit(ctx, { action: "apply_template", entity: "timeline_item", entityId: input.sourceHari, metadata: { targetHari: input.targetHari } })
      await invalidateCache([cacheKey("pengaturanJadwal:get", sekolahId), cacheKey("pengaturanJadwal:getTimeline", sekolahId)])
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

  // Recac semua jam JP dalam 1 statement SQL memakai window function row_number
  // per hari (urutan berdasarkan `urutan`). Menghindari N round-trip per JP.
  const hourStart = Math.floor(startMinutes / 60)
  const minStart = startMinutes % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  const base = `${pad(hourStart)}:${pad(minStart)}`

  await db.execute(sql`
    UPDATE timeline_item t
    SET
      jam_mulai = to_char(
        (${base}::time + ((rn - 1) * ${durasi}) * interval '1 minute')::time,
        'HH24:MI'
      ),
      jam_selesai = to_char(
        (${base}::time + (rn * ${durasi}) * interval '1 minute')::time,
        'HH24:MI'
      )
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY hari ORDER BY urutan) AS rn
      FROM timeline_item
      WHERE pengaturan_jadwal_id = ${pengaturanJadwalId} AND tipe = 'jp'
    ) jp
    WHERE t.id = jp.id
  `)
}

function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(h)}:${pad(m)}`
}
