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
import { ekstrakurikulerRouter } from "./routers/ekstrakurikuler"
import { prestasiRouter } from "./routers/prestasi"
import { ruangKelasRouter } from "./routers/ruang-kelas"
import { pengumumanRouter } from "./routers/pengumuman"
import { notifikasiRouter } from "./routers/notifikasi"
import { kalenderRouter } from "./routers/kalender"
import { pengaturanJadwalRouter } from "./routers/pengaturan-jadwal"
import { pengaturanKalenderRouter } from "./routers/pengaturan-kalender"
import { asesmenRouter } from "./routers/asesmen"
import { izinRouter } from "./routers/izin"
import { profilRouter } from "./routers/profil"
import { poinRouter } from "./routers/poin"
import { pengampuRouter } from "./routers/pengampu"
import { dashboardRouter } from "./routers/dashboard"
import { superAdminRouter } from "./routers/super-admin"
import { eMateriRouter } from "./routers/e-materi"

export const appRouter = router({
  eMateri: eMateriRouter,
  pengampu: pengampuRouter,
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
  ekstrakurikuler: ekstrakurikulerRouter,
  prestasi: prestasiRouter,
  ruangKelas: ruangKelasRouter,
  pengumuman: pengumumanRouter,
  notifikasi: notifikasiRouter,
  kalender: kalenderRouter,
  pengaturanJadwal: pengaturanJadwalRouter,
  pengaturanKalender: pengaturanKalenderRouter,
  asesmen: asesmenRouter,
  izin: izinRouter,
  profil: profilRouter,
  poin: poinRouter,
  dashboard: dashboardRouter,
  superAdmin: superAdminRouter,
})

export type AppRouter = typeof appRouter
export type AppRouterOutput = import("@trpc/server").inferRouterOutputs<AppRouter>
