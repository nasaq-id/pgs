/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParentData {
  nama: string;
  status: 'Masih Hidup' | 'Sudah Meninggal' | 'Tidak Diketahui';
  wn: 'WNI' | 'WNA';
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  pendidikan: string;
  pekerjaan: string;
  penghasilan: string;
  hp: string;
}

export interface WaliData {
  statusWali: string; // 'Sama dengan ayah kandung' | 'Sama dengan ibu kandung' | 'Lainnya' | ''
  nama: string;
  wn: 'WNI' | 'WNA';
  nik: string;
  hp: string;
  pendidikan: string;
  pekerjaan: string;
  penghasilan: string;
  hubungan: string;
}

export interface AddressDetails {
  kepemilikan: string;
  prov: string;
  kab: string;
  kec: string;
  kel: string;
  rt: string;
  rw: string;
  kodepos: string;
  jalan: string;
}

export interface DomisiliDetails {
  statusTempatTinggal: string;
  jarak: string;
  transportasi: string;
  waktuTempuh: string;
}

export interface Student {
  id: string;
  nisn: string;
  nis: string;
  nama: string;
  username: string;
  kelas: string;
  jk: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  wali: string;
  status: 'Aktif' | 'Non-Aktif' | 'Lulus' | 'Mutasi/Pindah' | 'Dikeluarkan';
  nik: string;
  kewarganegaraan: 'WNI' | 'WNA';
  password: string;
  jumlahSaudara: string;
  anakKe: string;
  agama: string;
  citaCita: string;
  hp: string;
  email: string;
  hoby: string;
  pembiaya: string;
  foto: string;
  ayah: ParentData;
  ibu: ParentData;
  waliData: WaliData;
  alamat: {
    ayah: AddressDetails;
    ibu: AddressDetails & { samaDenganAyah: boolean };
    wali: AddressDetails & { statusAlamatWali: string };
    domisili: DomisiliDetails;
  };
}

export interface Teacher {
  id: string;
  // Informasi Utama
  foto?: string;
  nipNuptk: string;
  nik: string;
  nama: string;
  jk: 'Laki-laki' | 'Perempuan';
  tempatLahir: string;
  tanggalLahir: string;
  hp: string;
  email: string;
  username: string;
  password?: string;

  // Data Kepegawaian
  statusPegawai: string;
  kategori: 'Guru' | 'Tendik';
  tugasUtama: string;
  tugasTambahan: string;
  mulaiBertugas: string;
  akhirBertugas: string;
  jamPelajaran: number;
  pendidikanTerakhir: string;
  instansiSD?: string;
  instansiSMP?: string;
  instansiSMA?: string;
  instansiD1?: string;
  jurusanD1?: string;
  instansiD2?: string;
  jurusanD2?: string;
  instansiD3?: string;
  jurusanD3?: string;
  instansiD4?: string;
  jurusanD4?: string;
  instansiS1?: string;
  jurusanS1?: string;
  instansiS2?: string;
  jurusanS2?: string;
  instansiS3?: string;
  jurusanS3?: string;
  alamat: string;
  status: 'Aktif' | 'Non-Aktif' | 'Lulus' | 'Mutasi/Pindah' | 'Dikeluarkan';
}

export interface KopSettings {
  useColoredBackground: boolean;
  backgroundColor: string;
  separatorLineType: 'none' | 'solid' | 'dashed' | 'double';
  useRoundedRectangle: boolean;
  showLogoLembaga: boolean;
  logoLembagaPosition: 'left' | 'right';
  showLogoKemenag: boolean;
  logoKemenagPosition: 'left' | 'right';
  showLogoKemdikbud: boolean;
  logoKemdikbudPosition: 'left' | 'right';
  showOrganizer: boolean;
  showName: boolean;
  showAddress: boolean;
  showContact: boolean;
  alignment: 'center' | 'left' | 'right';
  useCustomText: boolean;
  customText: string;
  customTextSize: number;
  customTextBold: boolean;
  customTextItalic: boolean;
  customTextPosition: 'top' | 'middle' | 'bottom';
}

