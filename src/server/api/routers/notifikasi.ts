import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc, inArray } from "drizzle-orm"
import { router, protectedProcedure, roleProtectedProcedure, sanitized } from "../trpc"
import { db } from "@/server/db"
import { notifikasi, pushSubscriptions, users } from "@/server/db/schema"
import { logAudit } from "@/server/audit"
import webpush from "web-push"

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@edumanage.com",
    vapidPublicKey,
    vapidPrivateKey
  )
}

export const notifikasiRouter = router({
  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(5) }))
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const data = await db
        .select()
        .from(notifikasi)
        .where(eq(notifikasi.sekolahId, sekolahId))
        .orderBy(desc(notifikasi.createdAt))
        .limit(input.limit)

      return data
    }),

  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
        offset: z.number().optional().default(0),
        unreadOnly: z.boolean().optional().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const conditions = [eq(notifikasi.sekolahId, sekolahId)]
      if (input.unreadOnly) conditions.push(eq(notifikasi.dibaca, false))

      const data = await db
        .select()
        .from(notifikasi)
        .where(and(...conditions))
        .orderBy(desc(notifikasi.createdAt))
        .limit(input.limit)
        .offset(input.offset)

      const total = await db
        .select({ count: notifikasi.id })
        .from(notifikasi)
        .where(and(...conditions))

      return { data, total: total.length }
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

    const result = await db
      .select({ count: notifikasi.id })
      .from(notifikasi)
      .where(and(eq(notifikasi.sekolahId, sekolahId), eq(notifikasi.dibaca, false)))

    return { count: result.length }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const [updated] = await db.update(notifikasi).set({ dibaca: true }).where(eq(notifikasi.id, input.id)).returning()
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Notifikasi tidak ditemukan" })
      return { success: true }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const sekolahId = ctx.session.user.sekolahId
    if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

    await db.update(notifikasi).set({ dibaca: true }).where(eq(notifikasi.sekolahId, sekolahId))
    return { success: true }
  }),

  savePushSubscription: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().min(1),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const existing = await db.query.pushSubscriptions.findFirst({
        where: eq(pushSubscriptions.endpoint, input.endpoint),
      })

      if (existing) {
        // Data identik — tidak perlu tulis DB (anti-spam: client buggy yang
        // spam savePushSubscription tidak menghasilkan query UPDATE).
        if (
          existing.userId === ctx.session.user.id &&
          existing.p256dh === input.keys.p256dh &&
          existing.auth === input.keys.auth
        ) {
          return { success: true }
        }

        await db
          .update(pushSubscriptions)
          .set({
            userId: ctx.session.user.id,
            sekolahId,
            p256dh: input.keys.p256dh,
            auth: input.keys.auth,
          })
          .where(eq(pushSubscriptions.endpoint, input.endpoint))
      } else {
        await db.insert(pushSubscriptions).values({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          sekolahId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        })
      }

      return { success: true }
    }),

  create: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(
      sanitized(z.object({
        judul: z.string().min(1),
        pesan: z.string().min(1),
        tipe: z.enum(["info", "success", "warning", "error"]).optional().default("info"),
        link: z.string().optional(),
        targetRoles: z.array(
          z.enum(["super_admin", "admin_sekolah", "guru", "siswa", "tu", "yayasan"])
        ).optional(),
      })),
    )
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })

      const [created] = await db
        .insert(notifikasi)
        .values({
          id: crypto.randomUUID(),
          sekolahId,
          judul: input.judul,
          pesan: input.pesan,
          tipe: input.tipe,
          link: input.link,
        })
        .returning()

      // Fetch target subscriptions
      let subs: any[] = []
      if (input.targetRoles && input.targetRoles.length > 0) {
        subs = await db
          .select({
            id: pushSubscriptions.id,
            endpoint: pushSubscriptions.endpoint,
            p256dh: pushSubscriptions.p256dh,
            auth: pushSubscriptions.auth,
          })
          .from(pushSubscriptions)
          .innerJoin(users, eq(pushSubscriptions.userId, users.id))
          .where(
            and(
              eq(pushSubscriptions.sekolahId, sekolahId),
              inArray(users.role, input.targetRoles),
            ),
          )
      } else {
        subs = await db
          .select({
            id: pushSubscriptions.id,
            endpoint: pushSubscriptions.endpoint,
            p256dh: pushSubscriptions.p256dh,
            auth: pushSubscriptions.auth,
          })
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.sekolahId, sekolahId))
      }

      if (subs.length > 0 && vapidPublicKey && vapidPrivateKey) {
        const pushPayload = JSON.stringify({
          title: input.judul,
          body: input.pesan,
          icon: "/icon-192.svg",
          data: {
            url: input.link || "/notifikasi",
          },
        })

        // Broadcast to push service endpoints asynchronously
        Promise.allSettled(
          subs.map(async (sub) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                  },
                },
                pushPayload,
              )
            } catch (err: any) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription is stale, remove it from the DB
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id))
              }
            }
          }),
        ).catch((err) => console.error("Push broadcasting failed:", err))
      }

      await logAudit(ctx, { action: "create", entity: "notifikasi", entityId: created.id, metadata: { judul: input.judul } })
      return created
    }),

  remove: roleProtectedProcedure(["super_admin", "admin_sekolah"])
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const sekolahId = ctx.session.user.sekolahId
      if (!sekolahId) throw new TRPCError({ code: "NOT_FOUND", message: "Sekolah tidak ditemukan" })
      const [deleted] = await db.delete(notifikasi).where(eq(notifikasi.id, input.id)).returning()
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Notifikasi tidak ditemukan" })

      await logAudit(ctx, { action: "delete", entity: "notifikasi", entityId: input.id })
      return { success: true }
    }),
})
