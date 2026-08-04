/**
 * One-off backfill: snap absensi `tanggal` to the canonical Jakarta-calendar
 * day stored as UTC-midnight (the format every /rekap query expects).
 *
 * Background: the manual-attendance create paths used to store the raw
 * `parseLocalDate("YYYY-MM-DD")` value. In a browser running Asia/Jakarta
 * (UTC+7) that is a UTC instant 7h *behind* the intended calendar day, so:
 *   - entries on the 1st of a month fell into the previous month's /rekap;
 *   - single-day lookups never found the manual entry, causing duplicates
 *     when the same day was saved again.
 * The create paths are now fixed (they call getSchoolDayDate), but rows
 * inserted before the fix still carry the offset. This script repairs them.
 *
 * Usage:
 *   npm run seed        # not this; see below
 *   node --import tsx scripts/normalize-absensi-tanggal.ts            # dry-run (read-only)
 *   node --import tsx scripts/normalize-absensi-tanggal.ts --apply    # write fixes
 *
 * A row is "needs snap" when `tanggal.getTime() !== getSchoolDayDate(tanggal).getTime()`.
 * The operation is idempotent: already-canonical rows are skipped.
 */
import { db } from "../src/server/db"
import { absensiSiswa, absensiGuru } from "../src/server/db/schema"
import { eq } from "drizzle-orm"
import { getSchoolDayDate } from "../src/server/datetime"

const APPLY = process.argv.includes("--apply")
const SAMPLE = 15

type Row = { id: string; tanggal: Date; [k: string]: unknown }

async function normalizeTable(
  label: string,
  table: typeof absensiSiswa | typeof absensiGuru,
) {
  console.log(`\n=== ${label} ===`)
  const rows = (await db.select().from(table)) as Row[]
  console.log(`Total rows: ${rows.length}`)

  const toFix: { id: string; from: Date; to: Date }[] = []
  for (const r of rows) {
    if (!(r.tanggal instanceof Date) || isNaN(r.tanggal.getTime())) continue
    const normalized = getSchoolDayDate(r.tanggal)
    if (normalized.getTime() !== r.tanggal.getTime()) {
      toFix.push({ id: r.id, from: r.tanggal, to: normalized })
    }
  }

  console.log(`Rows needing snap: ${toFix.length}`)
  if (toFix.length > 0) {
    console.log(`Sample (max ${SAMPLE}):`)
    for (const f of toFix.slice(0, SAMPLE)) {
      console.log(`  ${f.id}  ${f.from.toISOString()}  ->  ${f.to.toISOString()}`)
    }
  }

  if (!APPLY) {
    console.log(`[dry-run] No writes performed. Re-run with --apply to fix.`)
    return
  }

  if (toFix.length === 0) {
    console.log(`Nothing to apply.`)
    return
  }

  let updated = 0
  for (const f of toFix) {
    await db.update(table).set({ tanggal: f.to }).where(eq(table.id, f.id))
    updated++
    if (updated % 200 === 0) console.log(`  ...updated ${updated}/${toFix.length}`)
  }
  console.log(`Applied: ${updated} row(s) updated.`)
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (writes enabled)" : "DRY-RUN (read-only)"}`)
  await normalizeTable("absensi_siswa", absensiSiswa)
  await normalizeTable("absensi_guru", absensiGuru)
  console.log("\nDone.")
  process.exit(0)
}

main().catch((err) => {
  console.error("Backfill failed:", err)
  process.exit(1)
})
