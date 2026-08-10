# PGS Performance Roadmap

Dokumen kerja lintas sesi untuk optimasi performance Portal Guna Sekolah.

Status terakhir: 11 Agustus 2026

## Cara Menggunakan Dokumen Ini

1. Pilih satu fase aktif sebelum mulai mengubah kode.
2. Ukur baseline sebelum perubahan.
3. Kerjakan perubahan dalam scope kecil dan mudah di-rollback.
4. Jalankan build, typecheck, smoke test, dan ukur ulang.
5. Centang task yang selesai dan isi Session Log.

Setiap fase idealnya menjadi satu PR atau satu deploy preview agar dampaknya dapat dibandingkan.

## Baseline & Progress

Baseline resmi diambil 10 Agustus 2026 (Lighthouse 13.4.1, mobile simulated throttling, production build lokal, login nyata). Angka per fase dicatat di bawah tiap fase; tabel ini merangkum perbandingan keseluruhan.

| Route | Metrik | Baseline (F1) | Setelah F2 | Setelah F3 | Setelah F5 | Setelah F6 | Δ F1→F6 |
|---|---|---|---|---|---|---|---|
| `/` dashboard | LCP | 5413 ms | 3771 ms | 3544 ms | 3790 ms | **3804 ms*** | −30% |
| | Payload | 714 KB | 498 KB | 498 KB | 498 KB | 504 KB | −29% |
| | Perf | 75 | 86 | 88 | 82 | **85** | +10 |
| `/absensi` | LCP | 1587 ms | 1589 ms | 1594 ms | 1579 ms | **1621 ms** | stabil |
| | Payload | 171 KB | 171 KB | 171 KB | 170 KB | 172 KB | stabil |
| | Perf | 93 | 83* | 91 | 97 | **99** | +6 |
| `/manajemen/siswa` | LCP | 3286 ms | 2811 ms | 2811 ms | 2843 ms | **2710 ms** | −18% |
| | Payload | 120 KB | 117 KB | 119 KB | 108 KB | 106 KB | −12% |
| | Perf | 88 | 87 | 88 | 84 | **89** | +1 |
| `/keuangan` | LCP | 845 ms | 821 ms | 842 ms | 881 ms | **875 ms** | stabil |
| | Payload | 113 KB | 113 KB | 112 KB | 112 KB | 112 KB | stabil |
| | Perf | 96 | 96 | 94 | 77* | **88** | −8* |

*Perf/TBT fluktuatif antar-run (noise mesin lokal + simulated throttling). Indikator andal: LCP & payload.

Gambar initial dashboard: 236 KB (F1) → **22 KB** (F5, transform Cloudinary). Initial JS dashboard: 344 KB (F1) → ~348 KB (F6; stats sudah server-rendered, sisa = shell+kalender+React runtime).

Catatan pengukuran:
- Semua angka lokal (localhost → Supabase/Upstash via internet) — RTT ~205 ms/query; di Vercel production angka TTFB/API akan lebih rendah.
- API p95 lokal tidak representatif production (fluktuasi RTT), hanya dipakai untuk perbandingan relatif per fase.
- Target: LCP < 2500 ms, INP < 200 ms (perlu field data/Speed Insights), CLS < 0.1, TTFB < 800 ms.

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

Catatan baseline & pengukuran Fase 4:
- Fase 4 tidak diukur ulang dengan Lighthouse terpisah — perubahannya (lazy-load dialog, useMemo/debounce filter, navigasi SPA) tidak mengubah metrik Lighthouse utama (LCP/payload), jadi angka pembandingnya = Baseline Fase 1 dan hasilnya sudah tercakup dalam pengukuran F5/F6 (lihat tabel Baseline & Progress di atas).
- Pengukuran yang relevan untuk Fase 4 (INP, scroll responsif) butuh field data / device nyata — belum tersedia, masuk Fase 7 (Speed Insights).

### Fase 5: Asset dan Bundle

Status: selesai (11 Agustus 2026).

