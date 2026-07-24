import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect, useMemo } from 'react';
import { syncEMateriToSupabase, deleteEMateriFromSupabase } from '../lib/supabaseClient';
import { SearchableSelect } from './SearchableSelect';

import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Pencil, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  ArrowLeft, 
  Calendar, 
  User, 
  Download, 
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Info,
  X,
  FolderOpen,
  Play,
  Book
} from 'lucide-react';
import { Kelas, Teacher, MataPelajaran, EMateri, UserRole, Institution } from '../types';

interface EMateriViewProps {
  classes: Kelas[];
  teachers: Teacher[];
  institution?: Institution;
  addToast?: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification?: (title: string, message: string) => void;
  currentUser?: any;
  userRole?: UserRole | null;
}


const DEFAULT_SUBJECTS: MataPelajaran[] = [
  { id: 'mapel-1', kode: 'MAT-7', nama: 'Matematika', tingkat: 'VII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Drs. H. Ahmad Fauzi' },
  { id: 'mapel-2', kode: 'IPA-7', nama: 'Ilmu Pengetahuan Alam', tingkat: 'VII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Siti Aminah, S.Pd.' },
  { id: 'mapel-3', kode: 'BIN-7', nama: 'Bahasa Indonesia', tingkat: 'VII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Budi Santoso, M.Pd.' },
  { id: 'mapel-4', kode: 'ENG-7', nama: 'Bahasa Inggris', tingkat: 'VII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Rina Wijaya, S.Pd.' },
  { id: 'mapel-5', kode: 'PJK-7', nama: 'Pendidikan Jasmani & Kesehatan', tingkat: 'VII', kategori: 'Mapel Wajib', jumlahJam: 2, guruPengampu: 'Ahmad Sodikin, S.Pd.' },
  { id: 'mapel-6', kode: 'MAT-8', nama: 'Matematika', tingkat: 'VIII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Drs. H. Ahmad Fauzi' },
  { id: 'mapel-7', kode: 'IPA-8', nama: 'Ilmu Pengetahuan Alam', tingkat: 'VIII', kategori: 'Mapel Wajib', jumlahJam: 4, guruPengampu: 'Siti Aminah, S.Pd.' },
];

const INITIAL_MATERI: EMateri[] = [
  {
    id: 'mat-1',
    mapelId: 'mapel-1',
    judul: 'E-Book Aljabar Dasar Kelas VII',
    deskripsi: 'Buku panduan lengkap tentang konsep variabel, koefisien, konstanta, dan penyelesaian persamaan linear satu variabel.',
    tipe: 'Dokumen',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    tanggalUpload: '2026-06-15T08:30:00.000Z',
    pengunggah: 'Drs. H. Ahmad Fauzi'
  },
  {
    id: 'mat-2',
    mapelId: 'mapel-1',
    judul: 'Video Tutorial: Menyelesaikan Operasi Pecahan Aljabar',
    deskripsi: 'Langkah demi langkah menyederhanakan pecahan aljabar dengan penyebut berbeda. Sangat cocok untuk persiapan kuis.',
    tipe: 'Video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tanggalUpload: '2026-06-18T10:15:00.000Z',
    pengunggah: 'Drs. H. Ahmad Fauzi'
  },
  {
    id: 'mat-3',
    mapelId: 'mapel-2',
    judul: 'Lembar Kerja Siswa (LKS): Sistem Organ Manusia',
    deskripsi: 'Petunjuk praktikum mandiri tentang identifikasi organ pernapasan dan pencernaan manusia.',
    tipe: 'Dokumen',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    tanggalUpload: '2026-06-20T09:00:00.000Z',
    pengunggah: 'Siti Aminah, S.Pd.'
  },
  {
    id: 'mat-4',
    mapelId: 'mapel-2',
    judul: 'Bagan Infografis Sel Hewan vs Sel Tumbuhan',
    deskripsi: 'Gambar resolusi tinggi berlabel yang membandingkan organel-organel sel hewan dan tumbuhan.',
    tipe: 'Gambar',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&q=80&w=800',
    tanggalUpload: '2026-06-22T14:20:00.000Z',
    pengunggah: 'Siti Aminah, S.Pd.'
  },
  {
    id: 'mat-5',
    mapelId: 'mapel-3',
    judul: 'Link Simulasi Menulis Teks Prosedur Interaktif',
    deskripsi: 'Situs interaktif untuk melatih penulisan struktur teks prosedur secara logis dan runtut.',
    tipe: 'Link',
    url: 'https://example.com/interactive-prosedur',
    tanggalUpload: '2026-06-24T11:05:00.000Z',
    pengunggah: 'Budi Santoso, M.Pd.'
  }
];

// Helper functions to parse and sort educational grades dynamically (supports SD, SMP, SMA, Roman, or Numbers)
const romanToValue = (rom: string): number => {
  const roman: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let val = 0;
  const uppercaseRom = rom.toUpperCase().trim();
  for (let i = 0; i < uppercaseRom.length; i++) {
    const current = roman[uppercaseRom[i]] || 0;
    const next = roman[uppercaseRom[i+1]] || 0;
    if (current < next) {
      val += next - current;
      i++;
    } else {
      val += current;
    }
  }
  return val;
};

const getTingkatSortingOrder = (tingkat: string): number => {
  const cleanTingkat = tingkat.trim();
  const num = parseInt(cleanTingkat, 10);
  if (!isNaN(num)) return num;
  const romVal = romanToValue(cleanTingkat);
  if (romVal > 0) return romVal;
  return 999;
};

const formatGuruDisplay = (guruPengampu: string | undefined): string => {
  if (!guruPengampu) return 'Belum Ditunjuk';
  try {
    const parsed = JSON.parse(guruPengampu);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'Belum Ditunjuk';
      return parsed.map(item => item.guru).filter(Boolean).join(', ');
    }
  } catch (e) {
    // Fallback plain string
  }
  return guruPengampu || 'Belum Ditunjuk';
};

