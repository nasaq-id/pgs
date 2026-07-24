import React from 'react';
import { X, Printer } from 'lucide-react';
import { Student, Institution, getPdfLogo } from '../types';

import { KopSurat } from './KopSurat';

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  institution?: Institution;
  onPrintBiodata?: (studentId: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({ 
  student, 
  isOpen, 
  onClose, 
  institution,
  onPrintBiodata
}) => {
  if (!isOpen || !student) return null;

  const handlePrint = () => {
    if (onPrintBiodata) {
      onPrintBiodata(student.id);
      onClose();
      return;
    }

    let url = `${window.location.origin}${window.location.pathname}?print-student=${student.id}&logo-left=sekolah&logo-right=kemdikbud`;
    
    // Set parent window global properties so window.opener can access full-resolution data
    try {
      (window as any).__MTS_SINGLE_STUDENT_DATA__ = student;
      if (institution) {
        (window as any).__MTS_INSTITUTION_DATA__ = institution;
      }
    } catch (e) {
      console.warn("Failed to set parent window references:", e);
    }

    try {
      // Create lightweight student object without the massive base64 foto property
      const cleanStudent = { ...student, foto: "" };
      const encodedStudent = encodeURIComponent(JSON.stringify(cleanStudent));
      url += `&student-data=${encodedStudent}`;
      
      if (institution) {
        // Create lightweight institution object without massive base64 logos
        const cleanInstitution = { 
          ...institution, 
          logo: "", 
          kemenagLogo: "", 
          kemdikbudLogo: "" 
        };
        const encodedInst = encodeURIComponent(JSON.stringify(cleanInstitution));
        url += `&inst-data=${encodedInst}`;
      }
    } catch (e) {
      console.error("Failed to encode print data:", e);
    }

    const win = window.open(url, '_blank');
    if (win) {
      try {
        (win as any).__MTS_SINGLE_STUDENT_DATA__ = student;
        if (institution) {
          (win as any).__MTS_INSTITUTION_DATA__ = institution;
        }
      } catch (e) {
        console.warn("Failed to set properties on window object directly:", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-6 text-left">
      <div className="absolute inset-0 bg-slate-900/40  no-print" onClick={onClose}></div>
      <div className="bg-white rounded-[1.5rem] w-full max-w-4xl h-[90vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50">
        
        {/* Header */}
        <div className="px-8 py-5 flex justify-between items-start border-b border-slate-100 bg-white flex-shrink-0 no-print">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Detail Lengkap Profil Siswa</h3>
            <p className="text-[13px] text-slate-500 mt-1">
              Menampilkan seluruh rekaman data administratif untuk <b>{student.nama}</b>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-50">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable details */}
        <div id="student-print-content" className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          
          {/* Print Kop Surat / Header */}
          {institution && (
            <div className="hidden print:block mb-6">
              <KopSurat institution={institution} />
            </div>
          )}

          <div className="hidden print:block text-center border-b border-slate-200 pb-3 mb-6">
            <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-widest">PROFIL BIODATA SISWA LENGKAP</h3>
          </div>

          {/* Card header with badge summary */}
          <div className="bg-teal-50/40 border border-teal-100/50 rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {student.foto ? (
              <img 
                src={student.foto} 
                alt={student.nama} 
                className="w-20 h-20 rounded-2xl object-cover shadow-md border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 bg-teal-100 text-teal-700 font-black rounded-2xl flex items-center justify-center text-3xl shadow-sm uppercase">
                {student.nama.charAt(0)}
              </div>
            )}
            <div className="flex-1 text-center md:text-left space-y-1">
              <h4 className="text-lg font-extrabold text-slate-800">{student.nama}</h4>
              <p className="text-sm font-semibold text-teal-600 uppercase tracking-wider">
                Kelas: {student.kelas || 'Belum Masuk Kelas'} | NIS: {student.nis}
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-full font-bold text-[10px] uppercase">
                  NISN: {student.nisn || 'Belum Diisi'}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full font-bold text-[10px] uppercase">
                  Status: {student.status}
                </span>
                <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-100 text-purple-600 rounded-full font-bold text-[10px] uppercase">
                  Agama: {student.agama}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Section A: Identitas Pribadi */}
              <div className="bento-card bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-extrabold text-teal-600 text-sm tracking-wider uppercase">A. Identitas Pribadi</h5>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Username Akun</span>
                    <span className="font-bold text-slate-700 text-right">{student.username}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">NIS / NISN</span>
                    <span className="font-bold text-slate-700 text-right">{student.nis} / {student.nisn || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">NIK Siswa</span>
                    <span className="font-bold text-slate-700 text-right">{student.nik || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Jenis Kelamin</span>
                    <span className="font-bold text-slate-700 text-right">{student.jk}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Agama</span>
                    <span className="font-bold text-slate-700 text-right">{student.agama || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Tempat, Tgl Lahir</span>
                    <span className="font-bold text-slate-700 text-right">{student.tempatLahir}, {student.tanggalLahir ? student.tanggalLahir.split('-').reverse().join('/') : '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">No. HP/WA</span>
                    <span className="font-bold text-slate-700 text-right">{student.hp || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Email Siswa</span>
                    <span className="font-bold text-slate-700 text-right">{student.email || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Kewarganegaraan</span>
                    <span className="font-bold text-slate-700 text-right">{student.kewarganegaraan}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Anak Ke</span>
                    <span className="font-bold text-slate-700 text-right">{student.anakKe} dari {student.jumlahSaudara} bersaudara</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Cita-cita</span>
                    <span className="font-bold text-slate-700 text-right">{student.citaCita || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Hobi</span>
                    <span className="font-bold text-slate-700 text-right">{student.hoby || '-'}</span>
                  </div>
                  <div className="flex justify-between items-start gap-3 last:border-0">
                    <span className="text-slate-400 font-medium shrink-0">Pembiaya Sekolah</span>
                    <span className="font-bold text-slate-700 text-right">{student.pembiaya || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section D: Alamat & Domisili */}
              <div className="bento-card bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-extrabold text-blue-600 text-sm tracking-wider uppercase">D. Alamat Domisili & Transportasi</h5>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-1">Alamat Utama (Keluarga)</h6>
                    <p className="font-bold text-slate-700 leading-relaxed pl-2 border-l-2 border-blue-400 text-[11px]">
                      {student.alamat.ayah.jalan ? `${student.alamat.ayah.jalan}, ` : ''} 
                      {student.alamat.ayah.rt || student.alamat.ayah.rw ? `RT ${student.alamat.ayah.rt || '00'}/RW ${student.alamat.ayah.rw || '00'}, ` : ''}
                      {student.alamat.ayah.kel ? `Desa/Kel. ${student.alamat.ayah.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                      {student.alamat.ayah.kec ? `Kec. ${student.alamat.ayah.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                      {student.alamat.ayah.kab ? `${student.alamat.ayah.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                      {student.alamat.ayah.prov ? `${student.alamat.ayah.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                      {student.alamat.ayah.kodepos ? ` (${student.alamat.ayah.kodepos})` : ''}
                    </p>
                  </div>

                  {student.alamat.ibu && !student.alamat.ibu.samaDenganAyah && (
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-1">Alamat Ibu (Berbeda)</h6>
                      <p className="font-bold text-slate-700 leading-relaxed pl-2 border-l-2 border-indigo-400 text-[11px]">
                        {student.alamat.ibu.jalan ? `${student.alamat.ibu.jalan}, ` : ''} 
                        {student.alamat.ibu.rt || student.alamat.ibu.rw ? `RT ${student.alamat.ibu.rt || '00'}/RW ${student.alamat.ibu.rw || '00'}, ` : ''}
                        {student.alamat.ibu.kel ? `Desa/Kel. ${student.alamat.ibu.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                        {student.alamat.ibu.kec ? `Kec. ${student.alamat.ibu.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                        {student.alamat.ibu.kab ? `${student.alamat.ibu.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                        {student.alamat.ibu.prov ? `${student.alamat.ibu.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                        {student.alamat.ibu.kodepos ? ` (${student.alamat.ibu.kodepos})` : ''}
                      </p>
                    </div>
                  )}

                  {student.waliData && student.waliData.statusWali === 'Lainnya' && student.alamat.wali && student.alamat.wali.statusAlamatWali === 'Lainnya' && (
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-1">Alamat Wali (Berbeda)</h6>
                      <p className="font-bold text-slate-700 leading-relaxed pl-2 border-l-2 border-purple-400 text-[11px]">
                        {student.alamat.wali.jalan ? `${student.alamat.wali.jalan}, ` : ''} 
                        {student.alamat.wali.rt || student.alamat.wali.rw ? `RT ${student.alamat.wali.rt || '00'}/RW ${student.alamat.wali.rw || '00'}, ` : ''}
                        {student.alamat.wali.kel ? `Desa/Kel. ${student.alamat.wali.kel.replace(/^(Desa\/Kel\.|Kelurahan|Desa)\s+/i, '')}, ` : ''} 
                        {student.alamat.wali.kec ? `Kec. ${student.alamat.wali.kec.replace(/^Kecamatan\s+/i, '')}, ` : ''} 
                        {student.alamat.wali.kab ? `${student.alamat.wali.kab.replace(/^(Kabupaten|Kota)\s+/i, (match) => match.trim().toLowerCase() === 'kota' ? 'Kota ' : 'Kab. ')}, ` : ''} 
                        {student.alamat.wali.prov ? `${student.alamat.wali.prov.replace(/^Provinsi\s+/i, '')}` : ''} 
                        {student.alamat.wali.kodepos ? ` (${student.alamat.wali.kodepos})` : ''}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">Status Rumah</h6>
                      <span className="font-bold text-slate-700">{student.alamat.ayah.kepemilikan || '-'}</span>
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">Tinggal Dengan</h6>
                      <span className="font-bold text-slate-700">{student.alamat.domisili.statusTempatTinggal || '-'}</span>
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">Transportasi</h6>
                      <span className="font-bold text-slate-700">{student.alamat.domisili.transportasi || '-'}</span>
                    </div>
                    <div>
                      <h6 className="font-bold text-slate-400 text-[10px] uppercase mb-0.5">Jarak & Waktu Tempuh</h6>
                      <span className="font-bold text-slate-700">{student.alamat.domisili.jarak || '-'} ({student.alamat.domisili.waktuTempuh || '-'})</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Section B: Orang Tua */}
              <div className="bento-card bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-extrabold text-indigo-600 text-sm tracking-wider uppercase">B. Data Orang Tua</h5>
                </div>
                
                <div className="space-y-4">
                  {/* Ayah */}
                  <div className="bg-white/50 border border-slate-100 rounded-xl p-3">
                    <h6 className="font-bold text-slate-700 text-xs mb-1.5 uppercase tracking-wider text-teal-700">1. Ayah Kandung</h6>
                    <div className="space-y-1.5 text-xs pl-2 border-l border-teal-200">
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Nama Ayah</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.nama || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">NIK Ayah</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.nik || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Status</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.status}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Kewarganegaraan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.wn || 'WNI'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Lahir</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">
                          {student.ayah.tempatLahir || '-'}{student.ayah.tanggalLahir ? `, ${student.ayah.tanggalLahir.split('-').reverse().join('/')}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Pendidikan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.pendidikan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Pekerjaan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.pekerjaan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Penghasilan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.penghasilan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-400 shrink-0">No. HP/WA</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ayah.hp || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ibu */}
                  <div className="bg-white/50 border border-slate-100 rounded-xl p-3">
                    <h6 className="font-bold text-slate-700 text-xs mb-1.5 uppercase tracking-wider text-indigo-700">2. Ibu Kandung</h6>
                    <div className="space-y-1.5 text-xs pl-2 border-l border-indigo-200">
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Nama Ibu</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.nama || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">NIK Ibu</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.nik || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Status</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.status}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Kewarganegaraan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.wn || 'WNI'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Lahir</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">
                          {student.ibu.tempatLahir || '-'}{student.ibu.tanggalLahir ? `, ${student.ibu.tanggalLahir.split('-').reverse().join('/')}` : ''}
                        </span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Pendidikan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.pendidikan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Pekerjaan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.pekerjaan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-slate-100/30 pb-1">
                        <span className="text-slate-400 shrink-0">Penghasilan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.penghasilan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-slate-400 shrink-0">No. HP/WA</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.ibu.hp || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section C: Wali */}
              <div className="bento-card bg-slate-50/30 border border-slate-100 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <h5 className="font-extrabold text-purple-600 text-sm tracking-wider uppercase">C. Data Wali Utama</h5>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Status Hubungan</span>
                    <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">
                      {student.waliData.statusWali === 'Sama dengan ayah kandung' ? 'Sama dengan Ayah Kandung' : student.waliData.statusWali === 'Sama dengan ibu kandung' ? 'Sama dengan Ibu Kandung' : (student.waliData.hubungan || 'Lainnya')}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-slate-400 font-medium shrink-0">Nama Wali</span>
                    <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.nama || '-'}</span>
                  </div>
                  {student.waliData.statusWali !== 'Sama dengan ayah kandung' && student.waliData.statusWali !== 'Sama dengan ibu kandung' && (
                    <>
                      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium shrink-0">Kewarganegaraan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.wn}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium shrink-0">NIK Wali</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.nik || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium shrink-0">Pendidikan Terakhir</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.pendidikan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium shrink-0">Pekerjaan Wali</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.pekerjaan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-400 font-medium shrink-0">Penghasilan Bulanan</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.penghasilan || '-'}</span>
                      </div>
                      <div className="flex justify-between items-start gap-3 last:border-0">
                        <span className="text-slate-400 font-medium shrink-0">HP Wali</span>
                        <span className="font-bold text-slate-700 text-right break-words max-w-[65%]">{student.waliData.hp || '-'}</span>
                      </div>
                    </>
                  )}
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
            className="px-8 py-2.5 rounded-lg bg-teal-600 text-white font-bold text-[13px] hover:bg-teal-700 shadow-md shadow-teal-100 transition-all cursor-pointer"
          >
            Tutup Detail
          </button>
        </div>

      </div>
    </div>
  );
};
