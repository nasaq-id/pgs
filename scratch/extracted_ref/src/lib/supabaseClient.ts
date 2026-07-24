import { createClient } from '@supabase/supabase-js';
import { Student, Teacher, Institution, NotificationItem, Kelas, EMateri, StudentMutation, ClassPromotion, StudentGraduation } from '../types';
import { safeJSONParse } from './json';

// Helper to generate RFC4122 v4 compliant UUID

export function ensureUUID(id: string): string {
  if (!id) return id;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  
  const match = id.match(/^(mapel|class|sched)-(\d+)$/);
  if (match) {
    const type = match[1];
    const num = match[2].padStart(12, '0');
    if (type === 'mapel') return `00000000-0000-4000-8000-${num}`;
    if (type === 'class') return `00000000-0000-4001-8000-${num}`;
    if (type === 'sched') return `00000000-0000-4002-8000-${num}`;
  }
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to get stored Supabase config
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  autoSync: boolean;
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  
  // Prioritize environment variables (e.g. from Vercel integration) over localStorage
  let url = (envUrl || localStorage.getItem('supabase_url') || '').trim();
  let anonKey = (envAnonKey || localStorage.getItem('supabase_anon_key') || '').trim();
  
  // Format URL if not starting with http
  if (url && !url.startsWith('http')) {
    url = `https://${url}`;
  }
  
  // Clean URL trailing slash and accidental endpoints
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/rest/v1')) url = url.slice(0, -8);
  if (url.endsWith('/graphql/v1')) url = url.slice(0, -11);
  
  const storedAutoSync = localStorage.getItem('supabase_auto_sync');
  const autoSync = (envUrl && envAnonKey) ? true : (storedAutoSync !== null ? storedAutoSync === 'true' : (url && anonKey ? true : false));
  
  return { url, anonKey, autoSync };
}

export function saveStoredSupabaseConfig(config: Partial<SupabaseConfig>) {
  if (config.url !== undefined) {
    let sanitizedUrl = config.url.trim();
    if (sanitizedUrl && !sanitizedUrl.startsWith('http')) sanitizedUrl = `https://${sanitizedUrl}`;
    // Strip trailing slash
    if (sanitizedUrl.endsWith('/')) sanitizedUrl = sanitizedUrl.slice(0, -1);
    // Strip accidental /rest/v1 if user pasted it
    if (sanitizedUrl.endsWith('/rest/v1')) sanitizedUrl = sanitizedUrl.slice(0, -8);
    if (sanitizedUrl.endsWith('/graphql/v1')) sanitizedUrl = sanitizedUrl.slice(0, -11);
    localStorage.setItem('supabase_url', sanitizedUrl);
  }
  if (config.anonKey !== undefined) {
    localStorage.setItem('supabase_anon_key', config.anonKey.trim());
  }
  if (config.autoSync !== undefined) {
    localStorage.setItem('supabase_auto_sync', String(config.autoSync));
  }
}

// Instantiate client lazily to avoid crashing if keys are blank
export function getSupabaseClient() {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) return null;
  try {
    return createClient(url, anonKey, {
      auth: {
        persistSession: false
      }
    });
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

// Test Supabase connection by making a fast query
export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL dan Anon Key tidak boleh kosong' };
  }
  try {
    const tempClient = createClient(url, anonKey, {
      auth: { persistSession: false }
    });
    // Query a simple select to verify keys and network connectivity
    const { error } = await tempClient.from('institutions').select('npsn').limit(1);
    
    if (error) {
      // If error is table not found (42P01 or PGRST125), connection is valid but schema needs to be run
      if (error.code === '42P01' || error.code === 'PGRST125') {
        return { 
          success: true, 
          message: 'Koneksi ke Supabase berhasil! Namun, tabel belum terbentuk di database Anda. Silakan salin script SQL dari tab "SQL Schema Copy" dan jalankan di SQL Editor Supabase Anda.' 
        };
      }
      return { success: false, message: `Error (${error.code}): ${error.message}` };
    }
    
    return { success: true, message: 'Koneksi berhasil! Database dan tabel siap disinkronisasikan.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Koneksi gagal. Periksa kembali URL dan Anon Key Anda.' };
  }
}