const getGuruNames = (guruPengampu: string | undefined): string[] => {
  if (!guruPengampu) return [];
  try {
    const parsed = JSON.parse(guruPengampu);
    if (Array.isArray(parsed)) {
      return parsed.map(item => item.guru).filter(Boolean);
    }
  } catch (e) {
    // Fallback plain string
  }
  return [guruPengampu];
};

const normalizeTingkat = (t: string): string => {
  if (!t) return '';
  const clean = t.trim().toUpperCase();
  if (clean === 'I' || clean === '1') return '1';
  if (clean === 'II' || clean === '2') return '2';
  if (clean === 'III' || clean === '3') return '3';
  if (clean === 'IV' || clean === '4') return '4';
  if (clean === 'V' || clean === '5') return '5';
  if (clean === 'VI' || clean === '6') return '6';
  if (clean === 'VII' || clean === '7') return '7';
  if (clean === 'VIII' || clean === '8') return '8';
  if (clean === 'IX' || clean === '9') return '9';
  if (clean === 'X' || clean === '10') return '10';
  if (clean === 'XI' || clean === '11') return '11';
  if (clean === 'XII' || clean === '12') return '12';
  return t;
};

const extractTingkatFromClassName = (name: string): string => {
  if (!name) return '';
  const clean = name.trim().toUpperCase();
  if (clean.includes('VIII') || clean.includes('8')) return '8';
  if (clean.includes('VII') || clean.includes('7')) return '7';
  if (clean.includes('IX') || clean.includes('9')) return '9';
  if (clean.includes('XII') || clean.includes('12')) return '12';
  if (clean.includes('XI') || clean.includes('11')) return '11';
  if (clean.includes('X') || clean.includes('10')) return '10';
  if (clean.includes('VI') || clean.includes('6')) return '6';
  if (clean.includes('IV') || clean.includes('4')) return '4';
  if (clean.includes('V') || clean.includes('5')) return '5';
  if (clean.includes('III') || clean.includes('3')) return '3';
  if (clean.includes('II') || clean.includes('2')) return '2';
  if (clean.includes('I') || clean.includes('1')) return '1';
  return name;
};

