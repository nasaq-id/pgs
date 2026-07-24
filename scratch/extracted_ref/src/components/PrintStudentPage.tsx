import React, { useEffect, useState } from 'react';
import { Printer, X, Info, Download, Loader2, ChevronDown } from 'lucide-react';
import { Student, Institution } from '../types';
import { KopSurat } from './KopSurat';
import { safeJSONParse } from '../lib/json';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

interface PrintStudentPageProps {
  studentId?: string;
  students: Student[];
  institution: Institution;
  printClass?: string;
  printAll?: boolean;
  onClose?: () => void;
}

export const PrintStudentPage: React.FC<PrintStudentPageProps> = ({ 
  studentId, 
  students, 
  institution,
  printClass,
  printAll,
  onClose
}) => {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const printClassParam = printClass || (params ? params.get('print-class') : null);
  const printAllParam = printAll || (params ? params.get('print-all') === 'true' : false);
  const printStudentParam = studentId || (params ? params.get('print-student') : null);

  // Attempt to resolve student list and institution from various sources
  let resolvedStudents: Student[] = [];
  let resolvedInstitution: Institution = institution;

  // Helper to safely decode URL parameters
  const getDecodedParam = (paramName: string) => {
    try {
      const val = params.get(paramName);
      if (val) {
        return safeJSONParse(decodeURIComponent(val));
      }
    } catch (e) {
      console.warn(`Failed to decode url parameter ${paramName}:`, e);
    }
    return null;
  };

  // Resolve Institution
  if ((window as any).__MTS_INSTITUTION_DATA__) {
    resolvedInstitution = (window as any).__MTS_INSTITUTION_DATA__;
  }
  if (window.opener && !window.opener.closed) {
    try {
      if (window.opener.__MTS_INSTITUTION__) {
        resolvedInstitution = window.opener.__MTS_INSTITUTION__;
      }
    } catch (e) {
      console.warn(e);
    }
  }
  const urlInst = getDecodedParam('inst-data');
  if (urlInst) {
    resolvedInstitution = { ...resolvedInstitution, ...urlInst };
  }

  if (resolvedInstitution) {
    const localInst = institution; // Loaded from App.tsx default/local cache
    if (!resolvedInstitution.logo && localInst?.logo) resolvedInstitution.logo = localInst.logo;
    if (!resolvedInstitution.kemenagLogo && localInst?.kemenagLogo) resolvedInstitution.kemenagLogo = localInst.kemenagLogo;
    if (!resolvedInstitution.kemdikbudLogo && localInst?.kemdikbudLogo) resolvedInstitution.kemdikbudLogo = localInst.kemdikbudLogo;
  }

  // Resolve Students list
  if (printAllParam) {
    resolvedStudents = students;
  } else if (printClassParam) {
    resolvedStudents = students.filter(s => s.kelas === printClassParam);
  } else if (printStudentParam) {
    let resolvedStudent: Student | undefined = students.find(s => s.id === printStudentParam);
    if (!resolvedStudent && (window as any).__MTS_SINGLE_STUDENT_DATA__) {
      resolvedStudent = (window as any).__MTS_SINGLE_STUDENT_DATA__;
    }
    if (window.opener && !window.opener.closed) {
      try {
        if (!resolvedStudent && window.opener.__MTS_SINGLE_STUDENT_DATA__ && window.opener.__MTS_SINGLE_STUDENT_DATA__.id === printStudentParam) {
          resolvedStudent = window.opener.__MTS_SINGLE_STUDENT_DATA__;
        }
        if (!resolvedStudent && window.opener.__MTS_STUDENTS__) {
          resolvedStudent = window.opener.__MTS_STUDENTS__.find((s: any) => s.id === printStudentParam);
        }
      } catch (e) {
        console.warn("Failed to access window.opener properties:", e);
      }
    }
    if (!resolvedStudent) {
      const urlStudent = getDecodedParam('student-data');
      if (urlStudent && urlStudent.id === printStudentParam) {
        resolvedStudent = urlStudent;
      }
    }
    if (resolvedStudent) {
      resolvedStudents = [resolvedStudent];
    }
  }

  // Recover photo of students if missing
  resolvedStudents = resolvedStudents.map(std => {
    const copy = { ...std };
    if (!copy.foto) {
      const localMatch = students.find(s => s.id === copy.id);
      if (localMatch && localMatch.foto) {
        copy.foto = localMatch.foto;
      } else if (window.opener && !window.opener.closed) {
        try {
          const parentMatch = window.opener.__MTS_STUDENTS__?.find((s: any) => s.id === copy.id);
          if (parentMatch && parentMatch.foto) {
            copy.foto = parentMatch.foto;
          }
        } catch (e) {
          console.warn("Failed to recover foto from parent window:", e);
        }
      }
    }
    return copy;
  });

  // State for customized logos
  const [logoLeft, setLogoLeft] = React.useState<string>(() => {
    return params ? (params.get('logo-left') || 'sekolah') : 'sekolah';
  });
  const [logoRight, setLogoRight] = React.useState<string>(() => {
    return params ? (params.get('logo-right') || 'kemdikbud') : 'kemdikbud';
  });

  const getLogoSrc = (logoType: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (logoType === 'sekolah') {
      const logo = resolvedInstitution.logo;
      if (!logo || logo === 'null' || logo === 'undefined' || logo.trim() === '') return null;
      return logo;
    }
    if (logoType === 'kemdikbud') {
      const logo = resolvedInstitution.kemdikbudLogo;
      if (!logo || logo === 'null' || logo === 'undefined' || logo.trim() === '') {
        return origin ? `${origin}/tut-wuri.png` : '/tut-wuri.png';
      }
      return logo;
    }
    if (logoType === 'kemenag') {
      const logo = resolvedInstitution.kemenagLogo;
      if (!logo || logo === 'null' || logo === 'undefined' || logo.trim() === '') {
        return origin ? `${origin}/kemenag.png` : '/kemenag.png';
      }
      return logo;
    }
    return null;
  };

  const renderFieldLabel = (text: string, widthClass: string = "w-44") => {
    return (
      <span className={`font-bold text-slate-800 shrink-0 ${widthClass} flex justify-between pr-2.5`}>
        <span>{text}</span>
        <span>:</span>
      </span>
    );
  };

  const leftLogoSrc = getLogoSrc(logoLeft);
  const rightLogoSrc = getLogoSrc(logoRight);

  if (resolvedStudents.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-lg border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800">Siswa Tidak Ditemukan</h2>
          <p className="text-slate-500 text-sm mt-2">Data profil siswa tidak dapat ditemukan dalam sistem.</p>
          <button 
            onClick={() => window.close()}
            className="mt-6 px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer text-sm"
          >
            Tutup Halaman
          </button>
        </div>
      </div>
    );
  }

  const getAge = (dobString: string) => {
    if (!dobString) return '-';
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return `${age} Tahun`;
    } catch (e) {
      return '-';
    }
  };

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsInIframe(window.self !== window.top);
    }
  }, []);

  const handlePrint = () => {
    try {
      const printWrapper = document.getElementById('print-wrapper');
      let originalZoom = '';
      if (printWrapper) {
        originalZoom = printWrapper.style.zoom;
        printWrapper.style.zoom = '1';
      }

      const containers = document.querySelectorAll('.print-container');
      if (containers.length === 0) {
        alert("Tidak ada dokumen yang dapat dicetak.");
        return;
      }

      // Check if we are inside an iframe (like AI Studio preview)
      const isInsideIframe = window.self !== window.top;

      if (isInsideIframe) {
        // Since we are inside an iframe, direct window.print() is blocked by browser sandbox policies.
        // We open a temporary top-level window/tab, write our content, run print, and close it.
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          // Collect all current stylesheets to preserve beautiful Tailwind styling
          let stylesHtml = '';
          document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
            stylesHtml += el.outerHTML;
          });

          printWindow.document.open();
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Cetak Biodata Siswa</title>
                ${stylesHtml}
                <style>
                  ${PRINT_CSS}
                  /* Screen preview style inside the temporary print window before print dialog launches */
                  body {
                    background: #f8fafc !important;
                    padding: 20px !important;
                  }
                  #print-wrapper {
                    max-width: 800px;
                    margin: 0 auto;
                  }
                  .print-container {
                    background: white;
                    border-radius: 24px;
                    padding: 32px;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #e2e8f0;
                    margin-bottom: 24px;
                  }
                  @media print {
                    body {
                      background: white !important;
                      padding: 0 !important;
                    }
                    #print-wrapper {
                      max-width: none !important;
                      margin: 0 !important;
                    }
                    .print-container {
                      border-radius: 0 !important;
                      padding: 0 !important;
                      box-shadow: none !important;
                      border: none !important;
                      margin: 0 !important;
                    }
                  }
                </style>
              </head>
              <body>
                <div id="print-wrapper">
                  ${Array.from(containers).map(c => c.outerHTML).join('')}
                </div>
                <script>
                  window.addEventListener('load', () => {
                    // Wait for layout to settle and images to load
                    setTimeout(() => {
                      window.focus();
                      window.print();
                      setTimeout(() => {
                        window.close();
                      }, 1000);
                    }, 500);
                  });
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          return;
        }
      }

      // Top-level or fallback print execution
      window.focus();
      window.print();
    } catch (e) {
      console.warn("Direct window write print failed, falling back to standard print:", e);
      try {
        window.print();
      } catch (err) {
        alert("Gagal memicu pencetakan. Silakan gunakan tombol 'Unduh' untuk mengunduh PDF atau buka aplikasi di Tab Baru (ikon di kanan atas) lalu coba lagi.");
      }
    }
  };

  const getCleanBase64 = async (src: string): Promise<string | null> => {
    if (!src) return null;
    if (src.startsWith('data:')) return src;
    if (src.startsWith('blob:')) return src;

    let targetUrl = src;
    if (src.startsWith('/')) {
      targetUrl = window.location.origin + src;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 seconds timeout

      const response = await fetch(targetUrl, {
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`[Base64 Conversion failed] url: ${src}`, error);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      if (resolvedStudents.length === 0) {
        alert("Tidak ada data siswa untuk diunduh.");
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

      // Kembalikan posisi scroll
      if (printWrapper) {
        printWrapper.style.zoom = originalZoom;
      }

      // Kembalikan posisi scroll
      window.scrollTo(originalScrollX, originalScrollY);

      // Generate accurate descriptive name for download
      let filename = 'biodata_siswa.pdf';
      if (resolvedStudents.length === 1) {
        filename = `biodata_${resolvedStudents[0].nama.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      } else if (printClassParam) {
        filename = `biodata_kelas_${printClassParam.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      } else if (printAllParam) {
        filename = 'biodata_semua_siswa.pdf';
      }

      // Try saving with defensive fallbacks if iframe blocks standard download
      try {
        pdf.save(filename);
      } catch (saveError) {
        console.warn("Direct pdf.save failed, trying blob URL fallback:", saveError);
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const win = window.open(blobUrl, '_blank');
        if (!win) {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (error) {
      console.error("Gagal mengunduh PDF:", error);
      alert("Terjadi kesalahan saat mengunduh dokumen: " + error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans print:bg-white print:text-black">
      {/* Printable CSS Page Size Config for Portrait printing */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      {/* Top action bar - hidden in print */}
      <div className="no-print bg-slate-900 text-white py-2.5 px-4 sticky top-0 z-[9999] shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-800 text-teal-400 rounded-lg shrink-0">
            <Printer size={18} />
          </div>
          <div>
            <h1 className="text-[11px] md:text-xs font-black tracking-wide uppercase text-teal-400">Modul Cetak Biodata</h1>
            <p className="text-[10px] md:text-[11px] text-slate-300 leading-tight">Dokumen siap dicetak ({resolvedStudents.length} Siswa).</p>
          </div>
        </div>

        {/* Live Logo Selection inside Print Page */}
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

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer size={12} />
            <span>Cetak</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex-1 md:flex-initial px-3 py-1.5 text-white font-black text-[11px] uppercase tracking-wider rounded-lg transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 ${
              isDownloading 
                ? 'bg-indigo-400 cursor-not-allowed opacity-75' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Mengunduh...</span>
              </>
            ) : (
              <>
                <Download size={12} />
                <span>Unduh</span>
              </>
            )}
          </button>
          <button
            onClick={onClose ? onClose : () => window.close()}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all text-[11px] font-bold cursor-pointer flex items-center justify-center"
            title="Tutup"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Main Container Wrapper - handles horizontal scroll on small devices to prevent squeezing A4 template */}
      <div className="w-full flex justify-center overflow-hidden pb-10">
        <div id="print-wrapper" className="w-[800px] max-w-[800px] mx-auto py-8 px-0 sm:px-0 print:py-0 print:px-0 print:w-full print:max-w-none"
             style={{ zoom: zoomLevel }}>
        {resolvedStudents.map((student, sIdx) => (
          <div 
            key={student.id} 
            className={`print-container bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-200/50 relative ${
              sIdx > 0 ? 'mt-8 print:mt-0' : ''
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
                BIODATA SISWA
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

          {/* SECTION 1: DATA SISWA */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              01. Data Siswa
            </h3>
            
            {/* Row with left fields and right photo */}
            <div className="flex gap-3 items-stretch mb-2">
              <div className="flex-1 flex flex-col gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Nama Lengkap", "w-44")}
                  <span className="font-extrabold text-[#0066b2] uppercase text-sm">{student.nama}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Tempat/Tanggal Lahir", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {student.tempatLahir}, {student.tanggalLahir ? student.tanggalLahir.split('-').reverse().join('/') : '-'}
                  </span>
                </div>
                {/* Agama and Jenis Kelamin moved here to align with the photo height */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Agama", "w-24")}
                    <span className="font-semibold text-slate-700">{student.agama || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Jenis Kelamin", "w-24")}
                    <span className="font-semibold text-slate-700">{student.jk || '-'}</span>
                  </div>
                </div>
                {/* Cita-cita and Hobi moved here to fill empty space and match photo height */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Cita-cita", "w-24")}
                    <span className="font-semibold text-slate-700">{student.citaCita || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Hobi", "w-24")}
                    <span className="font-semibold text-slate-700">{student.hoby || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Foto 4x6 */}
              <div className="w-[96px] shrink-0 border border-slate-300 p-1 bg-white rounded-sm flex flex-col items-center justify-center">
                {student.foto ? (
                  <img src={student.foto} alt={student.nama} className="w-full h-[144px] object-cover rounded-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-[144px] bg-slate-50 flex flex-col items-center justify-center text-center p-1 text-[9px] text-slate-400 font-bold border border-dashed border-slate-200">
                    <span>FOTO 4x6</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rest of student fields */}
            <div className="space-y-2">
              {/* Row with 2 cols (Status and Kelas Aktif) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Status", "w-44")}
                  <span className="font-semibold text-slate-700">{student.status || 'Aktif'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Kelas Aktif", "w-44")}
                  <span className="font-bold text-slate-700">{student.kelas || '-'}</span>
                </div>
              </div>

              {/* Row with 2 cols (NIS / NISN and Anak Ke-) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("NIS / NISN", "w-44")}
                  <span className="font-bold text-slate-700">{student.nis} / {student.nisn || '-'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Anak Ke-", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {student.anakKe || '1'} dari {student.jumlahSaudara || '1'} bersaudara
                  </span>
                </div>
              </div>

              {/* Row with 2 cols (Pembiaya Sekolah and Kewarganegaraan) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Pembiaya Sekolah", "w-44")}
                  <span className="font-semibold text-slate-700">{student.pembiaya || '-'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Kewarganegaraan", "w-44")}
                  <span className="font-semibold text-slate-700">{student.kewarganegaraan || '-'}</span>
                </div>
              </div>

              {/* Row with 2 cols (Nomor Telepon and Email Siswa) */}
              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Nomor Telepon", "w-44")}
                  <span className="font-semibold text-slate-700">{student.hp || '-'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Email Siswa", "w-44")}
                  <span className="font-semibold text-slate-700">{student.email || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ALAMAT & TEMPAT TINGGAL */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              02. Alamat & Tempat Tinggal
            </h3>
            
            <div className="space-y-2">
              <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-start gap-2">
                {renderFieldLabel("Alamat Rumah", "w-44")}
                <span className="font-semibold text-slate-700">
                  {student.alamat.ayah.jalan ? `${student.alamat.ayah.jalan}, ` : ''} 
                  {student.alamat.ayah.rt || student.alamat.ayah.rw ? `RT ${student.alamat.ayah.rt || '00'}/RW ${student.alamat.ayah.rw || '00'}, ` : ''}
                  {student.alamat.ayah.kel ? `Desa/Kel. ${student.alamat.ayah.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                  {student.alamat.ayah.kec ? `Kec. ${student.alamat.ayah.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                  {student.alamat.ayah.kab ? `${student.alamat.ayah.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                  {student.alamat.ayah.prov ? `${student.alamat.ayah.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                  {student.alamat.ayah.kodepos ? ` (${student.alamat.ayah.kodepos})` : ''}
                </span>
              </div>

              {student.alamat.ibu && !student.alamat.ibu.samaDenganAyah && (
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-start gap-2">
                  {renderFieldLabel("Alamat Ibu", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {student.alamat.ibu.jalan ? `${student.alamat.ibu.jalan}, ` : ''} 
                    {student.alamat.ibu.rt || student.alamat.ibu.rw ? `RT ${student.alamat.ibu.rt || '00'}/RW ${student.alamat.ibu.rw || '00'}, ` : ''}
                    {student.alamat.ibu.kel ? `Desa/Kel. ${student.alamat.ibu.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                    {student.alamat.ibu.kec ? `Kec. ${student.alamat.ibu.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                    {student.alamat.ibu.kab ? `${student.alamat.ibu.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                    {student.alamat.ibu.prov ? `${student.alamat.ibu.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                    {student.alamat.ibu.kodepos ? ` (${student.alamat.ibu.kodepos})` : ''}
                  </span>
                </div>
              )}

              {student.waliData && student.waliData.statusWali === 'Lainnya' && student.alamat.wali && student.alamat.wali.statusAlamatWali === 'Lainnya' && (
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-start gap-2">
                  {renderFieldLabel("Alamat Wali", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {student.alamat.wali.jalan ? `${student.alamat.wali.jalan}, ` : ''} 
                    {student.alamat.wali.rt || student.alamat.wali.rw ? `RT ${student.alamat.wali.rt || '00'}/RW ${student.alamat.wali.rw || '00'}, ` : ''}
                    {student.alamat.wali.kel ? `Desa/Kel. ${student.alamat.wali.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                    {student.alamat.wali.kec ? `Kec. ${student.alamat.wali.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                    {student.alamat.wali.kab ? `${student.alamat.wali.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                    {student.alamat.wali.prov ? `${student.alamat.wali.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                    {student.alamat.wali.kodepos ? ` (${student.alamat.wali.kodepos})` : ''}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Status Kepemilikan", "w-44")}
                  <span className="font-semibold text-slate-700">{student.alamat.ayah.kepemilikan || '-'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Tinggal Dengan", "w-44")}
                  <span className="font-semibold text-slate-700">{student.alamat.domisili.statusTempatTinggal || '-'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Alat Transportasi", "w-44")}
                  <span className="font-semibold text-slate-700">{student.alamat.domisili.transportasi || '-'}</span>
                </div>
                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Jarak & Waktu", "w-44")}
                  <span className="font-semibold text-slate-700">
                    {student.alamat.domisili.jarak || '-'} ({student.alamat.domisili.waktuTempuh || '-'})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: DATA ORANG TUA / WALI */}
          <div className="mb-4">
            <h3 className="text-xs font-black uppercase text-[#0066b2] tracking-wider mb-2.5">
              03. Data Orang Tua / Wali
            </h3>
            
            {/* AYAH */}
            <div className="mb-4">
              <h4 className="text-[10px] font-black uppercase text-teal-700 tracking-wide mb-1.5 pl-1 border-l-2 border-teal-500">
                1. Ayah Kandung
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Nama Ayah", "w-44")}
                    <span className="font-bold text-slate-700">{student.ayah.nama || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("NIK Ayah", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.nik || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Tempat, Tanggal Lahir", "w-44")}
                    <span className="font-semibold text-slate-700">
                      {student.ayah.tempatLahir || '-'}{student.ayah.tanggalLahir ? `, ${student.ayah.tanggalLahir.split('-').reverse().join('/')}` : ''}
                    </span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("No. HP/WA", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.hp || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Pendidikan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.pendidikan || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Pekerjaan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.pekerjaan || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Penghasilan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.penghasilan || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Kewarganegaraan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ayah.wn || 'WNI'}</span>
                  </div>
                </div>

                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Status Kehidupan", "w-44")}
                  <span className="font-semibold text-slate-700">{student.ayah.status}</span>
                </div>
              </div>
            </div>

            {/* IBU */}
            <div className="mb-4">
              <h4 className="text-[10px] font-black uppercase text-indigo-700 tracking-wide mb-1.5 pl-1 border-l-2 border-indigo-500">
                2. Ibu Kandung
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Nama Ibu", "w-44")}
                    <span className="font-bold text-slate-700">{student.ibu.nama || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("NIK Ibu", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.nik || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Tempat, Tanggal Lahir", "w-44")}
                    <span className="font-semibold text-slate-700">
                      {student.ibu.tempatLahir || '-'}{student.ibu.tanggalLahir ? `, ${student.ibu.tanggalLahir.split('-').reverse().join('/')}` : ''}
                    </span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("No. HP/WA", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.hp || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Pendidikan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.pendidikan || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Pekerjaan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.pekerjaan || '-'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Penghasilan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.penghasilan || '-'}</span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Kewarganegaraan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.ibu.wn || 'WNI'}</span>
                  </div>
                </div>

                <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                  {renderFieldLabel("Status Kehidupan", "w-44")}
                  <span className="font-semibold text-slate-700">{student.ibu.status}</span>
                </div>
              </div>
            </div>

            {/* WALI (ALWAYS SHOW TO KEEP LAYOUT SYMMETRICAL AND MATCH BIODATA MODULE) */}
            <div className="mb-2">
              <h4 className="text-[10px] font-black uppercase text-purple-700 tracking-wide mb-1.5 pl-1 border-l-2 border-purple-500">
                3. Wali Utama
              </h4>
              {student.waliData?.statusWali === 'Sama dengan ayah kandung' || student.waliData?.statusWali === 'Sama dengan ibu kandung' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Hubungan", "w-44")}
                    <span className="font-semibold text-slate-700">
                      Sama dengan {student.waliData?.statusWali === 'Sama dengan ayah kandung' ? 'Ayah Kandung' : 'Ibu Kandung'}
                    </span>
                  </div>
                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Nama Wali", "w-44")}
                    <span className="font-bold text-slate-700">{student.waliData?.nama || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("Nama Wali", "w-44")}
                      <span className="font-bold text-slate-700">{student.waliData?.nama || '-'}</span>
                    </div>
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("Hubungan", "w-44")}
                      <span className="font-semibold text-slate-700">
                        {student.waliData?.hubungan || 'Wali'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("NIK Wali", "w-44")}
                      <span className="font-semibold text-slate-700">{student.waliData?.nik || '-'}</span>
                    </div>
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("No. HP Wali", "w-44")}
                      <span className="font-semibold text-slate-700">{student.waliData?.hp || '-'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("Pendidikan", "w-44")}
                      <span className="font-semibold text-slate-700">{student.waliData?.pendidikan || '-'}</span>
                    </div>
                    <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                      {renderFieldLabel("Pekerjaan", "w-44")}
                      <span className="font-semibold text-slate-700">{student.waliData?.pekerjaan || '-'}</span>
                    </div>
                  </div>

                  <div className="printable-row bg-[#f2f2f2] px-3 py-1.5 rounded-sm text-xs flex items-center">
                    {renderFieldLabel("Penghasilan", "w-44")}
                    <span className="font-semibold text-slate-700">{student.waliData?.penghasilan || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footnote signatures or date stamp */}
          <div className="print-footnote mt-6 pt-3 border-t border-slate-300 flex flex-row items-end justify-between text-[8.5px] text-slate-400 font-bold w-full">
            <div className="text-left">
              <p>Dicetak pada tanggal: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="mt-0.5">MTS At-Turmudzi - Sistem Manajemen Informasi Madrasah</p>
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
