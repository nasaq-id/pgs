import { Pool } from "pg"
import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

// Fase 3: index tambahan hasil EXPLAIN ANALYZE.
// Idempotent (IF NOT EXISTS) dan mudah di-rollback (DROP INDEX).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2,
})

const statements = [
  // Sort pagination siswa.getAll/getLookup (ORDER BY nama_lengkap per sekolah)
  `CREATE INDEX IF NOT EXISTS siswa_sekolah_id_nama_lengkap_idx
   ON siswa (sekolah_id, nama_lengkap)`,

  // Sort pagination guru.getAll/getLookup
  `CREATE INDEX IF NOT EXISTS guru_sekolah_id_nama_lengkap_idx
   ON guru (sekolah_id, nama_lengkap)`,
]

async function main() {
  for (const sql of statements) {
    const label = sql.split("\n")[0].replace(/^CREATE INDEX IF NOT EXISTS\s+/, "")
    try {
      await pool.query(sql)
      console.log(`OK: ${label}`)
    } catch (e: any) {
      console.log(`ERROR: ${label}:`, e.message)
    }
  }
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
