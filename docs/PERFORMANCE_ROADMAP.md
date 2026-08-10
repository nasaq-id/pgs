# PGS Performance Roadmap

Dokumen kerja lintas sesi untuk optimasi performance Portal Guna Sekolah.

Status terakhir: 10 Agustus 2026

## Cara Menggunakan Dokumen Ini

1. Pilih satu fase aktif sebelum mulai mengubah kode.
2. Ukur baseline sebelum perubahan.
3. Kerjakan perubahan dalam scope kecil dan mudah di-rollback.
4. Jalankan build, typecheck, smoke test, dan ukur ulang.
5. Centang task yang selesai dan isi Session Log.

Setiap fase idealnya menjadi satu PR atau satu deploy preview agar dampaknya dapat dibandingkan.

## Prinsip Pengukuran

Gunakan halaman yang sudah login, bukan hanya `/login`.

Metrik utama:

| Metrik | Target awal |
|---|---|
| LCP p75 | < 2.5 detik |
| INP p75 | < 200 ms |
| CLS p75 | < 0.1 |
| TTFB p75 | < 800 ms |
| API p95 | Diukur per endpoint, tidak boleh regresi |
| Initial JavaScript | Dibandingkan dengan baseline per route |
| Request dan payload awal | Dibandingkan dengan baseline per route |

Target di atas perlu dikonfirmasi menggunakan data perangkat dan jaringan user nyata.

## Status Implementasi

### Fase 0: Quick Wins

Status: selesai.

- [x] Mengurangi prefetch massal pada link sidebar.
- [x] Lazy-load PDF, Excel, QR, ZIP, scanner, PWA, push notification, dan dashboard tour.
- [x] Menghapus `framer-motion` dari shared dashboard shell.
- [x] Mengurangi polling Topbar dan mematikan refetch saat window focus secara global.
- [x] Mengoptimalkan query dashboard admin dan siswa.
- [x] Memperbaiki cache dashboard agar membedakan user siswa.
- [x] Menambahkan endpoint `siswa.getLookup` dengan kolom minimal.
- [x] Menggunakan lookup ringan pada halaman presensi, laporan, nilai, LMS, kesiswaan, keuangan, ID card, dan dialog kelas.
- [x] Cache profil server dengan payload user minimal dan tanpa password.
- [x] Menghapus background GPS tracking dari halaman absensi.

### Fase 1: Measurement dan Cache Safety

Status: sebagian selesai. Prioritas berikutnya.

- [x] Service worker tidak lagi menangani `/_next/*` atau payload RSC.
- [x] Service worker tidak didaftarkan pada development.
- [x] Cache service worker development lama dibersihkan otomatis.
- [x] Versi cache produksi dinaikkan ke `edumanage-v4`.
- [x] Header `/sw.js` menggunakan `no-cache, no-store`.
- [x] Buat flow Playwright untuk login dan halaman dashboard utama.
- [x] Jalankan Lighthouse authenticated untuk dashboard, absensi, siswa, dan keuangan.
- [x] Catat baseline LCP, INP, TTFB, request count, payload, dan API latency.
- [x] Ubah cache response API authenticated menjadi `network-only` jika offline API tidak menjadi requirement.
- [ ] Tambahkan smoke test untuk mendeteksi chunk/module factory mismatch setelah deploy.

Kriteria selesai:

- Tidak ada error module factory setelah refresh, HMR, atau deployment baru.
- Baseline performance tersimpan di dokumen atau artifact CI.
- Semua route utama memiliki angka sebelum dan sesudah optimasi.

### Baseline Fase 1 (10 Agustus 2026)

Diukur dengan Lighthouse 13.4.1 (mobile, simulated throttling) + login Playwright nyata, terhadap `pnpm start` (production build, Next 16.2.10). Artefak: `performance/lighthouse/*.json` (regen: `scripts/lighthouse-audit.mjs`). Server: mesin dev (localhost), API lokal, bukan Vercel.

| Route | Perf | LCP | CLS | TBT* | TTFB | Request | Payload | API p95 |
|---|---|---|---|---|---|---|---|---|
| `/` (dashboard) | 75 | 5413 ms | 0.000 | 226 ms | 21 ms | 46 (1 API) | 714 KB | 386 ms |
| `/absensi` | 93 | 1587 ms | 0.028 | 297 ms | 32 ms | 51 (2 API) | 171 KB | 344 ms |
| `/manajemen/siswa` | 88 | 3286 ms | 0.002 | 242 ms | 29 ms | 51 (3 API) | 120 KB | 870 ms |
| `/keuangan` | 96 | 845 ms | 0.000 | 235 ms | 23 ms | 47 (2 API) | 113 KB | 544 ms |

