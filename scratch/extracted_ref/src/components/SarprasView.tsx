import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Search, 
  Filter, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Building2, 
  Folder, 
  Box, 
  Hammer,
  Eye,
  Archive,
  Monitor,
  Sofa,
  BookOpen,
  Trophy,
  HelpCircle,
  Hash,
  School,
  ChevronDown
} from 'lucide-react';
import { Kelas, Student, Teacher, Institution, Prasarana, Sarana } from '../types';
import { KelasView } from './KelasView';
import { SearchableSelect } from './SearchableSelect';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Failed to write ${key} to localStorage:`, e);
  }
};

interface SarprasViewProps {
  classes: Kelas[];
  students: Student[];
  teachers: Teacher[];
  institution: Institution;
  onSaveClass: (updated: Kelas) => void;
  onDeleteClass: (classId: string, className: string) => void;
  addToast?: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification?: (title: string, message: string) => void;
}

// Default initial data for Prasarana (Infrastructure)
const INITIAL_PRASARANA: Prasarana[] = [
  { id: 'pra-1', nama: 'Ruang Kelas VII-A', tipe: 'Ruang Kelas', kondisi: 'Baik', luas: 56, keterangan: 'Gedung A, Lantai 1' },
  { id: 'pra-2', nama: 'Ruang Kelas VIII-B', tipe: 'Ruang Kelas', kondisi: 'Baik', luas: 56, keterangan: 'Gedung A, Lantai 2' },
  { id: 'pra-3', nama: 'Ruang Kelas IX-A', tipe: 'Ruang Kelas', kondisi: 'Baik', luas: 56, keterangan: 'Gedung B, Lantai 1' },
  { id: 'pra-4', nama: 'Laboratorium Komputer', tipe: 'Laboratorium', kondisi: 'Baik', luas: 80, keterangan: 'Gedung C, Lantai 1' },
  { id: 'pra-5', nama: 'Perpustakaan Al-Hikmah', tipe: 'Perpustakaan', kondisi: 'Baik', luas: 72, keterangan: 'Gedung B, Lantai 2' },
  { id: 'pra-6', nama: 'Ruang Guru & TU', tipe: 'Kantor Guru', kondisi: 'Baik', luas: 64, keterangan: 'Gedung A, Lantai 1' },
  { id: 'pra-7', nama: 'Lapangan Olahraga Utama', tipe: 'Fasilitas Olahraga', kondisi: 'Rusak Ringan', luas: 300, keterangan: 'Halaman Utama Madrasah' }
];

// Default initial data for Sarana (Equipment / Assets)
const INITIAL_SARANA: Sarana[] = [
  { id: 'sar-1', nama: 'Meja Siswa Kayu', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-1', merkSpec: 'Kayu Jati Minimalis', tahunPengadaan: '2024' },
  { id: 'sar-2', nama: 'Kursi Siswa Besi', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-1', merkSpec: 'Rangka Besi Alas Kayu', tahunPengadaan: '2024' },
  { id: 'sar-3', nama: 'Meja Siswa Kayu', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-2', merkSpec: 'Kayu Jati Minimalis', tahunPengadaan: '2023' },
  { id: 'sar-4', nama: 'Kursi Siswa Besi', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-2', merkSpec: 'Rangka Besi Alas Kayu', tahunPengadaan: '2023' },
  { id: 'sar-5', nama: 'Meja Siswa Kayu', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-3', merkSpec: 'Kayu Jati Minimalis', tahunPengadaan: '2024' },
  { id: 'sar-6', nama: 'Kursi Siswa Besi', kategori: 'Meubeler', jumlah: 32, kondisi: 'Baik', lokasiPrasaranaId: 'pra-3', merkSpec: 'Rangka Besi Alas Kayu', tahunPengadaan: '2024' },
  { id: 'sar-7', nama: 'Proyektor Epson EB-X41', kategori: 'Elektronik', jumlah: 1, kondisi: 'Baik', lokasiPrasaranaId: 'pra-1', merkSpec: 'Epson LCD Projector HD', tahunPengadaan: '2025' },
  { id: 'sar-8', nama: 'Proyektor Epson EB-X41', kategori: 'Elektronik', jumlah: 1, kondisi: 'Baik', lokasiPrasaranaId: 'pra-2', merkSpec: 'Epson LCD Projector HD', tahunPengadaan: '2025' },
  { id: 'sar-9', nama: 'Proyektor Epson EB-X41', kategori: 'Elektronik', jumlah: 1, kondisi: 'Rusak Ringan', lokasiPrasaranaId: 'pra-3', merkSpec: 'Epson LCD Projector HD', tahunPengadaan: '2023' },
  { id: 'sar-10', nama: 'PC Client Lenovo ThinkCentre', kategori: 'Elektronik', jumlah: 24, kondisi: 'Baik', lokasiPrasaranaId: 'pra-4', merkSpec: 'Intel Core i5, RAM 8GB, SSD 256GB', tahunPengadaan: '2024' },
  { id: 'sar-11', nama: 'Buku Paket Bahasa Arab VII', kategori: 'Buku/Pustaka', jumlah: 80, kondisi: 'Baik', lokasiPrasaranaId: 'pra-5', merkSpec: 'Kemenag RI Cetakan 2023', tahunPengadaan: '2023' },
  { id: 'sar-12', nama: 'Meja Kerja Guru Jati', kategori: 'Meubeler', jumlah: 10, kondisi: 'Baik', lokasiPrasaranaId: 'pra-6', merkSpec: 'Kayu Jati 1 Biro', tahunPengadaan: '2022' },
  { id: 'sar-13', nama: 'Kursi Busa Putar Savello', kategori: 'Meubeler', jumlah: 12, kondisi: 'Baik', lokasiPrasaranaId: 'pra-6', merkSpec: 'Kursi Kerja Ergonomis', tahunPengadaan: '2023' },
  { id: 'sar-14', nama: 'AC Split Panasonic 1.5 PK', kategori: 'Elektronik', jumlah: 2, kondisi: 'Baik', lokasiPrasaranaId: 'pra-6', merkSpec: 'Panasonic R32 Eco', tahunPengadaan: '2024' },
  { id: 'sar-15', nama: 'Gawang Futsal Portable & Net', kategori: 'Peralatan Olahraga', jumlah: 2, kondisi: 'Rusak Ringan', lokasiPrasaranaId: 'pra-7', merkSpec: 'Besi Pipa 2 Inch Portable', tahunPengadaan: '2022' }
];

export const SarprasView: React.FC<SarprasViewProps> = ({
  classes,
  students,
  teachers,
  institution,
  onSaveClass,
  onDeleteClass,
  addToast,
  addNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'kelas' | 'sarana' | 'prasarana'>('kelas');

  // --- Prasarana States ---
  const [prasaranaList, setPrasaranaList] = useState<Prasarana[]>(() => {
    try {
      const saved = localStorage.getItem('mts_prasarana');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_PRASARANA;
    } catch (e) {
      console.error("Failed to parse mts_prasarana in SarprasView:", e);
      return INITIAL_PRASARANA;
    }
  });

  // --- Sarana States ---
  const [saranaList, setSaranaList] = useState<Sarana[]>(() => {
    try {
      const saved = localStorage.getItem('mts_sarana');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : INITIAL_SARANA;
    } catch (e) {
      console.error("Failed to parse mts_sarana in SarprasView:", e);
      return INITIAL_SARANA;
    }
  });

  // Sync back to LocalStorage
  useEffect(() => {
    safeSetItem('mts_prasarana', JSON.stringify(prasaranaList));
  }, [prasaranaList]);

  useEffect(() => {
    safeSetItem('mts_sarana', JSON.stringify(saranaList));
  }, [saranaList]);

  // Helper local toast/notification fallback
  const triggerToast = (message: string, action: string, type: 'success' | 'info' | 'error') => {
    if (addToast) {
      addToast(message, action, type);
    } else {
      console.log(`[Toast] ${action}: ${message} (${type})`);
    }
  };

  const triggerNotification = (title: string, message: string) => {
    if (addNotification) {
      addNotification(title, message);
    } else {
      console.log(`[Notification] ${title}: ${message}`);
    }
  };

  // --- Filter & Search States ---
  // Sarana Filters
  const [saranaSearch, setSaranaSearch] = useState('');
  const [saranaKategoriFilter, setSaranaKategoriFilter] = useState('Semua Kategori');
  const [saranaKondisiFilter, setSaranaKondisiFilter] = useState('Semua Kondisi');
  const [saranaLokasiFilter, setSaranaLokasiFilter] = useState('Semua Lokasi');

  // Prasarana Filters
  const [prasaranaSearch, setPrasaranaSearch] = useState('');
  const [prasaranaTipeFilter, setPrasaranaTipeFilter] = useState('Semua Tipe');
  const [prasaranaKondisiFilter, setPrasaranaKondisiFilter] = useState('Semua Kondisi');

  // --- Modal Forms state ---
  const [prasaranaModalOpen, setPrasaranaModalOpen] = useState(false);
  const [editingPrasarana, setEditingPrasarana] = useState<Prasarana | null>(null);
  const [prasaranaForm, setPrasaranaForm] = useState<Omit<Prasarana, 'id'>>({
    nama: '',
    tipe: 'Ruang Kelas',
    kondisi: 'Baik',
    luas: 0,
    keterangan: ''
  });

  const [saranaModalOpen, setSaranaModalOpen] = useState(false);
  const [editingSarana, setEditingSarana] = useState<Sarana | null>(null);
  const [saranaForm, setSaranaForm] = useState<Omit<Sarana, 'id'>>({
    nama: '',
    kategori: 'Elektronik',
    jumlah: 1,
    kondisi: 'Baik',
    lokasiPrasaranaId: 'unassigned',
    merkSpec: '',
    tahunPengadaan: new Date().getFullYear().toString()
  });

  // --- Detail Room Modal State ---
  const [detailPrasarana, setDetailPrasarana] = useState<Prasarana | null>(null);

  // --- Prasarana Operations ---
  const handleOpenAddPrasarana = () => {
    setEditingPrasarana(null);
    setPrasaranaForm({
      nama: '',
      tipe: 'Ruang Kelas',
      kondisi: 'Baik',
      luas: 54,
      keterangan: ''
    });
    setPrasaranaModalOpen(true);
  };

  const handleOpenEditPrasarana = (p: Prasarana, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering details modal
    setEditingPrasarana(p);
    setPrasaranaForm({
      nama: p.nama,
      tipe: p.tipe,
      kondisi: p.kondisi,
      luas: p.luas,
      keterangan: p.keterangan
    });
    setPrasaranaModalOpen(true);
  };

  const handleSavePrasarana = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prasaranaForm.nama.trim()) return;

    if (editingPrasarana) {
      // Editing
      setPrasaranaList(prev => prev.map(p => p.id === editingPrasarana.id ? { ...p, ...prasaranaForm } : p));
      triggerToast(`Data prasarana "${prasaranaForm.nama}" berhasil diperbarui`, 'Sarpras', 'success');
      triggerNotification('Pembaruan Prasarana', `Prasarana "${prasaranaForm.nama}" telah berhasil diperbarui.`);
    } else {
      // Adding new
      const newPrasarana: Prasarana = {
        id: `pra-${Date.now()}`,
        ...prasaranaForm
      };
      setPrasaranaList(prev => [...prev, newPrasarana]);
      triggerToast(`Prasarana "${prasaranaForm.nama}" berhasil ditambahkan`, 'Sarpras', 'success');
      triggerNotification('Prasarana Baru', `Prasarana baru "${prasaranaForm.nama}" (${prasaranaForm.tipe}) telah ditambahkan.`);
    }
    setPrasaranaModalOpen(false);
  };

  const handleDeletePrasarana = (p: Prasarana, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Apakah Anda yakin ingin menghapus prasarana "${p.nama}"? Semua sarana/inventaris yang terhubung dengan ruangan ini akan berstatus "Belum Ditempatkan".`)) {
      setPrasaranaList(prev => prev.filter(item => item.id !== p.id));
      
      // Update Sarana linked to this room to be unassigned
      setSaranaList(prev => prev.map(s => s.lokasiPrasaranaId === p.id ? { ...s, lokasiPrasaranaId: 'unassigned' } : s));

      triggerToast(`Prasarana "${p.nama}" berhasil dihapus`, 'Sarpras', 'success');
      triggerNotification('Prasarana Dihapus', `Prasarana "${p.nama}" beserta kaitan inventarisnya telah dihapus.`);
    }
  };

  // --- Sarana Operations ---
  const handleOpenAddSarana = () => {
    setEditingSarana(null);
    setSaranaForm({
      nama: '',
      kategori: 'Meubeler',
      jumlah: 10,
      kondisi: 'Baik',
      lokasiPrasaranaId: 'unassigned',
      merkSpec: '',
      tahunPengadaan: new Date().getFullYear().toString()
    });
    setSaranaModalOpen(true);
  };

  const handleOpenEditSarana = (s: Sarana) => {
    setEditingSarana(s);
    setSaranaForm({
      nama: s.nama,
      kategori: s.kategori,
      jumlah: s.jumlah,
      kondisi: s.kondisi,
      lokasiPrasaranaId: s.lokasiPrasaranaId,
      merkSpec: s.merkSpec,
      tahunPengadaan: s.tahunPengadaan
    });
    setSaranaModalOpen(true);
  };

  const handleSaveSarana = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saranaForm.nama.trim()) return;

    if (editingSarana) {
      // Editing
      setSaranaList(prev => prev.map(s => s.id === editingSarana.id ? { ...s, ...saranaForm } : s));
      triggerToast(`Data sarana "${saranaForm.nama}" berhasil diperbarui`, 'Sarpras', 'success');
    } else {
      // Adding new
      const newSarana: Sarana = {
        id: `sar-${Date.now()}`,
        ...saranaForm
      };
      setSaranaList(prev => [...prev, newSarana]);
      triggerToast(`Sarana "${saranaForm.nama}" berhasil ditambahkan`, 'Sarpras', 'success');
    }
    setSaranaModalOpen(false);
  };

  const handleDeleteSarana = (s: Sarana) => {
    if (confirm(`Apakah Anda yakin ingin menghapus sarana "${s.nama}" dari database?`)) {
      setSaranaList(prev => prev.filter(item => item.id !== s.id));
      triggerToast(`Sarana "${s.nama}" berhasil dihapus`, 'Sarpras', 'success');
      triggerNotification('Sarana Dihapus', `Data sarana/inventaris "${s.nama}" telah dihapus secara permanen.`);
    }
  };

  // --- Stats Calculations ---
  // Sarana Stats
  const totalSaranaUnits = saranaList.reduce((acc, curr) => acc + curr.jumlah, 0);
  const goodSaranaCount = saranaList.filter(s => s.kondisi === 'Baik').reduce((acc, curr) => acc + curr.jumlah, 0);
  const damagedSaranaCount = saranaList.filter(s => s.kondisi !== 'Baik').reduce((acc, curr) => acc + curr.jumlah, 0);

  // Prasarana Stats
  const totalPrasaranaLuas = prasaranaList.reduce((acc, curr) => acc + curr.luas, 0);
  const goodPrasaranaCount = prasaranaList.filter(p => p.kondisi === 'Baik').length;

  // --- Filtering Logic ---
  const filteredSarana = saranaList.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(saranaSearch.toLowerCase()) || 
                          s.merkSpec.toLowerCase().includes(saranaSearch.toLowerCase());
    const matchesKategori = saranaKategoriFilter === 'Semua Kategori' || s.kategori === saranaKategoriFilter;
    const matchesKondisi = saranaKondisiFilter === 'Semua Kondisi' || s.kondisi === saranaKondisiFilter;
    const matchesLokasi = saranaLokasiFilter === 'Semua Lokasi' || 
                          (saranaLokasiFilter === 'Belum Ditempatkan' && s.lokasiPrasaranaId === 'unassigned') ||
                          s.lokasiPrasaranaId === saranaLokasiFilter;
    return matchesSearch && matchesKategori && matchesKondisi && matchesLokasi;
  });

  const filteredPrasarana = prasaranaList.filter(p => {
    const matchesSearch = p.nama.toLowerCase().includes(prasaranaSearch.toLowerCase()) || 
                          p.keterangan.toLowerCase().includes(prasaranaSearch.toLowerCase());
    const matchesTipe = prasaranaTipeFilter === 'Semua Tipe' || p.tipe === prasaranaTipeFilter;
    const matchesKondisi = prasaranaKondisiFilter === 'Semua Kondisi' || p.kondisi === prasaranaKondisiFilter;
    return matchesSearch && matchesTipe && matchesKondisi;
  });

  // Helper to get Room Name from ID
  const getPrasaranaName = (id: string) => {
    if (id === 'unassigned') return 'Belum Ditempatkan';
    const found = prasaranaList.find(p => p.id === id);
    return found ? found.nama : 'Tidak Diketahui';
  };

  // Icon generator for Prasarana Type
  const getPrasaranaIcon = (tipe: Prasarana['tipe']) => {
    switch (tipe) {
      case 'Ruang Kelas':
        return <School className="w-6 h-6 text-teal-600" />;
      case 'Laboratorium':
        return <Monitor className="w-6 h-6 text-sky-600" />;
      case 'Perpustakaan':
        return <BookOpen className="w-6 h-6 text-emerald-600" />;
      case 'Kantor Guru':
        return <Sofa className="w-6 h-6 text-amber-600" />;
      case 'Fasilitas Olahraga':
        return <Trophy className="w-6 h-6 text-rose-600" />;
      default:
        return <Building2 className="w-6 h-6 text-slate-600" />;
    }
  };

  // Color mapper for conditions
  const getConditionColor = (kondisi: string) => {
    switch (kondisi) {
      case 'Baik':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Rusak Ringan':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Rusak Berat':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  // Color mapper for sarana categories
  const getCategoryBadgeColor = (kat: string) => {
    switch (kat) {
      case 'Elektronik':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Meubeler':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Alat Peraga':
        return 'bg-teal-50 text-teal-700 border-teal-100';
      case 'Buku/Pustaka':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Peralatan Olahraga':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="animate-fade-in block text-left">
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl mb-8 overflow-x-auto w-full max-w-lg scrollbar-none">
        <button
          onClick={() => setActiveTab('kelas')}
          className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'kelas'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Rombel Kelas
        </button>
        <button
          onClick={() => setActiveTab('sarana')}
          className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sarana'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Data Sarana
        </button>
        <button
          onClick={() => setActiveTab('prasarana')}
          className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'prasarana'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
          }`}
        >
          Prasarana
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all">
        {activeTab === 'kelas' && (
          <KelasView
            classes={classes}
            students={students}
            teachers={teachers}
            institution={institution}
            onSaveClass={onSaveClass}
            onDeleteClass={onDeleteClass}
          />
        )}
        
        {/* ================= DATA SARANA TAB ================= */}
        {activeTab === 'sarana' && (
          <div className="space-y-6">
            {/* Sarana Statistics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                  <Box className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Sarana / Inventaris</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{totalSaranaUnits} Unit</h3>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kondisi Baik</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">
                    {goodSaranaCount} <span className="text-sm font-medium text-slate-400">/ {totalSaranaUnits} Unit</span>
                  </h3>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Perlu Perbaikan / Rusak</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">
                    {damagedSaranaCount} <span className="text-sm font-medium text-slate-400">Unit</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Bar Filters & Add */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto flex-1">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={saranaSearch}
                    onChange={(e) => setSaranaSearch(e.target.value)}
                    placeholder="Cari nama/spesifikasi sarana..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Kategori Filter */}
                <SearchableSelect
                  value={saranaKategoriFilter}
                  onChange={(val) => setSaranaKategoriFilter(val)}
                  options={['Semua Kategori', 'Elektronik', 'Meubeler', 'Alat Peraga', 'Buku/Pustaka', 'Peralatan Olahraga', 'Lainnya']}
                  placeholder="Semua Kategori"
                  showSearch={false}
                  isClearable={false}
                />

                {/* Kondisi Filter */}
                <SearchableSelect
                  value={saranaKondisiFilter}
                  onChange={(val) => setSaranaKondisiFilter(val)}
                  options={['Semua Kondisi', 'Baik', 'Rusak Ringan', 'Rusak Berat']}
                  placeholder="Semua Kondisi"
                  showSearch={false}
                  isClearable={false}
                />

                {/* Lokasi Filter */}
                <SearchableSelect
                  value={saranaLokasiFilter}
                  onChange={(val) => setSaranaLokasiFilter(val)}
                  options={[
                    { value: 'Semua Lokasi', label: 'Semua Lokasi' },
                    { value: 'Belum Ditempatkan', label: 'Belum Ditempatkan' },
                    ...prasaranaList.map(p => ({ value: p.id, label: p.nama }))
                  ]}
                  placeholder="Semua Lokasi"
                  showSearch={true}
                  isClearable={false}
                />
              </div>

              <button
                onClick={handleOpenAddSarana}
                className="w-full lg:w-auto flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-teal-100 cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Tambah Sarana</span>
              </button>
            </div>

            {/* Sarana Table Card */}
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Sarana</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Kategori</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Jumlah</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Kondisi</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Lokasi / Ruangan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Spesifikasi & Merk</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Pengadaan</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSarana.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-400 text-sm font-semibold">
                          Tidak ada data sarana yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredSarana.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/30 transition-all">
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-slate-800 text-xs block">{s.nama}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wide ${getCategoryBadgeColor(s.kategori)}`}>
                              {s.kategori}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-extrabold text-slate-700 text-xs">{s.jumlah} Unit</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wide ${getConditionColor(s.kondisi)}`}>
                              {s.kondisi}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {s.lokasiPrasaranaId === 'unassigned' ? (
                              <span className="text-slate-400 font-semibold text-xs italic">Belum Ditempatkan</span>
                            ) : (
                              <span className="font-bold text-teal-600 text-xs flex items-center">
                                <Building2 className="w-3.5 h-3.5 mr-1" />
                                {getPrasaranaName(s.lokasiPrasaranaId)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-500 font-semibold text-xs block max-w-xs truncate" title={s.merkSpec}>
                              {s.merkSpec || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-slate-500 text-xs">{s.tahunPengadaan}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleOpenEditSarana(s)}
                                className="p-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-xl transition-all cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSarana(s)}
                                className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= PRASARANA TAB ================= */}
        {activeTab === 'prasarana' && (
          <div className="space-y-6">
            {/* Prasarana Stats Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-teal-50 text-teal-600 rounded-2xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Ruangan / Prasarana</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{prasaranaList.length} Ruangan</h3>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <Folder className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Luas Bangunan</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{totalPrasaranaLuas} m²</h3>
                </div>
              </div>
              <div className="bento-card p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center space-x-4">
                <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kondisi Prima (Baik)</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">
                    {goodPrasaranaCount} <span className="text-sm font-medium text-slate-400">/ {prasaranaList.length} Ruang</span>
                  </h3>
                </div>
              </div>
            </div>

            {/* Top Bar Filters & Add */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto flex-1">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={prasaranaSearch}
                    onChange={(e) => setPrasaranaSearch(e.target.value)}
                    placeholder="Cari prasarana/ruangan..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Tipe Filter */}
                <SearchableSelect
                  value={prasaranaTipeFilter}
                  onChange={(val) => setPrasaranaTipeFilter(val)}
                  options={['Semua Tipe', 'Ruang Kelas', 'Laboratorium', 'Perpustakaan', 'Kantor Guru', 'Fasilitas Olahraga', 'Lainnya']}
                  placeholder="Semua Tipe"
                  showSearch={false}
                  isClearable={false}
                />

                {/* Kondisi Filter */}
                <SearchableSelect
                  value={prasaranaKondisiFilter}
                  onChange={(val) => setPrasaranaKondisiFilter(val)}
                  options={['Semua Kondisi', 'Baik', 'Rusak Ringan', 'Rusak Berat']}
                  placeholder="Semua Kondisi"
                  showSearch={false}
                  isClearable={false}
                />
              </div>

              <button
                onClick={handleOpenAddPrasarana}
                className="w-full lg:w-auto flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-teal-100 cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span>Tambah Prasarana</span>
              </button>
            </div>

            {/* Prasarana Grid View (Bento Style) */}
            {filteredPrasarana.length === 0 ? (
              <div className="bg-white border border-slate-100 p-12 rounded-3xl shadow-sm text-center">
                <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Tidak ada Prasarana</h3>
                <p className="text-slate-400 text-sm mt-1">Data prasarana tidak ditemukan berdasarkan filter yang diterapkan.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPrasarana.map((p) => {
                  // Count inventory inside this room
                  const itemsInRoom = saranaList.filter(s => s.lokasiPrasaranaId === p.id);
                  const totalItemsQty = itemsInRoom.reduce((acc, curr) => acc + curr.jumlah, 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() => setDetailPrasarana(p)}
                      className="bento-card group relative bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-teal-100 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      {/* Top Row: Type Icon & Condition */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-slate-50 group-hover:bg-teal-50/50 rounded-2xl transition-all">
                          {getPrasaranaIcon(p.tipe)}
                        </div>
                        <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold uppercase tracking-wide ${getConditionColor(p.kondisi)}`}>
                          {p.kondisi}
                        </span>
                      </div>

                      {/* Main info */}
                      <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">{p.tipe}</span>
                        <h4 className="text-base font-extrabold text-slate-800 mt-1 block truncate group-hover:text-teal-600 transition-colors">
                          {p.nama}
                        </h4>
                        <p className="text-slate-400 text-xs mt-1.5 font-medium line-clamp-2">
                          {p.keterangan || 'Tidak ada keterangan tambahan.'}
                        </p>
                      </div>

                      {/* Stats & Actions */}
                      <div className="border-t border-slate-100 pt-4 mt-5 flex justify-between items-center">
                        <div className="flex space-x-4">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Luas</span>
                            <span className="text-xs font-extrabold text-slate-700">{p.luas} m²</span>
                          </div>
                          <div className="border-l border-slate-100 pl-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Inventaris</span>
                            <span className="text-xs font-extrabold text-teal-600">{totalItemsQty} Unit</span>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex space-x-1.5">
                          <button
                            onClick={(e) => handleOpenEditPrasarana(p, e)}
                            className="p-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-xl transition-all cursor-pointer border border-transparent hover:border-teal-100"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeletePrasarana(p, e)}
                            className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL PRASARANA (ADD / EDIT) ================= */}
      {prasaranaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 text-left">
            <button
              onClick={() => setPrasaranaModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 pr-8">
              {editingPrasarana ? 'Edit Data Prasarana' : 'Tambah Prasarana Baru'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {editingPrasarana ? 'Perbarui informasi ruangan / area madrasah.' : 'Daftarkan bangunan, kelas, atau sarana fisik baru ke madrasah.'}
            </p>

            <form onSubmit={handleSavePrasarana} className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Prasarana / Ruang</label>
                <input
                  type="text"
                  required
                  value={prasaranaForm.nama}
                  onChange={(e) => setPrasaranaForm(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Ruang Kelas VII-C, Laboratorium Bahasa"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Tipe Prasarana</label>
                  <SearchableSelect
                    value={prasaranaForm.tipe}
                    onChange={(val) => setPrasaranaForm(prev => ({ ...prev, tipe: val as Prasarana['tipe'] }))}
                    options={['Ruang Kelas', 'Laboratorium', 'Perpustakaan', 'Kantor Guru', 'Fasilitas Olahraga', 'Lainnya']}
                    placeholder="-- Pilih Tipe Prasarana --"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Kondisi Fisik</label>
                  <SearchableSelect
                    value={prasaranaForm.kondisi}
                    onChange={(val) => setPrasaranaForm(prev => ({ ...prev, kondisi: val as Prasarana['kondisi'] }))}
                    options={['Baik', 'Rusak Ringan', 'Rusak Berat']}
                    placeholder="-- Pilih Kondisi Fisik --"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Luas Ruangan (m²)</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={prasaranaForm.luas || ''}
                  onChange={(e) => setPrasaranaForm(prev => ({ ...prev, luas: parseInt(e.target.value) || 0 }))}
                  placeholder="Luas ruangan dalam meter persegi"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Keterangan / Lokasi Detail</label>
                <textarea
                  value={prasaranaForm.keterangan}
                  onChange={(e) => setPrasaranaForm(prev => ({ ...prev, keterangan: e.target.value }))}
                  placeholder="Tuliskan detail info (contoh: Gedung Utara Lantai 2, disamping mushola)"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setPrasaranaModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL SARANA (ADD / EDIT) ================= */}
      {saranaModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 text-left">
            <button
              onClick={() => setSaranaModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-extrabold text-slate-800 pr-8">
              {editingSarana ? 'Edit Data Sarana' : 'Tambah Sarana / Inventaris'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              {editingSarana ? 'Perbarui informasi inventaris atau sarana pembelajaran.' : 'Daftarkan inventaris, perangkat elektronik, atau aset belajar baru.'}
            </p>

            <form onSubmit={handleSaveSarana} className="space-y-4 mt-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nama Barang / Inventaris</label>
                <input
                  type="text"
                  required
                  value={saranaForm.nama}
                  onChange={(e) => setSaranaForm(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Meja Siswa Kayu, Proyektor LCD"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Kategori</label>
                  <SearchableSelect
                    value={saranaForm.kategori}
                    onChange={(val) => setSaranaForm(prev => ({ ...prev, kategori: val as Sarana['kategori'] }))}
                    options={['Elektronik', 'Meubeler', 'Alat Peraga', 'Buku/Pustaka', 'Peralatan Olahraga', 'Lainnya']}
                    placeholder="-- Pilih Kategori --"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Kondisi</label>
                  <SearchableSelect
                    value={saranaForm.kondisi}
                    onChange={(val) => setSaranaForm(prev => ({ ...prev, kondisi: val as Sarana['kondisi'] }))}
                    options={['Baik', 'Rusak Ringan', 'Rusak Berat']}
                    placeholder="-- Pilih Kondisi --"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Jumlah (Unit)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={saranaForm.jumlah || ''}
                    onChange={(e) => setSaranaForm(prev => ({ ...prev, jumlah: parseInt(e.target.value) || 0 }))}
                    placeholder="Contoh: 10"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Tahun Pengadaan</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={saranaForm.tahunPengadaan}
                    onChange={(e) => setSaranaForm(prev => ({ ...prev, tahunPengadaan: e.target.value }))}
                    placeholder="Contoh: 2024"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] text-slate-600 font-medium mb-1.5">Lokasi Penempatan</label>
                <SearchableSelect
                  value={saranaForm.lokasiPrasaranaId}
                  onChange={(val) => setSaranaForm(prev => ({ ...prev, lokasiPrasaranaId: val }))}
                  options={[
                    { value: 'unassigned', label: 'Belum Ditempatkan (Gudang/Cadangan)' },
                    ...prasaranaList.map(p => ({ value: p.id, label: p.nama }))
                  ]}
                  placeholder="-- Pilih Lokasi Penempatan --"
                  showSearch={true}
                  isClearable={false}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Spesifikasi / Merk / Keterangan</label>
                <input
                  type="text"
                  value={saranaForm.merkSpec}
                  onChange={(e) => setSaranaForm(prev => ({ ...prev, merkSpec: e.target.value }))}
                  placeholder="Contoh: Asus Core i3, Kayu Jati Perhutani"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSaranaModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL DETAIL PRASARANA (INVENTARIS DALAM RUANGAN) ================= */}
      {detailPrasarana && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-100 text-left">
            <button
              onClick={() => setDetailPrasarana(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex items-center space-x-4 pb-4 border-b border-slate-100">
              <div className="p-3.5 bg-teal-50 text-teal-600 rounded-2xl">
                {getPrasaranaIcon(detailPrasarana.tipe)}
              </div>
              <div>
                <span className="text-[9px] font-black text-teal-600 uppercase tracking-widest block">{detailPrasarana.tipe}</span>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {detailPrasarana.nama}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Luas Ruang: {detailPrasarana.luas} m² &bull; Kondisi: {detailPrasarana.kondisi} &bull; {detailPrasarana.keterangan}
                </p>
              </div>
            </div>

            {/* List of assets inside this specific room */}
            <div className="mt-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
                Daftar Inventaris yang Berada di Ruangan Ini
              </h4>

              <div className="max-h-[300px] overflow-y-auto pr-1 border border-slate-100 rounded-2xl bg-slate-50/30">
                {saranaList.filter(s => s.lokasiPrasaranaId === detailPrasarana.id).length === 0 ? (
                  <div className="text-center py-12">
                    <Box className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs font-semibold">Ruangan ini dalam keadaan kosong.</p>
                    <p className="text-slate-400 text-[10px] mt-1">Belum ada sarana atau inventaris yang ditempatkan di ruangan ini.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/50 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-100">
                        <th className="px-4 py-2.5">Nama Barang</th>
                        <th className="px-4 py-2.5">Kategori</th>
                        <th className="px-4 py-2.5">Jumlah</th>
                        <th className="px-4 py-2.5">Kondisi</th>
                        <th className="px-4 py-2.5">Spesifikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {saranaList
                        .filter(s => s.lokasiPrasaranaId === detailPrasarana.id)
                        .map((s) => (
                          <tr key={s.id} className="text-xs hover:bg-slate-50 transition-all">
                            <td className="px-4 py-3 font-extrabold text-slate-800">{s.nama}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getCategoryBadgeColor(s.kategori)}`}>
                                {s.kategori}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">{s.jumlah} Unit</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-bold uppercase tracking-wide ${getConditionColor(s.kondisi)}`}>
                                {s.kondisi}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-semibold">{s.merkSpec || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setDetailPrasarana(null)}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
