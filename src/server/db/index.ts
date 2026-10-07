import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as {
  pool: Pool | undefined
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    // Dev: 1 instance, dashboard nembak 13 query sekaligus → butuh ruang lebih.
    // Prod (Vercel): 2 koneksi x N instance. DATABASE_URL menunjuk transaction
    // pooler Supabase (port 6543) — pgbouncer multiplex, TIDAK ada batas ~15
    // session seperti session pooler (5432). Karena itu koneksi ANAK boleh
    // ditahan tetap hangat.
    max: Number(process.env.DB_POOL_MAX ?? (process.env.NODE_ENV === "production" ? 2 : 10)),
    // idleTimeout SEMULA 8s → tiap jeda >8s semua koneksi ditutup, lalu query
    // berikutnya bayar ~6.5s re-establish ke pooler (ukuran nyata). Ini biang
    // log `[api:query:x] SLOW` multi-detik. Ditahan 60s agar koneksi tetap
    // hangat antar-navigasi; transaction pooler aman untuk ini.
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000, // Margin saat burst; koneksi hangat → jarang antre
  })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

// Cegah proses crash saat koneksi idle di-drop pooler
pool.on("error", (err) => {
  console.error("[db] pool error:", err.message)
})

export const db = drizzle(pool, { schema })