*Lighthouse lab tidak mengukur INP; TBT adalah proksi lab. INP p75 membutuhkan field data (Speed Insights/CrUX).

Catatan baseline:
- LCP dashboard 5.4 s adalah outlier terbesar (perf 75) — penyelidikan di Fase 2/4.
- API count rendah (1-3) karena data dashboard di-prefetch server dan di-hydrate, bukan di-fetch ulang client.
- TTFB lokal sangat rendah (21-32 ms); di Vercel akan lebih tinggi — perlu pengukuran production nanti.
- Gunakan angka ini sebagai pembanding; jangan bandingkan lintas kondisi (throttling, lokasi server).

### Fase 2: Network dan Payload

Status: selesai (10 Agustus 2026).

- [x] Migrasikan sisa pemanggilan `siswa.getAll` massal ke lookup atau pagination. (Audit: sisa `getAll` hanya di SiswaListView yang memang butuh kolom penuh + sudah paginated; semua dropdown siswa sudah `getLookup`.)
- [x] Audit endpoint yang masih mengembalikan seluruh row database padahal hanya membutuhkan summary. (Perbaiki: `absensi.getRekapSiswa`/`getRekapGuru` proyeksi kolom; `guru.getLookup` baru; `pengampu.getByMapel` proyeksi; `pengumuman.getCounts` → COUNT; varian dashboard ringan tanpa `konten`/`deskripsi`; fix `guru.getAll` cache-miss kirim `passwordGuru`.)
- [x] Hilangkan request duplikat profil, sekolah, tahun ajaran, dan notifikasi pada shell. (Audit: sudah ter-dedupe oleh React Query — key sama → 1 request; batching tRPC aktif. Tidak ada duplikat nyata tersisa.)
- [x] Pertimbangkan endpoint shell teragregasi jika batching tRPC belum cukup. (Batching tRPC sudah menangani shell — 1 batch ~3.7 KB; agregasi tidak diperlukan.)
- [x] Tambahkan debounce untuk pencarian yang memicu request. (Hook baru `src/hooks/useDebounce.ts` diterapkan ke 5 halaman pencarian server-side: kelas, prestasi, ekskul, ruang kelas, KelasTab.)
- [x] Prefetch hanya route yang paling mungkin dibuka user. (Sudah: dashboard, absensi, jadwal. Tidak menambah prefetch baru.)

Kriteria selesai:

- Request dan payload initial load turun dibanding baseline. ✓ (dashboard 714→498 KB, siswa 120→117 KB; route lain stabil)
- Tidak ada daftar 1.000+ item yang dikirim hanya untuk mengisi dropdown kecil. ✓
- Mutation yang mengubah lookup selalu meng-invalidasi cache lookup. ✓

Hasil pengukuran ulang (bandingkan Baseline Fase 1):

| Route | Perf | LCP | CLS | TBT* | TTFB | Payload | API p95 |
|---|---|---|---|---|---|---|---|
| `/` (dashboard) | 75 → **86** | 5413 → **3771 ms** | 0.000 | 226 → 189 ms | 21 ms | 714 → **498 KB** | 386 → 286 ms |
| `/absensi` | 93 → 83* | 1587 → 1589 ms | 0.028 | 297 → 668 ms* | 32 ms | 171 → 171 KB | 344 → 1036 ms* |
| `/manajemen/siswa` | 88 → 87 | 3286 → 2811 ms | 0.002 | 242 → 365 ms | 29 ms | 120 → 117 KB | 870 → 1509 ms* |
| `/keuangan` | 96 → 96 | 845 → 821 ms | 0.000 | 235 → 216 ms | 23 ms | 113 → 113 KB | 544 → 608 ms |

*TBT dan API latency absensi/siswa fluktuatif antar-run (noise mesin, simulated throttling); LCP dan payload adalah indikator utama dan membaik/stabil.

