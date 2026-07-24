import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Info } from 'lucide-react';
import { Kelas, MataPelajaran, JadwalPelajaran, Institution, getPdfLogo } from '../types';
import { ScheduleSettings, SchoolSlot } from './AkademikView';

import { KopSurat } from './KopSurat';
import { SearchableSelect } from './SearchableSelect';

interface PrintPreviewModalProps {
  institution: Institution;
  isOpen: boolean;
  onClose: () => void;
  classes: Kelas[];
  subjects: MataPelajaran[];
  settings: ScheduleSettings;
  schedules: JadwalPelajaran[];
  printOption: 'keseluruhan' | 'per-kelas';
  setPrintOption: (option: 'keseluruhan' | 'per-kelas') => void;
  printClassId: string;
  setPrintClassId: (id: string) => void;
  getTeacherSubjectCodes: (subjects: MataPelajaran[]) => Map<string, string>;
  getSlotsForDay: (
    day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu',
    settings: ScheduleSettings
  ) => SchoolSlot[];
}

const formatGuruDisplay = (guruPengampu: string | undefined): string => {
  if (!guruPengampu) return 'Belum Ditunjuk';
  try {
    const parsed = JSON.parse(guruPengampu);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return 'Belum Ditunjuk';
      return parsed.map(item => {
        const classesStr = item.kelasIds && item.kelasIds.length > 0 
          ? ` (${item.kelasIds.join(', ')})` 
          : '';
        return `${item.guru}${classesStr}`;
      }).join(', ');
    }
  } catch (e) {
    // Fallback plain string
  }
  return guruPengampu || 'Belum Ditunjuk';
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  institution,
  isOpen,
  onClose,
  classes,
  subjects,
  settings,
  schedules,
  printOption,
  setPrintOption,
  printClassId,
  setPrintClassId,
  getTeacherSubjectCodes,
  getSlotsForDay
}) => {
  if (!isOpen) return null;

  const printTeacherCodes = getTeacherSubjectCodes(subjects);

  // Helper to render Signatures
  const renderSignatures = () => (
    <div className="grid grid-cols-2 mt-8 text-center text-[10px] gap-8 avoid-break">
      <div>
        <p className="font-bold">Mengetahui,</p>
        <p className="font-bold text-slate-700">Kepala Madrasah MTs At-Turmudzi</p>
        <div className="h-16" />
        <p className="font-black text-slate-900 underline">K.H. Turmudzi, M.Pd.</p>
        <p className="text-slate-400 text-[8px] font-bold">NIP. 19780512 200502 1 002</p>
      </div>
      <div>
        <p className="font-bold">Bandung, 4 Juli 2026</p>
        <p className="font-bold text-slate-700">Wakasek Bidang Kurikulum</p>
        <div className="h-16" />
        <p className="font-black text-slate-900 underline">Ust. Ahmad Syarif, S.Ag.</p>
        <p className="text-slate-400 text-[8px] font-bold">NIP. 19831105 201004 1 003</p>
      </div>
    </div>
  );

  // Filter classes based on selection for individual class printing
  const selectedClasses = printOption === 'per-kelas' && printClassId !== 'semua'
    ? classes.filter(c => c.id === printClassId)
    : classes;

  return createPortal(
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[9999] animate-fade-in overflow-y-auto"
    >
      {/* Strict CSS media query definitions for landscape and column scaling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 10mm 15mm;
          }
          body {
            background-color: #fff !important;
            color: #000 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-area {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* High contrast print borders */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 6px 8px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 900 !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}} />

      <div className="bg-white rounded-3xl max-w-6xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[95vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 print:hidden gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              Pratinjau Cetak Jadwal Pelajaran
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Tinjau tampilan format cetak landscape. Semua kolom disesuaikan dinamis terhadap isinya.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Landscape OK
            </span>
            <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-[10px] font-black">
              Lebar Auto-Fit
            </span>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 mr-2" />
              <span>Mulai Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* DEVICE COMPATIBILITY NOTIFICATION FOR PHONE/TABLET */}
        <div className="lg:hidden flex items-start gap-2.5 p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs mb-5 print:hidden text-left">
          <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5 animate-bounce" />
          <div className="text-indigo-900">
            <p className="font-extrabold text-[11px] uppercase tracking-wide">💡 Panduan Layar HP & Tablet:</p>
            <p className="mt-1 text-slate-600 leading-relaxed text-[10.5px]">
              Tabel roster KBM sekolah ini dirancang dengan format <strong>Landscape (Mendatar)</strong> lebar. Anda dapat mengusap (scroll) tabel ke arah kanan-kiri untuk melakukan pratinjau. Untuk hasil pencetakan fisik atau penyimpanan PDF dengan format sempurna, kami menyarankan untuk mengakses menu cetak ini melalui PC/Laptop.
            </p>
          </div>
        </div>

        {/* PRINT OPTIONS CONTROL PANEL */}
        <div className="bg-slate-50 border border-slate-100/70 rounded-2xl p-4 mb-6 print:hidden text-left">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">
            Pengaturan Format Hasil Cetak:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipe Cetak Selector */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Tipe Cetak:</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPrintOption('keseluruhan')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    printOption === 'keseluruhan'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cetak Keseluruhan (Master Roster)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintOption('per-kelas')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                    printOption === 'per-kelas'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cetak Per Kelas (Teks Utuh)
                </button>
              </div>
            </div>

            {/* Filter Kelas (Khusus Cetak Per Kelas) */}
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">
                Pilihan Kelas:
              </span>
              <SearchableSelect
                disabled={printOption !== 'per-kelas'}
                value={printClassId}
                onChange={(val) => setPrintClassId(val)}
                options={[
                  { value: 'semua', label: 'Semua Kelas (Halaman Terpisah)' },
                  ...classes.map(c => ({ value: c.id, label: `Kelas ${c.nama}` }))
                ]}
                placeholder="Pilih Kelas"
                showSearch={true}
                isClearable={false}
              />
            </div>
          </div>
        </div>

        {/* Printable Area */}
        <div className="print-area bg-white p-2 text-slate-900 font-sans">
          
          {printOption === 'keseluruhan' ? (
            /* ================= OPTION 1: CETAK KESELURUHANN (MASTER ROSTER SINGLE TABLE) ================= */
            <div className="space-y-6">
              <KopSurat institution={institution} />

              <div className="text-center mt-4 mb-2">
                <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-900">
                  JADWAL PELAJARAN MINGGUAN KBM (MASTER ROSTER)
                </h3>
                <p className="text-[11px] text-slate-600 font-bold mt-1">
                  Tahun Ajaran 2026/2027 | Kurikulum Merdeka
                </p>
              </div>

              {/* Single continuous table with custom horizontal scrollbar */}
              <div className="overflow-x-auto border-2 border-slate-950 rounded-xl custom-scrollbar">
                <table className="table-auto w-full text-left border-collapse text-[10px] border-2 border-slate-950">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-950 text-slate-900 font-bold text-center">
                      <th rowSpan={2} className="p-2.5 border border-slate-950 text-center text-xs font-black uppercase bg-slate-100 whitespace-nowrap min-w-[90px] align-middle">
                        Waktu
                      </th>
                      <th rowSpan={2} className="p-2.5 border border-slate-950 text-center text-xs font-black uppercase bg-slate-100 whitespace-nowrap min-w-[50px] align-middle">
                        JP
                      </th>
                      {(settings.hariAktif || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']).map(day => (
                        <th 
                          key={day} 
                          colSpan={classes.length} 
                          className="p-2 border border-slate-950 text-center text-xs font-black uppercase text-white bg-slate-800 whitespace-nowrap"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-slate-700 text-white font-bold text-center">
                      {(settings.hariAktif || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']).map(day => 
                        classes.map(c => (
                          <th 
                            key={`${day}-${c.id}`} 
                            className="p-1.5 border border-slate-950 text-center text-[9px] font-bold whitespace-nowrap min-w-[80px]"
                          >
                            {c.nama}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const activeDays = settings.hariAktif || ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                      const slotsByDay = activeDays.map(day => ({
                        day,
                        slots: getSlotsForDay(day as any, settings)
                      }));

                      const maxSlots = Math.max(...slotsByDay.map(d => d.slots.length), 0);
                      if (maxSlots === 0) return null;

                      return Array.from({ length: maxSlots }).map((_, i) => {
                        // Find a representative slot for the Time and JP label columns
                        const repDayObj = slotsByDay.find(d => d.slots[i]);
                        const repSlot = repDayObj?.slots[i];
                        if (!repSlot) return null;

                        return (
                          <tr key={`slot-row-${i}`} className="border-b border-slate-950 hover:bg-slate-50/20">
                            {/* Waktu Column */}
                            <td className="p-2 border border-slate-950 font-bold text-center bg-white align-middle whitespace-nowrap text-[10px]">
                              {repSlot.startTime}–{repSlot.endTime}
                            </td>

                            {/* JP Column */}
                            <td className="p-2 border border-slate-950 font-black text-center bg-white align-middle whitespace-nowrap text-[10px]">
                              {repSlot.type === 'AGENDA' ? (
                                <span title={repSlot.label} className="text-slate-400">🏳️</span>
                              ) : (
                                repSlot.jpNumber
                              )}
                            </td>

                            {/* Cells for each Day & Class */}
                            {activeDays.map(day => {
                              const daySlots = slotsByDay.find(d => d.day === day)?.slots || [];
                              const slotForDay = daySlots[i];

                              if (!slotForDay) {
                                return (
                                  <td
                                    key={`${day}-empty-${i}`}
                                    colSpan={classes.length}
                                    className="p-2 border border-slate-950 text-center text-slate-300 align-middle bg-slate-50/30"
                                  >
                                    —
                                  </td>
                                );
                              }

                              if (slotForDay.type === 'AGENDA') {
                                return (
                                  <td
                                    key={`${day}-agenda-${i}`}
                                    colSpan={classes.length}
                                    className="p-2 border border-slate-950 text-center font-black text-slate-500 bg-slate-100 uppercase tracking-wider text-[9px] align-middle whitespace-nowrap"
                                  >
                                    {slotForDay.label}
                                  </td>
                                );
                              }

                              // It is a JP (class period) slot
                              const jpNum = slotForDay.jpNumber!;
                              return classes.map(c => {
                                const sched = schedules.find(s => 
                                  s.kelasId === c.id && 
                                  s.hari === day && 
                                  s.jpStart <= jpNum && 
                                  jpNum < s.jpStart + s.jpCount
                                );

                                if (sched) {
                                  const sub = subjects.find(sb => sb.id === sched.mapelId);
                                  const tCode = printTeacherCodes.get(sched.mapelId) || '';
                                  return (
                                    <td
                                      key={`${day}-${c.id}-${jpNum}`}
                                      className="p-2 border border-slate-950 text-center align-middle whitespace-nowrap bg-white"
                                    >
                                      <div className="text-slate-950 font-extrabold text-[10px] tracking-tight">{sub?.kode || 'MAPEL'}</div>
                                      <div className="text-[8px] text-slate-500 font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 mt-1 w-max mx-auto font-mono">
                                        {tCode}
                                      </div>
                                    </td>
                                  );
                                }

                                return (
                                  <td
                                    key={`${day}-${c.id}-${jpNum}`}
                                    className="p-2 border border-slate-950 text-center text-slate-300 align-middle text-[10px] bg-white"
                                  >
                                    —
                                  </td>
                                );
                              });
                            })}
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Legend / Keterangan Kode Guru */}
              <div className="mt-6 border-t border-slate-300 pt-4 avoid-break text-left">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-2.5">
                  Keterangan Kode Guru & Mata Pelajaran (Legenda):
                </h4>
                <div className="overflow-x-auto border border-slate-900 rounded-xl">
                  <table className="table-auto w-full text-left text-[9px] border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-900 text-slate-800 font-bold">
                        <th className="p-2 border border-slate-900 w-24 text-center whitespace-nowrap">Kode</th>
                        <th className="p-2 border border-slate-900 whitespace-nowrap">Nama Guru Pengampu</th>
                        <th className="p-2 border border-slate-900 whitespace-nowrap">Mata Pelajaran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map(sub => {
                        const code = printTeacherCodes.get(sub.id) || '';
                        return (
                          <tr key={sub.id} className="border-b border-slate-300 last:border-0 hover:bg-slate-50/50">
                            <td className="p-2 border border-slate-900 text-center font-black text-indigo-700 bg-indigo-50/20 whitespace-nowrap">{code}</td>
                            <td className="p-2 border border-slate-900 font-bold text-slate-900 whitespace-nowrap">{formatGuruDisplay(sub.guruPengampu)}</td>
                            <td className="p-2 font-medium text-slate-600 whitespace-nowrap">{sub.nama} ({sub.kode})</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {renderSignatures()}
            </div>
          ) : (
            /* ================= OPTION 2: CETAK PER KELAS (TEKS LENGKAP) ================= */
            <div className="space-y-12">
              {selectedClasses.map((c, index) => {
                return (
                  <div key={c.id} className={`${index > 0 ? 'break-after-page' : ''} avoid-break space-y-6 text-left`}>
                    <KopSurat institution={institution} />

                    <div className="text-center mt-4 mb-2">
                      <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-900">
                        JADWAL PELAJARAN MINGGUAN KBM
                      </h3>
                      <p className="text-[11px] text-slate-600 font-bold mt-1">
                        Tahun Ajaran 2026/2027 | Kurikulum Merdeka
                      </p>
                      <span className="inline-block mt-2 px-4 py-1.5 bg-indigo-50 border border-indigo-150 text-indigo-800 text-[11px] font-black rounded-xl uppercase tracking-wider">
                        KELAS: {c.nama.toUpperCase()}
                      </span>
                    </div>

                    {/* Individual Class Table with Auto-adjusting column widths */}
                    <div className="overflow-x-auto border-2 border-slate-900 rounded-xl custom-scrollbar">
                      <table className="table-auto w-full text-left border-collapse text-[10px] border border-slate-900">
                        <thead>
                          <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-bold text-center">
                            <th className="p-2.5 border border-slate-900 w-24 whitespace-nowrap uppercase">Hari</th>
                            <th className="p-2.5 border border-slate-900 w-36 whitespace-nowrap uppercase">Waktu / JP</th>
                            <th className="p-2.5 border border-slate-900 whitespace-nowrap uppercase">Mata Pelajaran</th>
                            <th className="p-2.5 border border-slate-900 whitespace-nowrap uppercase">Guru Pengampu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(day => {
                            const slots = getSlotsForDay(day as any, settings);
                            if (slots.length === 0) return null;

                            return slots.map((slot, sIdx) => {
                              const isFirstOfHari = sIdx === 0;
                              
                              let mapelText = '-';
                              let guruText = '-';
                              let isAgenda = slot.type === 'AGENDA';
                              
                              if (isAgenda) {
                                mapelText = slot.label;
                                guruText = 'Kegiatan Bersama';
                              } else {
                                const jpNum = slot.jpNumber!;
                                const sched = schedules.find(s => 
                                  s.kelasId === c.id && 
                                  s.hari === day && 
                                  s.jpStart <= jpNum && 
                                  jpNum < s.jpStart + s.jpCount
                                );
                                if (sched) {
                                  const sub = subjects.find(sb => sb.id === sched.mapelId);
                                  if (sub) {
                                    mapelText = `${sub.nama} (${sub.kode})`;
                                    guruText = formatGuruDisplay(sub.guruPengampu);
                                  }
                                }
                              }

                              return (
                                <tr key={`${day}-${sIdx}`} className="border-b border-slate-300 last:border-b-2 last:border-slate-900">
                                  {isFirstOfHari && (
                                    <td
                                      className="p-2.5 border border-slate-900 font-extrabold text-slate-900 text-center uppercase align-middle bg-slate-50/20 whitespace-nowrap"
                                      rowSpan={slots.length}
                                    >
                                      {day}
                                    </td>
                                  )}
                                  <td className="p-2.5 border border-slate-900 font-bold text-center bg-slate-50/10 align-middle whitespace-nowrap">
                                    {isAgenda ? (
                                      <span className="text-slate-500 font-medium">{slot.label}</span>
                                    ) : (
                                      <span className="font-extrabold text-slate-950">JP {slot.jpNumber}</span>
                                    )}
                                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 font-semibold">
                                      {slot.startTime}-{slot.endTime}
                                    </div>
                                  </td>
                                  <td className={`p-2.5 border border-slate-300 align-middle whitespace-nowrap ${isAgenda ? 'text-slate-400 italic font-medium bg-slate-50/20' : 'text-slate-950 font-bold'}`}>
                                    {mapelText}
                                  </td>
                                  <td className={`p-2.5 border border-slate-300 align-middle whitespace-nowrap ${isAgenda ? 'text-slate-400 italic font-medium bg-slate-50/20' : 'text-slate-900 font-bold'}`}>
                                    {guruText}
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>

                    {renderSignatures()}

                    {/* Extra margin page divider inside browser view */}
                    {index < selectedClasses.length - 1 && (
                      <hr className="my-8 border-dashed border-slate-300 print:hidden" />
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
