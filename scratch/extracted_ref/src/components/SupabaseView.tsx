import React, { useState, useEffect } from 'react';
import { safeJSONParse } from '../lib/json';
import { 
  Database, Copy, Check, ExternalLink, Terminal, ShieldCheck, 
  Sparkles, AlertCircle, Play, RefreshCw, ArrowUp, ArrowDown, 
  Wifi, WifiOff, Save, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { Student, Teacher, Institution, NotificationItem, Kelas } from '../types';
import { 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  getSupabaseClient, 
  testSupabaseConnection,
  mapStudentToDb,
  mapDbToStudent,
  mapTeacherToDb,
  mapDbToTeacher,
  mapInstitutionToDb,
  mapDbToInstitution,
  mapNotificationToDb,
  mapDbToNotification,
  mapClassToDb,
  mapDbToClass,
  mapSubjectToDb,
  mapScheduleToDb
} from '../lib/supabaseClient';

interface SupabaseViewProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  classes: Kelas[];
  setClasses: React.Dispatch<React.SetStateAction<Kelas[]>>;
  institution: Institution;
  setInstitution: React.Dispatch<React.SetStateAction<Institution>>;
  notifications: NotificationItem[];
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  addToast: (message: string, action?: string, type?: 'success' | 'info' | 'error') => void;
  addNotification: (title: string, message: string) => void;
}