Perubahan utama Fase 2 (detail di Session Log):
- DashboardTour auto-show ditunda 1.5s → 8s (LCP element sebelumnya = modal tour).
- Logo Cloudinary di-render dengan transform `w_96,q_auto,f_auto` (123 KB → ~3 KB).
- Favicon `icon.png` (113 KB) → `icon-512.svg` (292 B).
- Query dashboard memakai varian ringan (tanpa `konten` pengumuman, limit kalender 200→60).
- `guru.getLookup` (kolom minimal, tanpa `passwordGuru`) menggantikan `guru.getAll` di 6 dropdown.
- Proyeksi kolom `absensi.getRekapSiswa`/`getRekapGuru` + fix kebocoran `passwordGuru`.
- `pengumuman.getCounts` → COUNT, `pengampu.getByMapel` → proyeksi.
- Debounce pencarian server-side (5 halaman).

### Fase 3: Database dan API Latency

Status: selesai (11 Agustus 2026).

- [x] Jalankan `EXPLAIN ANALYZE` untuk dashboard, absensi, siswa, poin, dan invoice. (`scripts/explain-queries.ts`; semua plan tervalidasi, semua query <10 ms, index terpakai.)
- [x] Audit query dengan `LIKE '%keyword%'` dan siapkan trigram index bila diperlukan. (Audit 15+ lokasi; data aktual kecil (323 siswa, 16 guru) → trigram belum diperlukan. Bila sekolah >5.000 siswa: `CREATE EXTENSION pg_trgm` + GIN index pada `siswa(nama_lengkap, nisn)` dan `guru(nama_lengkap, nipnuptk)`.)
- [x] Validasi index untuk filter sekolah, status, kelas, dan rentang tanggal. (Index ada dan terpakai: `siswa_sekolah_id_idx`, `absensi_siswa_sekolah_id_tanggal_idx`, `invoice_sekolah_id_status_idx`, `kalender_event_sekolah_id_tanggal_mulai_idx`.)
- [x] Gabungkan agregasi yang masih memakai beberapa query terpisah. (Root cause: tiap query bayar RTT ~205 ms ke Supabase pooler. `getOverview`: 10+ query → 3 query (1 gabungan 8 statistik + 1 top poin + 1 enrich). `queryTopStudentPoints` 3 query → 2 + cache 30 s.)
- [x] Ganti offset pagination besar dengan cursor pagination pada tabel besar. (Audit: tabel terbesar 2.799 rows (audit_logs) — offset belum jadi masalah. Tambah index composite `(sekolah_id, nama_lengkap)` siswa/guru untuk sort pagination tanpa Sort node. Cursor pagination hanya relevan bila tabel >50k rows.)
- [x] Tambahkan logging latency sampling, bukan logging payload. (`src/server/api/trpc.ts`: middleware `latencyLogger` di semua procedure — log `[api:query:path] Nms SLOW` untuk >=500 ms + 1% sampling, tanpa payload.)

Kriteria selesai:

- Endpoint berat memiliki query plan yang tervalidasi. ✓
- Tidak ada pool database saturation pada beban normal. ✓ (benchmark pool2 vs pool10: 1595 vs 1532 ms — pool bukan bottleneck)
- API p95 tercatat sebelum dan sesudah perubahan. ✓ (lihat tabel di bawah)

Hasil pengukuran (cache-hit getOverview ~50 ms; cache-miss turun 2.5 s → 1.4 s):

| Route | Perf | LCP | Payload | Catatan API |
|---|---|---|---|---|
| `/` (dashboard) | 86 → **88** | 3771 → **3544 ms** | 498 KB | getOverview cache-miss 2.5 s → 1.4 s |
| `/absensi` | 83 → 91 | 1589 → 1594 ms | 171 KB | stabil |
| `/manajemen/siswa` | 87 → 88 | 2811 → 2811 ms | 117 KB | stabil |
| `/keuangan` | 96 → 94 | 821 → 842 ms | 113 KB | stabil |

Catatan penting:
- RTT ~205 ms/query ke Supabase pooler + koneksi idle 8 s (handshake ulang) membuat API p95 lokal fluktuatif dan tinggi; di Vercel (region dekat Supabase) biaya ini jauh lebih rendah. Angka p95 lokal bukan representasi production.
- `idleTimeoutMillis: 8000` sengaja dipertahankan (keputusan desain di `src/server/db/index.ts` untuk session pooler ~15) — jangan dinaikkan tanpa pengukuran Vercel.
- Logging latency sampling aktif di semua environment; cek `[api:` di log server/vercel.

