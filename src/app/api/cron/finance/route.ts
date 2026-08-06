import { NextResponse } from "next/server"
import { autoOverdueInvoices, processReminders } from "@/server/finance-jobs"
import { cleanupRateLimitBuckets } from "@/server/rate-limit"

export const dynamic = "force-dynamic"

/**
 * Cron finance (Vercel Cron / external scheduler):
 * - B3: auto-overdue invoice yang lewat dueDate + grace period
 * - B1: proses antrian reminder tagihan
 * - E2: bersihkan bucket rate limiter yang kedaluwarsa
 *
 * Dipanggil dengan header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get("authorization")

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const overdue = await autoOverdueInvoices()
    const reminders = await processReminders()
    await cleanupRateLimitBuckets()
    return NextResponse.json({ ok: true, overdue, reminders })
  } catch (e) {
    console.error("[cron/finance] gagal:", e)
    return NextResponse.json({ ok: false, error: (e as Error)?.message || "Gagal" }, { status: 500 })
  }
}
