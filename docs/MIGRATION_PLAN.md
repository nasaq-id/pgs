# EduManage — Migration Plan

## Dari ZITE ke Next.js + tRPC + Supabase

---

# BAGIAN 1: DANGER — Kenapa Harus Migrasi?

## ⚠️ Critical Issues di Project ZITE Saat Ini

### 1. API Dipanggil Langsung dari Frontend (Zero Backend)
Semua logika bisnis berjalan di frontend. File `src/api/*.ts` adalah **ZITE endpoint definitions** yang ditulis frontend. Artinya:

- Semua koneksi database terjadi via **ZITE SDK dari browser**
- Tidak ada backend yang benar-benar kita kontrol
- Semua validation & authorization bisa dimanipulasi dari client

### 2. 12 Endpoints TANPA Autentikasi Sama Sekali

| File | Yang Bisa Dilakukan Siapa Saja |
|------|-------------------------------|
| `createGuru.ts` | Bikin akun guru baru (termasuk admin) |
| `updateGuru.ts` | Edit data guru seenaknya |
| `deleteGuru.ts` | Hapus guru kapan aja |
| `resetAkunGuru.ts` | Reset username & password guru |
| `resetAkunSiswa.ts` | Reset username & password siswa |
| `getGuru.ts` | Lihat semua data guru + password |
| `getKelas.ts` | Lihat semua kelas |
| `getMataPelajaran.ts` | Lihat semua mapel |
| `createMataPelajaran.ts` | Nambah mapel |
| `deleteMataPelajaran.ts` | Hapus mapel |
| `updateMataPelajaran.ts` | Edit mapel |

**Tidak perlu login. Bisa diakses dari Postman/curl siapa saja.**

### 3. Password Disimpan & Dikirim dalam Bentuk Plaintext
- `getSiswa.ts` — mengembalikan `passwordSiswa` ke frontend
- `getGuru.ts` — mengembalikan `passwordGuru` ke frontend
- `createGuru.ts`, `createSiswa.ts` — simpan password langsung tanpa hash
- `importSiswa.ts`, `importGuru.ts` — import CSV dengan password mentah

### 4. Zero Role-Based Authorization
Hanya ada flag `authenticated: true/false`. Tidak ada pengecekan role sama sekali:
- Siswa bisa hapus guru
- Guru bisa hapus tagihan
- Murid bisa export data semua siswa (NIK, alamat, no HP, dll)
- Siapa saja yang login bisa akses **semua fitur**

### 5. No Tenant Isolation (Data Bocor Antar Sekolah)
Banyak endpoint query ALL data tanpa filter sekolah:
- `getGuru.ts` — bisa fetch guru dari semua sekolah
- `getKelas.ts` — fetch semua kelas lintas sekolah
- `getSiswaForKelas.ts` — fetch semua siswa tanpa filter sekolah
- `getJadwalPelajaran.ts` — fetch semua jadwal tanpa filter

### 6. XSS Vulnerability
- `SiswaDetailDialog.tsx` — `document.write()` dengan data user tanpa sanitasi
- `GuruDetailDialog.tsx` — pola yang sama

### 7. No Transaction Safety
- `importSiswa.ts` — bulk insert 100 students tanpa transaction. Kalau gagal di tengah, data kacau
- `generateJadwal.ts` — delete + insert manual. Kalau crash antara delete & insert, jadwal hilang semua

---

## 🎯 Dampak Bisnis

| Risiko | Dampak |
|--------|--------|
| Data siswa (NIK, alamat, no HP) bocor ke publik | **Tuntutan hukum** (UU PDP) |
| Password plaintext bocor | **Semua akun bisa diambil alih** |
| Siapa saja bisa hapus data | **Kehilangan data permanen** |
| Tidak ada audit trail | **Tidak tahu siapa melakukan apa** |
| XSS di dokumen cetak | **Serangan ke user lain** |

**Kesimpulan: Project ini TIDAK SIAP PRODUKSI dalam kondisi sekarang.**

---

# BAGIAN 2: Target Architecture

