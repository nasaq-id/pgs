# Audit — PGS (EduManage)

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Build gagal: `KelasFormData.siswaIds` not assigned | 🔴 Critical | ✅ Fixed | |
| 2 | Lint: 152 masalah | 🟡 Medium | ✅ Fixed | |
| 3 | Multi-tenant isolation: jadwal, absensi, lembaga | 🔴 Critical | ✅ Fixed | |
| 4 | `sekolahId` dari client bisa bypass | 🔴 Critical | ✅ Fixed | |
| 5 | Akun siswa/guru belum konsisten | 🟡 Medium | ✅ Fixed | |
| 6 | Fitur template belum termigrasi | 🟡 Medium | ✅ Fixed | |
| | | | | |
| **Audit 2** | | | | |
| 7 | Tenant isolation bocor: **nilai.ts** — query/create/update tanpa filter sekolah | 🔴 Critical | ✅ Fixed | getByKelas verifikasi kelasId milik sekolah; create cek siswa via join; update cek via nested with |
| 8 | Tenant isolation bocor: **keuangan.ts** — query/create/update tanpa filter sekolah | 🔴 Critical | ✅ Fixed | getBySiswa & create verifikasi siswaId via sekolahId; update cek via tagihan.siswa.sekolahId |
| 9 | Tenant isolation bocor: **lms.ts** — jurnal & tugas tanpa filter sekolah | 🔴 Critical | ✅ Fixed | getAll filter via inArray kelasId; create/update/delete verifikasi via kelas join |
| 10 | Bulk import password **tidak di-hash** | 🟡 Medium | ✅ Fixed | `siswa.ts` bulkCreate & `guru.ts` bulkCreate hash pake bcrypt.hashSync + auto-create users entry |
| 11 | Pembuatan `users` entry **menelan error diam-diam** | 🟡 Medium | ✅ Fixed | `.catch(() => {})` dihapus, error propagate langsung |
| 12 | Build gagal tanpa network (Google Fonts) | 🟢 Low | ⬜ Open | |

**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low
**Status:** ⬜ Open / 🟡 In Progress / ✅ Fixed / ❌ Won't Fix
