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
    max: 3, // Batasi koneksi per pool: pooler Supabase cuma izinkan ~15 session total (3 instance serverless x 3 = 9)
    idleTimeoutMillis: 10000, // Tutup koneksi idle setelah 10 detik
    connectionTimeoutMillis: 5000, // Timeout cepat jika koneksi gagal
  })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool, { schema })
