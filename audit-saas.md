# Audit SaaS — PGS (EduManage)

> Hasil inspeksi arsitektur multi-tenant aplikasi untuk menilai kesiapan scaling menjadi
> produk SaaS yang sesungguhnya. Analisis mencakup skema DB, router tRPC, auth, koneksi DB,
> dan konfigurasi infra.

## Verdict Singkat

Fondasi multi-tenant **sudah kuat**: 38 tabel punya kolom `sekolah_id` + ter-index semua,
dan RBAC berjalan. Namun untuk *beneran* scale menjadi produk SaaS, masih ada celah yang
harus ditutup — terutama di sisi keamanan isolasi, ketiadaan subscription/quota, dan
keterbatasan infra saat di-serverless.

---

## Yang Sudah Bagus (Jangan Diutak-Atik)

- **Isolasi data level skema**: semua tabel tenant punya `sekolah_id` `NOT NULL` + FK
  `onDelete: cascade`, dan ke-38 tabel punya index `sekolah_id`
  (`src/server/db/schema/*`).
- **RBAC**: `super_admin / admin_sekolah / tu / guru / siswa / yayasan` di-enforce via
  `roleProtectedProcedure` (`src/server/api/trpc.ts:32`).
- **Audit log**: tabel `auditLogs` + helper `logAudit()` dipakai 100+ call site
  (`src/server/audit.ts`). Bagus untuk kepatuhan/compliance.

---

## P0 — Harus Ditutup SEBELUM Menambah Banyak Sekolah (Risiko Kebocoran/Security)

### 1. Celah `getSekolahIdFilter` null-sekolahId
- **Lokasi**: `src/server/api/tenant.ts:1`
- Filter mengembalikan `null` (= lihat **SEMUA** sekolah) bukan cuma untuk `super_admin`,
  tapi untuk **user mana pun yang `sekolahId`-nya null**.
- Jika ada anomali data (mis. admin sekolah tanpa `sekolahId`), ia bisa baca/mutasi data
  semua sekolah → cross-tenant leak.
- `requireSekolahId()` sudah dibuat tapi **tidak dipakai di mana pun**.
- **Fix**: gunakan `requireSekolahId` di procedure tenant, jangan `getSekolahIdFilter`
  yang silent-null.

### 2. Cloudinary BELUM Di-scope Per Tenant
- **Lokasi**: `src/lib/cloudinary.ts` + semua call site
  (`profil/page.tsx:80`, `GuruFormInfoTab.tsx:37`, `SiswaFormDialog.tsx:446`,
  `lembaga/page.tsx:121,133`, `absensi/izin/page.tsx:117`).
- Semua sekolah upload ke folder bareng (`avatar-siswa`, `profile-photo`, `izin-bukti`,
  dll) — **tidak ada `sekolahId` di path**.
- **Risiko**: collision nama file, URL bisa dibuka cross-tenant, tidak bisa
  quota/bulk-delete per sekolah, plus pakai **unsigned preset**.
- **Fix**: prefix folder `${sekolahId}/avatar-siswa`, dan batasi preset.

### 3. Tidak Ada Defense-in-Depth
- Isolasi murni app-layer per-procedure. Router baru yang lupa panggil filter = bocor.
- Pertimbangkan DB Row-Level Security atau middleware global; app-layer + audit sudah
  cukup kalau konsisten.

---

## P1 — Biar Bisa Jadi Produk SaaS (Bukan Cuma App Multi-Tenant)

### 4. Tidak Ada Subscription / Plan / Quota SaaS
- Ini yang paling krusial buat "SaaS". Yang ada cuma **billing SPP** (tagihan siswa),
  bukan langganan sekolah.
- Belum ada: paket (Free/Pro/Enterprise), limit jumlah siswa, limit storage, masa aktif.
- Tanpa ini tidak bisa mencharge sekolah atau membatasi resource.

### 5. Rate Limiting Tidak Scale
- **Lokasi**: `src/middleware.ts`
- Hanya di login, pakai `Map` in-memory → tidak share antar instance serverless
  (bypassable) + memory leak (tidak ada eviction).
- Perlu rate limiter terdistribusi (Redis / Vercel KV) untuk semua route `api/trpc`.

### 6. DB Connection Pooling Lemah
- **Lokasi**: `src/server/db/index.ts:14`
- `new Pool()` tanpa `max`/timeout, dan `globalThis` caching **dimatikan di production**
  → di serverless tiap cold-start bikin pool baru → cepat habis koneksi.
- `.env` Supabase pakai `?pgbouncer=true` (transaction mode) tapi app tidak set
  `prepare: false`.

---

## P2 — Scale Hardening (Kalau Trafik & Jumlah Sekolah Naik)

### 7. Composite Index
- `(sekolah_id, tanggal/created_at)` untuk query range panas (dashboard, keuangan,
  absensi) — sekarang hanya single-column `sekolah_id`.

### 8. Tidak Ada Manifest Deploy
- Tidak ada Dockerfile / vercel.json / compose → infra tidak reproducible.

### 9. Tidak Ada Subdomain / Tenant Routing
- "Custom school naming" ada, tapi belum ada resolver `*.domain.com` → tiap sekolah
  tetap share 1 domain. Buat white-label SaaS proper perlu routing hostname +
  public landing per sekolah.

### 10. Feature Flags Per Plan
- Belum ada → tidak bisa enable/disable fitur per paket.

### 11. Catatan Kecil
- `poin.ts:228,333` bug `eq(sekolahId, "")` kalau super_admin.
- `console.log` Cloudinary noisy di prod (bocor nama file/URL ke log).
- Inkonsistensi super_admin (Pattern A vs B antar-router).

---

## Usulan Roadmap

- **Fase 1 (Aman Dulu)**: fix #1 + #2 (tenant filter + Cloudinary scope) + #5 rate limit
  terdistribusi.
- **Fase 2 (Jadi Produk)**: #4 schema `sekolah_plan` (paket/quota/active_until) + enforce
  limit di upload & CRUD + #6 pooling.
- **Fase 3 (Hardening)**: #7 composite index, #8/#9 deploy + subdomain, #10 feature
  flags, monitoring.

## Ringkasan Status

| Area | Status | Catatan |
|------|--------|---------|
| Isolasi skema `sekolah_id` | ✅ Bagus | 38 tabel, semua ter-index |
| RBAC | ✅ Bagus | `roleProtectedProcedure` |
| Audit log | ✅ Bagus | 100+ call site |
| Tenant filter null-sekolahId | 🔴 Risiko | `requireSekolahId` tidak dipakai |
| Cloudinary per-tenant | 🔴 Absen | folder bareng, unsigned preset |
| Subscription/quota SaaS | 🔴 Absen | hanya billing SPP |
| Rate limiting | 🟠 Lemah | in-memory, hanya login |
| DB pooling | 🟠 Lemah | no max/timeout, caching mati di prod |
| Composite index | 🟡 Kurang | range scan panas |
| Manifest deploy | 🟠 Absen | tidak reproducible |
| Subdomain routing | 🔴 Absen | share 1 domain |
| Feature flags | 🔴 Absen | — |
