import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx-js-style";
import { ChevronDown, FileText, Table, Printer } from "lucide-react";
import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, Eye, Edit3, Key, Trash2, ShieldAlert, ChevronLeft, ChevronRight, FileUp, FileDown, AlertCircle, X, CheckCircle, RefreshCw, ArrowRightLeft } from 'lucide-react';
import { Student, Institution, getPdfLogo, StudentMutation, ClassPromotion, StudentGraduation } from '../types';
import { SearchableSelect } from './SearchableSelect';
import { syncStudentToSupabase, generateUUID, syncMutationToSupabase, syncPromotionToSupabase, syncGraduationToSupabase, deleteMutationFromSupabase, deletePromotionFromSupabase, deleteGraduationFromSupabase } from '../lib/supabaseClient';

interface SiswaViewProps {
  institution: Institution;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  mutations?: StudentMutation[];
  setMutations?: React.Dispatch<React.SetStateAction<StudentMutation[]>>;
  promotions?: ClassPromotion[];
  setPromotions?: React.Dispatch<React.SetStateAction<ClassPromotion[]>>;
  graduations?: StudentGraduation[];
  setGraduations?: React.Dispatch<React.SetStateAction<StudentGraduation[]>>;
  onAddClick: () => void;
  onEditClick: (student: Student) => void;
  onDeleteClick: (student: Student) => void;
  onResetPassword: (student: Student) => void;
  onViewDetail: (student: Student) => void;
  onImportStudents: (imported: Student[]) => void;
  addToast?: (message: string, action?: string, type?: 'success' | 'info' | 'error') => void;
  onPrintBiodata?: (config: { type: 'student' | 'class' | 'all'; studentId?: string; className?: string }) => void;
}

const romanToNum = (roman: string): number => {
  const r = roman.toUpperCase();
  if (r.startsWith('XII')) return 12;
  if (r.startsWith('XI')) return 11;
  if (r.startsWith('X')) return 10;
  if (r.startsWith('IX')) return 9;
  if (r.startsWith('VIII')) return 8;
  if (r.startsWith('VII')) return 7;
  if (r.startsWith('VI')) return 6;
  if (r.startsWith('V')) return 5;
  if (r.startsWith('IV')) return 4;
  if (r.startsWith('III')) return 3;
  if (r.startsWith('II')) return 2;
  if (r.startsWith('I')) return 1;
  return 0;
};

const parseKelas = (kelasStr: string | null | undefined): { isTanpaKelas: boolean; tingkat: number; rombel: string } => {
  if (!kelasStr) {
    return { isTanpaKelas: true, tingkat: Infinity, rombel: '' };
  }
  
  const cleanStr = kelasStr.trim();
  const lowerStr = cleanStr.toLowerCase();
  
  if (
    cleanStr === '' ||
    cleanStr === '-' ||
    lowerStr === 'belum ada kelas' ||
    lowerStr === 'tanpa kelas'
  ) {
    return { isTanpaKelas: true, tingkat: Infinity, rombel: '' };
  }
  
  // Ignore prefixes like "Kelas"
  let parsedStr = cleanStr.replace(/^kelas\s+/i, '');
  
  // Ignore spaces and hyphens
  parsedStr = parsedStr.replace(/[\s-]/g, '');
  
  // Try extracting number (tingkat)
  const numberMatch = parsedStr.match(/^(\d+)/);
  if (!numberMatch) {
    // Try Roman numerals
    const romanVal = romanToNum(parsedStr);
    if (romanVal > 0) {
      const remaining = parsedStr.replace(/^(I[VX]|V?I{1,3}|X[LC]||L?X{1,3})/i, '');
      return { isTanpaKelas: false, tingkat: romanVal, rombel: remaining.toUpperCase() };
    }
    return { isTanpaKelas: true, tingkat: Infinity, rombel: '' };
  }
  
  const tingkat = parseInt(numberMatch[1], 10);
  const rombel = parsedStr.substring(numberMatch[1].length).toUpperCase();
  
  return {
    isTanpaKelas: false,
    tingkat,
    rombel,
  };
};

