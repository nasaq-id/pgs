/**
 * Benchmark solver jadwal (solveSchedule) DENGAN DATA SINTETIS.
 * Aman: semua baris yang dibuat berprefix "bench-" dan dihapus di akhir.
 * Tidak menyentuh data real sekolah.
 *
 * Jalankan: node --import tsx scripts/bench-jadwal.ts
 */
import { performance } from "node:perf_hooks"
import { randomUUID } from "node:crypto"
import { eq, and } from "drizzle-orm"
import { db } from "../src/server/db"
import { sekolah, pengaturanJadwal, timelineItem } from "../src/server/db/schema"
import { solveSchedule, type GenerateAllocation, type GenerateConstraint } from "../src/server/api/routers/jadwal"

const DAYS: ("senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu")[] = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]

function buildTimeline(pengaturanId: string, sekolahId: string, jpPerHari: number) {
  return DAYS.flatMap((hari, di) => {
    const items: (typeof timelineItem.$inferInsert)[] = []
    let urutan = 1
    // 1 pembiasaan + 2 istirahat diselingi biar mirip real
    items.push({ id: `bench-${randomUUID()}`, sekolahId, pengaturanJadwalId: pengaturanId, hari, tipe: "pembiasaan", label: "Pembiasaan", jamMulai: "06:45", jamSelesai: "07:00", urutan: urutan++ })
    for (let jp = 0; jp < jpPerHari; jp++) {
      const startH = 7 + Math.floor((jp * 40) / 60)
      const startM = (jp * 40) % 60
      const endH = 7 + Math.floor(((jp + 1) * 40) / 60)
      const endM = ((jp + 1) * 40) % 60
      items.push({
        id: `bench-${randomUUID()}`,
        sekolahId,
        pengaturanJadwalId: pengaturanId,
        hari,
        tipe: "jp",
        jamMulai: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
        jamSelesai: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        urutan: urutan++,
      })
      if (jp === 2 || jp === 6) {
        items.push({ id: `bench-${randomUUID()}`, sekolahId, pengaturanJadwalId: pengaturanId, hari, tipe: "istirahat", label: "Istirahat", jamMulai: "10:00", jamSelesai: "10:15", urutan: urutan++ })
      }
    }
    return items
  })
}

function buildAllocations(nKelas: number, nMapel: number, jpPerMapel: number) {
  const allocations: GenerateAllocation[] = []
  for (let k = 0; k < nKelas; k++) {
    for (let m = 0; m < nMapel; m++) {
      allocations.push({
        kelasId: `bench-kelas-${k}`,
        mataPelajaranId: `bench-mapel-${m}`,
        guruId: `bench-guru-${(m + k) % Math.max(1, Math.round(nMapel * 0.7))}`,
        jpCount: jpPerMapel,
      })
    }
  }
  return allocations
}

async function runScenario(nama: string, nKelas: number, nMapel: number, jpPerMapel: number, nGuruTerbatas: boolean) {
  const jpPerHari = 10
  const sekolahId = await db.query.sekolah.findFirst({ columns: { id: true } })
  if (!sekolahId) {
    console.error("Tidak ada sekolah di DB — butuh minimal 1 untuk FK. Hentikan.")
    process.exit(1)
  }

  const pengaturanId = `bench-${randomUUID()}`
  await db.insert(pengaturanJadwal).values({
    id: pengaturanId,
    sekolahId: sekolahId.id,
    durasiJP: 40,
    jamMulai: "07:00",
  })
  await db.insert(timelineItem).values(buildTimeline(pengaturanId, sekolahId.id, jpPerHari))

  const allocations = buildAllocations(nKelas, nMapel, jpPerMapel)
  const constraints: GenerateConstraint[] = nGuruTerbatas
    ? Array.from({ length: nKelas * 2 }, (_, i) => ({
        guruId: `bench-guru-${i % Math.max(1, Math.round(nMapel * 0.7))}`,
        hari: DAYS[i % 6],
        jpMulai: 1 + (i % 5),
        jpSelesai: 2 + (i % 6),
      }))
    : []

  const t0 = performance.now()
  const result = await solveSchedule({
    sekolahId: sekolahId.id,
    pengaturanJadwalId: pengaturanId,
    allocations,
    activeDays: DAYS,
    hariLibur: [],
    constraints,
    seedKey: `bench|${nama}`,
  })
  const dur = Math.round(performance.now() - t0)
  console.log(
    `${nama.padEnd(38)} ${String(dur).padStart(5)}ms  ${result.ok ? `OK  ${result.totalJp} JP / ${result.blocks.length} blok` : `GAGAL: ${(result.error || "").slice(0, 60)}`}`
  )

  // Cleanup — hanya baris bench-*
  await db
    .delete(timelineItem)
    .where(and(eq(timelineItem.pengaturanJadwalId, pengaturanId), eq(timelineItem.sekolahId, sekolahId.id)))
  await db.delete(pengaturanJadwal).where(eq(pengaturanJadwal.id, pengaturanId))
}

async function main() {
  console.log("=== BENCHMARK solveSchedule (data sintetis, aman) ===\n")
  console.log("SKENARIO 1: 10 rombel x 10 mapel (2 JP)")
  await runScenario("10 rombel x 10 mapel (2 JP)", 10, 10, 2, false)
  //
  console.log("SKENARIO 2: 20 rombel x 12 mapel (2 JP)")
  await runScenario("20 rombel x 12 mapel (2 JP)", 20, 12, 2, false)
  console.log("SKENARIO 3: 20 rombel x 12 mapel (2-3 JP)")
  await runScenario("20 rombel x 12 mapel (2-3 JP)", 20, 12, 3, false)
  console.log("SKENARIO 4: 30 rombel x 14 mapel (2-3 JP)")
  await runScenario("30 rombel x 14 mapel (2-3 JP)", 30, 14, 3, false)
  console.log("SKENARIO 5: 20 rombel x 12 mapel + jam guru padat")
  await runScenario("20 rombel x 12 mapel + jam guru padat", 20, 12, 2, true)
  console.log("SKENARIO 6: 30 rombel x 14 mapel + jam guru padat")
  await runScenario("30 rombel x 14 mapel + jam guru padat", 30, 14, 3, true)
  console.log("\nSelesai — data sintetis sudah dibersihkan.")
  process.exit(0)
}

main().catch((e) => {
  console.error("Benchmark error:", e.message)
  process.exit(1)
})
