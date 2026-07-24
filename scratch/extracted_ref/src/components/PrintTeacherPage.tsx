import React, { useEffect, useState } from 'react';
import { Printer, X, Info, Download, Loader2, ChevronDown } from 'lucide-react';
import { Teacher, Institution } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { SearchableSelect } from './SearchableSelect';

const PRINT_CSS = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 10mm 15mm 10mm 15mm !important;
    }
    html, body {
      background: white !important;
      color: black !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .no-print {
      display: none !important;
    }
    #print-wrapper {
      max-width: none !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
      zoom: 1 !important;
      transform: none !important;
    }
    .print-container {
      box-shadow: none !important;
      border: none !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      background: white !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .print-container:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .printable-row {
      background-color: #f2f2f2 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding-top: 3px !important;
      padding-bottom: 3px !important;
      padding-left: 8px !important;
      padding-right: 8px !important;
      margin-bottom: 0 !important;
    }
    
    /* Spacing and sizing adjustments for perfect A4 page fit */
    .print-container h1 {
      font-size: 12px !important;
    }
    .print-container h2 {
      font-size: 13px !important;
    }
    .print-container h3 {
      font-size: 10px !important;
      margin-bottom: 4px !important;
      margin-top: 6px !important;
    }
    .print-container h4 {
      font-size: 9px !important;
      margin-bottom: 4px !important;
      margin-top: 4px !important;
    }
    .print-container .space-y-2 > * + * {
      margin-top: 3px !important;
    }
    .print-container .grid {
      gap: 3px !important;
    }
    .print-container .gap-3 {
      gap: 4px !important;
    }
    .print-container .mb-6 {
      margin-bottom: 6px !important;
    }
    .print-container .mb-4 {
      margin-bottom: 4px !important;
    }
    .print-container .mt-10 {
      margin-top: 8px !important;
    }
    .print-container .mt-8 {
      margin-top: 8px !important;
    }
    
    /* Make typography compact in print */
    .print-container span, 
    .print-container p, 
    .print-container div {
      font-size: 10px !important;
    }
    .print-container .text-sm {
      font-size: 10.5px !important;
    }
    .print-container .text-xs {
      font-size: 9px !important;
    }

    /* Force footnote to be small and horizontal in print */
    .print-container .print-footnote {
      display: flex !important;
      flex-direction: row !important;
      align-items: flex-end !important;
      justify-content: space-between !important;
      width: 100% !important;
      border-top: 1px solid #cbd5e1 !important;
      margin-top: 16px !important;
      padding-top: 8px !important;
    }
    .print-container .print-footnote p, 
    .print-container .print-footnote span, 
    .print-container .print-footnote div {
      font-size: 8px !important;
      color: #64748b !important;
      font-weight: bold !important;
      line-height: 1.2 !important;
      text-transform: none !important;
    }
    .print-container .print-footnote .text-right,
    .print-container .print-footnote .text-right * {
      text-align: right !important;
    }
    .print-container .print-footnote .text-left,
    .print-container .print-footnote .text-left * {
      text-align: left !important;
    }
  }