## Stack Baru

```
Frontend:  Next.js 14+ (App Router) + TypeScript
API:       tRPC v11
DB:        Supabase (PostgreSQL)
ORM:       Drizzle ORM
Auth:      NextAuth.js / Supabase Auth
UI:        shadcn/ui + Tailwind CSS + Lucide (sama, tinggal copas)
Charts:    Recharts (sama)
```

## Kenapa Supabase, Bukan MongoDB?

**Karena 16 tabel ini sangat relasional:**

```
Sekolah ──┬── Kelas ──┬── Siswa
          │           ├── JadwalPelajaran ──┬── Guru
          │           │                     └── MataPelajaran
          │           ├── AbsensiSiswa
          │           ├── JurnalMengajar
          │           └── Tugas
          │
          ├── Guru ──── JadwalPelajaran
          │
          ├── MataPelajaran ── JadwalPelajaran
          │
          └── TahunAjaran
```

MongoDB = ribuan `$lookup` (JOIN manual yang lambat).
Supabase/PostgreSQL = JOIN native, foreign keys, constraints.

## Arsitektur

```
edu-manage/
├── docs/                         # Dokumentasi
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Layout dengan sidebar
│   │   │   ├── dashboard/
│   │   │   ├── manajemen/
│   │   │   │   ├── siswa/
│   │   │   │   ├── guru/
│   │   │   │   └── kelas/
│   │   │   ├── akademik/
│   │   │   ├── lms/
│   │   │   │   ├── jurnal/
│   │   │   │   └── tugas/
│   │   │   ├── absensi/
│   │   │   ├── keuangan/
│   │   │   │   └── tagihan/
│   │   │   ├── kesiswaan/
│   │   │   ├── evaluasi/
│   │   │   ├── lembaga/
│   │   │   ├── sarana/
│   │   │   └── konten/
│   │   ├── api/                  # Next.js API routes (fallback, mostly pakai tRPC)
│   │   ├── auth/                 # NextAuth handlers
│   │   └── layout.tsx
│   │
│   ├── server/                   # Backend logic (tRPC)
│   │   ├── db/                   # Drizzle schema + migrations
│   │   │   ├── schema/           # 16 tabel definitions
│   │   │   └── migrations/
│   │   ├── api/                  # tRPC routers
│   │   │   ├── routers/
│   │   │   │   ├── siswa.ts      # CRUD + import/export
│   │   │   │   ├── guru.ts
│   │   │   │   ├── kelas.ts
│   │   │   │   ├── akademik.ts   # Mapel + Jadwal
│   │   │   │   ├── absensi.ts
│   │   │   │   ├── keuangan.ts
│   │   │   │   ├── lms.ts        # Jurnal + Tugas
│   │   │   │   ├── lembaga.ts    # Sekolah, TahunAjaran
│   │   │   │   └── dashboard.ts
│   │   │   ├── trpc.ts           # tRPC init
│   │   │   └── context.ts        # Auth context
│   │   ├── auth/                 # Auth helpers
│   │   └── middleware/           # RBAC middleware
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui (copas dari project lama)
│   │   ├── layout/               # Sidebar, Topbar, MainLayout (copas)
│   │   ├── siswa/                # (copas + adjust)
│   │   ├── guru/
│   │   ├── jadwal/
│   │   ├── jurnal/
│   │   └── shared/
│   │
│   └── lib/                      # Utilities
│       ├── utils.ts              # cn(), dll (copas)
│       └── permissions.ts        # RBAC helpers
│
├── public/
├── drizzle.config.ts
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

## Database Schema (Supabase/PostgreSQL)

```sql
-- Core
sekolah (id, nama, npsn, jenjang, alamat, telp, email, logo, active, kurikulum, akreditasi, ...)
tahun_ajaran (id, sekolah_id, nama, tgl_mulai, tgl_selesai, semester, active)

-- Master Data
siswa (id, sekolah_id, kelas_id, nisn, nama, jk, tgl_lahir, tmpt_lahir, nik, alamat, 
       nama_ayah, nama_ibu, no_hp_ortu, status, foto, ... [40+ fields])
