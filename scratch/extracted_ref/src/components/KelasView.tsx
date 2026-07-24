import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  BookOpen, 
  X, 
  Check, 
  AlertCircle, 
  Layers, 
  User, 
  UserCheck,
  MoreVertical,
  Eye,
  UserMinus,
  Printer,
  BarChart2,
  ChevronDown
} from 'lucide-react';
import { Kelas, Student, Teacher, Institution } from '../types';
import { PrintLaporanKelasModal } from './PrintLaporanKelasModal';
import { SearchableSelect } from './SearchableSelect';

interface KelasViewProps {
  classes: Kelas[];
  students: Student[];
  teachers: Teacher[];
  institution: Institution;
  onSaveClass: (updated: Kelas) => void;
  onDeleteClass: (classId: string, className: string) => void;
}

export const KelasView: React.FC<KelasViewProps> = ({
  classes,
  students,
  teachers,
  institution,
  onSaveClass,
  onDeleteClass,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLaporanModalOpen, setIsLaporanModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Kelas | null>(null);
  
  // Detail Modal States
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClassForDetail, setSelectedClassForDetail] = useState<Kelas | null>(null);

  // Active Dropdown state (class ID)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Form States
  const [formTingkat, setFormTingkat] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formWaliKelas, setFormWaliKelas] = useState('');
  const [formKapasitas, setFormKapasitas] = useState(32);
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [showRekap, setShowRekap] = useState(false);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Determine Tingkat Options based on Institution Level
  const tingkatOptions = useMemo(() => {
    const lvl = (institution.level || '').toLowerCase();
    if (lvl.includes('sd') || lvl.includes('mi')) {
      return ['1', '2', '3', '4', '5', '6'];
    } else if (lvl.includes('smp') || lvl.includes('mts')) {
      return ['7', '8', '9'];
    } else if (lvl.includes('sma') || lvl.includes('smk') || lvl.includes('ma') || lvl.includes('mak')) {
      return ['10', '11', '12'];
    }
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  }, [institution.level]);

  // Filtered classes to display
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchSearch = cls.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.tingkat.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [classes, searchTerm]);

  // Open modal for add
  const handleAddClick = () => {
    setEditingClass(null);
    setFormTingkat(tingkatOptions[0] || '7');
    setFormNama('');
    setFormWaliKelas('');
    setFormKapasitas(32);
    setSelectedSiswaIds([]);
    setStudentSearchTerm('');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEditClick = (cls: Kelas) => {
    setEditingClass(cls);
    setFormTingkat(cls.tingkat);
    setFormNama(cls.nama);
    setFormWaliKelas(cls.waliKelas || '');
    setFormKapasitas(cls.kapasitas);
    setSelectedSiswaIds([]); // ONLY show unassigned students to be added, per user's request
    setStudentSearchTerm('');
    setIsModalOpen(true);
  };

  // Open detail modal
  const handleDetailClick = (cls: Kelas) => {
    setSelectedClassForDetail(cls);
    setIsDetailModalOpen(true);
  };

  // Remove a student from class directly in the Detail Modal
  const handleRemoveStudentFromClass = (studentId: string) => {
    if (!selectedClassForDetail) return;
    const student = students.find(s => s.id === studentId);
    const studentName = student ? student.nama : 'Siswa';

    if (confirm(`Apakah Anda yakin ingin mengeluarkan "${studentName}" dari kelas "${selectedClassForDetail.nama}"?`)) {
      const updated: Kelas = {
        ...selectedClassForDetail,
        siswaIds: selectedClassForDetail.siswaIds.filter((id) => id !== studentId),
      };

      onSaveClass(updated);
      setSelectedClassForDetail(updated); // immediately update local state
    }
  };

  // Filter available (unassigned) students for assignment
  const eligibleStudents = useMemo(() => {
    return students.filter((std) => {
      // Show student if they are unassigned
      const isUnassigned = !std.kelas || std.kelas === '-' || std.kelas.trim() === '';
      return isUnassigned;
    });
  }, [students]);

  // Filter eligible students by student search term
  const filteredStudents = useMemo(() => {
    return eligibleStudents.filter((std) =>
      std.nama.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      std.nis.includes(studentSearchTerm)
    );
  }, [eligibleStudents, studentSearchTerm]);

  // Toggle student selection
  const handleToggleStudent = (studentId: string) => {
    setSelectedSiswaIds((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Submit Save Class Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      alert('Nama kelas harus diisi!');
      return;
    }
    if (formKapasitas <= 0) {
      alert('Kapasitas kelas harus lebih dari 0!');
      return;
    }

    const classId = editingClass ? editingClass.id : `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // If editing, combine the original members with the new selections
    const finalSiswaIds = editingClass 
      ? [...editingClass.siswaIds, ...selectedSiswaIds]
      : selectedSiswaIds;

    const updated: Kelas = {
      id: classId,
      tingkat: formTingkat,
      nama: formNama.trim(),
      kapasitas: Number(formKapasitas),
      siswaIds: finalSiswaIds,
      waliKelas: formWaliKelas,
    };

    onSaveClass(updated);
    setIsModalOpen(false);
  };

  // Multi-select helpers for new students
  const handleSelectAllFiltered = () => {
    const toAdd: string[] = [];
    filteredStudents.forEach((std) => {
      if (!selectedSiswaIds.includes(std.id)) {
        toAdd.push(std.id);
      }
    });

    const currentActiveCount = editingClass ? editingClass.siswaIds.length : 0;
    const totalPotentialCount = currentActiveCount + selectedSiswaIds.length + toAdd.length;

    if (totalPotentialCount > formKapasitas) {
      if (!confirm(`Siswa yang dipilih melebihi kapasitas kelas (${formKapasitas}). Tetap pilih semua?`)) {
        return;
      }
    }

    setSelectedSiswaIds((prev) => {
      const next = [...prev];
      toAdd.forEach(id => {
        if (!next.includes(id)) next.push(id);
      });
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = new Set(filteredStudents.map(std => std.id));
    setSelectedSiswaIds((prev) => prev.filter(id => !filteredIds.has(id)));
  };

  return (
    <div className="animate-fade-in block text-left">
      {/* Filters Area at the top to focus on data first */}
      <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari kelas berdasarkan nama atau tingkat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={() => setShowRekap(!showRekap)}
            className={`flex-1 sm:flex-none flex items-center justify-center border-2 font-bold px-4 py-3 sm:px-5 rounded-2xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap ${
              showRekap
                ? 'bg-indigo-100 border-indigo-200 text-indigo-700 hover:bg-indigo-200/50'
                : 'bg-white border-indigo-50 hover:border-indigo-100 text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <BarChart2 className="w-4 h-4 mr-2" />
            <span>{showRekap ? 'Tutup Rekap' : 'Rekap & Statistik'}</span>
          </button>
          <button
            onClick={() => setIsLaporanModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center bg-white border-2 border-indigo-100 hover:border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold px-4 py-3 sm:px-5 rounded-2xl transition-all shadow-sm cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap"
          >
            <Printer className="w-4 h-4 mr-2" />
            <span>Laporan Kelas</span>
          </button>
          <button
            onClick={handleAddClick}
            className="w-full sm:w-auto flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-3 sm:px-5 rounded-2xl transition-all shadow-lg shadow-teal-100 cursor-pointer text-xs uppercase tracking-wider whitespace-nowrap animate-fade-in"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* Analytics Brief Row & Rekapitulasi Siswa per Kelas - Collapsible */}
      {showRekap && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch animate-fade-in">
          {/* Left/First Column: Compact Stats Cards */}
          <div className="flex flex-col gap-4 lg:col-span-1 justify-between">
            {/* Total Kelas */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center space-x-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Kelas</p>
                <p className="text-base font-extrabold text-slate-700 mt-0.5">{classes.length} Rombel</p>
              </div>
            </div>

            {/* Siswa Terbagi Kelas */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center space-x-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Siswa Terbagi Kelas</p>
                <p className="text-base font-extrabold text-slate-700 mt-0.5">
                  {students.filter(s => s.kelas && s.kelas !== '-').length} / {students.length} Siswa
                </p>
              </div>
            </div>

            {/* Belum Masuk Kelas */}
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm flex items-center space-x-3.5 flex-1">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Belum Masuk Kelas</p>
                <p className="text-base font-extrabold text-slate-700 mt-0.5">
                  {students.filter(s => !s.kelas || s.kelas === '-').length} Siswa
                </p>
              </div>
            </div>
          </div>

          {/* Right/Second Column: Rekapitulasi Siswa Per Kelas Widget */}
          <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h5 className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-indigo-500" />
                Rekapitulasi Siswa Per Kelas
              </h5>
              <span className="text-[10px] font-bold text-slate-400">Total Siswa: {students.length}</span>
            </div>

            <div className="overflow-x-auto overflow-y-auto border border-slate-100 rounded-xl flex-1 min-h-[140px] max-h-[175px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                    <th className="px-4 py-2 font-black text-slate-400 uppercase text-[9px] tracking-wider">Kelas</th>
                    <th className="px-4 py-2 font-black text-blue-500 uppercase text-[9px] tracking-wider text-center w-28">L (Laki-laki)</th>
                    <th className="px-4 py-2 font-black text-pink-500 uppercase text-[9px] tracking-wider text-center w-28">P (Perempuan)</th>
                    <th className="px-4 py-2 font-black text-slate-600 uppercase text-[9px] tracking-wider text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...classes].sort((a, b) => {
                    if (a.tingkat !== b.tingkat) return (a.tingkat || '').localeCompare(b.tingkat || '', undefined, { numeric: true });
                    return (a.nama || '').localeCompare(b.nama || '', undefined, { numeric: true });
                  }).map((cls) => {
                    const classStudents = students.filter(s => s.kelas === cls.nama);
                    const lCount = classStudents.filter(s => s.jk === 'Laki-laki').length;
                    const pCount = classStudents.filter(s => s.jk === 'Perempuan').length;
                    const total = classStudents.length;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-1.5 font-bold text-slate-700">{cls.nama}</td>
                        <td className="px-4 py-1.5 text-center font-semibold text-blue-600 bg-blue-50/5">{lCount}</td>
                        <td className="px-4 py-1.5 text-center font-semibold text-pink-600 bg-pink-50/5">{pCount}</td>
                        <td className="px-4 py-1.5 text-right font-black text-slate-800">{total}</td>
                      </tr>
                    );
                  }).filter(Boolean)}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50/80 sticky bottom-0 z-10 font-bold">
                  <tr>
                    <td className="px-4 py-2 text-slate-700">Total Siswa</td>
                    <td className="px-4 py-2 text-center text-blue-600 font-extrabold bg-blue-50/10">
                      {students.filter(s => s.kelas && s.kelas !== '-' && s.jk === 'Laki-laki').length}
                    </td>
                    <td className="px-4 py-2 text-center text-pink-600 font-extrabold bg-pink-50/10">
                      {students.filter(s => s.kelas && s.kelas !== '-' && s.jk === 'Perempuan').length}
                    </td>
                    <td className="px-4 py-2 text-right text-teal-600 font-black">
                      {students.filter(s => s.kelas && s.kelas !== '-').length}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DATA KELAS DALAM BENTUK TABEL (PC & TABLET) */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-16 text-center shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4 stroke-[1.5]" />
          <h3 className="text-lg font-bold text-slate-700 mb-1">Tidak Ada Data Kelas</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
            {searchTerm ? 'Tidak ada kelas yang cocok dengan kata kunci pencarian Anda.' : 'Silakan tambahkan rombongan belajar (kelas) baru dengan mengeklik tombol "Tambah Kelas".'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden hidden md:block animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tingkat</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Nama Kelas (Rombel)</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Wali Kelas</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Kapasitas & Jumlah Siswa</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Rasio Siswa L/P</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClasses.map((cls) => {
                    const classStudents = students.filter((s) => s.kelas === cls.nama);
                    const studentCount = classStudents.length;
                    const percentage = Math.min(Math.round((studentCount / cls.kapasitas) * 100), 100);
                    
                    const maleCount = classStudents.filter(s => s.jk === 'Laki-laki').length;
                    const femaleCount = classStudents.filter(s => s.jk === 'Perempuan').length;

                    return (
                      <tr key={cls.id} className="hover:bg-slate-50/30 transition-all">
                        {/* Tingkat */}
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-teal-50 text-teal-600 text-[10px] font-black uppercase rounded-full border border-teal-100">
                            Tingkat {cls.tingkat}
                          </span>
                        </td>
                        
                        {/* Nama Kelas */}
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-800 text-sm block">{cls.nama}</span>
                        </td>
                        
                        {/* Wali Kelas */}
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-600 text-xs block">{cls.waliKelas || '-'}</span>
                        </td>
                        
                        {/* Kapasitas */}
                        <td className="px-6 py-4 w-1/3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                              <span className={studentCount > cls.kapasitas ? 'text-rose-500' : 'text-slate-700'}>
                                {studentCount} / {cls.kapasitas} Siswa
                              </span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden shadow-inner border border-slate-100">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  studentCount > cls.kapasitas 
                                    ? 'bg-rose-500' 
                                    : percentage >= 90 
                                    ? 'bg-amber-500' 
                                    : 'bg-teal-500'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        
                        {/* Rasio L/P */}
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-50/50 text-blue-600 text-[9px] font-extrabold rounded-md border border-blue-100/40">
                              L: {maleCount}
                            </span>
                            <span className="px-2 py-0.5 bg-pink-50/50 text-pink-600 text-[9px] font-extrabold rounded-md border border-pink-100/40">
                              P: {femaleCount}
                            </span>
                          </div>
                        </td>

                        {/* Dropdown Action Menu */}
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === cls.id ? null : cls.id);
                              }}
                              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer border border-transparent hover:border-slate-200 bg-transparent"
                              title="Pilih Aksi"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeMenuId === cls.id && (
                              <div className="absolute right-0 mt-1 w-32 rounded-xl bg-white border border-slate-100 shadow-xl z-50 p-1 animate-fade-in text-left">
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDetailClick(cls);
                                  }}
                                  className="w-full flex items-center px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-2 text-slate-400" />
                                  Detail
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    onDeleteClass(cls.id, cls.nama);
                                  }}
                                  className="w-full flex items-center px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-400" />
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View: Tampilan Terbaik untuk HP (Grid Compact Cards) */}
          <div className="space-y-4 md:hidden">
            {filteredClasses.map((cls) => {
              const classStudents = students.filter((s) => s.kelas === cls.nama);
              const studentCount = classStudents.length;
              const percentage = Math.min(Math.round((studentCount / cls.kapasitas) * 100), 100);
              
              const maleCount = classStudents.filter(s => s.jk === 'Laki-laki').length;
              const femaleCount = classStudents.filter(s => s.jk === 'Perempuan').length;

              return (
                <div 
                  key={cls.id} 
                  className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-sm space-y-4 text-left"
                >
                  {/* Top row with badges and three dots */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-teal-50 text-teal-600 text-[9px] font-black uppercase rounded-full border border-teal-100">
                        Tingkat {cls.tingkat}
                      </span>
                      <h4 className="text-base font-extrabold text-slate-800 tracking-tight">{cls.nama}</h4>
                    </div>

                    <div className="relative inline-block text-left">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === cls.id ? null : cls.id);
                        }}
                        className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 border border-transparent transition-all cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === cls.id && (
                        <div className="absolute right-0 mt-1 w-28 rounded-lg bg-white border border-slate-100 shadow-xl z-50 p-1 animate-fade-in text-left">
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              handleDetailClick(cls);
                            }}
                            className="w-full flex items-center px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-teal-600 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            Detail
                          </button>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteClass(cls.id, cls.nama);
                            }}
                            className="w-full flex items-center px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Kapasitas Rombel</span>
                      <span className={studentCount > cls.kapasitas ? 'text-rose-500' : 'text-slate-700'}>
                        {studentCount} / {cls.kapasitas} Siswa
                      </span>
                    </div>
                    <div className="w-full bg-slate-50 rounded-full h-1.5 overflow-hidden border border-slate-100">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          studentCount > cls.kapasitas 
                            ? 'bg-rose-500' 
                            : percentage >= 90 
                            ? 'bg-amber-500' 
                            : 'bg-teal-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Badges footer */}
                  <div className="flex gap-2">
                    <span className="px-2 py-0.5 bg-blue-50/50 text-blue-600 text-[9px] font-extrabold rounded-md border border-blue-100/30">
                      L: {maleCount} Siswa
                    </span>
                    <span className="px-2 py-0.5 bg-pink-50/50 text-pink-600 text-[9px] font-extrabold rounded-md border border-pink-100/30">
                      P: {femaleCount} Siswa
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* DETAIL MODAL (DURABLE & PORTAL-CONTAINED) */}
      {isDetailModalOpen && selectedClassForDetail && createPortal(
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-hidden animate-fade-in text-left">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60" 
            onClick={() => {
              setIsDetailModalOpen(false);
              setSelectedClassForDetail(null);
            }}
          />

          {/* Modal Container */}
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-[2rem] relative shadow-2xl z-50 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-slate-800">
                      Detail {selectedClassForDetail.nama}
                    </h3>
                    <span className="px-2.5 py-0.5 bg-teal-50 text-teal-600 text-[9px] font-black uppercase rounded-full border border-teal-100">
                      Tingkat {selectedClassForDetail.tingkat}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Kapasitas: {students.filter(s => s.kelas === selectedClassForDetail.nama).length} / {selectedClassForDetail.kapasitas} Siswa
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    const cls = selectedClassForDetail;
                    setSelectedClassForDetail(null);
                    handleEditClick(cls);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 font-bold rounded-xl transition-all cursor-pointer text-xs border border-teal-100"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Kelas</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setSelectedClassForDetail(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="space-y-6">
                
                {/* Gender Breakdown Row */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                  <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa Laki-laki</p>
                    <p className="text-lg font-extrabold text-blue-600 mt-1">
                      {students.filter(s => s.kelas === selectedClassForDetail.nama && s.jk === 'Laki-laki').length} Siswa
                    </p>
                  </div>
                  <div className="text-center border-l border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Siswa Perempuan</p>
                    <p className="text-lg font-extrabold text-pink-600 mt-1">
                      {students.filter(s => s.kelas === selectedClassForDetail.nama && s.jk === 'Perempuan').length} Siswa
                    </p>
                  </div>
                </div>

                {/* List of enrolled students */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Daftar Siswa Terdaftar ({students.filter(s => s.kelas === selectedClassForDetail.nama).length} Siswa)
                  </h4>
                  
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                    {students.filter(s => s.kelas === selectedClassForDetail.nama).length === 0 ? (
                      <div className="text-center py-12 text-slate-400 font-semibold text-xs italic">
                        <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        Belum ada siswa di kelas ini.
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 scrollbar-hide">
                        {students.filter(s => s.kelas === selectedClassForDetail.nama).map((std, index) => (
                          <div key={std.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center space-x-3 min-w-0">
                              <span className="text-xs font-mono font-bold text-slate-300 w-5 text-center">
                                {index + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-slate-700 truncate">{std.nama}</p>
                                <div className="flex items-center space-x-2 mt-0.5 text-[10px] text-slate-400 font-semibold">
                                  <span>NIS: {std.nis}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                  <span>{std.jk}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleRemoveStudentFromClass(std.id)}
                              className="flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors cursor-pointer text-[10px] font-bold border border-rose-100"
                              title="Keluarkan dari kelas"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Keluarkan</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-5 flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedClassForDetail(null);
                }}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ADD / EDIT CLASS FORM MODAL (DURABLE & PORTAL-CONTAINED) */}
      {isModalOpen && createPortal(
        <div id="class-form-modal" className="fixed inset-0 z-[140] flex items-center justify-center p-4 overflow-hidden animate-fade-in text-left">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60" 
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] relative shadow-2xl z-50 flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">
                    {editingClass ? 'Edit Rombongan Belajar (Kelas)' : 'Tambah Rombongan Belajar (Kelas)'}
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {editingClass ? 'Ubah informasi kelas dan tambahkan siswa baru' : 'Tentukan tingkat, kapasitas, dan masukkan anggota siswa baru'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
              <div className="space-y-6">
                
                {/* Level (Tingkat) & Class Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pilih Tingkat</label>
                    <SearchableSelect
                      value={formTingkat}
                      onChange={(val) => {
                        setFormTingkat(val);
                        if (!formNama) {
                          setFormNama(`Kelas ${val}-A`);
                        }
                      }}
                      options={tingkatOptions.map(opt => ({ value: opt, label: `Tingkat ${opt}` }))}
                      placeholder="Pilih Tingkat"
                      showSearch={false}
                      isClearable={false}
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nama Kelas (Rombel)</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kelas 7-A, Kelas VII B"
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Wali Kelas */}
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Wali Kelas</label>
                  <SearchableSelect
                    value={formWaliKelas}
                    onChange={(val) => setFormWaliKelas(val)}
                    options={[
                      { value: '', label: '-- Pilih Wali Kelas (Opsional) --' },
                      ...teachers.map(teacher => ({ value: teacher.nama, label: teacher.nama }))
                    ]}
                    placeholder="-- Pilih Wali Kelas (Opsional) --"
                    showSearch={true}
                    isClearable={true}
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kapasitas Maksimal Siswa</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 32"
                    value={formKapasitas}
                    onChange={(e) => setFormKapasitas(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-colors"
                    required
                  />
                  {editingClass && (
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">
                      Anggota saat ini: {editingClass.siswaIds.length} Siswa. 
                      Kapasitas baru yang diatur: {formKapasitas} Slot.
                    </p>
                  )}
                  {((editingClass ? editingClass.siswaIds.length : 0) + selectedSiswaIds.length) > formKapasitas && (
                    <div className="flex items-center text-rose-500 mt-2 space-x-1.5 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                      <span className="text-[11px] font-bold">
                        Peringatan: Jumlah total siswa ({ (editingClass ? editingClass.siswaIds.length : 0) + selectedSiswaIds.length } siswa) melebihi kapasitas baru ({formKapasitas})!
                      </span>
                    </div>
                  )}
                </div>

                {/* Add Students Multi-Select Section */}
                <div className="border-t border-slate-100 pt-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">
                        {editingClass ? 'Tambahkan Siswa Baru' : 'Masukkan Anggota Siswa'}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                        Menampilkan siswa yang belum memiliki kelas. 
                        {editingClass 
                          ? ` (Terpilih untuk ditambahkan: ${selectedSiswaIds.length} Siswa)`
                          : ` (${selectedSiswaIds.length} / ${formKapasitas} Terpilih)`
                        }
                      </p>
                    </div>

                    {/* Filter search bar */}
                    <div className="relative w-full sm:w-64">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        placeholder="Cari siswa belum berkelas..."
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:border-teal-500 focus:bg-white transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Bulk Select Options */}
                  {filteredStudents.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200"
                      >
                        Pilih Semua Hasil
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllFiltered}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200"
                      >
                        Batal Pilih Semua
                      </button>
                    </div>
                  )}

                  {/* Students Grid List */}
                  <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4 max-h-56 overflow-y-auto scrollbar-hide">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8">
                        <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">Semua siswa sudah terbagi kelas atau pencarian tidak cocok.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {filteredStudents.map((std) => {
                          const isChecked = selectedSiswaIds.includes(std.id);
                          return (
                            <div
                              key={std.id}
                              onClick={() => handleToggleStudent(std.id)}
                              className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? 'bg-teal-50/40 border-teal-200/60 shadow-sm' 
                                  : 'bg-white border-slate-100 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center flex-shrink-0 transition-colors ${
                                isChecked 
                                  ? 'bg-teal-500 border-teal-500 text-white' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-[11px] font-black text-slate-700 truncate leading-tight">{std.nama}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className="text-[9px] font-mono text-slate-400 leading-none">NIS: {std.nis}</span>
                                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                  <span className="text-[9px] text-slate-400 leading-none">{std.jk === 'Laki-laki' ? 'L' : 'P'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 pt-5 mt-6 grid grid-cols-2 gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl transition-all text-xs uppercase tracking-wider text-center cursor-pointer border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-100 transition-all text-xs uppercase tracking-wider text-center cursor-pointer"
                >
                  Simpan Kelas
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Print Modal */}
      <PrintLaporanKelasModal
        isOpen={isLaporanModalOpen}
        onClose={() => setIsLaporanModalOpen(false)}
        classes={classes}
        students={students}
        institution={institution}
      />
    </div>
  );
};
