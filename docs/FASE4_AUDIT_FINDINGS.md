# Fase 4 Audit Findings — Rendering dan Large Tables

Tanggal: 11 Agustus 2026

Dokumen ini mencatat temuan audit sebelum eksekusi Fase 4.

---

## Task 1: Server-side Pagination

### Masalah

3 halaman masih memuat semua data sekaligus di client:

| Halaman | Saat Ini | Masalah |
|---------|----------|---------|
| `keuangan/tagihan/page.tsx` | `getAll({ limit: 500 })` → filter client | Load 500 invoice + join siswa data, filter client-side |
| `absensi/rekap/page.tsx` | `getRekapSiswa` tanpa limit → `.slice()` client | Load SEMUA siswa + SEMUA log absensi untuk range tanggal |
| `super-admin/GlobalAuditLogsTab` | `limit: 50`, tanpa pagination controls | Hanya tampil 50 baris, user tidak bisa lihat lebih |

### Prefetch Over-limit

| Halaman | Prefetch | Masalah |
|---------|----------|---------|
| `absensi/page.tsx` | `siswa.getLookup.prefetch({ limit: 10000 })` | 10.000 row untuk dropdown |
| `absensi/rekap/page.tsx` | `siswa.getLookup({ limit: 1000 })`, `guru.getAll({ limit: 500 })`, `kelas.getAll({ limit: 200 })` | Load besar di awal |

### Router yang Sudah Support Pagination (limit/offset)

- siswa: `getAll` (default 50), `getLookup` (default 50)
- guru: `getAll` (default 50), `getLookup` (default 500)
- absensi: `getByKelas` (100), `getGuruAbsensi` (100), `getGuruOwnAbsensi` (50), `getStudentOwnAbsensi` (50)
- finance-billing: `getAll` (100)
- finance-payment: `listPending` (50)
- super-admin: `listGlobalAuditLogs` (50)

### Router yang BELUM Support Pagination

- absensi: `getRekapSiswa`, `getRekapGuru` — tanpa limit/offset
- finance-billing: `getByStudent` — tanpa limit/offset
- finance-payment: `getHistory` — tanpa limit/offset
- siswa: `getAllExport`, `getMutasi` — tanpa limit/offset
- guru: `getAllExport` — tanpa limit/offset

### Catatan Penting: Tidak Ada `totalCount`

Semua paginated endpoint TIDAK return `totalCount`. Frontend menebak "hasMore" dengan `data.length >= limit`. Ini tidak akurat untuk pagination UI yang proper.

### Duplikasi Pagination UI

`getPaginationPages()` copy-paste di 3 file:
- `src/components/siswa/SiswaListView.tsx` (~line 1125)
- `src/app/(dashboard)/manajemen/guru/guru-page.tsx` (~line 912)
- `src/app/(dashboard)/absensi/rekap/page.tsx` (~line 1004)

### Rencana Fix

1. Buat reusable `<Pagination>` component → hapus duplikasi
2. Router `finance-billing.getAll` → tambah return `totalCount`
3. Router `absensi.getRekapSiswa`/`getRekapGuru` → tambah limit/offset + totalCount
4. Router `super-admin.listGlobalAuditLogs` → return totalCount
5. Halaman tagihan, rekap, audit logs → pakai Pagination component
6. Refactor SiswaListView & guru-page → pakai Pagination component

---

## Task 2: Lazy-load Dialog

### Status Saat Ini

| Import Style | Jumlah | File |
|-------------|--------|------|
| Static | 17 dialog | Sebagian besar halaman |
| Dynamic (next/dynamic) | 5 dialog | jadwal-page.tsx (4), mapel/page.tsx (1), MobileBottomNav.tsx (1), MainLayout.tsx (1) |

### Kandidat Lazy Load (ROI Tertinggi)

| Dialog | File Asal | Alasan |
|--------|-----------|--------|
| SiswaDetailDialog | SiswaListView.tsx | Secondary action, klik row |
| MutasiFormDialog | SiswaListView.tsx | Hanya di tab mutasi-keluar/tidak-aktif |
| GuruDetailDialog | guru-page.tsx | Read-only dari dropdown |
| KelasDetailDialog | kelas-page.tsx | Secondary action |
| AsesmenDetailDialog + AsesmenFormDialog | asesmen/page.tsx | Ikut pola jadwal-page.tsx |
| LaporanKelasDialog | KelasTab.tsx | jarang dibuka |