`;

interface PrintTeacherPageProps {
  teacherId?: string;
  teachers: Teacher[];
  institution?: Institution | null;
  onClose?: () => void;
}

export const PrintTeacherPage: React.FC<PrintTeacherPageProps> = ({ 
  teacherId, 
  teachers, 
  institution,
  onClose 
}) => {
  const [logoLeft, setLogoLeft] = useState<string>('sekolah');
  const [logoRight, setLogoRight] = useState<string>('kemdikbud');
  const [isDownloading, setIsDownloading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 800) {
        setZoomLevel((width - 32) / 800);
      } else {
        setZoomLevel(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isInIframe, setIsInIframe] = useState(false);

  const resolvedInstitution: Institution = institution || {
    name: 'SMP NEGERI / SWASTA',
    npsn: '-',
    accreditation: 'A',
    curriculum: 'Kurikulum Merdeka',
    principal: 'Kepala Sekolah, M.Pd.',
    email: 'info@sekolah.sch.id',
    phone: '-',
    address: 'Alamat Sekolah Lengkap',
    organizer: 'Yayasan / Dinas Pendidikan',
    academicYear: '2026/2027',
  };

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const resolvedTeachers = teachers.filter((t) => !teacherId || t.id === teacherId);

  const leftLogoSrc =
    logoLeft === 'sekolah'
      ? resolvedInstitution.logo
      : logoLeft === 'kemdikbud'
      ? resolvedInstitution.kemdikbudLogo
      : logoLeft === 'kemenag'
      ? resolvedInstitution.kemenagLogo
      : null;

  const rightLogoSrc =
    logoRight === 'sekolah'
      ? resolvedInstitution.logo
      : logoRight === 'kemdikbud'
      ? resolvedInstitution.kemdikbudLogo
      : logoRight === 'kemenag'
      ? resolvedInstitution.kemenagLogo
      : null;

  const handlePrint = () => {
    window.focus();
    window.print();
  };

  const getLogoSrc = (type: string) => {
    if (type === 'sekolah') return resolvedInstitution.logo;
    if (type === 'kemdikbud') return resolvedInstitution.kemdikbudLogo;
    if (type === 'kemenag') return resolvedInstitution.kemenagLogo;
    return null;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (resolvedTeachers.length === 0) {
        alert("Tidak ada data guru untuk diunduh.");
        setIsDownloading(false);
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Pastikan posisi scroll di atas agar html2canvas tidak memotong elemen
      const originalScrollY = window.scrollY;
      const originalScrollX = window.scrollX;
      window.scrollTo(0, 0);
      
      // Beri waktu sejenak agar DOM update posisi scroll
      await new Promise(resolve => setTimeout(resolve, 100));

      const printWrapper = document.getElementById('print-wrapper');
      let originalZoom = '';
      if (printWrapper) {
        originalZoom = printWrapper.style.zoom;
        printWrapper.style.zoom = '1';
      }

      const containers = document.querySelectorAll('.print-container');
      const originalStyles: any[] = [];
      
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        originalStyles.push({
          width: container.style.width,
          maxWidth: container.style.maxWidth,
          margin: container.style.margin,
          padding: container.style.padding
        });
        container.style.width = '1024px';
        container.style.maxWidth = '1024px';
        container.style.margin = '0';
        container.style.padding = '48px';
        container.style.boxSizing = 'border-box';
      }
      
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        if (i > 0) {
          pdf.addPage();
        }

        const canvas = await html2canvas(container, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1200
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        // Calculate dimensions to fit A4 page while preserving aspect ratio
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // If image height exceeds page height, scale it down to fit one page
        let finalWidth = imgWidth;
        let finalHeight = imgHeight;
        
        if (imgHeight > pdfHeight) {
          finalHeight = pdfHeight;
          finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        // Center on page if scaled down
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = 0; // Align to top instead of center

        pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
        
        // Yield to browser to prevent freezing and crashing on many pages
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      for (let i = 0; i < containers.length; i++) {
        const container = containers[i] as HTMLElement;
        container.style.width = originalStyles[i].width;
        container.style.maxWidth = originalStyles[i].maxWidth;
        container.style.margin = originalStyles[i].margin;
        container.style.padding = originalStyles[i].padding;
      }

      if (printWrapper) {
        printWrapper.style.zoom = originalZoom;
      }

      // Kembalikan posisi scroll
      window.scrollTo(originalScrollX, originalScrollY);

      // Generate accurate descriptive name for download
      let filename = 'biodata_guru.pdf';
      if (resolvedTeachers.length === 1) {
        filename = `biodata_guru_${resolvedTeachers[0].nama.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      } else {
        filename = 'biodata_semua_guru.pdf';
      }
      
      pdf.save(filename);
    } catch (error) {
      console.error("Gagal mengunduh PDF:", error);
      alert("Terjadi kesalahan saat mengunduh dokumen. Coba gunakan browser yang berbeda atau cetak ke PDF secara manual.");
    } finally {
      setIsDownloading(false);
    }
  };

  const renderFieldLabel = (label: string, widthClass = "w-40") => (
    <div className={`${widthClass} shrink-0 flex justify-between pr-2`}>
      <span className="text-slate-500 font-bold">{label}</span>
      <span className="text-slate-400 font-bold">:</span>
    </div>
  );

  if (resolvedTeachers.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Guru/Tendik Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-2">Data profil guru/tendik tidak dapat ditemukan dalam sistem.</p>
          <button 
            onClick={() => window.close()}
            className="mt-6 px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer text-sm"
          >
            Tutup Jendela
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:text-black">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Action Bar */}
      <div className="no-print bg-slate-900 text-white py-2.5 px-4 sticky top-0 z-[9999] shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-800 text-emerald-400 rounded-lg shrink-0">
            <Printer size={18} />
          </div>
          <div>
            <h1 className="text-[11px] md:text-xs font-black tracking-wide uppercase text-emerald-400">Modul Cetak Biodata Guru & Tendik</h1>
            <p className="text-[10px] md:text-[11px] text-slate-300 leading-tight">Dokumen siap dicetak ({resolvedTeachers.length} Guru/Tendik).</p>
          </div>
        </div>

        
        {/* Live Logo Selection */}
        <div className="flex flex-row flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-[11px] bg-slate-800/60 p-1.5 rounded-lg border border-slate-700/50 justify-between md:justify-start">
          <div className="flex items-center gap-1">
            <span className="text-slate-300 font-bold">Logo Kiri:</span>
            <SearchableSelect
              value={logoLeft}
              onChange={(val) => setLogoLeft(val)}
              options={[
                { value: 'sekolah', label: 'Sekolah (Lembaga)' },
                { value: 'kemdikbud', label: 'Kemendikdasmen' },
                { value: 'kemenag', label: 'Kemenag' },
                { value: 'none', label: 'Tanpa Logo (Kosong)' }
              ]}
              placeholder="Logo Kiri"
              showSearch={false}
              isClearable={false}
              className="w-40 text-[10px] md:text-[11px] text-slate-100 [&_button]:bg-slate-900 [&_button]:border-slate-700 [&_span]:text-slate-100 [&_button]:py-0.5 [&_button]:px-2"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-300 font-bold">Logo Kanan:</span>
            <SearchableSelect
              value={logoRight}
              onChange={(val) => setLogoRight(val)}
              options={[
                { value: 'kemdikbud', label: 'Kemendikdasmen' },
                { value: 'kemenag', label: 'Kemenag' },
                { value: 'sekolah', label: 'Sekolah (Lembaga)' },
                { value: 'none', label: 'Tanpa Logo (Kosong)' }
              ]}
              placeholder="Logo Kanan"
              showSearch={false}
              isClearable={false}
              className="w-40 text-[10px] md:text-[11px] text-slate-100 [&_button]:bg-slate-900 [&_button]:border-slate-700 [&_span]:text-slate-100 [&_button]:py-0.5 [&_button]:px-2"
            />
          </div>
        </div>


        {isInIframe && (
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg max-w-xs xl:max-w-md">
            <Info size={11} className="shrink-0 text-amber-400" />
            <span>Jika unduh/cetak terkendala di pratinjau, silakan klik ikon <b>Buka di Tab Baru</b> di kanan atas layar.</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Printer size={14} />
            <span>Cetak</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 md:flex-initial px-4 py-2 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${
              isDownloading 
                ? 'bg-indigo-400 cursor-not-allowed opacity-75' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Download size={14} />
                <span>Unduh</span>
              </>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all font-bold cursor-pointer flex items-center justify-center"
              title="Tutup"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Wrapper - handles horizontal scroll on small devices to prevent squeezing A4 template */}
      <div className="w-full flex justify-center overflow-hidden pb-10">
        <div id="print-wrapper" className="w-[800px] max-w-[800px] mx-auto py-8 px-0 sm:px-0 print:py-0 print:px-0 print:w-full print:max-w-none"
             style={{ zoom: zoomLevel }}>
        {resolvedTeachers.map((teacher, tIdx) => (
          <div 
            key={teacher.id} 
            className={`print-container bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/50 relative ${
              tIdx > 0 ? 'mt-8 print:mt-0' : ''
            }`}
          >

          {/* Boxed Formal Header matching the reference image */}
          <div className={`bg-slate-100/60 border border-slate-200 rounded-2xl grid ${
            logoLeft !== 'none' && logoRight !== 'none' 
              ? 'grid-cols-[1fr_3.5fr_1fr]' 
              : logoLeft !== 'none' 
                ? 'grid-cols-[1fr_4fr]' 
                : logoRight !== 'none' 
                  ? 'grid-cols-[4fr_1fr]' 
                  : 'grid-cols-1'
          } items-stretch text-center font-sans overflow-hidden`}>
            {/* Left Column: Logos */}
            {logoLeft !== 'none' && (
              <div className="p-3 flex items-center justify-center bg-transparent">
                {leftLogoSrc ? (
                  <img 
                    src={leftLogoSrc} 
                    alt="Logo Kiri" 
                    className="h-16 w-auto object-contain max-h-16" 
                    onError={(e) => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      e.currentTarget.src = logoLeft === 'kemdikbud' 
                        ? `${origin}/tut-wuri.png` 
                        : logoLeft === 'kemenag' 
                          ? `${origin}/kemenag.png` 
                          : '';
                      if (logoLeft === 'sekolah') {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center text-[#0066b2]" title="Logo Default Sekolah">
                    {/* Fallback school shield SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full" fill="currentColor">
                      <path d="M50 5 L15 25 V55 C15 75 50 95 50 95 C50 95 85 75 85 55 V25 L50 5 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"/>
                      <path d="M50 20 L25 33 V53 C25 67 50 81 50 81 C50 81 75 67 75 53 V33 L50 20 Z" fill="currentColor" opacity="0.15"/>
                      <path d="M35 42 L50 35 L65 42 L50 49 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
                      <path d="M50 49 V68" fill="none" stroke="currentColor" strokeWidth="4"/>
                      <path d="M40 58 H60" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )}

            {/* Center Column: Text */}
            <div className="flex flex-col justify-center items-center py-4 px-2">
              <h1 className="text-sm font-black tracking-widest text-[#0066b2] uppercase leading-tight">
                BIODATA GURU & TENDIK
              </h1>
              <h2 className="text-base font-black tracking-wide text-[#0066b2] uppercase mt-0.5">
                {resolvedInstitution.name ? resolvedInstitution.name.toUpperCase() : 'SMPN 3 CIKALONGWETAN'}
              </h2>
            </div>

            {/* Right Column: Logos */}
            {logoRight !== 'none' && (
              <div className="p-3 flex items-center justify-center bg-transparent">
                {rightLogoSrc ? (
                  <img 
                    src={rightLogoSrc} 
                    alt="Logo Kanan" 
                    className="h-16 w-auto object-contain max-h-16" 
                    onError={(e) => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : '';
                      e.currentTarget.src = logoRight === 'kemdikbud' 
                        ? `${origin}/tut-wuri.png` 
                        : logoRight === 'kemenag' 
                          ? `${origin}/kemenag.png` 
                          : '';
                      if (logoRight === 'sekolah') {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <div className="h-14 w-14 flex items-center justify-center text-[#0066b2]" title="Logo Default Sekolah">
                    {/* Fallback school shield SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full" fill="currentColor">
                      <path d="M50 5 L15 25 V55 C15 75 50 95 50 95 C50 95 85 75 85 55 V25 L50 5 Z" fill="none" stroke="currentColor" strokeWidth="6" strokeLinejoin="round"/>
                      <path d="M50 20 L25 33 V53 C25 67 50 81 50 81 C50 81 75 67 75 53 V33 L50 20 Z" fill="currentColor" opacity="0.15"/>
                      <path d="M35 42 L50 35 L65 42 L50 49 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
                      <path d="M50 49 V68" fill="none" stroke="currentColor" strokeWidth="4"/>
                      <path d="M40 58 H60" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thin Divider line */}
          <div className="border-b border-slate-300 mt-3 mb-5"></div>

          {/* SECTION 1: IDENTITAS PRIBADI */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              01. Identitas Pribadi
            </h3>
            
            {/* Row with left fields and right photo */}
            <div className="flex gap-3 items-stretch mb-2">
              <div className="flex-1 flex flex-col gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Nama Lengkap", "w-44")}
                  <span className="font-extrabold text-[#0066b2] uppercase text-sm">{teacher.nama}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Tempat/Tanggal Lahir", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {teacher.tempatLahir}, {teacher.tanggalLahir ? teacher.tanggalLahir.split('-').reverse().join('/') : '-'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Jenis Kelamin", "w-24")}
                    <span className="font-semibold text-slate-700">{teacher.jk || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Agama", "w-24")}
                    <span className="font-semibold text-slate-700">-</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("No. HP/WA", "w-24")}
                    <span className="font-semibold text-slate-700">{teacher.hp || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Email", "w-24")}
                    <span className="font-semibold text-slate-700 break-all leading-tight">{teacher.email || '-'}</span>
                  </div>
                </div>
              </div>
              
              {/* Photo 4x6 aspect ratio box */}
              <div className="w-[4cm] shrink-0 border border-slate-300 p-0.5 bg-white relative self-start" style={{ height: '6cm' }}>
                {teacher.foto ? (
                  <img 
                    src={teacher.foto} 
                    alt="Foto Profil" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100">
                    <span className="text-slate-400 font-bold text-[10px] uppercase text-center leading-tight">Foto<br/>4x6</span>
                  </div>
                )}
              </div>
            </div>

            <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center mt-2">
              {renderFieldLabel("Alamat Lengkap", "w-44")}
              <span className="font-semibold text-slate-700">{teacher.alamat || '-'}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("NIK", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.nik || '-'}</span>
              </div>
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Username Akun", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.username || '-'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: DATA KEPEGAWAIAN */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              02. Data Kepegawaian
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Status Pegawai", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.statusPegawai || '-'}</span>
              </div>
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("NUPTK", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.nuptk || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Tugas Utama", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.tugasUtama || '-'}</span>
              </div>
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Tugas Tambahan", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.tugasTambahan || '-'}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Beban Mengajar", "w-44")}
                <span className="font-semibold text-slate-700">{teacher.jamPelajaran || 0} Jam Pelajaran (JP)</span>
              </div>
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                {renderFieldLabel("Masa Tugas", "w-44")}
                <span className="font-semibold text-slate-700">
                  {teacher.mulaiBertugas ? teacher.mulaiBertugas.split('-').reverse().join('/') : '-'} 
                  &nbsp;&mdash;&nbsp; 
                  {teacher.akhirBertugas ? teacher.akhirBertugas.split('-').reverse().join('/') : 'Sekarang'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: PENDIDIKAN FORMAL */}
          <div className="mb-2">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              03. Riwayat Pendidikan Formal
            </h3>
            
            <div className="space-y-1">
              {[
                { level: 'S3', school: teacher.instansiS3, major: teacher.jurusanS3 },
                { level: 'S2', school: teacher.instansiS2, major: teacher.jurusanS2 },
                { level: 'S1', school: teacher.instansiS1, major: teacher.jurusanS1 },
                { level: 'D4', school: teacher.instansiD4, major: teacher.jurusanD4 },
                { level: 'D3', school: teacher.instansiD3, major: teacher.jurusanD3 },
                { level: 'D2', school: teacher.instansiD2, major: teacher.jurusanD2 },
                { level: 'D1', school: teacher.instansiD1, major: teacher.jurusanD1 },
                { level: 'SMA/SMK', school: teacher.instansiSMA },
                { level: 'SMP/MTs', school: teacher.instansiSMP },
                { level: 'SD/MI', school: teacher.instansiSD },
              ].filter(edu => edu.school).map((edu, idx) => (
                <div key={idx} className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex flex-col md:flex-row md:items-center">
                  <div className="w-24 shrink-0 font-bold text-[#0066b2]">{edu.level}</div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-800">{edu.school}</span>
                    {edu.major && <span className="text-slate-500 ml-2">({edu.major})</span>}
                  </div>
                </div>
              ))}
              {![
                teacher.instansiS3, teacher.instansiS2, teacher.instansiS1, teacher.instansiD4,
                teacher.instansiD3, teacher.instansiD2, teacher.instansiD1, teacher.instansiSMA,
                teacher.instansiSMP, teacher.instansiSD
              ].some(Boolean) && (
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs italic text-slate-500 text-center">
                  Riwayat pendidikan belum diisi.
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footnote signatures or date stamp */}
          <div className="print-footnote mt-6 pt-3 border-t border-slate-300 flex flex-row items-end justify-between text-[8.5px] text-slate-400 font-bold w-full">
            <div className="text-left">
              <p>Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="mt-0.5">{resolvedInstitution.name} - Sistem Manajemen Informasi</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-500 underline">Dokumen Sah Terverifikasi</p>
            </div>
          </div>

          </div>
        ))}
        </div>
      </div>
    </div>
  );
};
