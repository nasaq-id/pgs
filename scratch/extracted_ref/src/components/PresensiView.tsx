import { safeJSONParse } from "../lib/json";
import { safeStorage } from "../lib/safeStorage";
import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  Check, X, Camera, Shield, FileText, Upload, Printer, Download, Clock, UserCheck, 
  Settings, Award, RefreshCw, Layers, Calendar, ChevronRight, ChevronDown, AlertCircle, Eye, EyeOff, BookOpen, AlertTriangle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import jsQR from 'jsqr';
import { Student, Teacher, Kelas, PresensiRecord, PresensiSetting, IzinRecord, Institution } from '../types';
import { SearchableSelect } from './SearchableSelect';

interface PresensiViewProps {
  classes: Kelas[];
  teachers: Teacher[];
  students: Student[];
  institution: Institution;
  addToast: (message: string, title?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  addNotification: (title: string, message: string) => void;
}

// 3 Custom ID Card Design Templates
interface IdCardTemplate {
  id: string;
  name: string;
  primaryBg: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  badgeBg: string;
  cardStyle: React.CSSProperties;
}

const TEMPLATES: IdCardTemplate[] = [
  {
    id: 'emerald',
    name: 'Classic Madrasah (Emerald Clean)',
    primaryBg: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
    textPrimary: '#ffffff',
    textSecondary: '#a7f3d0',
    accentColor: '#fbbf24',
    badgeBg: '#064e3b',
    cardStyle: {
      fontFamily: '"Inter", sans-serif',
      boxShadow: '0 10px 25px rgba(4, 120, 87, 0.15)',
      borderRadius: '16px',
    }
  },
  {
    id: 'teal',
    name: 'Modern Minimalist (Teal Tech)',
    primaryBg: '#ffffff',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    accentColor: '#0d9488',
    badgeBg: '#f0fdfa',
    cardStyle: {
      fontFamily: '"JetBrains Mono", monospace',
      boxShadow: '0 10px 25px rgba(15, 23, 42, 0.08)',
      borderRadius: '12px',
      border: '1px solid #e2e8f0'
    }
  },
  {
    id: 'indigo',
    name: 'Elegant Indigo (Premium Academy)',
    primaryBg: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
    textPrimary: '#ffffff',
    textSecondary: '#c7d2fe',
    accentColor: '#f59e0b',
    badgeBg: '#1e1b4b',
    cardStyle: {
      fontFamily: '"Inter", sans-serif',
      boxShadow: '0 10px 25px rgba(49, 46, 129, 0.18)',
      borderRadius: '20px',
    }
  }
];

// Helper to draw clean barcode lines inside HTML
export const BarcodeGenerator: React.FC<{ value: string; width?: number; height?: number; darkColor?: string }> = ({ 
  value, 
  width = 180, 
  height = 50,
  darkColor = '#0f172a'
}) => {
  const bars: boolean[] = [];
  const patternStart = [true, false, true, true, false, true, false, true, true, false, true];
  bars.push(...patternStart);
  
  for (let i = 0; i < value.length; i++) {
    const charCode = value.charCodeAt(i);
    for (let bit = 0; bit < 8; bit++) {
      if ((charCode & (1 << bit)) !== 0) {
        bars.push(true, true, false);
      } else {
        bars.push(true, false);
      }
    }
  }
  bars.push(true, true, false, true, false, true, true, false, true);

  return (
    <div className="flex flex-col items-center">
      <div className="flex" style={{ height: `${height}px`, width: `${width}px` }}>
        {bars.map((isBar, idx) => (
          <div 
            key={idx} 
            className="h-full flex-1" 
            style={{ backgroundColor: isBar ? darkColor : 'transparent' }} 
          />
        ))}
      </div>
      <span className="font-mono text-[9px] text-slate-400 tracking-[0.2em] mt-1.5 uppercase leading-none">{value}</span>
    </div>
  );
};

// Helper to draw clean QR code inside HTML
export const QRCodeGenerator: React.FC<{ value: string; size?: number; darkColor?: string; lightColor?: string }> = ({
  value,
  size = 100,
  darkColor = '#0f172a',
  lightColor = '#ffffff'
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor
      }
    }, (err, url) => {
      if (!err && url) {
        setQrUrl(url);
      }
    });
  }, [value, size, darkColor, lightColor]);

  if (!qrUrl) {
    return <div className="animate-pulse bg-slate-100 rounded" style={{ width: size, height: size }} />;
  }

  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      style={{ width: size, height: size }} 
      className="object-contain"
    />
  );
};

