import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, MoreVertical, Eye, Edit3, Trash2, Mail, Phone, ShieldCheck, FileUp, AlertCircle, X, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, FileDown, Table, FileText, Printer } from 'lucide-react';
import { Teacher, Institution } from '../types';
import { SearchableSelect } from './SearchableSelect';
import * as XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { syncTeacherToSupabase, generateUUID } from '../lib/supabaseClient';

interface GuruViewProps {
  institution?: Institution | null;
  teachers: Teacher[];
  onAddClick: () => void;
  onEditClick: (teacher: Teacher) => void;
  onDeleteClick: (teacher: Teacher) => void;
  onToggleStatus?: (teacher: Teacher) => void;
  onViewDetail?: (teacher: Teacher) => void;
  onImportTeachers?: (imported: Teacher[]) => void;
  addToast?: (message: string, action?: string, type?: 'success' | 'info' | 'error') => void;
  onPrintBiodata?: (config: { type: 'teacher' | 'all-teachers'; teacherId?: string }) => void;
}

export const GuruView: React.FC<GuruViewProps> = ({
  institution,
  teachers,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  onViewDetail,
  onImportTeachers,
  addToast,
  onPrintBiodata
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [limit, setLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('Nama (A-Z)');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [importPreviewData, setImportPreviewData] = useState<{
    teachers: {
      teacher: Teacher;
      rowNum: number;
      errors: Record<string, string>;
      isValid: boolean;
    }[];
    totalRows: number;
    validCount: number;
    invalidCount: number;
  } | null>(null);

  const [importLoading, setImportLoading] = useState(false);
  const [importLoadingMsg, setImportLoadingMsg] = useState('');
  const [importSuccess, setImportSuccess] = useState<{ count: number; total: number } | null>(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLDivElement>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportModalOpen(false);
      }
      if (importRef.current && !importRef.current.contains(event.target as Node)) {
        setImportModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getBase64ImageFromUrl = (imageUrl: string): Promise<string> => {
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
          const dataURL = canvas.toDataURL('image/png');
          resolve(dataURL);
        } else {
          reject(new Error('Canvas context is null'));
        }
      };
      img.onerror = (error) => {
        reject(error);
      };
      img.src = imageUrl;
    });
  };

  const handleToggleMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const filteredTeachers = (teachers || []).filter((tch) => {
    if (!tch) return false;
    const nameStr = tch.nama || '';
    const matchesSearch =
      nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tch.tugasUtama && tch.tugasUtama.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (tch.nipNuptk && tch.nipNuptk.includes(searchTerm)) ||
      (tch.nuptk && tch.nuptk.includes(searchTerm));

    const matchesStatus =
      statusFilter === 'Semua Status' || tch.statusPegawai === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (!a || !b) return 0;
    const nameA = a.nama || '';
    const nameB = b.nama || '';
    if (sortBy === 'Nama (A-Z)') {
      return nameA.localeCompare(nameB, 'id');
    } else if (sortBy === 'Nama (Z-A)') {
      return nameB.localeCompare(nameA, 'id');
    } else if (sortBy === 'NIP/NUPTK (Terkecil)') {
      return (a.nipNuptk || '').localeCompare(b.nipNuptk || '');
    } else if (sortBy === 'NIP/NUPTK (Terbesar)') {
      return (b.nipNuptk || '').localeCompare(a.nipNuptk || '');
    }
    return nameA.localeCompare(nameB, 'id');
  });

  const totalPages = Math.ceil(sortedTeachers.length / limit) || 1;
  const startIndex = (currentPage - 1) * limit;
  const paginatedTeachers = sortedTeachers.slice(startIndex, startIndex + limit);

  const exportToPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const teachersToExport = filteredTeachers;

    const leftLogos: string[] = [];
    const rightLogos: string[] = [];
    
    if (institution?.kemdikbudLogo) leftLogos.push(institution.kemdikbudLogo);
    if (institution?.kemenagLogo) leftLogos.push(institution.kemenagLogo);
    if (institution?.logo) rightLogos.push(institution.logo);

    let startY = 10;
    const alignMethod = "center";
    const xPos = doc.internal.pageSize.getWidth() / 2;

    if (institution?.organizer) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(institution.organizer.toUpperCase(), xPos, startY + 6, { align: alignMethod });
      startY += 5;
    }

    const schoolName = institution?.name?.toUpperCase() || 'NAMA SEKOLAH';
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName, xPos, startY + 6, { align: alignMethod });
    startY += 6;
    
    const parts = [];
    if (institution?.address) parts.push(institution.address);
    if (institution?.email) parts.push(`Email: ${institution.email}`);
    if (institution?.phone) parts.push(`Telp: ${institution.phone}`);
    const schoolAddress = parts.join(' | ') || 'Alamat Sekolah';
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(schoolAddress, xPos, startY + 6, { align: alignMethod });
    startY += 5;

    startY += 5;
    startY = Math.max(startY, 33);

    doc.setLineWidth(0.5);
    doc.line(10, startY, doc.internal.pageSize.getWidth() - 10, startY);
    doc.line(10, startY + 1.5, doc.internal.pageSize.getWidth() - 10, startY + 1.5);
    startY += 1.5;
    
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
    doc.text(`Data Guru dan Tenaga Kependidikan Tahun Ajaran ${schoolYear}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

    const headers = ['No', 'NIP/NUPTK', 'Nama Lengkap', 'Jenis Kelamin', 'Kategori', 'Tugas Utama', 'Pend. Terakhir', 'Instansi', 'Status'];
    const data = teachersToExport.map((tch, idx) => [
      idx + 1,
      tch.nipNuptk || '-',
      tch.nama,
      tch.jk || '-',
      tch.kategori || '-',
      tch.tugasUtama || '-',
      tch.pendidikanLulusan || '-',
      tch.pendidikanInstansi || '-',
      tch.status
    ]);

    autoTable(doc, {
      startY: startY + 5,
      head: [headers],
      body: data,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        3: { halign: 'center' },
        8: { halign: 'center' },
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
    
    doc.save("Data_Guru_Tendik.pdf");
    setExportModalOpen(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const exportDate = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    
    const headers = [
      'No', 'Nama Lengkap', 'NIP/NUPTK', 'NIK', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Kategori',
      'Username', 'Password', 'Email', 'No HP', 'Status Pegawai', 'Tugas Utama', 'Tugas Tambahan', 
      'Jam Pelajaran', 'Pend. Terakhir', 'Instansi', 'Status'
    ];

    const data = filteredTeachers.map((tch, idx) => {
      const s = (val: string | undefined | null) => {
        if (!val) return { t: 's', v: '-', z: '@' };
        return { t: 's', v: val, z: '@' };
      };
      
      return [
        { t: 'n', v: idx + 1 },
        s(tch.nama), s(tch.nipNuptk), s(tch.nik), s(tch.jk), s(tch.tempatLahir), s(tch.tanggalLahir), s(tch.kategori),
        s(tch.username), s(tch.password), s(tch.email), s(tch.hp), s(tch.statusPegawai), s(tch.tugasUtama), s(tch.tugasTambahan),
        s(tch.jamPelajaran?.toString()), s(tch.pendidikanLulusan), s(tch.pendidikanInstansi), s(tch.status)
      ];
    });
    
    const schoolName = institution?.name || 'Nama Sekolah';
    const schoolAddress = institution?.address || 'Alamat Sekolah';
    const schoolYear = institution?.academicYear || '';
    
    const kopRows = [
      [{ t: 's', v: schoolName }],
      [{ t: 's', v: schoolAddress }],
      [{ t: 's', v: `Data Guru dan Tendik Tahun Ajaran ${schoolYear}` }],
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
        fill: { fgColor: { rgb: "0F172A" } },
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
    ];
    worksheet['!merges'] = merges;

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Guru');
    XLSX.writeFile(workbook, "Data_Guru_Tendik.xlsx");
    setExportModalOpen(false);
  };

  const downloadTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const headers = [
      'No', 'Nama Lengkap', 'Jenis Kelamin', 'NIK', 'Username', 'Password'
    ];
    const dummyRows = [
      [1, 'Ahmad Fauzi, S.Pd.', 'Laki-laki', '3201234567890123', 'ahmadfauzi', 'password123'],
      [2, 'Siti Rahmah, S.E.', 'Perempuan', '3201234567890124', 'sitirahmah', 'password123']
    ];

    const headerCells = headers.map(h => {
      let comments: any = undefined;
      if (h === 'NIK') {
        comments = [{ a: 'Sistem', t: 'Terdiri dari 16 angka' }];
        comments.hidden = true;
      } else if (h === 'Jenis Kelamin') {
        comments = [{ a: 'Sistem', t: 'Laki-laki atau Perempuan' }];
        comments.hidden = true;
      }
      return {
        t: 's',
        v: h,
        c: comments,
        s: {
          fill: { fgColor: { rgb: "0F172A" } },
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
          alignment: { horizontal: "left", vertical: "center" }
        }
      };
    });

    const dataCells = dummyRows.map(row => row.map((val, idx) => {
      const isCode = (idx === 3); // idx 3 is NIK (text format to prevent scientific notation)
      return {
        t: 's',
        v: String(val),
        z: isCode ? '@' : undefined,
        s: {
          font: { sz: 10 },
          alignment: { horizontal: "left", vertical: "center" }
        }
      };
    }));

    const aoa = [headerCells, ...dataCells];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    const max_widths = headers.map((h, colIdx) => {
      let maxLen = h.length;
      dummyRows.forEach(row => {
        const valStr = String(row[colIdx] || '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return maxLen;
    });
    // Set auto fit column with safe extra padding
    worksheet['!cols'] = max_widths.map(w => ({ wch: Math.max(w + 5, 14) }));

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Guru & Tendik');
    XLSX.writeFile(workbook, 'Template_Import_Guru_Tendik.xlsx');
  };

  const handleSaveImport = async () => {
    if (!importPreviewData) return;
    
    // Filter only valid teachers
    const validRows = importPreviewData.teachers.filter(t => t.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada data guru valid untuk diimpor.');
      return;
    }

    setImportLoading(true);
    setImportPreviewData(null); // Close preview modal

    const totalToImport = validRows.length;
    let successCount = 0;
    let failedCount = 0;
    let syncErrorMsg = '';

    const teachersToSave: Teacher[] = [];

    for (let i = 0; i < totalToImport; i++) {
      const { teacher } = validRows[i];
      setImportLoadingMsg(`Mengirim ${i + 1} dari ${totalToImport} data guru...`);
      teachersToSave.push(teacher);
      
      try {
        const res = await syncTeacherToSupabase(teacher, true);
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
    if (onImportTeachers) {
      onImportTeachers(teachersToSave);
    }

    setImportLoading(false);
    setImportSuccess({ count: totalToImport, total: totalToImport });

    if (failedCount > 0 && addToast) {
      addToast(
        `Berhasil impor ${totalToImport} guru ke sistem lokal, namun ${failedCount} data gagal dikirim ke Supabase Cloud. ${syncErrorMsg ? 'Detail: ' + syncErrorMsg : 'Periksa koneksi atau skema database Anda.'}`,
        'Database Sync',
        'error'
      );
    } else if (addToast) {
      addToast(`Seluruh ${successCount} data guru berhasil disinkronkan ke Supabase Cloud!`, 'Database Sync', 'success');
    }
  };

  return (
    <div className="animate-fade-in block text-left" ref={menuRef}>
      {/* Toolbar Table */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-5 mb-6 shadow-sm space-y-4">
        {/* Row 1: Search and Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input on the Left */}
          <div className="search-input-wrapper w-full lg:max-w-xs xl:max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama/NIP guru..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input w-full py-2.5 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-900 transition-all text-slate-700"
            />
          </div>

          {/* Filters on the Right (Status, Sort Order, Row Limit) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
            <div className="w-full sm:min-w-[150px]">
              <SearchableSelect
                showSearch={false}
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val || 'Semua Status');
                  setCurrentPage(1);
                }}
                options={['Semua Status', 'PNS', 'PPPK', 'GTY', 'GTT', 'Honor', 'Lainnya']}
                placeholder="Semua Status"
              />
            </div>
            <div className="w-full sm:min-w-[150px]">
              <SearchableSelect
                showSearch={false}
                value={sortBy}
                onChange={(val) => {
                  setSortBy(val || 'Nama (A-Z)');
                  setCurrentPage(1);
                }}
                options={['Nama (A-Z)', 'Nama (Z-A)', 'NIP/NUPTK (Terkecil)', 'NIP/NUPTK (Terbesar)']}
                placeholder="Urutkan"
              />
            </div>
            <div className="w-full sm:min-w-[120px]">
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

        {/* Row 2: Operation Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Export Dropdown */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportModalOpen(!exportModalOpen)}
                className="flex-1 sm:flex-initial bg-slate-900 border border-slate-900 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center cursor-pointer shadow-sm animate-fade-in"
              >
                <FileDown className="w-4 h-4 mr-2" />
                <span>Ekspor</span>
              </button>

              {exportModalOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3 animate-fade-in space-y-2 text-left">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-1 pb-2 border-b border-slate-100">
                    Pilih Format Export
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
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
              onClick={() => {
                if (onPrintBiodata) {
                  onPrintBiodata({ type: 'all-teachers' });
                }
              }}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 mr-2 text-slate-500" />
              <span>Cetak Biodata</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="flex-1 sm:flex-initial bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              <FileUp className="w-4 h-4 mr-2" />
              <span>Impor Data</span>
            </button>
          </div>
          <button
            onClick={onAddClick}
            className="w-full sm:w-auto bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 shadow-sm transition-all flex items-center justify-center cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span>Tambah Guru / Tendik</span>
          </button>
        </div>
      </div>

      {/* Mobile Card List View (Visible on mobile, hidden on desktop) */}
      <div className="md:hidden space-y-4 mb-6">
        {paginatedTeachers.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 font-semibold shadow-sm">
            Tidak ada data guru atau tenaga kependidikan ditemukan
          </div>
        ) : (
          paginatedTeachers.map((tch, index) => {
            const isMenuOpen = activeMenuId === tch.id;
            return (
              <div key={tch.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3 relative text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{tch.nama}</h4>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">NIP/NUPTK: {tch.nipNuptk || '-'}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${
                      tch.status === 'Aktif'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {tch.status || 'Aktif'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 text-xs">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tugas Utama</span>
                    <p className="font-bold text-slate-700 mt-0.5">{tch.tugasUtama || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Username</span>
                    <p className="font-semibold text-slate-700 mt-0.5 truncate">{tch.username || '-'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Aksi:</span>
                  <div className="flex space-x-1.5 items-center">
                    <button
                      onClick={() => onViewDetail?.(tch)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      title="Detail"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => onEditClick(tch)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      title="Edit"
                    >
                      Edit
                    </button>
                    <div className="relative">
                      <button
                        onClick={(e) => handleToggleMenu(tch.id, e)}
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
                              onToggleStatus?.(tch);
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer text-left"
                          >
                            <span>Toggle Status</span>
                          </button>
                          <div className="h-px bg-slate-100 my-1"></div>
                          <button
                            onClick={() => {
                              setActiveMenuId(null);
                              onDeleteClick(tch);
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

      {/* Teachers Table (Visible on desktop, hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-[13px]">
              <tr>
                <th className="px-4 py-4 whitespace-nowrap w-12 text-center font-medium">No</th>
                <th className="px-4 py-4 whitespace-nowrap font-medium">NIP/NUPTK</th>
                <th className="px-4 py-4 whitespace-nowrap font-medium">Nama</th>
                <th className="px-4 py-4 whitespace-nowrap font-medium">Username</th>
                <th className="px-4 py-4 whitespace-nowrap font-medium">Tugas Utama</th>
                <th className="px-4 py-4 min-w-[200px] font-medium">Tugas Tambahan</th>
                <th className="px-4 py-4 whitespace-nowrap text-center font-medium">JP</th>
                <th className="px-4 py-4 whitespace-nowrap text-center font-medium">Status</th>
                <th className="px-4 py-4 whitespace-nowrap text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Tidak ada data guru atau tenaga kependidikan ditemukan
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((tch, index) => {
                  const isMenuOpen = activeMenuId === tch.id;
                  const globalIndex = startIndex + index + 1;
                  return (
                  <tr key={tch.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-4 whitespace-nowrap text-center text-slate-500">
                      {globalIndex}
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-slate-600 whitespace-nowrap">
                      {tch.nipNuptk || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-800 whitespace-nowrap">
                      {tch.nama}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {tch.username || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                      {tch.tugasUtama || '-'}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div className="flex flex-wrap gap-1.5">
                        {tch.tugasTambahan ? tch.tugasTambahan.split(',').map((tugas, i) => {
                          const colors = [
                            'bg-purple-50 text-purple-600',
                            'bg-pink-50 text-pink-600',
                            'bg-emerald-50 text-emerald-600',
                            'bg-amber-50 text-amber-600',
                            'bg-blue-50 text-blue-600'
                          ];
                          return (
                            <span key={i} className={`px-2.5 py-1 rounded-full border border-white/0 shadow-sm ${colors[i % colors.length]}`}>
                              {tugas.trim()}
                            </span>
                          );
                        }) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-center text-slate-600 whitespace-nowrap">
                      {tch.jamPelajaran ? tch.jamPelajaran : '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => onToggleStatus?.(tch)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-white text-[11px] font-bold uppercase shadow-sm transition-colors ${
                          tch.status === 'Aktif' ? 'bg-[#10b981] hover:bg-[#0ea5e9]' : 'bg-rose-500 hover:bg-rose-600'
                        }`}
                        title="Klik untuk mengubah status"
                      >
                        <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5"></span>
                        {tch.status === 'Aktif' ? 'Aktif' : 'Non-Aktif'}
                      </button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center relative">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={(e) => handleToggleMenu(tch.id, e)}
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors tooltip-trigger"
                        >
                          <MoreVertical size={16} strokeWidth={2.5} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-8 top-10 bg-white border border-slate-100 rounded-xl shadow-xl z-50 min-w-[160px] p-1.5 space-y-1 block animate-fade-in text-left">
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onViewDetail?.(tch);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer text-left"
                            >
                              <Eye size={14} />
                              <span>Detail Lengkap</span>
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onEditClick(tch);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer text-left"
                            >
                              <Edit3 size={14} />
                              <span>Edit Data</span>
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button
                              onClick={() => {
                                setActiveMenuId(null);
                                onDeleteClick(tch);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer text-left"
                            >
                              <Trash2 size={14} />
                              <span>Hapus Data</span>
                            </button>
                          </div>
                        )}
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

      {/* Pagination Section (Shared for Desktop & Mobile) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 mt-6 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menampilkan {paginatedTeachers.length} dari {filteredTeachers.length} guru & tendik
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

      {/* Review Modal for Teachers */}
      {importPreviewData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setImportPreviewData(null)}></div>
          <div className="bg-white rounded-[1.5rem] w-full max-w-4xl h-[80vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50 border border-slate-100 text-left">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Review Import Excel - Data Guru</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Tinjau data sebelum disimpan ke database</p>
              </div>
              <button onClick={() => setImportPreviewData(null)} className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-500 rounded-full hover:bg-slate-100 transition-colors cursor-pointer">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
              {/* Alert summary */}
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

              {/* Data table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[45vh]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-3 pl-4 w-12 text-center">Baris</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">Jenis Kelamin</th>
                        <th className="p-3">NIK</th>
                        <th className="p-3">Username</th>
                        <th className="p-3">Password</th>
                        <th className="p-3 pr-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreviewData.teachers.map((row, idx) => {
                        const { teacher, rowNum, errors, isValid } = row;
                        return (
                          <tr key={idx} className={`hover:bg-slate-50/50 transition-colors ${!isValid ? 'bg-rose-50/20' : ''}`}>
                            <td className="p-3 pl-4 font-mono text-center text-xs text-slate-400 font-bold">
                              {rowNum}
                            </td>
                            
                            {/* Nama Lengkap */}
                            <td className={`p-3 text-xs ${errors.nama ? 'bg-rose-50/50' : ''}`}>
                              <div className="font-semibold text-slate-800">{teacher.nama || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.nama && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.nama}
                                </div>
                              )}
                            </td>

                            {/* Jenis Kelamin */}
                            <td className={`p-3 text-xs ${errors.jk ? 'bg-rose-50/50' : ''}`}>
                              <div className="text-slate-600">{teacher.jk || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.jk && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.jk}
                                </div>
                              )}
                            </td>

                            {/* NIK */}
                            <td className={`p-3 text-xs ${errors.nik ? 'bg-rose-50/50' : ''}`}>
                              <div className="font-semibold text-slate-800">{teacher.nik || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.nik && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.nik}
                                </div>
                              )}
                            </td>

                            {/* Username */}
                            <td className={`p-3 text-xs ${errors.username ? 'bg-rose-50/50' : ''}`}>
                              <div className="text-slate-600">{teacher.username || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.username && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.username}
                                </div>
                              )}
                            </td>

                            {/* Password */}
                            <td className={`p-3 text-xs ${errors.password ? 'bg-rose-50/50' : ''}`}>
                              <div className="text-slate-600">{teacher.password || <span className="italic text-rose-400">Kosong</span>}</div>
                              {errors.password && (
                                <div className="text-[10px] text-rose-600 mt-0.5 flex items-center font-medium">
                                  <AlertCircle size={10} className="mr-1 flex-shrink-0 text-rose-500" />
                                  {errors.password}
                                </div>
                              )}
                            </td>

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
              <span className="text-[11px] font-semibold text-slate-500">
                Data Valid: <span className="text-emerald-600 font-bold">{importPreviewData.validCount}</span> | Error: <span className="text-rose-600 font-bold">{importPreviewData.invalidCount}</span>
              </span>
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
            <h3 className="text-lg font-bold text-slate-800 mb-2 text-left sm:text-center">Sedang Mengimpor Data</h3>
            <p className="text-sm text-slate-600 font-medium mb-1">{importLoadingMsg}</p>
            <p className="text-xs text-slate-400 mt-2">Harap jangan menutup halaman ini</p>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isImporting && setImportModalOpen(false)}></div>
          <div className="bg-white rounded-3xl w-full max-w-4xl relative shadow-2xl animate-fade-in z-50 flex flex-col max-h-[90vh] overflow-hidden" ref={importRef}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 text-slate-700 rounded-full flex items-center justify-center">
                  <FileUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Impor Data Guru & Tendik</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Unggah file Excel (.xlsx) untuk menambahkan data massal</p>
                </div>
              </div>
              <button 
                onClick={() => setImportModalOpen(false)}
                disabled={isImporting}
                className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {!importPreviewData ? (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
                    <div 
                      onClick={() => document.getElementById('xlsx-import-teachers-modal')?.click()}
                      className="group cursor-pointer hover:bg-slate-50 border border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 transition-all mb-6"
                    >
                      <div className="mb-4 flex justify-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                          <FileUp className="w-8 h-8" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mb-2 font-sans">Unggah File Excel</h4>
                      <p className="text-xs text-slate-500">Pastikan file Anda sesuai dengan format template yang disediakan.</p>
                      <p className="text-[11px] text-blue-600 font-bold mt-3 group-hover:underline">Klik di sini untuk memilih file</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <button
                        onClick={downloadTemplate}
                        className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors shadow-sm cursor-pointer flex items-center justify-center"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Unduh Template
                      </button>

                      <input
                        type="file"
                        id="xlsx-import-teachers-modal"
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = event.target?.result;
                              if (!data) return;

                              const workbook = XLSX.read(data, { type: 'array' });
                              const firstSheetName = workbook.SheetNames[0];
                              const worksheet = workbook.Sheets[firstSheetName];
                              const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

                              if (rows.length < 2) {
                                alert('Format file tidak valid (kosong atau kurang dari 2 baris).');
                                return;
                              }

                              const headers = rows[0].map(h => String(h || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' '));
                              const idxNama = headers.findIndex(h => h.includes('nama'));
                              const idxJk = headers.findIndex(h => h === 'jk' || h === 'jenis kelamin');
                              const idxUsername = headers.findIndex(h => h.includes('username'));
                              const idxPassword = headers.findIndex(h => h.includes('password'));
                              const idxKategori = headers.findIndex(h => h.includes('kategori'));
                              const idxNik = headers.findIndex(h => h === 'nik' || h.includes('nik'));
                              const idxNip = headers.findIndex(h => h === 'nip' || h.includes('nuptk'));
                              const idxTempatLahir = headers.findIndex(h => h.includes('tempat lahir'));
                              const idxTanggalLahir = headers.findIndex(h => h.includes('tanggal lahir'));
                              const idxHp = headers.findIndex(h => h.includes('hp'));
                              const idxEmail = headers.findIndex(h => h.includes('email'));
                              const idxStatusPegawai = headers.findIndex(h => h.includes('status pegawai'));
                              const idxTugasUtama = headers.findIndex(h => h.includes('tugas utama'));
                              const idxAlamat = headers.findIndex(h => h === 'alamat' || h.includes('alamat'));

                              if (idxNama === -1 || idxJk === -1 || idxNik === -1 || idxUsername === -1 || idxPassword === -1) {
                                alert('Format file tidak sesuai template. Pastikan kolom "Nama Lengkap", "Jenis Kelamin", "NIK", "Username", dan "Password" tersedia.');
                                return;
                              }

                              const previewTeachers: any[] = [];
                              for (let i = 1; i < rows.length; i++) {
                                const row = rows[i];
                                if (!row || row.length === 0 || !row[idxNama]) continue;
                                
                                const nama = String(row[idxNama] || '').trim();
                                if (!nama) continue;

                                const nip = idxNip !== -1 ? String(row[idxNip] || '').trim() : '';
                                const isExisting = teachers.some(t => t.nipNuptk === nip && nip !== '');

                                let tanggalLahir = '';
                                const rawDate = idxTanggalLahir !== -1 ? String(row[idxTanggalLahir] || '').trim() : '';
                                if (rawDate) {
                                  if (/^\d+$/.test(rawDate)) {
                                    const dateObj = XLSX.SSF.parse_date_code(Number(rawDate));
                                    if (dateObj) {
                                      const d = String(dateObj.d).padStart(2, '0');
                                      const m = String(dateObj.m).padStart(2, '0');
                                      tanggalLahir = `${dateObj.y}-${m}-${d}`;
                                    } else {
                                      tanggalLahir = rawDate;
                                    }
                                  } else {
                                    tanggalLahir = rawDate;
                                  }
                                }

                                 previewTeachers.push({
                                  teacher: {
                                    id: generateUUID(),
                                    nama,
                                    jk: (idxJk !== -1 ? String(row[idxJk] || '').trim().toLowerCase() : '').startsWith('p') || (idxJk !== -1 ? String(row[idxJk] || '').trim().toLowerCase() : '').includes('wanita') || (idxJk !== -1 ? String(row[idxJk] || '').trim().toLowerCase() : '').includes('perempuan') ? 'Perempuan' : 'Laki-laki',
                                    username: String(row[idxUsername] || '').trim(),
                                    password: String(row[idxPassword] || '').trim(),
                                    kategori: (idxKategori !== -1 ? String(row[idxKategori] || '').trim().toLowerCase() : '').includes('tendik') || (idxKategori !== -1 ? String(row[idxKategori] || '').trim().toLowerCase() : '').includes('staf') || (idxKategori !== -1 ? String(row[idxKategori] || '').trim().toLowerCase() : '').includes('staff') ? 'Tendik' : 'Guru',
                                    nik: idxNik !== -1 ? String(row[idxNik] || '').trim() : '',
                                    nipNuptk: nip,
                                    tempatLahir: idxTempatLahir !== -1 ? String(row[idxTempatLahir] || '').trim() : '',
                                    tanggalLahir,
                                    hp: idxHp !== -1 ? String(row[idxHp] || '').trim() : '',
                                    email: idxEmail !== -1 ? String(row[idxEmail] || '').trim() : '',
                                    statusPegawai: idxStatusPegawai !== -1 ? String(row[idxStatusPegawai] || '').trim() : '',
                                    tugasUtama: idxTugasUtama !== -1 ? String(row[idxTugasUtama] || '').trim() : '',
                                    alamat: idxAlamat !== -1 ? String(row[idxAlamat] || '').trim() : '',
                                    status: 'Aktif'
                                  },
                                  rowNum: i + 1,
                                  errors: {
                                    nama: !nama ? 'Nama Lengkap wajib diisi' : '',
                                    jk: !String(row[idxJk] || '').trim() ? 'Jenis Kelamin wajib diisi' : '',
                                    nik: !(idxNik !== -1 ? String(row[idxNik] || '').trim() : '') ? 'NIK wajib diisi' : ((idxNik !== -1 ? String(row[idxNik] || '').trim() : '').length !== 16 || !/^\d+$/.test(idxNik !== -1 ? String(row[idxNik] || '').trim() : '') ? 'NIK harus 16 digit angka' : ''),
                                    username: !String(row[idxUsername] || '').trim() ? 'Username wajib diisi' : '',
                                    password: !String(row[idxPassword] || '').trim() ? 'Password wajib diisi' : '',
                                    nip: isExisting ? `NIP/NUPTK ${nip} sudah terdaftar` : ''
                                  },
                                  isValid: !isExisting && nama !== '' && String(row[idxUsername] || '').trim() !== '' && String(row[idxJk] || '').trim() !== '' && (idxNik === -1 || (String(row[idxNik] || '').trim().length === 16 && /^\d+$/.test(String(row[idxNik] || '').trim())))
                                });
                              }

                              if (previewTeachers.length === 0) {
                                alert('Tidak ada data baris guru yang ditemukan di file.');
                                return;
                              }

                              setImportPreviewData({
                                teachers: previewTeachers,
                                totalRows: previewTeachers.length,
                                validCount: previewTeachers.filter((t: any) => t.isValid).length,
                                invalidCount: previewTeachers.filter((t: any) => !t.isValid).length
                              });
                              setImportModalOpen(false); // Close file picker modal so only the rich preview modal displays
                            } catch (err) {
                              console.error(err);
                              alert('Gagal membaca file Excel.');
                            }
                          };
                          reader.readAsArrayBuffer(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800 leading-relaxed space-y-2">
                        <p className="font-bold">Perhatian sebelum mengimpor:</p>
                        <ul className="list-disc pl-4 space-y-1">
                          <li>Pastikan format kolom sesuai dengan template yang diunduh.</li>
                          <li>Kolom Nama Lengkap, Jenis Kelamin, NIK, Username, dan Password wajib diisi.</li>
                          <li>Baris tanpa Nama Lengkap akan diabaikan.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-slate-800">{importPreviewData.totalRows}</div>
                      <div className="text-xs text-slate-500 font-medium">Total Baris</div>
                    </div>
                    <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-emerald-600">{importPreviewData.validCount}</div>
                      <div className="text-xs text-emerald-600 font-medium">Valid (Siap Impor)</div>
                    </div>
                    <div className="flex-1 bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                      <div className="text-2xl font-black text-rose-600">{importPreviewData.invalidCount}</div>
                      <div className="text-xs text-rose-600 font-medium">Tidak Valid (Diabaikan)</div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[300px]">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium text-[13px] sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 whitespace-nowrap text-center">Status</th>
                            <th className="px-4 py-3 whitespace-nowrap">Nama</th>
                            <th className="px-4 py-3 whitespace-nowrap">Jenis Kelamin</th>
                            <th className="px-4 py-3 whitespace-nowrap">NIK</th>
                            <th className="px-4 py-3 whitespace-nowrap">Username</th>
                            <th className="px-4 py-3 whitespace-nowrap">Password</th>
                            <th className="px-4 py-3 whitespace-nowrap">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreviewData.teachers.map((row: any, i: number) => (
                            <tr key={i} className={row.isValid ? 'bg-white' : 'bg-rose-50/50'}>
                              <td className="px-4 py-3 text-center">
                                {row.isValid ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                                ) : (
                                  <X className="w-4 h-4 text-rose-500 mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{row.teacher?.nama || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.teacher?.jk || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.teacher?.nik || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.teacher?.username || '-'}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.teacher?.password || '-'}</td>
                              <td className="px-4 py-3 text-xs text-rose-600 whitespace-nowrap">
                                {Object.values(row.errors || {}).filter(Boolean).join(', ') || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white shrink-0 flex justify-end gap-3 rounded-b-3xl">
              <button
                onClick={() => {
                  if (importPreviewData) setImportPreviewData(null);
                  else setImportModalOpen(false);
                }}
                disabled={isImporting}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 disabled:opacity-50"
              >
                {importPreviewData ? 'Batal' : 'Tutup'}
              </button>
              
              {importPreviewData && (
                <button
                  onClick={() => {
                    const validData = importPreviewData.teachers.filter((t: any) => t.isValid).map((t: any) => {
                      const { isValid, reason, ...teacherData } = t;
                      return teacherData;
                    });
                    
                    if (validData.length === 0) return;
                    
                    setIsImporting(true);
                    onImportTeachers?.(validData);
                    
                    setTimeout(() => {
                      setIsImporting(false);
                      setImportPreviewData(null);
                      setImportModalOpen(false);
                      setImportSuccess({ count: validData.length, total: importPreviewData.totalRows });
                    }, 800);
                  }}
                  disabled={importPreviewData.validCount === 0 || isImporting}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Proses...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Simpan {importPreviewData.validCount} Data
                    </>
                  )}
                </button>
              )}
            </div>
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
              Berhasil menyimpan <span className="font-bold text-emerald-600">{importSuccess.count}</span> data guru ke dalam sistem.
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
    </div>
  );
};
