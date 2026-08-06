# Backlog Tindak Lanjut — PGS (EduManage)

> Daftar item hasil analisis menyeluruh codebase yang **bukan prioritas urgent**,
> tetapi perlu dieksekusi setelah pengerjaan urgent selesai.
> Setiap item mencantumkan lokasi kode, masalah, dampak, dan saran aksi.
>
> **Status:** ⬜ Open / 🟡 In Progress / ✅ Done / ❌ Won't Fix
> **Severity:** 🔴 High / 🟡 Medium / 🟢 Low

> Catatan: beberapa item di sini bersinggungan dengan doc yang sudah ada
> (`audit-saas.md`, `AUDIT.md`, `rls_implementation_plan.md`,
> `superadmin-panel-plan.md`). Doc ini fokus pada **technical debt konkret &
> actionable** dari hasil pembacaan skema + router. Lihat bagian
> "Cross-Reference" di bawah untuk doc terkait.

---

## A. Integritas Database / Skema

### A1. Kolom `studentId` di tabel finance tanpa Foreign Key
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open
- **Lokasi:**
  - `src/server/db/schema/finance-invoice.ts:11` → `studentId: text("student_id").notNull()` (tanpa `.references()`)
  - `src/server/db/schema/finance-discount.ts:10` → `studentId: text("student_id").notNull()` (tanpa `.references()`)
  - `src/server/db/schema/finance-master.ts:26` → `feeStructure.academicYearId` (tanpa FK ke `tahun_ajaran.id`)
  - `src/server/db/schema/finance-invoice.ts:13` → `invoice.academicYearId` (tanpa FK)
- **Masalah:** Tabel finance (`invoice`, `discount`, `fee_structure`) menyimpan `student_id`/`academic_year_id` sebagai plain `text` **tanpa constraint FK** ke `siswa.id`/`tahun_ajaran.id`. Berbeda pola dengan semua tabel lain yang konsisten pakai `.references(() => siswa.id)`. Akibatnya tidak ada jaminan integritas referensial di level DB; bisa muncul invoice untuk siswa yang sudah dihapus (orphan row), dan `onDelete` cascade/set-null tidak berlaku.
- **Dampak:** Data orphan, inkonsistensi referensi, sulit membersihkan data siswa terkait.
- **Saran aksi:**
  1. Audit data eksisting: cari `invoice.student_id` / `discount.student_id` yang tidak ada di tabel `siswa` (dan `academic_year_id` vs `tahun_ajaran`).
  2. Setelah data bersih, tambah FK: `.references(() => siswa.id, { onDelete: "cascade" })` (pilih strategi delete yang sesuai — kemungkinan `restrict`/`cascade`).
  3. Generate migration via `npm run db:generate`, review SQL, lalu `npm run db:migrate`.
  4. Sesuaikan router finance yang masih inject `studentId` manual agar konsisten.
- **Catatan router:** `finance-billing.ts` sudah melakukan validasi `siswaRecord` secara manual (baris ~85-90), jadi FK akan mengunci perilaku yang sudah di-enforce di app-layer.

---

## B. Modul Finance — TODO Tertunda

### B1. Cron job: proses reminder tagihan (QUEUED → sent/failed)
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open
- **Lokasi:** `src/server/db/schema/finance-reminder.ts:25` (TODO), tabel `reminder`
- **Masalah:** Tabel `reminder` punya status `queued/sent/failed` + channel `whatsapp/email/in_app`, tetapi **tidak ada worker/cron** yang memproses antrian. Reminder yang dibuat akan selamanya `queued`.
- **Saran aksi:** Buat scheduled job (Vercel Cron / external worker) yang:
  1. Ambil `reminder` WHERE `status = 'queued'` LIMIT N.
  2. Kirim via channel terkait (WhatsApp API / email / `createNotifikasi` untuk in_app).
  3. Update `status` ke `sent` (+ `sentAt`) atau `failed` (+ `errorMsg`).

### B2. Payment gateway webhook — auto-verify pembayaran
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open
- **Lokasi:** `src/server/api/routers/finance-payment.ts:35` (TODO)
- **Masalah:** Verifikasi pembayaran saat ini **manual** (admin set `status` → `verified`). Belum ada webhook untuk auto-verify dari payment gateway (Midtrans/Xendit/dll).
- **Saran aksi:**
  1. Tambah route handler `src/app/api/payment/webhook/route.ts` (Next.js Route Handler).
  2. Verifikasi signature gateway, lalu update `payment.status = 'verified'` + `invoice.paidAmount`/`status` sesuai.
  3. Tulis `invoice_status_history` via `writeStatusHistory()`.
  4. Tambah rate-limit + validasi signature wajib.

