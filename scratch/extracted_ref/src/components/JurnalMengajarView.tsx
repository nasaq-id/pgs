import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  UserCheck, 
  ShieldAlert, 
  Calendar, 
  User, 
  BookOpen, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  ArrowLeft, 
  Save, 
  Users, 
  Search, 
  Filter, 
  FileEdit,
  Activity,
  Smile,
  Frown,
  Check,
  Plus
} from 'lucide-react';
import { Kelas, Teacher, Student, MataPelajaran, JadwalPelajaran } from '../types';
import { ScheduleSettings, getSlotsForDay, DEFAULT_SETTINGS } from './AkademikView';
import { SearchableSelect } from './SearchableSelect';

interface JurnalMengajarViewProps {
  classes: Kelas[];
  teachers: Teacher[];
  students: Student[];
  addToast?: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification?: (title: string, message: string) => void;
  userRole?: 'super_admin' | 'admin' | 'guru' | 'siswa' | 'kepsek' | 'wakasek' | null;
  currentUser?: any;
}

export interface JurnalSiswaPresensi {
  siswaId: string;
  nama: string;
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  keterangan?: string;
}

export interface JurnalEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  kelasId: string;
  mapelId: string;
  guruNama: string;
  jpStart: number;
  jpCount: number;
  jamMulai: string;
  jamSelesai: string;
  materiPokok: string;
  kegiatanPembelajaran: string;
  kehadiranSiswa: JurnalSiswaPresensi[];
  catatanKejadian: string;
  status: 'Belum Diisi' | 'Sudah Diisi';
  diisiOleh?: 'Guru' | 'Admin';
  waktuPengisian?: string; // ISO string
}