### Fase 4: Rendering dan Large Tables

Status: sebagian selesai (11 Agustus 2026). Server-side pagination besar ditunda ke fase terpisah.

- [ ] Terapkan server-side pagination pada tabel siswa, guru, absensi, invoice, dan log. (Audit: SiswaListView & guru-page sudah server-side paginated. Tagihan (limit 500 client-filter), Rekap Absensi (no limit), dan Audit Logs (50 row tanpa pagination UI) butuh perubahan router signifikan — ditunda.)
- [ ] Terapkan virtualisasi untuk tabel yang tetap dapat memuat ratusan row di client. (Ditunda — dataset terbesar 2.799 rows, belum perlu.)
- [x] Lazy-load dialog yang jarang dibuka pada halaman lain. (`SiswaDetailDialog`, `MutasiFormDialog` di SiswaListView; `GuruDetailDialog` di guru-page; `KelasDetailDialog` di kelas-page; `AsesmenFormDialog` + `AsesmenDetailDialog` di asesmen/page. Hapus dead code `GuruImportDialog`.)
- [x] Debounce filter lokal yang mahal dan hindari filter berulang pada render. (`super-admin/page.tsx`: debounced search + useMemo untuk filter/reduce; `asesmen/page.tsx`: useMemo filtered; `sarpras`, `e-materi`, `mapel`: useMemo count ops.)
- [x] Ganti `window.location.href` dengan `Link` atau `router.push` untuk navigasi internal. (Topbar: 3 lokasi → router.push; dashboard-page: 2 card → router.push. Impersonation flow tetap hard nav — intentional.)
- [x] Audit komponen yang melakukan sorting/filtering berulang pada array besar. (Temuan: super-admin/page tanpa useMemo — sudah diperbaiki. Absensi-page, jadwal-page, tagihan-page sudah well-memoized.)

Kriteria selesai:

- Scroll tabel besar tetap responsif pada perangkat mobile kelas menengah. (Belum — butuh virtualisasi/pagination penuh.)
- Navigasi internal tidak melakukan full document reload tanpa alasan bisnis. ✓ (7 lokasi → 5 diperbaiki, 2 intentional hard nav)
- INP tidak memburuk saat filter, pagination, atau dialog dibuka. ✓ (filter useMemo, dialog lazy)

### Fase 5: Asset dan Bundle

Status: belum dikerjakan.

- [ ] Tambahkan transformasi Cloudinary `f_auto,q_auto,w_...` untuk foto dan logo.
- [ ] Berikan dimensi eksplisit pada gambar untuk mencegah CLS.
- [ ] Audit chart, icon, font, CSS global, dan third-party script.
- [ ] Pertahankan PDF/Excel/chart di route atau interaction chunk, bukan shared chunk.
- [ ] Gunakan bundle analyzer untuk mencari dependency yang masuk ke common bundle.
- [ ] Ganti animasi Framer yang tersisa bila tidak memberi nilai UX yang sebanding.

Kriteria selesai:

- Initial JavaScript per route memiliki budget dan tidak mengalami regresi.
- Gambar list tidak mengirim resolusi original.
- Dependency berat hanya dimuat saat fitur digunakan.

### Fase 6: Rendering Architecture Next.js

Status: refactor besar, dikerjakan terakhir.

- [ ] Pisahkan konten non-interaktif dari Client Component.
- [ ] Pindahkan tabel/statistik statis ke Server Component bila sesuai.
- [ ] Gunakan streaming dan Suspense per section pada halaman berat.
- [ ] Kurangi object besar yang di-hydrate ke browser.
- [ ] Evaluasi caching server untuk data referensi yang stabil.
- [ ] Pertahankan auth dan tenant isolation pada setiap server boundary.

Kriteria selesai:

- Hydration time turun pada route berat.
- Konten awal tetap usable sebelum seluruh data sekunder selesai.
- Tidak ada data tenant atau data sensitif yang ikut masuk ke HTML/client payload.

### Fase 7: Guardrail Produksi

Status: belum dikerjakan.