### Dead Code

- `GuruImportDialog` — tidak di-import di mana pun → bisa dihapus

### Pola yang Sudah Ada

Jadwal-page.tsx sudah pakai pola typed dynamic import:
```ts
import type JadwalFormDialogType from "@/components/jadwal/JadwalFormDialog"
const JadwalFormDialog = dynamic<ComponentProps<typeof JadwalFormDialogType>>(
  () => import("@/components/jadwal/JadwalFormDialog").then((m) => m.default),
  { ssr: false }
)
```

---

## Task 3: Ganti `window.location.href` → `Link` / `router.push`

### Lokasi yang Perlu Diganti

| File | Line | Saat Ini | Target |
|------|------|----------|--------|
| `Topbar.tsx` | 336 | `window.location.href = "/notifikasi"` | `<Link href="/notifikasi">` |
| `Topbar.tsx` | 405 | `window.location.href = "/profil"` | `<Link href="/profil">` |
| `Topbar.tsx` | 172 | `window.location.href = notif.link` | `router.push(notif.link)` |
| `dashboard-page.tsx` | 148 | `onClick={() => window.location.href = "/manajemen/siswa"}` | `<Link>` card |
| `dashboard-page.tsx` | 163 | `onClick={() => window.location.href = "/manajemen/guru"}` | `<Link>` card |

### YANG TIDAK PERLU DIGANTI (intentional hard navigation)

| File | Line | Alasan |
|------|------|--------|
| `MainLayout.tsx` | 167 | Exit impersonation → perlu clear cookie + hard nav |
| `super-admin/page.tsx` | 90 | Set cookie impersonation → perlu hard nav |

---

## Task 4: Debounce + useMemo Filter Lokal

### Masalah Kritis

| File | Masalah | Fix |
|------|---------|-----|
| `super-admin/page.tsx` | Filter `sekolahList` TANPA useMemo + search TANPA debounce | useMemo + useDebounce |
| `lms/asesmen/page.tsx` | `filtered` TANPA useMemo | Bungkus useMemo |

### Masalah Minor (dataset kecil tapi tetap fix)

| File | Masalah |
|------|---------|
| `sarpras/page.tsx` | Count ops tanpa useMemo (dataset localStorage ~15 items) |
| `lms/e-materi/page.tsx` | countDokumen, countVideo, countTerbit tanpa useMemo |
| `akademik/mapel/page.tsx` | countWajib, countPilihan, countMulok tanpa useMemo |

### useDebounce Hook

Sudah ada di `src/hooks/useDebounce.ts` — standar, benar, default 300ms.
Sudah dipakai di 6 lokasi. Perlu ditambah ke super-admin/page.tsx.

---

## Task 5: Virtualisasi

### Status

- Tidak ada library virtualisasi terinstall
- Dataset terbesar: 2.799 rows (audit_logs)
- Belum ada tabel yang render ratusan row sekaligus di client

### Rekomendasi

**TUNDA** sampai ada tabel yang benar-benar perlu render 100+ row sekaligus.
Kalau nanti diperlukan: install `@tanstack/react-virtual`.

---

## Library & Dependencies

### Yang Sudah Ada

- `@tanstack/react-query` v5.101.2
- `recharts` v3.9.2
- `xlsx` v0.18.5
- `jspdf` + `jspdf-autotable`
- Custom table: `src/components/ui/table.tsx`, `responsive-table.tsx`

### Yang TIDAK Ada

- `@tanstack/react-table` (tidak ada table management library)
- `@tanstack/react-virtual` / `react-window` / `virtuoso` (tidak ada virtualisasi)

---

## Rencana Eksekusi

1. Task 3 — window.location → Link/router.push (quick win, 4 file)
2. Task 4 — Debounce + useMemo (super-admin + 4 halaman kecil)
3. Task 2 — Lazy-load dialog (6 halaman)
4. Task 1 — Server-side pagination + reusable Pagination component (terbesar)
5. Task 5 — Virtualisasi (skip)