### B3. Scheduled job: auto-OVERDUE invoice setelah due date + grace period
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open
- **Lokasi:** `src/server/api/routers/finance-billing.ts:266` (TODO)
- **Masalah:** Invoice berstatus `issued` tidak otomatis jadi `overdue` setelah `dueDate` + `gracePeriodDays` (dari `late_fee_rule`). Akuntansi tagihan tertunggak tidak real-time.
- **Saran aksi:** Cron harian yang:
  1. Cari `invoice` WHERE `status = 'issued'` AND `dueDate + gracePeriod < now`.
  2. Update `status = 'overdue'`, hitung & tambah `lateFeeAmount` berdasarkan `late_fee_rule` (fixed/percent/per_day).
  3. Hitung ulang `totalAmount`, tulis `invoice_status_history`.

### B4. Konsolidasi sistem tagihan lama (tagihan_spp) → invoice
- **Severity:** 🟢 Low
- **Status:** ✅ Done
- **Hasil (2026-08):** Data `tagihan_spp` sudah kosong (0 baris, semua sudah di-invoice). UI `keuangan/*` sudah 100% memakai router `finance-*` (billing/payment/discount/report/settings). Prosedur lama di `keuangan.ts` (getBySiswa/create/update) dihapus — router kini murni komposisi sub-router. Tabel `tagihan_spp` di-drop (migration `0017_drop_tagihan_spp`).

---

## C. Keamanan & Multi-Tenancy

### C1. `requireSekolahId` dibuat tapi tidak pernah dipakai
- **Severity:** 🔴 High
- **Status:** ⬜ Open
- **Lokasi:** `src/server/api/tenant.ts:24` (definisi), 0 pemakaian di seluruh `src/`
- **Masalah:** Helper aman `requireSekolahId()` (throw error bila `sekolahId` null) **tidak dipakai sama sekali**. Yang dipakai 160× adalah `getSekolahIdFilter()` yang **silent-null** — return `null` (= akses SEMUA sekolah) bila user punya `sekolahId` null. Jika ada anomali data (mis. admin sekolah tanpa `sekolahId`), ia bisa baca/mutasi data **lintas tenant**.
- **Dampak:** Cross-tenant data leak pada kondisi anomali data user.
- **Saran aksi:**
  1. Ganti call `getSekolahIdFilter(ctx)` → `requireSekolahId(ctx)` di procedure yang **wajib scoped per-sekolah** (create/update/delete pada data tenant). Pertahankan `getSekolahIdFilter` (null = semua) **hanya** untuk `super_admin` + query dashboard global.
  2. Tambah guard: setelah login, user non-super_admin tanpa `sekolahId` → tolak/redirect.
- **Reference:** `audit-saas.md` P0 #1 (sudah mendokumentasikan masalah ini dari sudut SaaS).

### C2. Cloudinary belum di-scope per tenant
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open
- **Lokasi:** `src/lib/cloudinary.ts` + call site (`profil/page.tsx`, `GuruFormInfoTab.tsx`, `SiswaFormDialog.tsx`, `lembaga/page.tsx`, `absensi/izin/page.tsx`)
- **Masalah:** Semua sekolah upload ke folder bareng (`avatar-siswa`, `profile-photo`, `izin-bukti`) tanpa `sekolahId` di path + pakai **unsigned preset**. Risiko collision nama file, URL bisa dibuka cross-tenant, tidak bisa quota/bulk-delete per sekolah.
- **Saran aksi:** Prefix folder `${sekolahId}/...`, batasi preset, pertimbangkan signed upload.
- **Reference:** `audit-saas.md` P0 #2.

### C3. Defense-in-Depth (Row Level Security) belum diaktifkan
- **Severity:** 🟡 Medium
- **Status:** ⬜ Open (deferred by design)
- **Masalah:** Isolasi data murni di app-layer (per-procedure). Router baru yang lupa panggil filter = bocor.
- **Saran aksi:** Aktifkan setelah fase development inti selesai, mengikuti `rls_implementation_plan.md`.
- **Reference:** `rls_implementation_plan.md` (peta tabel + template policy), `audit-saas.md` P0 #3.

---

## D. Autentikasi & Password

### D1. Penyimpanan password ganda (dual storage) antara tabel master & `users`
- **Severity:** 🟡 Medium
- **Status:** ✅ Done (sync terpusat via `src/server/credentials.ts` — `syncUserCredentials()`)
- **Hasil (2026-08):** Semua path mutasi (create/update/reset/bulk siswa & guru) kini memakai satu helper `syncUserCredentials()` — tidak ada lagi blok sync terduplikasi yang bisa drift. `users` = satu-satunya sumber kredensial yang dibaca auth. Kolom `password_siswa`/`password_guru` ditandai deprecated (masih tersimpan untuk kompatibilitas, tidak pernah dibaca untuk login). Langkah berikut (opsional, setelah produksi stabil): drop kolom tersebut via migration.
- **Lokasi:**
  - Schema: `src/server/db/schema/siswa.ts` (`usernameSiswa`/`passwordSiswa`), `src/server/db/schema/guru.ts` (`usernameGuru`/`passwordGuru`), `src/server/db/schema/users.ts` (`email`/`password`)
  - Sync logic: `src/server/api/routers/siswa.ts` (create/update/reset), `src/server/api/routers/guru.ts` (`resetPassword` ~baris 275-305)
