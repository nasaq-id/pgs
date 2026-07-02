# Audit — PGS (EduManage)

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Build gagal: `KelasFormData.siswaIds` not assigned | 🔴 Critical | ✅ Fixed | `siswaIds: []` ditambahkan di `setEditData` |
| 2 | Lint: ~152 masalah (error + warning) — any, unused imports/vars, react-hooks | 🟡 Medium | ⬜ Open | |
| 3 | Multi-tenant isolation belum aman | 🔴 Critical | ✅ Fixed | `jadwal.ts`, `absensi.ts`, `lembaga.ts` ditambahi filter sekolahId |
| 4 | `sekolahId` dari client bisa bypass | 🔴 Critical | ✅ Fixed | `kelas.ts`, `mapel.ts`, `siswa.ts`, `guru.ts` — create override via session, update strip sekolahId |
| 5 | Akun siswa/guru belum konsisten | 🟡 Medium | ⬜ Open | |
| 6 | Fitur template belum termigrasi | 🟡 Medium | ⬜ Open | |

**Severity:** 🔴 Critical / 🟡 Medium / 🟢 Low
**Status:** ⬜ Open / 🟡 In Progress / ✅ Fixed / ❌ Won't Fix

---

## Prioritas (dari user)

1. ✅ ~~Build blocker `KelasFormData.siswaIds`~~ (fixed)
2. ✅ ~~Kunci router dengan tenant isolation~~ (jadwal, absensi, lembaga done)
3. ✅ ~~Tolak `sekolahId` dari client~~ (kelas, mapel, siswa, guru done)
4. ⬜ Rapikan model akun siswa/guru
5. ⬜ Bersihkan lint error + migrasi fitur dari JSON template
