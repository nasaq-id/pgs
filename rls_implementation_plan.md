# Rencana Implementasi PostgreSQL Row Level Security (RLS)

Dokumen ini menjelaskan strategi, arsitektur, dan tahapan implementasi Row Level Security (RLS) sebagai lapisan keamanan tingkat kedua (*defense-in-depth*) untuk isolasi data multi-tenancy di database EduManage.

> [!TIP]
> **Rekomendasi Utama**: Sangat disarankan untuk menerapkan RLS **setelah fase development fitur inti selesai**. 
> Selama development berjalan, skema database akan sering berubah. Menerapkan RLS lebih awal dapat menurunkan kecepatan pengembangan (*development velocity*) karena setiap perubahan tabel harus diikuti dengan pembaruan *policy* RLS dan penanganan kasus debugging yang lebih kompleks.

---

## 1. Konsep Dasar RLS Multi-Tenancy

Karena aplikasi menggunakan *connection pool* dengan kredensial database global (tidak membuat user database baru per sekolah), kita akan memanfaatkan parameter sesi transaksi PostgreSQL (*transaction-local session variables*) untuk mengidentifikasi tenant aktif:

1. **Set Sesi Transaksi**: Sebelum mengeksekusi query, aplikasi menyetel parameter:
   ```sql
   SET LOCAL app.current_sekolah_id = 'id_sekolah_aktif';
   SET LOCAL app.current_role = 'role_pengguna';
   ```
2. **Evaluasi Policy RLS**: PostgreSQL akan mencocokkan nilai kolom `sekolah_id` di setiap baris dengan parameter sesi tersebut.

---

## 2. Pemetaan Kategori Tabel

Untuk memudahkan manajemen, tabel-tabel dikelompokkan ke dalam 3 kategori kebijakan RLS:

### A. Tabel Terisolasi Sekolah (Tenant-Isolated)
Tabel yang datanya eksklusif milik satu sekolah. Akses hanya diizinkan jika `sekolah_id` cocok dengan sesi aktif, ATAU pengakses adalah `super_admin`.

* **Tabel Terkait**:
  - `kelas`, `siswa`, `guru`
  - `absensi_guru`, `absensi_siswa`, `pengajuan_izin`
  - `asesmen`, `jurnal_mengajar`, `nilai`
  - `finance_invoice`, `finance_payment`, `finance_master`, `tagihan_spp`
  - `ruang_kelas`, `pengaturan_absensi`, `pengaturan_jadwal`, `mata_pelajaran`
  - `pengumuman`, `notifikasi`
  - `poin_aturan`, `poin_sikap`, `poin_tindak_lanjut`
  - `prestasi`, `ekstrakurikuler`

* **Template SQL Policy**:
  ```sql
  ALTER TABLE {nama_tabel} ENABLE ROW LEVEL SECURITY;

  CREATE POLICY sekolah_isolation_policy ON {nama_tabel}
    AS RESTRICTIVE
    USING (
      sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
      OR current_setting('app.current_role', true) = 'super_admin'
    )
    WITH CHECK (
      sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
      OR current_setting('app.current_role', true) = 'super_admin'
    );
  ```

### B. Tabel Global (Sistem/Read-Only)
Tabel yang diakses bersama oleh semua tenant. Data dibaca oleh semua orang, namun hanya bisa dimodifikasi oleh `super_admin`.

* **Tabel Terkait**:
  - `sekolah` (registrasi lembaga utama)
  - `users` (tabel kredensial global)

* **Template SQL Policy**:
  ```sql
  ALTER TABLE {nama_tabel} ENABLE ROW LEVEL SECURITY;

  CREATE POLICY global_read_policy ON {nama_tabel}
    FOR SELECT
    USING (true);

  CREATE POLICY global_write_policy ON {nama_tabel}
    FOR ALL
    USING (current_setting('app.current_role', true) = 'super_admin')
    WITH CHECK (current_setting('app.current_role', true) = 'super_admin');
  ```

### C. Tabel Audit & Logs (Append-Only)
Tabel yang digunakan untuk mencatat aktivitas sistem. Data hanya boleh ditambah (`INSERT`) oleh transaksi aktif, tidak boleh diubah (`UPDATE`) atau dihapus (`DELETE`).

* **Tabel Terkait**:
  - `audit_log`

* **Template SQL Policy**:
  ```sql
  ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

  CREATE POLICY audit_insert_policy ON audit_log
    FOR INSERT
    WITH CHECK (true);

  CREATE POLICY audit_select_policy ON audit_log
    FOR SELECT
    USING (
      sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
      OR current_setting('app.current_role', true) = 'super_admin'
    );
  ```

---

## 3. Integrasi pada Drizzle ORM

Untuk meminimalkan modifikasi kode di puluhan router TRPC, kita dapat membuat pembungkus transaksi database khusus (*Drizzle client extension* atau *Transaction wrapper*):

### Helper Setup Sesi RLS (`src/server/db/rls.ts`)
```typescript
import { db } from "./index"
import { sql } from "drizzle-orm"

interface UserSessionContext {
  sekolahId?: string | null
  role?: string | null
}

export async function withRLS<T>(
  ctx: UserSessionContext,
  callback: (tx: any) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // 1. Set parameter sesi transaksi
    const sekolahId = ctx.sekolahId ?? ""
    const role = ctx.role ?? ""
    
    await tx.execute(sql`
      SELECT 
        set_config('app.current_sekolah_id', ${sekolahId}, true),
        set_config('app.current_role', ${role}, true);
    `)

    // 2. Jalankan query database di dalam transaksi ter-RLS
    return await callback(tx)
  })
}
```

### Contoh Penggunaan di TRPC Router
```typescript
// SEBELUM RLS (Tergantung filter WHERE manual)
const data = await db.query.siswa.findMany({
  where: eq(siswa.sekolahId, sekolahId)
})

// SESUDAH RLS (Aman dari kebocoran data secara engine-level)
const data = await withRLS(ctx.session.user, async (tx) => {
  return await tx.query.siswa.findMany() // PostgreSQL otomatis memfilter sekolahId di latar belakang
})
```

---

## 4. Alur Kerja Implementasi (Setelah Dev Selesai)

1. **Finalisasi Skema**: Pastikan seluruh relasi tabel dan kolom `sekolah_id` sudah stabil.
2. **Jalankan Migrasi RLS**: Jalankan skrip SQL untuk mengaktifkan RLS dan memasang *policy* pada seluruh tabel.
3. **Refactor DB Wrapper**: Terapkan wrapper `withRLS` or *custom middleware* Drizzle untuk menyuntikkan variabel sesi secara otomatis pada setiap request TRPC.
4. **Verifikasi & Penetrasi**: Uji coba keamanan dengan mencoba query silang menggunakan sesi `sekolah_id` yang berbeda untuk memastikan baris data ditolak secara otomatis oleh Postgres engine.