- **Masalah:** Password disimpan di **dua tempat**: tabel master (siswa/guru) **dan** tabel `users`. Router sync keduanya saat create/reset, tapi ini rentan drift (update di satu tempat lupa di tempat lain → akun tidak bisa login atau login pakai password lama).
- **Dampak:** Inkonsistensi kredensial, sulit di-maintain, risiko keamanan bila salah satu tidak ter-update.
- **Saran aksi (pilih satu):**
  - **Opsi A (rekomendasi):** Jadikan `users` sebagai **single source of truth** untuk auth. Tandai `passwordSiswa`/`passwordGuru` sebagai deprecated/kolom sementara; hapus setelah migrasi & verifikasi. Tambah FK `siswa.userId` / `guru.userId` opsional.
  - **Opsi B:** Pertahankan dual-storage tapi buat helper tunggal `syncUserCredentials()` yang dipanggil di semua path mutasi password (create/update/reset/import), + test e2e memastikan keduanya sinkron.
- **Reference:** `AUDIT.md` #5 & #10 (sejarah: bulk import pernah tidak hash, akun pernah inkonsisten — sudah di-fix per insiden, tapi akar pola dual-storage belum diubah).

---

## E. Lain-lain

### E1. Indeks & performa query multi-tenant saat data tumbuh
- **Severity:** 🟢 Low
- **Status:** ⬜ Open
- **Masalah:** Semua tabel punya index `sekolah_id_idx` (bagus), tapi beberapa query dengan filter gabungan (mis. `absensi_siswa` by `siswa_id + tanggal`, `invoice` by `student + billing + period`) mungkin butuh composite index tambahan saat volume data besar. `absensi_siswa` & `absensi_guru` sudah punya composite index bagus; `invoice` sudah punya unique composite index.
- **Saran aksi:** Setelah data real tumbuh, jalankan `EXPLAIN ANALYZE` pada query hot-path (dashboard, list siswa/guru, rekap absensi) dan tambah index sesuai.

### E2. Rate limiting in-memory tidak persisten antar instance serverless
- **Severity:** 🟢 Low
- **Status:** ⬜ Open
- **Lokasi:** `src/server/api/trpc.ts:83-122` (`rateLimitBuckets = new Map()`)
- **Masalah:** Rate limiter pakai `Map` in-memory. Di environment serverless/edge multi-instance, bucket tidak shared → limit tidak akurat (setiap instance hitung sendiri).
- **Saran aksi:** Untuk produksi, pindahkan ke store terdistribusi (Upstash Redis / Vercel KV). Saat ini `strictRateLimit`/`moderateRateLimit` juga belum terpasang di procedure mana pun — verifikasi apakah perlu dipasang di endpoint sensitif (login, reset password, import).

---

## Cross-Reference — Doc Terkait (tidak diduplikasi di sini)

| Doc | Cakupan | Status |
|-----|---------|--------|
| `audit-saas.md` | Kesiapan SaaS: P0 (getSekolahIdFilter null, Cloudinary scope, no defense-in-depth), P1 (subscription/quota, infra serverless) | Open |
| `AUDIT.md` | Tracker audit kode (12 item, mayoritas Fixed) | Sebagian Fixed |
| `rls_implementation_plan.md` | Rencana PostgreSQL RLS multi-tenant (pemetaan tabel + template policy) | Deferred |
| `superadmin-panel-plan.md` | Rencana dashboard super-admin (KPI, health badge, impersonate guard, audit trail) | Open |
| `docs/MIGRATION_PLAN.md` | Rencana migrasi ZITE → PGS | Historis |

---

## Urutan Eksekusi yang Disarankan

1. **C1** (`requireSekolahId`) — paling berisiko kebocoran data, fix bersifat mekanis.
2. **C2** (Cloudinary scope) — isolasi file upload per tenant.
3. **A1** (FK finance studentId) — integritas data, butuh audit data dulu.
4. **B1–B3** (cron finance) — fungsionalitas finance tertunda.
5. **D1** (dual password) — butuh keputusan arsitektur + migrasi.
6. **B4** (konsolidasi tagihan_spp) — selesaikan migrasi sistem tagihan.
7. **E2**, **E1**, **C3** — optimisasi & defense-in-depth (RLS mengikuti `rls_implementation_plan.md`).

