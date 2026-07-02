import { router } from "./trpc"
import { siswaRouter } from "./routers/siswa"
import { guruRouter } from "./routers/guru"
import { kelasRouter } from "./routers/kelas"
import { mapelRouter } from "./routers/mapel"
import { jadwalRouter } from "./routers/jadwal"
import { lmsRouter } from "./routers/lms"
import { absensiRouter } from "./routers/absensi"
import { keuanganRouter } from "./routers/keuangan"
import { nilaiRouter } from "./routers/nilai"
import { lembagaRouter } from "./routers/lembaga"

export const appRouter = router({
  siswa: siswaRouter,
  guru: guruRouter,
  kelas: kelasRouter,
  mapel: mapelRouter,
  jadwal: jadwalRouter,
  lms: lmsRouter,
  absensi: absensiRouter,
  keuangan: keuanganRouter,
  nilai: nilaiRouter,
  lembaga: lembagaRouter,
})

export type AppRouter = typeof appRouter
