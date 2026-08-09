import { Redis } from "@upstash/redis"

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

if (!url || !token) {
  console.warn(
    "[Redis] Warning: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing from environment variables."
  )
}

export const redis = new Redis({
  url: url || "https://placeholder-url.upstash.io",
  token: token || "placeholder-token",
})
