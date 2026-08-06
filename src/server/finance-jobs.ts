import { db } from "@/server/db"
import {
  reminder,
  invoice,
  invoiceStatusHistory,
  lateFeeRule,
  payment,
  notifikasi,
} from "@/server/db/schema"
import { eq, and, lt } from "drizzle-orm"

/**
 * Shared finance jobs, dipanggil dari cron route (/api/cron/finance) dan
 * payment webhook (/api/payment/webhook). Semua function idempotent-safe
 * dan tidak membutuhkan user session.
 */

// ─── B3: AUTO-OVERDUE ─────────────────────────────────────────

/**
 * Cari invoice berstatus `issued` yang sudah lewat dueDate + grace period
 * (sesuai lateFeeRule per billing type), set status `overdue`, hitung denda,
 * dan buat reminder tagihan.
 */
export async function autoOverdueInvoices() {
  const rules = await db.query.lateFeeRule.findMany({
    where: eq(lateFeeRule.isActive, true),
  })
  const now = new Date()
  const processed: string[] = []

  for (const rule of rules) {
    const graceMs = (rule.gracePeriodDays ?? 0) * 86400000
    const cutoff = new Date(now.getTime() - graceMs)

    const candidates = await db.query.invoice.findMany({
      where: and(
        eq(invoice.billingTypeId, rule.billingTypeId),
        eq(invoice.status, "issued"),
        lt(invoice.dueDate, cutoff),
      ),
    })

    for (const inv of candidates) {
      const base = Number(inv.amount) - Number(inv.discountAmount)
      const daysLate = Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000))
      const feeValue = Number(rule.value)

      let lateFee = 0
      if (rule.feeType === "fixed") lateFee = feeValue
      else if (rule.feeType === "percent") lateFee = (base * feeValue) / 100
      else if (rule.feeType === "per_day") lateFee = ((base * feeValue) / 100) * daysLate
      lateFee = Math.round(lateFee * 100) / 100
      const total = Math.round((base + lateFee) * 100) / 100

      await db
        .update(invoice)
        .set({
          status: "overdue",
          lateFeeAmount: String(lateFee),
          totalAmount: String(total),
          updatedAt: now,
        })
        .where(eq(invoice.id, inv.id))

      await db.insert(invoiceStatusHistory).values({
        id: crypto.randomUUID(),
        sekolahId: inv.sekolahId,
        invoiceId: inv.id,
        fromStatus: inv.status,
        toStatus: "overdue",
        changedBy: "system:cron",
        note: `Denda ${lateFee} (${rule.feeType}, ${daysLate} hari terlambat)`,
      })

      await enqueueReminders(inv.id, inv.sekolahId)
      processed.push(inv.id)
    }
  }

  return { count: processed.length, invoices: processed }
}

// ─── REMINDER QUEUE ───────────────────────────────────────────

function hasChannelConfig(channel: "whatsapp" | "email"): boolean {
  if (channel === "whatsapp") return Boolean(process.env.WHATSAPP_API_URL)
  return Boolean(process.env.SMTP_HOST)
}

async function enqueueReminders(invoiceId: string, sekolahId: string) {
  const channels: Array<"whatsapp" | "email" | "in_app"> = ["in_app"]
  if (hasChannelConfig("whatsapp")) channels.push("whatsapp")
  if (hasChannelConfig("email")) channels.push("email")

  for (const channel of channels) {
    await db.insert(reminder).values({
      id: crypto.randomUUID(),
      sekolahId,
      invoiceId,
      channel,
      status: "queued",
    })
  }
}

// ─── B1: PROCESS REMINDERS ────────────────────────────────────

/**
 * Proses antrian reminder `queued`: channel in_app dikirim sebagai
 * notifikasi; whatsapp/email butuh konfigurasi provider eksternal —
 * tanpa konfigurasi, reminder ditandai `failed` dengan pesan jelas.
 */
export async function processReminders(limit = 50) {
  const queued = await db.query.reminder.findMany({
    where: eq(reminder.status, "queued"),
    limit,
  })

  let sent = 0
  let failed = 0

  for (const r of queued) {
    if (r.channel === "in_app") {
      await db.insert(notifikasi).values({
        id: crypto.randomUUID(),
        sekolahId: r.sekolahId,
        judul: "Pengingat Tagihan",
        pesan: "Terdapat tagihan yang belum dibayar dan sudah jatuh tempo. Mohon segera dilunasi.",
        tipe: "warning",
        link: "/keuangan/tagihan",
      })
      await db
        .update(reminder)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(reminder.id, r.id))
      sent++
    } else {
      await db
        .update(reminder)
        .set({ status: "failed", errorMsg: `Channel ${r.channel} belum dikonfigurasi` })
        .where(eq(reminder.id, r.id))
      failed++
    }
  }

  return { sent, failed }
}

// ─── SHARED: INVOICE STATUS AFTER PAYMENT ─────────────────────

export async function updateInvoiceStatusForPayment(
  invoiceId: string,
  changedBy: string,
  note?: string
) {
  const inv = await db.query.invoice.findFirst({ where: eq(invoice.id, invoiceId) })
  if (!inv) return

  const paidAmount = Number(inv.paidAmount)
  const totalAmount = Number(inv.totalAmount)
  let newStatus: string
  if (paidAmount >= totalAmount) newStatus = "paid"
  else if (paidAmount > 0) newStatus = "partially_paid"
  else newStatus = "issued"

  await db
    .update(invoice)
    .set({ status: newStatus as any, updatedAt: new Date() })
    .where(eq(invoice.id, invoiceId))

  await db.insert(invoiceStatusHistory).values({
    id: crypto.randomUUID(),
    sekolahId: inv.sekolahId,
    invoiceId,
    fromStatus: inv.status,
    toStatus: newStatus as any,
    changedBy,
    note: note ?? `Payment updated: paidAmount=${paidAmount}`,
  })
}

// ─── B2: VERIFY PAYMENT (untuk webhook) ───────────────────────

export async function verifyPaymentByWebhook(
  paymentId: string,
  meta: { verifiedBy: string; receiptNumber?: string; amount?: number }
): Promise<{ ok: boolean; error?: string }> {
  const pay = await db.query.payment.findFirst({ where: eq(payment.id, paymentId) })
  if (!pay) return { ok: false, error: "NOT_FOUND" }
  if (pay.status !== "pending_verification") return { ok: false, error: "ALREADY_PROCESSED" }
  if (meta.amount !== undefined && Number(pay.amount) !== meta.amount) {
    return { ok: false, error: "AMOUNT_MISMATCH" }
  }

  await db
    .update(payment)
    .set({
      status: "verified",
      verifiedBy: meta.verifiedBy,
      verifiedAt: new Date(),
      receiptNumber: meta.receiptNumber || pay.receiptNumber,
    })
    .where(eq(payment.id, paymentId))

  const inv = await db.query.invoice.findFirst({ where: eq(invoice.id, pay.invoiceId) })
  if (inv) {
    const newPaidAmount = Math.round((Number(inv.paidAmount) + Number(pay.amount)) * 100) / 100
    await db
      .update(invoice)
      .set({ paidAmount: String(newPaidAmount), updatedAt: new Date() })
      .where(eq(invoice.id, pay.invoiceId))
    await updateInvoiceStatusForPayment(pay.invoiceId, meta.verifiedBy, "Auto-verified via webhook")
  }

  return { ok: true }
}
