import { Pool } from "pg"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
})

async function explain(label: string, sql: string) {
  console.log(`\n=== ${label} ===`)
  try {
    const start = Date.now()
    const res = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`)
    console.log(`(${Date.now() - start}ms)\n` + res.rows.map((r) => r["QUERY PLAN"]).join("\n"))
  } catch (e: any) {
    console.log("ERROR:", e.message)
  }
}

async function main() {
  const sekolah = await pool.query(`SELECT id FROM sekolah LIMIT 1`)
  const sid = sekolah.rows[0]?.id
  if (!sid) {
    console.log("Tidak ada sekolah di DB")
    return
  }
  console.log(`Sekolah: ${sid}`)

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const startMonth = now.toISOString().slice(0, 7) + "-01"
  const tahun = now.getFullYear()
  const taStart = `${tahun}-01-01`
  const taEnd = `${tahun}-12-31`

  // ── Dashboard ──
  await explain("dashboard: siswa summary", `
    SELECT count(*) AS count, count(*) FILTER (WHERE created_at >= '${startMonth}') AS new_this_month
    FROM siswa WHERE status = 'aktif' AND sekolah_id = '${sid}'`)

  await explain("dashboard: staff summary", `
    SELECT count(*) AS count, count(*) FILTER (WHERE created_at >= '${startMonth}') AS new_this_month
    FROM guru WHERE active = true AND sekolah_id = '${sid}'`)

  await explain("dashboard: kelas summary (TA aktif)", `
    SELECT count(*) AS count, count(DISTINCT tingkat) AS distinct_tingkat
    FROM kelas WHERE tahun_ajaran_id = (SELECT id FROM tahun_ajaran WHERE sekolah_id = '${sid}' AND active = true LIMIT 1)
      AND sekolah_id = '${sid}'`)

  await explain("dashboard: pending payment", `
    SELECT count(*) FROM invoice WHERE status = 'issued' AND sekolah_id = '${sid}'`)

  await explain("dashboard: attendance rate hari ini", `
    SELECT count(*) AS count, count(*) FILTER (WHERE status = 'hadir') AS hadir
    FROM absensi_siswa WHERE tanggal >= '${today} 00:00:00' AND tanggal < '${today} 23:59:59' AND sekolah_id = '${sid}'`)

  await explain("dashboard: outstanding receivables", `
    SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total FROM invoice WHERE status != 'cancelled' AND sekolah_id = '${sid}'`)

  await explain("dashboard: top poin positif/negatif", `
    SELECT poin_sikap.siswa_id, SUM(poin_sikap.poin) AS total
    FROM poin_sikap INNER JOIN poin_kategori ON poin_sikap.kategori_id = poin_kategori.id
    WHERE poin_kategori.jenis = 'positif' AND poin_sikap.sekolah_id = '${sid}'
    GROUP BY poin_sikap.siswa_id ORDER BY SUM(poin_sikap.poin) DESC LIMIT 5`)

  await explain("dashboard: kalender event bulan ini", `
    SELECT * FROM kalender_event
    WHERE sekolah_id = '${sid}' AND tanggal_mulai >= '${taStart}' AND tanggal_mulai <= '${taEnd}'
    ORDER BY tanggal_mulai ASC LIMIT 60`)

  // ── Absensi rekap ──
  await explain("absensi rekap siswa (semua siswa + kelas)", `
    SELECT s.id, s.nama_lengkap, s.nisn, s.nis_lokal, s.kelas_id, k.nama_kelas
    FROM siswa s LEFT JOIN kelas k ON k.id = s.kelas_id
    WHERE s.sekolah_id = '${sid}'
    ORDER BY s.nama_lengkap ASC`)

  await explain("absensi rekap: attendance logs siswa", `
    SELECT * FROM absensi_siswa
    WHERE sekolah_id = '${sid}' AND tanggal >= '2025-01-01' AND tanggal <= '2026-12-31'
    ORDER BY tanggal DESC`)

  await explain("absensi rekap guru (proyeksi)", `
    SELECT id, nama_lengkap, nipnuptk FROM guru WHERE sekolah_id = '${sid}' ORDER BY nama_lengkap ASC`)

  // ── Siswa list + stats ──
  await explain("siswa getAll (pagination 50)", `
    SELECT * FROM siswa WHERE sekolah_id = '${sid}' ORDER BY nama_lengkap ASC LIMIT 50 OFFSET 0`)

  await explain("siswa getStats (status count)", `
    SELECT status, count(*) FROM siswa WHERE sekolah_id = '${sid}' GROUP BY status`)

  await explain("siswa getLookup (search LIKE)", `
    SELECT id, sekolah_id, kelas_id, nisn, nis_lokal, nama_lengkap, jenis_kelamin, status
    FROM siswa WHERE sekolah_id = '${sid}' AND (nama_lengkap ILIKE '%a%' OR nisn ILIKE '%a%')
    ORDER BY nama_lengkap ASC LIMIT 50`)

  // ── Poin ──
  await explain("poin monitoring (siswa berpoin)", `
    SELECT siswa_id, sekolah_id, SUM(poin) AS total_poin
    FROM poin_sikap WHERE sekolah_id = '${sid}'
    GROUP BY siswa_id, sekolah_id`)

  // ── Invoice ──
  await explain("invoice billing list", `
    SELECT * FROM invoice WHERE sekolah_id = '${sid}'
    ORDER BY created_at DESC LIMIT 50`)

  await explain("finance report (status grouping)", `
    SELECT status, count(*), COALESCE(SUM(total),0) AS total, COALESCE(SUM(paid),0) AS paid
    FROM invoice WHERE sekolah_id = '${sid}'
    GROUP BY status`)

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
