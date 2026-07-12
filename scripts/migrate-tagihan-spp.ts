import { db } from "../src/server/db"
import { tagihanSpp, billingType, invoice, siswa } from "../src/server/db/schema"
import { eq } from "drizzle-orm"

const STATUS_MAP: Record<string, string> = {
  pending: "issued",
  lunas: "paid",
  tertunggak: "overdue",
}

async function main() {
  console.log("Starting migration: tagihan_spp → invoice")

  // 1. Ensure billingType "SPP" exists
  let sppBillingType = await db.select().from(billingType).where(eq(billingType.name, "SPP")).limit(1)
  let sppId: string
  let sppSekolahId: string | undefined
  if (sppBillingType[0]) {
    sppId = sppBillingType[0].id
    sppSekolahId = sppBillingType[0].sekolahId
    console.log(`Found existing SPP billing type: ${sppId}`)
  } else {
    // Get sekolahId from first siswa record
    const firstSiswa = await db.query.siswa.findFirst()
    sppSekolahId = firstSiswa?.sekolahId
    if (!sppSekolahId) {
      console.error("No siswa found to determine sekolahId")
      return
    }
    sppId = crypto.randomUUID()
    await db.insert(billingType).values({
      id: sppId,
      sekolahId: sppSekolahId,
      name: "SPP",
      category: "recurring",
      isMandatory: true,
      isActive: true,
    })
    console.log(`Created SPP billing type: ${sppId}`)
  }

  // 2. Fetch all existing tagihan_spp
  const existing = await db.select().from(tagihanSpp)
  console.log(`Found ${existing.length} existing tagihan_spp records`)

  if (existing.length === 0) {
    console.log("No records to migrate.")
    return
  }

  // 3. Find active academic year
  const activeTA = await db.query.tahunAjaran.findFirst({
    where: (ta: any, { eq }: any) => eq(ta.active, true),
  })
  const academicYearId = activeTA?.id || ""
  if (!academicYearId) console.warn("WARNING: No active academic year found. Using empty string.")

  let migrated = 0
  let skipped = 0

  for (const rec of existing) {
    const newStatus = STATUS_MAP[rec.statusPembayaran] || "issued"
    const totalAmount = rec.jumlah

    // Check if already migrated (avoid duplicates)
    const existingInvoice = await db
      .select()
      .from(invoice)
      .where(eq(invoice.studentId, rec.siswaId))
      .limit(1)

    if (existingInvoice[0]) {
      skipped++
      continue
    }

    // Get sekolahId from the student's record
    const recSiswa = await db.query.siswa.findFirst({
      where: eq(siswa.id, rec.siswaId),
    })
    const recSekolahId = recSiswa?.sekolahId || sppSekolahId || "unknown"

    const invId = crypto.randomUUID()
    await db.insert(invoice).values({
      id: invId,
      sekolahId: recSekolahId,
      studentId: rec.siswaId,
      billingTypeId: sppId,
      academicYearId,
      periodMonth: rec.bulan,
      periodYear: rec.tahun,
      amount: String(rec.jumlah) as any,
      discountAmount: "0",
      lateFeeAmount: "0",
      totalAmount: String(totalAmount) as any,
      paidAmount: newStatus === "paid" ? String(rec.jumlah) as any : "0",
      dueDate: new Date(rec.tahun, rec.bulan - 1, 10),
      status: newStatus as any,
      generatedBy: "migration",
      createdAt: rec.tanggalBayar || new Date(),
      updatedAt: new Date(),
    })

    // Write status history for migrated records
    const { invoiceStatusHistory } = await import("../src/server/db/schema")
    await db.insert(invoiceStatusHistory).values({
      id: crypto.randomUUID(),
      sekolahId: recSekolahId,
      invoiceId: invId,
      fromStatus: null,
      toStatus: newStatus as any,
      changedBy: "migration",
      note: `Migrated from tagihan_spp (previous status: ${rec.statusPembayaran})`,
    })

    migrated++
  }

  console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
  })