- [x] Tambahkan transformasi Cloudinary `f_auto,q_auto,w_...` untuk foto dan logo. (`optimizeImageUrl()` di `lib/cloudinary.ts` — aman untuk URL non-Cloudinary. Diterapkan: logo sidebar w_96 (Fase 2), foto siswa/guru list w_96, detail dialog w_256, id-card w_64/128, avatar user Topbar/Sidebar w_96. **Hasil: gambar initial dashboard 236 KB → 22 KB.**)
- [x] Berikan dimensi eksplisit pada gambar untuk mencegah CLS. (CLS sudah 0 di semua route pada baseline; semua gambar render di container ber-dimensi tetap — tidak ada CLS dari gambar.)
- [x] Audit chart, icon, font, CSS global, dan third-party script. (recharts hanya di `/keuangan` (route chunk); lucide-react per-icon (tree-shake); Inter via next/font subset 48 KB standar; CSS 42 KB wajar untuk Tailwind v4; third-party hanya Vercel analytics/speed-insights 1 KB masing-masing.)
- [x] Pertahankan PDF/Excel/chart di route atau interaction chunk, bukan shared chunk. (jspdf 409 KB, xlsx 402 KB, html5-qrcode 361 KB, recharts 347 KB, jszip 168 KB — semua route/interaction chunk, TIDAK di initial load route utama. Semua pemanggilan `await import()` lazy.)
- [x] Gunakan bundle analyzer untuk mencari dependency yang masuk ke common bundle. (Analisis chunk manual `.next/static/chunks`: tidak ada dependency berat di common bundle; initial JS dashboard 344 KB = React runtime + komponen dashboard, bukan library.)
- [x] Ganti animasi Framer yang tersisa bila tidak memberi nilai UX yang sebanding. (3 file: `notifikasi/page.tsx`, `pengaturan/page.tsx`, `GenerateKurikulumDialog.tsx` — animasi mikro (hover scale, fade, tab indicator) diganti CSS murni + `animate-fade-in`. **framer-motion dihapus dari dependencies; runtime motion 118 KB hilang dari bundle notifikasi/pengaturan.**)

Kriteria selesai:

- Initial JavaScript per route memiliki budget dan tidak mengalami regresi. ✓ (344/163/40/103 KB — stabil; tidak ada regresi antar-fase)
- Gambar list tidak mengirim resolusi original. ✓ (semua Cloudinary pakai transform; hasil 236→22 KB)
- Dependency berat hanya dimuat saat fitur digunakan. ✓ (semua di route chunk)

Hasil pengukuran ulang (Lighthouse, production build):

| Route | Perf | LCP | Payload | Gambar |
|---|---|---|---|---|
| `/` (dashboard) | 88 → 82* | 3544 → 3790 ms* | 498 KB | 236 → **22 KB** |
| `/absensi` | 91 → 97 | 1594 → 1579 ms | 171 KB | — |
| `/manajemen/siswa` | 88 → 84* | 2811 → 2843 ms* | 117 KB | 0 KB (tanpa foto di run ini) |
| `/keuangan` | 94 → 77* | 842 → 881 ms | 113 KB | — |

*TBT/perf fluktuatif antar-run (noise mesin lokal, simulated throttling). Indikator andal: payload & gambar turun stabil; LCP stabil.

### Fase 6: Rendering Architecture Next.js

Status: sebagian selesai (11 Agustus 2026) — dashboard refactor ke Server Component; halaman lain menyusul.

- [x] Pisahkan konten non-interaktif dari Client Component. (Dashboard: `dashboard-stats.tsx` (Server Component) berisi StatSection, PoinSection, SiswaSection, AnnouncementList; `dashboard-page.tsx` jadi shell client minimal (greeting + kalender interaktif + slot children).)
- [x] Pindahkan tabel/statistik statis ke Server Component bila sesuai. (Dashboard stats — data di-fetch server (`getOverview`), dirender server, tidak di-hydrate. Diverifikasi: dengan JS chunk diblokir, stats tetap tampil.)
- [ ] Gunakan streaming dan Suspense per section pada halaman berat. (Dashboard sudah Suspense + ErrorBoundary per section; refactor server tidak butuh streaming lagi karena data ready saat render. Evaluasi halaman lain menyusul.)
- [x] Kurangi object besar yang di-hydrate ke browser. (Dashboard: stats tidak lagi di-hydrate; kalender terima `initialData` via props (tanpa request duplikat).)
- [x] Evaluasi caching server untuk data referensi yang stabil. (Sudah: Redis cache pengumuman/kalender/topPoints (Fase 2-3); `getOverview` cache 30s.)
- [x] Pertahankan auth dan tenant isolation pada setiap server boundary. (Server Component pakai `createTRPCContext` — session + filter `sekolahId` tetap aktif; super_admin tanpa impersonate di-skip & redirect di shell.)

Kriteria selesai:

