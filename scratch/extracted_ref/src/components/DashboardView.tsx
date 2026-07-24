import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  GraduationCap, 
  ArrowRight, 
  ShieldCheck, 
  FileSpreadsheet, 
  Send, 
  Star, 
  ChevronRight, 
  ArrowUpRight, 
  CalendarDays,
  Sparkles,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  Award,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { Student, Teacher, UserRole } from '../types';

interface DashboardViewProps {
  students: Student[];
  teachers: Teacher[];
  onNavigate: (page: string) => void;
  userRole?: UserRole | null;
  currentUser?: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
  students, 
  teachers, 
  onNavigate,
  userRole,
  currentUser
}) => {
  // Load current logged in user from localStorage
  const loggedInUser = React.useMemo(() => {
    try {
      const userStr = localStorage.getItem('mts_current_user');
      const role = localStorage.getItem('mts_user_role');
      if (userStr && userStr !== "undefined" && role) {
        return { ...safeJSONParse(userStr), role };
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  }, []);

  const activeStudentId = (loggedInUser && loggedInUser.role === 'siswa') ? loggedInUser.id : 'std-1';
  const activeStudentName = (loggedInUser && loggedInUser.role === 'siswa') ? loggedInUser.nama : 'Andi Setiawan';
  const activeStudentClass = (loggedInUser && loggedInUser.role === 'siswa') ? loggedInUser.kelas : 'Kelas 7-A';
  const activeStudentNis = (loggedInUser && loggedInUser.role === 'siswa') ? loggedInUser.nis : '889210';

  // Active role based on real user login
  const [activeRole, setActiveRole] = useState<'admin' | 'siswa'>(() => {
    return userRole === 'siswa' ? 'siswa' : 'admin';
  });

  useEffect(() => {
    setActiveRole(userRole === 'siswa' ? 'siswa' : 'admin');
  }, [userRole]);

  // Dynamic calculations of uncompleted assessments for simulated student (Andi Setiawan - std-1, Kelas 7-A)
  const [uncompletedCount, setUncompletedCount] = useState<number>(3);
  const [pendingAssessments, setPendingAssessments] = useState<any[]>([]);

  useEffect(() => {
    // Read from localStorage
    const savedAssessments = localStorage.getItem('mts_asesmen_items');
    const savedSubmissions = localStorage.getItem('mts_asesmen_submissions');

    let assessmentsList = [];
    let submissionsList = [];

    if (savedAssessments && savedAssessments !== 'undefined' && savedAssessments !== 'null') {
      try {
        assessmentsList = safeJSONParse(savedAssessments);
      } catch (e) {
        console.error("Failed to parse mts_asesmen_items in DashboardView:", e);
      }
    }
    
    if (assessmentsList.length === 0) {
      // Seed default assessments if not found (matching Andi Setiawan's class 7-A)
      assessmentsList = [
        {
          id: 'ase-1',
          judul: 'Ujian Harian Fiqih Bab Thaharah',
          kategori: 'Asesmen Formatif (Proses Pembelajaran)',
          mapelNama: 'Fiqih',
          kelasNama: 'Kelas 7-A',
          teknik: 'Tes Tertulis',
          kktp: 75,
          jenisPengumpulan: 'Teks',
          deadline: '2026-07-15T23:59',
          deskripsi: 'Jawablah pertanyaan mengenai rukun wudhu dan hal-hal yang membatalkan wudhu secara lengkap.'
        },
        {
          id: 'ase-2',
          judul: 'Praktik Membaca Al-Qur\'an (Tajwid)',
          kategori: 'Asesmen Formatif (Proses Pembelajaran)',
          mapelNama: 'Al-Qur\'an Hadits',
          kelasNama: 'Kelas 7-A',
          teknik: 'Praktik/Kinerja',
          kktp: 80,
          jenisPengumpulan: 'Berkas',
          deadline: '2026-07-18T18:00',
          deskripsi: 'Unggah rekaman suara atau video singkat saat mempraktikkan bacaan Surah Al-Mulk ayat 1-5.'
        },
        {
          id: 'ase-3',
          judul: 'Evaluasi Sumatif Akhir Bab Aljabar',
          kategori: 'Asesmen Sumatif (Lingkup Materi/Akhir Semester)',
          mapelNama: 'Matematika',
          kelasNama: 'Kelas 7-A',
          teknik: 'Tes Tertulis',
          kktp: 70,
          jenisPengumpulan: 'CBT',
          deadline: '2026-07-20T12:00',
          deskripsi: 'Ujian berbasis CBT untuk materi persamaan linier satu variabel.'
        }
      ];
      try {
        localStorage.setItem('mts_asesmen_items', JSON.stringify(assessmentsList));
      } catch (e) {
        console.warn("Failed to save mts_asesmen_items in DashboardView:", e);
      }
    }

    if (savedSubmissions && savedSubmissions !== 'undefined' && savedSubmissions !== 'null') {
      try {
        submissionsList = safeJSONParse(savedSubmissions);
      } catch (e) {
        console.error("Failed to parse mts_asesmen_submissions in DashboardView:", e);
      }
    }
    
    if (submissionsList.length === 0) {
      // Seed default submissions for Andi Setiawan (std-1)
      submissionsList = [
        {
          id: 'sub-1',
          asesmenId: 'ase-1',
          siswaId: 'std-1',
          siswaNama: 'Andi Setiawan',
          status: 'Sudah Dinilai',
          konten: '1. Rukun wudhu ada 6: niat, membasuh wajah, membasuh kedua tangan sampai siku, mengusap sebagian kepala, membasuh kedua kaki sampai mata kaki, dan tertib.',
          nilai: 85,
          feedback: 'Masya Allah, jawaban sangat lengkap dan tepat. Pertahankan pemahaman tajam Anda!',
          tuntas: true,
          tindakLanjut: 'Pengayaan',
          tanggalKumpul: '2026-07-04T10:30'
        },
        {
          id: 'sub-2',
          asesmenId: 'ase-2',
          siswaId: 'std-1',
          siswaNama: 'Andi Setiawan',
          status: 'Sudah Mengumpulkan', // waiting grade
          konten: 'Link rekaman suara: https://drive.google.com/file/d/rec-andi-tajwid/view',
          nilai: null,
          feedback: '',
          tuntas: null,
          tindakLanjut: null,
          tanggalKumpul: '2026-07-04T15:20'
        }
        // ase-3 is unsubmitted ("Belum Dikerjakan")
      ];
      try {
        localStorage.setItem('mts_asesmen_submissions', JSON.stringify(submissionsList));
      } catch (e) {
        console.warn("Failed to save mts_asesmen_submissions in DashboardView:", e);
      }
    }

    // Filter assessments for active class
    const andisClassAssessments = assessmentsList.filter((a: any) => a.kelasNama === activeStudentClass);
    
    // Find which are uncompleted (no submission OR status is 'Belum Dikerjakan')
    const uncompleted = andisClassAssessments.filter((a: any) => {
      const sub = submissionsList.find((s: any) => s.asesmenId === a.id && s.siswaId === activeStudentId);
      return !sub || sub.status === 'Belum Dikerjakan';
    });

    setPendingAssessments(uncompleted);
    setUncompletedCount(uncompleted.length);
  }, [activeRole, activeStudentId, activeStudentClass]);

  // Load points logs:
  const [logs, setLogs] = useState<any[]>(() => {
    const saved = localStorage.getItem('mts_log_poin_siswa');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try {
        return safeJSONParse(saved);
      } catch (e) {
        console.error("Failed to parse mts_log_poin_siswa in DashboardView:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    const syncLogs = () => {
      const saved = localStorage.getItem('mts_log_poin_siswa');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        try {
          setLogs(safeJSONParse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', syncLogs);
    window.addEventListener('poinChanged', syncLogs);
    return () => {
      window.removeEventListener('storage', syncLogs);
      window.removeEventListener('poinChanged', syncLogs);
    };
  }, []);

  // Student points stats calculation
  const getStudentPoinStats = (siswaId: string) => {
    const studentLogs = logs.filter((l: any) => l.siswaId === siswaId);
    let totalPositif = 0;
    let totalNegatif = 0;
    studentLogs.forEach((l: any) => {
      if (l.jenis === 'Positif') {
        totalPositif += Math.abs(l.poin);
      } else {
        totalNegatif += Math.abs(l.poin); // store positive absolute value for ease of calculations
      }
    });
    return {
      totalPositif,
      totalNegatif,
      totalAkhir: totalPositif - totalNegatif,
      logs: studentLogs
    };
  };

  // Active stats for active Student Dashboard
  const andiStats = getStudentPoinStats(activeStudentId);

  // Top 5 Poin Positif (Leaderboard) for Students and Admins
  const topStudentsPositive = students.map(s => {
    const stats = getStudentPoinStats(s.id);
    return { ...s, stats };
  })
  .sort((a, b) => b.stats.totalPositif - a.stats.totalPositif)
  .slice(0, 5);

  // Top 5 Poin Terendah / Negatif Terbanyak (Pelanggaran Terberat)
  const topStudentsNegative = students.map(s => {
    const stats = getStudentPoinStats(s.id);
    return { ...s, stats };
  })
  .sort((a, b) => b.stats.totalNegatif - a.stats.totalNegatif) // highest absolute negative points first
  .slice(0, 5);

  // Let's build a nice list of days for a realistic July 2026 calendar view
  const calendarDays = [
    { num: 29, currentMonth: false },
    { num: 30, currentMonth: false },
    { num: 1, currentMonth: true },
    { num: 2, currentMonth: true },
    { num: 3, currentMonth: true },
    { num: 4, currentMonth: true },
    { num: 5, currentMonth: true },
    { num: 6, currentMonth: true },
    { num: 7, currentMonth: true },
    { num: 8, currentMonth: true },
    { num: 9, currentMonth: true },
    { num: 10, currentMonth: true },
    { num: 11, currentMonth: true },
    { num: 12, currentMonth: true },
    { num: 13, currentMonth: true },
    { num: 14, currentMonth: true },
    { num: 15, currentMonth: true },
    { num: 16, currentMonth: true, selected: true }, // Highlighted days
    { num: 17, currentMonth: true, selected: true },
    { num: 18, currentMonth: true },
    { num: 19, currentMonth: true },
    { num: 20, currentMonth: true },
    { num: 21, currentMonth: true },
    { num: 22, currentMonth: true },
    { num: 23, currentMonth: true },
    { num: 24, currentMonth: true },
    { num: 25, currentMonth: true },
    { num: 26, currentMonth: true },
    { num: 27, currentMonth: true },
    { num: 28, currentMonth: true },
    { num: 29, currentMonth: true },
    { num: 30, currentMonth: true },
    { num: 31, currentMonth: true },
    { num: 1, currentMonth: false },
    { num: 2, currentMonth: false },
  ];

  return (
    <div className="animate-fade-in block space-y-6">
      
      {activeRole === 'siswa' ? (
        /* ================= SISWA DASHBOARD VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Student Specific Widgets */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Student Greetings */}
            <div>
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold tracking-wider uppercase mb-1">
                <Sparkles size={14} className="text-teal-500" />
                <span>Portal Siswa MTs At-Turmudzi</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight text-left">
                Assalamu'alaikum, <span className="text-teal-600 font-extrabold">{activeStudentName}</span> 🎓
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 font-medium text-left">{activeStudentClass} | NIS: {activeStudentNis} | Semester Ganjil 2025/2026</p>
            </div>

            {/* WIDGET POIN KEDISIPLINAN SISWA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Total Poin Pribadi */}
              <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white p-6 rounded-[2rem] shadow-lg shadow-teal-700/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-100 bg-white/10 px-3 py-1 rounded-full">Sistem Kedisiplinan & Prestasi</span>
                    <Award size={20} className="text-amber-300 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-teal-100">Total Akumulasi Poin Anda</h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black tracking-tight">{andiStats.totalAkhir}</span>
                    <span className="text-xs font-bold text-teal-200">Poin Aktif</span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Positif / Prestasi</p>
                    <p className="text-base font-black text-emerald-300 mt-0.5">+{andiStats.totalPositif}</p>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-wider text-teal-100">Negatif / Pelanggaran</p>
                    <p className="text-base font-black text-rose-300 mt-0.5">-{andiStats.totalNegatif}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Leaderboard 5 Besar Poin Positif */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-slate-800 text-xs md:text-sm uppercase tracking-wider flex items-center gap-1.5">
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                      Leaderboard 5 Besar
                    </h3>
                    <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full uppercase">Poin Positif</span>
                  </div>
                  
                  <div className="divide-y divide-slate-100">
                    {topStudentsPositive.map((st, index) => {
                      const isMe = st.id === activeStudentId;
                      return (
                        <div key={st.id} className={`flex items-center justify-between py-2.5 ${isMe ? 'bg-teal-50/50 -mx-3 px-3 rounded-xl' : ''}`}>
                          <div className="flex items-center space-x-2.5">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-slate-100 text-slate-700' :
                              index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-xs font-black text-slate-700 flex items-center gap-1">
                                {st.nama}
                                {isMe && <span className="text-[9px] bg-teal-600 text-white px-1.5 py-0.2 rounded-md">Saya</span>}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold">{st.kelas}</p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-600">+{st.stats.totalPositif} Poin</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* REQUIRED WIDGET PENGINGAT (Dashboard) */}
            {uncompletedCount > 0 ? (
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-6 rounded-[2rem] shadow-lg shadow-orange-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <AlertCircle size={20} className="animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-100 block">Widget Pengingat Asesmen</span>
                      <h3 className="text-xl font-black tracking-tight mt-0.5">Anda memiliki {uncompletedCount} asesmen yang belum diselesaikan!</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigate('lms-asesmen')}
                    className="hidden sm:block px-5 py-2.5 bg-white text-orange-700 hover:bg-orange-50 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Mulai Kerjakan
                  </button>
                </div>

                <div className="border-t border-white/10 pt-3.5 space-y-2.5">
                  <p className="text-[11px] text-amber-50 font-semibold uppercase tracking-wider">Daftar Tanggungan Asesmen Anda:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {pendingAssessments.map((a: any) => (
                      <div key={a.id} className="bg-white/10 backdrop-blur-xs p-3 rounded-2xl flex items-start space-x-2.5 border border-white/5">
                        <div className="text-[10px] bg-amber-400 text-slate-900 font-black px-2 py-0.5 rounded-lg mt-0.5">
                          KKTP {a.kktp}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs text-white leading-tight">{a.judul}</h4>
                          <p className="text-[9px] text-amber-100 font-medium mt-1">Mapel: {a.mapelNama} | Deadline: {new Date(a.deadline).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})} WIB</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="block sm:hidden pt-2">
                  <button 
                    onClick={() => onNavigate('lms-asesmen')}
                    className="w-full text-center py-3 bg-white text-orange-700 hover:bg-orange-50 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Mulai Kerjakan
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-[2rem] shadow-lg shadow-teal-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Alhamdulillah, Tugas Beres! 🎉</h3>
                    <p className="text-xs text-teal-100 mt-1 font-medium">Semua asesmen Kurikulum Merdeka Anda telah diselesaikan. Pertahankan prestasimu!</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('lms-asesmen')}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Tinjau Nilai Rapor
                </button>
              </div>
            )}

            {/* Quick Student Features */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Menu Belajar Cepat</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div 
                  onClick={() => onNavigate('lms-asesmen')}
                  className="bg-[#e0f2fe] p-6 rounded-[2rem] flex flex-col justify-between h-[160px] hover:scale-[1.02] transition-all cursor-pointer relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="px-3 py-1 bg-white/70 backdrop-blur-sm text-sky-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-xs">
                      <span>Kurikulum Merdeka</span>
                    </div>
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xs group-hover:bg-slate-950 group-hover:text-white transition-colors">
                      <ArrowUpRight size={16} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Asesmen & CBT</h3>
                    <p className="text-xs text-sky-800/70 font-semibold mt-1">Kerjakan tugas, kuis lisan, unggah berkas, & simulasi CBT online.</p>
                  </div>
                </div>

                <div 
                  onClick={() => onNavigate('lms-asesmen')}
                  className="bg-[#e2f4f1] p-6 rounded-[2rem] flex flex-col justify-between h-[160px] hover:scale-[1.02] transition-all cursor-pointer relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="px-3 py-1 bg-white/70 backdrop-blur-sm text-teal-800 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-xs">
                      <span>Buku Nilai</span>
                    </div>
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-xs group-hover:bg-slate-950 group-hover:text-white transition-colors">
                      <ArrowUpRight size={16} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Rekap Ketuntasan</h3>
                    <p className="text-xs text-teal-800/70 font-semibold mt-1">Pantau grafik ketuntasan (KKTP) dan status pengayaan/remedial pelajaran.</p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Right Column: Calendar & Agenda */}
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Kalender Akademik <span className="text-slate-400 font-semibold text-xs">Juli 2026</span>
              </h2>
            </div>

            {/* Beautiful Minimalist Calendar Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Juli 2026</span>
                <span className="text-[10px] font-black px-2 py-0.5 bg-teal-50 text-teal-600 rounded">Semester Ganjil</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`aspect-square flex items-center justify-center text-xs font-semibold rounded-full transition-all
                      ${!day.currentMonth ? 'text-slate-300' : 'text-slate-700'}
                      ${day.selected ? 'bg-teal-600 text-white font-extrabold shadow-md' : 'hover:bg-slate-50 cursor-pointer'}
                    `}
                  >
                    {day.num}
                  </div>
                ))}
              </div>
            </div>

            {/* Lesson Schedule */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Jadwal Kelas Hari Ini</h3>
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:translate-x-1 transition-transform">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black font-mono text-teal-600">JP 1-2</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs leading-none">Al-Qur'an Hadits</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Ustadzah Maryam S.PdI</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 bg-teal-50 text-teal-600 rounded">07:30 - 08:50</span>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:translate-x-1 transition-transform">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black font-mono text-teal-600">JP 3-4</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs leading-none">Matematika</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Ustadz Hendra S.Si</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 bg-teal-50 text-teal-600 rounded">08:50 - 10:10</span>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:translate-x-1 transition-transform">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black font-mono text-teal-600">JP 5-6</span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs leading-none">Fiqih Ibadah</h4>
                      <p className="text-[9px] text-slate-400 mt-1">Ustadz Syarifudin M.Ag</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black px-2 py-0.5 bg-teal-50 text-teal-600 rounded">10:40 - 12:00</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* ================= ORIGINAL ADMIN/GURU DASHBOARD VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Welcome, Activities & Learning Progress (Col span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Welcome back Header */}
            <div>
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-semibold tracking-wider uppercase mb-1">
                <Sparkles size={14} className="text-amber-500 animate-pulse" />
                <span>Sistem Manajemen Madrasah</span>
              </div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Welcome back <span className="animate-bounce inline-block">👋</span>
              </h1>
            </div>

            {/* Your Activities Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  Aktivitas Utama Hari Ini <span className="text-slate-400 font-medium ml-1">({students.length + teachers.length})</span>
                </h2>
              </div>

              {/* Pastel cards layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Card 1: Siswa (Mint/Teal background) */}
                <div 
                  onClick={() => onNavigate('siswa')}
                  className="bg-[#d5f2e8] p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="px-3 py-1 bg-white/70 backdrop-blur-sm text-emerald-800 rounded-full text-[11px] font-extrabold flex items-center space-x-1 shadow-sm">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span>4.8</span>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <ArrowUpRight size={18} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>

                  <div>
                    {/* Stacked Avatars */}
                    <div className="flex -space-x-2.5 mb-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">A</div>
                      <div className="w-7 h-7 rounded-full bg-teal-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">I</div>
                      <div className="w-7 h-7 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">U</div>
                      <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">Z</div>
                      <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-slate-700 shadow-sm">+8</div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Manajemen Siswa</h3>
                    <p className="text-[11px] text-emerald-800/70 font-semibold mt-1">Kelola data & rekap profil</p>
                  </div>
                </div>

                {/* Card 2: Guru & Tendik (Indigo background) */}
                <div 
                  onClick={() => onNavigate('guru')}
                  className="bg-[#e0e7ff] p-6 rounded-[2rem] flex flex-col justify-between h-[180px] hover:scale-[1.02] transition-transform cursor-pointer relative group"
                >
                  <div className="flex items-start justify-between">
                    <div className="px-3 py-1 bg-white/70 backdrop-blur-sm text-indigo-900 rounded-full text-[11px] font-extrabold flex items-center space-x-1 shadow-sm">
                      <Star size={12} className="fill-amber-400 text-amber-400" />
                      <span>4.4</span>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <ArrowUpRight size={18} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>

                  <div>
                    {/* Stacked Avatars */}
                    <div className="flex -space-x-2.5 mb-3">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">F</div>
                      <div className="w-7 h-7 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">M</div>
                      <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm">H</div>
                      <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-extrabold text-slate-700 shadow-sm">+4</div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Pendidik & Tendik</h3>
                    <p className="text-[11px] text-indigo-900/70 font-semibold mt-1">Staf pengajar & kurikulum</p>
                  </div>
                </div>

              </div>
            </div>

            {/* WIDGET AKUMULASI POIN KEDISIPLINAN (GURU/ADMIN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Widget 1: Top 5 Poin Positif (Siswa Teladan) */}
              <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-black shadow-md shadow-emerald-500/10">
                        <Award size={16} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-850 text-sm tracking-tight">Top 5 Siswa Teladan</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Poin Positif Tertinggi</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full uppercase">Sikap Baik</span>
                  </div>

                  <div className="space-y-3">
                    {topStudentsPositive.map((st, index) => (
                      <div key={st.id} className="flex items-center justify-between hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-800">{st.nama}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{st.kelas}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-emerald-600 block">+{st.stats.totalPositif} Poin</span>
                          <span className="text-[9px] text-slate-400 font-bold">Total: {st.stats.totalAkhir}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Widget 2: Top 5 Poin Negatif (Siswa Pelanggaran Terberat) */}
              <div className="bg-white rounded-[2.5rem] border border-rose-100 shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-rose-50 pb-3 mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-500/10">
                        <TrendingDown size={16} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-850 text-sm tracking-tight">Top 5 Pelanggaran Terberat</h3>
                        <p className="text-[10px] text-slate-400 font-bold">Akumulasi Pelanggaran Terbanyak</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full uppercase">Perlu Pembinaan</span>
                  </div>

                  <div className="space-y-3">
                    {topStudentsNegative.map((st, index) => (
                      <div key={st.id} className="flex items-center justify-between hover:bg-slate-50/50 p-1.5 rounded-xl transition-colors">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-black text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-800">{st.nama}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{st.kelas}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-rose-600 block">-{st.stats.totalNegatif} Poin</span>
                          <span className="text-[9px] text-slate-400 font-bold">Total: {st.stats.totalAkhir}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Progress / Statistik Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Progres & Statistik Madrasah</h2>
              
              {/* 3 smaller cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Card 1: Completed */}
                <div 
                  onClick={() => onNavigate('siswa')}
                  className="bg-[#e2f4f1] p-5 rounded-[1.75rem] flex flex-col justify-between h-[120px] cursor-pointer hover:scale-[1.03] transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-emerald-800/70">Total Siswa</span>
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-xs group-hover:bg-slate-955 transition-colors">
                      <ArrowUpRight size={11} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-900 leading-none">{students.length}</h4>
                    <p className="text-[10px] font-medium text-emerald-800/60 mt-1">Siswa Aktif</p>
                  </div>
                </div>

                {/* Card 2: Your Score */}
                <div 
                  onClick={() => onNavigate('guru')}
                  className="bg-[#e0f2fe] p-5 rounded-[1.75rem] flex flex-col justify-between h-[120px] cursor-pointer hover:scale-[1.03] transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-sky-900/70">Total Guru</span>
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-xs group-hover:bg-slate-955 transition-colors">
                      <ArrowUpRight size={11} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-900 leading-none">{teachers.length}</h4>
                    <p className="text-[10px] font-medium text-sky-900/60 mt-1">Ustadz/Ustadzah</p>
                  </div>
                </div>

                {/* Card 3: Active */}
                <div 
                  onClick={() => onNavigate('profil')}
                  className="bg-[#f1f5f9] p-5 rounded-[1.75rem] flex flex-col justify-between h-[120px] cursor-pointer hover:scale-[1.03] transition-all group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-slate-700">Akun Aktif</span>
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-xs group-hover:bg-slate-955 transition-colors">
                      <ArrowUpRight size={11} className="text-slate-800 group-hover:text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-900 leading-none">{students.length + teachers.length}</h4>
                    <p className="text-[10px] font-medium text-slate-600 mt-1">Database</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Golden Progress Card */}
            <div className="bg-[#fef3c7]/60 p-6 rounded-[2rem] border border-[#fde68a]/50 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white/80 rounded-lg flex items-center justify-center text-amber-800">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-xs font-black text-amber-900/80 uppercase tracking-widest">KELENGKAPAN PROFIL MADRASAH</span>
                </div>
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xs">
                  <ArrowUpRight size={16} className="text-slate-800" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Evaluasi Diri & Penyelarasan Dapodik</h3>
                <p className="text-xs font-semibold text-amber-900/70 mt-1">22 dari 24 berkas kependidikan telah disinkronisasikan secara daring.</p>
              </div>

              <div className="space-y-1">
                <div className="w-full bg-amber-200/50 rounded-full h-2">
                  <div className="bg-amber-500 h-2 rounded-full w-[92%]" />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-amber-900/70">
                  <span>Progres Integrasi</span>
                  <span>92% Lengkap</span>
                </div>
              </div>
            </div>

            {/* Core Feature Quick Bento Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Keamanan Peran</h4>
                <p className="text-[11px] text-slate-500 mt-1">Sistem dienkripsi untuk privasi data siswa & wali kelas.</p>
                <button onClick={() => onNavigate('settings')} className="text-[10px] font-bold text-teal-600 hover:text-teal-700 mt-3 flex items-center space-x-1 uppercase tracking-wider text-left cursor-pointer">
                  <span>Pengaturan</span>
                  <ArrowRight size={10} />
                </button>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Laporan Madrasah</h4>
                <p className="text-[11px] text-slate-500 mt-1">Cetak rekapitulasi data siswa & guru untuk kearsipan.</p>
                <button onClick={() => onNavigate('profil')} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 mt-3 flex items-center space-x-1 uppercase tracking-wider text-left cursor-pointer">
                  <span>Lembaga</span>
                  <ArrowRight size={10} />
                </button>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <h4 className="font-bold text-slate-800 text-sm">Layanan Bantuan</h4>
                <p className="text-[11px] text-slate-500 mt-1">Butuh bantuan operasional? Hubungi WhatsApp developer.</p>
                <a href="https://wa.me/6282258921234" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 mt-3 flex items-center space-x-1 uppercase tracking-wider text-left inline-block">
                  <span>Hubungi WA</span>
                  <ArrowRight size={10} />
                </a>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Calendar & Lesson Schedule */}
          <div className="space-y-8">
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Jadwal & Agenda <span className="text-slate-400 font-medium text-xs">Juli 2026</span>
              </h2>
            </div>

            {/* Beautiful Minimalist Calendar Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm space-y-4">
              
              {/* Month Header */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">Juli 2026</span>
                <div className="flex space-x-1">
                  <button className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Weekdays */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-400 tracking-wider">
                <span>Min</span><span>Sen</span><span>Sel</span><span>Rab</span><span>Kam</span><span>Jum</span><span>Sab</span>
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarDays.map((day, idx) => (
                  <div 
                    key={idx} 
                    className={`aspect-square flex items-center justify-center text-xs font-semibold rounded-full transition-all
                      ${!day.currentMonth ? 'text-slate-300' : 'text-slate-700'}
                      ${day.selected ? 'bg-slate-950 text-white font-extrabold shadow-sm' : 'hover:bg-slate-50 cursor-pointer'}
                    `}
                  >
                    {day.num}
                  </div>
                ))}
              </div>

            </div>

            {/* Lesson Schedule vertical list */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Kegiatan Terdekat</h3>
              
              <div className="space-y-3">
                
                {/* Agenda item 1 */}
                <div className="bg-[#e0f2fe]/60 border border-[#bae6fd]/50 p-4 rounded-2xl flex items-start space-x-3 hover:scale-[1.01] transition-transform">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sky-600 shadow-xs flex-shrink-0">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">Rapat Pleno Dewan Guru & Kurikulum</h4>
                    <p className="text-[10px] text-sky-800/80 mt-1 font-semibold">12 Juli 2026 - Jam 08.00 WIB</p>
                  </div>
                </div>

                {/* Agenda item 2 */}
                <div className="bg-[#d1e7dd]/60 border border-[#a3cfbb]/50 p-4 rounded-2xl flex items-start space-x-3 hover:scale-[1.01] transition-transform">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-xs flex-shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">Sinkronisasi EMIS & Penyaluran BOS</h4>
                    <p className="text-[10px] text-emerald-800/80 mt-1 font-semibold">16 Juli 2026 - Jam 10.00 WIB</p>
                  </div>
                </div>

                {/* Agenda item 3 */}
                <div className="bg-[#f1f5f9]/80 border border-[#cbd5e1]/50 p-4 rounded-2xl flex items-start space-x-3 hover:scale-[1.01] transition-transform">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-600 shadow-xs flex-shrink-0">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">Evaluasi Penilaian Tengah Semester</h4>
                    <p className="text-[10px] text-slate-700/80 mt-1 font-semibold">22 Juli 2026 - Jam 09.00 WIB</p>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