export const JurnalMengajarView: React.FC<JurnalMengajarViewProps> = ({
  classes,
  teachers,
  students,
  addToast,
  addNotification,
  userRole,
  currentUser
}) => {
  // Mode selection: 'guru' or 'admin'
  const [roleMode, setRoleMode] = useState<'guru' | 'admin'>(() => {
    return userRole === 'guru' ? 'guru' : 'admin';
  });

  useEffect(() => {
    setRoleMode(userRole === 'guru' ? 'guru' : 'admin');
  }, [userRole]);

  // Selected date (defaults to today in local date string YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
  });

  // Derived day from date
  const [selectedDay, setSelectedDay] = useState<'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'>('Senin');

  useEffect(() => {
    const daysIndo: Record<number, 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu'> = {
      0: 'Sabtu', // fall back Sunday to Saturday or Monday
      1: 'Senin',
      2: 'Selasa',
      3: 'Rabu',
      4: 'Kamis',
      5: 'Jumat',
      6: 'Sabtu'
    };
    const dateObj = new Date(selectedDate);
    const dayIndex = dateObj.getDay();
    const dayName = daysIndo[dayIndex] || 'Senin';
    setSelectedDay(dayName);
  }, [selectedDate]);

  // Simulated Teacher selection
  const [activeTeacherName, setActiveTeacherName] = useState<string>(() => {
    if (userRole === 'guru' && currentUser?.nama) {
      return currentUser.nama;
    }
    return '';
  });

  // Active form state for editing/filling a journal
  const [editingJournal, setEditingJournal] = useState<JurnalEntry | null>(null);

  // States loaded from academic settings
  const [subjects, setSubjects] = useState<MataPelajaran[]>([]);
  const [schedules, setSchedules] = useState<JadwalPelajaran[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);

  // Master journals list
  const [journals, setJournals] = useState<JurnalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('mts_journals');
      return (saved && saved !== 'undefined' && saved !== 'null') ? safeJSONParse(saved) : [];
    } catch (e) {
      console.error("Failed to parse mts_journals:", e);
      return [];
    }
  });

  // Load schedule structures
  useEffect(() => {
    // Load subjects
    try {
      const savedSubjects = localStorage.getItem('mts_subjects');
      if (savedSubjects && savedSubjects !== 'undefined' && savedSubjects !== 'null') {
        setSubjects(safeJSONParse(savedSubjects));
      }
    } catch (e) {
      console.error("Failed to parse mts_subjects in Jurnal:", e);
    }
    // Load schedules
    try {
      const savedSchedules = localStorage.getItem('mts_schedules');
      if (savedSchedules && savedSchedules !== 'undefined' && savedSchedules !== 'null') {
        setSchedules(safeJSONParse(savedSchedules));
      }
    } catch (e) {
      console.error("Failed to parse mts_schedules in Jurnal:", e);
    }
    // Load settings
    try {
      const savedSettings = localStorage.getItem('mts_schedule_settings');
      if (savedSettings && savedSettings !== 'undefined' && savedSettings !== 'null') {
        setScheduleSettings(safeJSONParse(savedSettings));
      }
    } catch (e) {
      console.error("Failed to parse mts_schedule_settings in Jurnal:", e);
    }
  }, []);

  // Set default simulated teacher if empty
  useEffect(() => {
    if (userRole === 'guru' && currentUser?.nama) {
      setActiveTeacherName(currentUser.nama);
      return;
    }
    if (!activeTeacherName && teachers.length > 0) {
      setActiveTeacherName(teachers[0].nama);
    } else if (!activeTeacherName && subjects.length > 0) {
      // Fallback to teachers in subjects
      const teachersFromSubjectsList: string[] = [];
      subjects.forEach(s => {
        if (!s.guruPengampu) return;
        try {
          const parsed = JSON.parse(s.guruPengampu);
          if (Array.isArray(parsed)) {
            parsed.forEach(item => {
              if (item.guru) teachersFromSubjectsList.push(item.guru);
            });
          } else {
            teachersFromSubjectsList.push(s.guruPengampu);
          }
        } catch (e) {
          teachersFromSubjectsList.push(s.guruPengampu);
        }
      });
      const uniqueTeachersFromSubjects = Array.from(new Set(teachersFromSubjectsList)).filter(Boolean);
      if (uniqueTeachersFromSubjects.length > 0) {
        setActiveTeacherName(uniqueTeachersFromSubjects[0]);
      }
    }
  }, [teachers, subjects, activeTeacherName, userRole, currentUser]);

  // Keep journals persisted
  useEffect(() => {
    localStorage.setItem('mts_journals', JSON.stringify(journals));
  }, [journals]);

  // Auto-generate missing journal entries for the current day & schedules
  useEffect(() => {
    if (schedules.length === 0) return;

    // Filter schedules that match active day
    const schedulesToday = schedules.filter(s => s.hari === selectedDay);
    if (schedulesToday.length === 0) return;

    let updated = false;
    const nextJournals = [...journals];

    schedulesToday.forEach(sched => {
      // Create a unique key for today's class schedule
      const journalId = `jr-${selectedDate}-${sched.kelasId}-${sched.mapelId}-${sched.jpStart || 1}`;
      
      const exists = nextJournals.some(j => j.id === journalId || (j.tanggal === selectedDate && j.kelasId === sched.kelasId && j.mapelId === sched.mapelId && j.jpStart === sched.jpStart));
      
      if (!exists) {
        // Initialize attendance array for this class's students
        const classObj = classes.find(c => c.id === sched.kelasId);
        const classStudents = students.filter(s => s.kelas === classObj?.nama);
        const presensi: JurnalSiswaPresensi[] = classStudents.map(cs => ({
          siswaId: cs.id,
          nama: cs.nama,
          status: 'Hadir'
        }));

        const newJournal: JurnalEntry = {
          id: journalId,
          tanggal: selectedDate,
          hari: selectedDay,
          kelasId: sched.kelasId,
          mapelId: sched.mapelId,
          guruNama: sched.guru,
          jpStart: sched.jpStart || 1,
          jpCount: sched.jpCount || 2,
          jamMulai: sched.jamMulai || '07:30',
          jamSelesai: sched.jamSelesai || '09:00',
          materiPokok: '',
          kegiatanPembelajaran: '',
          kehadiranSiswa: presensi,
          catatanKejadian: '',
          status: 'Belum Diisi'
        };

        nextJournals.push(newJournal);
        updated = true;
      }
    });

    if (updated) {
      setJournals(nextJournals);
    }
  }, [selectedDate, selectedDay, schedules, classes, students]);

  // Filters for Admin View
  const [adminClassFilter, setAdminClassFilter] = useState<string>('all');
  const [adminTeacherFilter, setAdminTeacherFilter] = useState<string>('all');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');
  const [adminSearch, setAdminSearch] = useState<string>('');

  // Helper functions
  const triggerToast = (message: string, action: string, type: 'success' | 'info' | 'error') => {
    if (addToast) {
      addToast(message, action, type);
    }
  };

  // Filter journals for the selected date
  const currentDayJournals = journals.filter(j => j.tanggal === selectedDate);

  // Filter journals for active teacher
  const teacherJournals = currentDayJournals.filter(j => j.guruNama === activeTeacherName);

  // Filter journals for admin view with conditions
  const adminFilteredJournals = currentDayJournals.filter(j => {
    const classObj = classes.find(c => c.id === j.kelasId);
    const subObj = subjects.find(s => s.id === j.mapelId);
    const matchClass = adminClassFilter === 'all' || j.kelasId === adminClassFilter;
    const matchTeacher = adminTeacherFilter === 'all' || j.guruNama === adminTeacherFilter;
    const matchStatus = adminStatusFilter === 'all' || j.status === adminStatusFilter;
    
    const searchString = `${classObj?.nama || ''} ${subObj?.nama || ''} ${j.guruNama}`.toLowerCase();
    const matchSearch = !adminSearch || searchString.includes(adminSearch.toLowerCase());

    return matchClass && matchTeacher && matchStatus && matchSearch;
  });

  // Calculate stats for admin dashboard
  const totalToday = currentDayJournals.length;
  const filledToday = currentDayJournals.filter(j => j.status === 'Sudah Diisi').length;
  const pendingToday = totalToday - filledToday;
  const complianceRate = totalToday > 0 ? Math.round((filledToday / totalToday) * 100) : 100;

  // Save/Submit journal handler
  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal) return;

    if (!editingJournal.materiPokok.trim()) {
      triggerToast('Materi pokok wajib diisi!', 'Validasi', 'error');
      return;
    }
    if (!editingJournal.kegiatanPembelajaran.trim()) {
      triggerToast('Kegiatan pembelajaran wajib diisi!', 'Validasi', 'error');
      return;
    }

    const updatedJournals = journals.map(j => {
      if (j.id === editingJournal.id) {
        return {
          ...editingJournal,
          status: 'Sudah Diisi' as const,
          diisiOleh: roleMode === 'admin' ? 'Admin' as const : 'Guru' as const,
          waktuPengisian: new Date().toISOString()
        };
      }
      return j;
    });

    setJournals(updatedJournals);
    setEditingJournal(null);

    const classObj = classes.find(c => c.id === editingJournal.kelasId);
    const subObj = subjects.find(s => s.id === editingJournal.mapelId);

    triggerToast(
      `Jurnal Kelas ${classObj?.nama || ''} (${subObj?.kode || 'MAPEL'}) berhasil disimpan`,
      'Jurnal Mengajar',
      'success'
    );

    if (addNotification) {
      addNotification(
        'Pengisian Jurnal Berhasil',
        `Jurnal harian ${subObj?.nama} di kelas ${classObj?.nama} telah diisi oleh ${roleMode === 'admin' ? 'Admin (Intervensi)' : editingJournal.guruNama}.`
      );
    }
  };

  // Initialize a journal editor
  const startFillJournal = (journal: JurnalEntry) => {
    // Sync student list in case of updates
    const classObj = classes.find(c => c.id === journal.kelasId);
    const classStudents = students.filter(s => s.kelas === classObj?.nama);
    
    // Merge existing attendance or construct new one
    const mergedAttendance = classStudents.map(cs => {
      const existing = journal.kehadiranSiswa?.find(pres => pres.siswaId === cs.id);
      return {
        siswaId: cs.id,
        nama: cs.nama,
        status: existing ? existing.status : ('Hadir' as const),
        keterangan: existing ? existing.keterangan : ''
      };
    });

    setEditingJournal({
      ...journal,
      kehadiranSiswa: mergedAttendance
    });
  };

  // Edit attendance of a student in active form
  const handlePresensiChange = (siswaId: string, status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa') => {
    if (!editingJournal) return;
    const nextAttendance = editingJournal.kehadiranSiswa.map(p => {
      if (p.siswaId === siswaId) {
        return { ...p, status };
      }
      return p;
    });
    setEditingJournal({
      ...editingJournal,
      kehadiranSiswa: nextAttendance
    });
  };

  return (
    <div className="space-y-6">
      {/* Upper Title Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <div>
          <div className="flex items-center space-x-2.5 text-slate-400 mb-1.5">
            <ClipboardList className="w-5 h-5 text-teal-600 stroke-[2]" />
            <span className="text-[10px] font-black uppercase tracking-wider">Learning Management System (LMS)</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Jurnal Mengajar Harian</h1>
          <p className="text-xs text-slate-500 mt-1">Otomatisasi pengisian agenda guru, sinkronisasi jadwal, presensi siswa, dan pantauan administratif.</p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setEditingJournal(null);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            />
            <span className="text-[10px] font-black px-2 py-0.5 bg-teal-100 text-teal-700 rounded-lg uppercase">
              {selectedDay}
            </span>
          </div>
        </div>
      </div>

      {/* Editing/Form Mode (Slide Over Style Block) */}
      {editingJournal && (
        <div className="bg-white rounded-3xl border-2 border-teal-500 p-6 shadow-xl animate-fade-in relative overflow-hidden">
          {/* Decorative side accent */}
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-teal-500" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6 pl-2">
            <button
              onClick={() => setEditingJournal(null)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
                Formulir Jurnal Mengajar
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveJournal} className="space-y-6 pl-2">
            {/* Meta info of class slot */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Mata Pelajaran</span>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500 flex items-center justify-center text-white text-xs font-black">
                    {subjects.find(s => s.id === editingJournal.mapelId)?.kode || 'MAPEL'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block leading-tight">
                      {subjects.find(s => s.id === editingJournal.mapelId)?.nama || 'Mata Pelajaran'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                      {subjects.find(s => s.id === editingJournal.mapelId)?.kategori || 'Wajib'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Kelas Rombel</span>
                <span className="text-sm font-black text-slate-800 block mt-1">
                  Kelas {classes.find(c => c.id === editingJournal.kelasId)?.nama || '—'}
                </span>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Waktu / Jam Pelajaran</span>
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Jam Ke-{editingJournal.jpStart}-{editingJournal.jpStart + editingJournal.jpCount - 1} ({editingJournal.jamMulai} - {editingJournal.jamSelesai})</span>
                </div>
              </div>

              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Guru Pengampu</span>
                <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs mt-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{editingJournal.guruNama}</span>
                </div>
              </div>
            </div>

            {/* Inputs: Materi Pokok & Kegiatan Pembelajaran */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Materi Pokok <span className="text-rose-500 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misalnya: Pola Pewarisan Sifat Mendelian, SPLDV eliminasi, dsb."
                  value={editingJournal.materiPokok}
                  onChange={(e) => setEditingJournal({ ...editingJournal, materiPokok: e.target.value })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Catatan Kejadian Penting / Hambatan <span className="text-slate-400 font-medium">(Opsional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Misal: Proyektor mati sementara, 2 siswa mengantuk, dsb."
                  value={editingJournal.catatanKejadian}
                  onChange={(e) => setEditingJournal({ ...editingJournal, catatanKejadian: e.target.value })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Kegiatan Pembelajaran <span className="text-rose-500 font-black">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Deskripsikan proses KBM, misal: Guru menjelaskan teori dasar di papan tulis, dilanjutkan latihan kelompok 4 orang, lalu presentasi 2 kelompok terpilih."
                  value={editingJournal.kegiatanPembelajaran}
                  onChange={(e) => setEditingJournal({ ...editingJournal, kegiatanPembelajaran: e.target.value })}
                  className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all font-medium text-slate-800 placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            {/* Attendance List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Presensi & Absensi Siswa Kelas ({editingJournal.kehadiranSiswa?.length || 0} Siswa)</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">
                  Default status: <span className="text-emerald-600 font-black">Hadir (H)</span>
                </span>
              </div>

              {editingJournal.kehadiranSiswa && editingJournal.kehadiranSiswa.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-slate-150 rounded-2xl text-slate-400 text-xs font-medium">
                  Tidak ada data siswa dalam rombel kelas ini. Hubungkan siswa ke kelas di tab "Sarpras" terlebih dahulu.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl bg-white custom-scrollbar divide-y divide-slate-100">
                  {editingJournal.kehadiranSiswa?.map((std, idx) => (
                    <div key={std.siswaId} className="flex items-center justify-between p-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="text-[10px] text-slate-400 font-mono font-bold w-5 text-right">{idx + 1}.</span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">{std.nama}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-bold">ID: {std.siswaId.substring(0, 8)}</span>
                        </div>
                      </div>

                      {/* Status select radio badges */}
                      <div className="flex items-center space-x-1.5">
                        {[
                          { key: 'Hadir', label: 'H', color: 'peer-checked:bg-emerald-500 peer-checked:text-white text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
                          { key: 'Sakit', label: 'S', color: 'peer-checked:bg-blue-500 peer-checked:text-white text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200' },
                          { key: 'Izin', label: 'I', color: 'peer-checked:bg-amber-500 peer-checked:text-white text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200' },
                          { key: 'Alpa', label: 'A', color: 'peer-checked:bg-rose-500 peer-checked:text-white text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200' },
                        ].map((item) => (
                          <label key={item.key} className="cursor-pointer select-none">
                            <input
                              type="radio"
                              name={`attendance-${std.siswaId}`}
                              value={item.key}
                              checked={std.status === item.key}
                              onChange={() => handlePresensiChange(std.siswaId, item.key as any)}
                              className="sr-only peer"
                            />
                            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${item.color}`}>
                              {item.label}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingJournal(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-black rounded-xl transition-all"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-teal-600/10 transition-all hover:translate-y-[-1px] active:translate-y-0"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Jurnal</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Mode View */}
      {!editingJournal && roleMode === 'guru' && (
        <div className="space-y-6">
          {/* Teacher's List Card */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.01)] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <span>Jadwal & Jurnal Mengajar Anda Hari Ini</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400">
                Total Mengajar: <span className="text-slate-800 font-black">{teacherJournals.length} Kelas</span>
              </span>
            </div>

            {teacherJournals.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-150 p-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm mx-auto mb-4">
                  <Smile className="w-8 h-8 text-teal-500 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-black text-slate-800">Alhamdulillah, Tidak Ada Jadwal Mengajar!</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                  Anda tidak terdaftar dalam jadwal pelajaran hari ini (<strong>{selectedDay}</strong>). Silakan hubungi admin atau atur jadwal di menu "Akademik".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {teacherJournals.map((jr) => {
                  const subject = subjects.find(s => s.id === jr.mapelId);
                  const cls = classes.find(c => c.id === jr.kelasId);
                  const isFilled = jr.status === 'Sudah Diisi';

                  return (
                    <div 
                      key={jr.id}
                      className={`group border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                        isFilled 
                          ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200' 
                          : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Left: Class, time, subject */}
                      <div className="flex items-start space-x-3.5">
                        {/* Status Icon Indicator */}
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-all ${
                          isFilled 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:bg-slate-100 group-hover:border-slate-300'
                        }`}>
                          {isFilled ? (
                            <CheckCircle2 className="w-5.5 h-5.5 stroke-[2.5]" />
                          ) : (
                            <Clock className="w-5.5 h-5.5 stroke-[2]" />
                          )}
                        </div>

                        {/* Text Infos */}
                        <div className="space-y-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-[10px] font-black tracking-wide uppercase px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg">
                              Kelas {cls?.nama || 'ROMBEL'}
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-0.5 rounded-lg border ${
                              isFilled 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }`}>
                              {isFilled ? 'Sudah Terisi' : 'Wajib Diisi'}
                            </span>
                          </div>

                          <span className="text-sm font-black text-slate-800 block">
                            {subject?.nama || 'Mata Pelajaran'} ({subject?.kode || 'MAPEL'})
                          </span>

                          <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Jam Ke-{jr.jpStart}-{jr.jpStart + jr.jpCount - 1} ({jr.jamMulai} - {jr.jamSelesai})</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions / Filled Info */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t border-slate-100 md:border-none">
                        {isFilled ? (
                          <div className="text-left md:text-right">
                            <span className="text-[9px] text-slate-400 font-extrabold block uppercase">Materi Diajarkan:</span>
                            <span className="text-xs font-bold text-slate-700 block truncate max-w-[200px]" title={jr.materiPokok}>
                              {jr.materiPokok}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-bold hidden md:inline">Belum mengisikan agenda harian</span>
                        )}

                        <button
                          onClick={() => startFillJournal(jr)}
                          className={`flex items-center space-x-1 px-4.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
                            isFilled
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/10 hover:translate-y-[-1px] active:translate-y-0'
                          }`}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{isFilled ? 'Edit Jurnal' : 'Isi Jurnal'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monitoring Admin View */}
      {!editingJournal && roleMode === 'admin' && (
        <div className="space-y-6">
          {/* Stats Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Mengajar Hari Ini</span>
                <span className="text-2xl font-black text-slate-800 block">{totalToday}</span>
              </div>
              <div className="w-11 h-11 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-center text-teal-600">
                <ClipboardList className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jurnal Terisi</span>
                <span className="text-2xl font-black text-emerald-600 block">{filledToday}</span>
              </div>
              <div className="w-11 h-11 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Belum Terisi</span>
                <span className="text-2xl font-black text-rose-500 block">{pendingToday}</span>
              </div>
              <div className="w-11 h-11 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center text-rose-500">
                <AlertCircle className="w-5.5 h-5.5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kepatuhan Guru</span>
                <span className="text-2xl font-black text-slate-800 block">{complianceRate}%</span>
              </div>
              <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500">
                <Activity className="w-5.5 h-5.5" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Penyaringan Jurnal Harian</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari guru atau pelajaran..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Class Filter */}
              <SearchableSelect
                value={adminClassFilter}
                onChange={(val) => setAdminClassFilter(val)}
                options={[
                  { value: 'all', label: 'Semua Kelas' },
                  ...classes.map(c => ({ value: c.id, label: `Kelas ${c.nama}` }))
                ]}
                placeholder="Semua Kelas"
                showSearch={true}
                isClearable={false}
              />

              {/* Teacher Filter */}
              <SearchableSelect
                value={adminTeacherFilter}
                onChange={(val) => setAdminTeacherFilter(val)}
                options={[
                  { value: 'all', label: 'Semua Guru Pengampu' },
                  ...Array.from(new Set(schedules.map(s => s.guru).filter(Boolean))).map(name => ({ value: name, label: name }))
                ]}
                placeholder="Semua Guru Pengampu"
                showSearch={true}
                isClearable={false}
              />

              {/* Status Filter */}
              <SearchableSelect
                value={adminStatusFilter}
                onChange={(val) => setAdminStatusFilter(val)}
                options={[
                  { value: 'all', label: 'Semua Status Pengisian' },
                  { value: 'Belum Diisi', label: 'Belum Diisi (Wajib)' },
                  { value: 'Sudah Diisi', label: 'Sudah Diisi' }
                ]}
                placeholder="Semua Status"
                showSearch={false}
                isClearable={false}
              />
            </div>
          </div>

          {/* Monitoring List */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.01)] p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-teal-600" />
                <span>Daftar Rekapitulasi Jurnal ({adminFilteredJournals.length} Slot KBM)</span>
              </h2>
              <span className="text-[10px] font-bold text-slate-400">
                Menampilkan Jadwal Hari: <span className="text-slate-800 font-black">{selectedDay}</span>
              </span>
            </div>

            {adminFilteredJournals.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-slate-150 p-6">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 shadow-sm mx-auto mb-4">
                  <Frown className="w-8 h-8 text-slate-400 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-black text-slate-800">Tidak Menemukan Data Jurnal</h3>
                <p className="text-xs text-slate-400 mt-1.5 max-w-sm mx-auto">
                  Tidak ada data jurnal mengajar yang sesuai dengan kriteria saringan di atas untuk hari <strong>{selectedDay}</strong>.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="table-auto w-full border-collapse text-left text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-4">ROMBEL</th>
                      <th className="p-4">PELAJARAN</th>
                      <th className="p-4">GURU PENGAMPU</th>
                      <th className="p-4">WAKTU (JP)</th>
                      <th className="p-4">STATUS</th>
                      <th className="p-4">DIISI OLEH</th>
                      <th className="p-4 text-right">TINDAKAN / INTERVENSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {adminFilteredJournals.map(jr => {
                      const subject = subjects.find(s => s.id === jr.mapelId);
                      const cls = classes.find(c => c.id === jr.kelasId);
                      const isFilled = jr.status === 'Sudah Diisi';

                      return (
                        <tr key={jr.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 bg-slate-100/85 px-2 py-1 rounded-lg border border-slate-200/60">
                              {cls?.nama || '—'}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800 max-w-[150px] truncate">
                            {subject ? `${subject.nama} (${subject.kode})` : '—'}
                          </td>
                          <td className="p-4 max-w-[180px] truncate font-semibold text-slate-600">{jr.guruNama}</td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="text-slate-800 font-bold">Jam {jr.jpStart}-{jr.jpStart + jr.jpCount - 1}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{jr.jamMulai}-{jr.jamSelesai}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                              isFilled 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-rose-50 text-rose-500 border-rose-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isFilled ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isFilled ? 'Sudah Diisi' : 'Belum Diisi'}
                            </span>
                          </td>
                          <td className="p-4 whitespace-nowrap text-slate-400 font-bold text-[10px]">
                            {isFilled ? (
                              <span className={`font-black px-2 py-0.5 rounded-lg border ${
                                jr.diisiOleh === 'Admin' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-teal-50 text-teal-700 border-teal-200'
                              }`}>
                                {jr.diisiOleh || 'Guru'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => startFillJournal(jr)}
                              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                                isFilled
                                  ? 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                  : 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500 hover:shadow-sm'
                              }`}
                              title={isFilled ? 'Lihat/Edit Jurnal' : 'Bantu isikan Jurnal (Intervensi Admin)'}
                            >
                              <FileEdit className="w-3 h-3" />
                              <span>{isFilled ? 'Lihat Detail' : 'Bantu Isikan'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
