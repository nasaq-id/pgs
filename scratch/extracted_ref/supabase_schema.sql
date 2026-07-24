-- SCHEMA DATABASE UNTUK SUPABASE (IDEMPOTENT / RE-RUNNABLE)
-- Sistem Manajemen Lembaga Pendidikan Formal (Core Management)
-- Silakan salin (copy) dan jalankan script ini di SQL Editor Supabase Anda.

-- ==========================================
-- 1. ENUMERASI / TIPE CUSTOM (SAFE INIT)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_enum') THEN
        CREATE TYPE gender_enum AS ENUM ('Laki-laki', 'Perempuan');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'warganegara_enum') THEN
        CREATE TYPE warganegara_enum AS ENUM ('WNI', 'WNA');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_status_enum') THEN
        CREATE TYPE student_status_enum AS ENUM ('Aktif', 'Non-Aktif', 'Lulus', 'Pindah', 'Dikeluarkan');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_status_enum') THEN
        CREATE TYPE teacher_status_enum AS ENUM ('Aktif', 'Non-Aktif', 'Lulus', 'Pindah', 'Dikeluarkan');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'teacher_category_enum') THEN
        CREATE TYPE teacher_category_enum AS ENUM ('Guru', 'Tendik');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prasarana_type_enum') THEN
        CREATE TYPE prasarana_type_enum AS ENUM ('Ruang Kelas', 'Laboratorium', 'Perpustakaan', 'Kantor Guru', 'Fasilitas Olahraga', 'Lainnya');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kondisi_type_enum') THEN
        CREATE TYPE kondisi_type_enum AS ENUM ('Baik', 'Rusak Ringan', 'Rusak Berat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sarana_category_enum') THEN
        CREATE TYPE sarana_category_enum AS ENUM ('Elektronik', 'Meubeler', 'Alat Peraga', 'Buku/Pustaka', 'Peralatan Olahraga', 'Lainnya');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mapel_category_enum') THEN
        CREATE TYPE mapel_category_enum AS ENUM ('Mapel Wajib', 'Mapel Pilihan', 'Muatan Lokal');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hari_enum') THEN
        CREATE TYPE hari_enum AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presensi_status_enum') THEN
        CREATE TYPE presensi_status_enum AS ENUM ('H', 'I', 'S', 'A', 'T');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_type_enum') THEN
        CREATE TYPE user_type_enum AS ENUM ('siswa', 'guru');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'izin_jenis_enum') THEN
        CREATE TYPE izin_jenis_enum AS ENUM ('Terlambat', 'Pulang Awal', 'Sakit_Tidak_Masuk');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'izin_status_enum') THEN
        CREATE TYPE izin_status_enum AS ENUM ('Pending', 'Disetujui', 'Ditolak');
    END IF;
END $$;

-- ==========================================
-- 2. TABEL LEMBAGA (institutions)
-- ==========================================
CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    npsn VARCHAR(20) UNIQUE NOT NULL,
    accreditation VARCHAR(5),
    curriculum VARCHAR(100),
    principal VARCHAR(255),
    email VARCHAR(150),
    website VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    organizer VARCHAR(255),
    level VARCHAR(100),
    status VARCHAR(100),
    academic_year VARCHAR(20) DEFAULT '2025/2026',
    semester VARCHAR(10) DEFAULT 'GANJIL',
    instagram JSONB DEFAULT '{"user": "", "url": ""}'::jsonb,
    facebook JSONB DEFAULT '{"user": "", "url": ""}'::jsonb,
    tiktok JSONB DEFAULT '{"user": "", "url": ""}'::jsonb,
    youtube JSONB DEFAULT '{"user": "", "url": ""}'::jsonb,
    logo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. TABEL ROMBEL KELAS (classes)
-- ==========================================
CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tingkat VARCHAR(50) NOT NULL,
    nama VARCHAR(150) NOT NULL,
    kapasitas INTEGER DEFAULT 32,
    siswa_ids JSONB DEFAULT '[]'::jsonb, -- Array of student IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 4. TABEL GURU & STAF (teachers)