export const SupabaseView: React.FC<SupabaseViewProps> = ({
  students,
  setStudents,
  teachers,
  setTeachers,
  classes,
  setClasses,
  institution,
  setInstitution,
  notifications,
  setNotifications,
  addToast,
  addNotification
}) => {
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [activeSubTab, setActiveSubTab] = useState<'sql' | 'sync'>('sync');

  // Supabase Config States
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [showKey, setShowKey] = useState(false);
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const isUsingEnv = !!(envUrl && envAnonKey);
  
  // Connection Status States
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'testing' | 'connected' | 'error'>('disconnected');
  const [connectionMessage, setConnectionMessage] = useState('');

  // Sync Log terminal
  const [logs, setLogs] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load config on mount
  useEffect(() => {
    const config = getStoredSupabaseConfig();
    setSupabaseUrl(config.url);
    setSupabaseAnonKey(config.anonKey);
    setAutoSync(config.autoSync);
    
    if (config.url && config.anonKey) {
      // Auto-test on mount to show status
      testConnectionQuietly(config.url, config.anonKey);
    }
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  };

  const testConnectionQuietly = async (url: string, key: string) => {
    try {
      const res = await testSupabaseConnection(url, key);
      if (res.success) {
        setConnectionStatus('connected');
        setConnectionMessage('Terhubung dengan lancar!');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(res.message);
      }
    } catch {
      setConnectionStatus('error');
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    setConnectionMessage('Mencoba melakukan ping ke endpoint Supabase...');
    addLog(`Menguji koneksi ke: ${supabaseUrl || '(URL Kosong)'}`);

    try {
      const res = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
      if (res.success) {
        setConnectionStatus('connected');
        setConnectionMessage(res.message);
        addLog(`[SUKSES] Koneksi terverifikasi. PostgreSQL siap menerima transaksi.`);
        addToast('Koneksi Supabase berhasil diverifikasi!', 'Database', 'success');
      } else {
        setConnectionStatus('error');
        setConnectionMessage(res.message);
        addLog(`[ERROR] Koneksi gagal: ${res.message}`);
        addToast('Koneksi Supabase gagal. Baca log detail.', 'Database', 'error');
      }
    } catch (err: any) {
      setConnectionStatus('error');
      setConnectionMessage(err.message || 'Koneksi gagal');
      addLog(`[FATAL] Gagal: ${err.message || 'Koneksi ditolak'}`);
    }
  };

  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      addToast('URL dan Anon Key harus diisi', 'Database', 'error');
      return;
    }
    saveStoredSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
      autoSync: autoSync
    });
    addToast('Konfigurasi database berhasil disimpan ke lokal browser', 'Database', 'success');
    addLog('Konfigurasi disimpan. Mencoba menyambungkan kembali...');
    handleTestConnection();
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    saveStoredSupabaseConfig({ autoSync: checked });
    addToast(
      checked 
        ? 'Sinkronisasi Otomatis DIAKTIFKAN. Setiap penambahan/perubahan data akan dikirim langsung ke Supabase.'
        : 'Sinkronisasi Otomatis DINONAKTIFKAN.',
      'Database',
      'info'
    );
    addLog(`[INFO] Auto-Sync disetel ke: ${checked ? 'AKTIF' : 'NON-AKTIF'}`);
  };

  // PUSH LOCAL DATA TO SUPABASE
  const handlePushData = async () => {
    const client = getSupabaseClient();
    if (!client) {
      addToast('Supabase belum dikonfigurasi dengan benar.', 'Database PUSH', 'error');
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    addLog('===== MEMULAI PROSES SYNC PUSH (Lokal -> Supabase) =====');
    addLog('Menginisialisasi klien Supabase REST API...');

    try {
      // 1. Sync Lembaga (Institutions)
      addLog('Mengunggah profil lembaga...');
      const dbInst = mapInstitutionToDb(institution);
      const { error: instErr } = await client.from('institutions').upsert(dbInst, { onConflict: 'npsn' });
      if (instErr) {
        addLog(`[GAGAL] Mengunggah lembaga: ${instErr.message}`);
        throw instErr;
      }
      addLog(`[SUKSES] Profil Lembaga "${institution.name}" berhasil diunggah.`);

      // 2. Sync Guru (Teachers)
      addLog(`Mengonversi dan mengunggah data Guru (${teachers.length} orang)...`);
      const dbTeachers = teachers.map(mapTeacherToDb);
      const { error: teachErr } = await client.from('teachers').upsert(dbTeachers, { onConflict: 'id' });
      if (teachErr) {
        addLog(`[GAGAL] Mengunggah Guru: ${teachErr.message}`);
        throw teachErr;
      }
      addLog(`[SUKSES] Berhasil mengunggah ${teachers.length} data Guru ke tabel.`);

      // 3. Sync Siswa (Students)
      addLog(`Mengonversi dan mengunggah data Siswa (${students.length} orang)...`);
      const dbStudents = students.map(mapStudentToDb);
      const { error: studErr } = await client.from('students').upsert(dbStudents, { onConflict: 'id' });
      if (studErr) {
        addLog(`[GAGAL] Mengunggah Siswa: ${studErr.message}`);
        throw studErr;
      }
      addLog(`[SUKSES] Berhasil mengunggah ${students.length} data Siswa (termasuk data Ayah, Ibu, Wali, dan Alamat JSONB).`);

      // 4. Sync Rombel Kelas (Classes)
      addLog(`Mengonversi dan mengunggah data Rombel Kelas (${classes.length} kelas)...`);
      const dbClasses = classes.map(mapClassToDb);
      const { error: classErr } = await client.from('classes').upsert(dbClasses, { onConflict: 'id' });
      if (classErr) {
        addLog(`[GAGAL] Mengunggah Rombel Kelas: ${classErr.message}`);
        throw classErr;
      }
      addLog(`[SUKSES] Berhasil mengunggah ${classes.length} data Rombel Kelas ke tabel.`);

      // 5. Sync Notifikasi (Notifications)
      addLog(`Mengunggah data Riwayat Notifikasi (${notifications.length} item)...`);
      const dbNotifications = notifications.map(mapNotificationToDb);
      const { error: notifErr } = await client.from('notifications').upsert(dbNotifications, { onConflict: 'id' });
      if (notifErr) {
        addLog(`[GAGAL] Mengunggah Notifikasi: ${notifErr.message}`);
        throw notifErr;
      }
      addLog(`[SUKSES] Berhasil mengunggah ${notifications.length} notifikasi.`);

      // 6. Sync Mata Pelajaran
      const savedSubjectsStr = localStorage.getItem('mts_subjects');
      if (savedSubjectsStr && savedSubjectsStr !== 'undefined' && savedSubjectsStr !== 'null') {
        try {
          const localSubjects = safeJSONParse(savedSubjectsStr);
          if (localSubjects && localSubjects.length > 0) {
            addLog(`Mengonversi dan mengunggah data Mata Pelajaran (${localSubjects.length} mapel)...`);
            const dbSubjects = localSubjects.map(mapSubjectToDb);
            const { error: subErr } = await client.from('mata_pelajaran').upsert(dbSubjects, { onConflict: 'id' });
            if (subErr) {
              addLog(`[GAGAL] Mengunggah Mata Pelajaran: ${subErr.message}`);
              throw subErr;
            }
            addLog(`[SUKSES] Berhasil mengunggah ${localSubjects.length} data Mata Pelajaran.`);
          }
        } catch (parseErr) {
          addLog(`[WARNING] Gagal mengurai data mata pelajaran lokal: ${parseErr}`);
        }
      }

      // 7. Sync Jadwal Pelajaran
      const savedSchedStr = localStorage.getItem('mts_schedules');
      if (savedSchedStr && savedSchedStr !== 'undefined' && savedSchedStr !== 'null') {
        try {
          const localScheds = safeJSONParse(savedSchedStr);
          if (localScheds && localScheds.length > 0) {
            addLog(`Mengonversi dan mengunggah data Jadwal Pelajaran (${localScheds.length} jadwal)...`);
            const dbScheds = localScheds.map(mapScheduleToDb);
            const { error: schedErr } = await client.from('jadwal_pelajaran').upsert(dbScheds, { onConflict: 'id' });
            if (schedErr) {
              addLog(`[GAGAL] Mengunggah Jadwal Pelajaran: ${schedErr.message}`);
              throw schedErr;
            }
            addLog(`[SUKSES] Berhasil mengunggah ${localScheds.length} data Jadwal Pelajaran.`);
          }
        } catch (parseErr) {
          addLog(`[WARNING] Gagal mengurai data jadwal pelajaran lokal: ${parseErr}`);
        }
      }

      addLog('==============================================');
      addLog('🎉 [SUKSES TOTAL] Seluruh data lokal Anda telah berhasil disinkronkan ke cloud Supabase!');
      addToast('Data berhasil disinkronkan (PUSH) ke Supabase!', 'Database PUSH', 'success');
      addNotification('Sinkronisasi Database Cloud', `Berhasil melakukan PUSH data administratif (Lembaga, ${teachers.length} Guru, ${students.length} Siswa, ${classes.length} Rombel Kelas) ke Supabase.`);
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.includes('PGRST204') || errMsg.toLowerCase().includes('schema cache')) {
        addLog('💡 TIPS SANGAT PENTING:');
        addLog('Error PGRST204 berarti Supabase PostgREST Schema Cache sedang usang/stale.');
        addLog('Silakan buka SQL Editor Supabase Anda dan jalankan perintah SQL ini untuk memuat ulang cache:');
        addLog('    NOTIFY pgrst, \'reload schema\';');
        addLog('Atau klik tombol "Reload Schema" di menu Database -> Schema Cache pada Dashboard Supabase Anda.');
      }
      addLog(`[FATAL SINKRONISASI] Gagal melakukan push: ${err.message || 'Kesalahan Jaringan'}`);
      addToast(`Gagal sinkronisasi: ${err.message || 'Periksa tabel database Anda'}`, 'Database PUSH', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // PULL DATA FROM SUPABASE TO LOCAL STATE
  const handlePullData = async () => {
    const client = getSupabaseClient();
    if (!client) {
      addToast('Supabase belum dikonfigurasi dengan benar.', 'Database PULL', 'error');
      return;
    }

    if (!confirm('PULL akan menimpa seluruh data front-end Anda saat ini dengan data terbaru dari Supabase. Lanjutkan?')) {
      return;
    }

    setIsSyncing(true);
    setLogs([]);
    addLog('===== MEMULAI PROSES SYNC PULL (Supabase -> Lokal) =====');
    addLog('Menghubungkan ke API cloud Supabase...');

    try {
      // 1. Pull Lembaga (Institutions)
      addLog('Mengunduh data profil lembaga...');
      const { data: instData, error: instErr } = await client.from('institutions').select('*').limit(1);
      if (instErr) {
        addLog(`[GAGAL] Mengunduh profil lembaga: ${instErr.message}`);
        throw instErr;
      }
      if (instData && instData.length > 0) {
        const localInst = mapDbToInstitution(instData[0]);
        setInstitution(localInst);
        addLog(`[SUKSES] Profil Lembaga diimpor: "${localInst.name}"`);
      } else {
        addLog('[INFO] Tidak ditemukan record lembaga di Supabase. Dilewati.');
      }

      // 2. Pull Guru (Teachers)
      addLog('Mengunduh data Guru...');
      const { data: teachData, error: teachErr } = await client.from('teachers').select('*');
      if (teachErr) {
        addLog(`[GAGAL] Mengunduh Guru: ${teachErr.message}`);
        throw teachErr;
      }
      if (teachData && teachData.length > 0) {
        const localTeachers = teachData.map(mapDbToTeacher);
        setTeachers(localTeachers);
        addLog(`[SUKSES] ${localTeachers.length} Guru berhasil diimpor.`);
      } else {
        addLog('[INFO] Tidak ada data guru di Supabase.');
      }

      // 3. Pull Siswa (Students)
      addLog('Mengunduh data Siswa...');
      const { data: studData, error: studErr } = await client.from('students').select('*');
      if (studErr) {
        addLog(`[GAGAL] Mengunduh Siswa: ${studErr.message}`);
        throw studErr;
      }
      if (studData && studData.length > 0) {
        const localStudents = studData.map(mapDbToStudent);
        setStudents(localStudents);
        addLog(`[SUKSES] ${localStudents.length} Siswa berhasil diimpor ke memori lokal.`);
      } else {
        addLog('[INFO] Tidak ada data siswa di Supabase.');
      }

      // 4. Pull Rombel Kelas (Classes)
      addLog('Mengunduh data Rombel Kelas...');
      const { data: classData, error: classPullErr } = await client.from('classes').select('*');
      if (classPullErr) {
        addLog(`[GAGAL] Mengunduh Rombel Kelas: ${classPullErr.message}`);
        throw classPullErr;
      }
      if (classData && classData.length > 0) {
        const localClasses = classData.map(mapDbToClass);
        setClasses(localClasses);
        addLog(`[SUKSES] ${localClasses.length} Rombel Kelas berhasil diimpor.`);
      } else {
        addLog('[INFO] Tidak ada data Rombel Kelas di Supabase.');
      }

      // 5. Pull Notifikasi (Notifications)
      addLog('Mengunduh riwayat notifikasi...');
      const { data: notifData, error: notifErr } = await client.from('notifications').select('*');
      if (notifErr) {
        addLog(`[GAGAL] Mengunduh Notifikasi: ${notifErr.message}`);
        throw notifErr;
      }
      if (notifData && notifData.length > 0) {
        const localNotifs = notifData.map(mapDbToNotification);
        setNotifications(localNotifs);
        addLog(`[SUKSES] ${localNotifs.length} Notifikasi berhasil diimpor.`);
      }

      addLog('==============================================');
      addLog('🎉 [SUKSES TOTAL] Sinkronisasi unduhan (PULL) berhasil diselesaikan! Seluruh data diubah.');
      addToast('Sinkronisasi PULL selesai, memori browser diperbarui!', 'Database PULL', 'success');
      addNotification('Sinkronisasi PULL Selesai', 'Data administratif Anda telah disinkronkan secara total dengan cloud Supabase.');
    } catch (err: any) {
      addLog(`[FATAL SINKRONISASI] Gagal mengunduh: ${err.message || 'Kesalahan REST API'}`);
      addToast(`Gagal melakukan sinkronisasi: ${err.message}`, 'Database PULL', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const sqlCode = `-- SCHEMA DATABASE UNTUK SUPABASE (IDEMPOTENT / RE-RUNNABLE)
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

NOTIFY pgrst, 'reload schema';

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
    wali_kelas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add wali_kelas if upgrading existing database
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='classes' AND column_name='wali_kelas') THEN
        ALTER TABLE classes ADD COLUMN wali_kelas TEXT;
    END IF;
END $$; NOTIFY pgrst, 'reload schema';

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
-- 7b. TABEL E-MATERI (e_materi)
-- ==========================================
CREATE TABLE IF NOT EXISTS e_materi (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    mapel_id VARCHAR(100),
    judul TEXT NOT NULL,
    deskripsi TEXT,
    tipe VARCHAR(50) NOT NULL,
    url TEXT,
    tanggal_upload TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    pengunggah TEXT,
    guru_id VARCHAR(100),
    kelas_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 7c. TABEL MUTASI, KENAIKAN, KELULUSAN (student management)
-- ==========================================
CREATE TABLE IF NOT EXISTS student_mutations (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id VARCHAR(100) NOT NULL,
    jenis_mutasi VARCHAR(50) NOT NULL,
    tanggal DATE NOT NULL,
    alasan TEXT,
    sekolah_asal_tujuan VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS class_promotions (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id VARCHAR(100) NOT NULL,
    kelas_asal VARCHAR(50) NOT NULL,
    kelas_tujuan VARCHAR(50) NOT NULL,
    tanggal DATE NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_graduations (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    student_id VARCHAR(100) NOT NULL,
    tahun_lulus VARCHAR(10) NOT NULL,
    no_ijazah VARCHAR(100),
    tanggal DATE NOT NULL,
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

-- Trigger untuk e_materi
DROP TRIGGER IF EXISTS update_e_materi_modtime ON e_materi;
CREATE TRIGGER update_e_materi_modtime
    BEFORE UPDATE ON e_materi
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
NOTIFY pgrst, 'reload schema';`;

  const fallbackCopy = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        addToast('SQL berhasil disalin ke clipboard!', 'Salin SQL', 'success');
        setTimeout(() => setCopied(false), 2000);
      } else {
        addToast('Gagal menyalin otomatis. Silakan seleksi teks SQL di bawah lalu tekan Ctrl+C.', 'Salin SQL', 'error');
      }
    } catch (err) {
      console.error('Fallback copy failed', err);
      addToast('Gagal menyalin otomatis. Silakan seleksi teks SQL di bawah lalu tekan Ctrl+C.', 'Salin SQL', 'error');
    }
  };

  const handleCopy = () => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(sqlCode)
          .then(() => {
            setCopied(true);
            addToast('SQL berhasil disalin ke clipboard!', 'Salin SQL', 'success');
            setTimeout(() => setCopied(false), 2000);
          })
          .catch((err) => {
            console.warn('Navigator clipboard failed, trying fallback...', err);
            fallbackCopy(sqlCode);
          });
      } else {
        fallbackCopy(sqlCode);
      }
    } catch (e) {
      fallbackCopy(sqlCode);
    }
  };

  const steps = [
    {
      number: 1,
      title: "Buat Database Supabase",
      desc: "Masuk ke dashboard Supabase Anda, buat project baru, dan tunggu hingga database siap digunakan."
    },
    {
      number: 2,
      title: "Buka SQL Editor",
      desc: "Klik menu 'SQL Editor' (ikon terminal) di bilah navigasi samping kiri panel Supabase Anda."
    },
    {
      number: 3,
      title: "Tempel (Paste) & Jalankan",
      desc: "Buat query baru dengan tombol '+ New Query', tempelkan seluruh kode SQL di samping, lalu klik tombol 'Run'."
    },
    {
      number: 4,
      title: "Selesai & Sinkron!",
      desc: "Tabel institutions, classes, teachers, students, dan notifications telah siap dengan relasi, RLS Security, dan trigger waktu."
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in block text-left">
      {/* Top Banner */}
      <div className="bento-card bg-slate-900 text-white relative overflow-hidden p-6 rounded-3xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-500/25">
              <Database size={11} />
              <span>Supabase Cloud Integration</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Sinkronisasi Database Supabase</h2>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Dua fungsi utama tersedia: menyalin skema SQL PostgreSQL untuk disiapkan di editor Supabase, atau mengisi kredensial API untuk mengaktifkan sinkronisasi otomatis / dua arah secara langsung!
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-3">
            <button
              onClick={() => setActiveSubTab('sync')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === 'sync'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              Koneksi & Sinkronisasi
            </button>
            <button
              onClick={() => setActiveSubTab('sql')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeSubTab === 'sql'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              SQL Schema Copy
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'sync' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bento-card bg-white p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Wifi size={16} className={connectionStatus === 'connected' ? 'text-emerald-600' : 'text-slate-400'} />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Pengaturan Supabase</h3>
                </div>
                {connectionStatus === 'connected' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Offline Mode
                  </span>
                )}
              </div>

              <div className="space-y-4 text-xs">
                {isUsingEnv && (
                  <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-2xl text-[10px] leading-relaxed flex items-start gap-2">
                    <Sparkles size={14} className="flex-shrink-0 mt-0.5 text-indigo-600" />
                    <span>Terdeteksi kredensial Supabase dari file <strong>.env</strong>. Sistem menggunakan file konfigurasi tersebut secara otomatis.</span>
                  </div>
                )}

                {/* Supabase URL */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Supabase URL</label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://xxxxxx.supabase.co"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50 font-mono text-xs text-slate-800"
                  />
                </div>

                {/* Supabase Anon Key */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 block">Supabase Anon Key</label>
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="text-slate-500 hover:text-slate-800 flex items-center space-x-1"
                    >
                      {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span className="text-[10px]">{showKey ? 'Sembunyikan' : 'Lihat'}</span>
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={supabaseAnonKey}
                    onChange={(e) => setSupabaseAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-slate-50 font-mono text-xs text-slate-800"
                  />
                </div>

                {/* Toggle Auto Sync */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <label className="font-bold text-slate-800 block">Sinkronisasi Otomatis</label>
                    <p className="text-[10px] text-slate-500 leading-normal mt-0.5">Tiap tambah/edit siswa & guru otomatis tersimpan ke Supabase cloud.</p>
                  </div>
                  <button
                    onClick={() => handleToggleAutoSync(!autoSync)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSync ? 'bg-slate-900' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSync ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={handleTestConnection}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200"
                  >
                    <span>Cek Koneksi</span>
                  </button>
                  <button
                    onClick={handleSaveConfig}
                    className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
                  >
                    <Save size={13} />
                    <span>Simpan & Connect</span>
                  </button>
                </div>

                {connectionMessage && (
                  <div className={`p-3 rounded-2xl border text-[10px] leading-relaxed flex items-start gap-2 ${
                    connectionStatus === 'connected' 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                      : connectionStatus === 'testing'
                      ? 'bg-slate-50 border-slate-200 text-slate-600'
                      : 'bg-rose-50 border-rose-100 text-rose-800'
                  }`}>
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>{connectionMessage}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Local Stats Card */}
            <div className="bento-card bg-white p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
                <div className="w-1.5 h-4 bg-slate-900 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono">Data State Saat Ini</h3>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Profil Lembaga</span>
                  <span className="font-bold text-slate-800">{institution.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Total Guru & Staf</span>
                  <span className="font-bold text-slate-800">{teachers.length} Orang</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-semibold">Total Siswa Terdaftar</span>
                  <span className="font-bold text-slate-800">{students.length} Orang</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-semibold">Riwayat Notifikasi</span>
                  <span className="font-bold text-slate-800">{notifications.length} Riwayat</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Engine Terminal Panel */}
          <div className="lg:col-span-2 flex flex-col space-y-6">
            <div className="bento-card bg-white p-6 rounded-3xl flex-1 flex flex-col space-y-4 min-h-[400px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mesin Sinkronisasi Dua Arah</h3>
                  <p className="text-[11px] text-slate-400">Hubungkan secara massal lokal state browser ke Supabase cloud</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePullData}
                    disabled={isSyncing || connectionStatus !== 'connected'}
                    className="px-4 py-2.5 bg-sky-50 text-sky-800 border border-sky-150 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
                  >
                    <ArrowDown size={13} className={isSyncing ? 'animate-bounce' : ''} />
                    <span>Tarik Data (PULL)</span>
                  </button>
                  
                  <button
                    onClick={handlePushData}
                    disabled={isSyncing || connectionStatus !== 'connected'}
                    className="px-4 py-2.5 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md border border-emerald-500"
                  >
                    <ArrowUp size={13} className={isSyncing ? 'animate-bounce' : ''} />
                    <span>Kirim Data (PUSH)</span>
                  </button>
                </div>
              </div>

              {/* Terminal Logs Log */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex-1 flex flex-col min-h-[300px]">
                <div className="bg-slate-950 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Terminal size={11} />
                    <span>supabase-sync-terminal.sh</span>
                  </span>
                </div>
                
                <div className="p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex-1 space-y-1 text-left bg-slate-950 text-slate-300 min-h-[250px] max-h-[350px]">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 italic py-6 text-center text-xs">
                      [Menunggu Aktivitas] Klik "Cek Koneksi", "Simpan & Connect", atau tombol PUSH/PULL di atas untuk melihat log detail transaksi database.
                    </div>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className={
                        log.includes('[SUKSES]') ? 'text-emerald-400' :
                        log.includes('[ERROR]') || log.includes('[FATAL]') ? 'text-rose-400 font-bold' :
                        log.includes('[INFO]') ? 'text-sky-400' : 'text-slate-300'
                      }>
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-2.5">
                <AlertCircle size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  <strong>Penting:</strong> Supabase mewajibkan Anda untuk menjalankan SQL Script terlebih dahulu (di bilah menu SQL Editor Supabase) agar tabel-tabel terstruktur terbentuk secara resmi sebelum melakukan sinkronisasi massal (PUSH atau PULL) di atas.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Instructions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Step list */}
            <div className="bento-card bg-white p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Langkah Impor SQL</h3>
              </div>

              <div className="space-y-4">
                {steps.map((st) => (
                  <div 
                    key={st.number}
                    onClick={() => setActiveStep(st.number)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      activeStep === st.number 
                        ? 'bg-slate-50 border-slate-300 ring-1 ring-slate-300' 
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        activeStep === st.number ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.number}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{st.title}</h4>
                    </div>
                    {activeStep === st.number && (
                      <p className="text-xs text-slate-500 mt-2.5 leading-relaxed pl-9 animate-fade-in">
                        {st.desc}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Database Specs Card */}
            <div className="bento-card bg-white p-6 rounded-3xl space-y-4">
              <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Spesifikasi Skema</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                  <span className="text-slate-500 font-medium">DBMS Target</span>
                  <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-md">PostgreSQL v15+</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                  <span className="text-slate-500 font-medium">Auto UUID Generator</span>
                  <span className="text-slate-800 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>uuid-ossp (v4)</span>
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                  <span className="text-slate-500 font-medium">Row Level Security (RLS)</span>
                  <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] uppercase">ENABLED</span>
                </div>
                <div className="flex items-center justify-between py-1 text-xs">
                  <span className="text-slate-500 font-medium">Automatic UpdatedAt</span>
                  <span className="text-slate-800 font-bold">PL/pgSQL Trigger</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: SQL Code Preview Window */}
          <div className="lg:col-span-2 flex flex-col h-full">
            <div className="bento-card bg-white p-6 rounded-3xl flex flex-col flex-1 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Terminal size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">SQL Editor Preview</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Salin skema ini untuk membuat tabel otomatis</p>
                  </div>
                </div>
                <button 
                  onClick={handleCopy}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copied ? 'Tersalin' : 'Salin SQL'}</span>
                </button>
              </div>

              {/* Code Panel */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex-1 flex flex-col min-h-[450px]">
                <div className="bg-slate-950/80 px-4 py-2 flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">supabase_schema.sql</span>
                </div>
                <pre className="p-4 overflow-auto text-slate-100 text-xs font-mono leading-relaxed flex-1 text-left select-all max-h-[500px]">
                  <code>{sqlCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
