import { safeJSONParse } from "../lib/json";
import React, { useState, useEffect } from 'react';
import { 
  Award, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Save, 
  ChevronRight, 
  ChevronDown,
  Calculator, 
  TrendingUp, 
  Search, 
  Printer, 
  Settings, 
  Activity, 
  Download, 
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Send,
  MessageSquare,
  CheckCircle2,
  XCircle,
  UploadCloud,
  FileText,
  Brain,
  HelpCircle,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Kelas, Teacher, Student, UserRole } from '../types';
import { SearchableSelect } from './SearchableSelect';

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(`Failed to write ${key} to localStorage:`, e);
  }
};

interface AsesmenViewProps {
  classes: Kelas[];
  teachers: Teacher[];
  students: Student[];
  addToast?: (message: string, action: string, type: 'success' | 'info' | 'error') => void;
  addNotification?: (title: string, message: string) => void;
  userRole?: UserRole | null;
  currentUser?: any;
}

export interface AsesmenItem {
  id: string;
  judul: string;
  kategori: string; // Formatif Awal, Formatif Proses, Sumatif
  mapelNama: string;
  kelasNama: string;
  teknik: string; // Tes Tertulis, Praktik, Proyek, dll.
  kktp: number; // Target nilai minimum, e.g. 75
  jenisPengumpulan: 'Berkas' | 'Teks' | 'CBT';
  deadline: string;
  deskripsi: string;
}

export interface AsesmenSubmission {
  id: string;
  asesmenId: string;
  siswaId: string;
  siswaNama: string;
  status: 'Belum Dikerjakan' | 'Sudah Mengumpulkan' | 'Sudah Dinilai';
  konten: string; // Jawaban teks / Link file
  nilai: number | null;
  feedback: string;
  tuntas: boolean | null; // true jika nilai >= kktp
  tindakLanjut: 'Remedial' | 'Pengayaan' | null;
  tanggalKumpul: string;
}

export interface CommentItem {
  id: string;
  asesmenId: string;
  authorName: string;
  authorRole: 'Guru' | 'Siswa';
  text: string;
  timestamp: string;
}