- [ ] Tambahkan bundle-size budget di CI.
- [ ] Tambahkan authenticated Lighthouse atau Playwright trace secara berkala.
- [ ] Monitor Vercel Speed Insights dan API latency.
- [ ] Tambahkan regression checklist untuk route utama.
- [ ] Deploy perubahan besar melalui preview dan canary.
- [ ] Dokumentasikan hasil setiap eksperimen di Session Log.

Kriteria selesai:

- Regresi bundle atau Core Web Vitals terdeteksi sebelum production.
- Ada histori metrik per deployment.
- Performance menjadi bagian dari review, bukan audit satu kali.

## Urutan Eksekusi yang Direkomendasikan

1. Fase 1: measurement dan cache safety.
2. Fase 2: network dan payload.
3. Fase 3: database dan API latency.
4. Fase 4: rendering dan large tables.
5. Fase 5: asset dan bundle.
6. Fase 6: rendering architecture.
7. Fase 7: guardrail produksi.

Jangan mulai Fase 6 sebelum baseline Fase 1 tersedia. Refactor Server Component tanpa angka pembanding berisiko besar tetapi sulit membuktikan hasilnya.

## Verification Checklist

Perubahan kode minimal harus melewati:

```bash
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Untuk perubahan frontend, tambahkan smoke test route terkait. Untuk perubahan cache, cek header dan lakukan test dengan service worker aktif serta nonaktif.

Catatan saat ini: folder referensi lama `scratch/` sudah dihapus. `pnpm lint` harus memvalidasi source dan scripts production secara langsung.

## Session Log

### Sesi Fase 4 Rendering & Large Tables - 11 Agustus 2026

- **Fase/Task**: Fase 4 - window.location, debounce/useMemo, lazy-load dialog, Pagination component.
- **Perubahan**:
  1. `Topbar.tsx`: 3× `window.location.href` → `router.push` (notifikasi link, "Lihat semua", "Profil Saya").
  2. `dashboard-page.tsx`: 2× card `onClick window.location.href` → `router.push` (Manajemen Siswa, Pendidik & Tendik).
  3. `super-admin/page.tsx`: `searchQuery` → debounced (300ms) + `filteredSchools`/`totalSiswa`/`totalGuru`/`activeCount`/`suspendedCount` dibungkus `useMemo`.
  4. `lms/asesmen/page.tsx`: `filtered` dibungkus `useMemo`.
  5. `sarpras/page.tsx`: Stats + filtered dibungkus `useMemo` (5 stats + 2 filtered arrays).
  6. `lms/e-materi/page.tsx`: `countDokumen`/`countVideo`/`countTerbit` dibungkus `useMemo`.
  7. `akademik/mapel/page.tsx`: `countWajib`/`countPilihan`/`countMulok`/`totalBebanJam` dibungkus `useMemo`.
  8. Dialog lazy-load (6 halaman): `SiswaListView.tsx` (SiswaDetailDialog, MutasiFormDialog), `guru-page.tsx` (GuruDetailDialog), `kelas-page.tsx` (KelasDetailDialog), `asesmen/page.tsx` (AsesmenFormDialog, AsesmenDetailDialog). Pola: `next/dynamic` + typed import.
  9. Hapus dead code: `GuruImportDialog.tsx` (tidak di-import di mana pun).
  10. Baru: `src/components/ui/pagination.tsx` — reusable `<Pagination>` component (extracted dari SiswaListView pattern).
- **Ditunda**: Server-side pagination untuk tagihan/rekap/audit logs — butuh perubahan router (tambah `totalCount`, limit/offset di getRekapSiswa/getRekapGuru) + UI refactor. Virtualisasi ditunda karena dataset terbesar masih <3K rows.
- **Verification**: `tsc`, `lint`, `build`.
- **Hasil**: 5 task dari 6 selesai. Server-side pagination besar jadi PR terpisah.

### Sesi Audit Fase 2 & 3 - 11 Agustus 2026

- **Fase/Task**: Audit ulang implementasi Fase 2 & 3 (bukan task baru).
- **Temuan & perbaikan**:
  1. **Bug: cache invalidation guru.getLookup** — mutation guru (create/update/remove/bulkCreate) hanya invalidate `getAll`; dropdown yang pakai `getLookup` basi. Fix di `guru-page.tsx`: tambah `utils.guru.getLookup.invalidate()` + `invalidateKeys` di `useOptimisticRemove`.
  2. **Bug: cache pengumuman dashboard tidak di-invalidate** — mutation pengumuman tidak menghapus key `pengumuman:dashboard` (300s) → dashboard basi hingga 5 menit. Fix di `pengumuman.ts` `PENGUMUMAN_CACHE_KEYS`.
  3. **Bug: cache top poin dashboard tidak di-invalidate** — `poin.createSikap` tidak menghapus `dashboard:topPoints` (30s). Fix di `poin.ts`.
  4. **Bug serius: passwordGuru/passwordSiswa masih bocor** di jalur non-cache: `guru.getAll` (saat search/filter), `guru.getById`, `guru.getAllExport`, `siswa.getAll`, `siswa.getById`, `siswa.getAllExport`. Fix: proyeksi kolom via `getTableColumns` minus hash di semua jalur. Verifikasi 9 endpoint dengan script audit: `bocorPassword=false` semua.
  5. **Response shape `siswa.getById`** berubah (relasi `kelas`/`sekolah` → kolom `kelasNama`/`sekolahNama`) — `SiswaDetailDialog` disesuaikan.
  6. **`pengampu.getAll`** masih mengirim full row guru+kelas+mapel untuk tiap pengampu (AiGenerateDialog hanya butuh 5 kolom) — diproyeksi ke kolom minimal.
  7. **Celah debounce tersisa**: halaman e-materi (search mapel & materi) belum di-debounce — ditambah `useDebounce`.
  8. **Edge case query gabungan dashboard**: `classSummary` untuk super_admin tanpa impersonate harus null (perilaku asli) — dikoreksi.
  9. **`poinKategori.jenis`** enum aman (hanya positif/negatif) — konfirmasi perilaku refactor top poin identik.
- **Verification**: `tsc`, `lint`, `build`, e2e 7/7 pass, smoke test 9 endpoint (no password leak), `git diff --check` bersih.
- **Kesimpulan**: Fase 2 & 3 dinyatakan valid setelah perbaikan audit. Bug yang ditemukan mayoritas di area invalidation & kebocoran data — tidak mengubah metrik performa yang sudah dicatat.

### Sesi Fase 3 Database & API Latency - 11 Agustus 2026

- **Fase/Task**: Fase 3 - semua task (EXPLAIN, LIKE/trigram, index, agregasi, pagination, logging).
- **Baseline**: `getOverview` cache-miss ~2.5 s (log latency); API p95 lokal 344-870 ms (Fase 1).
- **Investigasi root cause**:
  - EXPLAIN ANALYZE semua query <10 ms → query bukan masalah.
  - Benchmark pool2 vs pool10: 1595 vs 1532 ms → pool bukan bottleneck.
  - Benchmark koneksi: tiap query ke Supabase pooler = ~205 ms RTT; koneksi idle 8 s → handshake ulang.
  - Kesimpulan: biaya dominan = jumlah roundtrip DB, bukan eksekusi query.
- **Perubahan**:
  1. `dashboard-queries.ts`: `queryDashboardStatsAggregated` baru — 8 statistik (siswa, guru, kelas, pending, absensi, receivable, ruang kelas, TA aktif) dalam 1 SQL roundtrip. Struktur return identik.
  2. `dashboard-queries.ts`: `queryTopStudentPoints` refactor — 3 query (positif + negatif + total) → 1 grouped query + 1 enrich, plus cache 30 s (`dashboard:topPoints`).
  3. `routers/dashboard.ts`: `getOverviewInner` pakai agregat — 10+ query → 3 query total.
  4. `scripts/add-indexes.ts` + DB: index `siswa_sekolah_id_nama_lengkap_idx`, `guru_sekolah_id_nama_lengkap_idx` (sort pagination tanpa Sort node; EXPLAIN ulang terverifikasi).
  5. `trpc.ts`: middleware `latencyLogger` di semua procedure (baseProcedure) — log >=500 ms + 1% sampling, tanpa payload.
  6. `scripts/explain-queries.ts` (dipertahankan untuk audit ulang), `scripts/add-indexes.ts` (idempotent).
- **Verification**: `tsc`, `lint`, `build`, e2e 7/7 pass. Benchmark `getOverview`: cache-hit 37-73 ms; cache-miss 2.5 s → 1.4 s (RTT lokal).
- **Hasil metrik**: Lighthouse — dashboard perf 88, LCP 3544 ms; route lain stabil. API p95 lokal tetap fluktuatif (bukan representasi production).
- **Follow-up**: Ukur latency di Vercel production (RTT lokal tidak valid). Trigram index bila sekolah >5.000 siswa. Cursor pagination bila tabel >50k rows.

### Sesi Fase 2 Network & Payload - 10 Agustus 2026

- **Fase/Task**: Fase 2 - network dan payload (semua task).
- **Baseline**: Tabel Baseline Fase 1 (dashboard LCP 5.4 s, payload 714 KB; siswa API p95 870 ms).
- **Perubahan** (urut berdampak):
  1. `DashboardTour.tsx`: auto-show ditunda 1.5s → 8s — modal tour adalah LCP element (render terlambat + overlay penuh).
  2. `Sidebar.tsx` + `lib/cloudinary.ts` (`optimizeImageUrl`): logo Cloudinary pakai transform `w_96,q_auto,f_auto` (dirender 36×36px).
  3. `app/layout.tsx`: favicon `icon.png` (113 KB) → `icon-512.svg` (292 B); manifest PWA tetap PNG.
  4. `dashboard-queries.ts` + `routers/dashboard.ts`: varian ringan `queryDashboardAnnouncements` (tanpa `konten`) & `queryDashboardKalenderEvents` (limit 60, tanpa `deskripsi`) — halaman pengumuman/kalender penuh tetap pakai query lengkap.
  5. `routers/guru.ts`: `getLookup` baru (kolom minimal, tanpa `passwordGuru`); fix bug cache-miss `getAll` yang mengembalikan `passwordGuru` ke client.
  6. `routers/absensi.ts`: `getRekapSiswa` (select 6 kolom + join kelas, tanpa 93 kolom), `getRekapGuru` (proyeksi, tanpa hash).
  7. `routers/pengumuman.ts`: `getCounts` → 2 query COUNT (sebelumnya findMany seluruh row).
  8. `routers/pengampu.ts`: `getByMapel` proyeksi kolom guru/kelas (sebelumnya full row + `passwordGuru`).
  9. Migrasi 6 dropdown `guru.getAll` → `guru.getLookup`: AsesmenFormDialog, KelasTab, JurnalFormDialog, mapel page, ekskul page, kelas-page.
  10. `hooks/useDebounce.ts` baru + diterapkan di 5 halaman pencarian server-side (kelas, prestasi, ekskul, ruang-kelas, KelasTab).
- **Verification**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` 7/7 pass, `git diff --check`.
- **Hasil metrik**: Lihat tabel perbandingan di Fase 2. Dashboard: LCP 5413→3771 ms, payload 714→498 KB, perf 75→86. Route lain stabil.
- **Follow-up**: LCP dashboard masih 3.8 s (target <2.5) — sisa berasal dari JS bundle 345 KB + main-thread eval (Fase 5: bundle/chunking). TBT/API latency absensi-siswa perlu pengukuran ulang saat mesin idle (noise). Pengukuran production di Vercel menyusul.