export const PresensiView: React.FC<PresensiViewProps> = ({
  classes,
  teachers,
  students,
  institution,
  addToast,
  addNotification
}) => {
  // ----------------------------------------------------
  // Active Role State (Specifically tailored for simulator)
  // ----------------------------------------------------
  const [activeRole, setActiveRole] = useState<'admin' | 'walikelas' | 'guru' | 'siswa' | 'kepsek'>(() => {
    const savedRole = localStorage.getItem('mts_user_role');
    if (savedRole === 'siswa') return 'siswa';
    if (savedRole === 'guru') return 'guru';
    if (savedRole === 'kepsek') return 'kepsek';
    return 'admin';
  });
  
  // Simulated Logged In Entities
  const [currentSiswa] = useState<Student>(students[0] || {} as Student);
  const [currentGuru] = useState<Teacher>(teachers[0] || {} as Teacher); // Drs. H. Ahmad Fauzi
  const [currentWaliKelas] = useState<Teacher>(teachers[1] || {} as Teacher); // Hj. Siti Aminah, S.Pd. (Wali Kelas 7-A)
  const [perwalianKelasName] = useState<string>('Kelas 7-A');

  // Tab selections
  const [activeSubMenu, setActiveSubMenu] = useState<'harian' | 'izin' | 'idcard'>('harian');
  const [activeHarianTab, setActiveHarianTab] = useState<'pengaturan' | 'manual' | 'scan' | 'comingsoon'>('manual');
  
  // Simulation Clock state (so user can test delay logic without waiting till tomorrow!)
  const [simDate, setSimDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [simTime, setSimTime] = useState<string>('07:10');

  // ----------------------------------------------------
  // Persistent States
  // ----------------------------------------------------
  const [settings, setSettings] = useState<PresensiSetting>(() => {
    const saved = localStorage.getItem('mts_presensi_settings');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) { }
    }
    return { jamMasuk: '07:00', toleransi: 15, jamPulang: '14:00' };
  });

  const [records, setRecords] = useState<PresensiRecord[]>(() => {
    const saved = localStorage.getItem('mts_presensi');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) { }
    }
    return [];
  });

  const [izins, setIzins] = useState<IzinRecord[]>(() => {
    const saved = localStorage.getItem('mts_izin_records');
    if (saved && saved !== "undefined" && saved !== "null") {
      try { return safeJSONParse(saved); } catch (e) { }
    }
    return [
      {
        id: 'iz-1',
        userId: 'std-2',
        userType: 'siswa',
        nama: 'Rizky Pratama',
        kelas: 'Kelas 7-A',
        jenisIzin: 'Sakit_Tidak_Masuk',
        alasan: 'Demam tinggi mendadak sejak tadi malam, dianjurkan istirahat oleh dokter.',
        jumlahHari: 3,
        suratDokterUrl: 'surat_dokter_rizky.pdf',
        statusApproval: 'Pending',
        tanggalPengajuan: '2026-07-05'
      },
      {
        id: 'iz-2',
        userId: 'tch-3',
        userType: 'guru',
        nama: 'Rahmat Hidayat, S.S.',
        kelas: '-',
        jenisIzin: 'Terlambat',
        alasan: 'Ada musibah ban motor bocor di jalan tol Soreang.',
        statusApproval: 'Pending',
        tanggalPengajuan: '2026-07-05'
      }
    ];
  });

  // Camera Scanning State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraInitiated, setCameraInitiated] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const scanningRef = useRef<boolean>(false);

  // Save changes to localstorage
  useEffect(() => {
    safeStorage.setItem('mts_presensi_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeStorage.setItem('mts_presensi', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    safeStorage.setItem('mts_izin_records', JSON.stringify(izins));
  }, [izins]);

  // Dynamic Selectors for active preview student and teacher
  const [selectedSiswa, setSelectedSiswa] = useState<Student>(students[0] || {} as Student);
  const [selectedGuru, setSelectedGuru] = useState<Teacher>(teachers[0] || {} as Teacher);

  // Custom Template State for Super Admin image uploads & dynamic positioning
  const [useCustomTemplate, setUseCustomTemplate] = useState<boolean>(() => {
    return safeStorage.getItem('mts_use_custom_template') === 'true';
  });
  const [customTemplateBg, setCustomTemplateBg] = useState<string>(() => {
    return safeStorage.getItem('mts_custom_template_bg') || '';
  });
  const [customCoords, setCustomCoords] = useState<{
    photoX: number; photoY: number; photoW: number; photoH: number;
    nameX: number; nameY: number; nameSize: number; nameColor: string;
    infoX: number; infoY: number; infoSize: number; infoColor: string;
    qrX: number; qrY: number; qrSize: number;
  }>(() => {
    const saved = safeStorage.getItem('mts_custom_template_coords');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      try {
        return safeJSONParse(saved);
      } catch (e) {
        console.error("Failed to parse mts_custom_template_coords:", e);
      }
    }
    return {
      photoX: 8, photoY: 14, photoW: 16, photoH: 20,
      nameX: 28, nameY: 18, nameSize: 9, nameColor: '#1e293b',
      infoX: 28, infoY: 26, infoSize: 7, infoColor: '#475569',
      qrX: 62, qrY: 30, qrSize: 16,
    };
  });

  useEffect(() => {
    try {
      safeStorage.setItem('mts_use_custom_template', String(useCustomTemplate));
      safeStorage.setItem('mts_custom_template_bg', customTemplateBg);
      safeStorage.setItem('mts_custom_template_coords', JSON.stringify(customCoords));
    } catch (e) {
      console.warn("Failed to write custom template settings to localStorage:", e);
    }
  }, [useCustomTemplate, customTemplateBg, customCoords]);

  // Sync category with simulation role to prevent blank teacher screens for teachers
  useEffect(() => {
    if (activeRole === 'siswa') {
      setIdCardCategory('siswa');
    } else if (activeRole === 'guru' || activeRole === 'walikelas' || activeRole === 'kepsek') {
      setIdCardCategory('guru');
    }
  }, [activeRole]);

  // ----------------------------------------------------
  // Form and Filter states
  // ----------------------------------------------------
  // Manual Tab
  const [manualUserType, setManualUserType] = useState<'siswa' | 'guru'>('siswa');
  const [manualKelasFilter, setManualKelasFilter] = useState<string>('Kelas 7-A');
  const [manualSearchQuery, setManualSearchQuery] = useState<string>('');

  // Izin Tab
  const [izinJenis, setIzinJenis] = useState<'Terlambat' | 'Pulang Awal' | 'Sakit_Tidak_Masuk'>('Sakit_Tidak_Masuk');
  const [izinAlasan, setIzinAlasan] = useState<string>('');
  const [izinJamPulang, setIzinJamPulang] = useState<string>('11:00');
  const [izinSakitHari, setIzinSakitHari] = useState<number>(1);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [dragOver, setDragOver] = useState<boolean>(false);

  // ID Card Generator Tab
  const [selectedTemplate, setSelectedTemplate] = useState<string>('emerald');
  const [idCardCategory, setIdCardCategory] = useState<'siswa' | 'guru'>('siswa');
  const [idCardKelas, setIdCardKelas] = useState<string>('Kelas 7-A');
  const [onlyBarcodeFallback, setOnlyBarcodeFallback] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false); // Flip virtual ID card
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Simulated scanner scan log
  const [scanLog, setScanLog] = useState<{ name: string; time: string; status: string; type: string }[]>([]);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [scannedUserId, setScannedUserId] = useState<string>('');

  // Helper to parse hex colors to RGB values for jsPDF compatibility
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // ----------------------------------------------------
  // Schedule Lookup for Guru Lateness
  // ----------------------------------------------------
  const getTeacherScheduleTimes = (teacherId: string, dayOfWeekName: string): { firstStart: string | null; lastEnd: string | null } => {
    try {
      const savedSchedules = safeStorage.getItem('mts_schedules');
      if (savedSchedules && savedSchedules !== 'undefined' && savedSchedules !== 'null') {
        const scheds = safeJSONParse(savedSchedules);
        // Filter by day and teacher ID
        const teacherScheds = scheds.filter((s: any) => 
          s.guru === teacherId || s.guruId === teacherId
        );
        if (teacherScheds.length > 0) {
          // Find earliest start time and latest end time
          const times = teacherScheds.map((s: any) => ({
            start: s.jamMulai || '07:30',
            end: s.jamSelesai || '12:00'
          }));
          times.sort((a: any, b: any) => a.start.localeCompare(b.start));
          return {
            firstStart: times[0].start,
            lastEnd: times[times.length - 1].end
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { firstStart: null, lastEnd: null };
  };

  // Convert HH:MM to total minutes
  const getMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // ----------------------------------------------------
  // Handler Methods
  // ----------------------------------------------------
  
  // Set all current filtered users to present
  const handleMarkAllPresent = () => {
    const targetUsers = manualUserType === 'siswa' 
      ? students.filter(s => s.kelas === manualKelasFilter && s.nama.toLowerCase().includes(manualSearchQuery.toLowerCase()))
      : teachers.filter(t => t.nama.toLowerCase().includes(manualSearchQuery.toLowerCase()));

    const nextRecords = [...records];
    targetUsers.forEach(user => {
      // Check if override is present, manual override wins
      const existingIdx = nextRecords.findIndex(r => r.userId === user.id && r.tanggal === simDate);
      
      const newRecord: PresensiRecord = {
        id: existingIdx >= 0 ? nextRecords[existingIdx].id : 'pr-' + Date.now() + Math.random().toString(36).substr(2, 4),
        userId: user.id,
        userType: manualUserType,
        nama: user.nama,
        kelas: manualUserType === 'siswa' ? (user as Student).kelas : '-',
        tanggal: simDate,
        status: 'H',
        jamMasuk: simTime,
        jamPulang: null,
        isOverride: true
      };

      if (existingIdx >= 0) {
        nextRecords[existingIdx] = newRecord;
      } else {
        nextRecords.push(newRecord);
      }
    });

    setRecords(nextRecords);
    addToast(`Berhasil menandakan ${targetUsers.length} orang sebagai Hadir pada tanggal ${simDate}`, 'Absensi Manual', 'success');
  };

  // Set single attendance status
  const handleSetStatus = (userId: string, status: 'H' | 'I' | 'S' | 'A' | 'T') => {
    const user = manualUserType === 'siswa' 
      ? students.find(s => s.id === userId) 
      : teachers.find(t => t.id === userId);

    if (!user) return;

    const nextRecords = [...records];
    const existingIdx = nextRecords.findIndex(r => r.userId === userId && r.tanggal === simDate);

    // Auto-fill time if H or T
    let jam = null;
    if (status === 'H' || status === 'T') {
      jam = simTime;
    }

    const newRecord: PresensiRecord = {
      id: existingIdx >= 0 ? nextRecords[existingIdx].id : 'pr-' + Date.now() + Math.random().toString(36).substr(2, 4),
      userId: userId,
      userType: manualUserType,
      nama: user.nama,
      kelas: manualUserType === 'siswa' ? (user as Student).kelas : '-',
      tanggal: simDate,
      status: status,
      jamMasuk: jam,
      jamPulang: null,
      isOverride: true // Manual override
    };

    if (existingIdx >= 0) {
      nextRecords[existingIdx] = newRecord;
    } else {
      nextRecords.push(newRecord);
    }

    setRecords(nextRecords);
    addToast(`Absensi ${user.nama} diatur ke: ${status === 'H' ? 'Hadir' : status === 'I' ? 'Izin' : status === 'S' ? 'Sakit' : status === 'A' ? 'Alpa' : 'Terlambat'}`, 'Absensi Manual', 'info');
  };

  // Modify individual arrival time
  const handleUpdateJamMasuk = (userId: string, newTime: string) => {
    const nextRecords = [...records];
    const existingIdx = nextRecords.findIndex(r => r.userId === userId && r.tanggal === simDate);
    if (existingIdx >= 0) {
      nextRecords[existingIdx].jamMasuk = newTime;
      // Re-evaluate late status if not overridden explicitly
      const record = nextRecords[existingIdx];
      if (record.status === 'H' || record.status === 'T') {
        let jamLimit = settings.jamMasuk;
        let tol = settings.toleransi;
        
        if (record.userType === 'guru') {
          const sched = getTeacherScheduleTimes(record.userId, 'Senin'); // Simulated day lookup
          if (sched.firstStart) {
            jamLimit = sched.firstStart;
            tol = 0; // No tolerance for teacher
          }
        }

        const limitMinutes = getMinutes(jamLimit) + tol;
        const actualMinutes = getMinutes(newTime);
        record.status = actualMinutes > limitMinutes ? 'T' : 'H';
      }
      setRecords(nextRecords);
    }
  };

  // ----------------------------------------------------
  // Barcode Scanner simulation
  // ----------------------------------------------------
  const triggerScanSimulated = (userIdToScan: string) => {
    if (!userIdToScan) return;
    
    const student = students.find(s => s.id === userIdToScan || s.username === userIdToScan);
    const teacher = teachers.find(t => t.id === userIdToScan || t.username === userIdToScan || t.nik === userIdToScan);
    
    const user = student || teacher;
    if (!user) {
      addToast('Data pengguna QR Code tidak dikenali!', 'Gagal Scan', 'error');
      return;
    }

    const uType = student ? 'siswa' : 'guru';
    const userKelas = student ? student.kelas : '-';

    // Jam Check logic
    let jamLimit = settings.jamMasuk;
    let tol = settings.toleransi;
    let checkStatus: 'H' | 'T' = 'H';
    let alertMsg = '';

    if (uType === 'guru') {
      const sched = getTeacherScheduleTimes(user.id, 'Senin');
      if (sched.firstStart) {
        jamLimit = sched.firstStart;
        tol = 0; // Teachers have no late tolerance
        alertMsg = ` (Batas Jam Mengajar Pertama: ${sched.firstStart})`;
      } else {
        alertMsg = ` (Bantuan: Jadwal mengajar kosong, memakai jam masuk global: ${settings.jamMasuk})`;
      }
    }

    const limitMinutes = getMinutes(jamLimit) + tol;
    const actualMinutes = getMinutes(simTime);

    if (actualMinutes > limitMinutes) {
      checkStatus = 'T'; // Terlambat
    }

    // Checking if there is a manual override already
    const existingRecord = records.find(r => r.userId === user.id && r.tanggal === simDate);
    if (existingRecord && existingRecord.isOverride) {
      addToast(`Absensi ${user.nama} di-override oleh guru/admin secara manual. Scan QR Code diabaikan.`, 'Sistem Absensi', 'warning');
      return;
    }

    // Absen Pulang checks
    let isPulang = false;
    let nextRecords = [...records];
    const existingIdx = nextRecords.findIndex(r => r.userId === user.id && r.tanggal === simDate);

    // If teacher tries to checkout (pulang)
    const activeMinutes = getMinutes(simTime);
    const pulangMinutes = getMinutes(settings.jamPulang);

    if (existingIdx >= 0 && nextRecords[existingIdx].status !== 'A' && nextRecords[existingIdx].status !== 'I' && nextRecords[existingIdx].status !== 'S') {
      // Already checked in, checking for checkout
      if (uType === 'guru') {
        const sched = getTeacherScheduleTimes(user.id, 'Senin');
        if (sched.lastEnd) {
          const lastEndMin = getMinutes(sched.lastEnd);
          if (activeMinutes < lastEndMin) {
            addToast(`Gagal Pulang: Absensi pulang terkunci karena jam mengajar terakhir ${user.nama} belum selesai (${sched.lastEnd})`, 'Sistem Absensi', 'error');
            return;
          }
        }
      } else {
        if (activeMinutes < pulangMinutes) {
          addToast(`Gagal Pulang: Jam pulang belum dimulai (Siswa harus sesudah ${settings.jamPulang})`, 'Sistem Absensi', 'error');
          return;
        }
      }

      // Valid checkout
      nextRecords[existingIdx].jamPulang = simTime;
      isPulang = true;
    } else {
      // Check-in
      const newRec: PresensiRecord = {
        id: 'pr-' + Date.now(),
        userId: user.id,
        userType: uType,
        nama: user.nama,
        kelas: userKelas,
        tanggal: simDate,
        status: checkStatus,
        jamMasuk: simTime,
        jamPulang: null,
        isOverride: false
      };
      
      if (existingIdx >= 0) {
        nextRecords[existingIdx] = newRec;
      } else {
        nextRecords.push(newRec);
      }
    }

    setRecords(nextRecords);
    
    const logItem = {
      name: user.nama,
      time: simTime,
      status: isPulang ? 'Pulang' : (checkStatus === 'T' ? 'Terlambat' : 'Hadir Tepat Waktu'),
      type: uType
    };
    
    setScanLog(prev => [logItem, ...prev]);
    addToast(`${isPulang ? 'Absen Pulang' : 'Absen Masuk'} berhasil tercatat untuk ${user.nama}${alertMsg}`, 'Scan Berhasil', 'success');
  };

  // ----------------------------------------------------
  // Submit Permit Handler (Izin Mandiri)
  // ----------------------------------------------------
  const handleIzinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!izinAlasan.trim()) {
      addToast('Alasan izin wajib diisi!', 'Gagal Kirim', 'error');
      return;
    }

    const currentRoleType = activeRole === 'siswa' ? 'siswa' : 'guru';
    const activeUserId = activeRole === 'siswa' ? currentSiswa.id : currentGuru.id;
    const activeUserNama = activeRole === 'siswa' ? currentSiswa.nama : currentGuru.nama;
    const activeUserKelas = activeRole === 'siswa' ? currentSiswa.kelas : '-';

    const newIzin: IzinRecord = {
      id: 'iz-' + Date.now(),
      userId: activeUserId,
      userType: currentRoleType,
      nama: activeUserNama,
      kelas: activeUserKelas,
      jenisIzin: izinJenis,
      alasan: izinAlasan,
      jamPulangAwal: izinJenis === 'Pulang Awal' ? izinJamPulang : undefined,
      jumlahHari: izinJenis === 'Sakit_Tidak_Masuk' ? izinSakitHari : undefined,
      suratDokterUrl: izinJenis === 'Sakit_Tidak_Masuk' && uploadedFileName ? uploadedFileName : undefined,
      statusApproval: 'Pending',
      tanggalPengajuan: simDate
    };

    setIzins([newIzin, ...izins]);
    setIzinAlasan('');
    setUploadedFileName('');
    addToast('Pengajuan izin Anda berhasil dikirim ke system untuk diverifikasi.', 'Izin Terkirim', 'success');
    addNotification('Pengajuan Izin Baru', `${activeUserNama} mengajukan izin "${izinJenis === 'Sakit_Tidak_Masuk' ? 'Sakit' : izinJenis}" untuk tanggal ${simDate}.`);
  };

  // ----------------------------------------------------
  // Approve Permit Handler
  // ----------------------------------------------------
  const handleApproveIzin = (izinId: string, approve: boolean) => {
    const nextIzins = [...izins];
    const idx = nextIzins.findIndex(i => i.id === izinId);
    if (idx < 0) return;

    const izin = nextIzins[idx];
    const status = approve ? 'Disetujui' : 'Ditolak';
    let approvedByStr = 'Admin';

    if (activeRole === 'walikelas') approvedByStr = `Wali Kelas (${currentWaliKelas.nama})`;
    else if (activeRole === 'kepsek') approvedByStr = `Kepala Sekolah (${currentGuru.nama})`;

    izin.statusApproval = status as 'Disetujui' | 'Ditolak';
    izin.approvedBy = approvedByStr;

    setIzins(nextIzins);

    // If approved, automatically update the main attendance record
    if (approve) {
      const nextRecords = [...records];
      
      // Determine target status code: 'I' for Izin, 'S' for Sakit
      const targetStatus: 'I' | 'S' = izin.jenisIzin === 'Sakit_Tidak_Masuk' ? 'S' : 'I';
      
      // We might need to write multiple days if Sakit is multi-day
      const days = izin.jumlahHari || 1;
      let dObj = new Date(izin.tanggalPengajuan);

      for (let i = 0; i < days; i++) {
        const dStr = dObj.toISOString().split('T')[0];
        const existingRecIdx = nextRecords.findIndex(r => r.userId === izin.userId && r.tanggal === dStr);
        
        const newRecord: PresensiRecord = {
          id: existingRecIdx >= 0 ? nextRecords[existingRecIdx].id : 'pr-' + Date.now() + Math.random().toString(36).substr(2, 4),
          userId: izin.userId,
          userType: izin.userType,
          nama: izin.nama,
          kelas: izin.kelas,
          tanggal: dStr,
          status: targetStatus,
          jamMasuk: null,
          jamPulang: null,
          isOverride: false
        };

        if (existingRecIdx >= 0) {
          nextRecords[existingRecIdx] = newRecord;
        } else {
          nextRecords.push(newRecord);
        }

        // Add 1 day
        dObj.setDate(dObj.getDate() + 1);
      }

      setRecords(nextRecords);
      addToast(`Izin ${izin.nama} disetujui. Database kehadiran otomatis disinkronkan.`, 'Approval Sukses', 'success');
    } else {
      addToast(`Izin ${izin.nama} telah ditolak.`, 'Permit Refused', 'warning');
    }

    addNotification('Update Pengajuan Izin', `Pengajuan izin ${izin.nama} telah ${status.toLowerCase()} oleh ${approvedByStr}.`);
  };

  // Drag and drop helper
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => {
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFileName(e.dataTransfer.files[0].name);
      addToast(`Berkas "${e.dataTransfer.files[0].name}" berhasil dipasang`, 'File Upload', 'success');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      addToast(`Berkas "${e.target.files[0].name}" berhasil dipasang`, 'File Upload', 'success');
    }
  };

  // ----------------------------------------------------
  // ID Card PDF Generator (Supports Lazy Loading Batch Printing)
  // ----------------------------------------------------
  const handleGeneratePdfBatch = async () => {
    const listToPrint = idCardCategory === 'siswa'
      ? students.filter(s => s.kelas === idCardKelas)
      : teachers;

    if (listToPrint.length === 0) {
      addToast('Tidak ada data pengguna untuk dicetak!', 'Gagal Cetak', 'error');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress(0);

    // 1. Pre-generate all QR codes asynchronously to prevent UI blocks and layout errors
    const qrDataUrls: Record<string, string> = {};
    for (let j = 0; j < listToPrint.length; j++) {
      const item = listToPrint[j];
      const qrText = idCardCategory === 'siswa' ? item.username : (item as Teacher).nik;
      try {
        qrDataUrls[item.id] = await QRCode.toDataURL(qrText, { margin: 1 });
      } catch (e) {
        console.error("Failed to generate QR for", item.nama, e);
      }
    }

    // Simulated chunk processing (lazy rendering) to prevent UI block
    let currentIndex = 0;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const totalCount = listToPrint.length;
    const cardsPerPage = 8;
    
    // Page dimensions
    const pageWidth = 210;
    const pageHeight = 297;
    const cardW = 85;
    const cardH = 54;
    const startX = 15;
    const startY = 15;
    const gapX = 10;
    const gapY = 10;

    const processChunk = () => {
      const itemsThisPage = Math.min(cardsPerPage, totalCount - currentIndex);
      
      // If index > 0 and we are printing on a new page, add page
      if (currentIndex > 0 && itemsThisPage > 0) {
        doc.addPage();
      }

      for (let i = 0; i < itemsThisPage; i++) {
        const item = listToPrint[currentIndex + i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        
        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        // 1. Draw card boundaries with dotted cut lines
        doc.setDrawColor(180, 180, 180);
        doc.setLineDashPattern([2, 1], 0);
        doc.rect(x - 1, y - 1, cardW + 2, cardH + 2, 'S'); // Cut mark border
        doc.setLineDashPattern([], 0); // Reset line dash

        if (onlyBarcodeFallback) {
          // --- ONLY QR CODE FALLBACK MODE ---
          doc.setDrawColor(241, 245, 249);
          doc.setFillColor(255, 255, 255);
          doc.rect(x, y, cardW, cardH, 'FD');
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(item.nama.toUpperCase(), x + cardW/2, y + 10, { align: 'center' });
          
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(100, 116, 139);
          doc.text(idCardCategory === 'siswa' ? `NIS: ${(item).nis}` : `NIP: ${(item).nipNuptk}`, x + cardW/2, y + 14, { align: 'center' });

          // Draw QR Code larger
          const qrSize = 30;
          const qrUrl = qrDataUrls[item.id];
          if (qrUrl) {
            doc.addImage(qrUrl, 'PNG', x + (cardW - qrSize)/2, y + 16, qrSize, qrSize);
          }

          const qrText = idCardCategory === 'siswa' ? item.username : (item).nik;
          doc.setFont("courier", "bold");
          doc.setFontSize(7);
          doc.setTextColor(71, 85, 105);
          doc.text(qrText, x + cardW/2, y + 50, { align: 'center' });
        } else if (useCustomTemplate && customTemplateBg) {
          // --- CUSTOM UPLOADED BACKGROUND TEMPLATE ---
          try {
            doc.addImage(customTemplateBg, 'JPEG', x, y, cardW, cardH);
          } catch (err) {
            // Draw a generic border if image fails
            doc.setDrawColor(200, 200, 200);
            doc.rect(x, y, cardW, cardH, 'S');
          }

          // A. Draw photo
          const px = x + customCoords.photoX;
          const py = y + customCoords.photoY;
          const pw = customCoords.photoW;
          const ph = customCoords.photoH;
          if (item.foto) {
            try {
              doc.addImage(item.foto, 'JPEG', px, py, pw, ph);
            } catch (e) {
              doc.setFillColor(241, 245, 249);
              doc.rect(px, py, pw, ph, 'F');
              doc.setFont("helvetica", "bold");
              doc.setFontSize(ph * 0.5);
              doc.setTextColor(150, 150, 150);
              doc.text(item.nama.charAt(0), px + pw/2, py + ph * 0.65, { align: 'center' });
            }
          } else {
            doc.setFillColor(241, 245, 249);
            doc.rect(px, py, pw, ph, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(ph * 0.5);
            doc.setTextColor(150, 150, 150);
            doc.text(item.nama.charAt(0), px + pw/2, py + ph * 0.65, { align: 'center' });
          }

          // B. Draw Name
          doc.setFont("helvetica", "bold");
          doc.setFontSize(customCoords.nameSize);
          const nameRgb = hexToRgb(customCoords.nameColor) || { r: 30, g: 41, b: 59 };
          doc.setTextColor(nameRgb.r, nameRgb.g, nameRgb.b);
          doc.text(item.nama.substring(0, 24), x + customCoords.nameX, y + customCoords.nameY);

          // C. Draw Info
          doc.setFont("helvetica", "normal");
          doc.setFontSize(customCoords.infoSize);
          const infoRgb = hexToRgb(customCoords.infoColor) || { r: 71, g: 85, b: 105 };
          doc.setTextColor(infoRgb.r, infoRgb.g, infoRgb.b);
          const line1 = idCardCategory === 'siswa' ? `NISN: ${(item as Student).nisn}` : `NIK: ${(item as Teacher).nik}`;
          const line2 = idCardCategory === 'siswa' ? `Kelas: ${(item as Student).kelas}` : `Tugas: ${(item as Teacher).tugasUtama}`;
          doc.text(line1, x + customCoords.infoX, y + customCoords.infoY);
          doc.text(line2, x + customCoords.infoX, y + customCoords.infoY + (customCoords.infoSize * 0.55));

          // D. Draw QR Code
          const qrx = x + customCoords.qrX;
          const qry = y + customCoords.qrY;
          const qrsz = customCoords.qrSize;
          const qrUrl = qrDataUrls[item.id];
          if (qrUrl) {
            doc.addImage(qrUrl, 'PNG', qrx, qry, qrsz, qrsz);
          }
        } else {
          // --- DECORATED NATIVE CARD TEMPLATES ---
          if (selectedTemplate === 'emerald') {
            // Emerald Clean Design - Landscape
            doc.setFillColor(4, 120, 87); // Green base
            doc.rect(x, y, cardW, cardH, 'F');
            
            // Header bar
            doc.setFillColor(251, 191, 36); // Amber accent top bar
            doc.rect(x, y, cardW, 2, 'F');
            
            // School Logo background circle
            doc.setFillColor(255, 255, 255);
            doc.ellipse(x + 10, y + 10, 6, 6, 'F');
            
            // School Initial
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(4, 120, 87);
            doc.text("M", x + 10, y + 13, { align: 'center' });
            
            // School Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(institution.name, x + 18, y + 9);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(167, 243, 208);
            doc.text("KARTU IDENTITAS VIRTUAL", x + 18, y + 13);
            
            // Left photo rectangle or initial
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(x + 5, y + 20, 18, 24, 1.5, 1.5, 'F');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(4, 120, 87);
            doc.text(item.nama.charAt(0), x + 14, y + 35, { align: 'center' });
            
            // User Info text right
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(item.nama.substring(0, 20), x + 26, y + 24);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(167, 243, 208);
            doc.text(idCardCategory === 'siswa' ? `NISN: ${(item).nisn}` : `NIK: ${(item).nik}`, x + 26, y + 29);
            doc.text(idCardCategory === 'siswa' ? `Kelas: ${(item).kelas}` : `Tugas: ${(item).tugasUtama}`, x + 26, y + 33);
            
            // Big QR Code on the right side!
            const qrSize = 22;
            const qrUrl = qrDataUrls[item.id];
            if (qrUrl) {
              // Draw a white background for the QR code for better contrast
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(x + 58, y + 20, qrSize + 4, qrSize + 4, 1.5, 1.5, 'F');
              doc.addImage(qrUrl, 'PNG', x + 60, y + 22, qrSize, qrSize);
            }
            const qrText = idCardCategory === 'siswa' ? item.username : (item).nik;
            doc.setFont("courier", "bold");
            doc.setFontSize(5);
            doc.setTextColor(255, 255, 255);
            doc.text(qrText, x + 58 + ((qrSize + 4) / 2), y + 48, { align: 'center' });
          } else if (selectedTemplate === 'teal') {
            // Teal Tech Clean Design
            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, cardW, cardH, 'F');
            doc.setDrawColor(13, 148, 136); // Teal border
            doc.rect(x, y, cardW, cardH, 'S');
            
            // Top Header bar
            doc.setFillColor(13, 148, 136);
            doc.rect(x, y, cardW, 10, 'F');
            
            // Logo circle
            doc.setFillColor(255, 255, 255);
            doc.ellipse(x + 10, y + 5, 3.5, 3.5, 'F');
            
            // School Text
            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(institution.name, x + 16, y + 6);
            
            // Photo border and placeholder
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.rect(x + 5, y + 16, 18, 24, 'FD');
            doc.setFont("courier", "bold");
            doc.setFontSize(14);
            doc.setTextColor(13, 148, 136);
            doc.text(item.nama.charAt(0), x + 14, y + 31, { align: 'center' });
            
            // Typography right side
            doc.setFont("courier", "bold");
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text(item.nama.substring(0, 18), x + 26, y + 21);
            
            doc.setFont("courier", "normal");
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text(idCardCategory === 'siswa' ? `NIS: ${(item).nis}` : `NIK: ${(item).nik}`, x + 26, y + 26);
            doc.text(idCardCategory === 'siswa' ? `KELAS: ${(item).kelas}` : `TUGAS: ${(item).tugasUtama}`, x + 26, y + 30);
            
            // Big QR Code Bottom Right
            const qrSize = 22;
            const qrUrl = qrDataUrls[item.id];
            if (qrUrl) {
              doc.addImage(qrUrl, 'PNG', x + 58, y + 16, qrSize, qrSize);
            }
            const qrText = idCardCategory === 'siswa' ? item.username : (item).nik;
            doc.setFont("courier", "bold");
            doc.setFontSize(5);
            doc.setTextColor(15, 23, 42);
            doc.text(qrText, x + 58 + (qrSize / 2), y + 41, { align: 'center' });
          } else {
            // Elegant Indigo Design
            doc.setFillColor(30, 27, 75); // Dark blue
            doc.rect(x, y, cardW, cardH, 'F');
            
            // Decorative diagonal stripes (vector beauty)
            doc.setFillColor(49, 46, 129);
            doc.triangle(x + cardW, y, x + cardW - 35, y, x + cardW, y + 45, 'F');
            
            // School text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(245, 158, 11); // Gold
            doc.text(institution.name, x + 8, y + 8);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5);
            doc.setTextColor(199, 210, 254);
            doc.text("KARTU IDENTITAS VIRTUAL", x + 8, y + 12);
            
            // User Photo Frame
            doc.setDrawColor(245, 158, 11); // Gold border
            doc.setFillColor(30, 27, 75);
            doc.roundedRect(x + 5, y + 18, 18, 24, 1, 1, 'FD');
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(245, 158, 11);
            doc.text(item.nama.charAt(0), x + 14, y + 33, { align: 'center' });
            
            // Name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(255, 255, 255);
            doc.text(item.nama.substring(0, 20), x + 26, y + 23);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(199, 210, 254);
            doc.text(idCardCategory === 'siswa' ? `NISN: ${(item).nisn}` : `NIK: ${(item).nik}`, x + 26, y + 28);
            doc.text(idCardCategory === 'siswa' ? `Kelas: ${(item).kelas}` : `Tugas: ${(item).tugasUtama}`, x + 26, y + 32);
            
            // QR Code Bottom Right
            const qrSize = 22;
            const qrUrl = qrDataUrls[item.id];
            if (qrUrl) {
              doc.setFillColor(255, 255, 255);
              doc.roundedRect(x + 58, y + 18, qrSize + 4, qrSize + 4, 1.5, 1.5, 'F');
              doc.addImage(qrUrl, 'PNG', x + 60, y + 20, qrSize, qrSize);
            }
            const qrText = idCardCategory === 'siswa' ? item.username : (item).nik;
            doc.setFont("courier", "bold");
            doc.setFontSize(5);
            doc.setTextColor(255, 255, 255);
            doc.text(qrText, x + 58 + ((qrSize + 4) / 2), y + 46, { align: 'center' });
          }
        }
      }

      currentIndex += itemsThisPage;
      const progress = Math.round((currentIndex / totalCount) * 100);
      setPdfProgress(progress);

      if (currentIndex < totalCount) {
        // Yield thread, process next chunk
        setTimeout(processChunk, 150);
      } else {
        // Complete
        setIsGeneratingPdf(false);
        doc.save(`ID_Cards_${idCardCategory === 'siswa' ? idCardKelas : 'Guru'}_A4.pdf`);
        addToast('Semua kartu identitas massal berhasil di-generate ke berkas PDF!', 'Selesai Cetak', 'success');
      }
    };

    // Begin chunk rendering
    setTimeout(processChunk, 50);
  };

  // Helper to draw barcode in PDF document stream
  const drawBarcodePDF = (doc: any, x: number, y: number, value: string, width: number, height: number) => {
    const bars: boolean[] = [];
    const patternStart = [true, false, true, true, false, true, false, true, true, false, true];
    bars.push(...patternStart);
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      for (let bit = 0; bit < 8; bit++) {
        if ((charCode & (1 << bit)) !== 0) {
          bars.push(true, true, false);
        } else {
          bars.push(true, false);
        }
      }
    }
    bars.push(true, true, false, true, false, true, true, false, true);

    const barWidth = width / bars.length;
    doc.setFillColor(15, 23, 42); // slate-900 color
    for (let i = 0; i < bars.length; i++) {
      if (bars[i]) {
        doc.rect(x + i * barWidth, y, barWidth, height, 'F');
      }
    }
    
    // Draw the text below the barcode stripes
    doc.setFont("courier", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(110, 110, 110);
    doc.text(value.toUpperCase(), x + width / 2, y + height + 2, { align: 'center' });
  };

  // ----------------------------------------------------
  // Camera Scanning Engine
  // ----------------------------------------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
        setCameraError('');
        scanningRef.current = true;
        scanLoop();
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Izin kamera ditolak. Silakan buka pengaturan browser Anda dan izinkan akses kamera untuk situs ini.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setCameraError('Kamera tidak dapat diakses. Pastikan izin kamera telah diberikan.');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    scanningRef.current = false;
  };

  const scanLoop = () => {
    if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (context) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          
          if (code && code.data) {
            // Check if user exists based on username (QR typically has username or unique ID)
            const matchedStudent = students.find(s => s.username === code.data || s.id === code.data);
            const matchedTeacher = teachers.find(t => t.nik === code.data || t.id === code.data);
            const scannedId = matchedStudent ? matchedStudent.id : matchedTeacher ? matchedTeacher.id : code.data;
            
            triggerScanSimulated(scannedId);
            stopCamera(); // Stop camera after successful scan to avoid multiple triggers
            
            // Auto restart camera after 3 seconds for next scan
            setTimeout(() => {
              if (activeHarianTab === 'scan') {
                startCamera();
              }
            }, 3000);
            return; // exit loop until restart
          }
        } catch (err) {
          // Ignore decoding errors
        }
      }
    }
    requestAnimationFrame(scanLoop);
  };

  useEffect(() => {
    if (activeHarianTab === 'scan' && activeSubMenu === 'harian' && cameraInitiated) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeHarianTab, activeSubMenu, cameraInitiated]);

  useEffect(() => {
    if (activeHarianTab !== 'scan' || activeSubMenu !== 'harian') {
      setCameraInitiated(false);
    }
  }, [activeHarianTab, activeSubMenu]);

  // ----------------------------------------------------
  // Calculated Statistics
  // ----------------------------------------------------
  const filteredStudents = students.filter(s => {
    const matchesKelas = activeRole === 'walikelas' ? s.kelas === perwalianKelasName : s.kelas === manualKelasFilter;
    const matchesSearch = s.nama.toLowerCase().includes(manualSearchQuery.toLowerCase());
    return matchesKelas && matchesSearch;
  });

  const filteredTeachers = teachers.filter(t => 
    t.nama.toLowerCase().includes(manualSearchQuery.toLowerCase())
  );

  // Quick statistics for current date
  const dateRecords = records.filter(r => r.tanggal === simDate);
  const presentCount = dateRecords.filter(r => r.status === 'H').length;
  const lateCount = dateRecords.filter(r => r.status === 'T').length;
  const permitCount = dateRecords.filter(r => r.status === 'I').length;
  const sickCount = dateRecords.filter(r => r.status === 'S').length;
  const absentCount = dateRecords.filter(r => r.status === 'A').length;

  const currentTemplate = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  return (
    <div className="animate-fade-in block space-y-6">
      {/* ==================================================== */}
      {/* NAVIGATION TABS MENU (Absensi vs Izin vs ID Card) */}
      {/* ==================================================== */}
      <div className="flex flex-nowrap overflow-x-auto border-b border-slate-200 bg-white p-2 rounded-2xl shadow-sm gap-2 hide-scrollbar">
        <button
          onClick={() => setActiveSubMenu('harian')}
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-3 md:px-5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
            activeSubMenu === 'harian'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Absensi Harian
        </button>
        <button
          onClick={() => setActiveSubMenu('izin')}
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-3 md:px-5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
            activeSubMenu === 'izin'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Pengajuan Izin Mandiri
        </button>
        <button
          onClick={() => setActiveSubMenu('idcard')}
          className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-3 md:px-5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer ${
            activeSubMenu === 'idcard'
              ? 'bg-teal-600 text-white shadow-md'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Virtual ID & ID Card Generator
        </button>
      </div>

      {/* ==================================================== */}
      {/* SUB-MENU 1: ABSENSI HARIAN (SISTEM TAB LAZY LOADING) */}
      {/* ==================================================== */}
      {activeSubMenu === 'harian' && (
        <div className="space-y-6">
          {/* Inner Tabs Navigation */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 p-1.5 rounded-xl gap-2">
            <div className="flex flex-wrap gap-1">
              {/* Tab Pengaturan Absen (Global - Admin & Super Admin Only) */}
              {(activeRole === 'admin' || activeRole === 'kepsek') && (
                <button
                  onClick={() => setActiveHarianTab('pengaturan')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeHarianTab === 'pengaturan'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  ⚙️ Pengaturan Jam Absen
                </button>
              )}
              
              {/* Tab Absen Manual (Siswa can't do manual check, they only see personal) */}
              {activeRole !== 'siswa' && (
                <button
                  onClick={() => setActiveHarianTab('manual')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeHarianTab === 'manual'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📝 Absen Manual
                </button>
              )}

              {/* Tab Scan QR Code (Available to anyone except Siswa who has custom card scan) */}
              {activeRole !== 'siswa' && (
                <button
                  onClick={() => setActiveHarianTab('scan')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeHarianTab === 'scan'
                      ? 'bg-white text-teal-700 shadow-sm border border-teal-100/50'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📷 Scan QR Code Kartu ID
                </button>
              )}

              {/* Biometrics */}
              <button
                onClick={() => setActiveHarianTab('comingsoon')}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeHarianTab === 'comingsoon'
                    ? 'bg-white text-teal-700 shadow-sm border border-teal-100/50'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🔬 Biometrik (Face/NFC)
              </button>
            </div>

            {/* Quick Summary Pill */}
            <div className="px-3 py-1.5 bg-teal-50 border border-teal-100/40 rounded-lg hidden md:flex items-center gap-3 text-[10px] text-teal-800 font-extrabold uppercase tracking-wide">
              <span>Hadir: {presentCount}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Telat: {lateCount}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Izin/Sakit: {permitCount + sickCount}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>Alpa: {absentCount}</span>
            </div>
          </div>

          {/* TAB 1: PENGATURAN ABSEN GLOBAL */}
          {activeHarianTab === 'pengaturan' && (activeRole === 'admin' || activeRole === 'kepsek') && (
            <div className="bento-card bg-white animate-fade-in border border-slate-100">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
                <Settings className="w-5 h-5 text-teal-600" />
                <h4 className="font-extrabold text-slate-800 text-sm">Konfigurasi Jam Operasional & Batas Toleransi</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Jam Masuk</label>
                  <input 
                    type="time" 
                    value={settings.jamMasuk}
                    onChange={(e) => setSettings({ ...settings, jamMasuk: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-teal-500 w-full"
                  />
                  <p className="text-[10px] text-slate-400">Jam standar kedatangan siswa dan guru.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Batas Toleransi Keterlambatan (Menit)</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-1">
                    <input 
                      type="number" 
                      value={settings.toleransi}
                      onChange={(e) => setSettings({ ...settings, toleransi: Number(e.target.value) })}
                      className="bg-transparent py-2.5 text-slate-800 font-bold focus:outline-none w-full"
                    />
                    <span className="text-xs font-bold text-slate-500 ml-2">Menit</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Siswa dianggap terlat jika masuk setelah Jam Masuk + Toleransi.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Jam Pulang</label>
                  <input 
                    type="time" 
                    value={settings.jamPulang}
                    onChange={(e) => setSettings({ ...settings, jamPulang: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:outline-none focus:border-teal-500 w-full"
                  />
                  <p className="text-[10px] text-slate-400">Jam checkout tercepat agar tidak terhitung pulang awal.</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => addToast('Pengaturan absensi global berhasil disimpan!', 'Konfigurasi', 'success')}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-md cursor-pointer transition-all"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL ATTENDANCE (FOCUS SPEED) */}
          {activeHarianTab === 'manual' && activeRole !== 'siswa' && (
            <div className="bento-card bg-white border border-slate-100 animate-fade-in space-y-6">
              {/* Header with Search and controls */}
              <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => {
                        setManualUserType('siswa');
                        addToast('Kategori dialihkan ke Siswa', 'Absensi Manual', 'info');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        manualUserType === 'siswa' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      🎓 Siswa
                    </button>
                    {activeRole === 'admin' && (
                      <button
                        onClick={() => {
                          setManualUserType('guru');
                          addToast('Kategori dialihkan ke Guru & Tendik', 'Absensi Manual', 'info');
                        }}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                          manualUserType === 'guru' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        👨‍🏫 Guru / Tendik
                      </button>
                    )}
                  </div>

                  {manualUserType === 'siswa' && (
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Rombel:</label>
                      <SearchableSelect
                        value={manualKelasFilter}
                        onChange={(val) => setManualKelasFilter(val)}
                        disabled={activeRole === 'walikelas'} // Locked to perwalian
                        options={classes.map(c => ({ value: c.nama, label: c.nama }))}
                        placeholder="Pilih Rombel"
                        showSearch={true}
                        isClearable={false}
                        className="text-xs [&_button]:py-1 [&_button]:px-2.5"
                      />
                      {activeRole === 'walikelas' && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 uppercase leading-none">Wali Kelas 7-A</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Hadir semua & search */}
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Cari nama..."
                    value={manualSearchQuery}
                    onChange={(e) => setManualSearchQuery(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl w-48 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    onClick={handleMarkAllPresent}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    Hadir Semua
                  </button>
                </div>
              </div>

              {/* Table List of entries */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/60 bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                      <th className="py-4 px-4 w-12 text-center">No</th>
                      <th className="py-4 px-4">Nama Lengkap</th>
                      <th className="py-4 px-4">{manualUserType === 'siswa' ? 'NISN / Kelas' : 'NIP / Kepegawaian'}</th>
                      <th className="py-4 px-4 w-44">Jam Datang</th>
                      <th className="py-4 px-4 text-center w-72">Status Presensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(manualUserType === 'siswa' ? filteredStudents : filteredTeachers).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          Tidak ada data yang cocok dengan kriteria pencarian.
                        </td>
                      </tr>
                    ) : (
                      (manualUserType === 'siswa' ? filteredStudents : filteredTeachers).map((user, idx) => {
                        const rec = records.find(r => r.userId === user.id && r.tanggal === simDate);
                        const status = rec ? rec.status : null;
                        const jam = rec ? (rec.jamMasuk || '') : '';

                        return (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                            <td className="py-4 px-4">
                              <span className="font-extrabold text-slate-800 text-[13px] block">{user.nama}</span>
                              <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-bold text-slate-700 block">
                                {manualUserType === 'siswa' ? (user as Student).nisn : (user as Teacher).nipNuptk}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {manualUserType === 'siswa' ? (user as Student).kelas : (user as Teacher).tugasUtama}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                <input
                                  type="time"
                                  value={jam}
                                  disabled={!rec || (status !== 'H' && status !== 'T')}
                                  onChange={(e) => handleUpdateJamMasuk(user.id, e.target.value)}
                                  className="bg-slate-50 disabled:bg-transparent border border-slate-200 disabled:border-transparent rounded-lg px-2 py-1 text-slate-700 font-bold focus:outline-none w-20"
                                />
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex justify-center items-center gap-1.5">
                                {[
                                  { k: 'H', lbl: 'Hadir', cls: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10' },
                                  { k: 'T', lbl: 'Telat', cls: 'bg-amber-500 text-white shadow-sm shadow-amber-500/10' },
                                  { k: 'I', lbl: 'Izin', cls: 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/10' },
                                  { k: 'S', lbl: 'Sakit', cls: 'bg-rose-500 text-white shadow-sm shadow-rose-500/10' },
                                  { k: 'A', lbl: 'Alpa', cls: 'bg-slate-600 text-white shadow-sm shadow-slate-500/10' }
                                ].map(p => (
                                  <button
                                    key={p.k}
                                    onClick={() => handleSetStatus(user.id, p.k as any)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                      status === p.k 
                                        ? p.cls 
                                        : 'bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-200 border border-slate-200'
                                    }`}
                                  >
                                    {p.lbl}
                                  </button>
                                ))}
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
          )}

          {/* TAB 3: SCAN BARCODE (LAZY LOADED CAMERA SIMULATION) */}
          {activeHarianTab === 'scan' && activeRole !== 'siswa' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              {/* Webcam simulator area */}
              <div className="lg:col-span-2 bento-card bg-slate-950 text-white flex flex-col justify-between overflow-hidden relative min-h-[400px]">
                {/* Laser animation */}
                {isCameraActive && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-bounce z-10" />
                )}

                {/* Target scan lines */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 z-10">
                  <div className="w-64 h-40 border-2 border-dashed border-teal-400 rounded-xl relative">
                    <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-teal-500" />
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-teal-500" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-teal-500" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-teal-500" />
                  </div>
                </div>

                {/* Webcam Title */}
                <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 z-20 absolute top-0 inset-x-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isCameraActive ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      {isCameraActive ? 'Live Camera Active' : 'Camera Inactive'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-400 uppercase bg-teal-950 px-2 py-0.5 rounded border border-teal-900 leading-none">
                    Scanner
                  </span>
                </div>

                {/* Feed / Video */}
                <div className="flex-1 flex flex-col items-center justify-center bg-black relative min-h-[300px]">
                  <video 
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {!cameraInitiated ? (
                    <div className="flex flex-col items-center justify-center space-y-5 p-8 text-center z-10">
                      <div className="p-4 bg-teal-500/10 text-teal-400 rounded-full border border-teal-500/20 animate-pulse">
                        <Camera className="w-10 h-10 md:w-12 md:h-12 stroke-[1.5]" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm md:text-base font-extrabold text-slate-200">Kamera Scanner Belum Aktif</p>
                        <p className="text-[11px] md:text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          Tekan tombol di bawah ini untuk mengizinkan dan menyalakan kamera. Scan barcode kartu pelajar/guru untuk melakukan presensi secara cepat dan real-time.
                        </p>
                      </div>
                      <button
                        onClick={() => setCameraInitiated(true)}
                        className="bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 shadow-lg shadow-teal-900/40 border border-teal-500/30 hover:-translate-y-0.5 cursor-pointer"
                      >
                        Mulai Scan / Aktifkan Kamera
                      </button>
                    </div>
                  ) : !isCameraActive ? (
                    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center z-10">
                      <Camera className="w-12 h-12 md:w-16 md:h-16 text-slate-700 animate-pulse stroke-[1.2]" />
                      <div className="space-y-1">
                        <p className="text-xs md:text-sm font-extrabold text-slate-300">Kamera Terputus / Tidak Tersedia</p>
                        <p className="text-[10px] md:text-xs text-slate-500 max-w-sm">Minta izin browser untuk mengakses kamera atau gunakan fitur manual di bawah ini.</p>
                      </div>
                      {cameraError && (
                        <p className="text-[10px] md:text-xs font-bold text-rose-500 bg-rose-950/50 px-3 py-1.5 rounded-lg border border-rose-900/50">
                          {cameraError}
                        </p>
                      )}
                      <button
                        onClick={startCamera}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase transition-all"
                      >
                        Nyalakan Kamera
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Immediate interactive scan option - overlaid at bottom */}
                <div className="p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-20 relative">
                  <div className="max-w-md w-full mx-auto space-y-3">
                    <label className="text-[10px] font-black uppercase text-teal-400 tracking-wider block text-center">Alternatif Simulasi Manual</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <SearchableSelect
                          value={scannedUserId}
                          onChange={(val) => setScannedUserId(val)}
                          options={[
                            ...students.map(s => ({ value: s.id, label: `Siswa: ${s.nama} (${s.kelas})` })),
                            ...teachers.map(t => ({ value: t.id, label: `Guru: ${t.nama}` }))
                          ]}
                          placeholder="Pilih Siswa / Guru"
                          showSearch={true}
                          isClearable={true}
                          className="w-full text-slate-100 [&_button]:bg-slate-950 [&_button]:border-slate-700 [&_span]:text-slate-100"
                        />
                      <button
                        onClick={() => {
                          if (!scannedUserId) {
                            addToast('Pilih pengguna yang disimulasikan terlebih dahulu!', 'Gagal Scan', 'warning');
                            return;
                          }
                          triggerScanSimulated(scannedUserId);
                        }}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer whitespace-nowrap w-full sm:w-auto text-center"
                      >
                        Scan Kartu
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scan Log panel */}
              <div className="bento-card bg-white border border-slate-100 flex flex-col justify-between min-h-[400px]">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h4 className="font-extrabold text-slate-800 text-sm">Riwayat Pemindaian (Hari Ini)</h4>
                    <span className="text-[9px] font-black uppercase bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">REALTIME</span>
                  </div>
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {scanLog.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                        <Clock className="w-8 h-8 text-slate-200" />
                        <p className="text-xs font-medium">Belum ada aktivitas scan pada sesi ini.</p>
                      </div>
                    ) : (
                      scanLog.map((log, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 animate-slide-in">
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-800 text-xs block truncate">{log.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{log.type === 'siswa' ? 'Siswa' : 'Guru'}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-700 text-xs block">{log.time}</span>
                            <span className={`text-[9px] font-black uppercase ${
                              log.status.includes('Terlambat') ? 'text-amber-600' : 'text-emerald-600'
                            }`}>{log.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-3.5 mt-4">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      Sistem scan QR code mengintegrasikan jam kedatangan real-time dengan jadwal jam mengajar guru dan aturan dispensasi siswa. Kehadiran manual yang bertumpukan akan langsung menimpa data scan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMING SOON BIOMETRICS */}
          {activeHarianTab === 'comingsoon' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
              {[
                { title: 'Absensi Sidik Jari (Fingerprint)', desc: 'Sinkronisasi mesin fingerprint sekolah ke database lokal sistem secara nirkabel.', status: 'COMING SOON V1.2' },
                { title: 'Face Recognition Smart-Gate', desc: 'Pemindaian wajah otomatis di gerbang madrasah dengan logik kecerdasan buatan.', status: 'COMING SOON V1.3' },
                { title: 'NFC Tap Card Attendance', desc: 'Pencatatan instan dengan menempelkan kartu identitas fisik pada mesin NFC gerbang.', status: 'COMING SOON V1.2' },
              ].map((b, idx) => (
                <div key={idx} className="bento-card bg-white border border-slate-100 p-6 flex flex-col justify-between text-center min-h-[220px]">
                  <div className="mx-auto w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-4">
                    <Layers className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm">{b.title}</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">{b.desc}</p>
                  </div>
                  <span className="text-[9px] font-black tracking-wider uppercase bg-teal-50 border border-teal-200 text-teal-600 px-3 py-1 rounded-full w-max mx-auto mt-4">
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* FITUR PENGAJUAN IZIN MANDIRI (SISWA & GURU) */}
      {/* ==================================================== */}
      {activeSubMenu === 'izin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Izin Form: Left side */}
          <div className="lg:col-span-1 bento-card bg-white border border-slate-100 animate-fade-in space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-slate-800 text-sm">Formulir Pengajuan Izin Mandiri</h4>
              <p className="text-xs text-slate-400 mt-1">Sediakan alasan dan detail dispensasi yang valid.</p>
            </div>

            <form onSubmit={handleIzinSubmit} className="space-y-4">
              {/* Type selector */}
              <div className="space-y-1.5 text-left">
                <label className="text-[13px] text-slate-600 font-medium">Jenis Dispensasi / Izin</label>
                <SearchableSelect
                  value={izinJenis}
                  onChange={(val) => setIzinJenis(val as any)}
                  options={[
                    { value: 'Sakit_Tidak_Masuk', label: 'Sakit / Tidak Masuk' },
                    { value: 'Terlambat', label: 'Izin Terlambat (Datang Terlambat)' },
                    { value: 'Pulang Awal', label: 'Izin Pulang Lebih Awal' }
                  ]}
                  placeholder="Pilih Jenis Izin"
                  showSearch={false}
                  isClearable={false}
                />
              </div>

              {/* Conditional Inputs */}
              {izinJenis === 'Sakit_Tidak_Masuk' && (
                <>
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wide">Jumlah Hari</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={izinSakitHari}
                      onChange={(e) => setIzinSakitHari(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 w-full"
                    />
                  </div>
                  
                  {/* Doctor note upload simulator */}
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wide">Unggah Surat Dokter (Wajib)</label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                        dragOver ? 'border-teal-500 bg-teal-50/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
                      }`}
                    >
                      <input 
                        type="file" 
                        id="doctor-file" 
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      <label htmlFor="doctor-file" className="cursor-pointer space-y-1 block">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-600">
                          {uploadedFileName ? `Terpasang: ${uploadedFileName}` : 'Drag & Drop atau klik untuk memilih file'}
                        </p>
                        <p className="text-[10px] text-slate-400">PDF, PNG, JPG (Maks 2MB)</p>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {izinJenis === 'Pulang Awal' && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wide">Rencana Jam Pulang</label>
                  <input
                    type="time"
                    value={izinJamPulang}
                    onChange={(e) => setIzinJamPulang(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 w-full cursor-pointer"
                  />
                </div>
              )}

              {/* Text Area Alasan */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block tracking-wide">Alasan / Keterangan Lengkap</label>
                <textarea
                  value={izinAlasan}
                  onChange={(e) => setIzinAlasan(e.target.value)}
                  placeholder="Tulis alasan keterlambatan/sakit secara detail dan sopan..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500 w-full h-24 resize-none"
                />
              </div>

              {/* Submit button conforming to strict rule: NO white color, matching active theme */}
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Kirim Pengajuan Izin
              </button>
            </form>
          </div>

          {/* Izin Inbox list: Right side (Approval router for Admin, Wali, Kepsek) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bento-card bg-white border border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">Kotak Masuk Persetujuan Izin (Dispensasi)</h4>
                  <p className="text-xs text-slate-400 mt-1">Gunakan akun Wali Kelas atau Kepala Sekolah untuk memproses persetujuan.</p>
                </div>
                <span className="text-[9px] font-black uppercase bg-teal-50 border border-teal-100 text-teal-600 px-2 py-0.5 rounded-full leading-none">
                  {izins.filter(i => i.statusApproval === 'Pending').length} Pending
                </span>
              </div>

              <div className="space-y-4">
                {izins.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                    <FileText className="w-10 h-10 text-slate-200" />
                    <p className="text-xs font-semibold">Tidak ada data pengajuan izin terekam.</p>
                  </div>
                ) : (
                  izins.map((iz) => {
                    // Check if current role has permission to ACC
                    let canAcc = false;
                    if (activeRole === 'admin') canAcc = true;
                    else if (activeRole === 'walikelas' && iz.userType === 'siswa') canAcc = true; // Wali kelas can ACC student
                    else if (activeRole === 'kepsek' && iz.userType === 'guru') canAcc = true; // Kepsek can ACC teachers

                    return (
                      <div key={iz.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col justify-between gap-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800 text-sm">{iz.nama}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                {iz.userType === 'siswa' ? `Siswa (${iz.kelas})` : 'Guru'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-bold tracking-tight">
                              Jenis: {iz.jenisIzin === 'Sakit_Tidak_Masuk' ? 'Sakit' : iz.jenisIzin === 'Pulang Awal' ? `Pulang Awal (${iz.jamPulangAwal})` : 'Terlambat'} 
                              {iz.jumlahHari ? ` - ${iz.jumlahHari} Hari` : ''}
                            </p>
                            <p className="text-xs text-slate-600 italic bg-white/75 p-3 rounded-xl border border-slate-100 mt-2">
                              "{iz.alasan}"
                            </p>
                            {iz.suratDokterUrl && (
                              <div className="flex items-center gap-1.5 text-[10px] text-teal-600 font-bold mt-2 bg-teal-50 border border-teal-100 w-max px-2 py-1 rounded">
                                <FileText className="w-3.5 h-3.5" />
                                <span>Surat Kedokteran: {iz.suratDokterUrl}</span>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 font-bold block">{iz.tanggalPengajuan}</span>
                            <span className={`text-[10px] font-black uppercase block mt-1.5 ${
                              iz.statusApproval === 'Pending' ? 'text-amber-500' : iz.statusApproval === 'Disetujui' ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              {iz.statusApproval}
                            </span>
                            {iz.approvedBy && (
                              <span className="text-[8px] text-slate-400 font-bold block mt-1">oleh {iz.approvedBy}</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons (only if pending and has permission) */}
                        {iz.statusApproval === 'Pending' && (
                          <div className="border-t border-slate-200/40 pt-3 flex justify-between items-center gap-4">
                            <p className="text-[10px] text-slate-400 font-medium">
                              {canAcc 
                                ? '⚠️ Anda memiliki hak persetujuan untuk pengajuan izin ini.' 
                                : '🔒 Akses verifikasi terkunci untuk tingkat peran Anda saat ini.'
                              }
                            </p>
                            {canAcc && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveIzin(iz.id, false)}
                                  className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> Tolak
                                </button>
                                <button
                                  onClick={() => handleApproveIzin(iz.id, true)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Setujui
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-MENU 2: ID CARD GENERATOR & VIRTUAL ID */}
      {/* ==================================================== */}
      {activeSubMenu === 'idcard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Card Customizer controls: Left column (Only visible to Admin) */}
          <div className="lg:col-span-1 space-y-6">
            {activeRole === 'admin' ? (
              <div className="bento-card bg-white border border-slate-100 animate-fade-in space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-slate-800 text-sm">Generator ID Card Massal</h4>
                  <p className="text-xs text-slate-400 mt-1">Sesuaikan desain template kartu identitas digital madrasah.</p>
                </div>

                {/* Design Template Selection */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[13px] text-slate-600 font-medium">Desain Template ID Card</label>
                 <SearchableSelect
                    value={selectedTemplate}
                    onChange={(val) => setSelectedTemplate(val)}
                    disabled={onlyBarcodeFallback || useCustomTemplate}
                    options={TEMPLATES.map(t => ({ value: t.id, label: t.name }))}
                    placeholder="Pilih Desain Template"
                    showSearch={false}
                    isClearable={false}
                  />
                </div>

                {/* Custom Template Section */}
                <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/65">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-black text-slate-800 block">Template Kustom Admin</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Unggah & pasang desain kartu buatan sendiri.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={useCustomTemplate}
                      disabled={onlyBarcodeFallback}
                      onChange={(e) => {
                        setUseCustomTemplate(e.target.checked);
                        addToast(e.target.checked ? 'Menggunakan TEMPLATE KUSTOM' : 'Menggunakan TEMPLATE BAWAAN', 'Template Kustom', 'info');
                      }}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  {useCustomTemplate && (
                    <div className="space-y-3.5 pt-2 border-t border-slate-200/50 animate-fade-in">
                      {/* File Uploader */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Unggah Gambar Desain (CR-80)</label>
                        <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-xl p-3 bg-white transition-all cursor-pointer">
                          <input
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  addToast('Ukuran berkas terlalu besar! Maksimal 2MB.', 'Unggah Gagal', 'error');
                                  return;
                                }
                                try {
                                  const { compressImage } = await import('../lib/image');
                                  const compressed = await compressImage(file, 1200, 1200, 0.8);
                                  setCustomTemplateBg(compressed);
                                  addToast('Template gambar kustom berhasil dimuat!', 'Unggah Berhasil', 'success');
                                } catch (error) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result) {
                                      setCustomTemplateBg(ev.target.result as string);
                                      addToast('Template gambar kustom berhasil dimuat!', 'Unggah Berhasil', 'success');
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-500 font-extrabold">Pilih Berkas Desain</span>
                          <span className="text-[8px] text-slate-400">PNG/JPG. Rasio 85x54 mm (1.57:1)</span>
                        </div>
                        {customTemplateBg && (
                          <div className="flex items-center justify-between mt-1.5 px-2 py-1 bg-teal-50 border border-teal-100 rounded-lg">
                            <span className="text-[9px] text-teal-700 font-bold truncate max-w-[150px]">✓ Gambar Template Aktif</span>
                            <button
                              onClick={() => {
                                setCustomTemplateBg('');
                                addToast('Gambar kustom dihapus!', 'Hapus', 'info');
                              }}
                              className="text-[9px] text-rose-500 font-bold hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Coordinates Tuner Accordion */}
                      <div className="space-y-2.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide block">Tuning Posisi Elemen (mm)</span>
                        
                        {/* Photo tuner */}
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                          <span className="text-[9px] font-black uppercase text-teal-600 block">👤 Pas Foto Siswa/Guru</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 font-mono">
                            <div>
                              <span>Geser X</span>
                              <input
                                type="range" min="0" max="85" step="1"
                                value={customCoords.photoX}
                                onChange={(e) => setCustomCoords({ ...customCoords, photoX: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.photoX} mm</span>
                            </div>
                            <div>
                              <span>Geser Y</span>
                              <input
                                type="range" min="0" max="54" step="1"
                                value={customCoords.photoY}
                                onChange={(e) => setCustomCoords({ ...customCoords, photoY: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.photoY} mm</span>
                            </div>
                            <div>
                              <span>Lebar (W)</span>
                              <input
                                type="range" min="5" max="40" step="1"
                                value={customCoords.photoW}
                                onChange={(e) => setCustomCoords({ ...customCoords, photoW: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.photoW} mm</span>
                            </div>
                            <div>
                              <span>Tinggi (H)</span>
                              <input
                                type="range" min="5" max="40" step="1"
                                value={customCoords.photoH}
                                onChange={(e) => setCustomCoords({ ...customCoords, photoH: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.photoH} mm</span>
                            </div>
                          </div>
                        </div>

                        {/* Text Name tuner */}
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                          <span className="text-[9px] font-black uppercase text-teal-600 block">✏️ Teks Nama</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 font-mono">
                            <div>
                              <span>Posisi X</span>
                              <input
                                type="range" min="0" max="85" step="1"
                                value={customCoords.nameX}
                                onChange={(e) => setCustomCoords({ ...customCoords, nameX: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.nameX} mm</span>
                            </div>
                            <div>
                              <span>Posisi Y</span>
                              <input
                                type="range" min="0" max="54" step="1"
                                value={customCoords.nameY}
                                onChange={(e) => setCustomCoords({ ...customCoords, nameY: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.nameY} mm</span>
                            </div>
                            <div>
                              <span>Ukuran</span>
                              <input
                                type="range" min="5" max="18" step="0.5"
                                value={customCoords.nameSize}
                                onChange={(e) => setCustomCoords({ ...customCoords, nameSize: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.nameSize} pt</span>
                            </div>
                            <div>
                              <span>Warna Teks</span>
                              <input
                                type="color"
                                value={customCoords.nameColor}
                                onChange={(e) => setCustomCoords({ ...customCoords, nameColor: e.target.value })}
                                className="w-full h-7 border border-slate-200 rounded-lg mt-1 cursor-pointer bg-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Info details tuner */}
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                          <span className="text-[9px] font-black uppercase text-teal-600 block">📇 Teks Identitas</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 font-mono">
                            <div>
                              <span>Posisi X</span>
                              <input
                                type="range" min="0" max="85" step="1"
                                value={customCoords.infoX}
                                onChange={(e) => setCustomCoords({ ...customCoords, infoX: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.infoX} mm</span>
                            </div>
                            <div>
                              <span>Posisi Y</span>
                              <input
                                type="range" min="0" max="54" step="1"
                                value={customCoords.infoY}
                                onChange={(e) => setCustomCoords({ ...customCoords, infoY: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.infoY} mm</span>
                            </div>
                            <div>
                              <span>Ukuran</span>
                              <input
                                type="range" min="4" max="14" step="0.5"
                                value={customCoords.infoSize}
                                onChange={(e) => setCustomCoords({ ...customCoords, infoSize: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.infoSize} pt</span>
                            </div>
                            <div>
                              <span>Warna Teks</span>
                              <input
                                type="color"
                                value={customCoords.infoColor}
                                onChange={(e) => setCustomCoords({ ...customCoords, infoColor: e.target.value })}
                                className="w-full h-7 border border-slate-200 rounded-lg mt-1 cursor-pointer bg-transparent"
                              />
                            </div>
                          </div>
                        </div>

                        {/* QR code tuner */}
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-2">
                          <span className="text-[9px] font-black uppercase text-teal-600 block">📱 QR Code Presensi</span>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 font-mono">
                            <div>
                              <span>Posisi X</span>
                              <input
                                type="range" min="0" max="85" step="1"
                                value={customCoords.qrX}
                                onChange={(e) => setCustomCoords({ ...customCoords, qrX: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.qrX} mm</span>
                            </div>
                            <div>
                              <span>Posisi Y</span>
                              <input
                                type="range" min="0" max="54" step="1"
                                value={customCoords.qrY}
                                onChange={(e) => setCustomCoords({ ...customCoords, qrY: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.qrY} mm</span>
                            </div>
                            <div className="col-span-2">
                              <span>Ukuran QR</span>
                              <input
                                type="range" min="8" max="30" step="1"
                                value={customCoords.qrSize}
                                onChange={(e) => setCustomCoords({ ...customCoords, qrSize: Number(e.target.value) })}
                                className="w-full accent-teal-600 h-1 bg-slate-100 rounded-lg mt-1"
                              />
                              <span className="text-slate-700 mt-0.5 block font-mono">{customCoords.qrSize} mm</span>
                            </div>
                          </div>
                        </div>

                        {/* Guidelines / Format Instructions card */}
                        <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl space-y-1 text-teal-800 text-[10px] leading-relaxed font-medium">
                          <span className="font-extrabold block text-teal-950">💡 Panduan Desain Kartu Super Admin:</span>
                          <p>1. Gunakan rasio standard kartu ATM (CR-80: 85.6mm x 54mm, rasio 1.57:1).</p>
                          <p>2. Format file: PNG atau JPEG berkualitas tinggi (rekomendasi: 1012 x 638 piksel).</p>
                          <p>3. Sisakan area kosong pada berkas desain Anda untuk menaruh Foto, Nama, Informasi, dan QR Code.</p>
                          <p>4. Gunakan slider tuning di atas untuk memindahkan dan menyelaraskan tiap objek dengan layout desain gambar Anda secara presisi milimeter!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Print Scope Categories */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wide block">Kategori Penerbitan</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setIdCardCategory('siswa');
                        addToast('Penerbitan kartu disetel ke Siswa', 'Penerbitan ID', 'info');
                      }}
                      className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        idCardCategory === 'siswa' 
                          ? 'bg-teal-50 text-teal-700 border-teal-300' 
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      🎓 Kartu Siswa
                    </button>
                    <button
                      onClick={() => {
                        setIdCardCategory('guru');
                        addToast('Penerbitan kartu disetel ke Guru', 'Penerbitan ID', 'info');
                      }}
                      className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                        idCardCategory === 'guru' 
                          ? 'bg-teal-50 text-teal-700 border-teal-300' 
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      👨‍🏫 Kartu Guru
                    </button>
                  </div>
                </div>

                {/* Dynamic class selector */}
                {idCardCategory === 'siswa' && (
                  <div className="space-y-1.5 animate-fade-in text-left">
                    <label className="text-[13px] text-slate-600 font-medium">Pilih Rombel / Kelas</label>
                    <SearchableSelect
                      value={idCardKelas}
                      onChange={(val) => setIdCardKelas(val)}
                      options={classes.map(c => ({ value: c.nama, label: c.nama }))}
                      placeholder="Pilih Rombel / Kelas"
                      showSearch={true}
                      isClearable={false}
                    />
                  </div>
                )}

                {/* Fallback Option: Print Barcode Only */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/50 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="text-xs font-extrabold text-slate-700 block">Hanya Cetak QR Code</span>
                    <span className="text-[10px] text-slate-400 block leading-tight">Cetak QR Code tanpa bingkai template kartu.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={onlyBarcodeFallback}
                    onChange={(e) => {
                      setOnlyBarcodeFallback(e.target.checked);
                      addToast(e.target.checked ? 'Mode cetak disetel ke HANYA QR CODE' : 'Mode cetak disetel ke TEMPLATE DEKORATIF', 'Opsi Cetak', 'info');
                    }}
                    className="w-4.5 h-4.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                  />
                </div>

                {/* Action button conforming to strict rule: NO white color, matching active theme */}
                <div className="pt-2">
                  <button
                    onClick={handleGeneratePdfBatch}
                    disabled={isGeneratingPdf}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black uppercase text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                  >
                    <Printer className="w-4 h-4" />
                    {isGeneratingPdf ? `Menghasilkan PDF (${pdfProgress}%)` : 'Unduh File Cetak Massal (A4 PDF)'}
                  </button>
                  {isGeneratingPdf && (
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div className="bg-teal-500 h-full transition-all duration-150" style={{ width: `${pdfProgress}%` }} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bento-card bg-white border border-slate-100 p-5 space-y-4 text-center">
                <div className="mx-auto w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                  <Shield className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-slate-700 text-xs">Generator ID Card Terkunci</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Fitur generator kartu identitas massal, unduh PDF A4, dan opsi konfigurasi fallback hanya tersedia bagi pengguna dengan tingkat otorisasi **Administrator**.
                </p>
              </div>
            )}

            {/* Print specifications */}
            <div className="bento-card bg-slate-900 text-slate-300 border border-slate-800 p-5 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-teal-400 block">Spesifikasi Cetak Massal A4</span>
              <ul className="space-y-2 text-[11px] font-medium leading-relaxed">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Kertas standard A4 (210mm x 297mm).</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Satu lembar memuat maksimal 8 ID Card (2 Kolom x 4 Baris).</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Dilengkapi garis potong (cut lines) putus-putus presisi.</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Mekanisme jspdf lazy chunking mencegah crash di peranti seluler.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Virtual ID Card preview: Right 2 columns */}
          <div className="lg:col-span-2 bento-card bg-white border border-slate-100 animate-fade-in flex flex-col items-center justify-center p-8 space-y-6">
            <div className="text-center space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">Visual Kartu Identitas Virtual</h4>
              <p className="text-xs text-slate-400">Sodorkan visual kartu di layar HP ini langsung pada kamera QR code loket gerbang.</p>
            </div>

            {/* Dynamic preview user selectors */}
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-[340px]">
              {idCardCategory === 'siswa' ? (
                <div className="flex-1 space-y-1 text-left">
                  <label className="text-[13px] text-slate-600 font-medium">Pilih Pratinjau Siswa</label>
                  <SearchableSelect
                    value={selectedSiswa?.id || ''}
                    onChange={(val) => {
                      const found = students.find(s => s.id === val);
                      if (found) setSelectedSiswa(found);
                    }}
                    options={students.filter(s => s.kelas === idCardKelas).map(s => ({ value: s.id, label: s.nama }))}
                    placeholder="Pilih Pratinjau Siswa"
                    showSearch={true}
                    isClearable={false}
                  />
                </div>
              ) : (
                <div className="flex-1 space-y-1 text-left">
                  <label className="text-[13px] text-slate-600 font-medium">Pilih Pratinjau Guru</label>
                  <SearchableSelect
                    value={selectedGuru?.id || ''}
                    onChange={(val) => {
                      const found = teachers.find(t => t.id === val);
                      if (found) setSelectedGuru(found);
                    }}
                    options={teachers.map(t => ({ value: t.id, label: t.nama }))}
                    placeholder="Pilih Pratinjau Guru"
                    showSearch={true}
                    isClearable={false}
                  />
                </div>
              )}
            </div>

            {/* DYNAMIC VIRTUAL ID CARD DISPLAY */}
            <div className="relative w-[340px] h-[216px] perspective-1000">
              {/* FLIPPABLE CONTAINER */}
              <div 
                className={`w-full h-full duration-500 transform-style-3d relative cursor-pointer shadow-lg rounded-2xl ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
                onClick={() => setIsFlipped(!isFlipped)}
              >
                {/* --- FRONT SIDE --- */}
                {useCustomTemplate && customTemplateBg ? (
                  <div 
                    className="absolute inset-0 backface-hidden flex flex-col justify-between p-5 text-white select-none overflow-hidden"
                    style={{
                      backgroundImage: `url(${customTemplateBg})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '16px',
                      color: customCoords.nameColor,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {/* Elements are overlaid relative to card base */}
                    {/* A. Photo */}
                    <div 
                      className="absolute bg-slate-100/50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0"
                      style={{
                        left: `${customCoords.photoX * 4}px`,
                        top: `${customCoords.photoY * 4}px`,
                        width: `${customCoords.photoW * 4}px`,
                        height: `${customCoords.photoH * 4}px`
                      }}
                    >
                      {idCardCategory === 'siswa' && selectedSiswa?.foto ? (
                        <img src={selectedSiswa.foto} alt="Foto" className="w-full h-full object-cover" />
                      ) : idCardCategory === 'guru' && selectedGuru?.foto ? (
                        <img src={selectedGuru.foto} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-black text-sm text-slate-400">
                          {idCardCategory === 'siswa' ? (selectedSiswa?.nama || 'S').charAt(0) : (selectedGuru?.nama || 'G').charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* B. Name */}
                    <span 
                      className="absolute font-extrabold leading-tight truncate font-sans"
                      style={{
                        left: `${customCoords.nameX * 4}px`,
                        top: `${customCoords.nameY * 4}px`,
                        fontSize: `${customCoords.nameSize * 1.3}px`,
                        color: customCoords.nameColor,
                        maxWidth: `${320 - (customCoords.nameX * 4)}px`
                      }}
                    >
                      {idCardCategory === 'siswa' ? (selectedSiswa?.nama || 'Siswa MTs') : (selectedGuru?.nama || 'Guru MTs')}
                    </span>

                    {/* C. Identity detail lines */}
                    <div 
                      className="absolute space-y-0.5 leading-normal"
                      style={{
                        left: `${customCoords.infoX * 4}px`,
                        top: `${customCoords.infoY * 4}px`,
                        fontSize: `${customCoords.infoSize * 1.3}px`,
                        color: customCoords.infoColor
                      }}
                    >
                      <p className="font-medium">
                        {idCardCategory === 'siswa' ? `NISN: ${selectedSiswa?.nisn || '-'}` : `NIK: ${selectedGuru?.nik || '-'}`}
                      </p>
                      <p className="font-medium">
                        {idCardCategory === 'siswa' ? `Kelas: ${selectedSiswa?.kelas || '-'}` : `Tugas: ${selectedGuru?.tugasUtama || '-'}`}
                      </p>
                    </div>

                    {/* D. QR Code element */}
                    <div 
                      className="absolute bg-white p-1 rounded-lg border border-slate-200"
                      style={{
                        left: `${customCoords.qrX * 4}px`,
                        top: `${customCoords.qrY * 4}px`,
                        width: `${customCoords.qrSize * 4}px`,
                        height: `${customCoords.qrSize * 4}px`
                      }}
                    >
                      <QRCodeGenerator 
                        value={idCardCategory === 'siswa' ? (selectedSiswa?.username || 'dummy') : (selectedGuru?.nik || 'dummy')}
                        size={customCoords.qrSize * 4 - 8}
                      />
                    </div>
                  </div>
                ) : (
                  <div 
                    className="absolute inset-0 backface-hidden flex flex-col justify-between p-5 text-white select-none"
                    style={{
                      background: currentTemplate.primaryBg,
                      ...currentTemplate.cardStyle,
                      color: currentTemplate.textPrimary
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-teal-700 font-black text-xs leading-none">
                          MTs
                        </div>
                        <div className="min-w-0">
                          <span className="font-extrabold text-[10px] block leading-none">{institution.name}</span>
                          <span className="text-[7px] text-white/70 block tracking-wider uppercase mt-0.5">Core Management System</span>
                        </div>
                      </div>
                      <span 
                        className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ 
                          backgroundColor: currentTemplate.badgeBg, 
                          color: selectedTemplate === 'teal' ? '#0d9488' : currentTemplate.textSecondary 
                        }}
                      >
                        {idCardCategory === 'siswa' ? 'Siswa' : 'Guru'}
                      </span>
                    </div>

                    {/* Card Body layout */}
                    <div className="flex items-center gap-4 py-2">
                      {/* Visual photo frame */}
                      <div className="w-14 h-18 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center shrink-0">
                        <span className="font-black text-lg text-white">
                          {idCardCategory === 'siswa' 
                            ? (selectedSiswa?.nama || currentSiswa?.nama || 'S').charAt(0) 
                            : (selectedGuru?.nama || currentGuru?.nama || 'G').charAt(0)
                          }
                        </span>
                      </div>

                      {/* Information right */}
                      <div className="space-y-1 overflow-hidden">
                        <span className="font-extrabold text-[13px] block leading-tight truncate">
                          {idCardCategory === 'siswa' 
                            ? (selectedSiswa?.nama || currentSiswa?.nama || 'Siswa MTs') 
                            : (selectedGuru?.nama || currentGuru?.nama || 'Guru MTs')
                          }
                        </span>
                        
                        <div className="space-y-0.5 text-[8px]" style={{ color: currentTemplate.textSecondary }}>
                          <p>NIP/NISN: <span className="font-bold text-white">
                            {idCardCategory === 'siswa' 
                              ? (selectedSiswa?.nisn || currentSiswa?.nisn || '-') 
                              : (selectedGuru?.nik || currentGuru?.nik || '-')
                            }
                          </span></p>
                          <p>Kategori: <span className="font-bold text-white">
                            {idCardCategory === 'siswa' 
                              ? (selectedSiswa?.kelas || currentSiswa?.kelas || '-') 
                              : (selectedGuru?.tugasUtama || currentGuru?.tugasUtama || '-')
                            }
                          </span></p>
                        </div>
                      </div>
                    </div>

                    {/* QR Code block at bottom */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-[6px] tracking-widest text-white/50 font-semibold max-w-[50%]">MTs AT-TURMUDZI INC.</span>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                        <QRCodeGenerator 
                          value={idCardCategory === 'siswa' 
                            ? (selectedSiswa?.username || currentSiswa?.username || 'dummy') 
                            : (selectedGuru?.nik || currentGuru?.nik || 'dummy')
                          } 
                          size={64}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- BACK SIDE --- */}
                <div 
                  className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-between p-5 text-white select-none"
                  style={{
                    background: selectedTemplate === 'teal' ? '#f8fafc' : '#0f172a',
                    border: selectedTemplate === 'teal' ? '1px solid #e2e8f0' : 'none',
                    borderRadius: currentTemplate.cardStyle.borderRadius
                  }}
                >
                  {/* Header */}
                  <div className="border-b border-white/10 pb-2 text-center">
                    <span className="font-extrabold text-[10px] text-teal-400 uppercase tracking-widest block">KETENTUAN KARTU IDENTITAS</span>
                  </div>

                  {/* Body instructions */}
                  <div className="space-y-1.5 text-[8px] text-slate-400 font-medium leading-relaxed my-auto">
                    <p>1. Kartu ini merupakan identitas resmi digital civitas akademika MTs At-Turmudzi.</p>
                    <p>2. Digunakan wajib untuk proses absensi mandiri, layanan pustaka, dan presensi CBT.</p>
                    <p>3. Dilarang menggandakan, menyalahgunakan, atau memindahtangankan akun QR Code.</p>
                    <p>4. Jika terjadi kehilangan atau penggantian data, harap melapor ke admin Dapodik.</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[6px] text-slate-500 font-mono">
                    <span>Soreang, Bandung, Indonesia</span>
                    <span>© {new Date().getFullYear()} Yayasan Wakaf At-Turmudzi</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Flip hint */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Balik Kartu (Flip)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
