import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Eye, EyeOff } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { Teacher } from '../types';
import { EMPTY_TEACHER } from '../mockData';
import { generateUUID } from '../lib/supabaseClient';

interface TeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teacher: Teacher) => void;
  editingTeacher: Teacher | null;
}

type TabType = 'informasi' | 'kepegawaian' | 'pendidikan';

const EDU_LEVELS = ['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'];

const formatDateToDisplay = (dateString: string) => {
  if (!dateString) return '';
  if (dateString.includes('-')) {
    const [y, m, d] = dateString.split('-');
    if (y && y.length === 4) return `${d}/${m}/${y}`;
  }
  return dateString;
};

const parseDateToDb = (dateString: string) => {
  if (!dateString) return '';
  if (dateString.includes('/')) {
    const [d, m, y] = dateString.split('/');
    if (y && y.length === 4) return `${y}-${m}-${d}`;
    return ''; // Invalid/incomplete date format
  }
  return dateString;
};

const handleDateInput = (val: string) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length >= 5) {
    return `${v.slice(0,2)}/${v.slice(2,4)}/${v.slice(4)}`;
  } else if (v.length >= 3) {
    return `${v.slice(0,2)}/${v.slice(2)}`;
  }
  return v;
};

export const TeacherModal: React.FC<TeacherModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTeacher,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('informasi');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<Teacher>(EMPTY_TEACHER(''));

  useEffect(() => {
    if (editingTeacher) {
      setFormData({ 
        ...editingTeacher,
        tanggalLahir: formatDateToDisplay(editingTeacher.tanggalLahir),
        mulaiBertugas: formatDateToDisplay(editingTeacher.mulaiBertugas),
        akhirBertugas: formatDateToDisplay(editingTeacher.akhirBertugas)
      });
    } else {
      const generatedId = generateUUID();
      setFormData(EMPTY_TEACHER(generatedId));
    }
    setActiveTab('informasi');
    setErrors({});
  }, [editingTeacher, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Teacher, value: string | number) => {
    setErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    
    // Validasi Informasi Utama
    if (!formData.nik) newErrors.nik = 'NIK wajib diisi!';
    if (formData.nik && formData.nik.length !== 16) newErrors.nik = 'NIK harus 16 digit!';
    if (!formData.nama) newErrors.nama = 'Nama Lengkap wajib diisi!';
    if (!formData.jk) newErrors.jk = 'Jenis Kelamin wajib diisi!';
    if (!formData.username) newErrors.username = 'Username wajib diisi!';
    if (!formData.password) newErrors.password = 'Password wajib diisi!';
    
    
    if (formData.hp) {
      if (formData.hp.length < 10 || formData.hp.length > 14) newErrors.hp = 'Nomor HP tidak valid (10-14 digit)!';
    }
    
    if (formData.email) {
      if (!formData.email.includes('@')) newErrors.email = 'Email harus mengandung @!';
    }

    // Validasi Data Kepegawaian
    if (!formData.statusPegawai) newErrors.statusPegawai = 'Status Kepegawaian wajib diisi!';
    if (!formData.kategori) newErrors.kategori = 'Kategori Pegawai wajib diisi!';
    if (!formData.tugasUtama) newErrors.tugasUtama = 'Tugas Utama wajib diisi!';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      alert('Terdapat form yang belum sesuai atau belum diisi, silakan periksa kembali field yang berwarna merah.');
      // Auto-switch tab if error is in another tab
      if (newErrors.nik || newErrors.nama || newErrors.jk || newErrors.username || newErrors.password || newErrors.hp || newErrors.email) {
        setActiveTab('informasi');
      } else {
        setActiveTab('kepegawaian');
      }
      return;
    }

    const dataToSave = {
      ...formData,
      tanggalLahir: parseDateToDb(formData.tanggalLahir),
      mulaiBertugas: parseDateToDb(formData.mulaiBertugas),
      akhirBertugas: parseDateToDb(formData.akhirBertugas)
    };
    onSave(dataToSave);
  };

  const handlePhotoUpload = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          const { compressImage } = await import('../lib/image');
          const compressed = await compressImage(file);
          handleChange('foto', compressed);
        } catch (error) {
          console.error('Failed to compress image:', error);
          // Fallback to FileReader if compression fails
          const reader = new FileReader();
          reader.onload = (readerEvent) => {
            handleChange('foto', readerEvent.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
      }
    };
    fileInput.click();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:p-6 text-left">
      <div className="absolute inset-0 bg-slate-900/40  no-print" onClick={onClose}></div>
      
      <div className="bg-white rounded-[1.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col relative shadow-2xl animate-fade-in overflow-hidden z-50">
        
        {/* Header Tabs */}
        <div className="px-6 pt-5 bg-white border-b border-slate-100 flex-shrink-0 relative z-10 flex items-center justify-center">
           <div className="flex bg-slate-100 rounded-full p-1 mb-4 w-full md:w-3/4">
             <button
                onClick={() => setActiveTab('informasi')}
                className={`flex-1 py-2.5 px-4 rounded-full text-[13px] font-bold transition-all ${activeTab === 'informasi' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
                Informasi Utama
             </button>
             <button
                onClick={() => setActiveTab('kepegawaian')}
                className={`flex-1 py-2.5 px-4 rounded-full text-[13px] font-bold transition-all ${activeTab === 'kepegawaian' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
                Data Kepegawaian
             </button>
             <button
                onClick={() => setActiveTab('pendidikan')}
                className={`flex-1 py-2.5 px-4 rounded-full text-[13px] font-bold transition-all ${activeTab === 'pendidikan' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
             >
                Riwayat Pendidikan
             </button>
           </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar relative z-0">
          
          {activeTab === 'informasi' && (
            <div className="animate-fade-in space-y-6">
              
              {/* Photo Upload Centered */}
              <div className="flex flex-col items-center justify-center mb-6">
                <input
                  id="teacher-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const { compressImage } = await import('../lib/image');
                        const compressed = await compressImage(file);
                        handleChange('foto', compressed);
                      } catch (error) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          if (event.target?.result) {
                            handleChange('foto', event.target.result as string);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }
                  }}
                />
                <div 
                  className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shadow-sm overflow-hidden group cursor-pointer mb-2"
                  onClick={() => document.getElementById('teacher-photo-upload')?.click()}
                >
                  {formData.foto ? (
                    <img 
                      src={formData.foto} 
                      alt="Foto Guru" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Camera className="w-10 h-10 text-slate-300" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="text-[13px] font-semibold text-slate-700">Foto Guru / Tendik</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Klik lingkaran di atas untuk mengubah foto</p>
                  {formData.foto && (
                    <button
                      type="button"
                      onClick={() => handleChange('foto', '')}
                      className="text-[11px] text-rose-500 hover:text-rose-600 mt-1 font-semibold cursor-pointer inline-block"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIP/NUPTK</label>
                  <input
                    type="text"
                    value={formData.nipNuptk}
                    onChange={(e) => handleChange('nipNuptk', e.target.value)}
                    placeholder="Kosongkan jika belum memiliki"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">NIK <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.nik}
                    onChange={(e) => handleChange('nik', e.target.value.replace(/\D/g, ''))}
                    maxLength={16}
                    placeholder="16 digit angka"
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.nik ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.nik && <p className="text-[11px] text-rose-500 mt-1">{errors.nik}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Nama Lengkap <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => handleChange('nama', e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi, S.Pd."
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.nama ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.nama && <p className="text-[11px] text-rose-500 mt-1">{errors.nama}</p>}
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jenis Kelamin <span className="text-rose-500">*</span></label>
                  <div className="flex items-center space-x-6 py-2.5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Laki-laki'}
                        onChange={() => handleChange('jk', 'Laki-laki')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Laki-laki</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Perempuan'}
                        onChange={() => handleChange('jk', 'Perempuan')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Perempuan</span>
                    </label>
                  </div>
                  {errors.jk && <p className="text-[11px] text-rose-500 mt-1">{errors.jk}</p>}
                  {errors.jk && <p className="text-[11px] text-rose-500 mt-1">{errors.jk}</p>}
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tempat Lahir</label>
                  <input
                    type="text"
                    value={formData.tempatLahir}
                    onChange={(e) => handleChange('tempatLahir', e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tanggal Lahir</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.tanggalLahir}
                    onChange={(e) => handleChange('tanggalLahir', handleDateInput(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">No HP/Whatsapp</label>
                  <input
                    type="text"
                    value={formData.hp}
                    onChange={(e) => handleChange('hp', e.target.value.replace(/\D/g, ''))}
                    maxLength={14}
                    placeholder="08xx"
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.hp ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.hp && <p className="text-[11px] text-rose-500 mt-1">{errors.hp}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="harus mengandung tanda @"
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Username <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder=""
                    className={`w-full px-4 py-2.5 rounded-lg border ${errors.username ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors`}
                  />
                  {errors.username && <p className="text-[11px] text-rose-500 mt-1">{errors.username}</p>}
                </div>
                <div className="relative">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Password <span className="text-rose-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder=""
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-slate-50'} focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[11px] text-rose-500 mt-1">{errors.password}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Alamat</label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => handleChange('alamat', e.target.value)}
                    placeholder=""
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kepegawaian' && (
            <div className="animate-fade-in space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Status Kepegawaian <span className="text-rose-500">*</span></label>
                  <SearchableSelect
                    showSearch={false}
                    value={formData.statusPegawai}
                    onChange={(val) => handleChange('statusPegawai', val)}
                    options={['PNS', 'PPPK', 'GTY', 'GTT', 'Honor', 'Lainnya']}
                    placeholder="Pilih"
                    error={!!errors.statusPegawai}
                  />
                  {errors.statusPegawai && <p className="text-[11px] text-rose-500 mt-1">{errors.statusPegawai}</p>}
                </div>
                
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Kategori Pegawai <span className="text-rose-500">*</span></label>
                  <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200">
                     <button
                        onClick={() => handleChange('kategori', 'Guru')}
                        className={`flex-1 py-1.5 px-4 rounded-full text-[13px] font-bold transition-all ${formData.kategori === 'Guru' ? 'bg-[#10b981] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Guru
                     </button>
                     <button
                        onClick={() => handleChange('kategori', 'Tendik')}
                        className={`flex-1 py-1.5 px-4 rounded-full text-[13px] font-bold transition-all ${formData.kategori === 'Tendik' ? 'bg-[#10b981] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Tendik
                     </button>
                  </div>
                  {errors.kategori && <p className="text-[11px] text-rose-500 mt-1">{errors.kategori}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Tugas Utama <span className="text-rose-500">*</span></label>
                  {formData.kategori === 'Guru' ? (
                    <SearchableSelect
                      showSearch={false}
                      value={formData.tugasUtama}
                      onChange={(val) => handleChange('tugasUtama', val)}
                      options={['Kepala Sekolah', 'Kepala Madrasah', 'Guru Kelas', 'Guru Mata Pelajaran', 'Guru BK']}
                      placeholder="Pilih tugas utama"
                      error={!!errors.tugasUtama}
                    />
                  ) : (
                    <SearchableSelect
                      showSearch={false}
                      value={formData.tugasUtama}
                      onChange={(val) => handleChange('tugasUtama', val)}
                      options={['Tata Usaha', 'Pustakawan', 'Laboran', 'Penjaga Sekolah', 'Petugas Kebersihan', 'Operator']}
                      placeholder="Pilih tugas utama"
                      error={!!errors.tugasUtama}
                    />
                  )}
                  {errors.tugasUtama && <p className="text-[11px] text-rose-500 mt-1">{errors.tugasUtama}</p>}
                </div>
              </div>

              {/* Tugas Tambahan */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <label className="block text-[13px] text-slate-600 mb-3 font-medium">Tugas Tambahan</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {['Wakil Kepala Sekolah/Madrasah', 'Kepala Pustakawan', 'Kepala Laboratorium', 'Wali Kelas', 'Guru Piket', 'Koordinator Projek', 'Guru Wali', 'Pembina Ekskul', 'Koordinator Kokurikuler', 'Fasilitator Kokurikuler'].map((tugas) => {
                    const currentTugasArray = formData.tugasTambahan ? formData.tugasTambahan.split(',').map(t => t.trim()) : [];
                    const isChecked = currentTugasArray.includes(tugas);
                    return (
                      <label key={tugas} className="flex items-center space-x-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="tugasTambahan"
                          value={tugas}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleChange('tugasTambahan', [...currentTugasArray, tugas].join(', '));
                            } else {
                              handleChange('tugasTambahan', currentTugasArray.filter(t => t !== tugas).join(', '));
                            }
                          }}
                          className="w-4 h-4 text-[#10b981] border-slate-300 rounded focus:ring-[#10b981] cursor-pointer"
                        />
                        <span className="text-[13px] text-slate-700 group-hover:text-slate-900 transition-colors">{tugas}</span>
                      </label>
                    );
                  })}
                  <label className="flex items-center space-x-2 cursor-pointer group mt-2 md:mt-0 col-span-full">
                       <input 
                         type="checkbox" 
                         checked={!formData.tugasTambahan}
                         onChange={() => handleChange('tugasTambahan', '')}
                         className="w-4 h-4 text-slate-400 border-slate-300 rounded focus:ring-slate-400 cursor-pointer"
                       />
                       <span className="text-[13px] text-slate-500 transition-colors">Tidak ada / Hapus Pilihan</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Mulai Bertugas</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.mulaiBertugas}
                    onChange={(e) => handleChange('mulaiBertugas', handleDateInput(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Akhir Bertugas</label>
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={formData.akhirBertugas}
                    onChange={(e) => handleChange('akhirBertugas', handleDateInput(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">JP (Jam Pelajaran)</label>
                  <input
                    type="number"
                    value={formData.jamPelajaran || ''}
                    readOnly
                    placeholder="Terisi otomatis dari jadwal"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-[16px] md:text-[13px] text-slate-500 cursor-not-allowed"
                  />
                </div>
                
                <div className="md:col-span-2 flex items-center mt-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-[13px] font-bold text-slate-700">Status Pegawai:</span>
                    <button
                      type="button"
                      onClick={() => handleChange('status', formData.status === 'Aktif' ? 'Non-Aktif' : 'Aktif')}
                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-white text-[12px] font-bold uppercase shadow-sm transition-colors ${
                        formData.status === 'Aktif' ? 'bg-[#10b981] hover:bg-[#0ea5e9]' : 'bg-rose-500 hover:bg-rose-600'
                      }`}
                    >
                      <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
                      {formData.status === 'Aktif' ? 'Aktif' : 'Non-Aktif'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pendidikan' && (
            <div className="animate-fade-in space-y-6">
              <div className="bg-slate-50 rounded-xl p-4 md:p-5 border border-slate-200">
                <label className="block text-[13px] text-slate-600 mb-2 font-medium">Pendidikan Terakhir <span className="text-rose-500">*</span></label>
                <SearchableSelect
                  showSearch={false}
                  value={formData.pendidikanTerakhir}
                  onChange={(val) => handleChange('pendidikanTerakhir', val)}
                  options={EDU_LEVELS}
                  placeholder="Pilih Pendidikan"
                  error={!!errors.pendidikanTerakhir}
                />
              </div>

              {formData.pendidikanTerakhir && (
                <div className="space-y-4">
                  <h3 className="text-[14px] font-bold text-slate-700 border-b border-slate-200 pb-2">Riwayat Sekolah / Institusi</h3>
                  
                  {EDU_LEVELS.indexOf(formData.pendidikanTerakhir) >= EDU_LEVELS.indexOf('SD') && (
                    <div className="grid grid-cols-1 gap-1">
                      <label className="block text-[13px] text-slate-600 font-medium">Instansi SD</label>
                      <input type="text" value={formData.instansiSD || ''} onChange={(e) => handleChange('instansiSD', e.target.value)} placeholder="Nama SD" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors" />
                    </div>
                  )}

                  {EDU_LEVELS.indexOf(formData.pendidikanTerakhir) >= EDU_LEVELS.indexOf('SMP') && (
                    <div className="grid grid-cols-1 gap-1">
                      <label className="block text-[13px] text-slate-600 font-medium">Instansi SMP</label>
                      <input type="text" value={formData.instansiSMP || ''} onChange={(e) => handleChange('instansiSMP', e.target.value)} placeholder="Nama SMP" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors" />
                    </div>
                  )}

                  {EDU_LEVELS.indexOf(formData.pendidikanTerakhir) >= EDU_LEVELS.indexOf('SMA') && (
                    <div className="grid grid-cols-1 gap-1">
                      <label className="block text-[13px] text-slate-600 font-medium">Instansi SMA</label>
                      <input type="text" value={formData.instansiSMA || ''} onChange={(e) => handleChange('instansiSMA', e.target.value)} placeholder="Nama SMA/SMK" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors" />
                    </div>
                  )}

                  {['D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3'].map((level) => {
                    if (EDU_LEVELS.indexOf(formData.pendidikanTerakhir) < EDU_LEVELS.indexOf(level)) return null;
                    return (
                      <div key={level} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div>
                          <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Instansi {level}</label>
                          <input type="text" value={(formData as any)[`instansi${level}`] || ''} onChange={(e) => handleChange(`instansi${level}` as any, e.target.value)} placeholder={`Universitas / Institusi ${level}`} className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jurusan / Prodi {level}</label>
                          <input type="text" value={(formData as any)[`jurusan${level}`] || ''} onChange={(e) => handleChange(`jurusan${level}` as any, e.target.value)} placeholder="Nama Jurusan" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] text-[16px] md:text-[13px] text-slate-700 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 border-t border-slate-100 bg-slate-50 flex flex-col space-y-3 shrink-0">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-full bg-[#10b981] text-white font-bold text-[14px] hover:bg-[#059669] shadow-md transition-all cursor-pointer"
          >
            Simpan
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-[14px] hover:bg-slate-50 transition-all cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