export const SiswaView: React.FC<SiswaViewProps> = ({
  institution,
  students,
  setStudents,
  mutations = [],
  setMutations,
  promotions = [],
  setPromotions,
  graduations = [],
  setGraduations,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onResetPassword,
  onViewDetail,
  onImportStudents,
  addToast,
  onPrintBiodata,
}) => {
  const [activeTab, setActiveTab] = useState<'data_siswa' | 'mutasi' | 'alumni'>('data_siswa');
  const [searchTerm, setSearchTerm] = useState('');
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportTingkat, setExportTingkat] = useState('Semua Tingkat');
  const exportRef = useRef<HTMLDivElement>(null);

  const [importDropdownOpen, setImportDropdownOpen] = useState(false);
  const [activeImportType, setActiveImportType] = useState<'quick' | 'regular' | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalType, setPrintModalType] = useState<'search' | 'class' | 'all'>('search');
  const [selectedPrintStudent, setSelectedPrintStudent] = useState('');
  const [selectedPrintClass, setSelectedPrintClass] = useState('');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importDragActive, setImportDragActive] = useState(false);
  const [activeTabImportType, setActiveTabImportType] = useState<'quick' | 'regular'>('quick');
  
  const [importPreviewData, setImportPreviewData] = useState<{
    students: {
      student: Student;
      rowNum: number;
      errors: Record<string, string>;
      isValid: boolean;
    }[];
    totalRows: number;
    validCount: number;
    invalidCount: number;
    type: 'quick' | 'regular';
  } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importLoadingMsg, setImportLoadingMsg] = useState('');
  const [importSuccess, setImportSuccess] = useState<{ count: number; total: number } | null>(null);

  const [isMutationModalOpen, setIsMutationModalOpen] = useState(false);
  const [selectedMutationStudent, setSelectedMutationStudent] = useState<Student | null>(null);
  const [mutationForm, setMutationForm] = useState<{ jenis: string, tanggal: string, alasan: string, sekolah: string }>({
    jenis: 'Mutasi/Pindah', tanggal: new Date().toISOString().split('T')[0], alasan: '', sekolah: ''
  });

  const importRef = useRef<HTMLDivElement>(null);

  const tingkatOptions = React.useMemo(() => {
    const tingkats = new Set<string>();
    students.forEach(std => {
      const match = (std.kelas || '').match(/^(\d+|[IVX]+)/i);
      if (match) tingkats.add(match[1].toUpperCase());
    });
    const sorted = Array.from(tingkats).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
    return ['Semua Tingkat', ...sorted.map(t => `Kelas ${t}`), 'Tanpa Kelas'];
  }, [students]);
  const [classFilter, setClassFilter] = useState('Semua Kelas');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close active dropdown action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportModalOpen(false);
      }
      if (importRef.current && !importRef.current.contains(event.target as Node)) {
        setImportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  
  
  const handleOpenMutation = (std: Student) => {
    setActiveMenuId(null);
    setSelectedMutationStudent(std);
    setMutationForm({
      jenis: 'Mutasi/Pindah',
      tanggal: new Date().toISOString().split('T')[0],
      alasan: '',
      sekolah: ''
    });
    setIsMutationModalOpen(true);
  };

  const handleSaveMutation = async () => {
    if (!selectedMutationStudent) {
      addToast?.('Pilih siswa yang akan dimutasi terlebih dahulu', 'Peringatan', 'warning');
      return;
    }
    if (!setMutations) return;
    
    const newMut: StudentMutation = {
      id: generateUUID(),
      studentId: selectedMutationStudent.id,
      jenisMutasi: mutationForm.jenis as any,
      tanggal: mutationForm.tanggal,
      alasan: mutationForm.alasan,
      sekolahAsalTujuan: mutationForm.sekolah
    };

    setMutations(prev => [newMut, ...prev]);
    
    // Attempt sync
    syncMutationToSupabase(newMut).then(res => {
      if (!res.success) {
        addToast?.('Gagal sinkronisasi data mutasi ke cloud: ' + res.error, 'Peringatan', 'warning');
      }
    });

    // Update student status optionally based on jenis
    if (mutationForm.jenis === 'Keluar' || mutationForm.jenis === 'Mutasi/Pindah' || mutationForm.jenis === 'Dikeluarkan') {
      const updatedStd = { ...selectedMutationStudent, status: mutationForm.jenis as any };
      setStudents(prev => prev.map(s => s.id === updatedStd.id ? updatedStd : s));
      syncStudentToSupabase(updatedStd);
    } else if (mutationForm.jenis === 'Lulus') {
      const updatedStd = { ...selectedMutationStudent, status: 'Lulus' as any };
      setStudents(prev => prev.map(s => s.id === updatedStd.id ? updatedStd : s));
      syncStudentToSupabase(updatedStd);
    }
    
    addToast?.('Data mutasi berhasil disimpan!', 'Mutasi Siswa', 'success');
    setIsMutationModalOpen(false);
    setActiveTab('mutasi');
  };
  
  const formatDateForExcel = (dateString: string) => {
    if (!dateString) return '-';
    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const getAllTableHeaders = () => [
    'No', 'NISN', 'NIS', 'Nama Lengkap', 'Username', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Wali',
    'Status', 'NIK', 'Kewarganegaraan', 'Password', 'Jumlah Saudara', 'Anak Ke', 'Agama', 'Cita-Cita', 'No. HP', 'Email', 'Hobi', 'Pembiaya',
    'Nama Ayah', 'Status Ayah', 'WN Ayah', 'NIK Ayah', 'Tempat Lahir Ayah', 'Tanggal Lahir Ayah', 'Pendidikan Ayah', 'Pekerjaan Ayah', 'Penghasilan Ayah', 'HP Ayah',
    'Nama Ibu', 'Status Ibu', 'WN Ibu', 'NIK Ibu', 'Tempat Lahir Ibu', 'Tanggal Lahir Ibu', 'Pendidikan Ibu', 'Pekerjaan Ibu', 'Penghasilan Ibu', 'HP Ibu',
    'Status Wali', 'Nama Wali', 'WN Wali', 'NIK Wali', 'HP Wali', 'Pendidikan Wali', 'Pekerjaan Wali', 'Penghasilan Wali', 'Hubungan Wali',
    'Jalan', 'RT', 'RW', 'Kelurahan', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Kode Pos'
  ];

  const getAllTableData = (studentsList: typeof students) => {
    return studentsList.map((std, index) => {
      const s = (val: string | undefined | null) => {
        if (!val) return { t: 's', v: '-', z: '@' };
        return { t: 's', v: val, z: '@' };
      };
      
      return [
        { t: 'n', v: index + 1 },
        s(std.nisn), s(std.nis), s(std.nama), s(std.username), s(std.kelas), s(std.jk), s(std.tempatLahir), s(formatDateForExcel(std.tanggalLahir)), s(std.wali),
        s(std.status), s(std.nik), s(std.kewarganegaraan), s(std.password), s(std.jumlahSaudara), s(std.anakKe), s(std.agama), s(std.citaCita), s(std.hp), s(std.email), s(std.hoby), s(std.pembiaya),
        s(std.ayah?.nama), s(std.ayah?.status), s(std.ayah?.wn), s(std.ayah?.nik), s(std.ayah?.tempatLahir), s(formatDateForExcel(std.ayah?.tanggalLahir)), s(std.ayah?.pendidikan), s(std.ayah?.pekerjaan), s(std.ayah?.penghasilan), s(std.ayah?.hp),
        s(std.ibu?.nama), s(std.ibu?.status), s(std.ibu?.wn), s(std.ibu?.nik), s(std.ibu?.tempatLahir), s(formatDateForExcel(std.ibu?.tanggalLahir)), s(std.ibu?.pendidikan), s(std.ibu?.pekerjaan), s(std.ibu?.penghasilan), s(std.ibu?.hp),
        s(std.waliData?.statusWali), s(std.waliData?.nama), s(std.waliData?.wn), s(std.waliData?.nik), s(std.waliData?.hp), s(std.waliData?.pendidikan), s(std.waliData?.pekerjaan), s(std.waliData?.penghasilan), s(std.waliData?.hubungan),
        s(std.alamat?.ayah?.jalan), s(std.alamat?.ayah?.rt), s(std.alamat?.ayah?.rw), s(std.alamat?.ayah?.kel), s(std.alamat?.ayah?.kec), s(std.alamat?.ayah?.kab), s(std.alamat?.ayah?.prov), s(std.alamat?.ayah?.kodepos)
      ];
    });
  };

  
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    
    let studentsToExport = students;
    if (exportTingkat !== 'Semua Tingkat') {
      if (exportTingkat === 'Tanpa Kelas') {
        studentsToExport = students.filter(std => !std.kelas);
      } else {
        const t = exportTingkat.replace('Kelas ', '');
        studentsToExport = students.filter(std => {
          const match = (std.kelas || '').match(/^(\d+|[IVX]+)/i);
          return match && match[1].toUpperCase() === t;
        });
      }
    }

    const sheetsData: Record<string, typeof students> = {};
    
    studentsToExport.forEach(std => {
      let sheetName = std.kelas || 'Siswa Tanpa Kelas';
      if (std.status === 'Non-Aktif') sheetName = 'Siswa Non-Aktif';
      else if (std.status === 'Mutasi/Pindah') sheetName = 'Siswa Pindah';
      else if (std.status === 'Dikeluarkan') sheetName = 'Siswa Keluar';
      else if (std.status === 'Lulus') sheetName = 'Siswa Lulus';
      
      sheetName = sheetName.substring(0, 31);
      
      if (!sheetsData[sheetName]) sheetsData[sheetName] = [];
      sheetsData[sheetName].push(std);
    });

    if (Object.keys(sheetsData).length === 0) {
      alert('Tidak ada data untuk diekspor pada tingkat ini.');
      return;
    }

    Object.keys(sheetsData).forEach(sheetName => {
      const sheetStudents = sheetsData[sheetName];
      const headers = getAllTableHeaders();
      const data = getAllTableData(sheetStudents);
      
      const schoolName = institution?.name || 'Nama Sekolah';
      const schoolAddress = institution?.address || 'Alamat Sekolah';
      const schoolYear = institution?.academicYear || '';
      
      const kopRows = [
        [{ t: 's', v: schoolName }],
        [{ t: 's', v: schoolAddress }],
        [{ t: 's', v: `Data Siswa Tahun Ajaran ${schoolYear}` }],
        []
      ];
      
      const footerRows = [
        [],
        [{ t: 's', v: `Diekspor pada: ${exportDate}` }]
      ];
      
      const headerCells = headers.map(h => ({ 
        t: 's', 
        v: h,
        s: {
          fill: { fgColor: { rgb: "34D399" } },
          font: { bold: true, color: { rgb: "FFFFFF" } },
          alignment: { horizontal: "left", vertical: "center" }
        }
      }));

      const aoa = [
        ...kopRows,
        headerCells,
        ...data,
        ...footerRows
      ];
      
      const worksheet = XLSX.utils.aoa_to_sheet(aoa);
      
      const dataAndHeaders = [headers.map(h => ({v: h})), ...data];
      const max_widths = dataAndHeaders.reduce((acc: number[], row: any[]) => {
        row.forEach((cell, idx) => {
          const val = typeof cell === 'object' && cell !== null ? String(cell.v || '') : String(cell || '');
          acc[idx] = Math.max(acc[idx] || 0, val.length);
        });
        return acc;
      }, []);
      
      worksheet['!cols'] = max_widths.map(w => ({ wch: Math.max(w + 3, 11) }));

      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
        { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: headers.length - 1 } }
      ];
      worksheet['!merges'] = merges;
      
      worksheet['A1'].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "left" } };
      worksheet['A2'].s = { font: { sz: 11 }, alignment: { horizontal: "left" } };
      worksheet['A3'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "left" } };
      
      const footerCellRef = XLSX.utils.encode_cell({ r: aoa.length - 1, c: 0 });
      if(worksheet[footerCellRef]) {
        worksheet[footerCellRef].s = { font: { italic: true, sz: 10 }, alignment: { horizontal: "left" } };
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    
    XLSX.writeFile(workbook, "Data_Siswa.xlsx");
    setExportModalOpen(false);
  };

  const getTableDataForPDF = (studentsList: typeof students) => {
    return studentsList.map((std, index) => [
      index + 1,
      std.nisn || '-',
      std.nis || '-',
      std.nama || '-',
      std.jk === 'Laki-laki' ? 'L' : std.jk === 'Perempuan' ? 'P' : '-',
      std.kelas || '-',
      `${std.tempatLahir || '-'}, ${formatDateForExcel(std.tanggalLahir)}`,
      std.ayah?.nama || '-',
      std.ibu?.nama || '-',
      std.hp || '-',
      std.waliData?.hp || std.ayah?.hp || '-'
    ]);
  };

  const getTableHeadersForPDF = () => [
    'No', 'NISN', 'NIS', 'Nama Siswa', 'Jenis Kelamin', 'Kelas', 'Tempat, Tanggal Lahir', 'Nama Ayah', 'Nama Ibu', 'No.HP/WA Siswa', 'No.HP/WA Wali'
  ];

  const getBase64ImageFromUrl = async (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Canvas context null'));
        }
      };
      img.onerror = () => reject(new Error('Image load error'));
      img.src = url;
    });
  };

  const exportToPDF = async () => {
    let studentsToExport = students;
    if (exportTingkat !== 'Semua Tingkat') {
      if (exportTingkat === 'Tanpa Kelas') {
        studentsToExport = students.filter(std => !std.kelas);
      } else {
        const t = exportTingkat.replace('Kelas ', '');
        studentsToExport = students.filter(std => {
          const match = (std.kelas || '').match(/^(\d+|[IVX]+)/i);
          return match && match[1].toUpperCase() === t;
        });
      }
    }

    if (studentsToExport.length === 0) {
      alert('Tidak ada data untuk diekspor pada tingkat ini.');
      return;
    }

    const doc = new jsPDF('landscape');
    
    const kopSettings = institution?.kopSettings || {
      useColoredBackground: false,
      backgroundColor: '#f8fafc',
      separatorLineType: 'solid',
      useRoundedRectangle: false,
      showLogoLembaga: true,
      logoLembagaPosition: 'right',
      showLogoKemenag: false,
      logoKemenagPosition: 'left',
      showLogoKemdikbud: true,
      logoKemdikbudPosition: 'left',
      showOrganizer: true,
      showName: true,
      showAddress: true,
      showContact: true,
      alignment: 'center',
      useCustomText: false,
      customText: 'Teks Tambahan KOP',
      customTextSize: 10,
      customTextBold: false,
      customTextItalic: false,
      customTextPosition: 'bottom'
    };

    const leftLogos: string[] = [];
    const rightLogos: string[] = [];
    
    if (kopSettings.showLogoKemdikbud && institution?.kemdikbudLogo) (kopSettings.logoKemdikbudPosition === 'left' ? leftLogos : rightLogos).push(institution.kemdikbudLogo);
    if (kopSettings.showLogoKemenag && institution?.kemenagLogo) (kopSettings.logoKemenagPosition === 'left' ? leftLogos : rightLogos).push(institution.kemenagLogo);
    if (kopSettings.showLogoLembaga && institution?.logo) (kopSettings.logoLembagaPosition === 'left' ? leftLogos : rightLogos).push(institution.logo);

    let startY = 10;
    
    // Calculate align values
    let alignMethod: "center" | "left" | "right" = kopSettings.alignment === 'left' ? 'left' : (kopSettings.alignment === 'right' ? 'right' : 'center');
    let xPos = doc.internal.pageSize.getWidth() / 2;
    if (alignMethod === 'left') {
      xPos = 15 + (leftLogos.length * 25);
    } else if (alignMethod === 'right') {
      xPos = doc.internal.pageSize.getWidth() - 15 - (rightLogos.length * 25);
    }
    
    // Background Color
    if (kopSettings.useColoredBackground) {
      doc.setFillColor(kopSettings.backgroundColor);
      doc.rect(10, 5, doc.internal.pageSize.getWidth() - 20, 35, 'F');
    }

    const renderCustomTextPdf = (yPos: number) => {
      if (!kopSettings.useCustomText || !kopSettings.customText) return yPos;
      doc.setFontSize(kopSettings.customTextSize || 10);
      const fontStyle = kopSettings.customTextBold && kopSettings.customTextItalic 
        ? "bolditalic" 
        : kopSettings.customTextBold 
          ? "bold" 
          : kopSettings.customTextItalic 
            ? "italic" 
            : "normal";
      doc.setFont("helvetica", fontStyle);
      doc.text(kopSettings.customText, xPos, yPos, { align: alignMethod });
      return yPos + 5;
    };

    if (kopSettings.customTextPosition === 'top') startY = renderCustomTextPdf(startY + 6) - 6;

    if (kopSettings.showOrganizer && institution?.organizer) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(institution.organizer.toUpperCase(), xPos, startY + 6, { align: alignMethod });
      startY += 5;
    }

    if (kopSettings.customTextPosition === 'middle') startY = renderCustomTextPdf(startY + 6) - 6;

    if (kopSettings.showName) {
      const schoolName = institution?.name?.toUpperCase() || 'NAMA SEKOLAH';
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(schoolName, xPos, startY + 6, { align: alignMethod });
      startY += 6;
    }
    
    if (kopSettings.showAddress || kopSettings.showContact) {
      const parts = [];
      if (kopSettings.showAddress && institution?.address) parts.push(institution.address);
      if (kopSettings.showContact) {
        if (institution?.email) parts.push(`Email: ${institution.email}`);
        if (institution?.phone) parts.push(`Telp: ${institution.phone}`);
      }
      const schoolAddress = parts.join(' | ') || 'Alamat Sekolah';
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(schoolAddress, xPos, startY + 6, { align: alignMethod });
      startY += 5;
    }

    if (kopSettings.customTextPosition === 'bottom') startY = renderCustomTextPdf(startY + 6) - 6;

    startY += 5;
    
    // Ensure startY is at least 33 so the line is drawn below logos (which end at y=30)
    startY = Math.max(startY, 33);

    // Separator line or Rounded Rectangle
    if (kopSettings.useRoundedRectangle) {
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([2, 2], 0);
      doc.roundedRect(10, 5, doc.internal.pageSize.getWidth() - 20, Math.max(35, startY - 2), 3, 3, 'S');
      doc.setLineDashPattern([], 0); // reset
    } else if (kopSettings.separatorLineType !== 'none') {
      doc.setLineWidth(0.5);
      if (kopSettings.separatorLineType === 'dashed') {
        doc.setLineDashPattern([2, 2], 0);
        doc.line(10, startY, doc.internal.pageSize.getWidth() - 10, startY);
        doc.setLineDashPattern([], 0);
      } else if (kopSettings.separatorLineType === 'double') {
        doc.line(10, startY, doc.internal.pageSize.getWidth() - 10, startY);
        doc.line(10, startY + 1.5, doc.internal.pageSize.getWidth() - 10, startY + 1.5);
        startY += 1.5;
      } else {
        doc.line(10, startY, doc.internal.pageSize.getWidth() - 10, startY);
      }
    }
    
    // Logos
    for (let i = 0; i < leftLogos.length; i++) {
      try {
        const url = leftLogos[i];
        let b64 = url;
        if (!url.startsWith('data:image')) b64 = await getBase64ImageFromUrl(url);
        doc.addImage(b64, 'PNG', 15 + (i * 22), 10, 20, 20);
      } catch(e) { console.error('Failed to load left logo', e); }
    }

    for (let i = 0; i < rightLogos.length; i++) {
      try {
        const url = rightLogos[i];
        let b64 = url;
        if (!url.startsWith('data:image')) b64 = await getBase64ImageFromUrl(url);
        const rightX = doc.internal.pageSize.getWidth() - 35 - ((rightLogos.length - 1 - i) * 22);
        doc.addImage(b64, 'PNG', rightX, 10, 20, 20);
      } catch(e) { console.error('Failed to load right logo', e); }
    }

    startY += 10;
    
    const schoolYear = institution?.academicYear || '';
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Data Siswa Tahun Ajaran ${schoolYear} ${exportTingkat !== 'Semua Tingkat' ? '(' + exportTingkat + ')' : ''}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

    autoTable(doc, {
      startY: startY + 5,
      head: [getTableHeadersForPDF()],
      body: getTableDataForPDF(studentsToExport),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        4: { halign: 'center', cellWidth: 15 },
        5: { halign: 'center', cellWidth: 15 },
      },
      willDrawCell: function (data: any) {
        if (data.section === 'head') {
          data.cell.styles.lineColor = [255, 255, 255];
          data.cell.styles.lineWidth = {
            top: 0,
            bottom: 0,
            left: data.column.index === 0 ? 0 : 0.1,
            right: data.column.index === data.table.columns.length - 1 ? 0 : 0.1
          };
        }
      },
      didDrawPage: function (data: any) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        const str = `Diekspor pada: ${exportDate} - Halaman ${data.pageCount}`;
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });
    
    doc.save("Data_Siswa.pdf");
    setExportModalOpen(false);
  };

  const downloadTemplate = (type: 'quick' | 'regular') => {
    const workbook = XLSX.utils.book_new();
    
    // Headers
    const headers = type === 'quick' 
      ? ['No', 'Nama Lengkap', 'NIS', 'Password', 'Jenis Kelamin']
      : [
          'No', 'Nama Lengkap', 'NIS', 'Jenis Kelamin', 'NISN', 'Password',
          'NIK', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Ayah', 'Nama Ibu'
        ];
        
    // Dummy / Example data
    const dummyRows = type === 'quick'
      ? [
          [1, 'Ahmad Fauzi', '001234', 'pass123', 'Laki-laki'],
          [2, 'Siti Aminah', '001235', 'pass123', 'Perempuan']
        ]
      : [
          [1, 'Ahmad Fauzi', '001234', 'Laki-laki', '0123456789', 'pass123', '3201234567890123', 'Jakarta', '15/08/2010', 'Budi Fauzi', 'Siti Fauzi'],
          [2, 'Siti Aminah', '001235', 'Perempuan', '0123456790', 'pass123', '3201234567890124', 'Bandung', '22/04/2011', 'Hasan Amin', 'Nur Aminah']
        ];

    // Build the aoa array with style-friendly cells
    const headerCells = headers.map(h => {
      let comments: any = undefined;
      if (h === 'NIS') {
        comments = [{ a: 'Sistem', t: 'Terdiri dari 6 angka' }];
        comments.hidden = true;
      } else if (h === 'NISN') {
        comments = [{ a: 'Sistem', t: 'Terdiri dari 10 angka' }];
        comments.hidden = true;
      } else if (h === 'NIK') {
        comments = [{ a: 'Sistem', t: 'Terdiri dari 16 angka' }];
        comments.hidden = true;
      }

      return {
        t: 's',
        v: h,
        c: comments,
        s: {
          fill: { fgColor: { rgb: "0F172A" } }, // Slate 900
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
          alignment: { horizontal: "left", vertical: "center" }
        }
      };
    });
    
    const dataCells = dummyRows.map(row => row.map((val, idx) => {
      // In quick, NIS is at index 2.
      // In regular, NIS is at index 2, NISN at index 4, NIK at index 6.
      const isCode = type === 'quick'
        ? idx === 2
        : (idx === 2 || idx === 4 || idx === 6);

      // Force code columns to be stored strictly as text cells 's' with '@' format,
      // so Excel respects leading zeros and does not show scientific notation.
      if (isCode) {
        return {
          t: 's',
          v: String(val),
          z: '@',
          s: {
            font: { sz: 10 },
            alignment: { horizontal: "left", vertical: "center" }
          }
        };
      }

      const isNum = typeof val === 'number';
      return {
        t: isNum ? 'n' : 's',
        v: String(val),
        s: {
          font: { sz: 10 },
          alignment: { horizontal: "left", vertical: "center" }
        }
      };
    }));
    
    const aoa = [headerCells, ...dataCells];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    
    // Auto-fit column widths
    const max_widths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      dummyRows.forEach(row => {
        const valStr = String(row[colIdx] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return maxLen;
    });
    
    worksheet['!cols'] = max_widths.map(w => ({ wch: Math.max(w + 3, 12) }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'quick' ? 'Template Cepat' : 'Template Lengkap');
    XLSX.writeFile(workbook, `Template_Import_Siswa_${type === 'quick' ? 'Cepat' : 'Lengkap'}.xlsx`);
    setImportDropdownOpen(false);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportType) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;

        // Read workbook (supports Excel and CSV automatically)
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to array of arrays (header: 1 forces array of arrays)
        const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        if (rows.length < 2) {
          alert('Format file tidak valid (kosong atau kurang dari 2 baris).');
          return;
        }

        const headers = rows[0].map(h => String(h || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' '));
        const previewStudents: {
          student: Student;
          rowNum: number;
          errors: Record<string, string>;
          isValid: boolean;
        }[] = [];

        // Identify column indices based on various possible names (case-insensitive)
        const idxNama = headers.findIndex(h => h === 'nama lengkap' || h === 'nama' || h.includes('nama lengkap') || h.includes('student name') || (h.includes('nama') && !h.includes('ayah') && !h.includes('ibu') && !h.includes('wali')));
        const idxNis = headers.findIndex(h => h === 'nis' || (h.includes('nis') && !h.includes('nisn')));
        const idxJk = headers.findIndex(h => h === 'jenis kelamin' || h === 'jk' || h.includes('jenis kelamin') || h.includes('jk') || h.includes('gender'));
        const idxPassword = headers.findIndex(h => h === 'password' || h === 'sandi' || h.includes('password') || h.includes('sandi'));
        const idxNisn = headers.findIndex(h => h === 'nisn' || h.includes('nisn'));
        
        // Extra fields for Regular Import
        const idxNik = headers.findIndex(h => h === 'nik' || (h.includes('nik') && !h.includes('ayah') && !h.includes('ibu')));
        const idxTempatLahir = headers.findIndex(h => h === 'tempat lahir' || h.includes('tempat lahir') || h.includes('tempat'));
        const idxTanggalLahir = headers.findIndex(h => h === 'tanggal lahir' || h.includes('tanggal lahir') || h.includes('tanggal'));
        const idxNamaAyah = headers.findIndex(h => h === 'nama ayah' || h === 'ayah' || h.includes('nama ayah') || h.includes('ayah'));
        const idxNamaIbu = headers.findIndex(h => h === 'nama ibu' || h === 'ibu' || h.includes('nama ibu') || h.includes('ibu'));

        // Validate headers based on import type
        if (activeImportType === 'quick') {
          const missingQuick: string[] = [];
          if (idxNama === -1) missingQuick.push('Nama Lengkap');
          if (idxNis === -1) missingQuick.push('NIS');
          if (idxPassword === -1) missingQuick.push('Password');
          if (idxJk === -1) missingQuick.push('Jenis Kelamin');

          if (missingQuick.length > 0) {
            alert(`Impor Cepat membutuhkan kolom berikut yang tidak ditemukan: ${missingQuick.join(', ')}`);
            return;
          }
        } else {
          // Regular
          const missingRegular: string[] = [];
          if (idxNama === -1) missingRegular.push('Nama Lengkap');
          if (idxNis === -1) missingRegular.push('NIS');
          if (idxJk === -1) missingRegular.push('Jenis Kelamin');
          if (idxPassword === -1) missingRegular.push('Password');
          if (idxNik === -1) missingRegular.push('NIK');
          if (idxTempatLahir === -1) missingRegular.push('Tempat Lahir');
          if (idxTanggalLahir === -1) missingRegular.push('Tanggal Lahir');
          if (idxNamaAyah === -1) missingRegular.push('Nama Ayah');
          if (idxNamaIbu === -1) missingRegular.push('Nama Ibu');

          if (missingRegular.length > 0) {
            alert(`Impor Lengkap membutuhkan kolom berikut yang tidak ditemukan: ${missingRegular.join(', ')}`);
            return;
          }
        }

        const parsedNis = new Set<string>();

        // Parse rows
        for (let i = 1; i < rows.length; i++) {
          const columns = rows[i];
          if (!columns || columns.length === 0) continue;

          const getVal = (idx: number, fallback = '') => {
            if (idx < 0 || idx >= columns.length) return fallback;
            const val = columns[idx];
            if (val === undefined || val === null) return fallback;
            return String(val).trim();
          };

          const nama = getVal(idxNama);
          let nis = getVal(idxNis).replace(/\s+/g, '');
          if (nis && /^\d+$/.test(nis) && nis.length < 6) {
            nis = nis.padStart(6, '0');
          }
          const jkRaw = getVal(idxJk).toLowerCase();
          
          // Basic check to skip empty rows
          if (!nama && !nis && !jkRaw) {
            continue;
          }

          const rowErrors: Record<string, string> = {};

          if (!nama) {
            rowErrors.nama = 'Nama Lengkap wajib diisi';
          }

          if (!nis) {
            rowErrors.nis = 'NIS wajib diisi';
          } else if (!/^\d+$/.test(nis)) {
            rowErrors.nis = 'NIS harus berupa angka';
          } else if (nis.length !== 6) {
            rowErrors.nis = 'NIS harus terdiri dari 6 angka';
          } else if (students.some((s) => s.nis === nis)) {
            rowErrors.nis = 'NIS telah terpakai!';
          } else if (parsedNis.has(nis)) {
            rowErrors.nis = 'NIS ganda dalam file!';
          } else {
            parsedNis.add(nis);
          }

          let nisn = getVal(idxNisn).replace(/\s+/g, '');
          if (nisn && /^\d+$/.test(nisn) && nisn.length < 10) {
            nisn = nisn.padStart(10, '0');
          }
          if (nisn) {
            if (!/^\d+$/.test(nisn)) {
              rowErrors.nisn = 'NISN harus berupa angka';
            } else if (nisn.length !== 10) {
              rowErrors.nisn = 'NISN harus terdiri dari 10 angka';
            }
          }

          const jk: 'Laki-laki' | 'Perempuan' = (jkRaw.includes('p') || jkRaw.includes('wanita') || jkRaw.includes('female') || jkRaw.includes('perempuan')) ? 'Perempuan' : 'Laki-laki';
          if (!jkRaw) {
            rowErrors.jk = 'Jenis Kelamin wajib diisi';
          }

          // Additional fields for Regular
          let nik = '';
          let tempatLahir = '';
          let tanggalLahir = '';
          let namaAyah = '';
          let namaIbu = '';

          if (activeImportType === 'regular') {
            let nikVal = getVal(idxNik).replace(/\s+/g, '');
            if (nikVal && /^\d+$/.test(nikVal) && nikVal.length < 16) {
              nikVal = nikVal.padStart(16, '0');
            }
            nik = nikVal;
            if (!nik) {
              rowErrors.nik = 'NIK wajib diisi';
            } else if (!/^\d+$/.test(nik)) {
              rowErrors.nik = 'NIK harus berupa angka';
            } else if (nik.length !== 16) {
              rowErrors.nik = 'NIK harus terdiri dari 16 angka';
            }

            tempatLahir = getVal(idxTempatLahir);
            if (!tempatLahir) {
              rowErrors.tempatLahir = 'Tempat Lahir wajib diisi';
            }
            
            const rawDate = getVal(idxTanggalLahir);
            if (rawDate) {
              if (/^\d+$/.test(rawDate)) {
                // Excel date serial number
                const dateObj = XLSX.SSF.parse_date_code(Number(rawDate));
                if (dateObj) {
                  const d = String(dateObj.d).padStart(2, '0');
                  const m = String(dateObj.m).padStart(2, '0');
                  const y = dateObj.y;
                  tanggalLahir = `${y}-${m}-${d}`;
                } else {
                  tanggalLahir = rawDate;
                }
              } else {
                const partsSlash = rawDate.split('/');
                const partsDash = rawDate.split('-');
                if (partsSlash.length === 3) {
                  const [day, month, year] = partsSlash;
                  // If dd/mm/yyyy
                  if (day.length <= 2 && year.length === 4) {
                    tanggalLahir = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  } else if (year.length <= 2 && day.length === 4) {
                    // yyyy/mm/dd
                    tanggalLahir = `${day}-${month.padStart(2, '0')}-${year.padStart(2, '0')}`;
                  } else {
                    tanggalLahir = rawDate;
                  }
                } else if (partsDash.length === 3) {
                  if (partsDash[0].length === 4) {
                    tanggalLahir = rawDate;
                  } else {
                    const [day, month, year] = partsDash;
                    tanggalLahir = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
                } else {
                  tanggalLahir = rawDate;
                }
              }
            }
            
            namaAyah = getVal(idxNamaAyah);
            namaIbu = getVal(idxNamaIbu);

            if (!tanggalLahir) rowErrors.tanggalLahir = 'Tanggal Lahir wajib diisi/format tidak valid';
            if (!namaAyah) rowErrors.namaAyah = 'Nama Ayah wajib diisi';
            if (!namaIbu) rowErrors.namaIbu = 'Nama Ibu wajib diisi';
          }

          const studentId = generateUUID();
          const username = nis ? nis.toLowerCase() : `std_${studentId.substring(0, 8)}`;
          const password = getVal(idxPassword) || 'password123';
          const hp = '';
          const email = '';
          const agama = 'Islam';
          const kelas = '';

          const newStudent: Student = {
            id: studentId,
            nama,
            nis,
            nisn,
            username,
            kelas,
            jk,
            tempatLahir,
            tanggalLahir,
            wali: namaAyah || namaIbu || '',
            status: 'Aktif',
            nik,
            kewarganegaraan: 'WNI',
            password,
            jumlahSaudara: '',
            anakKe: '',
            agama,
            citaCita: '',
            hp,
            email,
            hoby: '',
            pembiaya: 'Orang Tua',
            foto: '',
            ayah: {
              nama: namaAyah,
              status: 'Masih Hidup',
              wn: 'WNI',
              nik: '',
              tempatLahir: '',
              tanggalLahir: '',
              pendidikan: '',
              pekerjaan: '',
              penghasilan: '',
              hp: ''
            },
            ibu: {
              nama: namaIbu,
              status: 'Masih Hidup',
              wn: 'WNI',
              nik: '',
              tempatLahir: '',
              tanggalLahir: '',
              pendidikan: '',
              pekerjaan: '',
              penghasilan: '',
              hp: ''
            },
            waliData: {
              statusWali: 'Sama dengan ayah kandung',
              nama: namaAyah,
              wn: 'WNI',
              nik: '',
              hp: '',
              pendidikan: '',
              pekerjaan: '',
              penghasilan: '',
              hubungan: 'Ayah Kandung'
            },
            alamat: {
              ayah: { kepemilikan: '', prov: '', kab: '', kec: '', kel: '', rt: '', rw: '', kodepos: '', jalan: '' },
              ibu: { samaDenganAyah: true, kepemilikan: '', prov: '', kab: '', kec: '', kel: '', rt: '', rw: '', kodepos: '', jalan: '' },
              wali: { statusAlamatWali: 'Sama dengan ayah kandung', kepemilikan: '', prov: '', kab: '', kec: '', kel: '', rt: '', rw: '', kodepos: '', jalan: '' },
              domisili: { statusTempatTinggal: '', jarak: '', transportasi: '', waktuTempuh: '' }
            }
          };

          const isValid = Object.keys(rowErrors).length === 0;

          previewStudents.push({
            student: newStudent,
            rowNum: i + 1,
            errors: rowErrors,
            isValid
          });
        }

        if (previewStudents.length === 0) {
          alert('Tidak ada data baris siswa yang ditemukan di file.');
          return;
        }

        setImportPreviewData({
          students: previewStudents,
          totalRows: previewStudents.length,
          validCount: previewStudents.filter(s => s.isValid).length,
          invalidCount: previewStudents.filter(s => !s.isValid).length,
          type: activeImportType
        });
      } catch (err) {
        console.error(err);
        alert('Gagal memproses file. Pastikan format file benar (.xlsx, .xls, .csv).');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSaveImport = async () => {
    if (!importPreviewData) return;
    
    // Filter only valid students
    const validRows = importPreviewData.students.filter(s => s.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada data siswa valid untuk diimpor.');
      return;
    }

    setImportLoading(true);
    setImportPreviewData(null); // Close preview modal

    const totalToImport = validRows.length;
    let successCount = 0;
    let failedCount = 0;
    let syncErrorMsg = '';

    const studentsToSave: Student[] = [];

    for (let i = 0; i < totalToImport; i++) {
      const { student } = validRows[i];
      setImportLoadingMsg(`Mengirim ${i + 1} dari ${totalToImport} data siswa...`);
      studentsToSave.push(student);
      
      try {
        const res = await syncStudentToSupabase(student, true);
        if (res.success) {
          successCount++;
        } else {
          failedCount++;
          if (res.error) syncErrorMsg = res.error;
        }
      } catch (err: any) {
        failedCount++;
        syncErrorMsg = err.message || 'Kesalahan Jaringan';
      }
    }

    // Save to local React state
    onImportStudents(studentsToSave);

    setImportLoading(false);
    setImportSuccess({ count: totalToImport, total: totalToImport });

    if (failedCount > 0 && addToast) {
      addToast(
        `Berhasil impor ${totalToImport} siswa ke sistem lokal, namun ${failedCount} data gagal dikirim ke Supabase Cloud. ${syncErrorMsg ? 'Detail: ' + syncErrorMsg : 'Periksa koneksi atau skema database Anda.'}`,
        'Database Sync',
        'error'
      );
    } else if (addToast) {
      addToast(`Seluruh ${successCount} data siswa berhasil disinkronkan ke Supabase Cloud!`, 'Database Sync', 'success');
    }
  };

  // Filter students
  const filteredStudents = (students || []).filter((std) => {
    if (!std) return false;
    const nameStr = std.nama || '';
    const nisStr = std.nis || '';
    const nisnStr = std.nisn || '';
    const matchesSearch =
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nisStr.includes(searchTerm) ||
      nisnStr.includes(searchTerm) ||
      (std.username && std.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesClass =
      classFilter === 'Semua Kelas' ||
      (classFilter === 'Belum Ada Kelas' && (!std.kelas || std.kelas === '-' || std.kelas.trim() === '')) ||
      std.kelas === classFilter;

    const matchesStatus =
      statusFilter === 'Semua Status' || std.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Sort according to requested rules:
  // 1. Prioritas 1 (Siswa Berkelas vs Tanpa Kelas): Siswa yang memiliki kelas selalu di atas siswa yang tidak memiliki kelas.
  // 2. Prioritas 2 (Tingkat Kelas): Urutkan Ascending berdasarkan angka (1, 2, 3... 7, 8, 9).
  // 3. Prioritas 3 (Rombel): Urutkan Ascending berdasarkan huruf (A, B, C). Jika sebuah kelas tidak punya rombel (misal hanya "7"), letakkan sebelum "7A".
  // 4. Prioritas 4 (Nama Siswa): Urutkan Ascending (A-Z).
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const classA = parseKelas(a.kelas);
    const classB = parseKelas(b.kelas);

    // Prioritas 1: Siswa Berkelas vs Tanpa Kelas
    if (classA.isTanpaKelas !== classB.isTanpaKelas) {
      return classA.isTanpaKelas ? 1 : -1;
    }

    if (!classA.isTanpaKelas) {
      // Prioritas 2: Tingkat Kelas
      if (classA.tingkat !== classB.tingkat) {
        return classA.tingkat - classB.tingkat;
      }

      // Prioritas 3: Rombel
      if (classA.rombel !== classB.rombel) {
        if (classA.rombel === '') return -1;
        if (classB.rombel === '') return 1;
        return classA.rombel.localeCompare(classB.rombel, 'id');
      }
    }

    // Prioritas 4: Nama Siswa (A-Z)
    return a.nama.localeCompare(b.nama, 'id');
  });

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedStudents = sortedStudents.slice(startIndex, startIndex + limit);

  // Extract unique classes for the filter dropdown
  const uniqueClasses = (Array.from(new Set(students.map((s) => s.kelas).filter(k => k && k !== '-'))) as string[]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="animate-fade-in block" ref={menuRef}>
      {/* Tabs Menu */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-2xl mb-6 overflow-x-auto w-full scrollbar-none">
        {[
          { id: 'data_siswa', label: 'Data Siswa' },
          { id: 'mutasi', label: 'Mutasi' },
          { id: 'alumni', label: 'Alumni' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 shrink-0 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'data_siswa' && (
        <>
      {/* Toolbar Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 mb-6 shadow-sm space-y-4">
        {/* Row 1: Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input on the Left */}
          <div className="search-input-wrapper w-full md:max-w-xs lg:max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama/NIS siswa..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input w-full py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-900 transition-all text-slate-700"
            />
          </div>

          {/* Filters on the Right (Status, Class, Row Limit) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 w-full md:w-auto">
            <div className="w-full min-w-[140px]">
              <SearchableSelect
                showSearch={false}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val || 'Semua Status');
                  setCurrentPage(1);
                }}
                options={['Semua Status', 'Aktif', 'Non-Aktif', 'Lulus', 'Mutasi/Pindah', 'Dikeluarkan']}
                placeholder="Semua Status"
              />
            </div>
            <div className="w-full min-w-[140px]">
              <SearchableSelect
                showSearch={false}
                value={classFilter}
                onChange={(val) => {
                  setClassFilter(val || 'Semua Kelas');
                  setCurrentPage(1);
                }}
                options={['Semua Kelas', 'Belum Ada Kelas', ...uniqueClasses]}
                placeholder="Semua Kelas"
              />
            </div>
            <div className="w-full min-w-[140px]">
              <SearchableSelect
                showSearch={false}
                value={`${limit} Baris`}
                onChange={(val) => {
                  const num = parseInt(val.replace(/\D/g, ''), 10);
                  setLimit(isNaN(num) ? 10 : num);
                  setCurrentPage(1);
                }}
                options={['5 Baris', '10 Baris', '25 Baris', '50 Baris']}
                placeholder="Baris"
              />
            </div>
          </div>
        </div>

        {/* Row 2: CSV Operations & Add Student */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Operations: Import/Export/Print */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Import Button with Modal */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <FileUp className="w-4 h-4 mr-2 text-slate-500" />
              <span>Impor</span>
            </button>

            {/* Export Button with Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportModalOpen(!exportModalOpen)}
                className="flex-1 sm:flex-initial bg-slate-900 border border-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-sm"
              >
                <FileDown className="w-4 h-4 mr-2" />
                <span>Ekspor</span>
              </button>

              {exportModalOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-fade-in space-y-3">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Pilih Tingkat Kelas
                    </label>
                    <SearchableSelect
                      value={exportTingkat}
                      onChange={(val) => setExportTingkat(val)}
                      options={tingkatOptions}
                      placeholder="Pilih Tingkat Kelas"
                      showSearch={false}
                      isClearable={false}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={exportToExcel}
                      className="w-full bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Table className="w-3.5 h-3.5 mr-1.5" />
                      Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full bg-rose-50 text-rose-700 px-3 py-2 rounded-xl font-bold text-xs hover:bg-rose-100 transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cetak Biodata Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 mr-2 text-slate-500" />
              <span>Cetak Biodata</span>
            </button>
          </div>

          {/* Add Student Button */}
          <button
            onClick={onAddClick}
            className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 shadow-sm transition-all flex items-center justify-center cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>


      {/* Mobile Card List View (Visible on mobile, hidden on desktop) */}
      <div className="md:hidden space-y-4 mb-6">
        {paginatedStudents.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 font-semibold shadow-sm">
            Tidak ada data siswa ditemukan
          </div>
        ) : (
          paginatedStudents.map((std, index) => {
            const isMenuOpen = activeMenuId === std.id;
            return (
              <div key={std.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{std.nama}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">NIS: {std.nis || '-'} | NISN: {std.nisn || '-'}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${
                      std.status === 'Aktif' || std.status === 'Lulus'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {std.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Kelas</span>
                    <p className="font-bold text-slate-700 mt-0.5">
                      {std.kelas && std.kelas !== '-' ? std.kelas : (
                        <span className="text-slate-400 font-medium text-[11px]">Belum Masuk Kelas</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Ortu (Ayah/Ibu)</span>
                    <p className="font-semibold text-slate-700 mt-0.5 truncate">{std.ayah?.nama || std.ibu?.nama || '-'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Aksi:</span>
                  <div className="flex space-x-1.5 items-center">
                    <button
                      onClick={() => onViewDetail(std)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      title="Detail"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => onEditClick(std)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => handleToggleMenu(std.id, e)}
                        className={`w-7 h-7 flex items-center justify-center border rounded-lg transition-all cursor-pointer ${
                          isMenuOpen ? 'border-emerald-400 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <MoreVertical size={14} strokeWidth={2.5} />
                      </button>
                      
                      {isMenuOpen && (
                        <div className="absolute right-0 bottom-full mb-2 bg-white border border-slate-100 rounded-xl shadow-xl z-50 min-w-[200px] p-1.5 space-y-1 block animate-fade-in text-left">
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onResetPassword(std);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer text-left"
                          >
                            <span>Reset Password Siswa</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                            onClick={() => handleOpenMutation(std)}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-blue-600 font-semibold text-xs transition-colors cursor-pointer text-left"
                          >
                            <span>Mutasikan</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteClick(std);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer text-left"
                          >
                            <span>Hapus Data</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table Container (Visible on desktop, hidden on mobile) */}
      <div className="hidden md:block custom-table-container shadow-sm scrollbar-hide relative mb-6">
        <table className="custom-table w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12 text-center">No</th>
              <th>NISN</th>
              <th>NIS</th>
              <th>Nama Siswa</th>
              <th>Kelas</th>
              <th>Jenis Kelamin</th>
              <th>Tempat, Tanggal Lahir</th>
              <th>Nama Ayah</th>
              <th>Nama Ibu</th>
              <th>Status</th>
              <th className="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-20 text-slate-400 font-semibold">
                  Tidak ada data siswa ditemukan
                </td>
              </tr>
            ) : (
              paginatedStudents.map((std, index) => {
                const globalIndex = startIndex + index + 1;
                const isMenuOpen = activeMenuId === std.id;
                return (
                  <tr key={std.id} className="transition-colors">
                    <td className="text-center font-bold text-slate-400">{globalIndex}</td>
                    <td className="font-bold text-slate-800">{std.nisn || '-'}</td>
                    <td className="font-medium text-slate-600">{std.nis || '-'}</td>
                    <td className="font-bold text-slate-800">{std.nama}</td>
                    <td>
                      {std.kelas && std.kelas !== '-' ? (
                        <span className="font-bold text-slate-700">{std.kelas}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200/50 rounded-full text-[10px] font-bold uppercase whitespace-nowrap">
                          Belum Masuk Kelas
                        </span>
                      )}
                    </td>
                    <td className="text-center font-semibold text-slate-700">
                      {std.jk === 'Laki-laki' ? 'L' : (std.jk === 'Perempuan' ? 'P' : std.jk)}
                    </td>
                    <td className="whitespace-normal leading-relaxed">
                      {std.tempatLahir ? `${std.tempatLahir}, ` : ''}
                      {std.tanggalLahir
                        ? new Date(std.tanggalLahir).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '-'}
                    </td>
                    <td className="font-medium text-slate-700">{std.ayah?.nama || '-'}</td>
                    <td className="font-medium text-slate-700">{std.ibu?.nama || '-'}</td>
                    <td>
                      <span
                        className={`px-3 py-1 text-[10px] font-black uppercase rounded-full ${
                          std.status === 'Aktif' || std.status === 'Lulus'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {std.status}
                      </span>
                    </td>
                    <td className="relative text-center">
                      {/* Vertical three dots button */}
                      <button
                        onClick={(e) => handleToggleMenu(std.id, e)}
                        className={`w-8 h-8 flex items-center justify-center bg-white border rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm mx-auto cursor-pointer focus:outline-none ${
                          isMenuOpen ? 'border-slate-900 text-slate-800 bg-slate-50' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        <MoreVertical className="w-5 h-5 stroke-[2.5]" />
                      </button>

                      {/* Dropdown Action Menu (positioned perfectly relative to row) */}
                      {isMenuOpen && (
                        <div className="absolute right-12 top-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 min-width-[230px] p-2 space-y-1 block animate-fade-in text-left">
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onViewDetail(std);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors group cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <Eye size={14} strokeWidth={2.5} />
                            </div>
                            <span>Detail Lengkap</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onEditClick(std);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors group cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              <Edit3 size={14} strokeWidth={2.5} />
                            </div>
                            <span>Edit Data</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1 mx-2"></div>

                           <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onResetPassword(std);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors group cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              <Key size={14} strokeWidth={2.5} />
                            </div>
                            <span>Reset Password Siswa</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1 mx-2"></div>

                          <button
                            onClick={() => handleOpenMutation(std)}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 font-semibold text-xs transition-colors group cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                              <ArrowRightLeft size={14} strokeWidth={2.5} />
                            </div>
                            <span>Mutasikan Siswa</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1 mx-2"></div>

                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteClick(std);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-semibold text-xs transition-colors group cursor-pointer text-left"
                          >
                            <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-colors">
                              <Trash2 size={14} strokeWidth={2.5} />
                            </div>
                            <span>Hapus Data</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Section (Shared for Desktop & Mobile) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menampilkan {paginatedStudents.length} dari {filteredStudents.length} siswa
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs cursor-pointer ${
                currentPage === i + 1
                  ? 'bg-teal-600 text-white'
                  : 'border border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {importPreviewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setImportPreviewData(null)}></div>
          <div className="bg-white rounded-[1.5rem] w-full max-w-5xl h-[85vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50 border border-slate-100">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Review Import Excel - Data Siswa</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tipe Impor: {importPreviewData.type === 'quick' ? 'Impor Cepat' : 'Impor Lengkap'} | Total {importPreviewData.totalRows} baris
                </p>
              </div>
              <button onClick={() => setImportPreviewData(null)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              {/* Alert status summary */}
              {importPreviewData.invalidCount > 0 ? (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-800">Ditemukan {importPreviewData.invalidCount} Baris Bermasalah</h4>
                    <p className="text-xs text-rose-600 mt-1">
                      Beberapa baris data tidak memenuhi syarat input. Baris yang memiliki sel berwarna merah memuat kesalahan di bawah sel tersebut. Silakan perbaiki file Excel Anda atau Anda dapat menyimpan data yang valid saja.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-800">Seluruh Data Valid!</h4>
                    <p className="text-xs text-emerald-600 mt-1">
                      Seluruh {importPreviewData.validCount} baris data valid dan siap disimpan ke sistem.
                    </p>
                  </div>
                </div>
              )}

              {/* Data review table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 pl-4 w-12 text-center">Baris</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">NIS</th>
                        <th className="p-3">NISN</th>
                        <th className="p-3">Jenis Kelamin</th>
                        {importPreviewData.type === 'regular' && (
                          <>
                            <th className="p-3">NIK</th>
                            <th className="p-3">Tempat Lahir</th>
                            <th className="p-3">Tanggal Lahir</th>
                            <th className="p-3">Nama Ayah</th>
                            <th className="p-3">Nama Ibu</th>
                          </>
                        )}
                        <th className="p-3 pr-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreviewData.students.map((row, idx) => {
                        const { student, rowNum, errors, isValid } = row;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${!isValid ? 'bg-rose-50/20' : ''}`}>
                            <td className="p-3 pl-4 font-mono text-center text-xs text-slate-400 font-bold">
                              {rowNum}
                            </td>
                            
                            {/* Nama Lengkap */}
                            <td className={`p-3 text-xs ${errors.nama ? 'bg-rose-50/50' : ''}`}>
                              <div className="font-semibold text-slate-800">{student.nama || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.nama && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.nama}
                                </div>
                              )}
                            </td>

                            {/* NIS */}
                            <td className={`p-3 text-xs ${errors.nis ? 'bg-rose-50/50' : ''}`}>
                              <div className="font-semibold text-slate-800">{student.nis || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.nis && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.nis}
                                </div>
                              )}
                            </td>

                            {/* NISN */}
                            <td className={`p-3 text-xs ${errors.nisn ? 'bg-rose-50/50' : ''}`}>
                              <div className="text-slate-600">{student.nisn || <span className="text-slate-300">-</span>}</div>
                              {errors.nisn && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.nisn}
                                </div>
                              )}
                            </td>

                            {/* Jenis Kelamin */}
                            <td className={`p-3 text-xs ${errors.jk ? 'bg-rose-50/50' : ''}`}>
                              <div className="text-slate-600">{student.jk}</div>
                              {errors.jk && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.jk}
                                </div>
                              )}
                            </td>

                            {importPreviewData.type === 'regular' && (
                              <>
                                {/* NIK */}
                                <td className={`p-3 text-xs ${errors.nik ? 'bg-rose-50/50' : ''}`}>
                                  <div className="text-slate-600">{student.nik || <span className="italic text-rose-400">Kosong</span>}</div>
                                  {errors.nik && (
                                    <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                      <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                      {errors.nik}
                                    </div>
                                  )}
                                </td>

                                {/* Tempat Lahir */}
                                <td className={`p-3 text-xs ${errors.tempatLahir ? 'bg-rose-50/50' : ''}`}>
                                  <div className="text-slate-600">{student.tempatLahir || <span className="italic text-rose-400">Kosong</span>}</div>
                                  {errors.tempatLahir && (
                                    <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                      <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                      {errors.tempatLahir}
                                    </div>
                                  )}
                                </td>

                                {/* Tanggal Lahir */}
                                <td className={`p-3 text-xs ${errors.tanggalLahir ? 'bg-rose-50/50' : ''}`}>
                                  <div className="text-slate-600">{student.tanggalLahir || <span className="italic text-rose-400">Kosong</span>}</div>
                                  {errors.tanggalLahir && (
                                    <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                      <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                      {errors.tanggalLahir}
                                    </div>
                                  )}
                                </td>

                                {/* Nama Ayah */}
                                <td className={`p-3 text-xs ${errors.namaAyah ? 'bg-rose-50/50' : ''}`}>
                                  <div className="text-slate-600">{student.ayah?.nama || <span className="italic text-rose-400">Kosong</span>}</div>
                                  {errors.namaAyah && (
                                    <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                      <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                      {errors.namaAyah}
                                    </div>
                                  )}
                                </td>

                                {/* Nama Ibu */}
                                <td className={`p-3 text-xs ${errors.namaIbu ? 'bg-rose-50/50' : ''}`}>
                                  <div className="text-slate-600">{student.ibu?.nama || <span className="italic text-rose-400">Kosong</span>}</div>
                                  {errors.namaIbu && (
                                    <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                      <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                      {errors.namaIbu}
                                    </div>
                                  )}
                                </td>
                              </>
                            )}

                            {/* Status */}
                            <td className="p-3 pr-4 text-center">
                              {isValid ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                  Valid
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100">
                                  Error
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex justify-between items-center flex-shrink-0">
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-semibold text-slate-500">
                  Data Valid: <span className="text-emerald-600 font-bold">{importPreviewData.validCount}</span> | Error: <span className="text-rose-600 font-bold">{importPreviewData.invalidCount}</span>
                </span>
                {importPreviewData.invalidCount > 0 && (
                  <span className="text-[10px] text-amber-600 font-bold mt-1">
                    *Terdapat data tidak valid. Hanya data valid yang akan disimpan ke sistem.
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImportPreviewData(null)} className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  onClick={handleSaveImport}
                  disabled={importPreviewData.validCount === 0}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center cursor-pointer"
                >
                  {importPreviewData.invalidCount > 0 ? 'Impor Data Valid Saja' : 'Simpan Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {importLoading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl animate-fade-in flex flex-col items-center text-center z-50 border border-slate-100">
            <div className="w-16 h-16 relative flex items-center justify-center bg-teal-50 rounded-full mb-4">
              <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Sedang Mengimpor Data</h3>
            <p className="text-sm text-slate-600 font-medium mb-1">{importLoadingMsg}</p>
            <p className="text-xs text-slate-400 mt-2">Harap jangan menutup halaman ini</p>
          </div>
        </div>
      )}

      {/* Success Centered Popup */}
      {importSuccess && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setImportSuccess(null)}></div>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative shadow-2xl animate-fade-in flex flex-col items-center text-center z-50 border border-slate-100">
            <div className="w-16 h-16 relative flex items-center justify-center bg-emerald-50 rounded-full mb-4 border border-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Impor Berhasil!</h3>
            <p className="text-sm text-slate-600 mb-6">
              Berhasil menyimpan <span className="font-bold text-emerald-600">{importSuccess.count}</span> data siswa ke dalam sistem.
            </p>
            <button
              onClick={() => setImportSuccess(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase py-3 rounded-xl transition-all tracking-wider cursor-pointer shadow-md"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL IMPOR MODERN ================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}></div>
          <div className="bg-white rounded-3xl max-w-lg w-full relative shadow-2xl animate-fade-in flex flex-col overflow-hidden z-50 border border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 text-left">Impor Data Siswa via Excel</h3>
                  <p className="text-xs text-slate-400 mt-0.5 text-left">Unggah data siswa secara massal menggunakan format Excel/CSV</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content & Tabs */}
            <div className="p-6 space-y-6">
              {/* Tabs */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTabImportType('quick')}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTabImportType === 'quick'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Impor Cepat (Quick)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabImportType('regular')}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeTabImportType === 'regular'
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Impor Lengkap (Regular)
                </button>
              </div>

              {/* Description */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 text-left space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kolom yang Diperlukan</span>
                <p className="text-xs text-slate-600 font-medium">
                  {activeTabImportType === 'quick' 
                    ? 'Nama Lengkap, Kelas, NISN, Jenis Kelamin (L/P), Tempat & Tanggal Lahir.' 
                    : 'Semua kolom Impor Cepat + NIK, Agama, Alamat Lengkap, Nama Ayah & Ibu Kandung.'
                  }
                </p>
              </div>

              {/* Drag-and-drop Dropzone */}
              <div 
                onDragEnter={(e) => {
                  e.preventDefault();
                  setImportDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setImportDragActive(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setImportDragActive(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setImportDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setActiveImportType(activeTabImportType);
                    setIsImportModalOpen(false);
                    // Pass to existing file reader function
                    const fakeEvent = {
                      target: {
                        files: e.dataTransfer.files
                      }
                    } as any;
                    handleImportFile(fakeEvent);
                  }
                }}
                onClick={() => {
                  setActiveImportType(activeTabImportType);
                  setIsImportModalOpen(false);
                  setTimeout(() => {
                    document.getElementById('xlsx-import-input')?.click();
                  }, 100);
                }}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  importDragActive 
                    ? 'border-emerald-500 bg-emerald-50/20' 
                    : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50'
                }`}
              >
                <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 mb-4">
                  <FileUp className="w-8 h-8" />
                </div>
                <h4 className="text-xs font-extrabold text-slate-800">Tarik & lepas file Anda di sini</h4>
                <p className="text-[11px] text-slate-400 mt-1">atau klik untuk memilih file dari komputer</p>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-1 rounded-md mt-4 uppercase tracking-wider">
                  Mendukung .XLSX, .XLS, atau .CSV
                </span>
              </div>

              {/* Template download links */}
              <div className="border-t border-slate-100 pt-5 text-left flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700">Belum memiliki template?</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gunakan template resmi kami agar format sesuai.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadTemplate(activeTabImportType)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Table size={14} />
                  <span>Unduh Template</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CETAK BIODATA ================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsPrintModalOpen(false)}></div>
          <div className="bg-white rounded-3xl max-w-lg w-full relative shadow-2xl animate-fade-in flex flex-col overflow-hidden z-50 border border-slate-100">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 text-left">Cetak Biodata Siswa</h3>
                  <p className="text-xs text-slate-400 mt-0.5 text-left">Pilih kriteria pencetakan biodata siswa secara resmi</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Type Selection Tabs */}
              <div className="grid grid-cols-3 p-1.5 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  type="button"
                  onClick={() => setPrintModalType('search')}
                  className={`py-2 rounded-xl text-[11px] font-black transition-all ${
                    printModalType === 'search'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Pencarian
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintModalType('class');
                    // auto select first class if none selected
                    const uniqClasses = Array.from(new Set(students.map(s => s.kelas).filter(Boolean)));
                    if (uniqClasses.length > 0 && !selectedPrintClass) {
                      setSelectedPrintClass(uniqClasses[0] || '');
                    }
                  }}
                  className={`py-2 rounded-xl text-[11px] font-black transition-all ${
                    printModalType === 'class'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Per Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalType('all')}
                  className={`py-2 rounded-xl text-[11px] font-black transition-all ${
                    printModalType === 'all'
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Keseluruhan
                </button>
              </div>

              {/* Dynamic View based on selection */}
              {printModalType === 'search' && (
                <div className="space-y-3 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cari Nama Siswa / NISN</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Masukkan nama siswa atau NISN..."
                      value={selectedPrintStudent}
                      onChange={(e) => setSelectedPrintStudent(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder-slate-400"
                    />
                  </div>

                  {/* Filtered suggestions list */}
                  {selectedPrintStudent.length >= 1 && (
                    <div className="border border-slate-100 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-50 bg-white shadow-inner">
                      {students
                        .filter(s => 
                          s.nama.toLowerCase().includes(selectedPrintStudent.toLowerCase()) || 
                          (s.nisn && s.nisn.includes(selectedPrintStudent))
                        )
                        .slice(0, 5)
                        .map(s => (
                          <div 
                            key={s.id} 
                            onClick={() => {
                              // Trigger printing single student
                              if (onPrintBiodata) {
                                onPrintBiodata({ type: 'student', studentId: s.id });
                              } else {
                                const printUrl = `?print-student=${s.id}`;
                                try {
                                  (window as any).__MTS_SINGLE_STUDENT_DATA__ = s;
                                } catch (e) { console.warn(e); }
                                window.open(printUrl, '_blank');
                              }
                              setIsPrintModalOpen(false);
                            }}
                            className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between text-left"
                          >
                            <div>
                              <p className="text-xs font-bold text-slate-700">{s.nama}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Kelas: {s.kelas || '-'} | NISN: {s.nisn || '-'}</p>
                            </div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full font-sans">Pilih & Cetak</span>
                          </div>
                        ))}
                      {students.filter(s => 
                        s.nama.toLowerCase().includes(selectedPrintStudent.toLowerCase()) || 
                        (s.nisn && s.nisn.includes(selectedPrintStudent))
                      ).length === 0 && (
                        <div className="p-4 text-center text-xs text-slate-400 font-medium">Siswa tidak ditemukan</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {printModalType === 'class' && (
                <div className="space-y-3 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Kelas</label>
                  <SearchableSelect
                    value={selectedPrintClass}
                    onChange={(val) => setSelectedPrintClass(val)}
                    options={Array.from(new Set(students.map(s => s.kelas).filter(Boolean)))
                      .sort()
                      .map(cls => ({ value: cls, label: `Kelas ${cls}` }))}
                    placeholder="Pilih Kelas"
                    showSearch={true}
                    isClearable={false}
                  />

                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                    Sistem akan memicu jendela pencetakan terintegrasi yang berisi biodata seluruh siswa di kelas <span className="font-bold text-slate-700">{selectedPrintClass}</span> ({students.filter(s => s.kelas === selectedPrintClass).length} siswa). Masing-masing siswa akan dipisahkan pada halaman tersendiri (page break).
                  </p>

                  <button
                    onClick={() => {
                      if (!selectedPrintClass) return;
                      if (onPrintBiodata) {
                        onPrintBiodata({ type: 'class', className: selectedPrintClass });
                      } else {
                        const printUrl = `?print-class=${encodeURIComponent(selectedPrintClass)}`;
                        window.open(printUrl, '_blank');
                      }
                      setIsPrintModalOpen(false);
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase py-3 rounded-xl tracking-wider transition-all cursor-pointer shadow-md mt-2 flex items-center justify-center gap-2"
                  >
                    <Printer size={14} />
                    <span>Mulai Cetak Biodata Kelas {selectedPrintClass}</span>
                  </button>
                </div>
              )}

              {printModalType === 'all' && (
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
                    <div>
                      <h4 className="text-xs font-bold text-amber-800">Perhatian Sebelum Mencetak</h4>
                      <p className="text-[10px] text-amber-700/80 leading-relaxed mt-0.5">
                        Anda akan mencetak biodata keseluruhan siswa madrasah ({students.length} siswa). Proses rendering mungkin memerlukan waktu beberapa detik. Harap pastikan memori perangkat Anda memadai.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onPrintBiodata) {
                        onPrintBiodata({ type: 'all' });
                      } else {
                        const printUrl = `?print-all=true`;
                        window.open(printUrl, '_blank');
                      }
                      setIsPrintModalOpen(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase py-3 rounded-xl tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                  >
                    <Printer size={14} />
                    <span>Mulai Cetak Semua Siswa ({students.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {activeTab === 'mutasi' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px] animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Data Mutasi Siswa</h2>
              <p className="text-xs text-slate-500 mt-1">Kelola pencatatan siswa pindah, masuk, atau keluar.</p>
            </div>
            <button 
              onClick={() => {
                setActiveMenuId(null);
                setSelectedMutationStudent(null);
                setMutationForm({
                  jenis: 'Mutasi/Pindah',
                  tanggal: new Date().toISOString().split('T')[0],
                  alasan: '',
                  sekolah: ''
                });
                setIsMutationModalOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              + Catat Mutasi
            </button>
          </div>
          
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                <tr>
                  <th className="p-4 text-center w-12">No</th>
                  <th className="p-4">Tanggal</th>
                  <th className="p-4">Jenis</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Sekolah Asal/Tujuan</th>
                  <th className="p-4">Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {mutations.length > 0 ? (
                  mutations.map((m, idx) => {
                    const student = students.find(s => s.id === m.studentId);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-4">{m.tanggal}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            m.jenisMutasi === 'Masuk' ? 'bg-emerald-100 text-emerald-700' :
                            m.jenisMutasi === 'Keluar' ? 'bg-amber-100 text-amber-700' :
                            m.jenisMutasi === 'Dikeluarkan' ? 'bg-rose-100 text-rose-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {m.jenisMutasi}
                          </span>
                        </td>
                        <td className="p-4 font-bold">{student?.nama || m.studentName || 'Tidak diketahui'}</td>
                        <td className="p-4">{m.sekolahAsalTujuan || '-'}</td>
                        <td className="p-4 text-slate-500">{m.alasan || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Belum ada data mutasi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'alumni' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[400px] animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Direktori Alumni</h2>
              <p className="text-xs text-slate-500 mt-1">Daftar seluruh alumni madrasah berdasarkan tahun kelulusan.</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider font-bold text-slate-500">
                <tr>
                  <th className="p-4 text-center w-12">No</th>
                  <th className="p-4">Tahun Lulus</th>
                  <th className="p-4">Nama Alumni</th>
                  <th className="p-4">NIS / NISN</th>
                  <th className="p-4">No. Ijazah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {graduations.length > 0 ? (
                  graduations.map((g, idx) => {
                    const student = students.find(s => s.id === g.studentId);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="p-4 text-center text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-bold text-indigo-600">{g.tahunLulus}</td>
                        <td className="p-4 font-bold">{student?.nama || g.studentName || 'Tidak diketahui'}</td>
                        <td className="p-4 text-slate-500">
                          {student?.nis || '-'}{student?.nisn ? ` / ${student.nisn}` : ''}
                        </td>
                        <td className="p-4 font-mono text-slate-500">{g.noIjazah || '-'}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Belum ada data alumni terdaftar</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mutasi Modal */}
      {isMutationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center">
                <ArrowRightLeft className="w-5 h-5 mr-2 text-blue-600" />
                Mutasikan Siswa
              </h3>
              <button onClick={() => setIsMutationModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              {selectedMutationStudent ? (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-4 relative">
                  <p className="text-xs font-semibold text-blue-800">Siswa yang dimutasi:</p>
                  <p className="font-bold text-blue-900">{selectedMutationStudent.nama}</p>
                  <p className="text-[10px] text-blue-700">NIS: {selectedMutationStudent.nis || '-'} | Kelas: {selectedMutationStudent.kelas || '-'}</p>
                  <button 
                    onClick={() => setSelectedMutationStudent(null)}
                    className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Pilih Siswa</label>
                  <SearchableSelect
                    options={students.filter(s => s.status === 'Aktif').map(s => ({
                      value: s.id,
                      label: `${s.nama} (${s.nis || '-'} / ${s.kelas || '-'})`
                    }))}
                    value=""
                    onChange={(val) => {
                      const st = students.find(s => s.id === val);
                      if (st) setSelectedMutationStudent(st);
                    }}
                    placeholder="Ketik nama atau NIS siswa..."
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Jenis Mutasi</label>
                <select
                  value={mutationForm.jenis}
                  onChange={(e) => setMutationForm({...mutationForm, jenis: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Mutasi/Pindah">Mutasi/Pindah Sekolah</option>
                  <option value="Keluar">Keluar (Lainnya)</option>
                  <option value="Dikeluarkan">Dikeluarkan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tanggal Mutasi</label>
                <input
                  type="date"
                  value={mutationForm.tanggal}
                  onChange={(e) => setMutationForm({...mutationForm, tanggal: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Sekolah Tujuan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Nama sekolah tujuan..."
                  value={mutationForm.sekolah}
                  onChange={(e) => setMutationForm({...mutationForm, sekolah: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Alasan (Opsional)</label>
                <textarea
                  placeholder="Alasan mutasi..."
                  value={mutationForm.alasan}
                  onChange={(e) => setMutationForm({...mutationForm, alasan: e.target.value})}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50">
              <button
                onClick={() => setIsMutationModalOpen(false)}
                className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors rounded-xl text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveMutation}
                className="px-5 py-2 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm shadow-sm"
              >
                Simpan Mutasi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
