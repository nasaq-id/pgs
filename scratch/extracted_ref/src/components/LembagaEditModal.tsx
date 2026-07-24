import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Upload, School, Globe, Mail, Phone, MapPin, Youtube, Instagram, Facebook } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { Institution } from '../types';

interface LembagaEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  institution: Institution;
  onSave: (updated: Institution) => void;
}

export const LembagaEditModal: React.FC<LembagaEditModalProps> = ({
  isOpen,
  onClose,
  institution,
  onSave,
}) => {
  const [formData, setFormData] = useState<Institution>({ ...institution });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const kemdikbudLogoRef = useRef<HTMLInputElement>(null);
  const kemenagLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Ensure social media fields are fully initialized
      setFormData({
        ...institution,
        social: {
          instagram: { user: '', url: '', ...institution.social?.instagram },
          facebook: { user: '', url: '', ...institution.social?.facebook },
          tiktok: { user: '', url: '', ...institution.social?.tiktok },
          youtube: { user: '', url: '', ...institution.social?.youtube },
        },
        logo: institution.logo || '',
        kemdikbudLogo: institution.kemdikbudLogo || '',
        kemenagLogo: institution.kemenagLogo || '',
      });
    }
  }, [institution, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (field: keyof Institution, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSocialChange = (
    platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube',
    type: 'user' | 'url',
    value: string
  ) => {
    setFormData((prev) => {
      const socialPlatform = prev.social[platform] || { user: '', url: '' };
      return {
        ...prev,
        social: {
          ...prev.social,
          [platform]: {
            ...socialPlatform,
            [type]: value,
          },
        },
      };
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImage } = await import('../lib/image');
      const compressed = await compressImage(file);
      setFormData((prev) => ({
        ...prev,
        logo: compressed,
      }));
    } catch (error) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          logo: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKemdikbudLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImage } = await import('../lib/image');
      const compressed = await compressImage(file);
      setFormData((prev) => ({
        ...prev,
        kemdikbudLogo: compressed,
      }));
    } catch (error) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          kemdikbudLogo: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKemenagLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { compressImage } = await import('../lib/image');
      const compressed = await compressImage(file);
      setFormData((prev) => ({
        ...prev,
        kemenagLogo: compressed,
      }));
    } catch (error) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          kemenagLogo: base64,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Nama lembaga wajib diisi!');
      return;
    }
    onSave(formData);
    onClose();
  };

  return (
    <div id="lembaga-edit-modal" className="fixed inset-0 z-[130] flex items-center justify-center md:p-4 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-[2rem] relative md:shadow-2xl animate-fade-in z-50 flex flex-col md:my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
              <School className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Edit Identitas Lembaga</h3>
              <p className="text-xs text-slate-400 font-semibold">Perbarui data profil, media sosial, dan logo sekolah</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-8 scrollbar-hide">
          
          {/* Section 1: Logo & Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo/Photo Upload Column */}
            <div className="md:col-span-1 flex flex-col items-center text-center">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                Logo Lembaga
              </label>
              
              <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-200 relative overflow-hidden group shadow-inner">
                {formData.logo ? (
                  <>
                    <img 
                      src={formData.logo} 
                      alt="Logo Preview" 
                      className="w-full h-full object-cover"
                    />
                    <div 
                      onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                      className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 cursor-pointer shadow-md hover:bg-rose-600 transition-colors"
                      title="Hapus Logo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <School className="w-10 h-10 mb-1 stroke-[1.5]" />
                    <span className="text-[10px] font-bold">Belum Ada</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-600 text-[11px] font-black uppercase rounded-lg border border-teal-100 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Foto</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-2">Format: JPG, PNG, GIF. Max: 2MB</p>
            </div>

            {/* Basic Info Fields */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lembaga <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleTextChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Nama Madrasah / Sekolah"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  NPSN
                </label>
                <input
                  type="text"
                  value={formData.npsn}
                  onChange={(e) => handleTextChange('npsn', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Nomor Pokok Sekolah Nasional"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Akreditasi
                </label>
                <SearchableSelect
                  showSearch={false}
                  value={formData.accreditation}
                  onChange={(val) => handleTextChange('accreditation', val)}
                  options={['A', 'B', 'C', 'Belum Terakreditasi']}
                  placeholder="Pilih Akreditasi"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Kurikulum Aktif
                </label>
                <input
                  type="text"
                  value={formData.curriculum}
                  onChange={(e) => handleTextChange('curriculum', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Contoh: Kurikulum Merdeka"
                />
              </div>
            </div>
          </div>

          {/* Logo Customization Section */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] mb-4 text-left">
              Kustomisasi Logo Tambahan (Untuk KOP & Cetakan)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Kemdikbud Logo */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-200 relative overflow-hidden shrink-0">
                  {formData.kemdikbudLogo ? (
                    <>
                      <img src={formData.kemdikbudLogo} alt="Logo Kemdikbud" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, kemdikbudLogo: '' }))}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5 cursor-pointer hover:bg-rose-600 transition-colors flex items-center justify-center"
                        title="Hapus Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center p-1">
                      <img src="/tut-wuri.png" alt="Default Kemdikbud" className="w-10 h-10 object-contain opacity-55" />
                      <span className="text-[8px] font-bold text-slate-400 mt-1">Default (Tut Wuri)</span>
                    </div>
                  )}
                </div>
                <div className="text-left flex-1">
                  <span className="block text-xs font-black text-slate-700">Logo Kemendikdasmen</span>
                  <p className="text-[10px] text-slate-400 mt-1 mb-2">Ganti logo default Tut Wuri Handayani jika diperlukan.</p>
                  <input
                    type="file"
                    ref={kemdikbudLogoRef}
                    accept="image/*"
                    onChange={handleKemdikbudLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => kemdikbudLogoRef.current?.click()}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 text-[10px] font-black uppercase rounded-lg border border-teal-100 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Pilih Logo</span>
                  </button>
                </div>
              </div>

              {/* Kemenag Logo */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-200 relative overflow-hidden shrink-0">
                  {formData.kemenagLogo ? (
                    <>
                      <img src={formData.kemenagLogo} alt="Logo Kemenag" className="w-full h-full object-contain p-1" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, kemenagLogo: '' }))}
                        className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-0.5 cursor-pointer hover:bg-rose-600 transition-colors flex items-center justify-center"
                        title="Hapus Logo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center text-center p-1">
                      <img src="/kemenag.png" alt="Default Kemenag" className="w-10 h-10 object-contain opacity-55" />
                      <span className="text-[8px] font-bold text-slate-400 mt-1">Default (Kemenag)</span>
                    </div>
                  )}
                </div>
                <div className="text-left flex-1">
                  <span className="block text-xs font-black text-slate-700">Logo Kementerian Agama</span>
                  <p className="text-[10px] text-slate-400 mt-1 mb-2">Ganti logo default Kemenag jika diperlukan.</p>
                  <input
                    type="file"
                    ref={kemenagLogoRef}
                    accept="image/*"
                    onChange={handleKemenagLogoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => kemenagLogoRef.current?.click()}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 text-[10px] font-black uppercase rounded-lg border border-teal-100 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Pilih Logo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Profiles & Contacts */}
          <div className="border-t border-slate-100 pt-6">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] mb-4 text-left">
              Identitas Detail & Kontak
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Kepala Sekolah / Madrasah
                </label>
                <input
                  type="text"
                  value={formData.principal}
                  onChange={(e) => handleTextChange('principal', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Nama Kepala Sekolah beserta gelar"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Penyelenggara / Yayasan
                </label>
                <input
                  type="text"
                  value={formData.organizer}
                  onChange={(e) => handleTextChange('organizer', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Nama Yayasan Penyelenggara"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Jenjang Pendidikan
                </label>
                <SearchableSelect
                  showSearch={false}
                  value={formData.level}
                  onChange={(val) => handleTextChange('level', val)}
                  options={['SD/MI', 'SMP/MTs', 'SMA/SMK/MA/MAK', 'Paket A', 'Paket B', 'Paket C']}
                  placeholder="Pilih Jenjang"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Status Sekolah
                </label>
                <SearchableSelect
                  showSearch={false}
                  value={formData.status}
                  onChange={(val) => handleTextChange('status', val)}
                  options={['Negeri', 'Swasta']}
                  placeholder="Pilih Status"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Email Resmi
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleTextChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="alamat@email.com"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Situs Web
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleTextChange('website', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="https://www.sekolah.sch.id"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  No. Telepon Kantor
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleTextChange('phone', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="(021) 123456"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Tahun Ajaran
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => handleTextChange('academicYear', e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                  placeholder="Contoh: 2025/2026"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Semester Aktif
                </label>
                <SearchableSelect
                  showSearch={false}
                  value={formData.semester}
                  onChange={(val) => handleTextChange('semester', val)}
                  options={['GANJIL', 'GENAP']}
                  placeholder="Pilih Semester"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Alamat Lengkap Kantor
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleTextChange('address', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none"
                  placeholder="Tulis alamat kantor madrasah secara lengkap..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Official Social Media */}
          <div className="border-t border-slate-100 pt-6 text-left">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] mb-4">
              Media Sosial Resmi (Username & Link Tautan)
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Instagram */}
              <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-indigo-600">
                  <Instagram size={18} className="stroke-[2.5]" />
                  <span className="text-xs font-bold">Instagram</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Contoh: @mtsaturmudzi"
                      value={formData.social?.instagram?.user || ''}
                      onChange={(e) => handleSocialChange('instagram', 'user', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">URL Profil</label>
                    <input
                      type="text"
                      placeholder="https://instagram.com/..."
                      value={formData.social?.instagram?.url || ''}
                      onChange={(e) => handleSocialChange('instagram', 'url', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Facebook */}
              <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-blue-600">
                  <Facebook size={18} className="stroke-[2.5]" />
                  <span className="text-xs font-bold">Facebook</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Username / Nama Halaman</label>
                    <input
                      type="text"
                      placeholder="Contoh: mts.aturmudzi"
                      value={formData.social?.facebook?.user || ''}
                      onChange={(e) => handleSocialChange('facebook', 'user', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">URL Profil</label>
                    <input
                      type="text"
                      placeholder="https://facebook.com/..."
                      value={formData.social?.facebook?.url || ''}
                      onChange={(e) => handleSocialChange('facebook', 'url', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* TikTok */}
              <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-slate-900">
                  <span className="font-bold text-xs">TikTok</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="Contoh: mts.aturmudzi"
                      value={formData.social?.tiktok?.user || ''}
                      onChange={(e) => handleSocialChange('tiktok', 'user', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">URL Profil</label>
                    <input
                      type="text"
                      placeholder="https://tiktok.com/@..."
                      value={formData.social?.tiktok?.url || ''}
                      onChange={(e) => handleSocialChange('tiktok', 'url', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube (Requested by User) */}
              <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center space-x-2 text-rose-600">
                  <Youtube size={18} className="stroke-[2.5]" />
                  <span className="text-xs font-bold">YouTube</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Nama Channel</label>
                    <input
                      type="text"
                      placeholder="Contoh: MTs At-Turmudzi TV"
                      value={formData.social?.youtube?.user || ''}
                      onChange={(e) => handleSocialChange('youtube', 'user', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">URL Tautan Youtube</label>
                    <input
                      type="text"
                      placeholder="https://youtube.com/..."
                      value={formData.social?.youtube?.url || ''}
                      onChange={(e) => handleSocialChange('youtube', 'url', e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <div className="px-4 py-4 md:px-8 md:py-6 border-t border-slate-100 flex items-center justify-end space-x-3 bg-slate-50 md:rounded-b-[2rem]">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 bg-white text-slate-500 font-bold border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors text-xs uppercase tracking-wider cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="py-3 px-6 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-100 hover:shadow-teal-200 transition-all text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan</span>
          </button>
        </div>

      </div>
    </div>
  );
};
