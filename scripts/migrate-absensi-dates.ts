import { db } from "../src/server/db"
import { absensiSiswa, absensiGuru } from "../src/server/db/schema"
import { eq } from "drizzle-orm"

function getSchoolDayDate(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric"
  })
  const parts = formatter.formatToParts(date)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970', 10)
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10)
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

async function runMigration() {
  console.log("Starting attendance date migration...")

  try {
    // 1. Migrate absensiSiswa
    console.log("Fetching absensi_siswa records...")
    const siswaRecords = await db.select().from(absensiSiswa)
    let siswaUpdatedCount = 0

    console.log(`Processing ${siswaRecords.length} student records...`)
    for (const record of siswaRecords) {
      if (!record.tanggal) continue
      
      const originalTime = record.tanggal.getTime()
      const normalizedDate = getSchoolDayDate(record.tanggal)
      const normalizedTime = normalizedDate.getTime()

      if (record.id === "d94a8c49-6651-4751-80c5-0d2f50567049") {
        console.log(`TARGET RECORD: originalTime=${originalTime} (${record.tanggal.toISOString()}) vs normalizedTime=${normalizedTime} (${normalizedDate.toISOString()})`)
      }

      if (originalTime !== normalizedTime) {
        console.log(`Mismatch found for student record ${record.id}: original=${record.tanggal.toISOString()} vs normalized=${normalizedDate.toISOString()}`)
        await db
          .update(absensiSiswa)
          .set({ tanggal: normalizedDate })
          .where(eq(absensiSiswa.id, record.id))
        siswaUpdatedCount++
      }
    }
    console.log(`Migrated student records: ${siswaUpdatedCount} / ${siswaRecords.length}`)

    // 2. Migrate absensiGuru
    console.log("Fetching absensi_guru records...")
    const guruRecords = await db.select().from(absensiGuru)
    let guruUpdatedCount = 0

    console.log(`Processing ${guruRecords.length} teacher records...`)
    for (const record of guruRecords) {
      if (!record.tanggal) continue

      const originalTime = record.tanggal.getTime()
      const normalizedDate = getSchoolDayDate(record.tanggal)
      const normalizedTime = normalizedDate.getTime()

      if (originalTime !== normalizedTime) {
        await db
          .update(absensiGuru)
          .set({ tanggal: normalizedDate })
          .where(eq(absensiGuru.id, record.id))
        guruUpdatedCount++
      }
    }
    console.log(`Migrated teacher records: ${guruUpdatedCount} / ${guruRecords.length}`)

    console.log("Migration completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  }
}

runMigration()
