import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  BookOpen, 
  Calendar, 
  GraduationCap, 
  HelpCircle, 
  Info, 
  Plus, 
  Search, 
  Trash2, 
  User, 
  X, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  ArrowRight, 
  AlertCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BookmarkCheck,
  ClipboardList,
  UserCheck,
  CornerDownRight,
  Edit2,
  Settings,
  Activity,
  Send,
  Eye,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Kelas, Student, Teacher } from '../types';
import { SearchableSelect } from './SearchableSelect';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Failed to write ${key} to localStorage:`, e);
  }
};

interface KesiswaanViewProps {
  currentPage: string;
  students: Student[];
  teachers: Teacher[];
  classes: Kelas[];
  addToast: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification: (title: string, message: string) => void;
  currentUser?: any;
  userRole?: 'super_admin' | 'admin' | 'guru' | 'siswa' | 'kepsek' | 'wakasek' | null;
}

export interface KategoriSikap {
  id: string;
  jenis: 'Positif' | 'Negatif';
  nama: string;
}

export interface PilihanSikap {
  id: string;
  kategoriId: string;
  namaSikap: string;
  poin: number; // Nilai absolut, konversi tanda (-) dilakukan dinamis jika Negatif
}

export interface LogPoinSiswa {
  id: string;
  siswaId: string;
  pilihanSikapId: string;
  tanggal: string;
  inputOleh: string;
  catatan?: string;
  jenis: 'Positif' | 'Negatif';
  kategoriNama: string;
  sikapNama: string;
  poin: number; // Nilai bertanda, e.g., +15 atau -5
  tindakLanjut?: string;
  tindakLanjutStatus?: 'Belum Diproses' | 'Sedang Diproses' | 'Selesai';
}

// Data Master default jika belum ada di localStorage
const DEFAULT_CATEGORIES: KategoriSikap[] = [
  { id: 'kat-1', jenis: 'Positif', nama: 'Akademik' },
  { id: 'kat-2', jenis: 'Positif', nama: 'Non-Akademik' },
  { id: 'kat-3', jenis: 'Positif', nama: 'Karakter & Akhlak' },
  { id: 'kat-4', jenis: 'Negatif', nama: 'Pelanggaran Ringan' },
  { id: 'kat-5', jenis: 'Negatif', nama: 'Pelanggaran Sedang' },
  { id: 'kat-6', jenis: 'Negatif', nama: 'Pelanggaran Berat' },
];

const DEFAULT_ATTITUDES: PilihanSikap[] = [
  { id: 'sikap-1', kategoriId: 'kat-1', namaSikap: 'Juara Kelas / Juara Umum', poin: 20 },
  { id: 'sikap-2', kategoriId: 'kat-1', namaSikap: 'Juara Lomba Karya Ilmiah', poin: 15 },
  { id: 'sikap-3', kategoriId: 'kat-2', namaSikap: 'Juara Lomba Olahraga / Seni', poin: 15 },
  { id: 'sikap-4', kategoriId: 'kat-2', namaSikap: 'Keaktifan Ekstrakurikuler', poin: 10 },
  { id: 'sikap-5', kategoriId: 'kat-3', namaSikap: 'Membantu Guru / Teman dalam Kesulitan', poin: 10 },
  { id: 'sikap-6', kategoriId: 'kat-3', namaSikap: 'Kejujuran (Mengembalikan Barang Hilang)', poin: 15 },
  { id: 'sikap-7', kategoriId: 'kat-3', namaSikap: 'Petugas Upacara / Pengurus Kelas Aktif', poin: 10 },
  { id: 'sikap-8', kategoriId: 'kat-4', namaSikap: 'Datang Terlambat ke Sekolah', poin: 2 },
  { id: 'sikap-9', kategoriId: 'kat-4', namaSikap: 'Atribut Seragam Tidak Lengkap', poin: 3 },
  { id: 'sikap-10', kategoriId: 'kat-4', namaSikap: 'Membuang Sampah Sembarangan', poin: 5 },
  { id: 'sikap-11', kategoriId: 'kat-5', namaSikap: 'Membolos Jam Pelajaran', poin: 10 },
  { id: 'sikap-12', kategoriId: 'kat-5', namaSikap: 'Rambut Gondrong / Tidak Rapi (Laki-laki)', poin: 5 },
  { id: 'sikap-13', kategoriId: 'kat-5', namaSikap: 'Membawa HP Tanpa Izin saat KBM', poin: 10 },
  { id: 'sikap-14', kategoriId: 'kat-6', namaSikap: 'Tawuran atau Berkelahi', poin: 25 },
  { id: 'sikap-15', kategoriId: 'kat-6', namaSikap: 'Merusak Fasilitas Madrasah', poin: 20 },
  { id: 'sikap-16', kategoriId: 'kat-6', namaSikap: 'Ketahuan Merokok di Lingkungan Sekolah', poin: 15 },
];

export const KesiswaanView: React.FC<KesiswaanViewProps> = ({
  currentPage,
  students,
  teachers,
  classes,
  addToast,
  addNotification,
  currentUser,
  userRole
}) => {
  // --- States ---
  const [categories, setCategories] = useState<KategoriSikap[]>(() => {
    const saved = localStorage.getItem('mts_kategori_sikap');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try { return safeJSONParse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_CATEGORIES;
  });

  const [attitudes, setAttitudes] = useState<PilihanSikap[]>(() => {
    const saved = localStorage.getItem('mts_pilihan_sikap');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try { return safeJSONParse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_ATTITUDES;
  });

  const [logs, setLogs] = useState<LogPoinSiswa[]>(() => {
    const saved = localStorage.getItem('mts_log_poin_siswa');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try { return safeJSONParse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Mode View Kesiswaan-Poin: 'laporan' | 'input' | 'master' | 'monitoring'
  const [activeTab, setActiveTab] = useState<'laporan' | 'input' | 'master' | 'monitoring'>('laporan');

  // Master Data Settings Step: 1 | 2 | 3 | 4
  const [masterStep, setMasterStep] = useState<1 | 2 | 3 | 4>(1);

  // Filter untuk daftar Laporan
  const [filterClass, setFilterClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sisi Guru Form Input State (Terkunci Sekuensial)
  const [formSiswaIds, setFormSiswaIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState<boolean>(false);
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  const [formJenis, setFormJenis] = useState<'Positif' | 'Negatif' | ''>('');
  const [formSikapId, setFormSikapId] = useState<string>('');
  const [formTindakLanjut, setFormTindakLanjut] = useState<string>('');
  const [formCatatan, setFormCatatan] = useState<string>('');
  const [formPemberiPoin, setFormPemberiPoin] = useState<string>(() => {
    if (currentUser?.nama) {
      return currentUser.nama;
    }
    if (teachers && teachers.length > 0) {
      return teachers[0].nama;
    }
    return 'Super Admin';
  });

  // Sync penginput with logged-in user if it loads later or changes
  useEffect(() => {
    if (currentUser?.nama) {
      setFormPemberiPoin(currentUser.nama);
    }
  }, [currentUser]);

  // Custom Dropdown Search State
  const [dropdownSearch, setDropdownSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State Dialog Detail Kartu Kedisiplinan Siswa
  const [selectedStudentCard, setSelectedStudentCard] = useState<Student | null>(null);

  // States Input Master baru oleh Admin
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryJenis, setNewCategoryJenis] = useState<'Positif' | 'Negatif'>('Positif');

  const [newAttitudeName, setNewAttitudeName] = useState<string>('');
  const [newAttitudeCategoryId, setNewAttitudeCategoryId] = useState<string>('');
  const [newAttitudePoin, setNewAttitudePoin] = useState<number>(0);

  // --- NEW STATES FOR ADVANCED POINTS & LAWS ---
  const [tindakLanjutPositif, setTindakLanjutPositif] = useState<string[]>(() => {
    const saved = localStorage.getItem('mts_tl_positif');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) {}
    }
    return ["Apresiasi lisan", "Pemberian piagam penghargaan", "Diumumkan saat upacara bendera", "Voucher jajan kantin gratis"];
  });

  const [tindakLanjutNegatif, setTindakLanjutNegatif] = useState<string[]>(() => {
    const saved = localStorage.getItem('mts_tl_negatif');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) {}
    }
    return ["Teguran lisan & Pembinaan", "Pemanggilan orang tua", "Penyitaan barang terlarang", "Surat Peringatan 1 (SP 1)", "Surat Peringatan 2 (SP 2)", "Skorsing & Pendampingan BK"];
  });

  const [accumulationRules, setAccumulationRules] = useState<any[]>(() => {
    const saved = localStorage.getItem('mts_accumulation_rules');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) {}
    }
    return [
      { id: 'rule-1', minPoin: -20, maxPoin: -10, statusAturan: "SP 1 & Pendampingan Guru BK", jenisSikap: "Negatif" },
      { id: 'rule-2', minPoin: -30, maxPoin: -21, statusAturan: "SP 2 & Pemanggilan Orang Tua", jenisSikap: "Negatif" },
      { id: 'rule-3', minPoin: -100, maxPoin: -31, statusAturan: "SP 3 & Skorsing / Sidang Pleno", jenisSikap: "Negatif" },
      { id: 'rule-4', minPoin: 10, maxPoin: 30, statusAturan: "Piagam Penghargaan & Apresiasi Upacara", jenisSikap: "Positif" },
      { id: 'rule-5', minPoin: 31, maxPoin: 100, statusAturan: "Beasiswa Prestasi & Siswa Teladan Utama", jenisSikap: "Positif" }
    ];
  });

  const [newTindakLanjutPositifInput, setNewTindakLanjutPositifInput] = useState<string>('');
  const [newTindakLanjutNegatifInput, setNewTindakLanjutNegatifInput] = useState<string>('');

  const [newRuleMin, setNewRuleMin] = useState<number>(0);
  const [newRuleMax, setNewRuleMax] = useState<number>(0);
  const [newRuleStatus, setNewRuleStatus] = useState<string>('');
  const [newRuleJenis, setNewRuleJenis] = useState<'Positif' | 'Negatif'>('Negatif');

  // WhatsApp simulation modal states
  const [activeNotificationSiswa, setActiveNotificationSiswa] = useState<any | null>(null);
  const [draftNotificationText, setDraftNotificationText] = useState<string>('');

  // --- Effects ---
  // Save to localStorage whenever they change
  useEffect(() => {
    safeSetItem('mts_kategori_sikap', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    safeSetItem('mts_pilihan_sikap', JSON.stringify(attitudes));
  }, [attitudes]);

  useEffect(() => {
    safeSetItem('mts_log_poin_siswa', JSON.stringify(logs));
    window.dispatchEvent(new Event('poinChanged'));
  }, [logs]);

  useEffect(() => {
    safeSetItem('mts_tl_positif', JSON.stringify(tindakLanjutPositif));
  }, [tindakLanjutPositif]);

  useEffect(() => {
    safeSetItem('mts_tl_negatif', JSON.stringify(tindakLanjutNegatif));
  }, [tindakLanjutNegatif]);

  useEffect(() => {
    safeSetItem('mts_accumulation_rules', JSON.stringify(accumulationRules));
  }, [accumulationRules]);

  // Seed logs dynamically if empty
  useEffect(() => {
    if (logs.length === 0 && students && students.length > 0) {
      const mockLogs: LogPoinSiswa[] = [];
      const seedCount = Math.min(students.length, 6);
      
      for (let i = 0; i < seedCount; i++) {
        const student = students[i];
        
        // Positive Record
        if (i % 2 === 0) {
          mockLogs.push({
            id: `log-seed-${i}-pos`,
            siswaId: student.id,
            pilihanSikapId: 'sikap-1',
            tanggal: '2026-07-03 08:30',
            inputOleh: teachers[i % teachers.length]?.nama || 'Super Admin',
            catatan: 'Juara Kelas / Mengikuti kompetisi internal madrasah',
            jenis: 'Positif',
            kategoriNama: 'Akademik',
            sikapNama: 'Juara Kelas / Juara Umum',
            poin: 20
          });
        }
        
        // Negative Record
        if (i % 3 === 0) {
          mockLogs.push({
            id: `log-seed-${i}-neg`,
            siswaId: student.id,
            pilihanSikapId: 'sikap-8',
            tanggal: '2026-07-04 07:12',
            inputOleh: teachers[(i + 1) % teachers.length]?.nama || 'Super Admin',
            catatan: 'Terlambat upacara bendera senin',
            jenis: 'Negatif',
            kategoriNama: 'Pelanggaran Ringan',
            sikapNama: 'Datang Terlambat ke Sekolah',
            poin: -2
          });
        }

        if (i === 1) {
          mockLogs.push({
            id: `log-seed-spesial`,
            siswaId: student.id,
            pilihanSikapId: 'sikap-5',
            tanggal: '2026-07-05 09:15',
            inputOleh: 'Siti Aminah, S.Pd.',
            catatan: 'Membantu merapikan lab komputer setelah ujian',
            jenis: 'Positif',
            kategoriNama: 'Karakter & Akhlak',
            sikapNama: 'Membantu Guru / Teman dalam Kesulitan',
            poin: 10
          });
        }
      }
      setLogs(mockLogs);
    }
  }, [students, logs, teachers]);

  // Click outside custom dropdown handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setIsStudentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Helper Calculations ---
  const getStudentPoinStats = (siswaId: string) => {
    const studentLogs = logs.filter(l => l.siswaId === siswaId);
    let totalPositif = 0;
    let totalNegatif = 0;
    
    studentLogs.forEach(l => {
      if (l.jenis === 'Positif') {
        totalPositif += l.poin;
      } else {
        totalNegatif += l.poin; // Nilainya sudah bertanda minus
      }
    });

    return {
      totalPositif,
      totalNegatif,
      totalAkhir: totalPositif + totalNegatif,
      logCount: studentLogs.length,
      logs: studentLogs.sort((a,b) => b.tanggal.localeCompare(a.tanggal))
    };
  };

  // Filter students based on search & class
  const filteredStudentsList = students.filter(student => {
    const matchClass = filterClass === 'all' || student.kelas === filterClass;
    const matchSearch = student.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (student.nisn && student.nisn.includes(searchQuery)) ||
                        (student.nis && student.nis.includes(searchQuery));
    return matchClass && matchSearch;
  });

  // Sort students by total score descending to show top achievements
  const sortedStudentsWithStats = filteredStudentsList.map(s => {
    const stats = getStudentPoinStats(s.id);
    return { ...s, stats };
  }).sort((a, b) => b.stats.totalAkhir - a.stats.totalAkhir);

  // --- Form Handlers ---
  const resetGuruForm = () => {
    setFormSiswaIds([]);
    setFormJenis('');
    setFormSikapId('');
    setFormTindakLanjut('');
    setFormCatatan('');
    setDropdownSearch('');
    setStudentSearchQuery('');
  };

  const handleInputPoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formSiswaIds.length === 0 || !formJenis || !formSikapId) {
      addToast('Harap lengkapi semua kolom wajib berurutan!', 'Input Poin', 'error');
      return;
    }

    const sSikap = attitudes.find(sk => sk.id === formSikapId);
    const sKat = categories.find(k => k.id === sSikap?.kategoriId);

    if (!sSikap || !sKat) {
      addToast('Data pilihan tidak valid.', 'Input Poin', 'error');
      return;
    }

    const computedPoin = formJenis === 'Positif' ? Math.abs(sSikap.poin) : -Math.abs(sSikap.poin);
    
    // Create new log record for each selected student
    const now = new Date();
    const dateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newLogs: LogPoinSiswa[] = formSiswaIds.map((siswaId, idx) => ({
      id: `log-${Date.now()}-${idx}`,
      siswaId: siswaId,
      pilihanSikapId: formSikapId,
      tanggal: dateString,
      inputOleh: formPemberiPoin,
      catatan: formCatatan.trim() || undefined,
      jenis: formJenis,
      kategoriNama: sKat.nama,
      sikapNama: sSikap.namaSikap,
      poin: computedPoin,
      tindakLanjut: formTindakLanjut || undefined,
      tindakLanjutStatus: formTindakLanjut ? 'Belum Diproses' : undefined
    }));

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);

    // Get the name list of all targeted students
    const targetStudentNames = formSiswaIds
      .map(id => students.find(s => s.id === id)?.nama)
      .filter(Boolean)
      .join(', ');

    // Toast & Notification
    addToast(`Poin kedisiplinan berhasil diinput untuk ${formSiswaIds.length} siswa: ${targetStudentNames}`, 'Input Sukses', 'success');
    addNotification(
      'Input Poin Kedisiplinan', 
      `Guru ${formPemberiPoin} menginput poin ${computedPoin > 0 ? '+' : ''}${computedPoin} (${sSikap.namaSikap}) kepada siswa: ${targetStudentNames}.`
    );

    // Reset Form
    resetGuruForm();
    // Redirect to monitoring/laporan based on whether follow-up is set
    if (formTindakLanjut) {
      setActiveTab('monitoring');
    } else {
      setActiveTab('laporan');
    }
  };

  // --- Admin Settings Handlers ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      addToast('Nama kategori tidak boleh kosong!', 'Admin Setup', 'error');
      return;
    }

    const newCat: KategoriSikap = {
      id: `kat-${Date.now()}`,
      jenis: newCategoryJenis,
      nama: newCategoryName.trim()
    };

    setCategories([...categories, newCat]);
    setNewCategoryName('');
    addToast(`Kategori "${newCat.nama}" (${newCat.jenis}) berhasil ditambahkan.`, 'Admin Setup', 'success');
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    // Check if any attitudes refer to this
    const hasRef = attitudes.some(a => a.kategoriId === catId);
    if (hasRef) {
      addToast(`Gagal! Kategori "${catName}" masih digunakan oleh beberapa Pilihan Sikap.`, 'Admin Setup', 'error');
      return;
    }

    if (confirm(`Hapus kategori "${catName}"?`)) {
      setCategories(categories.filter(c => c.id !== catId));
      addToast(`Kategori "${catName}" berhasil dihapus.`, 'Admin Setup', 'success');
      addNotification?.('Kategori Dihapus', `Data kategori kesiswaan "${catName}" telah dihapus.`);
    }
  };

  const handleAddAttitude = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttitudeName.trim() || !newAttitudeCategoryId || newAttitudePoin <= 0) {
      addToast('Harap isi semua kolom sikap dan poin dengan benar (> 0)!', 'Admin Setup', 'error');
      return;
    }

    const targetKat = categories.find(c => c.id === newAttitudeCategoryId);
    if (!targetKat) return;

    const newAtt: PilihanSikap = {
      id: `sikap-${Date.now()}`,
      kategoriId: newAttitudeCategoryId,
      namaSikap: newAttitudeName.trim(),
      poin: Math.abs(newAttitudePoin) // Stored as positive integer
    };

    setAttitudes([...attitudes, newAtt]);
    setNewAttitudeName('');
    setNewAttitudePoin(0);
    addToast(`Sikap baru "${newAtt.namaSikap}" berhasil ditambahkan.`, 'Admin Setup', 'success');
  };

  const handleDeleteAttitude = (attId: string, attName: string) => {
    if (confirm(`Hapus pilihan sikap "${attName}"? Tindakan ini tidak akan menghapus riwayat yang sudah tercatat sebelumnya.`)) {
      setAttitudes(attitudes.filter(a => a.id !== attId));
      addToast(`Sikap "${attName}" berhasil dihapus.`, 'Admin Setup', 'success');
      addNotification?.('Sikap Dihapus', `Data sikap kesiswaan "${attName}" telah dihapus.`);
    }
  };

  const handleDeleteLogRecord = (logId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan riwayat poin ini?')) {
      const updatedLogs = logs.filter(l => l.id !== logId);
      setLogs(updatedLogs);
      
      // If we are looking at the modal detail, refresh stats or handle gracefully
      if (selectedStudentCard) {
        // Just refresh local state variable to re-render Modal
        const stillExists = students.find(s => s.id === selectedStudentCard.id);
        if (stillExists) {
          setSelectedStudentCard({ ...stillExists });
        }
      }
      
      addToast('Catatan riwayat poin berhasil dihapus.', 'Hapus Riwayat', 'success');
      addNotification?.('Riwayat Dihapus', `Catatan riwayat poin siswa telah dihapus.`);
    }
  };

  // Filter attitudes for step 3 based on category
  const getAttitudesWithCategoryDetails = () => {
    return attitudes.map(att => {
      const kat = categories.find(c => c.id === att.kategoriId);
      return {
        ...att,
        kategoriNama: kat?.nama || 'Tanpa Kategori',
        jenis: kat?.jenis || 'Positif'
      };
    });
  };

  // --- RENDERING VIEWS ---

  // RENDER SUBMENU 2: Bimbingan Konseling (BK) - Placeholder/UI Cantik
  const renderBimbinganKonselingView = () => {
    return (
      <div className="animate-fade-in block">
        <div className="bento-card bg-gradient-to-r from-teal-600 to-emerald-600 text-white mb-8 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
            <GraduationCap className="w-80 h-80" />
          </div>
          <div className="max-w-xl relative z-10">
            <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full text-white border border-white/20">
              Layanan Bimbingan Konseling (BK)
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-4 leading-tight">
              Sistem Konseling, Mediasi, & Pembinaan Siswa
            </h3>
            <p className="text-white/80 text-xs md:text-sm font-medium mt-3 leading-relaxed">
              Modul untuk mencatat riwayat pemanggilan, bimbingan berkala, penyelesaian konflik, serta konsultasi wali murid dengan Guru BK Madrasah secara kolaboratif.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Counseling Cases */}
          <div className="lg:col-span-2 bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <h4 className="font-extrabold text-slate-800 text-base">Riwayat Kasus & Pembinaan Aktif</h4>
              </div>
              <button 
                onClick={() => addToast('Fitur penambahan Kasus BK baru akan tersedia pada fase rilis berikutnya!', 'Modul BK', 'info')}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Kasus Baru
              </button>
            </div>

            <div className="space-y-4">
              {[
                { siswa: 'Rizky Amalia', kelas: 'VIII-A', kasus: 'Konsultasi Penurunan Motivasi Belajar', tgl: '04 Juli 2026', guru: 'Dra. Endang Lestari', status: 'Selesai', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                { siswa: 'Farhan Setiawan', kelas: 'VII-B', kasus: 'Keterlambatan Berulang & Sering Membolos', tgl: '03 Juli 2026', guru: 'Ahmad Muzaki, S.Psi', status: 'Dalam Proses', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
                { siswa: 'Zahra Maulida', kelas: 'IX-C', kasus: 'Mediasi Konflik Kesalahpahaman Antar Teman', tgl: '29 Juni 2026', guru: 'Dra. Endang Lestari', status: 'Selesai', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                { siswa: 'Muhammad Satria', kelas: 'VIII-B', kasus: 'Panggilan Wali Murid Terkait Kedisiplinan Atribut', tgl: '25 Juni 2026', guru: 'Ahmad Muzaki, S.Psi', status: 'Dijadwalkan', badge: 'bg-blue-100 text-blue-800 border-blue-200' }
              ].map((c, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-100 hover:border-teal-100 hover:bg-teal-50/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-slate-800 text-sm">{c.siswa}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{c.kelas}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed mb-2">{c.kasus}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-semibold">
                      <span>Konselor: {c.guru}</span>
                      <span>•</span>
                      <span>Tanggal: {c.tgl}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${c.badge}`}>{c.status}</span>
                    <button 
                      onClick={() => addToast('Membuka rekam medis konseling membutuhkan otorisasi Akun Konselor BK!', 'Otorisasi', 'error')}
                      className="text-slate-400 hover:text-teal-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                      title="Detail Catatan BK"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side Info & Tips */}
          <div className="space-y-6">
            <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-teal-600" /> Profil Konselor Madrasah
              </h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">EL</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">Dra. Endang Lestari</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Koordinator BK Kelas VIII & IX</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">AM</div>
                  <div>
                    <p className="text-xs font-black text-slate-700">Ahmad Muzaki, S.Psi</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Guru BK & Konselor Kelas VII</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-teal-50/40 border border-teal-100/60 p-5 rounded-2xl">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-slate-800 text-xs mb-1">Pemberitahuan Sistem BK</h5>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Sistem BK terintegrasi langsung dengan database poin pelanggaran. Jika seorang siswa mengumpulkan total poin negatif melebihi ambang batas (misal: -15), notifikasi peringatan akan otomatis masuk ke menu rujukan BK.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // RENDER SUBMENU 3: Prestasi & Ekstrakurikuler - Placeholder/UI Cantik
  const renderPrestasiView = () => {
    return (
      <div className="animate-fade-in block">
        <div className="bento-card bg-gradient-to-r from-amber-500 to-orange-600 text-white mb-8 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
            <Award className="w-80 h-80" />
          </div>
          <div className="max-w-xl relative z-10">
            <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full text-white border border-white/20">
              Galeri Prestasi & Keikutsertaan Ekskul
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-4 leading-tight">
              Apresiasi Bakat, Seni, Olahraga & Ekstrakurikuler
            </h3>
            <p className="text-white/80 text-xs md:text-sm font-medium mt-3 leading-relaxed">
              Mendata seluruh piagam penghargaan, piala kejuaraan, serta memonitor partisipasi aktif siswa pada organisasi internal madrasah dan ekstrakurikuler wajib/pilihan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Achievements */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                  <h4 className="font-extrabold text-slate-800 text-base">Daftar Prestasi & Juara Siswa Terbaru</h4>
                </div>
                <button 
                  onClick={() => addToast('Pencatatan prestasi baru akan tersedia di rilis update selanjutnya!', 'Apresiasi', 'info')}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Tambah Prestasi
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { nama: 'Dinda Permata', kelas: 'IX-A', prestasi: 'Juara 1 Olimpiade Matematika (KSM) Tingkat Kabupaten', tgl: '02 Juli 2026', jenis: 'Akademik', penilai: 'Kementerian Agama Kabupaten' },
                  { nama: 'Rafi Alamsyah', kelas: 'VIII-C', prestasi: 'Juara 2 Pencak Silat Piala Dispora Tingkat Provinsi', tgl: '28 Juni 2026', jenis: 'Olahraga', penilai: 'Dispora Jabar' },
                  { nama: 'Siti Sarah & Tim', kelas: 'VII-A & VIII-A', prestasi: 'Juara 1 Lomba Cerdas Cermat Syarhil Quran', tgl: '22 Juni 2026', jenis: 'Keagamaan', penilai: 'Madrasah Fest 2026' }
                ].map((p, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-100 hover:border-amber-100 hover:bg-amber-50/5 transition-all flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 font-extrabold flex-shrink-0">
                        🏆
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-extrabold text-slate-800 text-sm">{p.nama}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">{p.kelas}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-bold leading-relaxed">{p.prestasi}</p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Penyelenggara: {p.penilai} • {p.tgl}</p>
                      </div>
                    </div>
                    <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                      {p.jenis}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Extracurricular Clubs */}
          <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h4 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-teal-600" /> Ekskul & Organisasi Aktif
            </h4>
            <div className="space-y-4">
              {[
                { nama: 'Pramuka (Wajib)', pembina: 'Drs. Supandi', anggota: 120, logo: '🏕️' },
                { nama: 'Paskibra', pembina: 'Siti Aminah, S.Pd.', anggota: 35, logo: '🇮🇩' },
                { nama: 'Seni Kaligrafi Islam', pembina: 'KH. Mustofa', anggota: 45, logo: '🖌️' },
                { nama: 'Futsal & Olahraga', pembina: 'Rahmat Hidayat, S.Pd.', anggota: 60, logo: '⚽' },
                { nama: 'Hadroh & Rebana', pembina: 'Yusuf Habibi, M.Pd.', anggota: 28, logo: '🥁' }
              ].map((ek, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{ek.logo}</span>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{ek.nama}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Pembina: {ek.pembina}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                    {ek.anggota} Siswa
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // RENDER SUBMENU 4: Mutasi & Pindah Kelas - Placeholder/UI Cantik
  const renderMutasiView = () => {
    return (
      <div className="animate-fade-in block">
        <div className="bento-card bg-gradient-to-r from-blue-600 to-cyan-600 text-white mb-8 p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10">
            <UserCheck className="w-80 h-80" />
          </div>
          <div className="max-w-xl relative z-10">
            <span className="bg-white/20 backdrop-blur-md text-[10px] uppercase font-extrabold tracking-widest px-3 py-1 rounded-full text-white border border-white/20">
              Modul Administrasi Mutasi Siswa
            </span>
            <h3 className="text-2xl md:text-3xl font-extrabold mt-4 leading-tight">
              Pencatatan Pindah Kelas, Keluar, & Siswa Baru
            </h3>
            <p className="text-white/80 text-xs md:text-sm font-medium mt-3 leading-relaxed">
              Pantau mutasi vertikal (naik/tinggal kelas), mutasi horizontal (perpindahan rombel), serta pendaftaran murid masuk (pindahan) dan murid keluar secara tertib.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Riwayat Mutasi Terbaru */}
          <div className="lg:col-span-2 bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" /> Riwayat Mutasi Terakhir
              </h4>
              <button 
                onClick={() => addToast('Pencatatan mutasi akan diproses otomatis oleh TU / Admin Madrasah!', 'Mutasi', 'info')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Daftarkan Mutasi
              </button>
            </div>

            <div className="space-y-4">
              {[
                { nama: 'Dicky Hermawan', tipe: 'Pindah Kelas', detail: 'Dari Rombel VII-B berpindah ke Rombel VII-A (Penyetaraan Kapasitas)', tgl: '02 Juli 2026', oleh: 'Super Admin' },
                { nama: 'Lina Marlina', tipe: 'Masuk (Pindahan)', detail: 'Diterima di Kelas VIII-B pindahan dari MTs Negeri 2 Bogor', tgl: '28 Juni 2026', oleh: 'TU Madrasah' },
                { nama: 'Achmad Dani', tipe: 'Keluar (Pindah)', detail: 'Mutasi keluar ke SMP Negeri 1 Cicalengka karena keluarga pindah domisili', tgl: '20 Juni 2026', oleh: 'Waka Kesiswaan' }
              ].map((m, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-50 hover:border-blue-100 hover:bg-blue-50/5 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-800 text-sm">{m.nama}</span>
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                      m.tipe.includes('Masuk') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      m.tipe.includes('Keluar') ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                      {m.tipe}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed mb-2">{m.detail}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-semibold">
                    <span>Oleh: {m.oleh}</span>
                    <span>•</span>
                    <span>Tanggal: {m.tgl}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistik Mutasi */}
          <div className="space-y-6">
            <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="font-extrabold text-slate-800 text-sm mb-4">Statistik Rombel Semester Ini</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Total Aktif</span>
                  <span className="text-xl font-black text-slate-800 block mt-1">{students.length}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center">
                  <span className="text-[9px] text-emerald-600 font-bold uppercase block">Pindahan Masuk</span>
                  <span className="text-xl font-black text-emerald-700 block mt-1">1</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl text-center">
                  <span className="text-[9px] text-rose-600 font-bold uppercase block">Pindahan Keluar</span>
                  <span className="text-xl font-black text-rose-700 block mt-1">1</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <span className="text-[9px] text-blue-600 font-bold uppercase block">Mutasi Kelas</span>
                  <span className="text-xl font-black text-blue-700 block mt-1">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // MAIN RENDER SELECTOR BASED ON SUBMENU ROUTE
  if (currentPage === 'kesiswaan-bk') {
    return renderBimbinganKonselingView();
  }
  if (currentPage === 'kesiswaan-prestasi') {
    return renderPrestasiView();
  }
  if (currentPage === 'kesiswaan-mutasi') {
    return renderMutasiView();
  }

  // ELSE: WE ARE IN KESISWAAN-POIN (FOCUS MODULE)
  return (
    <div className="animate-fade-in block">
      
      {/* NAV TABS (Laporan, Input Guru, Master Admin) */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide gap-1">
        <button
          onClick={() => setActiveTab('laporan')}
          className={`px-5 py-3.5 font-bold text-xs md:text-sm whitespace-nowrap border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'laporan'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Siswa & Laporan Poin
        </button>
        <button
          onClick={() => setActiveTab('input')}
          className={`px-5 py-3.5 font-bold text-xs md:text-sm whitespace-nowrap border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'input'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Input Poin (Sisi Guru)
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-5 py-3.5 font-bold text-xs md:text-sm whitespace-nowrap border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'monitoring'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Monitoring Poin
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-5 py-3.5 font-bold text-xs md:text-sm whitespace-nowrap border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'master'
              ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Setup Master (Sisi Admin)
        </button>
      </div>

      {/* ======================= TAB 1: LAPORAN & LEADERBOARD ======================= */}
      {activeTab === 'laporan' && (
        <div className="space-y-6">
          <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Tabel Akumulasi Poin & Kedisiplinan Siswa</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">Berikut adalah penjumlahan murni akumulasi dari (Total Poin Positif + Total Poin Negatif)</p>
              </div>

              {/* SEARCH & FILTER BAR - MOBILE RESPONSIVE */}
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 sm:w-60">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700"
                  />
                </div>
                
                <SearchableSelect
                  value={filterClass}
                  onChange={(val) => setFilterClass(val)}
                  options={[
                    { value: 'all', label: 'Semua Rombel' },
                    ...classes.map(c => ({ value: c.nama, label: c.nama }))
                  ]}
                  placeholder="Pilih Rombel"
                  showSearch={true}
                  isClearable={false}
                />
              </div>
            </div>

            {/* LEADERBOARD TABLE GRID */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
                    <th className="py-4 px-4 w-12 text-center">Rank</th>
                    <th className="py-4 px-4">Nama Siswa</th>
                    <th className="py-4 px-4 text-center">Rombel</th>
                    <th className="py-4 px-4 text-center text-emerald-600 font-black">Positif (+)</th>
                    <th className="py-4 px-4 text-center text-rose-600 font-black">Negatif (-)</th>
                    <th className="py-4 px-4 text-center">Akumulasi Poin</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedStudentsWithStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 font-semibold text-xs">
                        Tidak ditemukan siswa yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : (
                    sortedStudentsWithStats.map((std, idx) => {
                      // Styling badge status berdasarkan skor akhir
                      let statusBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                      let statusLabel = 'Cukup';
                      const sScore = std.stats.totalAkhir;
                      if (sScore > 20) {
                        statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        statusLabel = 'Sangat Baik';
                      } else if (sScore >= 0) {
                        statusBadge = 'bg-teal-50 text-teal-700 border-teal-100';
                        statusLabel = 'Baik';
                      } else if (sScore >= -10) {
                        statusBadge = 'bg-amber-100 text-amber-800 border-amber-200';
                        statusLabel = 'Peringatan Ringan';
                      } else {
                        statusBadge = 'bg-rose-100 text-rose-800 border-rose-200';
                        statusLabel = 'Pembinaan BK';
                      }

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/50 text-slate-600 text-xs font-semibold">
                          <td className="py-4 px-4 text-center font-black text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs md:text-sm">{std.nama}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">NISN: {std.nisn || '-'}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-full text-[10px]">
                              {std.kelas}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center text-emerald-600 font-bold">
                            +{std.stats.totalPositif}
                          </td>
                          <td className="py-4 px-4 text-center text-rose-600 font-bold">
                            {std.stats.totalNegatif}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`text-sm font-black ${
                              std.stats.totalAkhir > 0 ? 'text-emerald-600' : 
                              std.stats.totalAkhir < 0 ? 'text-rose-600' : 'text-slate-500'
                            }`}>
                              {std.stats.totalAkhir > 0 ? `+${std.stats.totalAkhir}` : std.stats.totalAkhir}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                              {statusLabel}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {/* TOMBOL WARNA SESUAI TEMA, TIDAK PUTIH */}
                            <button
                              onClick={() => setSelectedStudentCard(std)}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" /> Riwayat
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================= TAB: MONITORING POIN & TINDAK LANJUT ======================= */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/60 flex flex-col justify-between">
                <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider block">Belum Diproses</span>
                <span className="text-2xl font-black text-amber-800 mt-2 block">
                  {logs.filter(l => l.tindakLanjut && l.tindakLanjutStatus === 'Belum Diproses').length} Antrean
                </span>
              </div>
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/60 flex flex-col justify-between">
                <span className="text-[10px] text-blue-700 font-black uppercase tracking-wider block">Sedang Diproses</span>
                <span className="text-2xl font-black text-blue-800 mt-2 block">
                  {logs.filter(l => l.tindakLanjut && l.tindakLanjutStatus === 'Sedang Diproses').length} Pembinaan
                </span>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100/60 flex flex-col justify-between">
                <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider block">Selesai Ditindak</span>
                <span className="text-2xl font-black text-emerald-800 mt-2 block">
                  {logs.filter(l => l.tindakLanjut && l.tindakLanjutStatus === 'Selesai').length} Sikap
                </span>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col justify-between">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block font-sans">Aturan Terpasang</span>
                <span className="text-2xl font-black text-slate-700 mt-2 block">
                  {accumulationRules.length} Parameter
                </span>
              </div>
            </div>

            <div className="border-b border-slate-100 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-extrabold text-slate-800 text-base">Antrean Tindak Lanjut & Monitoring Pembinaan</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">Daftar asisten bimbingan konseling dan pengawasan tindak lanjut sikap siswa.</p>
              </div>
            </div>

            {/* Main Table for Monitoring */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                    <th className="py-4 px-4 text-center w-12">No</th>
                    <th className="py-4 px-4">Siswa & Kelas</th>
                    <th className="py-4 px-4">Sikap & Poin</th>
                    <th className="py-4 px-4">Pilihan Tindak Lanjut</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4">Penginput & Tanggal</th>
                    <th className="py-4 px-4 text-center">Aksi / Kontrol</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.filter(l => l.tindakLanjut).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold text-xs">
                        Belum ada antrean tindak lanjut aktif yang tercatat. Guru dapat memilih tindak lanjut saat menginput poin kedisiplinan.
                      </td>
                    </tr>
                  ) : (
                    logs.filter(l => l.tindakLanjut).map((lg, index) => {
                      const matchedSiswa = students.find(s => s.id === lg.siswaId);
                      const stats = getStudentPoinStats(lg.siswaId);

                      // Determine rule action warning:
                      const ruleMatched = accumulationRules.find(r => {
                        if (r.jenisSikap === lg.jenis) {
                          if (r.jenisSikap === 'Negatif') {
                            // Negative points are negative in stats.totalAkhir but positive in rules configuration
                            const isViolating = stats.totalAkhir <= r.maxPoin && stats.totalAkhir >= r.minPoin;
                            return isViolating;
                          } else {
                            const isAchieving = stats.totalAkhir >= r.minPoin && stats.totalAkhir <= r.maxPoin;
                            return isAchieving;
                          }
                        }
                        return false;
                      });

                      return (
                        <tr key={lg.id} className="hover:bg-slate-50/50 text-slate-600 text-xs font-semibold border-b border-slate-100">
                          <td className="py-4 px-4 text-center font-black text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs md:text-sm">{matchedSiswa?.nama || 'Siswa'}</p>
                              <span className="bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded-md text-[9px] mt-1 inline-block">
                                {matchedSiswa?.kelas || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-extrabold text-slate-800 text-xs truncate max-w-[200px]">{lg.sikapNama}</p>
                              <span className={`text-[10px] font-black ${lg.jenis === 'Positif' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {lg.poin > 0 ? `+${lg.poin}` : lg.poin} Poin (Akumulasi: {stats.totalAkhir})
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-xl text-xs inline-block">
                              {lg.tindakLanjut}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              lg.tindakLanjutStatus === 'Belum Diproses' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              lg.tindakLanjutStatus === 'Sedang Diproses' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {lg.tindakLanjutStatus || 'Belum Diproses'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-[11px]">
                            <p className="font-bold text-slate-700">{lg.inputOleh}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5 font-semibold">{lg.tanggal}</p>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* STATUS TOGGLE CYCLING */}
                              <SearchableSelect
                                value={lg.tindakLanjutStatus || 'Belum Diproses'}
                                onChange={(val) => {
                                  const updatedLogs = logs.map(l => l.id === lg.id ? { ...l, tindakLanjutStatus: val as any } : l);
                                  setLogs(updatedLogs);
                                  addToast('Status tindak lanjut berhasil diperbarui!', 'Update Status', 'success');
                                }}
                                options={[
                                  { value: 'Belum Diproses', label: 'Belum Diproses' },
                                  { value: 'Sedang Diproses', label: 'Sedang Diproses' },
                                  { value: 'Selesai', label: 'Selesai' }
                                ]}
                                placeholder="Status"
                                showSearch={false}
                                isClearable={false}
                                className="w-36 text-[11px]"
                              />

                              {/* KIRIM PEMBERITAHUAN */}
                              <button
                                onClick={() => {
                                  if (!matchedSiswa) return;
                                  
                                  // Compose automated notification text
                                  let message = '';
                                  if (lg.jenis === 'Negatif') {
                                    message = `Yth. Orang Tua/Wali dari ${matchedSiswa.nama},\n\nMenginformasikan bahwa Ananda saat ini tercatat memiliki akumulasi poin kedisiplinan sebesar ${stats.totalAkhir} Poin (Pelanggaran). Berdasarkan pencatatan Sikap: "${lg.sikapNama}" (${lg.poin} Poin).\n\nTindak lanjut Madrasah saat ini: *"${lg.tindakLanjut}"*.\n\n`;
                                    
                                    if (ruleMatched) {
                                      message += `Sesuai aturan kedisiplinan, Ananda dikenakan pembinaan: *${ruleMatched.statusAturan}*.\n\nMohon perhatian dan kerjasama Bapak/Ibu demi pembinaan akhlak siswa. Terima kasih.\n\n-- BK MTs At-Turmudzi --`;
                                    } else {
                                      message += `Mohon bantuan pengawasan Bapak/Ibu di rumah. Terima kasih.\n\n-- Wali Kelas MTs At-Turmudzi --`;
                                    }
                                  } else {
                                    message = `Yth. Orang Tua/Wali dari ${matchedSiswa.nama},\n\nKabar Gembira! Dengan bangga kami menginformasikan bahwa Ananda berprestasi mencatatkan akumulasi poin prestasi sebesar +${stats.totalAkhir} Poin. Terakhir mencatat Sikap Baik: "${lg.sikapNama}" (+${lg.poin} Poin).\n\nTindak lanjut apresiasi Madrasah: *"${lg.tindakLanjut}"*.\n\n`;
                                    
                                    if (ruleMatched) {
                                      message += `Sesuai parameter prestasi, Ananda berhak memperoleh apresiasi berupa: *${ruleMatched.statusAturan}*!\n\nSelamat atas pencapaian luar biasa Ananda. Terima kasih atas dukungan Bapak/Ibu.\n\n-- MTs At-Turmudzi --`;
                                    } else {
                                      message += `Terus tingkatkan prestasi Ananda! Terima kasih.\n\n-- Wali Kelas MTs At-Turmudzi --`;
                                    }
                                  }
                                  
                                  setActiveNotificationSiswa({ siswa: matchedSiswa, log: lg, totalAkhir: stats.totalAkhir, ruleMatched });
                                  setDraftNotificationText(message);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                                title="Kirim Pemberitahuan Orang Tua"
                              >
                                <Send className="w-3 h-3" /> Kirim Ortu
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ======================= TAB 2: INPUT GURU (SEQUENTIAL LOCKED FORM) ======================= */}
      {activeTab === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: THE FORM PANEL */}
          <div className="lg:col-span-2 bento-card bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h4 className="font-extrabold text-slate-800 text-base">Form Input Poin Kedisiplinan</h4>
              <p className="text-xs text-slate-400 font-medium mt-1">Demi keakuratan, formulir ini terkunci berurutan dari atas ke bawah.</p>
            </div>

            <form onSubmit={handleInputPoinSubmit} className="space-y-6">
              
              {/* URUTAN 1: PILIH SISWA (BISA MULTIPLE) */}
              <div ref={studentDropdownRef}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-[10px]">1</span>
                  Cari & Pilih Siswa Target (Bisa Pilih Banyak) <span className="text-rose-500">*</span>
                </label>

                {/* Selected Students Tags */}
                {formSiswaIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-teal-50/40 rounded-xl border border-teal-100">
                    {formSiswaIds.map(id => {
                      const s = students.find(std => std.id === id);
                      if (!s) return null;
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-teal-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-sm">
                          {s.nama} ({s.kelas})
                          <button
                            type="button"
                            onClick={() => setFormSiswaIds(formSiswaIds.filter(item => item !== id))}
                            className="hover:bg-teal-700 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Dropdown/Search box for selecting students */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama atau kelas siswa..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setIsStudentDropdownOpen(true);
                    }}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700"
                  />
                  <div className="absolute right-3.5 top-3 text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>

                  {isStudentDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 max-h-60 overflow-y-auto">
                      {(() => {
                        const filtered = students.filter(s => 
                          s.nama.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                          s.kelas.toLowerCase().includes(studentSearchQuery.toLowerCase())
                        );

                        if (filtered.length === 0) {
                          return <p className="text-center py-4 text-slate-400 text-xs font-medium">Siswa tidak ditemukan.</p>;
                        }

                        return filtered.map(s => {
                          const isSelected = formSiswaIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormSiswaIds(formSiswaIds.filter(id => id !== s.id));
                                } else {
                                  setFormSiswaIds([...formSiswaIds, s.id]);
                                  // Reset lower levels on first selection
                                  if (formSiswaIds.length === 0) {
                                    setFormJenis('');
                                    setFormSikapId('');
                                  }
                                }
                                setStudentSearchQuery('');
                              }}
                              className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                isSelected ? 'bg-teal-50 text-teal-800 font-bold' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <span>{s.nama} ({s.kelas})</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* URUTAN 2: JENIS SIKAP (LOCKED UNTIL SISWA SELECTED) */}
              <div className={`${formSiswaIds.length === 0 ? 'opacity-40 select-none pointer-events-none' : ''} transition-all`}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className={`w-5 h-5 rounded-full ${formSiswaIds.length > 0 ? 'bg-teal-600' : 'bg-slate-300'} text-white flex items-center justify-center font-black text-[10px]`}>2</span>
                  Jenis Sikap <span className="text-rose-500">*</span>
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    disabled={formSiswaIds.length === 0}
                    onClick={() => {
                      setFormJenis('Positif');
                      setFormSikapId(''); // reset level 3
                    }}
                    className={`p-4 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex flex-col items-center gap-2 ${
                      formJenis === 'Positif'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <TrendingUp className={`w-6 h-6 ${formJenis === 'Positif' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-extrabold text-sm">Positif</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Penghargaan / Prestasi (+)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={formSiswaIds.length === 0}
                    onClick={() => {
                      setFormJenis('Negatif');
                      setFormSikapId(''); // reset level 3
                    }}
                    className={`p-4 rounded-xl border text-center font-bold text-xs cursor-pointer transition-all flex flex-col items-center gap-2 ${
                      formJenis === 'Negatif'
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                    }`}
                  >
                    <TrendingDown className={`w-6 h-6 ${formJenis === 'Negatif' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <div>
                      <p className="font-extrabold text-sm">Negatif</p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">Pelanggaran Tata Tertib (-)</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* URUTAN 3: PILIHAN SIKAP (LOCKED UNTIL JENIS SELECTED) */}
              <div className={`${!formJenis ? 'opacity-40 select-none pointer-events-none' : ''} transition-all`}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <span className={`w-5 h-5 rounded-full ${formJenis ? 'bg-teal-600' : 'bg-slate-300'} text-white flex items-center justify-center font-black text-[10px]`}>3</span>
                  Cari & Pilih Sikap (Dropdown Pintar) <span className="text-rose-500">*</span>
                </label>

                {/* CUSTOM LIVE-SEARCH DROPDOWN CONTAINER */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    disabled={!formJenis}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-semibold text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 min-h-[44px]"
                  >
                    <span>
                      {formSikapId ? (
                        (() => {
                          const matched = attitudes.find(a => a.id === formSikapId);
                          const kat = categories.find(k => k.id === matched?.kategoriId);
                          if (!matched || !kat) return '-- Pilih Sikap --';
                          const sign = formJenis === 'Positif' ? '+' : '-';
                          return `[${kat.nama}] ${matched.namaSikap} (${sign}${matched.poin})`;
                        })()
                      ) : '-- Pilih Sikap --'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Absolute Popover */}
                  {isDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 max-h-72 overflow-y-auto">
                      
                      {/* Search Bar inside Dropdown */}
                      <div className="relative mb-3.5">
                        <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Ketik kata kunci pencarian (misal: telat)..."
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                        />
                      </div>

                      {/* Dropdown Options List */}
                      <div className="space-y-1">
                        {(() => {
                          const filteredOptions = attitudes.filter(att => {
                            const kat = categories.find(k => k.id === att.kategoriId);
                            // Must match active positive/negative type
                            const matchType = kat?.jenis === formJenis;
                            // Match keywords
                            const matchKw = att.namaSikap.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                                            (kat && kat.nama.toLowerCase().includes(dropdownSearch.toLowerCase()));
                            return matchType && matchKw;
                          });

                          if (filteredOptions.length === 0) {
                            return <p className="text-center py-4 text-slate-400 text-xs font-medium">Sikap tidak ditemukan.</p>;
                          }

                          return filteredOptions.map(att => {
                            const kat = categories.find(k => k.id === att.kategoriId);
                            const sign = formJenis === 'Positif' ? '+' : '-';
                            const displayString = `[${kat?.nama || 'Lainnya'}] ${att.namaSikap} (${sign}${att.poin})`;

                            return (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => {
                                  setFormSikapId(att.id);
                                  setIsDropdownOpen(false);
                                  setDropdownSearch('');
                                }}
                                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-between ${
                                  formSikapId === att.id 
                                    ? 'bg-teal-50 text-teal-800' 
                                    : 'hover:bg-slate-50 text-slate-600'
                                }`}
                              >
                                <span>{displayString}</span>
                                {formSikapId === att.id && <Check className="w-3.5 h-3.5 text-teal-600" />}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* TINDAK LANJUT SELECTION (Conditional on formSikapId) */}
              <div className={`${!formSikapId ? 'opacity-40 select-none pointer-events-none' : ''} transition-all`}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Tindak Lanjut Sikap <span className="text-slate-400 font-medium text-[10px]">(Opsional)</span>
                </label>
                <SearchableSelect
                  value={formTindakLanjut}
                  onChange={(val) => setFormTindakLanjut(val)}
                  disabled={!formSikapId}
                  options={[
                    { value: '', label: '-- Tanpa Tindak Lanjut Otomatis (Hanya Simpan Poin) --' },
                    ...(formJenis === 'Positif' ? tindakLanjutPositif : tindakLanjutNegatif).map(tl => ({ value: tl, label: tl }))
                  ]}
                  placeholder="-- Pilih Tindak Lanjut --"
                  showSearch={false}
                  isClearable={false}
                />
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  Pilihan tindak lanjut ini akan terdaftar ke antrean tab <span className="font-extrabold text-slate-500">"Monitoring Poin"</span> untuk diawasi dan ditindak lanjuti oleh Wali Kelas atau BK.
                </p>
              </div>

              {/* NON-MANDATORY Notes */}
              <div className={`${!formSikapId ? 'opacity-40 select-none pointer-events-none' : ''} transition-all`}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Catatan Tambahan / Keterangan (Opsional)
                </label>
                <textarea
                  placeholder="Ketik keterangan detail kronologis atau alasan..."
                  value={formCatatan}
                  onChange={(e) => setFormCatatan(e.target.value)}
                  disabled={!formSikapId}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-700 h-20"
                />
              </div>

              {/* GURU PEMBERI POIN (OTOMATIS) */}
              <div className={`${!formSikapId ? 'opacity-40 select-none pointer-events-none' : ''} transition-all`}>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Guru / Tendik Penginput <span className="text-teal-600">(Otomatis)</span>
                </label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-bold text-slate-500 cursor-not-allowed">
                  {formPemberiPoin}
                </div>
              </div>

              {/* FORM ACTIONS */}
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetGuruForm}
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Reset Form
                </button>
                {/* AKSI SIMPAN WARNA MENYESUAIKAN TEMA (NOT WHITE) */}
                <button
                  type="submit"
                  disabled={!formSikapId}
                  className={`px-6 py-2.5 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                    formSikapId 
                      ? 'bg-teal-600 hover:bg-teal-700 text-white hover:shadow-lg' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" /> Simpan Catatan Poin
                </button>
              </div>

            </form>
          </div>

          {/* RIGHT: LIVE PREVIEW & PRE-STATS CARD */}
          <div className="space-y-6">
            <div className="bento-card bg-slate-50 border border-slate-200/60 p-6 rounded-2xl">
              <h5 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider mb-4 flex items-center gap-1">
                <Info className="w-4 h-4 text-teal-600" /> Ringkasan Sebelum Simpan
              </h5>
              
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-semibold">Siswa Terpilih</span>
                  <span className="font-extrabold text-slate-800 text-xs text-right max-w-[160px] truncate" title={formSiswaIds.length > 0 ? formSiswaIds.map(id => students.find(s => s.id === id)?.nama).filter(Boolean).join(', ') : '-'}>
                    {formSiswaIds.length > 0 
                      ? formSiswaIds.map(id => students.find(s => s.id === id)?.nama).filter(Boolean).join(', ') 
                      : '-'}
                  </span>
                </div>

                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-semibold">Jenis Sikap</span>
                  <span className={`font-black text-xs uppercase tracking-wider ${
                    formJenis === 'Positif' ? 'text-emerald-600' : 
                    formJenis === 'Negatif' ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    {formJenis || '-'}
                  </span>
                </div>

                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <span className="text-slate-400 text-xs font-semibold">Sikap Terpilih</span>
                  <span className="font-extrabold text-slate-800 text-xs text-right truncate max-w-[150px]">
                    {formSikapId ? attitudes.find(a => a.id === formSikapId)?.namaSikap : '-'}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-slate-400 text-xs font-semibold">Nilai Poin</span>
                  {formSikapId ? (
                    (() => {
                      const pointsValue = attitudes.find(a => a.id === formSikapId)?.poin || 0;
                      return (
                        <span className={`text-base font-black ${
                          formJenis === 'Positif' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formJenis === 'Positif' ? `+${pointsValue}` : `-${pointsValue}`}
                        </span>
                      );
                    })()
                  ) : <span className="font-extrabold text-slate-800 text-xs">-</span>}
                </div>
              </div>
            </div>

            {/* RECENT FEED OF INPUT POINTS */}
            <div className="bento-card bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="font-extrabold text-slate-800 text-sm mb-4">Aktivitas Input Terakhir</h5>
              <div className="space-y-4">
                {logs.slice(0, 3).map((l, index) => {
                  const s = students.find(st => st.id === l.siswaId);
                  return (
                    <div key={l.id} className="text-xs border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-black text-slate-700 truncate max-w-[110px]">{s?.nama || 'Siswa'}</span>
                        <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                          l.jenis === 'Positif' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {l.poin > 0 ? `+${l.poin}` : l.poin} Poin
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] font-medium leading-relaxed truncate">{l.sikapNama}</p>
                      <p className="text-[9px] text-slate-400 mt-1 font-bold">{l.tanggal} • {l.inputOleh}</p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================= TAB 3: ADMIN SETUP WIZARD (MASTER DATA) ======================= */}
      {activeTab === 'master' && (
        <div className="space-y-8">
          
          {/* STEPPER BAR */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {[
              { num: 1, label: 'Jenis Sikap' },
              { num: 2, label: 'Kategori Sikap' },
              { num: 3, label: 'Pilihan Sikap & Poin' },
              { num: 4, label: 'Aturan & Tindak Lanjut' }
            ].map(st => (
              <button
                key={st.num}
                type="button"
                onClick={() => setMasterStep(st.num as 1 | 2 | 3 | 4)}
                className={`py-3 text-center rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider cursor-pointer transition-all ${
                  masterStep === st.num
                    ? 'bg-white text-teal-700 shadow border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Step {st.num}: {st.label}
              </button>
            ))}
          </div>

          {/* STEP 1: SETUP JENIS SIKAP */}
          {masterStep === 1 && (
            <div className="bento-card bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm animate-fade-in">
              <div className="border-b border-slate-100 pb-4 mb-6">
                <h4 className="font-extrabold text-slate-800 text-base">Setup Step 1: Jenis Sikap Dasar</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">Jenis sikap dasar ini digunakan sebagai pembeda hakiki orientasi poin (positif dan negatif).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-500/20">
                    +
                  </div>
                  <div>
                    <h5 className="font-extrabold text-emerald-800 text-base">Jenis Sikap: Positif</h5>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Diberikan untuk mengapresiasi keaktifan, kesopanan, prestasi akademik, kebersihan, kepedulian sosial, dan kegiatan keagamaan siswa.</p>
                    <span className="inline-block mt-3 text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full uppercase">
                      Nilai Mutlak: Positif (+)
                    </span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-rose-50/40 border border-rose-100 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-lg shadow-md shadow-rose-500/20">
                    -
                  </div>
                  <div>
                    <h5 className="font-extrabold text-rose-800 text-base">Jenis Sikap: Negatif</h5>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Diberikan untuk mendata dan membina ketidakdisiplinan, keterlambatan, ketidakrapian seragam, membolos, maupun perkelahian di lingkungan madrasah.</p>
                    <span className="inline-block mt-3 text-[10px] font-black bg-rose-100 text-rose-800 px-3 py-1 rounded-full uppercase">
                      Nilai Mutlak: Negatif (-)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setMasterStep(2)}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                >
                  Lanjut Step 2 <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SETUP KATEGORI SIKAP */}
          {masterStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Add Category Form */}
              <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
                <h4 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3 mb-4">
                  Tambah Kategori Sikap
                </h4>
                
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Nama Kategori</label>
                    <input
                      type="text"
                      placeholder="Contoh: Pelanggaran Ringan, Akademik..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Pilih Jenis</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewCategoryJenis('Positif')}
                        className={`py-2 text-center text-xs font-bold rounded-xl cursor-pointer ${
                          newCategoryJenis === 'Positif'
                            ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                            : 'border border-slate-200 text-slate-500'
                        }`}
                      >
                        Positif (+)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCategoryJenis('Negatif')}
                        className={`py-2 text-center text-xs font-bold rounded-xl cursor-pointer ${
                          newCategoryJenis === 'Negatif'
                            ? 'bg-rose-50 border border-rose-300 text-rose-800'
                            : 'border border-slate-200 text-slate-500'
                        }`}
                      >
                        Negatif (-)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition-all cursor-pointer"
                  >
                    Tambah Kategori
                  </button>
                </form>
              </div>

              {/* Category Table */}
              <div className="lg:col-span-2 bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-extrabold text-slate-800 text-base mb-4">Daftar Kategori Sikap Dinamis</h4>
                
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase">
                        <th className="p-3">Nama Kategori</th>
                        <th className="p-3">Jenis Poin</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {categories.map(c => (
                        <tr key={c.id}>
                          <td className="p-3 font-extrabold text-slate-800">{c.nama}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                              c.jenis === 'Positif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {c.jenis}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteCategory(c.id, c.nama)}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Kategori"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-between">
                  <button
                    onClick={() => setMasterStep(1)}
                    className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Kembali Step 1
                  </button>
                  <button
                    onClick={() => setMasterStep(3)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-1"
                  >
                    Lanjut Step 3 <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SETUP PILIHAN SIKAP & POIN */}
          {masterStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Form Add Attitude */}
              <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-fit">
                <h4 className="font-extrabold text-slate-800 text-base border-b border-slate-100 pb-3 mb-4">
                  Tambah Detail Pilihan Sikap
                </h4>

                <form onSubmit={handleAddAttitude} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Pilih Kategori</label>
                    <SearchableSelect
                      value={newAttitudeCategoryId}
                      onChange={(val) => setNewAttitudeCategoryId(val)}
                      options={[
                        { value: '', label: '-- Pilih Kategori --' },
                        ...categories.map(c => ({ value: c.id, label: `[${c.jenis}] ${c.nama}` }))
                      ]}
                      placeholder="-- Pilih Kategori --"
                      showSearch={true}
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Deskripsi Nama Sikap</label>
                    <input
                      type="text"
                      placeholder="Contoh: Datang Terlambat, Juara Kelas..."
                      value={newAttitudeName}
                      onChange={(e) => setNewAttitudeName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Jumlah Bobot Poin (Positif / Absolut)</label>
                    <input
                      type="number"
                      placeholder="Poin positif, e.g. 10..."
                      value={newAttitudePoin || ''}
                      onChange={(e) => setNewAttitudePoin(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 font-semibold">Tanda minus (-) otomatis diatur oleh sistem jika kategori berjenis Negatif.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow transition-all cursor-pointer"
                  >
                    Tambah Sikap & Poin
                  </button>
                </form>
              </div>

              {/* Table of attitudes */}
              <div className="lg:col-span-2 bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="font-extrabold text-slate-800 text-base mb-4">Daftar Sikap & Poin Terdefinisi</h4>

                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs font-semibold">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase">
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Deskripsi Sikap</th>
                        <th className="p-3 text-center">Poin Akhir</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {getAttitudesWithCategoryDetails().map(att => (
                        <tr key={att.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                              att.jenis === 'Positif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {att.kategoriNama}
                            </span>
                          </td>
                          <td className="p-3 font-extrabold text-slate-800">{att.namaSikap}</td>
                          <td className="p-3 text-center font-black">
                            <span className={att.jenis === 'Positif' ? 'text-emerald-600' : 'text-rose-600'}>
                              {att.jenis === 'Positif' ? `+${att.poin}` : `-${att.poin}`}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleDeleteAttitude(att.id, att.namaSikap)}
                              className="text-slate-400 hover:text-rose-600 p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Sikap"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setMasterStep(2)}
                    className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Kembali Step 2
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SETUP ATURAN AKUMULASI & TINDAK LANJUT */}
          {masterStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              
              {/* LEFT: MANAJEMEN ATURAN AKUMULASI */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Form Tambah Aturan */}
                <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">
                    Buat Parameter Aturan Akumulasi Poin
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Jenis Sikap</label>
                      <SearchableSelect
                        value={newRuleJenis}
                        onChange={(val) => {
                          const enumVal = val as 'Positif' | 'Negatif';
                          setNewRuleJenis(enumVal);
                          if (enumVal === 'Negatif') {
                            setNewRuleMin(-20);
                            setNewRuleMax(-10);
                          } else {
                            setNewRuleMin(10);
                            setNewRuleMax(30);
                          }
                        }}
                        options={[
                          { value: 'Positif', label: 'Sikap Positif (+)' },
                          { value: 'Negatif', label: 'Sikap Negatif (-)' }
                        ]}
                        placeholder="Pilih Jenis"
                        showSearch={false}
                        isClearable={false}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Rentang Min</label>
                      <input
                        type="number"
                        value={newRuleMin}
                        onChange={(e) => setNewRuleMin(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-center font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Rentang Maks</label>
                      <input
                        type="number"
                        value={newRuleMax}
                        onChange={(e) => setNewRuleMax(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none text-center font-mono"
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newRuleStatus.trim()) {
                            addToast('Nama status aturan wajib diisi!', 'Aturan Setup', 'error');
                            return;
                          }
                          const newRule = {
                            id: `rule-${Date.now()}`,
                            minPoin: newRuleMin,
                            maxPoin: newRuleMax,
                            statusAturan: newRuleStatus.trim(),
                            jenisSikap: newRuleJenis
                          };
                          setAccumulationRules([...accumulationRules, newRule]);
                          setNewRuleStatus('');
                          addToast('Aturan akumulasi berhasil ditambahkan!', 'Aturan Setup', 'success');
                        }}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs py-2.5 rounded-xl shadow-md cursor-pointer transition-colors"
                      >
                        Tambah Rule
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-[10px] font-black text-slate-700 uppercase mb-1.5">Nama Status Tindakan / Aturan</label>
                    <input
                      type="text"
                      placeholder="Contoh: SP 1 & Pendampingan Guru BK atau Piagam Penghargaan"
                      value={newRuleStatus}
                      onChange={(e) => setNewRuleStatus(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none text-slate-700"
                    />
                    <p className="text-[9px] text-slate-400 font-bold mt-1.5">
                      Contoh Aturan Negatif: Min -20, Max -10 untuk status "SP 1". Contoh Positif: Min 10, Max 30 untuk "Siswa Teladan".
                    </p>
                  </div>
                </div>

                {/* Daftar Aturan */}
                <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-extrabold text-slate-800 text-sm mb-4">
                    Daftar Parameter Aturan Akumulasi Aktif ({accumulationRules.length})
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="p-3">Jenis</th>
                          <th className="p-3 text-center">Rentang Poin</th>
                          <th className="p-3">Status / Sanksi / Penghargaan</th>
                          <th className="p-3 text-center w-12">Hapus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accumulationRules.map(r => (
                          <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 text-xs font-semibold">
                            <td className="p-3">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                r.jenisSikap === 'Positif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {r.jenisSikap}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-750">
                              {r.minPoin} s/d {r.maxPoin}
                            </td>
                            <td className="p-3 font-extrabold text-slate-800">{r.statusAturan}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setAccumulationRules(accumulationRules.filter(item => item.id !== r.id));
                                  addToast('Aturan berhasil dihapus.', 'Aturan Setup', 'success');
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* RIGHT: KUSTOMISASI PILIHAN TINDAK LANJUT */}
              <div className="space-y-6">
                
                {/* Tindak Lanjut Positif Card */}
                <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                    <span>Opsi Tindak Lanjut Positif</span>
                    <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase">Reward</span>
                  </h4>

                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                    {tindakLanjutPositif.map((tl, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                        <span>{tl}</span>
                        <button
                          onClick={() => {
                            setTindakLanjutPositif(tindakLanjutPositif.filter((_, i) => i !== index));
                            addToast('Opsi berhasil dihapus.', 'Tindak Lanjut', 'success');
                          }}
                          className="text-slate-350 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tambah opsi positif..."
                      value={newTindakLanjutPositifInput}
                      onChange={(e) => setNewTindakLanjutPositifInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTindakLanjutPositifInput.trim()) return;
                        setTindakLanjutPositif([...tindakLanjutPositif, newTindakLanjutPositifInput.trim()]);
                        setNewTindakLanjutPositifInput('');
                        addToast('Opsi tindak lanjut positif ditambahkan!', 'Tindak Lanjut', 'success');
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* Tindak Lanjut Negatif Card */}
                <div className="bento-card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
                    <span>Opsi Tindak Lanjut Negatif</span>
                    <span className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full uppercase">Sanksi</span>
                  </h4>

                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
                    {tindakLanjutNegatif.map((tl, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs font-bold text-slate-700">
                        <span>{tl}</span>
                        <button
                          onClick={() => {
                            setTindakLanjutNegatif(tindakLanjutNegatif.filter((_, i) => i !== index));
                            addToast('Opsi berhasil dihapus.', 'Tindak Lanjut', 'success');
                          }}
                          className="text-slate-350 hover:text-rose-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tambah opsi negatif..."
                      value={newTindakLanjutNegatifInput}
                      onChange={(e) => setNewTindakLanjutNegatifInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTindakLanjutNegatifInput.trim()) return;
                        setTindakLanjutNegatif([...tindakLanjutNegatif, newTindakLanjutNegatifInput.trim()]);
                        setNewTindakLanjutNegatifInput('');
                        addToast('Opsi tindak lanjut negatif ditambahkan!', 'Tindak Lanjut', 'success');
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* Back button */}
                <div className="pt-2">
                  <button
                    onClick={() => setMasterStep(3)}
                    className="text-slate-500 hover:text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    Kembali Step 3
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================= DIALOG DIALOG / MODAL POPUPS ======================= */}

      {/* DIALOG 1: DETAIL KARTU KEDISIPLINAN SISWA (RIWAYAT TRANSAKSI POIN) */}
      {selectedStudentCard && (
        (() => {
          const stats = getStudentPoinStats(selectedStudentCard.id);
          return (
            <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
                
                {/* Header Modal */}
                <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <Award className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm md:text-base leading-tight">Kartu Kendisiplinan Siswa</h4>
                      <p className="text-[11px] text-teal-100 font-bold mt-0.5">Rekam Jejak Kepribadian & Kedisiplinan</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentCard(null)}
                    className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>

                {/* Info Siswa & Quick Stats Grid */}
                <div className="p-6 bg-slate-50 border-b border-slate-200/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Nama Siswa</p>
                      <p className="font-black text-slate-800 text-sm md:text-base mt-1">{selectedStudentCard.nama}</p>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">Rombel: <span className="font-bold">{selectedStudentCard.kelas}</span> • NISN: {selectedStudentCard.nisn || '-'}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-emerald-600 font-extrabold uppercase">Positif</span>
                        <span className="text-xs md:text-sm font-black text-emerald-600 block mt-1">+{stats.totalPositif}</span>
                      </div>
                      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-rose-600 font-extrabold uppercase">Negatif</span>
                        <span className="text-xs md:text-sm font-black text-rose-600 block mt-1">{stats.totalNegatif}</span>
                      </div>
                      <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl text-center">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase font-sans">Total</span>
                        <span className={`text-xs md:text-sm font-black block mt-1 ${
                          stats.totalAkhir > 0 ? 'text-emerald-600' :
                          stats.totalAkhir < 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}>
                          {stats.totalAkhir > 0 ? `+${stats.totalAkhir}` : stats.totalAkhir}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* History list - Scrollable container */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <p className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">Riwayat Log Catatan:</p>
                  
                  {stats.logs.length === 0 ? (
                    <p className="text-center py-10 text-slate-400 font-semibold text-xs">Belum ada catatan poin kedisiplinan yang terekam.</p>
                  ) : (
                    stats.logs.map(lg => (
                      <div key={lg.id} className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 transition-all flex justify-between items-start gap-4">
                        <div className="flex gap-2.5">
                          <CornerDownRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                lg.jenis === 'Positif' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {lg.kategoriNama}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{lg.tanggal}</span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 leading-relaxed">{lg.sikapNama}</p>
                            {lg.catatan && (
                              <p className="text-slate-500 text-xs italic mt-1 leading-relaxed bg-white border border-slate-100/80 px-2.5 py-1.5 rounded-xl">
                                &ldquo;{lg.catatan}&rdquo;
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5">Diinput oleh: {lg.inputOleh}</p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-between h-full gap-4">
                          <span className={`text-xs md:text-sm font-black ${
                            lg.jenis === 'Positif' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {lg.poin > 0 ? `+${lg.poin}` : lg.poin}
                          </span>
                          
                          <button
                            onClick={() => handleDeleteLogRecord(lg.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Hapus catatan ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer Modal Action (Tombol warna sesuai tema, no white buttons) */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedStudentCard(null)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow cursor-pointer"
                  >
                    Selesai & Tutup
                  </button>
                </div>

              </div>
            </div>
          );
        })()
      )}

      {activeNotificationSiswa && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm md:text-base leading-tight">Kirim Pemberitahuan Orang Tua</h4>
                  <p className="text-[11px] text-blue-100 font-bold mt-0.5">Sistem Otomatisasi & Simulasi Pesan WhatsApp Ortu</p>
                </div>
              </div>
              <button
                onClick={() => setActiveNotificationSiswa(null)}
                className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Penerima Pesan</p>
                <p className="text-sm font-black text-slate-800 mt-1">Orang Tua / Wali dari {activeNotificationSiswa.siswa.nama} ({activeNotificationSiswa.siswa.kelas})</p>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">No Handphone: {activeNotificationSiswa.siswa.hpWali || '0822-5892-XXXX'}</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2">
                  Draf Teks Pesan Otomatis (Dapat Diedit):
                </label>
                <textarea
                  value={draftNotificationText}
                  onChange={(e) => setDraftNotificationText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 h-44 leading-relaxed"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setActiveNotificationSiswa(null)}
                className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  addToast(`Pemberitahuan berhasil terkirim ke Orang Tua ${activeNotificationSiswa.siswa.nama}!`, 'Simulasi SMS/WA', 'success');
                  addNotification(
                    'Pemberitahuan Orang Tua',
                    `Terkirim via WhatsApp/SMS ke Orang Tua ${activeNotificationSiswa.siswa.nama}: "${draftNotificationText.substring(0, 80)}..."`
                  );
                  setActiveNotificationSiswa(null);
                }}
                className="bg-blue-650 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