// ==========================================
// MAPPING UTILITIES (Front-End <-> Database)
// ==========================================

export function cleanDate(d: any): string | null {
  if (!d) return null;
  const s = String(d).trim();
  if (s === "" || s === "null" || s === "undefined" || s === "-") return null;
  
  // If it's YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const parsed = Date.parse(s);
    return isNaN(parsed) ? null : s;
  }
  
  // If it's DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [day, month, year] = s.split('/');
    const isoStr = `${year}-${month}-${day}`;
    const parsed = Date.parse(isoStr);
    return isNaN(parsed) ? null : isoStr;
  }
  
  // Otherwise, try to parse
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    try {
      const dObj = new Date(parsed);
      const year = dObj.getFullYear();
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const day = String(dObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

export function mapStudentToDb(student: Student) {
  return {
    id: student.id,
    nisn: student.nisn || "",
    nis: student.nis || "",
    nama: student.nama,
    username: student.username || `user_${student.id.substring(0, 8)}`,
    kelas: student.kelas,
    jk: student.jk,
    tempat_lahir: student.tempatLahir || "",
    tanggal_lahir: cleanDate(student.tanggalLahir),
    wali: student.wali || "",
    status: student.status,
    nik: student.nik || "",
    kewarganegaraan: student.kewarganegaraan,
    password: student.password || "password123",
    jumlah_saudara: student.jumlahSaudara || "",
    anak_ke: student.anakKe || "",
    agama: student.agama || "",
    cita_cita: student.citaCita || "",
    hp: student.hp || "",
    email: student.email || "",
    hoby: student.hoby || "",
    pembiaya: student.pembiaya || "",
    foto: student.foto || "",
    ayah: student.ayah,
    ibu: student.ibu,
    wali_data: student.waliData,
    alamat: student.alamat
  };
}

export function mapDbToStudent(row: any): Student {
  return {
    id: row.id,
    nisn: row.nisn,
    nis: row.nis,
    nama: row.nama,
    username: row.username,
    kelas: row.kelas,
    jk: row.jk,
    tempatLahir: row.tempat_lahir || '',
    tanggalLahir: row.tanggal_lahir || '',
    wali: row.wali || '',
    status: row.status || 'Aktif',
    nik: row.nik || '',
    kewarganegaraan: row.kewarganegaraan || 'WNI',
    password: row.password || 'password123',
    jumlahSaudara: row.jumlah_saudara || '',
    anakKe: row.anak_ke || '',
    agama: row.agama || 'Islam',
    citaCita: row.cita_cita || '',
    hp: row.hp || '',
    email: row.email || '',
    hoby: row.hoby || '',
    pembiaya: row.pembiaya || '',
    foto: row.foto || '',
    ayah: row.ayah || {},
    ibu: row.ibu || {},
    waliData: row.wali_data || {},
    alamat: row.alamat || {}
  };
}

export function mapTeacherToDb(teacher: Teacher) {
  return {
    id: teacher.id,
    foto: teacher.foto || "",
    nip: teacher.nipNuptk || "",
    nuptk: "",
    nik: teacher.nik || "",
    nama: teacher.nama,
    jk: teacher.jk,
    tempat_lahir: teacher.tempatLahir || "",
    tanggal_lahir: cleanDate(teacher.tanggalLahir), // dates shouldn't be empty string
    hp: teacher.hp || "",
    email: teacher.email || "",
    username: teacher.username || "",
    password: teacher.password || "",
    status_pegawai: teacher.statusPegawai || "",
    kategori: teacher.kategori || "",
    jabatan: teacher.tugasUtama || "",
    tugas_utama: teacher.tugasUtama || "",
    tugas_tambahan: teacher.tugasTambahan || "",
    mulai_bertugas: cleanDate(teacher.mulaiBertugas), // dates shouldn't be empty string
    akhir_bertugas: cleanDate(teacher.akhirBertugas), // dates shouldn't be empty string
    jam_pelajaran: teacher.jamPelajaran || 0,
    pendidikan_terakhir: teacher.pendidikanTerakhir || "",
    instansi_sd: teacher.instansiSD || "",
    instansi_smp: teacher.instansiSMP || "",
    instansi_sma: teacher.instansiSMA || "",
    instansi_d1: teacher.instansiD1 || "",
    jurusan_d1: teacher.jurusanD1 || "",
    instansi_d2: teacher.instansiD2 || "",
    jurusan_d2: teacher.jurusanD2 || "",
    instansi_d3: teacher.instansiD3 || "",
    jurusan_d3: teacher.jurusanD3 || "",
    instansi_d4: teacher.instansiD4 || "",
    jurusan_d4: teacher.jurusanD4 || "",
    instansi_s1: teacher.instansiS1 || "",
    jurusan_s1: teacher.jurusanS1 || "",
    instansi_s2: teacher.instansiS2 || "",
    jurusan_s2: teacher.jurusanS2 || "",
    instansi_s3: teacher.instansiS3 || "",
    jurusan_s3: teacher.jurusanS3 || "",
    alamat: teacher.alamat || "",
    status: teacher.status || "Aktif",
  };
}

export function mapDbToTeacher(row: any): Teacher {
  return {
    id: row.id,
    nipNuptk: row.nip || row.nuptk || "",
    nik: row.nik || "",
    nama: row.nama || "",
    jk: row.jk || "Laki-laki",
    tempatLahir: row.tempat_lahir || "",
    tanggalLahir: row.tanggal_lahir || "",
    username: row.username || "",
    password: row.password || "",
    statusPegawai: row.status_pegawai || "Honor",
    kategori: row.kategori || "Guru",
    tugasUtama: row.tugas_utama || row.jabatan || "",
    tugasTambahan: row.tugas_tambahan || "",
    mulaiBertugas: row.mulai_bertugas || "",
    akhirBertugas: row.akhir_bertugas || "",
    jamPelajaran: row.jam_pelajaran || 0,
    pendidikanTerakhir: row.pendidikan_terakhir || "",
    instansiSD: row.instansi_sd || "",
    instansiSMP: row.instansi_smp || "",
    instansiSMA: row.instansi_sma || "",
    instansiD1: row.instansi_d1 || "",
    jurusanD1: row.jurusan_d1 || "",
    instansiD2: row.instansi_d2 || "",
    jurusanD2: row.jurusan_d2 || "",
    instansiD3: row.instansi_d3 || "",
    jurusanD3: row.jurusan_d3 || "",
    instansiD4: row.instansi_d4 || "",
    jurusanD4: row.jurusan_d4 || "",
    instansiS1: row.instansi_s1 || "",
    jurusanS1: row.jurusan_s1 || "",
    instansiS2: row.instansi_s2 || "",
    jurusanS2: row.jurusan_s2 || "",
    instansiS3: row.instansi_s3 || "",
    jurusanS3: row.jurusan_s3 || "",
    alamat: row.alamat || "",
    status: row.status || "Aktif",
    hp: row.hp || "",
    email: row.email || "",
    foto: row.foto || ""
  };
}

export function mapInstitutionToDb(inst: Institution) {
  return {
    name: inst.name,
    npsn: inst.npsn,
    accreditation: inst.accreditation,
    curriculum: inst.curriculum,
    principal: inst.principal,
    email: inst.email,
    website: inst.website,
    phone: inst.phone,
    address: inst.address,
    organizer: inst.organizer,
    level: inst.level,
    status: inst.status,
    academic_year: inst.academicYear,
    semester: inst.semester,
    logo: inst.logo,
    instagram: inst.social?.instagram || { user: '', url: '' },
    facebook: inst.social?.facebook || { user: '', url: '' },
    tiktok: inst.social?.tiktok || { user: '', url: '' },
    youtube: inst.social?.youtube || { user: '', url: '' }
  };
}

export function mapDbToInstitution(row: any): Institution {
  return {
    name: row.name,
    npsn: row.npsn,
    accreditation: row.accreditation || '',
    curriculum: row.curriculum || '',
    principal: row.principal || '',
    email: row.email || '',
    website: row.website || '',
    phone: row.phone || '',
    address: row.address || '',
    organizer: row.organizer || '',
    level: row.level || '',
    status: row.status || '',
    academicYear: row.academic_year || '2025/2026',
    semester: row.semester || 'GANJIL',
    social: {
      instagram: row.instagram || { user: '', url: '' },
      facebook: row.facebook || { user: '', url: '' },
      tiktok: row.tiktok || { user: '', url: '' },
      youtube: row.youtube || { user: '', url: '' }
    },
    logo: row.logo || ''
  };
}

export function mapNotificationToDb(notif: NotificationItem) {
  return {
    id: notif.id,
    title: notif.title,
    message: notif.message,
    time: notif.time,
    read: notif.read
  };
}

export function mapDbToNotification(row: any): NotificationItem {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    time: row.time || 'Baru saja',
    read: row.read || false
  };
}

export function mapClassToDb(cls: Kelas) {
  return {
    id: ensureUUID(cls.id),
    tingkat: cls.tingkat,
    nama: cls.nama,
    kapasitas: cls.kapasitas,
    siswa_ids: cls.siswaIds,
    wali_kelas: cls.waliKelas || ''
  };
}

export function mapDbToClass(row: any): Kelas {
  return {
    id: row.id,
    tingkat: row.tingkat || '',
    nama: row.nama || '',
    kapasitas: row.kapasitas || 0,
    siswaIds: row.siswa_ids || [],
    waliKelas: row.wali_kelas || ''
  };
}

// ==========================================
// PERSISTENCE & LIVE AUTO-SYNC OPERATIONS
// ==========================================

// Helper to auto-sync a single student record
export async function syncStudentToSupabase(student: Student, force = false): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const dbRecord = mapStudentToDb(student);
    const { error } = await client.from('students').upsert(dbRecord, { onConflict: 'id' });
    if (error) {
      console.error('Supabase student auto-sync error:', error);
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to auto-sync student to Supabase:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// Helper to delete a single student from Supabase
export async function deleteStudentFromSupabase(studentId: string, force = true): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const { error } = await client.from('students').delete().eq('id', studentId);
    if (error) {
      console.error('Supabase student delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete student from Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Helper to auto-sync a single teacher record
export async function syncTeacherToSupabase(teacher: Teacher, force = false): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const dbRecord = mapTeacherToDb(teacher);
    const { error } = await client.from('teachers').upsert(dbRecord, { onConflict: 'id' });
    if (error) {
      console.error('Supabase teacher auto-sync error:', error);
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to auto-sync teacher to Supabase:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// Helper to delete a single teacher from Supabase
export async function deleteTeacherFromSupabase(teacherId: string, force = true): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const { error } = await client.from('teachers').delete().eq('id', teacherId);
    if (error) {
      console.error('Supabase teacher delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete teacher from Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Helper to auto-sync institution data
export async function syncInstitutionToSupabase(institution: Institution, force = false): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const dbRecord = mapInstitutionToDb(institution);
    const { error } = await client.from('institutions').upsert(dbRecord, { onConflict: 'npsn' });
    if (error) {
      console.error('Supabase institution auto-sync error:', error);
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to auto-sync institution to Supabase:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// Helper to auto-sync a single class record
export async function syncClassToSupabase(classObj: Kelas, force = false): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const dbRecord = mapClassToDb(classObj);
    const { error } = await client.from('classes').upsert(dbRecord, { onConflict: 'id' });
    if (error) {
      console.error('Supabase class auto-sync error:', error);
      return { success: false, error: `Database error (${error.code}): ${error.message}` };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to auto-sync class to Supabase:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

// Helper to delete a single class from Supabase
export async function deleteClassFromSupabase(classId: string, force = true): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  const { autoSync } = getStoredSupabaseConfig();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  if (!autoSync && !force) return { success: false, error: 'Auto-sync belum aktif' };

  try {
    const { error } = await client.from('classes').delete().eq('id', ensureUUID(classId));
    if (error) {
      console.error('Supabase class delete error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete class from Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Fetch all data from Supabase in one go (used for initial load)

// --- MATA PELAJARAN ---
export function mapSubjectToDb(sub: any) {
  return {
    id: ensureUUID(sub.id),
    kode: sub.kode,
    nama: sub.nama,
    tingkat: sub.tingkat,
    kategori: sub.kategori,
    jumlah_jam: sub.jumlahJam,
    guru_pengampu: sub.guruPengampu || ''
  };
}

export function mapDbToSubject(row: any) {
  return {
    id: row.id,
    kode: row.kode || '',
    nama: row.nama || '',
    tingkat: row.tingkat || 'Semua',
    kategori: row.kategori || 'Mapel Wajib',
    jumlahJam: row.jumlah_jam || 2,
    guruPengampu: row.guru_pengampu || ''
  };
}

// --- JADWAL PELAJARAN ---
export function mapScheduleToDb(sched: any) {
  return {
    id: ensureUUID(sched.id),
    kelas_id: ensureUUID(sched.kelasId),
    mapel_id: ensureUUID(sched.mapelId),
    hari: sched.hari,
    jam_mulai: sched.jamMulai || null,
    jam_selesai: sched.jamSelesai || null,
    guru: sched.guru,
    jp_start: sched.jpStart !== undefined && sched.jpStart !== null ? sched.jpStart : 1,
    jp_count: sched.jpCount !== undefined && sched.jpCount !== null ? sched.jpCount : 2
  };
}

export function mapDbToSchedule(row: any) {
  // Convert "07:30:00" to "07:30" if needed
  let jMulai = row.jam_mulai || '';
  if (jMulai.length > 5) jMulai = jMulai.substring(0, 5);
  let jSelesai = row.jam_selesai || '';
  if (jSelesai.length > 5) jSelesai = jSelesai.substring(0, 5);
  
  return {
    id: row.id,
    kelasId: row.kelas_id || '',
    mapelId: row.mapel_id || '',
    hari: row.hari || 'Senin',
    jamMulai: jMulai,
    jamSelesai: jSelesai,
    guru: row.guru || '',
    jpStart: row.jp_start !== undefined && row.jp_start !== null ? row.jp_start : undefined,
    jpCount: row.jp_count !== undefined && row.jp_count !== null ? row.jp_count : undefined
  };
}

export async function syncSubjectToSupabase(sub: any, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client not initialized' };
  try {
    const dbRecord = mapSubjectToDb(sub);
    const { error } = await client.from('mata_pelajaran').upsert(dbRecord, { onConflict: 'id' });
    if (error) { console.error('Supabase Subject Error:', error); return { success: false, error: error.message }; }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteSubjectFromSupabase(subId: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client not initialized' };
  try {
    const { error } = await client.from('mata_pelajaran').delete().eq('id', ensureUUID(subId));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function syncScheduleToSupabase(sched: any, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client not initialized' };
  try {
    // Ensure referenced class exists in Supabase to avoid FK constraint violation
    if (sched.kelasId) {
      try {
        const savedClassesStr = localStorage.getItem('mts_classes');
        if (savedClassesStr) {
          const localClasses: Kelas[] = safeJSONParse(savedClassesStr) || [];
          const foundClass = localClasses.find(c => c && c.id === sched.kelasId);
          if (foundClass) {
            const dbClass = mapClassToDb(foundClass);
            await client.from('classes').upsert(dbClass, { onConflict: 'id' });
          }
        }
      } catch (e) {
        console.warn('Failed to pre-sync class for schedule:', e);
      }
    }

    // Ensure referenced subject exists in Supabase to avoid FK constraint violation
    if (sched.mapelId) {
      try {
        const savedSubjectsStr = localStorage.getItem('mts_subjects');
        if (savedSubjectsStr) {
          const localSubjects = safeJSONParse(savedSubjectsStr) || [];
          const foundSubject = localSubjects.find((s: any) => s && s.id === sched.mapelId);
          if (foundSubject) {
            const dbSubject = mapSubjectToDb(foundSubject);
            await client.from('mata_pelajaran').upsert(dbSubject, { onConflict: 'id' });
          }
        }
      } catch (e) {
        console.warn('Failed to pre-sync subject for schedule:', e);
      }
    }

    const dbRecord = mapScheduleToDb(sched);
    const { error } = await client.from('jadwal_pelajaran').upsert(dbRecord, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteScheduleFromSupabase(schedId: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Client not initialized' };
  try {
    const { error } = await client.from('jadwal_pelajaran').delete().eq('id', ensureUUID(schedId));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// === e_materi mapping and sync helpers ===
export function mapEMateriToDb(materi: EMateri) {
  return {
    id: ensureUUID(materi.id),
    mapel_id: materi.mapelId ? ensureUUID(materi.mapelId) : null,
    judul: materi.judul,
    deskripsi: materi.deskripsi,
    tipe: materi.tipe,
    url: materi.url,
    tanggal_upload: materi.tanggalUpload,
    pengunggah: materi.pengunggah,
    guru_id: materi.guruId ? ensureUUID(materi.guruId) : null,
    kelas_id: materi.kelasId ? ensureUUID(materi.kelasId) : null
  };
}

export function mapDbToEMateri(row: any): EMateri {
  return {
    id: row.id,
    mapelId: row.mapel_id || '',
    judul: row.judul || '',
    deskripsi: row.deskripsi || '',
    tipe: row.tipe || 'Dokumen',
    url: row.url || '',
    tanggalUpload: row.tanggal_upload || '',
    pengunggah: row.pengunggah || '',
    guruId: row.guru_id || undefined,
    kelasId: row.kelas_id || undefined
  };
}

export async function syncEMateriToSupabase(materi: EMateri, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const dbRecord = mapEMateriToDb(materi);
    const { error } = await client.from('e_materi').upsert(dbRecord, { onConflict: 'id' });
    if (error) {
      console.error('Supabase E-Materi Error:', error);
      
      // Strict Error Evaluation & Recovery Instructions for Supabase
      let recoveryMsg = `Supabase error (${error.code}): ${error.message}.`;
      if (error.code === 'PGRST116' || error.message.includes('relation "public.e_materi" does not exist') || error.code === '42P01') {
        recoveryMsg += ' [ANALISIS KEGAGALAN] Tabel "e_materi" belum terbuat di Supabase database Anda. Solusi: Harap buka SQL Editor Supabase Anda dan eksekusi query CREATE TABLE untuk e_materi, lalu muat ulang schema cache.';
      } else if (error.message.includes('Row Level Security') || error.code === '42501') {
        recoveryMsg += ' [ANALISIS KEGAGALAN] Aturan Row Level Security (RLS) menghalangi proses insert/update data. Solusi: Aktifkan kebijakan INSERT/UPDATE/DELETE/SELECT untuk role anon di tabel "e_materi" atau nonaktifkan RLS sementara agar sinkronisasi lancar.';
      } else {
        recoveryMsg += ' [ANALISIS KEGAGALAN] Terjadi ketidaksesuaian tipe data atau skema kolom antara aplikasi dan database Supabase. Solusi: Periksa keselarasan kolom tabel "e_materi" (id, mapel_id, judul, deskripsi, tipe, url, tanggal_upload, pengunggah, guru_id, kelas_id).';
      }
      return { success: false, error: recoveryMsg };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Kegagalan jaringan/sistem: ${err.message || err}` };
  }
}

export async function deleteEMateriFromSupabase(id: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const { error } = await client.from('e_materi').delete().eq('id', ensureUUID(id));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// === Student Mutation mapping and sync helpers ===
export function mapMutationToDb(mut: StudentMutation) {
  return {
    id: ensureUUID(mut.id),
    student_id: ensureUUID(mut.studentId),
    jenis_mutasi: mut.jenisMutasi,
    tanggal: cleanDate(mut.tanggal),
    alasan: mut.alasan,
    sekolah_asal_tujuan: mut.sekolahAsalTujuan
  };
}

export function mapDbToMutation(row: any): StudentMutation {
  return {
    id: row.id,
    studentId: row.student_id || '',
    jenisMutasi: row.jenis_mutasi || 'Mutasi/Pindah',
    tanggal: row.tanggal || '',
    alasan: row.alasan || '',
    sekolahAsalTujuan: row.sekolah_asal_tujuan || '',
    created_at: row.created_at
  };
}

export async function syncMutationToSupabase(mut: StudentMutation, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const dbRecord = mapMutationToDb(mut);
    const { error } = await client.from('student_mutations').upsert(dbRecord, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteMutationFromSupabase(id: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const { error } = await client.from('student_mutations').delete().eq('id', ensureUUID(id));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// === Class Promotion mapping and sync helpers ===
export function mapPromotionToDb(p: ClassPromotion) {
  return {
    id: ensureUUID(p.id),
    student_id: ensureUUID(p.studentId),
    kelas_asal: p.kelasAsal,
    kelas_tujuan: p.kelasTujuan,
    tanggal: cleanDate(p.tanggal),
    academic_year: p.academicYear
  };
}

export function mapDbToPromotion(row: any): ClassPromotion {
  return {
    id: row.id,
    studentId: row.student_id || '',
    kelasAsal: row.kelas_asal || '',
    kelasTujuan: row.kelas_tujuan || '',
    tanggal: row.tanggal || '',
    academicYear: row.academic_year || '',
    created_at: row.created_at
  };
}

export async function syncPromotionToSupabase(p: ClassPromotion, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const dbRecord = mapPromotionToDb(p);
    const { error } = await client.from('class_promotions').upsert(dbRecord, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deletePromotionFromSupabase(id: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const { error } = await client.from('class_promotions').delete().eq('id', ensureUUID(id));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// === Student Graduation mapping and sync helpers ===
export function mapGraduationToDb(g: StudentGraduation) {
  return {
    id: ensureUUID(g.id),
    student_id: ensureUUID(g.studentId),
    tahun_lulus: g.tahunLulus,
    no_ijazah: g.noIjazah,
    tanggal: cleanDate(g.tanggal)
  };
}

export function mapDbToGraduation(row: any): StudentGraduation {
  return {
    id: row.id,
    studentId: row.student_id || '',
    tahunLulus: row.tahun_lulus || '',
    noIjazah: row.no_ijazah || '',
    tanggal: row.tanggal || '',
    created_at: row.created_at
  };
}

export async function syncGraduationToSupabase(g: StudentGraduation, force = false): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const dbRecord = mapGraduationToDb(g);
    const { error } = await client.from('student_graduations').upsert(dbRecord, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteGraduationFromSupabase(id: string, force = true): Promise<{ success: boolean; error?: string }> {
  const { url, anonKey, autoSync } = getStoredSupabaseConfig();
  if (!url || !anonKey || (!autoSync && !force)) return { success: true };
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };
  try {
    const { error } = await client.from('student_graduations').delete().eq('id', ensureUUID(id));
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


export async function pullAllDataFromSupabase(): Promise<{
  success: boolean;
  students?: Student[];
  teachers?: Teacher[];
  classes?: Kelas[];
  institution?: Institution;
  notifications?: NotificationItem[];
  subjects?: any[];
  schedules?: any[];
  materials?: EMateri[];
  mutations?: StudentMutation[];
  promotions?: ClassPromotion[];
  graduations?: StudentGraduation[];
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client belum dikonfigurasi' };

  try {
    const results = await Promise.allSettled([
      client.from('institutions').select('*').limit(1),
      client.from('teachers').select('*'),
      client.from('students').select('*'),
      client.from('classes').select('*'),
      client.from('notifications').select('*'),
      client.from('mata_pelajaran').select('*'),
      client.from('jadwal_pelajaran').select('*'),
      client.from('e_materi').select('*'),
      client.from('student_mutations').select('*'),
      client.from('class_promotions').select('*'),
      client.from('student_graduations').select('*')
    ]);

    let institution: Institution | undefined;
    let teachers: Teacher[] | undefined;
    let students: Student[] | undefined;
    let classes: Kelas[] | undefined;
    let notifications: NotificationItem[] | undefined;
    let subjects: any[] | undefined;
    let schedules: any[] | undefined;
    let materials: EMateri[] | undefined;
    let mutations: StudentMutation[] | undefined;
    let promotions: ClassPromotion[] | undefined;
    let graduations: StudentGraduation[] | undefined;

    // 1. Institution
    if (results[0].status === 'fulfilled' && !results[0].value.error) {
      const data = results[0].value.data;
      if (data && data.length > 0) {
        institution = mapDbToInstitution(data[0]);
      }
    }

    // 2. Teachers
    if (results[1].status === 'fulfilled' && !results[1].value.error) {
      const data = results[1].value.data;
      if (data) {
        teachers = data.map(mapDbToTeacher);
      }
    }

    // 3. Students
    if (results[2].status === 'fulfilled' && !results[2].value.error) {
      const data = results[2].value.data;
      if (data) {
        students = data.map(mapDbToStudent);
      }
    }

    // 4. Classes
    if (results[3].status === 'fulfilled' && !results[3].value.error) {
      const data = results[3].value.data;
      if (data) {
        classes = data.map(mapDbToClass);
      }
    }

    // 5. Notifications
    if (results[4].status === 'fulfilled' && !results[4].value.error) {
      const data = results[4].value.data;
      if (data) {
        notifications = data.map(mapDbToNotification);
      }
    }

    // 6. Subjects
    if (results[5] && results[5].status === 'fulfilled' && !results[5].value.error) {
      const data = results[5].value.data;
      if (data) {
        subjects = data.map(mapDbToSubject);
      }
    }

    // 7. Schedules
    if (results[6] && results[6].status === 'fulfilled' && !results[6].value.error) {
      const data = results[6].value.data;
      if (data) {
        schedules = data.map(mapDbToSchedule);
      }
    }

    // 8. E-Materi
    if (results[7] && results[7].status === 'fulfilled' && !results[7].value.error) {
      const data = results[7].value.data;
      if (data) {
        materials = data.map(mapDbToEMateri);
      }
    }

    // 9. Mutations
    if (results[8] && results[8].status === 'fulfilled' && !results[8].value.error) {
      const data = results[8].value.data;
      if (data) {
        mutations = data.map(mapDbToMutation);
      }
    }

    // 10. Promotions
    if (results[9] && results[9].status === 'fulfilled' && !results[9].value.error) {
      const data = results[9].value.data;
      if (data) {
        promotions = data.map(mapDbToPromotion);
      }
    }

    // 11. Graduations
    if (results[10] && results[10].status === 'fulfilled' && !results[10].value.error) {
      const data = results[10].value.data;
      if (data) {
        graduations = data.map(mapDbToGraduation);
      }
    }

    const hasAnySuccess = results.some(r => r.status === 'fulfilled' && !(r as any).value.error);
    if (!hasAnySuccess) {
      const firstError = results.find(r => r.status === 'fulfilled' && (r as any).value.error) as any;
      const errMsg = firstError ? firstError.value.error.message : 'Gagal memuat data dari database';
      return { success: false, error: errMsg };
    }

    return {
      success: true,
      institution,
      teachers,
      students,
      classes,
      notifications,
      subjects,
      schedules,
      materials,
      mutations,
      promotions,
      graduations
    };
  } catch (err: any) {
    console.error('Failed to pull all data from Supabase:', err);
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

