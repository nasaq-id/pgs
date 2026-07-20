# Super-Admin Platform Overview Dashboard — Implementation Plan

## 1. Latar Belakang & Keputusan
Super-admin = "platform owner realm" yang terpisah dari aplikasi per-sekolah.
Akses ke sekolah tertentu dilakukan via **impersonate** ("Kelola") menggunakan
cookie `impersonated_sekolah_id` (sudah ada & berfungsi). Pola ini sesuai
best-practice multi-tenant SaaS (ProxRad, BrotCode, Yaro Labs, AWS SaaS Lens).

Keputusan yang sudah dikunci:
- Metrik per sekolah: Siswa, Guru, Kelas, User per role, Keuangan (SPP).
- Layar detail sekolah: Modal dialog.
- Health badge: Otomatis (merah/kuning/hijau/abu).
- Modul ekstra: Panel Perhatian, Audit Trail, Pendaftaran Terbaru, Reset Password Admin.
- Landing guard: super_admin tanpa cookie impersonate → /super-admin.
- Email: tetap unik global.
- Domain tenancy (subdomain/custom domain): FASE TERPISAH (tidak dikerjakan sekarang).

## 2. Kondisi Saat Ini (hasil audit kode)
- Auth: 1 sumber (NextAuth Credentials global), tenant di-scope via `user.sekolahId`
  di JWT session. Sudah benar. (src/auth.ts)
- Impersonate: cookie `impersonated_sekolah_id` dibaca di trpc.ts & MainLayout.tsx;
  tombol "Kelola" di super-admin/page.tsx:316 set cookie lalu redirect "/".
  Banner amber "Mode Superadmin: <sekolah>" + "Keluar Mode" sudah jalan. (MainLayout.tsx:40-61)
- Celah: setelah login `router.push("/")` tanpa redirect by role → super_admin mendarat
  di root dashboard yang school-scoped (kosong karena sekolahId = null). Perlu guard.
- Skema relevan sudah ada: siswa, guru, kelas, mata-pelajaran, users (role),
  tagihan-spp (jumlah, statusPembayaran), audit_logs (userId, sekolahId, action,
  entity, entityId, metadata jsonb, createdAt). Tidak ada kolom lastLogin.

## 3. Perubahan Backend — src/server/api/routers/super-admin.ts
Semua agregat pakai query group-by tunggal (bukan N+1). Tanpa perubahan skema.

### 3.1 dashboardSummary (query)
KPI global:
- totalSekolah, totalSiswa, totalGuru, totalKelas, totalMapel
- sekolahAktif, sekolahSuspended, sekolahBaruBulanIni
- totalSppTagihan, totalSppLunas, totalSppBelumLunas
Cara: count/group-by(sekolahId) per tabel, di-map ke sekolahId di JS.

### 3.2 Perkaya listSekolah (query)
Tiap row sekolah ditambah field `stats`:
- siswa, guru, kelas, mapel : count by sekolahId
- usersByRole : { admin_sekolah, guru, siswa, tu, yayasan } (count users group-by role)
- spp : { tagihan, lunas, belumLunas } dari tagihan-spp (sum(jumlah) group-by statusPembayaran)
- health : "merah" | "kuning" | "hijau" | "abu" (lihat 3.6)

### 3.3 recentRegistrations (query)
5 sekolah terbaru (orderBy createdAt desc, limit 5), kirim stats ringkas.

### 3.4 getAuditTrail (query, role super_admin)
~20 audit_logs terbaru (orderBy createdAt desc), sertakan nama user & sekolah
(hasil resolve/join ke users & sekolah). Fokus aksi entity="sekolah".

### 3.5 resetSekolahAdminPassword (mutation, role super_admin)
Input: { sekolahId, newPassword }. Hash bcrypt, update user dengan
role="admin_sekolah" & sekolahId tsb. (Tidak mengubah user lain.)

### 3.6 Logika health (dihitung server, di-embed ke listSekolah)
- "abu"     : !active (suspended)
- "merah"   : active && siswa === 0
- "kuning"  : active && (guru === 0 || umur < 30 hari)
- "hijau"   : active && siswa > 0 && guru > 0

## 4. Perubahan Frontend

### 4.1 Landing guard
- src/app/login/page.tsx: setelah signIn sukses, jika
  role==="super_admin" && tidak ada cookie impersonate → router.push("/super-admin").
- src/app/(dashboard)/page.tsx: guard — super_admin tanpa cookie → redirect /super-admin.
- Flow impersonate ("Kelola") tetap dipertahankan.

### 4.2 src/app/(dashboard)/super-admin/page.tsx (redesign)
A. KPI strip (ganti 3 kartu lama, style neumo-card tetap):
   Total Sekolah · Total Siswa · Total Guru · Total Kelas ·
   Aktif/Suspended · Sekolah Baru Bulan Ini · Total Nilai SPP.
B. Tabel Sekolah — tambah kolom: Jml Siswa, Jml Guru, Jml Kelas, badge Health.
   Aksi per baris: Kelola (impersonate), Suspend/Unsuspend, Reset Password.
   Search (nama/alias/NPSN) tetap.
C. Panel Perhatian (blok baru): dihitung client-side dari listSekolah+stats
   → sekolah kosong (siswa=0 & aktif), suspended, pendaftaran <30 hari.
D. Pendaftaran Terbaru (blok baru): dari recentRegistrations + tombol Kelola.
E. Audit Trail (blok baru): dari getAuditTrail (aksi daftar/suspend lintas platform).
F. Modal Detail Sekolah (baru): klik nama → modal (style sama dgn modal
   "Daftarkan Sekolah") berisi breakdown: Siswa, Guru, Kelas, Mapel,
   Users per role, Keuangan SPP (tagihan/lunas/belum lunas) + aksi.
G. Modal Reset Password Admin (baru): input password baru → resetSekolahAdminPassword.
H. Tombol "Daftarkan Sekolah" (fitur paste-cepat) tetap dipertahankan.

## 5. File Terdampak
- src/server/api/routers/super-admin.ts
- src/app/login/page.tsx
- src/app/(dashboard)/page.tsx
- src/app/(dashboard)/super-admin/page.tsx

## 6. Catatan
- Tidak ada perubahan skema/migrasi.
- Query agregat efisien via groupBy(sekolahId); aman untuk jumlah sekolah saat ini.
- Logic register/toggle & impersonate tidak diubah.
- Domain tenancy (subdomain/custom domain via Vercel) dicatat sebagai fase berikutnya.