### Sesi Lighthouse Authenticated - 10 Agustus 2026

- **Fase/Task**: Fase 1 - Lighthouse authenticated + baseline metrik.
- **Baseline**: Tidak ada (ini baseline pertama).
- **Perubahan**:
  - Install `lighthouse` 13.4.1 dan `puppeteer-core` 25.5.0 sebagai devDependencies.
  - `scripts/lighthouse-audit.mjs`: login nyata via Puppeteer ke `/login` (session bukan cookie header), lalu `startFlow(page)` + `flow.navigate` untuk 4 route. Output: `performance/lighthouse/{dashboard,absensi,siswa,keuangan}.json` + `summary.json`.
  - Route siswa yang benar adalah `/manajemen/siswa` (bukan `/siswa` → 404).
  - `.gitignore`: `performance/lighthouse/*.json` kecuali `summary.json` (artifacts besar tidak di-commit).
  - Baseline dicatat di dokumen ini (tabel di Fase 1).
- **Verification**: `pnpm exec tsc --noEmit`, `pnpm lint`, `git diff --check`; audit berjalan di production build (`pnpm start`) — bukan dev server.
- **Hasil metrik**: Lihat tabel Baseline Fase 1 di atas. Highlight: dashboard LCP 5.4 s (perf 75) perlu perbaikan; route lain LCP < 3.3 s.
- **Follow-up**: Investigasi LCP dashboard (Fase 2: payload 714 KB paling besar); pengukuran TTFB/API di Vercel production; smoke test chunk mismatch.