export const AsesmenView: React.FC<AsesmenViewProps> = ({
  classes,
  teachers,
  students,
  addToast,
  addNotification,
  userRole,
  currentUser
}) => {
  // Tabs: 'asesmen' (Assigned Assessments) or 'laporan' (Completion Reports)
  const [activeTab, setActiveTab] = useState<'asesmen' | 'laporan'>('asesmen');
  
  // Set role based on determined RBAC
  const [activeRole, setActiveRole] = useState<'admin' | 'siswa'>(() => {
    return userRole === 'siswa' ? 'siswa' : 'admin';
  });

  useEffect(() => {
    setActiveRole(userRole === 'siswa' ? 'siswa' : 'admin');
  }, [userRole]);

  // State Lists
  const [assessments, setAssessments] = useState<AsesmenItem[]>([]);
  const [submissions, setSubmissions] = useState<AsesmenSubmission[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);

  // Search & Filter State (Guru)
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [filterMapel, setFilterMapel] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Assessment Detail View State (null = list view)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Form State for creating assessment
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newJudul, setNewJudul] = useState<string>('');
  const [newKategori, setNewKategori] = useState<string>('Asesmen Formatif (Proses Pembelajaran)');
  const [newMapel, setNewMapel] = useState<string>('Fiqih');
  const [newKelas, setNewKelas] = useState<string>('Kelas 7-A');
  const [newTeknik, setNewTeknik] = useState<string>('Tes Tertulis');
  const [newKktp, setNewKktp] = useState<number>(75);
  const [newJenisPengumpulan, setNewJenisPengumpulan] = useState<'Berkas' | 'Teks' | 'CBT'>('Teks');
  const [newDeadline, setNewDeadline] = useState<string>('2026-07-20T23:59');
  const [newDeskripsi, setNewDeskripsi] = useState<string>('');

  // Form State for Student Submission
  const [studentTextAnswer, setStudentTextAnswer] = useState<string>('');
  const [studentFileLink, setStudentFileLink] = useState<string>('');
  const [studentFileName, setStudentFileName] = useState<string>('');

  // CBT Quiz Interactive Simulator State
  const [cbtActive, setCbtActive] = useState<boolean>(false);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, string>>({});
  const [cbtScore, setCbtScore] = useState<number | null>(null);

  // Form State for Comment Discussion
  const [newCommentText, setNewCommentText] = useState<string>('');

  // Direct Grading Inputs per student
  const [gradeInputs, setGradeInputs] = useState<Record<string, { nilai: string; feedback: string }>>({});
  const [previewingSubmission, setPreviewingSubmission] = useState<{ submission: AsesmenSubmission; student: Student } | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(true);

  // Subjects lists configured in madrasah
  const defaultSubjects = ['Fiqih', 'Al-Qur\'an Hadits', 'Matematika', 'Bahasa Indonesia', 'Bahasa Arab', 'IPA', 'IPS', 'Aqidah Akhlak', 'SKI'];

  // Initialize and load databases on mount
  useEffect(() => {
    // 1. Assessments
    try {
      const savedAssessments = localStorage.getItem('mts_asesmen_items');
      if (savedAssessments && savedAssessments !== "undefined" && savedAssessments !== "null") {
        try { setAssessments(safeJSONParse(savedAssessments)); } catch(e) { console.error(e); }
      } else {
        const initialAssessments: AsesmenItem[] = [
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
        safeSetItem('mts_asesmen_items', JSON.stringify(initialAssessments));
        setAssessments(initialAssessments);
      }
    } catch (e) {
      console.error("Failed to parse mts_asesmen_items in AsesmenView:", e);
    }

    // 2. Submissions
    try {
      const savedSubmissions = localStorage.getItem('mts_asesmen_submissions');
      if (savedSubmissions && savedSubmissions !== 'undefined' && savedSubmissions !== 'null') {
        try { setSubmissions(safeJSONParse(savedSubmissions)); } catch(e) { console.error(e); }
      } else {
        const initialSubmissions: AsesmenSubmission[] = [
          {
            id: 'sub-1',
            asesmenId: 'ase-1',
            siswaId: 'std-1',
            siswaNama: 'Andi Setiawan',
            status: 'Sudah Dinilai',
            konten: '1. Rukun wudhu ada 6: niat, membasuh wajah, membasuh kedua tangan sampai siku, mengusap sebagian kepala, membasuh kedua kaki sampai mata kaki, dan tertib.\n2. Pembatal wudhu: keluar sesuatu dari kubul/dubur, tidur nyenyak, hilang akal, menyentuh kemaluan, bersentuhan kulit laki-laki dan perempuan yang bukan mahram.',
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
            status: 'Sudah Mengumpulkan',
            konten: 'Tautan rekaman suara: https://drive.google.com/file/d/rec-andi-tajwid/view',
            nilai: null,
            feedback: '',
            tuntas: null,
            tindakLanjut: null,
            tanggalKumpul: '2026-07-04T15:20'
          }
        ];
        safeSetItem('mts_asesmen_submissions', JSON.stringify(initialSubmissions));
        setSubmissions(initialSubmissions);
      }
    } catch (e) {
      console.error("Failed to parse mts_asesmen_submissions in AsesmenView:", e);
    }

    // 3. Comments (Diskusi)
    try {
      const savedComments = localStorage.getItem('mts_asesmen_comments');
      if (savedComments && savedComments !== 'undefined' && savedComments !== 'null') {
        try { setComments(safeJSONParse(savedComments)); } catch(e) { console.error(e); }
      } else {
        const initialComments: CommentItem[] = [
          {
            id: 'com-1',
            asesmenId: 'ase-1',
            authorName: 'Ustadz Syarifudin M.Ag',
            authorRole: 'Guru',
            text: 'Harap membaca bab thaharah di kitab Fathul Qarib halaman 12-15 sebelum menjawab soal ujian.',
            timestamp: '2026-07-03T14:00'
          },
          {
            id: 'com-2',
            asesmenId: 'ase-1',
            authorName: 'Andi Setiawan',
            authorRole: 'Siswa',
            text: 'Siap, Ustadz. Apakah boleh menjawab menggunakan bahasa Indonesia yang santun?',
            timestamp: '2026-07-03T16:30'
          },
          {
            id: 'com-3',
            asesmenId: 'ase-1',
            authorName: 'Ustadz Syarifudin M.Ag',
            authorRole: 'Guru',
            text: 'Tentu saja boleh, Andi. Yang terpenting rukun-rukunnya disebutkan secara berurutan (tertib).',
            timestamp: '2026-07-03T17:00'
          }
        ];
        safeSetItem('mts_asesmen_comments', JSON.stringify(initialComments));
        setComments(initialComments);
      }
    } catch (e) {
      console.error("Failed to parse mts_asesmen_comments in AsesmenView:", e);
    }
  }, []);

  // Format Date-time to dd/mm/yyyy HH:MM
  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Helper helper sync local storages
  const triggerToast = (message: string, action: string, type: 'success' | 'info' | 'error') => {
    if (addToast) addToast(message, action, type);
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudul.trim() || !newDeskripsi.trim()) {
      triggerToast('Mohon isi semua bidang formulir dengan benar', 'Gagal', 'error');
      return;
    }

    const newItem: AsesmenItem = {
      id: `ase-${Date.now()}`,
      judul: newJudul,
      kategori: newKategori,
      mapelNama: newMapel,
      kelasNama: newKelas,
      teknik: newTeknik,
      kktp: Number(newKktp),
      jenisPengumpulan: newJenisPengumpulan,
      deadline: newDeadline,
      deskripsi: newDeskripsi
    };

    const updated = [...assessments, newItem];
    safeSetItem('mts_asesmen_items', JSON.stringify(updated));
    setAssessments(updated);

    // Reset Form
    setIsCreating(false);
    setNewJudul('');
    setNewDeskripsi('');
    setNewKktp(75);

    triggerToast('Asesmen baru berhasil dibuat & dipublikasikan', 'Sukses', 'success');
    if (addNotification) {
      addNotification('Asesmen Baru Diterbitkan', `Asesmen "${newJudul}" untuk kelas ${newKelas} telah diterbitkan.`);
    }
  };

  const handleDeleteAssessment = (id: string, judul: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus asesmen "${judul}"? Semua data nilai siswa terkait akan dihapus.`)) {
      const updatedItems = assessments.filter(a => a.id !== id);
      const updatedSubmissions = submissions.filter(s => s.asesmenId !== id);
      const updatedComments = comments.filter(c => c.asesmenId !== id);

      safeSetItem('mts_asesmen_items', JSON.stringify(updatedItems));
      safeSetItem('mts_asesmen_submissions', JSON.stringify(updatedSubmissions));
      safeSetItem('mts_asesmen_comments', JSON.stringify(updatedComments));

      setAssessments(updatedItems);
      setSubmissions(updatedSubmissions);
      setComments(updatedComments);

      if (selectedAssessmentId === id) {
        setSelectedAssessmentId(null);
      }

      triggerToast('Asesmen telah berhasil dihapus', 'Sukses', 'success');
      addNotification?.('Asesmen Dihapus', `Data asesmen "${judul}" beserta nilai terkait telah dihapus permanen.`);
    }
  };

  // Helper helper to handle comment submissions
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedAssessmentId) return;

    const newComment: CommentItem = {
      id: `com-${Date.now()}`,
      asesmenId: selectedAssessmentId,
      authorName: activeRole === 'siswa' ? 'Andi Setiawan' : 'Ustadz Syarifudin M.Ag (Admin/Guru)',
      authorRole: activeRole === 'siswa' ? 'Siswa' : 'Guru',
      text: newCommentText,
      timestamp: new Date().toISOString()
    };

    const updated = [...comments, newComment];
    safeSetItem('mts_asesmen_comments', JSON.stringify(updated));
    setComments(updated);
    setNewCommentText('');
    triggerToast('Pertanyaan/Komentar terkirim', 'Sukses', 'success');
  };

  // Direct Grading Handler (Realtime scoring & feedback updates)
  const handleUpdateGradeInput = (siswaId: string, field: 'nilai' | 'feedback', value: string) => {
    setGradeInputs(prev => {
      const current = prev[siswaId] || { nilai: '', feedback: '' };
      return {
        ...prev,
        [siswaId]: {
          ...current,
          [field]: value
        }
      };
    });
  };

  const handleSaveGrade = (siswaId: string, siswaNama: string, kktp: number) => {
    if (!selectedAssessmentId) return;
    const input = gradeInputs[siswaId];
    if (!input || input.nilai.trim() === '') {
      triggerToast('Mohon masukkan nilai numerik (0-100) terlebih dahulu', 'Gagal', 'error');
      return;
    }

    const numericValue = Number(input.nilai);
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      triggerToast('Nilai harus berupa angka rentang 0 sampai 100', 'Gagal', 'error');
      return;
    }

    const isTuntas = numericValue >= kktp;
    const tindakLanjutStr = isTuntas ? 'Pengayaan' : 'Remedial';

    // Find if submission already exists, or create a new one (for direct grading of unsubmitted/paper-based tests)
    const existingSubIdx = submissions.findIndex(s => s.asesmenId === selectedAssessmentId && s.siswaId === siswaId);
    let updatedSubmissions = [...submissions];

    if (existingSubIdx > -1) {
      updatedSubmissions[existingSubIdx] = {
        ...updatedSubmissions[existingSubIdx],
        status: 'Sudah Dinilai',
        nilai: numericValue,
        feedback: input.feedback,
        tuntas: isTuntas,
        tindakLanjut: tindakLanjutStr
      };
    } else {
      updatedSubmissions.push({
        id: `sub-${Date.now()}-${siswaId}`,
        asesmenId: selectedAssessmentId,
        siswaId: siswaId,
        siswaNama: siswaNama,
        status: 'Sudah Dinilai',
        konten: 'Dinilai langsung oleh Guru (Metode Tatap Muka/Kertas)',
        nilai: numericValue,
        feedback: input.feedback,
        tuntas: isTuntas,
        tindakLanjut: tindakLanjutStr,
        tanggalKumpul: new Date().toISOString()
      });
    }

    safeSetItem('mts_asesmen_submissions', JSON.stringify(updatedSubmissions));
    setSubmissions(updatedSubmissions);
    triggerToast(`Nilai untuk ${siswaNama} disimpan: ${numericValue} (${tindakLanjutStr})`, 'Sukses', 'success');
  };

  // Toggle langsung submission status (Sudah/Belum)
  const handleToggleLangsungSubmission = (siswaId: string, siswaNama: string, statusVal: 'Sudah' | 'Belum') => {
    if (!selectedAssessmentId) return;
    let updatedSubmissions = [...submissions];
    const existingIdx = submissions.findIndex(s => s.asesmenId === selectedAssessmentId && s.siswaId === siswaId);

    if (statusVal === 'Sudah') {
      if (existingIdx > -1) {
        updatedSubmissions[existingIdx] = {
          ...updatedSubmissions[existingIdx],
          status: updatedSubmissions[existingIdx].status === 'Sudah Dinilai' ? 'Sudah Dinilai' : 'Sudah Mengumpulkan',
          konten: updatedSubmissions[existingIdx].konten || 'Mengerjakan langsung di kelas (kertas)',
        };
      } else {
        updatedSubmissions.push({
          id: `sub-${Date.now()}-${siswaId}`,
          asesmenId: selectedAssessmentId,
          siswaId: siswaId,
          siswaNama: siswaNama,
          status: 'Sudah Mengumpulkan',
          konten: 'Mengerjakan langsung di kelas (kertas)',
          nilai: null,
          feedback: '',
          tuntas: null,
          tindakLanjut: null,
          tanggalKumpul: new Date().toISOString()
        });
      }
    } else {
      if (existingIdx > -1) {
        updatedSubmissions.splice(existingIdx, 1);
      }
      setGradeInputs(prev => {
        const copy = { ...prev };
        delete copy[siswaId];
        return copy;
      });
    }

    safeSetItem('mts_asesmen_submissions', JSON.stringify(updatedSubmissions));
    setSubmissions(updatedSubmissions);
    triggerToast(`Status pengumpulan ${siswaNama} diubah menjadi: ${statusVal}`, 'Sukses', 'success');
  };

  // Student Submits Their Assessment
  const handleStudentSubmit = (e: React.FormEvent, item: AsesmenItem) => {
    e.preventDefault();

    let finalContent = '';
    if (item.jenisPengumpulan === 'Teks') {
      if (!studentTextAnswer.trim()) {
        triggerToast('Silakan tulis jawaban Anda sebelum mengirim', 'Gagal', 'error');
        return;
      }
      finalContent = studentTextAnswer;
    } else if (item.jenisPengumpulan === 'Berkas') {
      if (!studentFileLink.trim()) {
        triggerToast('Silakan lampirkan tautan berkas atau foto hasil tugas', 'Gagal', 'error');
        return;
      }
      finalContent = `Tautan Lampiran: ${studentFileLink} (${studentFileName || 'berkas_tugas.pdf'})`;
    }

    const newSub: AsesmenSubmission = {
      id: `sub-${Date.now()}`,
      asesmenId: item.id,
      siswaId: 'std-1', // Simulated student: Andi Setiawan
      siswaNama: 'Andi Setiawan',
      status: 'Sudah Mengumpulkan',
      konten: finalContent,
      nilai: null,
      feedback: '',
      tuntas: null,
      tindakLanjut: null,
      tanggalKumpul: new Date().toISOString()
    };

    // Remove existing if any
    const updated = submissions.filter(s => !(s.asesmenId === item.id && s.siswaId === 'std-1'));
    const finalSubmissions = [...updated, newSub];

    safeSetItem('mts_asesmen_submissions', JSON.stringify(finalSubmissions));
    setSubmissions(finalSubmissions);

    // Reset fields
    setStudentTextAnswer('');
    setStudentFileLink('');
    setStudentFileName('');
    triggerToast('Tugas Anda berhasil dikirim ke Ustadz/Ustadzah!', 'Sukses', 'success');
  };

  // CBT Simulator Grading Handler
  const handleCbtQuizSubmit = (item: AsesmenItem) => {
    // Grade CBT quiz questions
    // Simple 4 questions quiz:
    // Q1: Hasil dari 3x + 5 = 17 adalah... (Option: "x = 4")
    // Q2: Jika x = 2, maka nilai dari 2x^2 + 3x - 1 adalah... (Option: "13")
    // Q3: Koefisien dari variabel y pada bentuk aljabar 5x - 3y + 8 adalah... (Option: "-3")
    // Q4: Suku-suku sejenis dari bentuk 4a + 2b - 3a + 5b adalah... (Option: "4a dan -3a")

    let correctCount = 0;
    if (cbtAnswers[1] === 'x = 4') correctCount++;
    if (cbtAnswers[2] === '13') correctCount++;
    if (cbtAnswers[3] === '-3') correctCount++;
    if (cbtAnswers[4] === '4a dan -3a') correctCount++;

    const calculatedScore = (correctCount / 4) * 100;
    const isTuntas = calculatedScore >= item.kktp;
    const tindakLanjutStr = isTuntas ? 'Pengayaan' : 'Remedial';

    const newSub: AsesmenSubmission = {
      id: `sub-${Date.now()}`,
      asesmenId: item.id,
      siswaId: 'std-1',
      siswaNama: 'Andi Setiawan',
      status: 'Sudah Dinilai',
      konten: `CBT Quiz Hasil: ${correctCount}/4 Benar. Pilihan Siswa: ${JSON.stringify(cbtAnswers)}`,
      nilai: calculatedScore,
      feedback: `Masya Allah, Anda menyelesaikan Ujian CBT Aljabar secara mandiri. Hasil: ${calculatedScore}/100.`,
      tuntas: isTuntas,
      tindakLanjut: tindakLanjutStr,
      tanggalKumpul: new Date().toISOString()
    };

    const updated = submissions.filter(s => !(s.asesmenId === item.id && s.siswaId === 'std-1'));
    const finalSubmissions = [...updated, newSub];

    safeSetItem('mts_asesmen_submissions', JSON.stringify(finalSubmissions));
    setSubmissions(finalSubmissions);
    setCbtScore(calculatedScore);
    setCbtActive(false);

    triggerToast(`Kuis CBT selesai! Skor Anda: ${calculatedScore} (${tindakLanjutStr})`, 'Sukses', 'success');
  };

  // Get active selected assessment item
  const selectedAssessment = assessments.find(a => a.id === selectedAssessmentId);
  const selectedComments = comments.filter(c => c.asesmenId === selectedAssessmentId);

  // Filtered List for Guru UI
  const filteredAssessments = assessments.filter(item => {
    const matchClass = filterKelas === 'Semua' || item.kelasNama === filterKelas;
    const matchMapel = filterMapel === 'Semua' || item.mapelNama === filterMapel;
    const matchSearch = item.judul.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClass && matchMapel && matchSearch;
  });

  // Target class students for selected assessment
  const targetClassStudents = selectedAssessment 
    ? students.filter(s => s.kelas === selectedAssessment.kelasNama)
    : [];

  return (
    <div className="animate-fade-in block space-y-6">
      
      {/* Main UI Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-600">MODUL ASESMEN PEMBELAJARAN</span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Asesmen Kurikulum Merdeka
          </h2>
          <p className="text-xs text-slate-400 mt-1">Penyusunan indikator ketercapaian, KKTP, pengumpulan tugas, kuis CBT, dan rekapitulasi ketuntasan.</p>
        </div>

        {/* Tab Switcher & Print buttons */}
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => { setActiveTab('asesmen'); setSelectedAssessmentId(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'asesmen' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Daftar & Penugasan
            </button>
            <button
              onClick={() => { setActiveTab('laporan'); setSelectedAssessmentId(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'laporan' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Laporan & Ketuntasan
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Cetak Halaman"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ======================= TAB 1: ASESMEN & DAFTAR PENUGASAN ======================= */}
      {activeTab === 'asesmen' && (
        <>
          {activeRole === 'admin' ? (
            /* ================= GURU / ADMIN LIST VIEW ================= */
            !selectedAssessmentId ? (
              <div className="space-y-6">

                {/* Friendly User Guide for teachers of all tech levels */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100/80 rounded-[2rem] p-5 md:p-6 shadow-sm">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowHelpGuide(!showHelpGuide)}>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">💡 Panduan Cepat Penilaian Kurikulum Merdeka</h3>
                        <p className="text-[11px] text-teal-800 font-semibold mt-0.5">Sangat mudah digunakan baik yang mahir maupun yang baru belajar teknologi!</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-[10px] font-bold rounded-xl text-teal-700 shadow-xs border border-teal-100 transition-colors"
                    >
                      {showHelpGuide ? "Sembunyikan" : "Tampilkan Petunjuk"}
                    </button>
                  </div>

                  {showHelpGuide && (
                    <div className="mt-4 pt-4 border-t border-teal-100/50 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="space-y-1.5 p-3.5 bg-white/60 rounded-2xl border border-teal-50">
                        <span className="inline-flex w-6 h-6 rounded-lg bg-teal-100 text-teal-700 items-center justify-center font-extrabold text-[11px] mb-1">1</span>
                        <h4 className="font-bold text-slate-800">Pilih / Buat Tugas</h4>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Pilih salah satu kartu penilaian di bawah dan klik <span className="text-slate-800 font-bold">"Detail & Nilai"</span>, atau buat tugas baru menggunakan tombol hijau di sebelah kanan.</p>
                      </div>

                      <div className="space-y-1.5 p-3.5 bg-white/60 rounded-2xl border border-teal-50">
                        <span className="inline-flex w-6 h-6 rounded-lg bg-teal-100 text-teal-700 items-center justify-center font-extrabold text-[11px] mb-1">2</span>
                        <h4 className="font-bold text-slate-800">Isi Nilai Siswa</h4>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Ketik nilai (0-100) siswa Anda. Agar praktis, Anda bisa <span className="text-slate-800 font-bold">mengeklik tombol angka instan</span> (seperti 75 atau 90) tanpa perlu mengetik!</p>
                      </div>

                      <div className="space-y-1.5 p-3.5 bg-white/60 rounded-2xl border border-teal-50">
                        <span className="inline-flex w-6 h-6 rounded-lg bg-teal-100 text-teal-700 items-center justify-center font-extrabold text-[11px] mb-1">3</span>
                        <h4 className="font-bold text-slate-800">Klik Simpan</h4>
                        <p className="text-slate-500 text-[11px] font-medium leading-relaxed">Klik tombol <span className="text-teal-600 font-bold">"Simpan"</span> di ujung kanan baris siswa. Sistem akan otomatis menentukan ketuntasan (KKTP) dan pengayaan/remedial siswa!</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Search, Filter & Buat Asesmen Bar */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Cari judul asesmen atau materi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold focus:outline-none focus:border-teal-500 transition-all text-slate-800"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Kelas */}
                    <SearchableSelect
                      value={filterKelas}
                      onChange={(val) => setFilterKelas(val)}
                      options={[
                        { value: 'Semua', label: 'Semua Kelas' },
                        ...classes.map(c => ({ value: c.nama, label: c.nama }))
                      ]}
                      placeholder="Semua Kelas"
                      showSearch={true}
                      isClearable={false}
                    />

                    {/* Filter Mapel */}
                    <SearchableSelect
                      value={filterMapel}
                      onChange={(val) => setFilterMapel(val)}
                      options={[
                        { value: 'Semua', label: 'Semua Mapel' },
                        ...defaultSubjects.map(sub => ({ value: sub, label: sub }))
                      ]}
                      placeholder="Semua Mapel"
                      showSearch={true}
                      isClearable={false}
                    />

                    {/* Button Buat Asesmen */}
                    <button
                      onClick={() => setIsCreating(true)}
                      className="px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Buat Asesmen</span>
                    </button>
                  </div>
                </div>

                {/* Form Buat Asesmen Baru (Conditional rendering) */}
                {isCreating && (
                  <form onSubmit={handleCreateAssessment} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <h3 className="font-extrabold text-slate-800 text-sm">Formulir Pembuatan Asesmen Kurikulum Merdeka</h3>
                      <button 
                        type="button" 
                        onClick={() => setIsCreating(false)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Judul */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Judul Asesmen / Tugas</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Penilaian Harian Fiqih Thaharah"
                          value={newJudul}
                          onChange={(e) => setNewJudul(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                        />
                      </div>

                      {/* Kategori */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Kategori Asesmen</label>
                        <SearchableSelect
                          value={newKategori}
                          onChange={(val) => setNewKategori(val)}
                          options={[
                            { value: 'Asesmen Formatif (Awal Pembelajaran)', label: 'Asesmen Formatif (Awal Pembelajaran)' },
                            { value: 'Asesmen Formatif (Proses Pembelajaran)', label: 'Asesmen Formatif (Proses Pembelajaran)' },
                            { value: 'Asesmen Sumatif (Lingkup Materi)', label: 'Asesmen Sumatif (Lingkup Materi)' },
                            { value: 'Asesmen Sumatif (Tengah Semester)', label: 'Asesmen Sumatif (Tengah Semester)' },
                            { value: 'Asesmen Sumatif (Akhir Semester)', label: 'Asesmen Sumatif (Akhir Semester)' },
                            { value: 'Asesmen Sumatif (Akhir Jenjang)', label: 'Asesmen Sumatif (Akhir Jenjang)' }
                          ]}
                          placeholder="Pilih Kategori"
                          showSearch={false}
                          isClearable={false}
                        />
                      </div>

                      {/* Mapel */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Mata Pelajaran</label>
                        <SearchableSelect
                          value={newMapel}
                          onChange={(val) => setNewMapel(val)}
                          options={defaultSubjects.map(sub => ({ value: sub, label: sub }))}
                          placeholder="Pilih Mata Pelajaran"
                          showSearch={true}
                          isClearable={false}
                        />
                      </div>

                      {/* Kelas Sasaran */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Kelas Sasaran</label>
                        <SearchableSelect
                          value={newKelas}
                          onChange={(val) => setNewKelas(val)}
                          options={classes.map(c => ({ value: c.nama, label: c.nama }))}
                          placeholder="Pilih Kelas Sasaran"
                          showSearch={true}
                          isClearable={false}
                        />
                      </div>

                      {/* Teknik Asesmen */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Teknik Asesmen</label>
                        <SearchableSelect
                          value={newTeknik}
                          onChange={(val) => setNewTeknik(val)}
                          options={[
                            { value: 'Tes Tertulis', label: 'Tes Tertulis' },
                            { value: 'Tes Lisan', label: 'Tes Lisan' },
                            { value: 'Praktik/Kinerja', label: 'Praktik/Kinerja' },
                            { value: 'Penugasan Mandiri', label: 'Penugasan Mandiri' },
                            { value: 'Proyek Siswa', label: 'Proyek Siswa' },
                            { value: 'Portofolio', label: 'Portofolio' }
                          ]}
                          placeholder="Pilih Teknik"
                          showSearch={false}
                          isClearable={false}
                        />
                      </div>

                      {/* Target Nilai KKTP */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Kriteria Ketuntasan (Target KKTP)</label>
                        <input
                          type="number"
                          required
                          min={50}
                          max={100}
                          value={newKktp}
                          onChange={(e) => setNewKktp(Number(e.target.value))}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] transition-colors"
                        />
                      </div>

                      {/* Jenis Pengumpulan */}
                      <div className="space-y-1.5 text-left">
                        <label className="text-[13px] text-slate-600 font-medium">Jenis Pengumpulan / Pengerjaan</label>
                        <SearchableSelect
                          value={newJenisPengumpulan}
                          onChange={(val) => setNewJenisPengumpulan(val as 'Berkas' | 'Teks' | 'CBT')}
                          options={[
                            { value: 'Teks', label: 'Langsung' },
                            { value: 'Berkas', label: 'Unggah Berkas/Foto Tugas' },
                            { value: 'CBT', label: 'Simulator CBT Madrasah' }
                          ]}
                          placeholder="Pilih Jenis Pengumpulan"
                          showSearch={false}
                          isClearable={false}
                        />
                      </div>

                      {/* Deadline */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400">Batas Waktu Pengumpulan (Deadline)</label>
                        <input
                          type="datetime-local"
                          required
                          value={newDeadline}
                          onChange={(e) => setNewDeadline(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Deskripsi */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Petunjuk Pengerjaan & Deskripsi Soal</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Tuliskan petunjuk secara detail. Contoh: Berikan penjelasan mengenai fardhu wudhu dan hal yang membatalkan disertai dalil..."
                        value={newDeskripsi}
                        onChange={(e) => setNewDeskripsi(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                      />
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsCreating(false)}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        Publikasikan Asesmen
                      </button>
                    </div>
                  </form>
                )}

                {/* Grid Lists */}
                {filteredAssessments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAssessments.map((item) => {
                      const itemSubmissions = submissions.filter(s => s.asesmenId === item.id);
                      const gradedSubmissions = itemSubmissions.filter(s => s.status === 'Sudah Dinilai');
                      const pendingSubmissions = itemSubmissions.filter(s => s.status === 'Sudah Mengumpulkan');

                      return (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-lg hover:shadow-slate-100/50 transition-all flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            {/* Badges */}
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black px-2.5 py-1 bg-teal-50 text-teal-600 rounded-full uppercase tracking-wider">
                                {item.kategori.includes('Sumatif') ? 'Sumatif' : 'Formatif'}
                              </span>
                              <span className="text-xs font-semibold text-slate-400 flex items-center space-x-1">
                                <Clock size={12} />
                                <span>{formatDeadline(item.deadline)}</span>
                              </span>
                            </div>

                            {/* Title & metadata */}
                            <div>
                              <h3 className="font-extrabold text-slate-800 text-base leading-tight hover:text-teal-600 cursor-pointer" onClick={() => setSelectedAssessmentId(item.id)}>
                                {item.judul}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                                Mapel: <span className="font-bold text-slate-700">{item.mapelNama}</span> | Kelas: <span className="font-bold text-slate-700">{item.kelasNama}</span>
                              </p>
                            </div>

                            {/* Info Kualitatif Kurikulum Merdeka */}
                            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-[10px] text-slate-600 font-semibold">
                              <p>🎯 Target KKTP: <span className="text-teal-600 font-bold">{item.kktp}</span></p>
                              <p>🛠️ Teknik: <span className="font-bold">{item.teknik}</span></p>
                              <p>📦 Tipe Input: <span className="font-bold">{item.jenisPengumpulan === 'Berkas' ? 'Unggah Berkas/Foto' : item.jenisPengumpulan === 'CBT' ? 'Kuis CBT' : 'Langsung'}</span></p>
                            </div>

                            {/* Submission trackers */}
                            <div className="flex items-center gap-4 pt-1 text-[10px] font-bold text-slate-500">
                              <span className="flex items-center space-x-1 text-emerald-600">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Dinilai: {gradedSubmissions.length}</span>
                              </span>
                              <span className="flex items-center space-x-1 text-amber-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>Butuh Penilaian: {pendingSubmissions.length}</span>
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons (Strictly non-white styled) */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-50 gap-2">
                            <button
                              onClick={() => setSelectedAssessmentId(item.id)}
                              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex-1 text-center transition-all cursor-pointer"
                            >
                              Detail & Nilai
                            </button>
                            
                            <button
                              onClick={() => handleDeleteAssessment(item.id, item.judul)}
                              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer"
                              title="Hapus Asesmen"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 space-y-3">
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 flex items-center justify-center rounded-full mx-auto">
                      <BookOpen size={24} />
                    </div>
                    <h3 className="font-bold text-slate-700 text-sm">Tidak ada asesmen ditemukan</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">Sesuaikan filter pencarian kelas dan pelajaran Anda atau terbitkan tugas baru.</p>
                  </div>
                )}

              </div>
            ) : (
              /* ================= GURU DETAILED GRADE MATRIX SCREEN ================= */
              <div className="space-y-6">
                {/* Back button and title */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedAssessmentId(null); setPreviewingSubmission(null); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <span>← Kembali ke Daftar</span>
                  </button>
                  <span className="text-xs text-slate-400 font-bold">ID: {selectedAssessment?.id}</span>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider bg-teal-50 px-2 py-0.5 rounded">{selectedAssessment?.kategori}</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">{selectedAssessment?.judul}</h3>
                    <p className="text-xs text-slate-500 mt-1">Target KKTP: <span className="font-extrabold text-teal-600">{selectedAssessment?.kktp}</span> | Kelas: <span className="font-bold text-slate-800">{selectedAssessment?.kelasNama}</span> | Mapel: <span className="font-bold text-slate-800">{selectedAssessment?.mapelNama}</span></p>
                  </div>
                  <div className="border-t border-slate-50 pt-3 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    <span className="font-bold text-slate-800 block mb-1">Instruksi Tugas:</span>
                    {selectedAssessment?.deskripsi}
                  </div>
                </div>

                {/* Direct Grading Matrix Table with Dual Layout for Mobile & PC */}
                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xs space-y-4 p-5 md:p-6">
                  
                  {/* Header & Stats Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-50 pb-4">
                    <div>
                      <h4 className="font-extrabold text-slate-800 text-sm">Matriks Penilaian & Tindak Lanjut Program Ketuntasan</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Nilai siswa secara langsung. KKTP dihitung otomatis, dan program Remedial disiapkan bila nilai kurang.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl">Total Siswa: {targetClassStudents.length}</span>
                    </div>
                  </div>

                  {/* ----------------- 1. HP / MOBILE CARD LIST (md:hidden) ----------------- */}
                  <div className="block md:hidden space-y-4">
                    {targetClassStudents.length > 0 ? (
                      targetClassStudents.map((siswa) => {
                        const sub = submissions.find(s => s.asesmenId === selectedAssessment?.id && s.siswaId === siswa.id);
                        const currentInput = gradeInputs[siswa.id] || { 
                          nilai: sub?.nilai !== null && sub?.nilai !== undefined ? String(sub.nilai) : '', 
                          feedback: sub?.feedback || '' 
                        };

                        const scoreVal = Number(currentInput.nilai);
                        const isValueEntered = currentInput.nilai.trim() !== '' && !isNaN(scoreVal);
                        const isTuntas = isValueEntered ? scoreVal >= (selectedAssessment?.kktp || 75) : sub?.tuntas;

                        return (
                          <div key={`mob-${siswa.id}`} className="bg-slate-50/50 border border-slate-100 p-4 rounded-[1.5rem] space-y-4 hover:border-teal-200 transition-colors">
                            
                            {/* Student Name Header */}
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight">{siswa.nama}</span>
                              {/* KKTP Status badge */}
                              {isValueEntered ? (
                                isTuntas ? (
                                  <span className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-emerald-50 text-emerald-700">TUNTAS</span>
                                ) : (
                                  <span className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-rose-50 text-rose-700">BELUM TUNTAS</span>
                                )
                              ) : sub?.status === 'Sudah Dinilai' ? (
                                sub.tuntas ? (
                                  <span className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-emerald-50 text-emerald-700">TUNTAS</span>
                                ) : (
                                  <span className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-rose-50 text-rose-700">BELUM TUNTAS</span>
                                )
                              ) : (
                                <span className="px-2.5 py-1 text-[9px] font-black rounded-lg bg-slate-100 text-slate-400">Belum Dinilai</span>
                              )}
                            </div>

                            {/* Submission status and content if any */}
                            <div className="space-y-1 text-xs">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Status Pengumpulan:</span>
                              {selectedAssessment?.jenisPengumpulan === 'Teks' ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleLangsungSubmission(siswa.id, siswa.nama, sub ? 'Belum' : 'Sudah')}
                                  className={`w-full py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                                    sub 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs hover:bg-emerald-100' 
                                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                  }`}
                                >
                                  {sub ? 'Sudah' : 'Belum'}
                                </button>
                              ) : sub ? (
                                <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-600 w-fit">
                                      {sub.status === 'Sudah Mengumpulkan' ? 'Sudah Mengumpulkan (Menunggu Penilaian)' : sub.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingSubmission({ submission: sub, student: siswa })}
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[9px] font-bold flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Eye size={10} />
                                      <span>Lihat Tugas</span>
                                    </button>
                                  </div>
                                  <p className="text-[11px] text-slate-600 italic line-clamp-2">"{sub.konten}"</p>
                                  <p className="text-[8px] text-slate-400">{new Date(sub.tanggalKumpul).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})} WIB</p>
                                </div>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400">
                                  Siswa belum mengumpulkan berkas/kuis
                                </span>
                              )}
                            </div>

                            {/* Grading form */}
                            <div className="space-y-3.5">
                              {/* Score & Quick buttons */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Nilai Angka (0-100):</label>
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="text"
                                    placeholder="Isi 0-100"
                                    value={currentInput.nilai}
                                    onChange={(e) => handleUpdateGradeInput(siswa.id, 'nilai', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-center text-xs font-black text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                                  />
                                  
                                  {/* Quick set score buttons for HP non-tech teachers */}
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <span className="text-[9px] text-slate-400 font-bold uppercase mr-1">Klik Instan:</span>
                                    {[75, 85, 95, 100].map((score) => (
                                      <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleUpdateGradeInput(siswa.id, 'nilai', String(score))}
                                        className="flex-1 py-1.5 bg-white border border-slate-200 hover:border-teal-500 active:bg-teal-50 text-slate-700 text-[10px] font-black rounded-lg transition-all"
                                      >
                                        {score === 75 ? `${score} (KKTP)` : score}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Feedback text */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Umpan Balik (Feedback):</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: Sangat baik, lanjutkan hafalanmu..."
                                  value={currentInput.feedback}
                                  onChange={(e) => handleUpdateGradeInput(siswa.id, 'feedback', e.target.value)}
                                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
                                />
                              </div>
                            </div>

                            {/* Prominent save button */}
                            <button
                              type="button"
                              onClick={() => handleSaveGrade(siswa.id, siswa.nama, selectedAssessment?.kktp || 75)}
                              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer"
                            >
                              <Save size={13} />
                              <span>Simpan Nilai {siswa.nama.split(' ')[0]}</span>
                            </button>

                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center text-xs text-slate-400 italic py-4">Tidak ada siswa terdaftar di kelas ini.</p>
                    )}
                  </div>

                  {/* ----------------- 2. TABLET/PC LAYOUT (hidden md:block) ----------------- */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="pb-3 pl-2">Siswa</th>
                          <th className="pb-3">Status Pengumpulan</th>
                          {selectedAssessment?.jenisPengumpulan !== 'Teks' && (
                            <th className="pb-3 text-center">Tinjau Jawaban</th>
                          )}
                          <th className="pb-3 w-[150px]">Nilai (0-100)</th>
                          <th className="pb-3">Status Ketuntasan (KKTP {selectedAssessment?.kktp})</th>
                          <th className="pb-3">Umpan Balik Naratif (Feedback)</th>
                          <th className="pb-3 text-right pr-2">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                        {targetClassStudents.map((siswa) => {
                          const sub = submissions.find(s => s.asesmenId === selectedAssessment?.id && s.siswaId === siswa.id);
                          const currentInput = gradeInputs[siswa.id] || { 
                            nilai: sub?.nilai !== null && sub?.nilai !== undefined ? String(sub.nilai) : '', 
                            feedback: sub?.feedback || '' 
                          };

                          const scoreVal = Number(currentInput.nilai);
                          const isValueEntered = currentInput.nilai.trim() !== '' && !isNaN(scoreVal);
                          const isTuntas = isValueEntered ? scoreVal >= (selectedAssessment?.kktp || 75) : sub?.tuntas;

                          return (
                            <tr key={`desk-${siswa.id}`} className="hover:bg-slate-50/50 transition-colors">
                              {/* Display ONLY the student name as requested */}
                              <td className="py-4 pl-2 font-black text-slate-900 text-sm">
                                {siswa.nama}
                              </td>

                              {/* Submission Content */}
                              <td className="py-4">
                                {selectedAssessment?.jenisPengumpulan === 'Teks' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLangsungSubmission(siswa.id, siswa.nama, sub ? 'Belum' : 'Sudah')}
                                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all duration-200 cursor-pointer min-w-[76px] text-center ${
                                      sub 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-2xs hover:bg-emerald-100' 
                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                    }`}
                                  >
                                    {sub ? 'Sudah' : 'Belum'}
                                  </button>
                                ) : sub ? (
                                  <div className="space-y-1 max-w-[200px]">
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 block w-fit">
                                      {sub.status === 'Sudah Mengumpulkan' ? 'Sudah Mengumpulkan (Menunggu Penilaian)' : sub.status}
                                    </span>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 italic">"{sub.konten}"</p>
                                    <p className="text-[8px] text-slate-400">{new Date(sub.tanggalKumpul).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})} WIB</p>
                                  </div>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-400">
                                    Belum Mengumpulkan
                                  </span>
                                )}
                              </td>

                              {/* Tinjau Jawaban Cell */}
                              {selectedAssessment?.jenisPengumpulan !== 'Teks' && (
                                <td className="py-4 text-center">
                                  {sub ? (
                                    <button
                                      type="button"
                                      onClick={() => setPreviewingSubmission({ submission: sub, student: siswa })}
                                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                                    >
                                      <Eye size={12} />
                                      <span>Lihat Tugas</span>
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic font-medium">Belum ada berkas</span>
                                  )}
                                </td>
                              )}

                              {/* Score input with instant buttons below */}
                              <td className="py-4">
                                <div className="space-y-1.5 w-[130px]">
                                  <input
                                    type="text"
                                    placeholder="0-100"
                                    value={currentInput.nilai}
                                    onChange={(e) => handleUpdateGradeInput(siswa.id, 'nilai', e.target.value)}
                                    className="w-[80px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-black text-slate-800 focus:outline-none focus:border-teal-500"
                                  />
                                  {/* Quick Fill Buttons for easy PC scoring */}
                                  <div className="flex flex-wrap gap-1">
                                    {[75, 85, 95, 100].map((score) => (
                                      <button
                                        key={score}
                                        type="button"
                                        onClick={() => handleUpdateGradeInput(siswa.id, 'nilai', String(score))}
                                        className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 hover:border-teal-500 hover:bg-white text-slate-600 text-[9px] font-bold rounded-md transition-all cursor-pointer"
                                        title={`Set nilai ${score}`}
                                      >
                                        {score === 75 ? `75` : score}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* KKTP Status Indicator */}
                              <td className="py-4">
                                {isValueEntered ? (
                                  isTuntas ? (
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold block w-fit text-[10px]">TUNTAS</span>
                                      <span className="text-[9px] text-slate-400 block font-semibold">Tindak Lanjut: <b>Pengayaan</b></span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold block w-fit text-[10px]">BELUM TUNTAS</span>
                                      <span className="text-[9px] text-slate-400 block font-semibold">Tindak Lanjut: <b>Remedial</b></span>
                                    </div>
                                  )
                                ) : sub?.status === 'Sudah Dinilai' ? (
                                  sub.tuntas ? (
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold block w-fit text-[10px]">TUNTAS</span>
                                      <span className="text-[9px] text-slate-400 block font-semibold">Tindak Lanjut: <b>Pengayaan</b></span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold block w-fit text-[10px]">BELUM TUNTAS</span>
                                      <span className="text-[9px] text-slate-400 block font-semibold">Tindak Lanjut: <b>Remedial</b></span>
                                    </div>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Menunggu input nilai</span>
                                )}
                              </td>

                              {/* Feedback Input */}
                              <td className="py-4">
                                <input
                                  type="text"
                                  placeholder="Tulis ulasan/catatan tindak lanjut..."
                                  value={currentInput.feedback}
                                  onChange={(e) => handleUpdateGradeInput(siswa.id, 'feedback', e.target.value)}
                                  className="w-full min-w-[150px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
                                />
                              </td>

                              {/* Save Action Button */}
                              <td className="py-4 text-right pr-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveGrade(siswa.id, siswa.nama, selectedAssessment?.kktp || 75)}
                                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                >
                                  Simpan
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>

                {/* Kolom Diskusi / Tanya Jawab Guru-Siswa */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
                    <MessageSquare size={16} />
                    <span>Kolom Tanya Jawab & Diskusi Pembelajaran</span>
                  </h4>

                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-2 border-b border-slate-50 pb-4">
                    {selectedComments.length > 0 ? (
                      selectedComments.map((com) => (
                        <div key={com.id} className={`p-4 rounded-2xl max-w-[80%] ${
                          com.authorRole === 'Guru' 
                            ? 'bg-teal-50/50 border border-teal-100/30 mr-auto' 
                            : 'bg-slate-50 ml-auto'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mb-1">
                            <span className={com.authorRole === 'Guru' ? 'text-teal-700' : 'text-slate-700'}>{com.authorName} ({com.authorRole})</span>
                            <span>{new Date(com.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">{com.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 italic py-6">Belum ada pertanyaan dari siswa mengenai asesmen ini.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Tulis instruksi tambahan atau jawab pertanyaan siswa..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                    />
                    <button
                      type="submit"
                      className="px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Kirim</span>
                    </button>
                  </form>
                </div>

              </div>
            )
          ) : (
            /* ================= SISWA / STUDENT LIST VIEW ================= */
            !selectedAssessmentId ? (
              <div className="space-y-6">
                {/* Simulated Student Welcome Bar */}
                <div className="bg-slate-900 text-white p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-teal-400 tracking-wider">PORTAL SISWA KELAS 7-A</span>
                    <h3 className="text-xl font-black mt-1">Selesaikan Tugas Kurikulum Merdeka Anda</h3>
                    <p className="text-xs text-slate-300 mt-1 font-medium">Pastikan semua tugas mencapai kriteria ketuntasan minimal (KKTP) yang ditentukan guru.</p>
                  </div>
                  <div className="bg-teal-600/25 border border-teal-500/20 px-4 py-2.5 rounded-2xl flex items-center space-x-2">
                    <Award size={18} className="text-teal-400" />
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-wider block text-teal-300">Profil Simulated</span>
                      <span className="text-xs font-bold text-white">Andi Setiawan</span>
                    </div>
                  </div>
                </div>

                {/* List of Assessments matching Kelas 7-A */}
                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-sm tracking-tight flex items-center space-x-2">
                    <span>Tanggungan Asesmen Kelas Anda (7-A):</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {assessments.filter(a => a.kelasNama === 'Kelas 7-A').map((item) => {
                      const sub = submissions.find(s => s.asesmenId === item.id && s.siswaId === 'std-1');
                      
                      let statusBadge = (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wider">
                          Belum Dikerjakan
                        </span>
                      );
                      if (sub?.status === 'Sudah Mengumpulkan') {
                        statusBadge = (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-wider animate-pulse">
                            Menunggu Dinilai
                          </span>
                        );
                      } else if (sub?.status === 'Sudah Dinilai') {
                        statusBadge = sub.tuntas ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-wider">
                            Tuntas (Skor: {sub.nilai})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-wider">
                            Belum Tuntas (Skor: {sub.nilai})
                          </span>
                        );
                      }

                      return (
                        <div key={item.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-teal-600 tracking-wider uppercase bg-teal-50 px-2.5 py-0.5 rounded-full">
                                {item.mapelNama}
                              </span>
                              {statusBadge}
                            </div>

                            <div>
                              <h4 className="font-extrabold text-slate-800 text-base leading-snug">
                                {item.judul}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">TEKNIK: {item.teknik} | TARGET KKTP: {item.kktp}</p>
                            </div>

                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {item.deskripsi}
                            </p>

                            <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold bg-slate-50 px-3 py-2 rounded-xl w-fit">
                              <Clock size={12} className="text-slate-400" />
                              <span>Batas Waktu: {formatDeadline(item.deadline)} WIB</span>
                            </div>
                          </div>

                          <button
                            onClick={() => { setSelectedAssessmentId(item.id); setCbtActive(false); setCbtAnswers({}); setCbtScore(null); }}
                            className="w-full text-center py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            {sub?.status === 'Sudah Dinilai' ? 'Tinjau Hasil & Feedback' : 'Buka & Kerjakan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              /* ================= SISWA DETAILED ASSESSMENT WORKPLACE SCREEN ================= */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setSelectedAssessmentId(null); setCbtActive(false); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <span>← Kembali ke Daftar</span>
                  </button>
                  <span className="text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-3 py-1 rounded-xl">Portal Pengerjaan Siswa</span>
                </div>

                {/* Info Card */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-teal-600 tracking-wider uppercase bg-teal-50 px-2 py-0.5 rounded">{selectedAssessment?.mapelNama}</span>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{selectedAssessment?.judul}</h3>
                    <p className="text-xs text-slate-500 mt-1">Ustadz Pengampu: <span className="font-extrabold text-slate-800">Ustadz Syarifudin M.Ag</span> | Target Nilai Kelulusan KKTP: <span className="font-black text-teal-600">{selectedAssessment?.kktp}</span></p>
                  </div>
                  <div className="border-t border-slate-50 pt-4 text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-line">
                    <span className="text-slate-800 font-extrabold block mb-1">Instruksi Tugas:</span>
                    {selectedAssessment?.deskripsi}
                  </div>
                </div>

                {/* Submissions form or result card */}
                {(() => {
                  const sub = submissions.find(s => s.asesmenId === selectedAssessment?.id && s.siswaId === 'std-1');

                  if (sub?.status === 'Sudah Dinilai') {
                    return (
                      <div className="bg-white border-2 border-emerald-500/30 p-6 rounded-[2rem] space-y-5 shadow-xs">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${sub.tuntas ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                            {sub.tuntas ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Hasil Asesmen Anda</span>
                            <h4 className="text-lg font-black tracking-tight">{sub.tuntas ? 'TUNTAS (Memenuhi KKTP)' : 'BELUM TUNTAS (Remedial)'}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-slate-50 p-4 rounded-2xl text-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Nilai Anda</span>
                            <span className={`text-4xl font-black block mt-1 ${sub.tuntas ? 'text-emerald-600' : 'text-rose-600'}`}>{sub.nilai}</span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl text-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Target KKTP</span>
                            <span className="text-4xl font-black text-slate-800 block mt-1">{selectedAssessment?.kktp}</span>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl text-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tindak Lanjut</span>
                            <span className={`text-sm font-black px-3 py-1.5 rounded-xl block mt-3 w-fit mx-auto ${sub.tuntas ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{sub.tindakLanjut}</span>
                          </div>
                        </div>

                        {sub.feedback && (
                          <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-100/50">
                            <span className="text-[10px] font-black text-teal-700 uppercase tracking-widest block mb-1">Catatan Umpan Balik Guru:</span>
                            <p className="text-xs font-semibold text-teal-900 leading-relaxed italic">"{sub.feedback}"</p>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (sub?.status === 'Sudah Mengumpulkan') {
                    return (
                      <div className="bg-amber-50/50 border border-amber-100 p-6 rounded-[2rem] text-center space-y-3.5">
                        <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                          <Clock size={24} />
                        </div>
                        <h4 className="text-lg font-black text-amber-800 tracking-tight">Tugas Berhasil Dikumpulkan! ⏳</h4>
                        <p className="text-xs text-amber-700 font-semibold max-w-md mx-auto">
                          Jawaban Anda sedang ditinjau oleh Ustadz/Ustadzah. Nilai dan umpan balik tindak lanjut akan muncul di sini setelah dinilai.
                        </p>
                        <div className="bg-white p-4 rounded-2xl text-left border border-amber-100/30 max-w-md mx-auto text-xs font-semibold text-slate-600">
                          <span className="text-slate-400 text-[10px] block font-black uppercase mb-1">Jawaban/Konten Anda:</span>
                          <p className="italic">"{sub.konten}"</p>
                        </div>
                      </div>
                    );
                  }

                  // CBT Quiz Simulator Area
                  if (selectedAssessment?.jenisPengumpulan === 'CBT') {
                    if (!cbtActive) {
                      return (
                        <div className="bg-[#eff6ff] p-6 rounded-[2rem] text-center space-y-4 border border-[#bfdbfe]">
                          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <Brain size={24} />
                          </div>
                          <h4 className="text-lg font-black text-blue-900">Interactive CBT Quiz Simulator</h4>
                          <p className="text-xs text-blue-800/80 font-semibold max-w-md mx-auto">
                            Asesmen ini menggunakan pengerjaan kuis komputer interaktif CBT. Anda akan menjawab 4 pertanyaan aljabar matematika dan mendapatkan skor otomatis saat submit!
                          </p>
                          <button
                            type="button"
                            onClick={() => setCbtActive(true)}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Mulai Ujian CBT Sekarang
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-500/20 space-y-6 animate-fade-in">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                            <h4 className="font-extrabold text-blue-900 text-sm flex items-center space-x-1.5">
                              <Brain size={16} />
                              <span>Ujian CBT Aljabar Aktif (Siswa: Andi Setiawan)</span>
                            </h4>
                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Soal 1-4 Mandiri</span>
                          </div>

                          <div className="space-y-5">
                            {/* Q1 */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-800">1. Hasil dari penyelesaian persamaan linier satu variabel 3x + 5 = 17 adalah...</p>
                              <div className="grid grid-cols-2 gap-2.5 pl-2">
                                {['x = 2', 'x = 3', 'x = 4', 'x = 5'].map((opt) => (
                                  <label key={opt} className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer flex items-center space-x-2 ${
                                    cbtAnswers[1] === opt ? 'bg-blue-50 border-blue-400 text-blue-950' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                  }`}>
                                    <input type="radio" name="q1" checked={cbtAnswers[1] === opt} onChange={() => setCbtAnswers(prev => ({...prev, 1: opt}))} className="hidden" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Q2 */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-800">2. Jika nilai variabel x = 2, maka hasil dari bentuk aljabar 2x² + 3x - 1 adalah...</p>
                              <div className="grid grid-cols-2 gap-2.5 pl-2">
                                {['11', '13', '15', '17'].map((opt) => (
                                  <label key={opt} className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer flex items-center space-x-2 ${
                                    cbtAnswers[2] === opt ? 'bg-blue-50 border-blue-400 text-blue-950' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                  }`}>
                                    <input type="radio" name="q2" checked={cbtAnswers[2] === opt} onChange={() => setCbtAnswers(prev => ({...prev, 2: opt}))} className="hidden" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Q3 */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-800">3. Koefisien dari variabel y pada bentuk aljabar 5x - 3y + 8 adalah...</p>
                              <div className="grid grid-cols-2 gap-2.5 pl-2">
                                {['5', '3', '-3', '8'].map((opt) => (
                                  <label key={opt} className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer flex items-center space-x-2 ${
                                    cbtAnswers[3] === opt ? 'bg-blue-50 border-blue-400 text-blue-950' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                  }`}>
                                    <input type="radio" name="q3" checked={cbtAnswers[3] === opt} onChange={() => setCbtAnswers(prev => ({...prev, 3: opt}))} className="hidden" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Q4 */}
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-slate-800">4. Suku-suku sejenis dari bentuk aljabar 4a + 2b - 3a + 5b adalah...</p>
                              <div className="grid grid-cols-2 gap-2.5 pl-2">
                                {['4a dan 2b', '4a dan -3a', '2b dan -3a', '-3a dan 5b'].map((opt) => (
                                  <label key={opt} className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer flex items-center space-x-2 ${
                                    cbtAnswers[4] === opt ? 'bg-blue-50 border-blue-400 text-blue-950' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                                  }`}>
                                    <input type="radio" name="q4" checked={cbtAnswers[4] === opt} onChange={() => setCbtAnswers(prev => ({...prev, 4: opt}))} className="hidden" />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setCbtActive(false)}
                              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCbtQuizSubmit(selectedAssessment!)}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                            >
                              Kumpulkan & Nilai Otomatis
                            </button>
                          </div>
                        </div>
                      );
                    }
                  }

                  // Default text/file pengerjaan form
                  return (
                    <form onSubmit={(e) => handleStudentSubmit(e, selectedAssessment!)} className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <h4 className="font-extrabold text-slate-800 text-sm">Lembar Pengumpulan Jawaban</h4>
                      
                      {selectedAssessment?.jenisPengumpulan === 'Teks' ? (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-slate-400">Ketik Jawaban Anda Secara Langsung</label>
                          <textarea
                            required
                            rows={6}
                            placeholder="Tuliskan lembar jawaban Anda di sini secara runut dan lengkap..."
                            value={studentTextAnswer}
                            onChange={(e) => setStudentTextAnswer(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Simulated Drag & Drop Zone */}
                          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-6 text-center bg-slate-50/50 space-y-2 hover:bg-slate-50 transition-colors">
                            <div className="w-10 h-10 bg-white shadow-xs rounded-xl flex items-center justify-center text-teal-600 mx-auto">
                              <UploadCloud size={20} />
                            </div>
                            <h5 className="font-bold text-slate-700 text-xs">Simulasi Tarik & Lepas Berkas Tugas</h5>
                            <p className="text-[10px] text-slate-400 font-semibold">Mendukung PDF, JPG, PNG, atau DOCX hingga 10MB</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Tautan Berkas (URL Drive/Cloud)</label>
                              <input
                                type="text"
                                required
                                placeholder="Contoh: https://drive.google.com/file/d/..."
                                value={studentFileLink}
                                onChange={(e) => setStudentFileLink(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400">Nama Dokumen Lampiran</label>
                              <input
                                type="text"
                                placeholder="Contoh: Tugas_Fiqih_Andi.pdf"
                                value={studentFileName}
                                onChange={(e) => setStudentFileName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold uppercase tracking-wider text-xs rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Kumpulkan Asesmen
                        </button>
                      </div>
                    </form>
                  );
                })()}

                {/* Kolom Diskusi / Tanya Jawab Siswa */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
                    <MessageSquare size={16} />
                    <span>Tanya Jawab & Diskusi Pembelajaran</span>
                  </h4>

                  <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-2 border-b border-slate-50 pb-4">
                    {selectedComments.length > 0 ? (
                      selectedComments.map((com) => (
                        <div key={com.id} className={`p-4 rounded-2xl max-w-[80%] ${
                          com.authorRole === 'Guru' 
                            ? 'bg-teal-50/50 border border-teal-100/30 mr-auto text-left' 
                            : 'bg-slate-50 ml-auto text-right'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400 mb-1 gap-4">
                            <span className={com.authorRole === 'Guru' ? 'text-teal-700' : 'text-slate-700'}>{com.authorName}</span>
                            <span>{new Date(com.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                          <p className="text-xs text-slate-700 font-semibold leading-relaxed">{com.text}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-xs text-slate-400 italic py-6">Belum ada diskusi. Kirimkan pertanyaan jika kesulitan memahami tugas ini.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ajukan pertanyaan mengenai tugas ini ke Ustadz..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:border-teal-500 text-slate-800"
                    />
                    <button
                      type="submit"
                      className="px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold text-xs transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Kirim</span>
                    </button>
                  </form>
                </div>

              </div>
            )
          )}
        </>
      )}

      {/* ======================= TAB 2: LAPORAN KETUNTASAN ASESMEN ======================= */}
      {activeTab === 'laporan' && (
        activeRole === 'admin' ? (
          /* ================= GURU REPORT CARD VIEW (Class-wide report) ================= */
          <div className="space-y-6">
            {/* Header statistics and filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-3xl border border-slate-100 gap-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Rekapitulasi Ketuntasan Klasikal Kurikulum Merdeka</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Analisis ketercapaian kriteria minimum per kelas berdasarkan seluruh instrumen ujian.</p>
              </div>

              {/* Class Selector */}
              <SearchableSelect
                value={filterKelas === 'Semua' ? 'Kelas 7-A' : filterKelas}
                onChange={(val) => setFilterKelas(val)}
                options={classes.map(c => ({ value: c.nama, label: c.nama }))}
                placeholder="Pilih Kelas"
                showSearch={true}
                isClearable={false}
              />
            </div>

            {/* General metrics */}
            {(() => {
              const currentClassVal = filterKelas === 'Semua' ? 'Kelas 7-A' : filterKelas;
              const classAssessments = assessments.filter(a => a.kelasNama === currentClassVal);
              const classSubmissions = submissions.filter(s => {
                const item = assessments.find(a => a.id === s.asesmenId);
                return item && item.kelasNama === currentClassVal && s.status === 'Sudah Dinilai';
              });

              const totalUjian = classAssessments.length;
              const scoredSiswaCount = classSubmissions.length;
              const averageScore = scoredSiswaCount > 0 
                ? Math.round(classSubmissions.reduce((acc, curr) => acc + (curr.nilai || 0), 0) / scoredSiswaCount)
                : 0;

              const tuntasCount = classSubmissions.filter(s => s.tuntas).length;
              const ketuntasanPercentage = scoredSiswaCount > 0 
                ? Math.round((tuntasCount / scoredSiswaCount) * 100)
                : 0;

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-[#e2f4f1] p-6 rounded-[2rem] flex flex-col justify-between h-[130px]">
                      <span className="text-[10px] font-black text-emerald-800/70 uppercase tracking-wider block">Jumlah Instrumen Asesmen</span>
                      <div>
                        <span className="text-4xl font-black text-slate-900 block">{totalUjian}</span>
                        <span className="text-[10px] text-emerald-800/60 font-semibold mt-1">Dibuat di kelas {currentClassVal}</span>
                      </div>
                    </div>

                    <div className="bg-[#e0f2fe] p-6 rounded-[2rem] flex flex-col justify-between h-[130px]">
                      <span className="text-[10px] font-black text-sky-800/70 uppercase tracking-wider block">Nilai Rata-rata Kelas</span>
                      <div>
                        <span className="text-4xl font-black text-slate-900 block">{averageScore} / 100</span>
                        <span className="text-[10px] text-sky-800/60 font-semibold mt-1">Dari {scoredSiswaCount} rekap nilai terkumpul</span>
                      </div>
                    </div>

                    <div className="bg-[#fef3c7] p-6 rounded-[2rem] flex flex-col justify-between h-[130px]">
                      <span className="text-[10px] font-black text-amber-800/70 uppercase tracking-wider block">Persentase Ketuntasan Klasikal</span>
                      <div>
                        <span className="text-4xl font-black text-slate-900 block">{ketuntasanPercentage}%</span>
                        <span className="text-[10px] text-amber-800/60 font-semibold mt-1">Siswa di atas ambang KKTP</span>
                      </div>
                    </div>
                  </div>

                  {/* Student performance rekap table */}
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">Daftar Ketuntasan Siswa Kelas {currentClassVal}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-55 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                            <th className="pb-3">Siswa</th>
                            <th className="pb-3 text-center">Total Penugasan</th>
                            <th className="pb-3 text-center text-emerald-600">Lulus KKTP (Tuntas)</th>
                            <th className="pb-3 text-center text-rose-500">Tindak Lanjut Remedial</th>
                            <th className="pb-3 text-right">Rata-rata Nilai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                          {students.filter(s => s.kelas === currentClassVal).map((std) => {
                            const stdSubs = submissions.filter(s => s.siswaId === std.id && s.status === 'Sudah Dinilai');
                            const stdTuntasCount = stdSubs.filter(s => s.tuntas).length;
                            const stdRemedialCount = stdSubs.length - stdTuntasCount;
                            const stdAvg = stdSubs.length > 0 
                              ? Math.round(stdSubs.reduce((acc, curr) => acc + (curr.nilai || 0), 0) / stdSubs.length)
                              : '-';

                            return (
                              <tr key={std.id} className="hover:bg-slate-50/40 transition-all">
                                <td className="py-3.5 font-extrabold text-slate-800">
                                  {std.nama}
                                </td>
                                <td className="py-3.5 text-center font-bold text-slate-500">{stdSubs.length} / {totalUjian}</td>
                                <td className="py-3.5 text-center text-emerald-600 font-extrabold">{stdTuntasCount}</td>
                                <td className="py-3.5 text-center text-rose-500 font-extrabold">{stdRemedialCount}</td>
                                <td className="py-3.5 text-right font-black text-slate-900 text-sm">{stdAvg}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* REQUIRED SPECIFIC TARGET: "BELUM TUNTAS" REKAP BOARD FOR TEACHER */}
                  <div className="bg-white rounded-[2rem] border-2 border-rose-500/10 p-6 space-y-4">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle size={18} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">Daftar Tanggungan & Remedial Siswa (Kurang dari Target KKTP)</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Siswa yang terdeteksi Belum Tuntas (nilai di bawah KKTP / belum mengumpulkan tugas wajib).</p>
                      </div>
                    </div>

                    {/* Generate the exact list of missing/remedial tasks of students */}
                    {(() => {
                      const classSiswaList = students.filter(s => s.kelas === currentClassVal);
                      const remedialItemsList: { siswaNama: string; mapel: string; asesmenJudul: string; kktp: number; nilai: number | string }[] = [];

                      classSiswaList.forEach(std => {
                        classAssessments.forEach(ase => {
                          const sub = submissions.find(s => s.asesmenId === ase.id && s.siswaId === std.id);
                          if (!sub) {
                            remedialItemsList.push({
                              siswaNama: std.nama,
                              mapel: ase.mapelNama,
                              asesmenJudul: ase.judul,
                              kktp: ase.kktp,
                              nilai: 'Belum Mengumpulkan'
                            });
                          } else if (sub.status === 'Sudah Dinilai' && !sub.tuntas) {
                            remedialItemsList.push({
                              siswaNama: std.nama,
                              mapel: ase.mapelNama,
                              asesmenJudul: ase.judul,
                              kktp: ase.kktp,
                              nilai: sub.nilai || 0
                            });
                          }
                        });
                      });

                      if (remedialItemsList.length > 0) {
                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {remedialItemsList.map((item, idx) => (
                              <div key={idx} className="bg-rose-50/40 border border-rose-100 p-4 rounded-2xl flex items-start space-x-3">
                                <div className="text-[10px] bg-rose-600 text-white font-extrabold px-2 py-0.5 rounded-lg mt-0.5">
                                  {typeof item.nilai === 'number' ? `Skor ${item.nilai}` : 'Wajib'}
                                </div>
                                <div className="text-xs">
                                  <h5 className="font-extrabold text-slate-800">{item.siswaNama}</h5>
                                  <p className="text-[10px] text-slate-500 font-semibold mt-1">Mapel: <span className="text-rose-600">{item.mapel}</span></p>
                                  <p className="text-[10px] text-slate-600 font-medium mt-0.5">Asesmen: "{item.asesmenJudul}"</p>
                                  <p className="text-[9px] text-slate-400 mt-1 font-semibold">Batas KKM Target KKTP: {item.kktp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-center text-xs text-slate-400 py-6 italic">Alhamdulillah, seluruh siswa kelas ini telah menuntaskan semua target asesmen!</p>
                        );
                      }
                    })()}
                  </div>
                </>
              );
            })()}

          </div>
        ) : (
          /* ================= SISWA REPORT CARD VIEW (Andi Setiawan personal reports) ================= */
          <div className="space-y-6 animate-fade-in">
            {/* Header info */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-2 py-0.5 rounded">Rapor Ketuntasan Mandiri</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">Andi Setiawan - Kelas 7-A</h3>
                <p className="text-xs text-slate-500">Pemantauan kelengkapan tugas pembelajaran yang sudah diselesaikan berdasarkan Kriteria Ketuntasan Kurikulum Merdeka.</p>
              </div>
              <div className="text-center bg-slate-50 p-4 rounded-2xl sm:min-w-[150px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ketuntasan Anda</span>
                {(() => {
                  const itemsClass = assessments.filter(a => a.kelasNama === 'Kelas 7-A');
                  const stdSubs = submissions.filter(s => s.siswaId === 'std-1' && s.status === 'Sudah Dinilai');
                  const tuntas = stdSubs.filter(s => s.tuntas).length;
                  const ratio = itemsClass.length > 0 ? Math.round((tuntas / itemsClass.length) * 100) : 0;
                  return (
                    <span className="text-3xl font-black text-teal-600 block mt-1">{ratio}%</span>
                  );
                })()}
              </div>
            </div>

            {/* TWO MODULE BOARDS FOR STUDENT KETUNTASAN: TUNTAS & BELUM TUNTAS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* BOARD 1: TUNTAS BOARD */}
              <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Papan Capaian "TUNTAS"</h4>
                    <p className="text-[9px] text-slate-400 font-semibold uppercase">Nilai di atas atau sama dengan KKTP</p>
                  </div>
                </div>

                {(() => {
                  const tuntasList = submissions.filter(s => s.siswaId === 'std-1' && s.status === 'Sudah Dinilai' && s.tuntas);
                  
                  if (tuntasList.length > 0) {
                    return (
                      <div className="space-y-3">
                        {tuntasList.map((sub) => {
                          const ase = assessments.find(a => a.id === sub.asesmenId);
                          return (
                            <div key={sub.id} className="bg-emerald-50/20 border border-emerald-100/50 p-4 rounded-2xl flex items-center justify-between">
                              <div>
                                <h5 className="font-extrabold text-slate-800 text-xs">{ase?.judul}</h5>
                                <p className="text-[10px] text-slate-500 font-semibold mt-1">Mata Pelajaran: <span className="text-emerald-700">{ase?.mapelNama}</span></p>
                                <p className="text-[9px] text-slate-400 mt-0.5">KKTP Target: {ase?.kktp} | Teknik: {ase?.teknik}</p>
                              </div>
                              <div className="text-center pl-4 border-l border-emerald-100">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Skor</span>
                                <span className="text-lg font-black text-emerald-600">{sub.nilai}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-center text-xs text-slate-400 py-6 italic">Belum ada asesmen yang selesai dinilai dengan status Tuntas.</p>
                    );
                  }
                })()}
              </div>

              {/* BOARD 2: BELUM TUNTAS BOARD (CRITICAL REQUIREMENT) */}
              <div className="bg-white rounded-[2rem] border-2 border-rose-500/10 p-6 space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-50 pb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">Papan "BELUM TUNTAS" (Remedial & Tugas Wajib)</h4>
                    <p className="text-[9px] text-rose-400 font-bold uppercase">Wajib Segera Diselesaikan!</p>
                  </div>
                </div>

                {(() => {
                  const classAssessments = assessments.filter(a => a.kelasNama === 'Kelas 7-A');
                  const uncompletedItems: { id: string; judul: string; mapel: string; kktp: number; reason: 'Belum Dikerjakan' | 'Di Bawah KKTP'; score?: number }[] = [];

                  classAssessments.forEach(ase => {
                    const sub = submissions.find(s => s.asesmenId === ase.id && s.siswaId === 'std-1');
                    if (!sub || sub.status === 'Belum Dikerjakan') {
                      uncompletedItems.push({
                        id: ase.id,
                        judul: ase.judul,
                        mapel: ase.mapelNama,
                        kktp: ase.kktp,
                        reason: 'Belum Dikerjakan'
                      });
                    } else if (sub.status === 'Sudah Dinilai' && !sub.tuntas) {
                      uncompletedItems.push({
                        id: ase.id,
                        judul: ase.judul,
                        mapel: ase.mapelNama,
                        kktp: ase.kktp,
                        reason: 'Di Bawah KKTP',
                        score: sub.nilai || 0
                      });
                    }
                  });

                  if (uncompletedItems.length > 0) {
                    return (
                      <div className="space-y-3">
                        {uncompletedItems.map((item) => (
                          <div key={item.id} className="bg-rose-50/40 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                  {item.reason === 'Belum Dikerjakan' ? 'Belum Dikumpulkan' : 'Remedial'}
                                </span>
                                <span className="text-[11px] font-black text-rose-700">{item.mapel}</span>
                              </div>
                              <h5 className="font-black text-slate-800 text-xs leading-snug">
                                {item.judul}
                              </h5>
                              <p className="text-[9px] text-slate-400 font-semibold uppercase">Target Ketuntasan Minimal (KKTP): {item.kktp}</p>
                            </div>
                            <div className="text-right border-l border-rose-100 pl-4 min-w-[70px]">
                              {item.reason === 'Di Bawah KKTP' ? (
                                <>
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Skor</span>
                                  <span className="text-lg font-black text-rose-600 block leading-none">{item.score}</span>
                                  <span className="text-[8px] text-slate-400 block mt-1 font-semibold">Tung. {item.kktp - (item.score || 0)} pt</span>
                                </>
                              ) : (
                                <span className="text-[10px] font-black text-rose-600 uppercase">Wajib</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <p className="text-center text-xs text-slate-400 py-6 italic">Alhamdulillah, semua tagihan asesmen Anda telah diselesaikan dengan Tuntas!</p>
                    );
                  }
                })()}
              </div>

            </div>
          </div>
        )
      )}
      
      {/* ================= STUDENT SUBMISSION PREVIEW MODAL ================= */}
      {previewingSubmission && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setPreviewingSubmission(null)}
          />

          {/* Modal Container */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-10 animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-teal-600 tracking-wider">TINJAU & NILAI PEKERJAAN SISWA</span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {previewingSubmission.student.nama}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Mapel: <span className="font-bold text-slate-700">{selectedAssessment?.mapelNama}</span> | Kelas: <span className="font-bold text-slate-700">{selectedAssessment?.kelasNama}</span>
                </p>
              </div>
              <button 
                onClick={() => setPreviewingSubmission(null)}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Tutup Pratinjau"
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Two column layout for PC, single column for Mobile */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Pane: Student Homework Submission View */}
              <div className="space-y-4 flex flex-col justify-between h-full min-h-[300px]">
                <div className="space-y-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-500" />
                    <span>Jawaban & Lampiran Siswa</span>
                  </h4>

                  {/* Document preview block */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex-1 flex flex-col justify-between space-y-4 relative min-h-[220px]">
                    
                    {/* Decorative lined paper style container for text answer or file details */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-[9px] font-black uppercase text-slate-400">Lembar Jawaban digital</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {new Date(previewingSubmission.submission.tanggalKumpul).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} WIB
                        </span>
                      </div>

                      {selectedAssessment?.jenisPengumpulan === 'Berkas' ? (
                        /* Simulated file workspace view */
                        <div className="space-y-3">
                          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center space-x-3 shadow-xs">
                            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                              pdf
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">
                                {previewingSubmission.submission.konten.includes('Tautan Lampiran:') 
                                  ? previewingSubmission.submission.konten.split('(')[1]?.replace(')', '') || 'berkas_tugas_siswa.pdf'
                                  : 'berkas_tugas_siswa.pdf'}
                              </p>
                              <p className="text-[9px] text-slate-400 font-semibold uppercase">TIPE: DOKUMEN SISWA | UKURAN: 2.4 MB</p>
                            </div>
                          </div>

                          {/* Beautiful simulated hand-written sheet preview */}
                          <div className="border border-slate-200 bg-[#fffdf5] rounded-xl p-4 shadow-2xs relative overflow-hidden min-h-[140px] flex flex-col justify-between">
                            {/* Paper margin line */}
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-100/80" />
                            
                            <div className="space-y-2 pl-6 text-[11px] font-mono leading-relaxed text-slate-700 select-none">
                              <p className="font-bold underline text-slate-800 uppercase tracking-tight">JAWABAN PENUGASAN BERKAS:</p>
                              <p className="italic">"{previewingSubmission.submission.konten}"</p>
                              <p className="mt-2">[Lembar Jawaban Berkas telah diverifikasi sistem anti-plagiat Madrasah]</p>
                            </div>

                            {/* Click to open real link option */}
                            {previewingSubmission.submission.konten.includes('http') && (() => {
                              // Extract link
                              const match = previewingSubmission.submission.konten.match(/https?:\/\/[^\s)]+/);
                              const linkUrl = match ? match[0] : '#';
                              return (
                                <a 
                                  href={linkUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="mt-3 pl-6 text-[10px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer w-fit"
                                >
                                  <ExternalLink size={12} />
                                  <span>Buka Tautan Lampiran Asli</span>
                                </a>
                              );
                            })()}
                          </div>
                        </div>
                      ) : selectedAssessment?.jenisPengumpulan === 'CBT' ? (
                        /* CBT Exam Review Workspace */
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between shadow-xs">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
                                📊
                              </div>
                              <div>
                                <p className="text-xs font-bold text-blue-900">Hasil Kuis CBT Terintegrasi</p>
                                <p className="text-[10px] text-blue-700/80 font-semibold uppercase">STATUS: DINILAI OTOMATIS SISTEM</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider block">Nilai Auto</span>
                              <span className="text-xl font-black text-blue-700">{previewingSubmission.submission.nilai || 0}</span>
                            </div>
                          </div>

                          <div className="border border-slate-200 bg-white rounded-xl p-4 shadow-2xs space-y-3.5 max-h-[250px] overflow-y-auto">
                            <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight border-b border-slate-50 pb-1.5 flex items-center gap-1">
                              <span>📝</span>
                              <span>Rincian Lembar Jawaban CBT Siswa</span>
                            </h5>
                            
                            <div className="space-y-3 text-[11px] text-slate-700">
                              <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                                <p className="font-black text-slate-800">Soal 1: Hasil dari 3x + 5 = 17 adalah...</p>
                                <p className="font-bold text-teal-600">✓ Kunci Jawaban: x = 4</p>
                                <p className="italic text-slate-600">Jawaban Siswa: {previewingSubmission.submission.konten.includes('x = 4') ? 'x = 4 (BENAR ✓)' : 'Lainnya (SALAH ✗)'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                                <p className="font-black text-slate-800">Soal 2: Jika x = 2, maka hasil dari 2x² + 3x - 1 adalah...</p>
                                <p className="font-bold text-teal-600">✓ Kunci Jawaban: 13</p>
                                <p className="italic text-slate-600">Jawaban Siswa: {previewingSubmission.submission.konten.includes('13') ? '13 (BENAR ✓)' : 'Lainnya (SALAH ✗)'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                                <p className="font-black text-slate-800">Soal 3: Koefisien dari variabel y pada 5x - 3y + 8 adalah...</p>
                                <p className="font-bold text-teal-600">✓ Kunci Jawaban: -3</p>
                                <p className="italic text-slate-600">Jawaban Siswa: {previewingSubmission.submission.konten.includes('-3') ? '-3 (BENAR ✓)' : 'Lainnya (SALAH ✗)'}</p>
                              </div>
                              <div className="p-2.5 bg-slate-50 rounded-lg space-y-1">
                                <p className="font-black text-slate-800">Soal 4: Suku-suku sejenis dari 4a + 2b - 3a + 5b adalah...</p>
                                <p className="font-bold text-teal-600">✓ Kunci Jawaban: 4a dan -3a</p>
                                <p className="italic text-slate-600">Jawaban Siswa: {previewingSubmission.submission.konten.includes('4a dan -3a') ? '4a dan -3a (BENAR ✓)' : 'Lainnya (SALAH ✗)'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Text Answer */
                        <div className="border border-slate-200 bg-[#fffdf5] rounded-xl p-4 shadow-2xs relative overflow-hidden min-h-[150px]">
                          {/* Paper margin line */}
                          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-red-100/80" />
                          <div className="space-y-2 pl-6 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                            {previewingSubmission.submission.konten}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-100 text-[10px] font-bold">
                      💡 Guru disarankan memeriksa kelengkapan rukun-rukun tugas sebelum menetapkan status KKTP di kolom sebelah kanan.
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Pane: Teacher Evaluation Form */}
              <div className="space-y-5 flex flex-col justify-between bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Lembar Penilaian Guru & Umpan Balik
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Berikan nilai angka akhir dan feedback narasi tindak lanjut.</p>
                  </div>

                  <div className="space-y-3.5">
                    {/* Score (0-100) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Nilai Akhir (0-100):</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Isi 0-100"
                          value={(gradeInputs[previewingSubmission.student.id] || { nilai: '', feedback: '' }).nilai || (previewingSubmission.submission.nilai !== null ? String(previewingSubmission.submission.nilai) : '')}
                          onChange={(e) => handleUpdateGradeInput(previewingSubmission.student.id, 'nilai', e.target.value)}
                          className="w-[100px] px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-center text-sm font-black text-slate-800 focus:outline-none focus:border-teal-500 shadow-2xs"
                        />
                        {/* Quick fill triggers */}
                        <div className="flex-1 flex gap-1 items-center">
                          {[75, 85, 95, 100].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => handleUpdateGradeInput(previewingSubmission.student.id, 'nilai', String(score))}
                              className="flex-1 py-2.5 bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-[10px] font-black rounded-xl transition-all cursor-pointer shadow-2xs"
                            >
                              {score === 75 ? `75 (KKTP)` : score}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Auto status info */}
                    {(() => {
                      const inputVal = (gradeInputs[previewingSubmission.student.id] || { nilai: '', feedback: '' }).nilai || (previewingSubmission.submission.nilai !== null ? String(previewingSubmission.submission.nilai) : '');
                      const scoreNum = Number(inputVal);
                      const isEntered = inputVal.trim() !== '' && !isNaN(scoreNum);
                      const isTuntas = isEntered ? scoreNum >= (selectedAssessment?.kktp || 75) : previewingSubmission.submission.tuntas;

                      return isEntered ? (
                        <div className={`p-3 rounded-xl flex items-center space-x-2 border text-[10px] font-bold ${
                          isTuntas 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                            : 'bg-rose-50 border-rose-100 text-rose-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${isTuntas ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span>Status: {isTuntas ? `TUNTAS (Pengayaan otomatis diprogram)` : `BELUM TUNTAS (Wajib Remedial)`}</span>
                        </div>
                      ) : null;
                    })()}

                    {/* Feedback Ulasan */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Umpan Balik Naratif (Feedback):</label>
                      <textarea
                        rows={4}
                        placeholder="Contoh: Jawaban sangat baik dan detail. Tingkatkan terus hafalan serta pemahaman fiqih wudhu Anda..."
                        value={(gradeInputs[previewingSubmission.student.id] || { nilai: '', feedback: '' }).feedback || previewingSubmission.submission.feedback || ''}
                        onChange={(e) => handleUpdateGradeInput(previewingSubmission.student.id, 'feedback', e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Confirm grading save action button */}
                <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewingSubmission(null)}
                    className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveGrade(
                        previewingSubmission.student.id,
                        previewingSubmission.student.nama,
                        selectedAssessment?.kktp || 75
                      );
                      setPreviewingSubmission(null);
                    }}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Simpan & Selesai</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
