import { NextResponse } from "next/server"
import crypto from "crypto"
import { verifyPaymentByWebhook } from "@/server/finance-jobs"
import { checkRateLimit } from "@/server/rate-limit"
import { logAudit } from "@/server/audit"
import { db } from "@/server/db"
import { payment } from "@/server/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

/**
 * Webhook pembayaran (payment gateway) untuk auto-verify pembayaran.
 *
 * Payload JSON yang diharapkan:
 *   { paymentId, amount, receiptNumber?, signature }
 * dengan signature = HMAC-SHA256(
 *   `${paymentId}:${amount}:${receiptNumber || ""}`,
 *   PAYMENT_WEBHOOK_SECRET
 * )
 */
export async function POST(req: Request) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Webhook belum dikonfigurasi" }, { status: 500 })
  }

  // Rate limit per IP: 60 permintaan / menit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const allowed = await checkRateLimit(`webhook:${ip}`, 60, 60 * 1000)
  if (!allowed) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body tidak valid" }, { status: 400 })
  }

  const { paymentId, amount, receiptNumber, signature } = body || {}
  if (!paymentId || typeof amount !== "number" || !signature) {
    return NextResponse.json({ error: "Payload tidak lengkap" }, { status: 400 })
  }

  // Verifikasi signature (timing-safe)
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}:${amount}:${receiptNumber || ""}`)
    .digest("hex")
  const provided = Buffer.from(String(signature))
  const expectedBuf = Buffer.from(expected)
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 401 })
  }

  const result = await verifyPaymentByWebhook(paymentId, {
    verifiedBy: "system:webhook",
    receiptNumber: typeof receiptNumber === "string" ? receiptNumber : undefined,
    amount,
  })

  if (!result.ok) {
    const status = result.error === "NOT_FOUND" ? 404 : 409
    return NextResponse.json({ error: result.error }, { status })
  }

  // Audit trail
  try {
    const pay = await db.query.payment.findFirst({ where: eq(payment.id, paymentId) })
    if (pay) {
      await logAudit(
        { session: { user: { id: "system:webhook", sekolahId: pay.sekolahId } } },
        { action: "verify_payment", entity: "payment", entityId: paymentId, metadata: { source: "webhook", amount } }
      )
    }
  } catch (e) {
    console.error("[payment/webhook] audit gagal:", e)
  }

  return NextResponse.json({ ok: true })
}
