import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

// Guardrail Fase 7: budget bundle per route (dipakai di CI setelah `pnpm build`).
//
// Next.js App Router tidak mengekspos manifest "initial chunks" yang mudah
// dibaca, jadi pendekatannya:
//  1. Chunk tunggal terbesar harus < MAX_ANY_CHUNK_KB (dependency berat harus
//     route chunk, bukan shared).
//  2. Total JS di .next/static/chunks dibatasi (semua route digabung) —
//     regresi dependency baru akan menaikkan angka ini.
//
// Budget diambil dari baseline F1-F6 + toleransi:
//  - Chunk terbesar saat ini: jspdf 409KB, xlsx 402KB (route chunk, valid)
//  - Total chunks: ~5.9MB (termasuk semua route + lazy libs)

const CHUNKS_DIR = join(process.cwd(), ".next", "static", "chunks")

// Chunk tunggal non-route (shared/bundle umum) tidak boleh sebesar ini.
// jspdf/xlsx/recharts boleh > ini KARENA route chunk (lazy) — validasi di bawah.
const MAX_ANY_CHUNK_KB = 450

// Total semua JS chunks — regresi dependency akan melampaui ini.
const MAX_TOTAL_KB = 7000

function main() {
  if (!exists(CHUNKS_DIR)) {
    console.error("❌ .next/static/chunks tidak ditemukan — jalankan `pnpm build` dulu")
    process.exit(1)
  }

  const files = readdirSync(CHUNKS_DIR).filter((f) => f.endsWith(".js"))
  const sizes = files.map((f) => ({ name: f, kb: statSync(join(CHUNKS_DIR, f)).size / 1024 }))

  // Turbopack menamai chunk dengan hash (bukan nama lib) — deteksi isi chunk
  // untuk verifikasi bahwa chunk besar adalah route-lib yang dikenal.
  const knownRouteLibs = ["jspdf", "xlsx", "html5-qrcode", "recharts", "jszip", "qrcode"]
  const contentOf = (name) => {
    try {
      return readFileSync(join(CHUNKS_DIR, name), "utf8")
    } catch {
      return ""
    }
  }
  const detectLibs = (name) => {
    const c = contentOf(name)
    return knownRouteLibs.filter((lib) => c.includes(lib))
  }
  const totalKB = sizes.reduce((s, x) => s + x.kb, 0)
  sizes.sort((a, b) => b.kb - a.kb)

  const top5 = sizes.slice(0, 5)
  console.log(`Total JS: ${totalKB.toFixed(0)} KB (${files.length} chunks)`)
  console.log("Chunk terbesar:")
  for (const c of top5) console.log(`  ${c.kb.toFixed(0)} KB ${c.name}`)

  const errors = []

  if (totalKB > MAX_TOTAL_KB) {
    errors.push(
      `Total JS ${totalKB.toFixed(0)} KB melebihi budget ${MAX_TOTAL_KB} KB — dependency baru menambah bundle`
    )
  }

  // Chunk > MAX harus terbukti berisi route-lib yang dikenal (lazy chunk valid).
  // Chunk besar tanpa lib dikenal = library baru masuk shared/initial bundle.
  for (const c of sizes) {
    if (c.kb > MAX_ANY_CHUNK_KB) {
      const libs = detectLibs(c.name)
      if (libs.length === 0) {
        errors.push(
          `Chunk ${c.name} = ${c.kb.toFixed(0)} KB tanpa route-lib dikenal — cek apakah lazy/dynamic`
        )
      } else {
        console.log(`  (verified route-lib: ${libs.join(", ")})`)
      }
    }
  }

  if (errors.length > 0) {
    console.error("\n❌ BUNDLE BUDGET GAGAL:")
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }

  console.log("\n✅ Bundle dalam budget (guardrail Fase 7 OK)")
}

function exists(p) {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}

main()