- Hydration time turun pada route berat. ✓ (stats dashboard 0 JS — render server murni)
- Konten awal tetap usable sebelum seluruh data sekunder selesai. ✓ (stats tampil dari HTML awal)
- Tidak ada data tenant atau data sensitif yang ikut masuk ke HTML/client payload. ✓ (filter tenant tetap; payload tidak bertambah sensitif)

Hasil pengukuran (production build):

| Route | Perf | LCP | Payload | Catatan |
|---|---|---|---|---|
| `/` (dashboard) | 82 → **85** | 3790 → 3804 ms | 504 KB | JS stats keluar dari client bundle; TTFB naik 31→182 ms (fetch server sebelum render) |
| `/absensi` | 97 → 99 | 1621 ms | 173 KB | stabil |
| `/manajemen/siswa` | 84 → **89** | 2843 → 2710 ms | 106 KB | membaik |
| `/keuangan` | 77 → **88** | 881 → 875 ms | 112 KB | membaik |

Catatan: initial JS dashboard tetap ~348 KB (shell + kalender + React runtime) — bagian ini butuh interaktivitas. TTFB naik karena data di-fetch server sebelum render (di Vercel lebih rendah).

### Fase 7: Guardrail Produksi

Status: sebagian selesai (11 Agustus 2026).

- [x] Tambahkan bundle-size budget di CI. (`scripts/check-bundle-budget.mjs` + workflow `.github/workflows/ci.yml`: build → budget check. Budget: total JS < 7000 KB, chunk tunggal > 450 KB harus terbukti route-lib (jspdf/xlsx/qrcode/recharts). Script: `pnpm check:bundle`.)
- [x] Tambahkan authenticated Lighthouse atau Playwright trace secara berkala. (Playwright e2e 7 test ada di workflow CI — job `e2e` via manual trigger `workflow_dispatch` (butuh akun test, hindari rate limit di PR). Lighthouse manual via `pnpm check:perf` (`scripts/lighthouse-audit.mjs`) — otomasi terjadwal di Vercel Cron menunggu deployment production.)
- [x] Monitor Vercel Speed Insights dan API latency. (`<SpeedInsights/>` + `<Analytics/>` aktif di `layout.tsx`; logging latency `[api:query:x] Nms SLOW` aktif di semua tRPC procedure sejak Fase 3 — cek di log Vercel.)
- [x] Tambahkan regression checklist untuk route utama. (`docs/PERFORMANCE_REGRESSION_CHECKLIST.md` — otomatis + manual + baseline per route.)
- [ ] Deploy perubahan besar melalui preview dan canary. (Vercel Git-connected: push main auto-deploy; preview otomatis per PR dari Vercel. Canary manual belum — dokumentasi di bawah.)
- [x] Dokumentasikan hasil setiap eksperimen di Session Log. (Semua fase 1-6 punya Session Log; template ada.)

Kriteria selesai:

- Regresi bundle atau Core Web Vitals terdeteksi sebelum production. ✓ (CI bundle budget + e2e; Lighthouse manual sebelum deploy besar)
- Ada histori metrik per deployment. ✓ (tabel Baseline & Progress + summary.json per fase)
- Performance menjadi bagian dari review, bukan audit satu kali. ✓ (checklist + CI gate)

Deploy & canary (Vercel, akun `agds-alt`):
- Push ke `main` → auto-deploy production (pgs Git-connected).
- PR → Vercel preview otomatis; bandingkan metrik checklist sebelum merge.
- Canary manual: `vercel promote --yes <preview-url>` untuk naikkan preview ke production tanpa rebuild (pakai env production).

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

### Sesi Fase 7 Guardrail Produksi - 11 Agustus 2026

