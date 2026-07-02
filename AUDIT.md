# Audit — PGS (EduManage)

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Build gagal: `KelasFormData.siswaIds` not assigned | 🔴 Critical | ✅ Fixed | `siswaIds: []` ditambahkan di `setEditData` |
| 2 | Lint: ~152 masalah (error + warning) — any, unused imports/vars, react-hooks | 🟡 Medium | ⬜ Open | |
| 3 | Multi-tenant isolation belum aman | 🔴 Critical | ✅ Fixed | `jadwal.ts`, `absensi.ts`, `lembaga.ts` ditambahi filter sekolahId |
| 4 | `sekolahId` dari client bisa bypass | 🔴 Critical | ✅ Fixed | `kelas.ts`, `mapel.ts`, `siswa.ts`, `guru.ts` — create override via session, update strip sekolahId |
| 5 | Akun siswa/guru belum konsisten | 🟡 Medium | ✅ Fixed | `passwordSiswa` field + migration; hash bcrypt di `guru.ts` & `siswa.ts`; auto-create `users` entry |
| 6 | Fitur template belum termigrasi | 🟡 Medium | ⬜ Open | |

**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low
**Status:** ⬜ Open / 🟡 In Progress / ✅ Fixed / ❌ Won't Fix
