import { db } from "../src/server/db"
import { absensiHari, absensiSiswa, absensiGuru } from "../src/server/db/schema"
import { inArray } from "drizzle-orm"

/**
 * Backfill sekali jalan: isi absensi_hari dari record absensi yang sudah ada.
 * Aturan: hari dianggap operasional jika memiliki >= 1 record berstatus
 * hadir / terlambat / alpha (hari yang hanya berisi record izin/sakit dari
 * pengajuan izin otomatis TIDAK dihitung, karena itu bukan sesi absensi).
 */
async function backfill() {
  const statusOperasional: Array<"hadir" | "izin" | "sakit" | "alpha" | "terlambat"> = ["hadir", "terlambat", "alpha"]

  // --- Siswa: distinct (sekolah_id, kelas_id, tanggal) ---
  const siswaDays = await db
    .selectDistinct({ sekolahId: absensiSiswa.sekolahId, kelasId: absensiSiswa.kelasId, tanggal: absensiSiswa.tanggal })
    .from(absensiSiswa)
    .where(inArray(absensiSiswa.status, statusOperasional))

  let inserted = 0
  for (const d of siswaDays) {
    const res = await db
      .insert(absensiHari)
      .values({
        id: crypto.randomUUID(),
        sekolahId: d.sekolahId,
        jenis: "siswa",
        kelasId: d.kelasId,
        tanggal: d.tanggal,
      })
      .onConflictDoNothing()
      .returning()
    if (res.length > 0) inserted++
  }
  console.log(`Siswa: ${siswaDays.length} hari operasional ditemukan, ${inserted} dimasukkan ke absensi_hari`)

  // --- Guru: distinct (sekolah_id, tanggal) ---
  const guruDays = await db
    .selectDistinct({ sekolahId: absensiGuru.sekolahId, tanggal: absensiGuru.tanggal })
    .from(absensiGuru)
    .where(inArray(absensiGuru.status, statusOperasional))

  let insertedGuru = 0
  for (const d of guruDays) {
    const res = await db
      .insert(absensiHari)
      .values({
        id: crypto.randomUUID(),
        sekolahId: d.sekolahId,
        jenis: "guru",
        kelasId: null,
        tanggal: d.tanggal,
      })
      .onConflictDoNothing()
      .returning()
    if (res.length > 0) insertedGuru++
  }
  console.log(`Guru: ${guruDays.length} hari operasional ditemukan, ${insertedGuru} dimasukkan ke absensi_hari`)
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
