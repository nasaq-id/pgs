# Regression Checklist — Performance (Fase 7)

Checklist wajib sebelum deploy perubahan besar. Jalankan per item; semua harus lulus.

## Otomatis (CI — `.github/workflows/ci.yml`)

- [ ] `pnpm exec tsc --noEmit` — tanpa error
- [ ] `pnpm lint` — tanpa error
- [ ] `pnpm build` — sukses
- [ ] `pnpm check:bundle` — bundle dalam budget (script `scripts/check-bundle-budget.mjs`)

## Smoke Test E2E (`pnpm test:e2e`)

- [ ] Login berhasil + session tersimpan
- [ ] Login gagal menampilkan error
- [ ] Dashboard dapat diakses
- [ ] Absensi dapat diakses
- [ ] Manajemen Siswa dapat diakses
- [ ] Service worker tidak meng-cache API (`sw-cache.spec.ts`)

## Manual — Route Utama (authenticated)

### Dashboard `/`

- [ ] Stats (Manajemen Siswa, Ringkasan, Perlu Perhatian) tampil tanpa JS (block JS chunk di devtools → konten tetap ada)
- [ ] Kalender interaktif: navigasi bulan prev/next & tombol "Hari Ini" berfungsi
- [ ] Tooltip event kalender menampilkan deskripsi
- [ ] Pengumuman list tampil bila ada data
- [ ] Super admin tanpa impersonate di-redirect ke `/super-admin`

### Absensi `/absensi`

- [ ] Tabel siswa/guru tampil, filter kelas & search berfungsi
- [ ] Rekap presensi (`/absensi/rekap`) drill-down status berfungsi
- [ ] Export Excel/PDF tetap jalan

### Manajemen Siswa `/manajemen/siswa`

- [ ] Pagination (limit 25/50/100) & search berfungsi
- [ ] Foto siswa tampil (Cloudinary transform w_96)
- [ ] Detail dialog & mutasi dialog terbuka (lazy load)

### Keuangan `/keuangan`

- [ ] Chart (recharts) tampil
- [ ] Tagihan list & filter berfungsi

## Cache & Network

- [ ] `/sw.js` response header `no-cache, no-store`
- [ ] API response tidak masuk Cache Storage (e2e sw-cache pass)
- [ ] Log `[api:query:...] SLOW` tidak muncul untuk request normal (>=500ms patut diselidiki)

## Baseline perbandingan

Bandingkan dengan tabel "Baseline & Progress" di `docs/PERFORMANCE_ROADMAP.md`:

| Route | LCP | Payload | Catatan |
|---|---|---|---|
| `/` | < 4500 ms | < 550 KB | LCP dashboard masih dipengaruhi TTFB server fetch |
| `/absensi` | < 2500 ms | < 200 KB | |
| `/manajemen/siswa` | < 3500 ms | < 150 KB | |
| `/keuangan` | < 2000 ms | < 150 KB | |

Angka di atas = baseline saat ini + toleransi; regresi di atasnya harus dievaluasi (bukan otomatis ditolak, tapi harus ada penjelasan).