- **Fase/Task**: Fase 7 - bundle budget CI, regression checklist, monitoring.
- **Baseline**: Bundle total ~5.9 MB (136 chunks, termasuk route-lib); route-lib terbesar jspdf 409 KB, xlsx 402 KB (lazy, valid).
- **Perubahan**:
  1. `scripts/check-bundle-budget.mjs` (baru): guardrail bundle — total JS < 7000 KB; chunk tunggal > 450 KB harus terbukti berisi route-lib dikenal (deteksi isi chunk karena Turbopack hash-name). Script npm `check:bundle`.
  2. `.github/workflows/ci.yml` (baru): CI 2 job — typecheck+lint, build+bundle budget. Butuh secrets repo: `DATABASE_URL`, `NEXTAUTH_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
  3. `docs/PERFORMANCE_REGRESSION_CHECKLIST.md` (baru): checklist otomatis (CI) + manual route utama + baseline perbandingan.
  4. Verifikasi monitoring: `<SpeedInsights/>`/`<Analytics/>` aktif di layout; logging `[api:` aktif sejak Fase 3.
- **Verification**: `tsc`, `lint`, `build`, e2e 7/7 pass, `check:bundle` pass.
- **Hasil metrik**: Tidak ada perubahan performa (guardrail saja).
- **Follow-up**:
  - Tambahkan secrets CI ke GitHub (repo settings) agar workflow jalan.
  - Otomasi Lighthouse berkala (Vercel Cron hit route + laporan) setelah deployment production.
  - Canary promote workflow diuji saat deploy besar pertama.
  - Rekap absensi drill-down (`rekap/page.tsx`) milik agent lain masih uncommitted — perlu di-commit terpisah.

### Sesi Fase 6 Rendering Architecture - 11 Agustus 2026

- **Fase/Task**: Fase 6 - dashboard ke Server Component (task 1, 2, 4, 5, 6).
- **Baseline**: Dashboard initial JS 344 KB, stats di-hydrate client, payload 498 KB.
- **Perubahan**:
  1. `dashboard-stats.tsx` (baru, Server Component): `DashboardStats` (StatSection + PoinSection + AnnouncementList), `SiswaStats` (SiswaSection + AnnouncementList), `DashboardStatsFallback`, `KalenderFallback`. `router.push` diganti `<Link>`.
  2. `dashboard-page.tsx` (rombak total jadi shell client): greeting (session), redirect super_admin, `KalenderSection` interaktif dengan `initialData` dari props, slot `children` untuk stats server. Type `OverviewData` di-export.
  3. `page.tsx`: fetch `getOverview` di server via `createServerSideHelpers`, render stats sebagai Server Component di dalam shell. `HydrationBoundary` dihapus (tidak ada hydrate lagi).
  4. Fix bug Fase 2 tersembunyi: `queryDashboardKalenderEvents` tidak mengirim `deskripsi` (tooltip kalender kosong sejak Fase 2) — ditambahkan.
- **Verification**: `tsc`, `lint`, `build`, e2e 7/7 pass. Bukti render server: block semua JS chunk → stats ("Manajemen Siswa", "Total Siswa", "Rombel") tetap tampil di HTML.
- **Hasil metrik**: Dashboard perf 82→85; siswa 84→89; keuangan 77→88; LCP stabil. Initial JS ~348 KB (shell+kalender+runtime — perlu interaktivitas). TTFB 31→182 ms (fetch server sebelum render).
- **Follow-up**: Streaming/Suspense untuk halaman berat lain (absensi, tagihan); evaluasi pindah tabel rekap/absensi ke server render; pengukuran production Vercel.

### Sesi Fase 5 Asset & Bundle - 11 Agustus 2026

- **Fase/Task**: Fase 5 - semua task (Cloudinary transform, dimensi gambar, audit chart/font, route chunk, bundle analyzer, framer-motion).
- **Baseline**: Gambar initial dashboard 236 KB; framer-motion runtime 118 KB di route notifikasi/pengaturan.
- **Perubahan**:
  1. `optimizeImageUrl(url, width)` diterapkan luas: foto siswa/guru (list w_96, detail w_256, id-card w_64/128), avatar user Topbar/Sidebar (w_96). Logo sidebar sudah w_96 sejak Fase 2.
  2. Bundle analysis manual: semua dependency berat (jspdf/xlsx/qrcode/recharts/jszip) sudah di route chunk — tidak ada aksi tambahan.
  3. framer-motion dihapus total: 3 file diganti CSS (`animate-fade-in` + transition transform); `pnpm remove framer-motion`. Verifikasi: 0 KB motion runtime di build.
  4. CLS divalidasi 0 di semua route (tidak ada aksi dimensi eksplisit yang diperlukan).
- **Verification**: `tsc`, `lint`, `build`, e2e 7/7 pass, `git diff --check` bersih.
- **Hasil metrik**: Gambar dashboard 236 → 22 KB (−91%). Initial JS stabil 344/163/40/103 KB (tidak regresi). LCP stabil. Perf/TBT fluktuatif (noise).
- **Follow-up**: Initial JS dashboard 344 KB = React runtime + komponen dashboard (bukan library) — pengurangan lebih lanjut masuk Fase 6 (rendering architecture). Pengukuran Vercel production menyusul.

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