guru (id, sekolah_id, nip, nama, jk, tgl_lahir, tmpt_lahir, alamat, no_hp, email, 
      pendidikan, status_kepegawaian, foto, active, kategori, ...)
kelas (id, sekolah_id, tahun_ajaran_id, nama, wali_kelas_id, tingkat, kapasitas)
mata_pelajaran (id, sekolah_id, nama, kode, kelompok, kkm, aktif, urutan)

-- Akademik
jadwal_pelajaran (id, kelas_id, mapel_id, guru_id, hari, jam_mulai, jam_selesai)
absensi_siswa (id, siswa_id, kelas_id, tanggal, status, keterangan)
nilai (id, siswa_id, mapel_id, tahun_ajaran_id, nilai_tugas, nilai_uts, nilai_uas, nilai_akhir)

-- LMS
jurnal_mengajar (id, guru_id, kelas_id, mapel_id, jadwal_id, tanggal, judul, materi, 
                 kegiatan, catatan, status, detail_kehadiran)
tugas (id, guru_id, kelas_id, mapel_id, jurnal_id, judul, deskripsi, jenis, deadline, status)

-- Keuangan
tagihan_spp (id, siswa_id, bulan, tahun, jumlah, status_bayar, tgl_bayar)

-- Kesiswaan
ekstrakurikuler (id, sekolah_id, nama, pembina_id, deskripsi, hari, jam)
prestasi (id, siswa_id, nama, tingkat, juara, tanggal, sertifikat)

-- Konten
pengumuman (id, sekolah_id, judul, konten, target, tgl_publish, published)