-- ==========================================
CREATE TABLE IF NOT EXISTS teachers (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    foto TEXT,
    nip VARCHAR(50),
    nuptk VARCHAR(50),
    nik TEXT,
    nama VARCHAR(255) NOT NULL,
    jk VARCHAR(20),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    hp VARCHAR(50),
    email VARCHAR(150),
    username VARCHAR(100),
    password VARCHAR(255),
    status_pegawai VARCHAR(50),
    kategori VARCHAR(50),
    jabatan VARCHAR(100),
    tugas_utama VARCHAR(100),
    tugas_tambahan TEXT,
    mulai_bertugas DATE,
    akhir_bertugas DATE,
    jam_pelajaran INTEGER,
    pendidikan_terakhir VARCHAR(50),
    instansi_sd TEXT,
    instansi_smp TEXT,
    instansi_sma TEXT,
    instansi_d1 TEXT,
    jurusan_d1 TEXT,
    instansi_d2 TEXT,
    jurusan_d2 TEXT,
    instansi_d3 TEXT,
    jurusan_d3 TEXT,
    instansi_d4 TEXT,
    jurusan_d4 TEXT,
    instansi_s1 TEXT,
    jurusan_s1 TEXT,
    instansi_s2 TEXT,
    jurusan_s2 TEXT,
    instansi_s3 TEXT,
    jurusan_s3 TEXT,
    alamat TEXT,
    status VARCHAR(50) DEFAULT 'Aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 5. TABEL SISWA (students)
-- ==========================================
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nisn VARCHAR(50),
    nis VARCHAR(50),
    nama VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    kelas VARCHAR(50),
    jk VARCHAR(20),
    tempat_lahir VARCHAR(100),
    tanggal_lahir DATE,
    wali VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Aktif',
    nik VARCHAR(50),
    kewarganegaraan VARCHAR(10) DEFAULT 'WNI',
    password VARCHAR(255) DEFAULT 'password123',
    jumlah_saudara VARCHAR(10),
    anak_ke VARCHAR(10),
    agama VARCHAR(50) DEFAULT 'Islam',
    cita_cita VARCHAR(100),
    hp VARCHAR(50),
    email VARCHAR(150),
    hoby VARCHAR(100),
    pembiaya VARCHAR(100),
    foto TEXT,
    ayah JSONB DEFAULT '{"nama": "", "status": "Masih Hidup", "wn": "WNI", "nik": "", "tempatLahir": "", "tanggalLahir": "", "pendidikan": "", "pekerjaan": "", "penghasilan": "", "hp": ""}'::jsonb,
    ibu JSONB DEFAULT '{"nama": "", "status": "Masih Hidup", "wn": "WNI", "nik": "", "tempatLahir": "", "tanggalLahir": "", "pendidikan": "", "pekerjaan": "", "penghasilan": "", "hp": ""}'::jsonb,
    wali_data JSONB DEFAULT '{"statusWali": "", "nama": "", "wn": "WNI", "nik": "", "hp": "", "pendidikan": "", "pekerjaan": "", "penghasilan": "", "hubungan": ""}'::jsonb,
    alamat JSONB DEFAULT '{"ayah": {"kepemilikan": "", "prov": "", "kab": "", "kec": "", "kel": "", "rt": "", "rw": "", "kodepos": "", "jalan": ""}, "ibu": {"samaDenganAyah": true, "kepemilikan": "", "prov": "", "kab": "", "kec": "", "kel": "", "rt": "", "rw": "", "kodepos": "", "jalan": ""}, "wali": {"statusAlamatWali": "", "kepemilikan": "", "prov": "", "kab": "", "kec": "", "kel": "", "rt": "", "rw": "", "kodepos": "", "jalan": ""}, "domisili": {"statusTempatTinggal": "", "jarak": "", "transportasi": "", "waktuTempuh": ""}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 6. TABEL SARANA PRASARANA & AKADEMIK LAINNYA
-- ==========================================
CREATE TABLE IF NOT EXISTS prasarana (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nama TEXT NOT NULL,
    tipe VARCHAR(100),
    kondisi VARCHAR(50),
    luas NUMERIC,
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS sarana (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nama TEXT NOT NULL,
    kategori VARCHAR(100),
    jumlah INTEGER,
    kondisi VARCHAR(50),
    lokasi_prasarana_id VARCHAR(100) REFERENCES prasarana(id) ON DELETE SET NULL,
    merk_spec TEXT,
    tahun_pengadaan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS mata_pelajaran (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kode TEXT NOT NULL,
    nama TEXT NOT NULL,
    tingkat TEXT,
    kategori VARCHAR(100),
    jumlah_jam INTEGER,
    guru_pengampu TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS jadwal_pelajaran (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    kelas_id VARCHAR(100),
    mapel_id VARCHAR(100),
    hari VARCHAR(50),
    jam_mulai TIME,
    jam_selesai TIME,
    guru TEXT,
    jp_start INTEGER DEFAULT 1,
    jp_count INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Hapus foreign key constraints yang menghambat sinkronisasi agar aman dan lancar
ALTER TABLE IF EXISTS jadwal_pelajaran DROP CONSTRAINT IF EXISTS jadwal_pelajaran_kelas_id_fkey;
ALTER TABLE IF EXISTS jadwal_pelajaran DROP CONSTRAINT IF EXISTS jadwal_pelajaran_mapel_id_fkey;

-- Tambahkan kolom jp_start dan jp_count ke jadwal_pelajaran jika belum ada
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jadwal_pelajaran' AND column_name='jp_start') THEN
        ALTER TABLE jadwal_pelajaran ADD COLUMN jp_start INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jadwal_pelajaran' AND column_name='jp_count') THEN
        ALTER TABLE jadwal_pelajaran ADD COLUMN jp_count INTEGER DEFAULT 2;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS presensi_records (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    nama TEXT,
    kelas TEXT,
    tanggal DATE NOT NULL,
    status VARCHAR(10) NOT NULL,
    jam_masuk TIME,
    jam_pulang TIME,
    is_override BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS presensi_settings (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    jam_masuk TIME NOT NULL,
    toleransi INTEGER,
    jam_pulang TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS izin_records (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(100) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    nama TEXT,
    kelas TEXT,
    jenis_izin VARCHAR(100) NOT NULL,
    alasan TEXT,
    jam_pulang_awal TIME,
    jumlah_hari INTEGER,
    surat_dokter_url TEXT,
    status_approval VARCHAR(50) DEFAULT 'Pending',
    tanggal_pengajuan DATE NOT NULL,
    approved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 7. TABEL NOTIFIKASI (notifications)
-- ==========================================
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    time VARCHAR(100) DEFAULT 'Baru saja',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 8. TRIGGER UNTUK AUTOMATIC updated_at (IDEMPOTENT)
-- ==========================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk institutions
DROP TRIGGER IF EXISTS update_institutions_modtime ON institutions;
CREATE TRIGGER update_institutions_modtime
    BEFORE UPDATE ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk classes
DROP TRIGGER IF EXISTS update_classes_modtime ON classes;
CREATE TRIGGER update_classes_modtime
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk teachers
DROP TRIGGER IF EXISTS update_teachers_modtime ON teachers;
CREATE TRIGGER update_teachers_modtime
    BEFORE UPDATE ON teachers
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk students
DROP TRIGGER IF EXISTS update_students_modtime ON students;
CREATE TRIGGER update_students_modtime
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk prasarana
DROP TRIGGER IF EXISTS update_prasarana_modtime ON prasarana;
CREATE TRIGGER update_prasarana_modtime
    BEFORE UPDATE ON prasarana
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk sarana
DROP TRIGGER IF EXISTS update_sarana_modtime ON sarana;
CREATE TRIGGER update_sarana_modtime
    BEFORE UPDATE ON sarana
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk mata_pelajaran
DROP TRIGGER IF EXISTS update_mata_pelajaran_modtime ON mata_pelajaran;
CREATE TRIGGER update_mata_pelajaran_modtime
    BEFORE UPDATE ON mata_pelajaran
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk jadwal_pelajaran
DROP TRIGGER IF EXISTS update_jadwal_pelajaran_modtime ON jadwal_pelajaran;
CREATE TRIGGER update_jadwal_pelajaran_modtime
    BEFORE UPDATE ON jadwal_pelajaran
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk presensi_records
DROP TRIGGER IF EXISTS update_presensi_records_modtime ON presensi_records;
CREATE TRIGGER update_presensi_records_modtime
    BEFORE UPDATE ON presensi_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk presensi_settings
DROP TRIGGER IF EXISTS update_presensi_settings_modtime ON presensi_settings;
CREATE TRIGGER update_presensi_settings_modtime
    BEFORE UPDATE ON presensi_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger untuk izin_records
DROP TRIGGER IF EXISTS update_izin_records_modtime ON izin_records;
CREATE TRIGGER update_izin_records_modtime
    BEFORE UPDATE ON izin_records
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();


-- ==========================================
-- 9. PEMBERSIHAN CONSTRAINTS & NULLABILITY YANG MEMBATASI SYNC (IDEMPOTENT)
-- ==========================================
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_username_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_nisn_key;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_nis_key;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_status_check;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_nip_key;
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_nuptk_key;

ALTER TABLE students ALTER COLUMN nisn DROP NOT NULL;
ALTER TABLE students ALTER COLUMN nis DROP NOT NULL;
ALTER TABLE students ALTER COLUMN username DROP NOT NULL;

-- Tambahkan kolom yang dibutuhkan jika belum ada pada upgrade tabel
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS nik TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tempat_lahir VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tanggal_lahir DATE;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS status_pegawai VARCHAR(50);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS kategori VARCHAR(50);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tugas_utama VARCHAR(100);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS tugas_tambahan TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS mulai_bertugas DATE;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS akhir_bertugas DATE;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jam_pelajaran INTEGER;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS pendidikan_terakhir VARCHAR(50);
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_sd TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_smp TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_sma TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_d1 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_d1 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_d2 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_d2 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_d3 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_d3 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_d4 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_d4 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_s1 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_s1 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_s2 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_s2 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS instansi_s3 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS jurusan_s3 TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS alamat TEXT;


-- ==========================================
-- 10. KEAMANAN / ROW LEVEL SECURITY (RLS) & AKSES PUBLIK
-- ==========================================
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE prasarana ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarana ENABLE ROW LEVEL SECURITY;
ALTER TABLE mata_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_pelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE presensi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE izin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop policy lama jika sudah ada
DROP POLICY IF EXISTS "Allow all actions for all on institutions" ON institutions;
DROP POLICY IF EXISTS "Allow all actions for all on classes" ON classes;
DROP POLICY IF EXISTS "Allow all actions for all on teachers" ON teachers;
DROP POLICY IF EXISTS "Allow all actions for all on students" ON students;
DROP POLICY IF EXISTS "Allow all actions for all on prasarana" ON prasarana;
DROP POLICY IF EXISTS "Allow all actions for all on sarana" ON sarana;
DROP POLICY IF EXISTS "Allow all actions for all on mata_pelajaran" ON mata_pelajaran;
DROP POLICY IF EXISTS "Allow all actions for all on jadwal_pelajaran" ON jadwal_pelajaran;
DROP POLICY IF EXISTS "Allow all actions for all on presensi_records" ON presensi_records;
DROP POLICY IF EXISTS "Allow all actions for all on presensi_settings" ON presensi_settings;
DROP POLICY IF EXISTS "Allow all actions for all on izin_records" ON izin_records;
DROP POLICY IF EXISTS "Allow all actions for all on notifications" ON notifications;

-- Membuat Policy Baru untuk akses penuh demi sinkronisasi yang lancar
CREATE POLICY "Allow all actions for all on institutions" ON institutions TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on classes" ON classes TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on teachers" ON teachers TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on students" ON students TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on prasarana" ON prasarana TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on sarana" ON sarana TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on mata_pelajaran" ON mata_pelajaran TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on jadwal_pelajaran" ON jadwal_pelajaran TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on presensi_records" ON presensi_records TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on presensi_settings" ON presensi_settings TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on izin_records" ON izin_records TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all actions for all on notifications" ON notifications TO public USING (true) WITH CHECK (true);


-- ==========================================
-- 11. RELOAD SCHEMA CACHE UNTUK MERESPONS PERUBAHAN INSTAN
-- ==========================================
NOTIFY pgrst, 'reload schema';
