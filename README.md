# PGS — Sistem Informasi Manajemen Sekolah

Aplikasi web manajemen sekolah full-stack berbasis **Next.js 16**, **tRPC**, **Drizzle ORM**, dan **PostgreSQL**. Migrasi dari platform low-code ZITE ke arsitektur modern TypeScript.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Bahasa | TypeScript 5 |
| UI | React 19, Tailwind CSS 4, base-ui/react, Lucide Icons |
| API | tRPC 11 (end-to-end typesafe) |
| Database | PostgreSQL + Drizzle ORM 0.45 |
| Auth | NextAuth v5 + Credentials + bcryptjs |
| Lint | ESLint 9 + eslint-config-next |

## Fitur

### Manajemen Data
- **Siswa** — CRUD + foto, password, username, ortu/wali, import/export XLSX
- **Guru & Tendik** — CRUD + foto, password, tugas tambahan, kategori pegawai, import/export
- **Kelas** — CRUD + atur siswa per kelas (search & assign badges)
- **Mata Pelajaran** — CRUD + kelompok (wajib/pilihan/muatan lokal)

### Akademik & LMS
- **Jadwal Pelajaran** — per kelas/hari
- **Jurnal Mengajar** — catatan kegiatan pembelajaran
- **Tugas** — buat tugas per kelas/mapel, deadline, status
- **Absensi** — rekap kehadiran siswa per kelas/tanggal
- **Nilai** — entry nilai siswa per kelas/mapel

### Modul Lainnya
- **Ekstrakurikuler** — kelola kegiatan ekskul + pembina
- **Prestasi** — catat prestasi siswa (tingkat sekolah→internasional)
- **Ruang Kelas** — data sarana ruang dan kapasitas
- **Pengumuman** — publish pengumuman (target: semua/guru/siswa/orang tua)
- **Keuangan** — tagihan SPP
- **Lembaga** — profil sekolah, tahun ajaran, kurikulum

### Keamanan
- Multi-tenant (data terpisah per sekolah)
- Role-based access: super_admin, admin_sekolah, guru, siswa, tu
- Password di-hash bcrypt, auto-create akun di tabel users

## Struktur Proyek

```
src/
├── app/(dashboard)/   # Halaman aplikasi (18 routes)
│   ├── manajemen/     # siswa, guru, kelas
│   ├── akademik/      # mapel, jadwal
│   ├── lms/           # jurnal, tugas
│   ├── kesiswaan/     # ekstrakurikuler, prestasi
│   ├── sarana/        # ruang-kelas
│   ├── konten/        # pengumuman
│   └── ...
├── components/        # UI components + form dialogs
├── server/
│   ├── api/routers/   # tRPC routers (14 routers)
│   ├── db/
│   │   ├── schema/    # Drizzle schema (17 tables)
│   │   └── migrations/# SQL migrations
│   └── api/trpc.ts    # tRPC setup + role helpers
├── lib/               # tRPC client, utils
└── auth.ts            # NextAuth config
```

## Memulai

```bash
# 1. Clone & install
npm install

# 2. Setup environment
cp .env.example .env.local
# Isi DATABASE_URL (PostgreSQL) dan AUTH_SECRET

# 3. Migrasi database
npm run db:migrate

# 4. Seed data awal
npm run seed

# 5. Jalankan development
npm run dev
```

Login: `admin@demo.com` / `admin123`

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run seed` | Seed database |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate` | Jalankan migration |
| `npm run db:push` | Push schema ke DB (dev) |