export const EMateriView: React.FC<EMateriViewProps> = ({
  classes,
  teachers,
  institution,
  addToast,
  addNotification,
  currentUser,
  userRole
}) => {
  // Subjects State
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  // Materials State
  const [materials, setMaterials] = useState<EMateri[]>([]);

  // Determine Tingkat Options based on Institution Level
  const tingkatOptions = useMemo(() => {
    const lvl = (institution?.level || '').toLowerCase();
    if (lvl.includes('sd') || lvl.includes('mi') || lvl.includes('paket a')) {
      return ['1', '2', '3', '4', '5', '6'];
    } else if (lvl.includes('smp') || lvl.includes('mts') || lvl.includes('paket b')) {
      return ['7', '8', '9'];
    } else if (lvl.includes('sma') || lvl.includes('smk') || lvl.includes('ma') || lvl.includes('mak') || lvl.includes('paket c')) {
      return ['10', '11', '12'];
    }
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }, [institution?.level]);

  // Use the school levels for the folder directory and filtering dropdown
  const uniqueTingkats = tingkatOptions;

  // Navigation states
  const [selectedMapelId, setSelectedMapelId] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTingkat, setSelectedTingkat] = useState<string>('Semua');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Semua');
  const [materiSearchQuery, setMateriSearchQuery] = useState('');

  // Modal / Form state for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<EMateri | null>(null);
  
  // Form Inputs
  const [formJudul, setFormJudul] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formTipe, setFormTipe] = useState<'Dokumen' | 'Video' | 'Link' | 'Gambar'>('Dokumen');
  const [formUrl, setFormUrl] = useState('');
  const [formPengunggah, setFormPengunggah] = useState('');
  const [formGuruId, setFormGuruId] = useState('');
  const [formKelasId, setFormKelasId] = useState('Semua');
  const [formMapelId, setFormMapelId] = useState('');

  // Teacher Live Search State
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  // Tab State for Guru Active Dashboard View
  const [guruActiveTab, setGuruActiveTab] = useState<'my-materials' | 'explore'>('my-materials');


  // Load Initial Data
  useEffect(() => {
    // Subjects
    try {
      const savedSubjects = localStorage.getItem('mts_subjects');
      if (savedSubjects && savedSubjects !== 'undefined' && savedSubjects !== 'null') {
        try { setSubjects(safeJSONParse(savedSubjects)); } catch(e) { setSubjects(DEFAULT_SUBJECTS); }
      } else {
        localStorage.setItem('mts_subjects', JSON.stringify(DEFAULT_SUBJECTS));
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch (e) {
      console.error("Failed to parse mts_subjects:", e);
      setSubjects(DEFAULT_SUBJECTS);
    }

    // e-Materi
    try {
      const savedMateri = localStorage.getItem('mts_emateri');
      if (savedMateri && savedMateri !== 'undefined' && savedMateri !== 'null') {
        try { setMaterials(safeJSONParse(savedMateri)); } catch(e) { setMaterials(INITIAL_MATERI); }
      } else {
        localStorage.setItem('mts_emateri', JSON.stringify(INITIAL_MATERI));
        setMaterials(INITIAL_MATERI);
      }
    } catch (e) {
      console.error("Failed to parse mts_emateri:", e);
      setMaterials(INITIAL_MATERI);
    }
  }, []);

  // Save materials to LocalStorage whenever they change
  const saveMaterialsToStorage = (updatedMaterials: EMateri[]) => {
    localStorage.setItem('mts_emateri', JSON.stringify(updatedMaterials));
    setMaterials(updatedMaterials);
  };

  // Derived: current selected MataPelajaran
  const selectedMapel = subjects.find(s => s.id === selectedMapelId);

  // Filtered Subjects (First Screen)
  const filteredSubjects = subjects.filter(sub => {
    const matchesSearch = sub.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sub.kode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          formatGuruDisplay(sub.guruPengampu).toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTingkat = selectedTingkat === 'Semua' || 
                           normalizeTingkat(sub.tingkat) === normalizeTingkat(selectedTingkat);
    
    return matchesSearch && matchesTingkat;
  });

  // Filtered Materials (Second Screen)
  const filteredMaterials = materials.filter(mat => {
    if (mat.mapelId !== selectedMapelId) return false;

    const matchesSearch = mat.judul.toLowerCase().includes(materiSearchQuery.toLowerCase()) || 
                          mat.deskripsi.toLowerCase().includes(materiSearchQuery.toLowerCase());
    
    const matchesType = selectedTypeFilter === 'Semua' || mat.tipe === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  // Siswa Materials filtering based on target class
  const studentClass = currentUser?.kelas || '';
  const studentTingkat = studentClass ? extractTingkatFromClassName(studentClass) : '7';

  const siswaMaterials = materials.filter(mat => {
    const matchesSearch = mat.judul.toLowerCase().includes(materiSearchQuery.toLowerCase()) || 
                          mat.deskripsi.toLowerCase().includes(materiSearchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const matchesType = selectedTypeFilter === 'Semua' || mat.tipe === selectedTypeFilter;
    if (!matchesType) return false;

    if (mat.kelasId && mat.kelasId !== 'Semua') {
      return mat.kelasId.toLowerCase() === studentClass.toLowerCase();
    }
    
    const mapel = subjects.find(s => s.id === mat.mapelId);
    if (mapel) {
      return normalizeTingkat(mapel.tingkat) === normalizeTingkat(studentTingkat);
    }

    return true;
  });

  // Guru own materials list (My Materials Tab)
  const myMaterials = materials.filter(mat => {
    const isOwner = (currentUser && mat.guruId === currentUser.id) || 
                    (currentUser && mat.pengunggah && mat.pengunggah.toLowerCase() === currentUser.nama.toLowerCase());
    if (!isOwner) return false;

    const matchesSearch = mat.judul.toLowerCase().includes(materiSearchQuery.toLowerCase()) || 
                          mat.deskripsi.toLowerCase().includes(materiSearchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'Semua' || mat.tipe === selectedTypeFilter;

    return matchesSearch && matchesType;
  });

  // Permissions helper
  const canEditOrDelete = (mat: EMateri) => {
    if (userRole === 'admin' || userRole === 'super_admin') return true;
    if (userRole === 'guru') {
      return mat.guruId === currentUser?.id || (mat.pengunggah && mat.pengunggah.toLowerCase() === currentUser?.nama?.toLowerCase());
    }
    return false;
  };

  // Calculate material count for each subject to display on cards
  const getMaterialCount = (mapelId: string) => {
    return materials.filter(m => m.mapelId === mapelId).length;
  };

  // Open Form modal
  const handleOpenForm = (material: EMateri | null = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormJudul(material.judul);
      setFormDeskripsi(material.deskripsi);
      setFormTipe(material.tipe);
      setFormUrl(material.url);
      setFormPengunggah(material.pengunggah);
      setFormGuruId(material.guruId || '');
      setFormKelasId(material.kelasId || 'Semua');
      setFormMapelId(material.mapelId || '');
      setTeacherSearchQuery(material.pengunggah || '');
    } else {
      setEditingMaterial(null);
      setFormJudul('');
      setFormDeskripsi('');
      setFormTipe('Dokumen');
      setFormUrl('');
      setFormKelasId('Semua');
      setFormMapelId(selectedMapelId || '');
      
      if (userRole === 'guru' && currentUser) {
        setFormPengunggah(currentUser.nama || '');
        setFormGuruId(currentUser.id || '');
        setTeacherSearchQuery(currentUser.nama || '');
      } else {
        // Default to teacher pengampu of selected mapel if available
        const teacherNames = getGuruNames(selectedMapel?.guruPengampu);
        const defaultName = teacherNames[0] || '';
        setFormPengunggah(defaultName);
        
        // Try to find corresponding teacher ID if available
        const matchedTeacher = teachers.find(t => t.nama.toLowerCase() === defaultName.toLowerCase());
        setFormGuruId(matchedTeacher?.id || '');
        setTeacherSearchQuery(defaultName);
      }
    }
    setIsModalOpen(true);
  };

  // Handle Form submission
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const targetMapelId = selectedMapelId || formMapelId;
    if (!targetMapelId) {
      addToast?.('Mata Pelajaran harus dipilih', 'Validasi', 'error');
      return;
    }

    if (!formJudul.trim()) {
      addToast?.('Judul materi tidak boleh kosong', 'Validasi', 'error');
      return;
    }
    // Only require URL for non-Gambar types, or if it is provided
    if (!formUrl.trim() && formTipe !== 'Gambar') {
      addToast?.('Tautan / URL materi tidak boleh kosong', 'Validasi', 'error');
      return;
    }

    let updatedMaterials = [...materials];
    const targetMapel = subjects.find(s => s.id === targetMapelId);

    if (editingMaterial) {
      // Edit mode
      const updatedMateri: EMateri = {
        ...editingMaterial,
        mapelId: targetMapelId,
        judul: formJudul,
        deskripsi: formDeskripsi,
        tipe: formTipe,
        url: formUrl.trim(),
        pengunggah: formPengunggah,
        guruId: formGuruId,
        kelasId: formKelasId,
        tanggalUpload: new Date().toISOString()
      };

      updatedMaterials = updatedMaterials.map(m => m.id === editingMaterial.id ? updatedMateri : m);

      addToast?.(`Materi "${formJudul}" berhasil diubah`, 'Sukses', 'success');
      addNotification?.('Materi Diperbarui', `E-Materi berjudul "${formJudul}" untuk mata pelajaran ${targetMapel?.nama || ''} telah diperbarui.`);

      // Sync to Supabase
      syncEMateriToSupabase(updatedMateri, true).then((res) => {
        if (!res.success) {
          addToast?.(res.error || 'Gagal menyinkronkan ke Supabase', 'Database Sync', 'error');
        } else {
          addToast?.(`Materi "${formJudul}" disinkronkan ke Cloud`, 'Database Sync', 'success');
        }
      });
    } else {
      // Add mode
      const newMateri: EMateri = {
        id: `mat-${Date.now()}`,
        mapelId: targetMapelId,
        judul: formJudul,
        deskripsi: formDeskripsi,
        tipe: formTipe,
        url: formUrl.trim(),
        tanggalUpload: new Date().toISOString(),
        pengunggah: formPengunggah || 'Sistem',
        guruId: formGuruId,
        kelasId: formKelasId
      };

      updatedMaterials.unshift(newMateri);
      addToast?.(`Materi baru "${formJudul}" berhasil diunggah`, 'Sukses', 'success');
      addNotification?.('Materi Baru Diunggah', `E-Materi baru berjudul "${formJudul}" telah berhasil diunggah oleh ${formPengunggah || 'Guru'}.`);

      // Sync to Supabase
      syncEMateriToSupabase(newMateri, true).then((res) => {
        if (!res.success) {
          addToast?.(res.error || 'Gagal menyinkronkan ke Supabase', 'Database Sync', 'error');
        } else {
          addToast?.(`Materi baru "${formJudul}" disinkronkan ke Cloud`, 'Database Sync', 'success');
        }
      });
    }

    saveMaterialsToStorage(updatedMaterials);
    setIsModalOpen(false);
  };

  // Handle deletion of material
  const handleDeleteMaterial = (id: string, judul: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus materi "${judul}"?`)) {
      const updated = materials.filter(m => m.id !== id);
      saveMaterialsToStorage(updated);
      addToast?.(`Materi "${judul}" berhasil dihapus`, 'Hapus Materi', 'error');

      // Sync deletion to Supabase
      deleteEMateriFromSupabase(id, true).then((res) => {
        if (!res.success) {
          addToast?.(res.error || 'Gagal menghapus dari Supabase', 'Database Sync', 'error');
        } else {
          addToast?.(`Materi "${judul}" otomatis dihapus dari Cloud`, 'Database Sync', 'info');
        }
      });
    }
  };

  // Render file/type badges nicely
  const renderTypeIcon = (type: EMateri['tipe'], size: number = 18) => {
    switch (type) {
      case 'Dokumen':
        return <FileText size={size} className="text-blue-500" />;
      case 'Video':
        return <Video size={size} className="text-red-500" />;
      case 'Link':
        return <LinkIcon size={size} className="text-teal-500" />;
      case 'Gambar':
        return <ImageIcon size={size} className="text-emerald-500" />;
      default:
        return <FileText size={size} className="text-slate-500" />;
    }
  };

  // Helper to extract YouTube video ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Helper to get random but stable gradient classes based on ID
  const getGradientClass = (id: string) => {
    const colors = [
      'from-indigo-600 to-purple-800',
      'from-teal-600 to-emerald-800',
      'from-rose-600 to-orange-700',
      'from-blue-600 to-cyan-800',
      'from-violet-600 to-fuchsia-800',
      'from-amber-600 to-rose-700'
    ];
    const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  // Helper to render beautiful visual covers for materials (no heavy DB, just beautiful visual presentation)
  const renderMaterialCover = (mat: EMateri) => {
    switch (mat.tipe) {
      case 'Dokumen': {
        const gradient = getGradientClass(mat.id);
        return (
          <div className={`h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-gradient-to-br ${gradient} flex items-center p-4 shadow-sm border border-black/10 group-hover:shadow-md transition-all duration-300`}>
            {/* Spine effect */}
            <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/15 border-r border-white/5" />
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10" />

            {/* Aesthetic geometric background decorations */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
            <div className="absolute right-4 top-4 w-12 h-12 bg-black/10 rounded-full blur-lg" />

            <div className="ml-4 flex flex-col justify-between h-full w-full text-white">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[8px] font-black uppercase tracking-widest border border-white/20">
                  📄 E-Book / PDF
                </span>
                <Book size={14} className="text-white/60" />
              </div>
              <div className="space-y-1 pr-2">
                <p className="font-extrabold text-[11px] leading-snug line-clamp-2 tracking-tight uppercase">
                  {mat.judul}
                </p>
                <div className="w-8 h-[2px] bg-white/40 rounded-full" />
              </div>
              <div className="text-[7px] text-white/50 font-mono tracking-wider flex items-center space-x-1">
                <span>MTS DIGITAL LIBRARY</span>
              </div>
            </div>
          </div>
        );
      }
      case 'Video': {
        const ytId = getYoutubeId(mat.url);
        const imageUrl = ytId 
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600';
        return (
          <div className="h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-slate-950 border border-slate-100/10 group-hover:shadow-md transition-all duration-300">
            <img 
              src={imageUrl} 
              alt={mat.judul} 
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
              referrerPolicy="no-referrer"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
            
            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 text-white shadow-lg shadow-black/10 group-hover:scale-110 group-hover:bg-teal-500 group-hover:border-teal-400 group-hover:text-white transition-all duration-300">
                <Play size={16} fill="currentColor" className="ml-0.5" />
              </div>
            </div>

            {/* Video Badge */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/45 backdrop-blur-md text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
              🎥 Video Ajar
            </div>
          </div>
        );
      }
      case 'Gambar': {
        const hasValidUrl = mat.url && (mat.url.startsWith('http://') || mat.url.startsWith('https://'));
        if (!hasValidUrl) {
          const gradient = getGradientClass(mat.id);
          return (
            <div className={`h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-gradient-to-br ${gradient} flex items-center p-4 shadow-sm border border-black/10 group-hover:shadow-md transition-all duration-300`}>
              {/* Spine effect */}
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/15 border-r border-white/5" />
              <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-white/10" />

              {/* Aesthetic geometric background decorations */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-xl" />
              <div className="absolute right-4 top-4 w-12 h-12 bg-black/10 rounded-full blur-lg" />

              <div className="ml-4 flex flex-col justify-between h-full w-full text-white">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[8px] font-black uppercase tracking-widest border border-white/20">
                    📚 Buku Gambar / Cover
                  </span>
                  <BookOpen size={14} className="text-white/60" />
                </div>
                <div className="space-y-1 pr-2">
                  <p className="font-extrabold text-[11px] leading-snug line-clamp-2 tracking-tight uppercase">
                    {mat.judul}
                  </p>
                  <div className="w-8 h-[2px] bg-white/40 rounded-full" />
                </div>
                <div className="text-[7px] text-white/50 font-mono tracking-wider flex items-center space-x-1">
                  <span>MTS AUTO-COVER</span>
                </div>
              </div>
            </div>
          );
        }
        const isUnsplash = mat.url.includes('unsplash.com') || mat.url.includes('images.unsplash.com');
        const imageUrl = isUnsplash || mat.url.match(/\.(jpeg|jpg|gif|png)/i)
          ? mat.url
          : 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600';
        return (
          <div className="h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-slate-900 border border-slate-100/10 group-hover:shadow-md transition-all duration-300">
            <img 
              src={imageUrl} 
              alt={mat.judul} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            
            {/* Badge */}
            <div className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/45 backdrop-blur-md text-[8px] font-black uppercase text-white tracking-widest border border-white/10">
              🖼️ Infografis / Foto
            </div>
          </div>
        );
      }
      case 'Link': {
        // Extract host or default
        let domain = 'Website';
        try {
          domain = new URL(mat.url).hostname;
        } catch (_) {}
        return (
          <div className="h-40 w-full rounded-2xl overflow-hidden relative mb-4 bg-slate-900 border border-slate-100/10 group-hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            {/* Aesthetic Classroom Work Desk */}
            <img 
              src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=600"
              alt={mat.judul} 
              className="absolute inset-0 w-full h-full object-cover opacity-35 group-hover:scale-105 transition-transform duration-500" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-slate-900/85 to-slate-950" />

            {/* Browser Header Mockup */}
            <div className="relative z-10 p-2 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-2 py-0.5 bg-white/10 rounded-md text-[7px] text-white/70 font-mono truncate max-w-[150px]">
                {domain}
              </div>
              <div className="w-3" />
            </div>

            {/* Central visual icon */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-1">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 text-teal-300">
                <LinkIcon size={14} />
              </div>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Akses Link Interaktif</span>
            </div>

            {/* Badge */}
            <div className="absolute top-10 left-3 px-2 py-0.5 rounded bg-teal-950/80 backdrop-blur-md text-[8px] font-black uppercase text-teal-300 tracking-widest border border-teal-500/20">
              🔗 Website / Portal
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Tab Navigation for Guru */}
      {userRole === 'guru' && (
        <div className="flex bg-slate-100 border border-slate-200/50 p-1 rounded-2xl max-w-sm">
          <button
            onClick={() => {
              setGuruActiveTab('my-materials');
              setSelectedMapelId(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              guruActiveTab === 'my-materials' && !selectedMapelId
                ? 'bg-white text-teal-600 shadow-2xs border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📂 Materi Saya ({materials.filter(mat => {
              return (currentUser && mat.guruId === currentUser.id) || 
                     (currentUser && mat.pengunggah && mat.pengunggah.toLowerCase() === currentUser.nama.toLowerCase());
            }).length})
          </button>
          <button
            onClick={() => {
              setGuruActiveTab('explore');
              setSelectedMapelId(null);
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              guruActiveTab === 'explore' || selectedMapelId
                ? 'bg-white text-teal-600 shadow-2xs border border-slate-200/40'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🔍 Jelajahi Mapel
          </button>
        </div>
      )}

      {/* SECTION 1: Subject Filter & Grid (Mata Pelajaran Screen) or My Materials for Guru */}
      {!selectedMapelId && userRole === 'guru' && guruActiveTab === 'my-materials' ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-bold text-lg">
                  📂
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Koleksi Materi Saya</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">MANAJEMEN MANDIRI MODUL DIGITAL GURU</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed mt-2">
                Halaman khusus Anda untuk menambah, mengubah, atau menghapus materi-materi pembelajaran digital yang telah Anda unggah ke kelas MTs.
              </p>
            </div>
            
            <button
              onClick={() => handleOpenForm(null)}
              className="px-5 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center space-x-2 cursor-pointer shadow-md shadow-teal-600/10 self-start md:self-center"
            >
              <Plus size={14} />
              <span>Tambah e-Materi</span>
            </button>
          </div>

          {/* Search, Filter for Materials */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari judul materi atau deskripsi saya..."
                value={materiSearchQuery}
                onChange={(e) => setMateriSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex overflow-x-auto bg-slate-50 p-1 rounded-xl border border-slate-200/60 scrollbar-hide">
              {['Semua', 'Dokumen', 'Video', 'Gambar', 'Link'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTypeFilter(type)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    selectedTypeFilter === type 
                      ? 'bg-white text-teal-600 shadow-2xs border border-slate-200/40' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Materials list */}
          {myMaterials.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[2rem] py-16 text-center shadow-2xs space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <FolderOpen size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-700 text-sm">Belum Ada Materi Terunggah</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Mulai unggah materi pertama Anda dengan menekan tombol "Tambah e-Materi" di atas.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myMaterials.map((mat) => {
                const mapel = subjects.find(s => s.id === mat.mapelId);
                return (
                  <div 
                    key={mat.id}
                    className="group bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-2xs hover:shadow-md hover:border-teal-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="space-y-4">
                      {/* Visual Cover (PDF, Video, Foto, Link) */}
                      {renderMaterialCover(mat)}

                      {/* Top Row: Type and Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[9px] font-black uppercase text-teal-600 tracking-wider">
                            📚 {mapel ? `${mapel.nama} (Kelas ${mapel.tingkat})` : 'Mata Pelajaran'}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 rounded bg-slate-50 border border-slate-100 flex items-center justify-center">
                              {renderTypeIcon(mat.tipe, 10)}
                            </div>
                            <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">
                              {mat.tipe} {mat.kelasId && mat.kelasId !== 'Semua' ? `• Kelas ${mat.kelasId}` : ''}
                            </span>
                          </div>
                        </div>

                        {/* Dropdown/Buttons Edit Hapus */}
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenForm(mat)}
                            title="Edit Materi"
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(mat.id, mat.judul)}
                            title="Hapus Materi"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Info & Title */}
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-snug">
                          {mat.judul}
                        </h4>
                        {mat.deskripsi && (
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3">
                            {mat.deskripsi}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                      <div className="flex items-center space-x-1.5">
                        <Calendar size={12} className="text-slate-300" />
                        <span>{new Date(mat.tanggalUpload).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-slate-50 hover:bg-teal-50 hover:text-teal-600 border border-slate-150 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer inline-flex items-center space-x-1"
                      >
                        <span>Buka</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : !selectedMapelId ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 md:p-8 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-bold">
                  📚
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Portal Pembelajaran e-Materi</h2>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">MATERI AJAR & MODUL MANDIRI DIGITAL</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed mt-2">
                Pilih mata pelajaran terintegrasi dari Kurikulum Akademik untuk mengakses modul ajar (E-Book, Video Tutorial, LKS, dan Infografis) yang disiapkan oleh Guru.
              </p>
            </div>
            
            {/* Quick stats */}
            <div className="flex items-center gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex-shrink-0 self-start md:self-auto">
              <div className="text-center px-4 border-r border-slate-200">
                <span className="text-xs text-slate-400 font-bold block">Total Mapel</span>
                <span className="text-lg font-black text-slate-800">{subjects.length}</span>
              </div>
              <div className="text-center px-4">
                <span className="text-xs text-slate-400 font-bold block">Total Materi</span>
                <span className="text-lg font-black text-teal-600">{materials.length}</span>
              </div>
            </div>
          </div>

          {/* Filtering & Searching Controls */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari nama mapel, kode, atau guru pengampu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Class Filter */}
            <div className="w-full sm:w-[200px]">
              <SearchableSelect
                value={selectedTingkat}
                onChange={(val) => setSelectedTingkat(val)}
                options={[
                  { value: 'Semua', label: 'Semua Tingkat' },
                  ...uniqueTingkats.map((t) => ({ value: t, label: `Kelas ${t}` }))
                ]}
                placeholder="Semua Tingkat"
                showSearch={false}
                isClearable={false}
              />
            </div>
          </div>

          {/* Directory Folder Grid if no filter/search is active (First View) */}
          {selectedTingkat === 'Semua' && searchQuery.trim() === '' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-2">
                  <span>📂 Silakan Pilih Tingkat Kelas Terlebih Dahulu:</span>
                </h3>
              </div>

              {/* Dynamic Grid of Folder/Directory Cards */}
              {uniqueTingkats.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2rem] py-12 text-center shadow-2xs">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-3">
                    <BookOpen size={24} />
                  </div>
                  <p className="font-extrabold text-slate-700 text-xs">Belum Ada Mata Pelajaran Terdaftar</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">
                    Silakan tambahkan data Mata Pelajaran di tab Akademik terlebih dahulu.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {uniqueTingkats.map((tingkat, index) => {
                    const themes = [
                      { border: 'hover:border-teal-400', bg: 'bg-teal-50 text-teal-600', hoverFrom: 'from-teal-500/5', hoverTo: 'group-hover:from-teal-500/10' },
                      { border: 'hover:border-indigo-400', bg: 'bg-indigo-50 text-indigo-600', hoverFrom: 'from-indigo-500/5', hoverTo: 'group-hover:from-indigo-500/10' },
                      { border: 'hover:border-rose-400', bg: 'bg-rose-50 text-rose-600', hoverFrom: 'from-rose-500/5', hoverTo: 'group-hover:from-rose-500/10' },
                      { border: 'hover:border-amber-400', bg: 'bg-amber-50 text-amber-600', hoverFrom: 'from-amber-500/5', hoverTo: 'group-hover:from-amber-500/10' },
                      { border: 'hover:border-emerald-400', bg: 'bg-emerald-50 text-emerald-600', hoverFrom: 'from-emerald-500/5', hoverTo: 'group-hover:from-emerald-500/10' },
                    ];
                    const theme = themes[index % themes.length];
                    const mapelCount = subjects.filter(s => normalizeTingkat(s.tingkat) === normalizeTingkat(tingkat)).length;

                    return (
                      <div 
                        key={tingkat}
                        onClick={() => setSelectedTingkat(tingkat)}
                        className={`group bg-white border border-slate-200/60 ${theme.border} rounded-[2rem] p-6 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${theme.hoverFrom} to-transparent rounded-bl-full transition-all ${theme.hoverTo}`} />
                        <div className="space-y-4 relative z-10">
                          <div className={`w-12 h-12 rounded-2xl ${theme.bg} flex items-center justify-center font-black text-lg`}>
                            {tingkat}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-base group-hover:text-teal-600 transition-colors">
                              Materi Kelas {tingkat}
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 font-medium">
                              Kumpulan mata pelajaran & modul ajar khusus siswa/siswi kelas {tingkat}
                            </p>
                          </div>
                        </div>
                        <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between relative z-10 text-xs text-slate-500 font-bold">
                          <div className="flex items-center space-x-1.5">
                            <BookOpen size={14} className="text-slate-400" />
                            <span>{mapelCount} Mapel Terintegrasi</span>
                          </div>
                          <span className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-teal-50 group-hover:text-teal-600 text-slate-400 flex items-center justify-center transition-colors">
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Direct combobox/quick selector */}
              {subjects.length > 0 && (
                <div className="bg-slate-50 border border-slate-200/50 rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Akses Langsung Mata Pelajaran</h4>
                    <p className="text-[11px] text-slate-400 font-medium">Atau, pilih langsung dari daftar semua mata pelajaran aktif akademik berikut:</p>
                  </div>
                  <div className="w-full sm:w-80">
                    <SearchableSelect
                      value={selectedMapelId || ""}
                      onChange={(val) => {
                        if (val) {
                          setSelectedMapelId(val);
                        }
                      }}
                      options={subjects.map(sub => ({
                        value: sub.id,
                        label: `Kelas ${sub.tingkat} - ${sub.nama} (${sub.kode})`
                      }))}
                      placeholder="-- Pilih Mata Pelajaran --"
                      showSearch={true}
                      isClearable={false}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // If class-level or search query is filtered (List view)
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedTingkat('Semua');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali ke Tingkat Kelas</span>
                </button>

                <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full">
                  {selectedTingkat !== 'Semua' ? `KELAS ${selectedTingkat}` : 'Hasil Pencarian'}
                </span>
              </div>

              {/* Subject Grid */}
              {filteredSubjects.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-[2rem] py-16 text-center shadow-2xs space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <BookOpen size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-700 text-sm">Tidak Ada Mata Pelajaran Ditemukan</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">Coba sesuaikan kata kunci pencarian atau filter tingkat kelas Anda.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredSubjects.map((sub) => {
                    const count = getMaterialCount(sub.id);
                    return (
                      <div 
                        key={sub.id}
                        onClick={() => setSelectedMapelId(sub.id)}
                        className="group bg-white border border-slate-200/60 hover:border-teal-300 rounded-[2rem] p-6 shadow-2xs hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between hover:-translate-y-1 relative overflow-hidden"
                      >
                        {/* Visual Hover Gradient */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-bl-full transition-all group-hover:from-teal-500/10" />

                        <div className="space-y-4 relative z-10">
                          {/* Badge and Code */}
                          <div className="flex items-center justify-between">
                            <span className="px-3 py-1 bg-teal-50 text-teal-600 border border-teal-100/50 rounded-full text-[10px] font-black uppercase tracking-wider">
                              Kelas {sub.tingkat}
                            </span>
                            <span className="text-[10px] text-slate-400 font-extrabold tracking-mono">
                              {sub.kode}
                            </span>
                          </div>

                          {/* Title & Teacher */}
                          <div className="space-y-1">
                            <h4 className="font-black text-slate-800 text-sm group-hover:text-teal-600 transition-colors line-clamp-1">
                              {sub.nama}
                            </h4>
                            <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium">
                              <User size={12} className="text-slate-300" />
                              <span className="truncate">{formatGuruDisplay(sub.guruPengampu)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom stats and action */}
                        <div className="border-t border-slate-100 pt-4 mt-6 flex items-center justify-between relative z-10">
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold">
                            <FolderOpen size={14} className="text-slate-400" />
                            <span>{count === 0 ? 'Belum Ada' : `${count} File`} Materi</span>
                          </div>
                          
                          <span className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-teal-50 group-hover:text-teal-600 text-slate-400 flex items-center justify-center transition-colors">
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        
        /* SECTION 2: Materials List (Materials Screen for a Specific Subject) */
        <div className="space-y-6">
          
          {/* Back Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              onClick={() => {
                setSelectedMapelId(null);
                setMateriSearchQuery('');
                setSelectedTypeFilter('Semua');
              }}
              className="px-4 py-2 bg-white border border-slate-200/60 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 self-start shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Kembali Ke Mapel</span>
            </button>

            {/* Quick Actions (Upload) */}
            <button
              onClick={() => handleOpenForm(null)}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center space-x-2 cursor-pointer shadow-md shadow-teal-600/10"
            >
              <Plus size={14} />
              <span>Tambah e-Materi</span>
            </button>
          </div>

          {/* Subject Detail Header */}
          <div className="bg-white border border-slate-200/60 rounded-2xl md:rounded-[2rem] p-5 md:p-8 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 md:gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 md:px-3 md:py-1 bg-teal-50 text-teal-600 border border-teal-100/50 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider">
                  Kelas {selectedMapel?.tingkat}
                </span>
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-mono">{selectedMapel?.kode}</span>
              </div>
              <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight leading-tight">{selectedMapel?.nama}</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-4 text-xs text-slate-500 font-bold">
                <div className="flex items-start space-x-1.5 min-w-0">
                  <User size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="break-words">
                    Guru: <span className="text-slate-700 font-extrabold">{formatGuruDisplay(selectedMapel?.guruPengampu)}</span>
                  </span>
                </div>
                <span className="text-slate-300 hidden sm:inline">•</span>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <BookOpen size={13} className="text-slate-400 flex-shrink-0" />
                  <span>Kategori: <span className="text-slate-700 font-extrabold">{selectedMapel?.kategori}</span></span>
                </div>
              </div>
            </div>

            {/* Circle Stats */}
            <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-2xl md:rounded-full border border-slate-100 flex flex-row md:flex-col items-center justify-center md:justify-center gap-2 md:gap-0 flex-shrink-0 self-start md:self-center p-3 md:p-0">
              <span className="text-xl md:text-2xl font-black text-teal-600">{filteredMaterials.length}</span>
              <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider md:mt-0.5">Materi</span>
            </div>
          </div>

          {/* Search, Filter for Materials */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cari judul materi atau deskripsi..."
                value={materiSearchQuery}
                onChange={(e) => setMateriSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Type Filter Tabs */}
            <div className="flex overflow-x-auto bg-slate-50 p-1 rounded-xl border border-slate-200/60 scrollbar-hide">
              {['Semua', 'Dokumen', 'Video', 'Gambar', 'Link'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedTypeFilter(type)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    selectedTypeFilter === type 
                      ? 'bg-white text-teal-600 shadow-2xs border border-slate-200/40' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Materials Grid */}
          {filteredMaterials.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[2rem] py-16 text-center shadow-2xs space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <FolderOpen size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-700 text-sm">Belum Ada Materi Pembelajaran</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Klik tombol "Tambah e-Materi" di atas untuk menambahkan materi ajar digital baru.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMaterials.map((mat) => (
                <div 
                  key={mat.id}
                  className="group bg-white border border-slate-200/60 rounded-[2rem] p-5 shadow-2xs hover:shadow-md hover:border-teal-300/80 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-4">
                    {/* Visual Cover (PDF, Video, Foto, Link) */}
                    {renderMaterialCover(mat)}

                    {/* Top Row: Type and Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                          {renderTypeIcon(mat.tipe, 12)}
                        </div>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          {mat.tipe}
                        </span>
                      </div>

                      {/* Dropdown/Buttons Edit Hapus */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenForm(mat)}
                          title="Edit Materi"
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(mat.id, mat.judul)}
                          title="Hapus Materi"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-teal-600 transition-colors">
                        {mat.judul}
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">
                        {mat.deskripsi || 'Tidak ada deskripsi tambahan.'}
                      </p>
                    </div>
                  </div>

                  {/* Metadata and Link Button */}
                  <div className="border-t border-slate-100 pt-4 mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] text-slate-400 font-bold">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <Calendar size={11} className="text-slate-300" />
                        <span>Diunggah: {new Date(mat.tanggalUpload).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User size={11} className="text-slate-300" />
                        <span>Oleh: {mat.pengunggah}</span>
                      </div>
                    </div>

                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
                    >
                      <span>Akses Materi</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Tambah & Edit Materi */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setIsModalOpen(false)}></div>
          
          {/* Form Content */}
          <div className="bg-white rounded-[2rem] p-6 md:p-10 max-w-lg w-full relative shadow-2xl animate-fade-in z-50 text-left max-h-[90vh] overflow-y-auto scrollbar-hide">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-6 top-6 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-lg">
                📝
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  {editingMaterial ? 'Ubah Materi Pembelajaran' : 'Unggah Materi Baru'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {selectedMapel 
                    ? `MAPEL: ${selectedMapel.nama} (KELAS ${selectedMapel.tingkat})` 
                    : 'SILAKAN TENTUKAN MATA PELAJARAN TARGET'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-5">
              {/* Mata Pelajaran Selector (only when adding from My Materials tab where selectedMapel is null) */}
              {!editingMaterial && !selectedMapelId && (
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Mata Pelajaran Penerima</label>
                  <SearchableSelect
                    value={formMapelId}
                    onChange={(val) => setFormMapelId(val)}
                    options={subjects
                      .filter(s => {
                        if (userRole === 'guru' && currentUser) {
                          return s.guruPengampu && s.guruPengampu.toLowerCase().includes(currentUser.nama.toLowerCase());
                        }
                        return true;
                      })
                      .map((sub) => ({
                        value: sub.id,
                        label: `Kelas ${sub.tingkat} - ${sub.nama} (${sub.kode})`
                      }))
                    }
                    placeholder="-- Pilih Mata Pelajaran --"
                    showSearch={true}
                    isClearable={false}
                  />
                </div>
              )}

              {/* Judul */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Judul Materi</label>
                <input
                  type="text"
                  required
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-xs font-bold text-slate-700"
                  placeholder="Contoh: Modul Aljabar Dasar Bab 3"
                />
              </div>

              {/* Tipe & Pengunggah */}
              <div className={userRole === 'guru' ? "grid grid-cols-1 gap-4" : "grid grid-cols-1 sm:grid-cols-2 gap-4"}>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jenis Materi</label>
                  <SearchableSelect
                    value={formTipe}
                    onChange={(val) => setFormTipe(val as EMateri['tipe'])}
                    options={[
                      { value: 'Dokumen', label: '📄 Dokumen (PDF, Word, PPT)' },
                      { value: 'Video', label: '🎥 Video Pembelajaran' },
                      { value: 'Gambar', label: '🖼️ Bagan / Infografis' },
                      { value: 'Link', label: '🔗 Tautan Interaktif / Web' }
                    ]}
                    placeholder="Pilih Jenis Materi"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                {userRole !== 'guru' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nama Pengunggah / Guru</label>
                    <SearchableSelect
                      value={formPengunggah}
                      onChange={(val) => {
                        setFormPengunggah(val);
                        const matchedTeacher = teachers.find(t => t.nama.toLowerCase() === val.toLowerCase());
                        setFormGuruId(matchedTeacher?.id || '');
                      }}
                      options={Array.from(new Set([
                        ...teachers.map((t) => t.nama),
                        ...getGuruNames(selectedMapel?.guruPengampu)
                      ]))}
                      placeholder="Pilih Guru..."
                    />
                  </div>
                )}
              </div>

              {/* Target Class / Kelas Penerima */}
              <div>
                <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kelas Penerima / Target</label>
                <SearchableSelect
                  value={formKelasId}
                  onChange={(val) => setFormKelasId(val)}
                  options={[
                    { value: 'Semua', label: `Semua Kelas ${selectedMapel?.tingkat ? `(Tingkat ${selectedMapel.tingkat})` : ''}` },
                    ...classes
                      .filter(c => {
                        if (!selectedMapel?.tingkat) return true;
                        const normMapelTingkat = normalizeTingkat(selectedMapel.tingkat);
                        const normClassTingkat = normalizeTingkat(c.tingkat) || extractTingkatFromClassName(c.nama);
                        return normMapelTingkat === normClassTingkat;
                      })
                      .map((cls) => ({ value: cls.nama, label: `Kelas ${cls.nama}` }))
                  ]}
                  placeholder="Pilih Kelas Penerima"
                  showSearch={true}
                  isClearable={false}
                />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Ringkasan / Deskripsi Materi</label>
                <textarea
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-xs font-bold text-slate-700 min-h-[80px]"
                  placeholder="Berikan deskripsi singkat modul, petunjuk belajar mandiri, atau tujuan pembelajaran..."
                />
              </div>

              {/* Tautan URL */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                  Tautan Materi (URL / Drive / Video) {formTipe === 'Gambar' && <span className="text-amber-500 font-bold lowercase text-[9px]">(opsional)</span>}
                </label>
                <input
                  type="url"
                  required={formTipe !== 'Gambar'}
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-xs font-bold text-slate-700"
                  placeholder={formTipe === 'Gambar' ? "https://... (Kosongkan untuk otomatis buat gambar buku)" : "https://drive.google.com/... atau https://youtube.com/..."}
                />
                {formTipe === 'Gambar' && !formUrl.trim() && (
                  <p className="text-[10px] text-amber-600 font-semibold mt-1.5 flex items-center gap-1">
                    ✨ Tautan kosong. Buku fisik/digital interaktif dengan judul "<strong>{formJudul || 'Judul Materi'}</strong>" akan digambar otomatis di halaman depan.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 bg-slate-50 text-slate-500 font-bold rounded-xl hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 transition-colors text-xs uppercase tracking-wider cursor-pointer text-center"
                >
                  {editingMaterial ? 'Ubah' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