-- Sarana
ruang_kelas (id, sekolah_id, nama, kapasitas)
```

---

# BAGIAN 3: Migration Roadmap

## Fase 1: Foundation (Week 1)

| Task | Detail |
|------|--------|
| Init project | `create-next-app` + TypeScript + App Router |
| Setup Supabase | Project, database, connection string |
| Setup Drizzle ORM | Schema definitions, migrations, seed |
| Setup tRPC | Server + client setup, context dengan auth |
| Setup NextAuth | Email/password + Google OAuth providers |
| RBAC system | Role enum, permission matrix, middleware |
| Deploy database | Run migrations ke Supabase |

## Fase 2: Core Module (Week 2-3)

Prioritas: modul yang paling banyak digunakan.

| Module | Komponen | Estimasi |
|--------|----------|----------|
| Auth | Login, register, logout, session, RBAC guard | 3 hari |
| Dashboard | Stats cards, charts (copas dari project lama) | 2 hari |
| Manajemen Siswa | CRUD + detail dialog + form + search + filter | 3 hari |
| Manajemen Guru | CRUD + detail dialog + form + filter | 2 hari |
| Manajemen Kelas | CRUD + form + wali kelas assignment | 2 hari |

**Checkpoint: Deploy staging. Testing by 2-3 user.**

## Fase 3: Academic Module (Week 3-4)

| Module | Detail | Estimasi |
|--------|--------|----------|
| Mata Pelajaran | CRUD + urutan + kelompok + aktif/nonaktif | 2 hari |
| Jadwal Pelajaran | Timetable grid + generate jadwal + conflict check | 3 hari |
| Absensi | CRUD per kelas + rekap harian | 2 hari |
| Nilai | Input nilai + rapor + rekap | 2 hari |

## Fase 4: LMS & Learning (Week 4-5)

| Module | Detail | Estimasi |
|--------|--------|----------|
| Jurnal Mengajar | CRUD + detail + kehadiran siswa | 2 hari |
| Tugas | CRUD + deadline + status | 2 hari |
| Export PDF | Cetak jurnal + jadwal (fix XSS) | 1 hari |

## Fase 5: Financial & Other (Week 5-6)

| Module | Detail | Estimasi |
|--------|--------|----------|
| Tagihan SPP | Generate tagihan + status bayar + rekap | 2 hari |
| Ekstrakurikuler | CRUD + pembina + jadwal | 1 hari |
| Prestasi | CRUD + upload sertifikat | 1 hari |
| Pengumuman | CRUD + target audiens + publish | 1 hari |
| Sarana | CRUD ruang kelas | 1 hari |
| Lembaga | Profil sekolah + tahun ajaran + kurikulum | 2 hari |

## Fase 6: Finalization (Week 6-7)

| Task | Detail |
|------|--------|
| Role-based access | Finalisasi permission untuk 6 role |
| Data migration | Migrasi data dari ZITE DB ke Supabase (script ETL) |
| Testing | UAT dengan real users |
| Bug fixes | —
| Deploy production | Vercel + Supabase production |

---

## Total Timeline: 6-7 Minggu

### Resource Estimate

| Role | Jam/Minggu |
|------|-----------|
| 1 Full-stack developer | 40 jam/minggu |

### What Can Be Reused (Copas Langsung)
- Semua komponen UI (shadcn/ui pattern = identik)
- Semua page layout & struktur komponen
- Tailwind config + CSS variables
- Utility functions (`cn()`, format helpers)
- Ikon Lucide

### What Must Be Rewritten
- Semua API calls → ganti dengan tRPC mutations/queries
- Auth flow → ganti dari `zite-auth-sdk` ke NextAuth
- Database operations → Drizzle ORM
- Error handling → tRPC error formatting
- Server-side validation → Zod + middleware RBAC

---

# BAGIAN 4: RBAC Matrix (Target)

| Fitur | Super Admin | Admin Sekolah | Guru | Siswa | TU | Yayasan |
|-------|:-----------:|:-------------:|:----:|:-----:|:--:|:-------:|
| Dashboard (global) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dashboard (sekolah) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manajemen Siswa (CRUD) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manajemen Guru (CRUD) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manajemen Kelas (CRUD) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Akademik (Mapel) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Jadwal Pelajaran | ✅ | ✅ | ✅ (view) | ✅ (view) | ✅ (input) | ❌ |
| Jurnal Mengajar | ✅ | ✅ | ✅ (CRUD) | ❌ | ❌ | ❌ |
| Tugas | ✅ | ✅ | ✅ (CRUD) | ✅ (view) | ❌ | ❌ |
| Absensi | ✅ | ✅ | ✅ (input) | ❌ | ✅ | ❌ |
| Nilai | ✅ | ✅ | ✅ (input) | ✅ (view) | ❌ | ❌ |
| Tagihan SPP | ✅ | ✅ | ❌ | ✅ (view) | ✅ | ❌ |
| Ekstrakurikuler | ✅ | ✅ | ✅ (pembina) | ❌ | ✅ | ❌ |
| Prestasi | ✅ | ✅ | ✅ (input) | ❌ | ✅ | ❌ |
| Pengumuman | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lembaga (Profil) | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Lembaga (Tahun Ajaran) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ✅ (terbatas) | ❌ | ✅ | ❌ |
| Import Data | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Reset Akun | ✅ | ✅ (sekolah) | ❌ | ❌ | ✅ | ❌ |

---

# BAGIAN 5: Persiapan Sebelum Migrasi

## 1. Export Data dari ZITE
Export semua data dari 16 tabel ZITE → format CSV/JSON → siap di-import ke Supabase.

## 2. Setup Environment

```bash
git clone ...
cd edu-manage
cp .env.example .env.local
# Isi: DATABASE_URL, SUPABASE_ANON_KEY, NEXTAUTH_SECRET, dll
bun install
bunx drizzle-kit push:pg
bun run dev
```

## 3. Tools yang Dibutuhkan

| Tool | Untuk |
|------|-------|
| VS Code | Editor |
| TablePlus / DBeaver | Melihat data Supabase |
| Postman / Bruno | Testing API |
| Vercel | Hosting frontend |
| Supabase Dashboard | Manage database |

---

**Dibuat: 2 Juli 2026**
**Project Folder: `/run/media/dracarys/dracarys99/ext_projects/edu-manage-migration/`**
