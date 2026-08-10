import { config as loadEnv } from "dotenv"

loadEnv({ path: ".env.local" })

const REST_URL = process.env.UPSTASH_REDIS_REST_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const E2E_EMAIL = process.env.E2E_TEST_EMAIL

async function delKey(key: string) {
  if (!REST_URL || !REST_TOKEN) return
  const encoded = encodeURIComponent(key)
  try {
    const res = await fetch(`${REST_URL}/del/${encoded}`, {
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
    })
    if (!res.ok) console.warn(`[global-setup] del ${key} -> ${res.status}`)
  } catch (error) {
    console.warn(`[global-setup] reset rate limit gagal untuk ${key}:`, error)
  }
}

export default async function globalSetup() {
  if (!E2E_EMAIL) {
    throw new Error("E2E_TEST_EMAIL must be set in .env.local")
  }

  await delKey(`ratelimit:login:${E2E_EMAIL}`)
  await delKey("ratelimit:auth:unknown")
  await delKey("ratelimit:trpc:unknown")
}
