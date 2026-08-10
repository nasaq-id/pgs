import puppeteer from "puppeteer-core"
import { startFlow } from "lighthouse"
import { config as loadEnv } from "dotenv"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

loadEnv({ path: ".env.local" })

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, "..", "performance", "lighthouse")
const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000"
const EMAIL = process.env.E2E_TEST_EMAIL
const PASSWORD = process.env.E2E_TEST_PASSWORD
const CHROME_PATH =
  process.env.CHROME_PATH ||
  join(process.env.HOME || "", ".cache/ms-playwright/chromium-1234/chrome-linux64/chrome")

const ROUTES = [
  { path: "/", name: "dashboard" },
  { path: "/absensi", name: "absensi" },
  { path: "/manajemen/siswa", name: "siswa" },
  { path: "/keuangan", name: "keuangan" },
]

if (!EMAIL || !PASSWORD) {
  console.error("E2E_TEST_EMAIL dan E2E_TEST_PASSWORD wajib diisi di .env.local")
  process.exit(1)
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[idx]
}

function parseLhr(lhr) {
  const audits = lhr.audits
  const network = audits["network-requests"]?.details?.items || []
  const apiRequests = network.filter((r) => r.url.includes("/api/"))
  const apiLatency = apiRequests
    .map((r) => r.networkEndTime - r.networkRequestTime)
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  const totalTransfer = network.reduce((s, r) => s + (r.transferSize || 0), 0)

  return {
    url: lhr.finalDisplayedUrl,
    fetchTime: lhr.fetchTime,
    scores: {
      performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      bestPractices: Math.round((lhr.categories["best-practices"]?.score ?? 0) * 100),
    },
    metrics: {
      lcpMs: audits["largest-contentful-paint"]?.numericValue ?? null,
      cls: audits["cumulative-layout-shift"]?.numericValue ?? null,
      tbtMs: audits["total-blocking-time"]?.numericValue ?? null,
      ttfbMs: audits["server-response-time"]?.numericValue ?? null,
      fcpMs: audits["first-contentful-paint"]?.numericValue ?? null,
    },
    requests: {
      total: network.length,
      api: apiRequests.length,
      transferBytes: totalTransfer,
    },
    apiLatency: {
      count: apiLatency.length,
      p50: percentile(apiLatency, 50),
      p95: percentile(apiLatency, 95),
    },
  }
}

async function main() {
  console.log(`Launch Chromium: ${CHROME_PATH}`)
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  })

  const page = await browser.newPage()
  try {
    console.log(`Login via ${BASE_URL}/login ...`)
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" })
    await page.type('input[name="email"]', EMAIL)
    await page.type('input[name="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 })
    console.log("Session OK\n")

    const flow = await startFlow(page, {
      name: "PGS Authenticated Audit",
      flags: { onlyCategories: ["performance", "best-practices"], logLevel: "error" },
    })

    for (const { path, name } of ROUTES) {
      console.log(`=== Flow navigate: ${name} (${path}) ===`)
      await flow.navigate(`${BASE_URL}${path}`, { name })
    }

    const flowResult = await flow.createFlowResult()
    mkdirSync(OUT_DIR, { recursive: true })
    writeFileSync(join(OUT_DIR, "flow-result.json"), JSON.stringify(flowResult, null, 2))

    const parsed = []
    for (let i = 0; i < flowResult.steps.length; i++) {
      const step = flowResult.steps[i]
      const lhr = step.lhr
      if (!lhr) {
        console.error(`  GAGAL: tidak ada lhr untuk step ${i} (${step.name})`)
        continue
      }
      const summary = parseLhr(lhr)
      parsed.push({ name: step.name, ...summary })
      writeFileSync(join(OUT_DIR, `${step.name}.json`), JSON.stringify(lhr, null, 2))
      console.log(
        `  perf=${summary.scores.performance} bp=${summary.scores.bestPractices} | ` +
          `LCP=${summary.metrics.lcpMs?.toFixed(0)}ms CLS=${summary.metrics.cls?.toFixed(3)} ` +
          `TBT=${summary.metrics.tbtMs?.toFixed(0)}ms TTFB=${summary.metrics.ttfbMs?.toFixed(0)}ms ` +
          `| req=${summary.requests.total} (api=${summary.requests.api}) ` +
          `payload=${(summary.requests.transferBytes / 1024).toFixed(0)}KB ` +
          `| apiLat p95=${summary.apiLatency.p95.toFixed(0)}ms`
      )
    }
    writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(parsed, null, 2))
    console.log(`\nRingkasan: performance/lighthouse/summary.json`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
