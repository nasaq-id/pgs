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
    max: 2, // Pooler Supabase ~15 session: 2 koneksi x 7 instance = 14, sisa ruang 1
    idleTimeoutMillis: 8000, // Tutup koneksi idle cepat biar session pooler kembali
    connectionTimeoutMillis: 8000, // Beri waktu antre saat pooler penuh
  })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

// Cegah proses crash saat koneksi idle di-drop pooler
pool.on("error", (err) => {
  console.error("[db] pool error:", err.message)
})

export const db = drizzle(pool, { schema })