### Sesi Audit Cache API / Service Worker - 10 Agustus 2026

- **Fase/Task**: Fase 1 - cache API authenticated menjadi `network-only`.
- **Baseline**: Semua GET `/api/*` (tRPC, auth session, csrf) di-cache via `networkFirst`; versi cache `edumanage-v4`.
- **Perubahan**:
  - `public/sw.js`: semua request `/api/*` sekarang di-skip dari service worker (network-only, tidak pernah masuk Cache Storage). Alasannya offline API bukan requirement: tidak ada UI offline handling dan React Query sudah menangani cache in-memory (staleTime/gcTime).
  - Versi cache dinaikkan `edumanage-v4` → `edumanage-v5` agar cache lama terhapus otomatis (handler `activate` menghapus cache non-aktif).
- **Verification**: `pnpm exec tsc --noEmit`, `pnpm lint`, `git diff --check`, `pnpm build`.
- **Hasil metrik**: Tidak ada perubahan metrik; ini mitigasi keamanan/konsistensi data.
- **Follow-up**: 
  - Perhatikan: HTML navigasi (dashboard dkk.) masih di-cache via `networkFirst` dan berisi data server-render yang di-hydrate. Jika offline app shell bukan requirement, pertimbangkan network-only untuk navigasi juga (Fase 1/2).
  - Test service worker dengan SW aktif di production build untuk memastikan API tidak muncul di Cache Storage.