export interface Institution {
  name: string;
  npsn: string;
  accreditation: string;
  curriculum: string;
  principal: string;
  email: string;
  website: string;
  phone: string;
  address: string;
  organizer: string;
  level: string;
  status: string;
  academicYear: string;
  semester: 'GANJIL' | 'GENAP';
  academicYears?: { id: string; year: string; semester: 'GANJIL' | 'GENAP'; active: boolean }[];
  social: {
    instagram: { user: string; url: string };
    facebook: { user: string; url: string };
    tiktok: { user: string; url: string };
    youtube?: { user: string; url: string };
  };
  logo?: string;
  kemenagLogo?: string;
  kemdikbudLogo?: string;
  kopSettings?: KopSettings;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface Kelas {
  id: string;
  tingkat: string;
  nama: string;
  kapasitas: number;
  siswaIds: string[];
  waliKelas?: string;
}

export interface Prasarana {
  id: string;
  nama: string;
  tipe: 'Ruang Kelas' | 'Laboratorium' | 'Perpustakaan' | 'Kantor Guru' | 'Fasilitas Olahraga' | 'Lainnya';
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  luas: number; // m2
  keterangan: string;
}

export interface Sarana {
  id: string;
  nama: string;
  kategori: 'Elektronik' | 'Meubeler' | 'Alat Peraga' | 'Buku/Pustaka' | 'Peralatan Olahraga' | 'Lainnya';
  jumlah: number;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  lokasiPrasaranaId: string; // Linked to Prasarana ID, or 'unassigned'
  merkSpec: string;
  tahunPengadaan: string;
}

export interface MataPelajaran {
  id: string;
  kode: string;
  nama: string;
  tingkat: string; // e.g., 'VII', 'VIII', 'IX' or 'Semua'
  kategori: 'Mapel Wajib' | 'Mapel Pilihan' | 'Muatan Lokal';
  jumlahJam: number; // Jam pelajaran per minggu
  guruPengampu: string;
}

export interface JadwalPelajaran {
  id: string;
  kelasId: string; // Linked to Kelas
  mapelId: string; // Linked to MataPelajaran
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jamMulai: string; // e.g., '07:30'
  jamSelesai: string; // e.g., '09:00'
  guru: string;
}

export interface PresensiRecord {
  id: string;
  userId: string;
  userType: 'siswa' | 'guru';
  nama: string;
  kelas: string;
  tanggal: string; // YYYY-MM-DD
  status: 'H' | 'I' | 'S' | 'A' | 'T';
  jamMasuk: string | null; // HH:MM
  jamPulang: string | null; // HH:MM
  isOverride?: boolean;
}

export interface PresensiSetting {
  jamMasuk: string;
  toleransi: number; // minutes
  jamPulang: string;
}

export interface IzinRecord {
  id: string;
  userId: string;
  userType: 'siswa' | 'guru';
  nama: string;
  kelas: string;
  jenisIzin: 'Terlambat' | 'Pulang Awal' | 'Sakit_Tidak_Masuk';
  alasan: string;
  jamPulangAwal?: string;
  jumlahHari?: number;
  suratDokterUrl?: string;
  statusApproval: 'Pending' | 'Disetujui' | 'Ditolak';
  tanggalPengajuan: string; // YYYY-MM-DD
  approvedBy?: string;
}

export function getPdfLogo(institution: Institution | undefined): string {
  if (!institution) return '/tut-wuri.png';

  const name = institution.name.toUpperCase();
  const level = institution.level.toUpperCase();

  const kemenagPattern = /\b(MI|MIN|MTS|MTSN|MA|MAN|MAK|MAKN|MADRASAH)\b/;
  const isKemenag = kemenagPattern.test(name) || ['MI', 'MTS', 'MA', 'MAK'].includes(level);

  if (isKemenag) {
    return institution.kemenagLogo || '/kemenag.png';
  }

  return institution.kemdikbudLogo || '/tut-wuri.png';
}

export type UserRole = 'super_admin' | 'admin' | 'siswa' | 'guru' | 'kepsek' | 'wakasek';

export interface EMateri {
  id: string;
  mapelId: string;
  judul: string;
  deskripsi: string;
  tipe: 'Dokumen' | 'Video' | 'Link' | 'Gambar';
  url: string;
  tanggalUpload: string;
  pengunggah: string;
  guruId?: string; // ID of teacher who uploaded
  kelasId?: string; // Target class or 'Semua'
}

export interface StudentMutation {
  id: string;
  studentId: string;
  studentName?: string;
  jenisMutasi: 'Masuk' | 'Keluar' | 'Mutasi/Pindah' | 'Dikeluarkan';
  tanggal: string; // YYYY-MM-DD
  alasan: string;
  sekolahAsalTujuan: string;
  created_at?: string;
}

export interface ClassPromotion {
  id: string;
  studentId: string;
  studentName?: string;
  kelasAsal: string;
  kelasTujuan: string;
  tanggal: string; // YYYY-MM-DD
  academicYear: string;
  created_at?: string;
}

export interface StudentGraduation {
  id: string;
  studentId: string;
  studentName?: string;
  tahunLulus: string;
  noIjazah: string;
  tanggal: string; // YYYY-MM-DD
  created_at?: string;
}






