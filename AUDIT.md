# Audit — PGS (EduManage)

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Build gagal: `KelasFormData.siswaIds` not assigned | 🔴 Critical | ✅ Fixed | `siswaIds: []` ditambahkan di `setEditData` |
| 2 | Lint: 152 masalah (74 error, 78 warning) | 🟡 Medium | ✅ Fixed | ESLint config di-tune, unused imports/vars + missing deps cleaned |
| 3 | Multi-tenant isolation belum aman | 🔴 Critical | ✅ Fixed | `jadwal.ts`, `absensi.ts`, `lembaga.ts` ditambahi filter sekolahId |
| 4 | `sekolahId` dari client bisa bypass | 🔴 Critical | ✅ Fixed | `kelas.ts`, `mapel.ts`, `siswa.ts`, `guru.ts` — create override via session, update strip sekolahId |
| 5 | Akun siswa/guru belum konsisten | 🟡 Medium | ✅ Fixed | `passwordSiswa` field + migration; hash bcrypt; auto-create `users` entry |
| 6 | Fitur template belum termigrasi | 🟡 Medium | ✅ Fixed | Ekstrakurikuler, Prestasi, Ruang Kelas, Pengumuman + sidebar links |

**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low
**Status:** ⬜ Open / 🟡 In Progress / ✅ Fixed / ❌ Won't Fix

---

## Fitur Termigrasi dari JSON Template

| Modul | Status | Route | Router |
|-------|--------|-------|--------|
| Siswa | ✅ Sebelumnya | `/manajemen/siswa` | `siswa.ts` |
| Guru | ✅ Sebelumnya | `/manajemen/guru` | `guru.ts` |
| Kelas | ✅ Sebelumnya | `/manajemen/kelas` | `kelas.ts` |
| Mapel | ✅ Sebelumnya | `/akademik/mapel` | `mapel.ts` |
| Jadwal | ✅ Sebelumnya | `/akademik/jadwal` | `jadwal.ts` |
| LMS (Jurnal, Tugas) | ✅ Sebelumnya | `/lms/jurnal`, `/lms/tugas` | `lms.ts` |
| Absensi | ✅ Sebelumnya | `/absensi` | `absensi.ts` |
| Keuangan (Tagihan) | ✅ Sebelumnya | `/keuangan/tagihan` | `keuangan.ts` |
| Nilai | ✅ Sebelumnya | `/nilai` | `nilai.ts` |
| Lembaga | ✅ Sebelumnya | `/lembaga` | `lembaga.ts` |
| Ekstrakurikuler | ✅ Baru | `/kesiswaan/ekstrakurikuler` | `ekstrakurikuler.ts` |
| Prestasi | ✅ Baru | `/kesiswaan/prestasi` | `prestasi.ts` |
| Ruang Kelas | ✅ Baru | `/sarana/ruang-kelas` | `ruang-kelas.ts` |
| Pengumuman | ✅ Baru | `/konten/pengumuman` | `pengumuman.ts` |
| Buku Nilai | ✅ Sebelumnya | `/evaluasi/buku-nilai` | (placeholder) |
| Pengaturan | ✅ Sebelumnya | `/pengaturan` | (placeholder) |