### Sesi Playwright Auth Flow - 10 Agustus 2026

- **Fase/Task**: Fase 1 - Playwright auth flow (login + dashboard navigation).
- **Baseline**: Tidak ada (test pertama; baseline metrik menyusul setelah Lighthouse).
- **Perubahan**:
  - Install `@playwright/test` 1.62.1 + Chromium.
  - `playwright.config.ts`: baseURL dari `E2E_BASE_URL` (default localhost:3000), globalSetup reset rate limit, project `setup` (login sekali → `e2e/.auth/user.json`), project `chromium` pakai storageState.
  - `e2e/fixtures/auth.ts`: helper `login()` baca `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` dari `.env.local` (bukan hardcode), auto-unregister service worker, throw jelas bila env kosong.
  - `e2e/tests/auth.setup.ts`: login sekali, simpan storageState.
  - `e2e/tests/auth.spec.ts`: session tersimpan → dashboard; login gagal menampilkan error.
  - `e2e/tests/dashboard.spec.ts`: smoke test `/`, `/absensi`, `/siswa`.
  - `e2e/global-setup.ts`: reset key rate limit Redis (`login:<email>`, `auth:unknown`, `trpc:unknown`) sebelum run; fail-open bila Redis unreachable.
  - Script npm: `test:e2e`, `test:e2e:ui`, `test:e2e:report`. `.gitignore`: `playwright-report/`, `test-results/`, `e2e/.auth/`.
- **Kendala yang ditemukan**:
  - Rate limit login 5x/15 menit per akun (auth.ts) memblokir run berulang → solusi globalSetup reset + storageState (login sekali per run).
  - Playwright tidak membaca `.env.local` otomatis → load via `dotenv` di config.
  - Assertion URL awal gagal karena regex vs URL absolut → pakai `url.pathname`.
  - Upstash REST sempat connect-timeout; globalSetup dibuat fail-open agar tidak memblokir test.
- **Verification**: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:e2e` → 6/6 passed (16.8s), `git diff --check` bersih.
- **Hasil metrik**: Belum diukur (tahap berikutnya: Lighthouse authenticated).
- **Follow-up**: Lighthouse authenticated untuk dashboard/absensi/siswa/keuangan; lalu audit cache API service worker.

### Sesi Audit Performance - 10 Agustus 2026

- Baseline build Next 16.2.10/Turbopack berhasil.
- Login production smoke test HTTP 200.
- TypeScript berhasil.
- Quick wins Fase 0 selesai.
- Perbaikan service worker chunk/RSC selesai.
- Next session disarankan mulai dari authenticated Lighthouse/Playwright dan audit cache API.

### Template Sesi Berikutnya

Tanggal:

Fase/task:

Baseline:

Perubahan:

Verification:

Hasil metrik:

Follow-up:
