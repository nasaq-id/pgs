import React from 'react';
import { X, Printer, Briefcase, GraduationCap, MapPin, User, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Teacher, Institution } from '../types';
import { KopSurat } from './KopSurat';

interface TeacherDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  institution?: Institution | null;
  onPrintBiodata?: (teacherId: string) => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({
  isOpen,
  onClose,
  teacher,
  institution,
  onPrintBiodata
}) => {
  if (!isOpen || !teacher) return null;

  const handlePrint = () => {
    if (onPrintBiodata) {
      onPrintBiodata(teacher.id);
      onClose();
      return;
    }
  };

  // Helper to format educational records
  const renderEduItem = (level: string, schoolName?: string, major?: string) => {
    if (!schoolName) return null;
    return (
      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0 text-xs">
        <span className="text-slate-400 font-bold shrink-0">{level}</span>
        <div className="text-right">
          <p className="font-bold text-slate-700">{schoolName}</p>
          {major && <p className="text-[10px] text-slate-400 font-medium">{major}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-6 text-left">
      <div className="absolute inset-0 bg-slate-900/40 no-print" onClick={onClose}></div>
      <div className="bg-white rounded-[1.5rem] w-full max-w-4xl h-[90vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50">
        
        {/* Header */}
        <div className="px-8 py-5 flex justify-between items-start border-b border-slate-100 bg-white flex-shrink-0 no-print">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Detail Lengkap Profil Guru & Tendik</h3>
            <p className="text-[13px] text-slate-500 mt-1">
              Menampilkan seluruh rekaman data administratif untuk <b>{teacher.nama}</b>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable details */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Print Kop Surat / Header */}
          {institution && (
            <div className="hidden print:block mb-6">
              <KopSurat institution={institution} />
            </div>
          )}

          <div className="hidden print:block text-center border-b border-slate-200 pb-3 mb-6">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-widest">PROFIL BIODATA GURU / PTK LENGKAP</h3>
          </div>

          {/* Card header with badge summary */}
          <div className="bg-emerald-50/40 border border-emerald-100/50 rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {teacher.foto ? (
              <img 
                src={teacher.foto} 
                alt={teacher.nama} 
                className="w-20 h-20 rounded-2xl object-cover shadow-md border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 bg-emerald-100 text-emerald-700 font-black rounded-2xl flex items-center justify-center text-3xl shadow-sm uppercase">
                {teacher.nama.charAt(0)}
              </div>
            )}
            <div className="flex-1 text-center md:text-left space-y-1">
              <h4 className="text-lg font-extrabold text-slate-800">{teacher.nama}</h4>
              <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider">
                {teacher.kategori || 'Guru'} | NIP/NUPTK: {teacher.nipNuptk || '-'}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full font-bold text-[10px] uppercase">
                  Tugas Utama: {teacher.tugasUtama || '-'}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full font-bold text-[10px] uppercase">
                  Status: {teacher.status || 'Aktif'}
                </span>
                <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-full font-bold text-[10px] uppercase">
                  Pendidikan: {teacher.pendidikanTerakhir || '-'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Section A: Identitas Pribadi */}
              <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User size={16} className="text-emerald-600" />
                  <h5 className="font-extrabold text-emerald-600 text-sm tracking-wider uppercase">A. Identitas Pribadi</h5>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Username Akun</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.username}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">NIK</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.nik || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Jenis Kelamin</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.jk}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Tempat, Tgl Lahir</span>
                    <span className="font-bold text-slate-700 text-right">
                      {teacher.tempatLahir || '-'}, {teacher.tanggalLahir ? teacher.tanggalLahir.split('-').reverse().join('/') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">No. HP/WA</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.hp || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 last:border-0">
                    <span className="text-slate-400 font-medium shrink-0">Email</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.email || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section B: Data Kepegawaian */}
              <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Briefcase size={16} className="text-teal-600" />
                  <h5 className="font-extrabold text-teal-600 text-sm tracking-wider uppercase">B. Data Kepegawaian</h5>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Kategori</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.kategori || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Status Pegawai</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.statusPegawai || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Tugas Utama</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.tugasUtama || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Tugas Tambahan</span>
                    <div className="text-right flex flex-wrap justify-end gap-1">
                      {teacher.tugasTambahan ? (
                        teacher.tugasTambahan.split(',').map((t, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">{t.trim()}</span>
                        ))
                      ) : (
                        <span className="font-bold text-slate-700">-</span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Mulai Bertugas</span>
                    <span className="font-bold text-slate-700 text-right">
                      {teacher.mulaiBertugas ? teacher.mulaiBertugas.split('-').reverse().join('/') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Akhir Bertugas</span>
                    <span className="font-bold text-slate-700 text-right">
                      {teacher.akhirBertugas ? teacher.akhirBertugas.split('-').reverse().join('/') : 'Aktif Bertugas'}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3 last:border-0">
                    <span className="text-slate-400 font-medium shrink-0">Beban Jam Pelajaran</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.jamPelajaran || 0} JP</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">

              {/* Section C: Riwayat Pendidikan Formal */}
              <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <GraduationCap size={16} className="text-indigo-600" />
                  <h5 className="font-extrabold text-indigo-600 text-sm tracking-wider uppercase">C. Riwayat Pendidikan Formal</h5>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 text-xs">
                    <span className="text-slate-400 font-bold shrink-0">Pendidikan Terakhir</span>
                    <span className="font-bold text-slate-700 text-right">{teacher.pendidikanTerakhir || '-'}</span>
                  </div>

                  {renderEduItem('SD / Sederajat', teacher.instansiSD)}
                  {renderEduItem('SMP / Sederajat', teacher.instansiSMP)}
                  {renderEduItem('SMA / Sederajat', teacher.instansiSMA)}
                  {renderEduItem('Diploma 1 (D1)', teacher.instansiD1, teacher.jurusanD1)}
                  {renderEduItem('Diploma 2 (D2)', teacher.instansiD2, teacher.jurusanD2)}
                  {renderEduItem('Diploma 3 (D3)', teacher.instansiD3, teacher.jurusanD3)}
                  {renderEduItem('Diploma 4 (D4)', teacher.instansiD4, teacher.jurusanD4)}
                  {renderEduItem('Sarjana 1 (S1)', teacher.instansiS1, teacher.jurusanS1)}
                  {renderEduItem('Magister (S2)', teacher.instansiS2, teacher.jurusanS2)}
                  {renderEduItem('Doktor (S3)', teacher.instansiS3, teacher.jurusanS3)}

                  {!teacher.instansiSD && !teacher.instansiSMP && !teacher.instansiSMA && !teacher.instansiS1 && (
                    <p className="text-center text-slate-400 text-xs py-4">Data riwayat instansi pendidikan belum diisi lengkap.</p>
                  )}
                </div>
              </div>

              {/* Section D: Alamat Domisili */}
              <div className="bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" />
                  <h5 className="font-extrabold text-blue-600 text-sm tracking-wider uppercase">D. Alamat Tinggal</h5>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-1">Alamat Lengkap</h6>
                    <p className="font-bold text-slate-700 leading-relaxed pl-2 border-l-2 border-blue-400 text-[11px]">
                      {teacher.alamat || 'Alamat belum diisi.'}
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3 flex-shrink-0 no-print">
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition-all cursor-pointer flex items-center space-x-2 shadow-sm"
          >
            <Printer size={16} className="text-slate-500" />
            <span>Cetak Profil (PDF)</span>
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold text-[13px] hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all cursor-pointer"
          >
            Tutup Detail
          </button>
        </div>

      </div>
    </div>
  );
};
