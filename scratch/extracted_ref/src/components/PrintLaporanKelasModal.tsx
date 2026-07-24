import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import { Kelas, Student, Institution } from '../types';
import { KopSurat } from './KopSurat';

interface PrintLaporanKelasModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Kelas[];
  students: Student[];
  institution: Institution;
}

export const PrintLaporanKelasModal: React.FC<PrintLaporanKelasModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  institution
}) => {
  const handlePrint = () => {
    window.print();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get dynamic unique list of academic years or tingkat levels
  const activeTingkatList = useMemo(() => {
    const list = Array.from(new Set(classes.map(c => c.tingkat).filter(Boolean))) as string[];
    const sorted = list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    return sorted.length > 0 ? sorted : ['7', '8', '9'];
  }, [classes]);

  // Calculate statistics per class for the main table
  const mainTableClasses = useMemo(() => {
    const sortedClasses = [...classes].sort((a, b) => {
      if (a.tingkat !== b.tingkat) return a.tingkat.localeCompare(b.tingkat, undefined, { numeric: true });
      return a.nama.localeCompare(b.nama, undefined, { numeric: true });
    });

    return sortedClasses.map((cls) => {
      const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
      const L = classStudents.filter(s => s.jenisKelamin === 'L').length;
      const P = classStudents.filter(s => s.jenisKelamin === 'P').length;
      const Jml = L + P;

      return {
        id: cls.id,
        label: cls.nama,
        L,
        P,
        Jml
      };
    });
  }, [classes, students]);

  if (!isOpen) return null;

  const months = [
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni'
  ];

  return createPortal(
    <div 
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-hidden"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-[95vw] lg:max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div>
            <h2 className="text-base sm:text-xl font-extrabold text-slate-800">Preview Laporan Keadaan Siswa</h2>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Tampilan cetak lembar kerja keadaan siswa per bulan dalam 1 tahun ajaran.</p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={handlePrint}
              className="flex items-center px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-bold text-xs sm:text-sm shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Cetak PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-100/60 flex justify-start md:justify-center">
          <div className="bg-white p-4 sm:p-8 shadow-sm rounded-2xl border border-slate-200/80 min-w-[290mm] print:shadow-none print:rounded-none print:border-none print:p-0">
            <div className="print-area bg-white w-full">
              {/* Print Content */}
              <KopSurat institution={institution} />
              
              <div className="text-center mt-6 mb-8">
                <h3 className="font-extrabold text-base sm:text-lg uppercase underline tracking-wide">Laporan Keadaan Siswa</h3>
                <p className="font-semibold text-xs sm:text-sm mt-1 text-slate-600 print:text-black font-mono">Tahun Pelajaran: {new Date().getFullYear()}/{new Date().getFullYear() + 1}</p>
              </div>

              {/* Vertical Container for Main Table and Summary Table */}
              <div className="flex flex-col gap-8 w-full">
                {/* Top: Main Table */}
                <div className="w-full">
                  <table className="w-full text-[10px] sm:text-[11px] border-collapse border border-black">
                    <thead>
                      <tr className="bg-slate-100 print:bg-slate-100">
                        <th className="border border-black p-1 text-center font-bold w-8" rowSpan={2}>No</th>
                        <th className="border border-black p-1 text-center font-bold w-12" rowSpan={2}>Kelas</th>
                        <th className="border border-black p-1 text-center font-bold w-12" rowSpan={2}>L/P/Jml</th>
                        <th className="border border-black p-1 text-center font-bold" colSpan={12}>Bulan</th>
                      </tr>
                      <tr className="bg-slate-100 print:bg-slate-100">
                        {months.map((m, i) => (
                          <th key={i} className="border border-black p-1 text-[9px] w-12 text-center font-bold">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mainTableClasses.map((cls, idx) => (
                        <React.Fragment key={idx}>
                          <tr className="bg-white">
                            <td className="border border-black p-1 text-center font-bold w-8" rowSpan={3}>
                              {idx + 1}
                            </td>
                            <td className="border border-black p-1 text-center font-bold text-slate-800 print:text-black w-12" rowSpan={3}>
                              {cls.label}
                            </td>
                            <td className="border border-black p-1 text-center font-bold text-slate-600 print:text-black w-12">L</td>
                            {months.map((_, i) => (
                              <td key={`L-${i}`} className="border border-black p-1 text-center font-medium">
                                {cls.L}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-black p-1 text-center font-bold text-slate-600 print:text-black w-12">P</td>
                            {months.map((_, i) => (
                              <td key={`P-${i}`} className="border border-black p-1 text-center font-medium">
                                {cls.P}
                              </td>
                            ))}
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-black p-1 text-center font-bold text-slate-900 print:text-black w-12">Jml</td>
                            {months.map((_, i) => (
                              <td key={`Jml-${i}`} className="border border-black p-1 text-center font-bold">
                                {cls.Jml}
                              </td>
                            ))}
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom: Rekapitulasi Table */}
                <div className="w-full mt-2">
                  <table className="w-full text-[10px] sm:text-[11px] border-collapse border border-black">
                    <thead>
                      <tr className="bg-[#d1e4f3] print:bg-[#d1e4f3] print:color-adjust-exact">
                        <th className="border border-black p-1.5 text-center font-semibold text-slate-800" colSpan={14}>
                          Rekapitulasi Jumlah Siswa
                        </th>
                      </tr>
                      <tr className="bg-[#d1e4f3] print:bg-[#d1e4f3] print:color-adjust-exact">
                        <th className="border border-black p-1 text-center w-24"></th>
                        <th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Juni</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Juli</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Agustus</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">September</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Oktober</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">November</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Desember</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Januari</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Februari</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Maret</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">April</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Mei</th><th className="border border-black p-1 text-center font-medium w-16 text-slate-800">Juni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTingkatList.map((t, rowIdx) => {
                        const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                        let total = 0;
                        tingkatClasses.forEach((cls) => {
                          const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                          total += classStudents.length;
                        });

                        return (
                          <tr key={rowIdx} className="bg-white">
                            <td className="border border-black p-1 px-2 font-medium text-slate-800 bg-[#e3f0e6] print:bg-[#e3f0e6] print:color-adjust-exact">Kelas {t}</td>
                            <td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td><td className="border border-black p-1 text-center font-medium bg-white print:bg-white">{total || ''}</td>
                          </tr>
                        );
                      })}
                      
                      <tr className="bg-white">
                        <td className="border border-black p-1 px-2 font-semibold text-slate-800 bg-[#faeed6] print:bg-[#faeed6] print:color-adjust-exact">Total</td>
                        {(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}{(() => {
                           let grandTotal = 0;
                           activeTingkatList.forEach((t) => {
                             const tingkatClasses = classes.filter(cls => cls.tingkat === t);
                             tingkatClasses.forEach((cls) => {
                               const classStudents = students.filter(s => s.kelasId === cls.id || s.kelas === cls.nama);
                               grandTotal += classStudents.length;
                             });
                           });
                           return (
                             <td className="border border-black p-1 text-center font-semibold bg-white print:bg-white">{grandTotal || ''}</td>
                           );
                        })()}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-between px-8 text-xs">
                <div className="text-center">
                  <p className="mb-20">Mengetahui,<br />Kepala {institution.name || 'Madrasah'}</p>
                  <p className="font-bold underline">{institution.headmaster || '________________________'}</p>
                  <p>NIP. {institution.nip || '________________________'}</p>
                </div>
                <div className="text-center">
                  <p className="mb-20">....................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Tata Usaha / Kesiswaan</p>
                  <p className="font-bold underline">________________________</p>
                  <p>NIP. ________________________</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-area { width: 100% !important; }
        }
      `}} />
    </div>,
    document.body
  );
};


