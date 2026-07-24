import React, { useState } from 'react';
import { Settings, Save, Shield, Calendar, Mail, User, Plus, CheckCircle, Trash2, LayoutTemplate, ChevronDown } from 'lucide-react';
import { Institution } from '../types';
import { KopSurat } from './KopSurat';
import { SearchableSelect } from './SearchableSelect';

interface SettingsViewProps {
  institution: Institution;
  onSaveInstitution: (updated: Institution) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ institution, onSaveInstitution }) => {
  const [activeTab, setActiveTab] = useState<'sistem' | 'kop'>('sistem');

  // Admin Profile Settings
  const [adminName, setAdminName] = useState('Admin');
  const [adminEmail, setAdminEmail] = useState('admin@atsurmudzi.sch.id');
  const [adminPassword, setAdminPassword] = useState('********');

  // Academic Years
  const [academicYears, setAcademicYears] = useState<{ id: string; year: string; semester: 'GANJIL' | 'GENAP'; active: boolean }[]>(
    institution.academicYears || [
      { id: '1', year: institution.academicYear || '2026/2027', semester: institution.semester || 'GANJIL', active: true }
    ]
  );
  
  const [newYear, setNewYear] = useState('');
  const [newSemester, setNewSemester] = useState<'GANJIL' | 'GENAP'>('GANJIL');

  // Kop Settings
  const [kopSettings, setKopSettings] = useState(institution.kopSettings || {
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
  });
  const [previewOrientation, setPreviewOrientation] = useState<'landscape'|'portrait'>('landscape');

  const handleAddAcademicYear = () => {
    if (!newYear.trim()) return;
    const newId = Math.random().toString(36).substring(7);
    setAcademicYears([...academicYears, { id: newId, year: newYear, semester: newSemester, active: false }]);
    setNewYear('');
  };

  const handleRemoveAcademicYear = (id: string) => {
    setAcademicYears(academicYears.filter(ay => ay.id !== id));
  };

  const handleSetActivateAcademicYear = (id: string) => {
    setAcademicYears(academicYears.map(ay => ({
      ...ay,
      active: ay.id === id
    })));
  };

  const handleSaveSistem = (e: React.FormEvent) => {
    e.preventDefault();
    const activeAy = academicYears.find(ay => ay.active);
    
    const updated: Institution = {
      ...institution,
      academicYears,
      academicYear: activeAy ? activeAy.year : institution.academicYear,
      semester: activeAy ? activeAy.semester : institution.semester,
    };
    onSaveInstitution(updated);
  };

  const handleSaveKop = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Institution = {
      ...institution,
      kopSettings,
    };
    onSaveInstitution(updated);
  };

  return (
    <div className="animate-fade-in block text-left">
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveTab('sistem')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 ${
            activeTab === 'sistem'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Settings size={14} />
          <span>Sistem & Akademik</span>
        </button>
        <button
          onClick={() => setActiveTab('kop')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-2 ${
            activeTab === 'kop'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <LayoutTemplate size={14} />
          <span>Pengaturan KOP</span>
        </button>
      </div>

      {activeTab === 'sistem' && (
        <form onSubmit={handleSaveSistem} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bento-card bg-white h-fit">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                  Akun Administrator
                </h3>
              </div>
              
              <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100 mb-6">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 font-bold text-2xl mb-3 shadow-inner">
                  {adminName[0]}
                </div>
                <h4 className="text-base font-extrabold text-slate-800">{adminName}</h4>
                <p className="text-[10px] bg-slate-100 text-slate-700 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5 border border-slate-200">
                  Super Admin
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Nama Administrator</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Email Akun</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <Shield size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card bg-white h-fit">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                  Pengaturan Tahun Ajaran
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-end gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tahun Ajaran</label>
                    <input
                      type="text"
                      placeholder="Contoh: 2026/2027"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <label className="block text-[13px] text-slate-600 font-medium mb-1">Semester</label>
                    <SearchableSelect
                      value={newSemester}
                      onChange={(val) => setNewSemester(val as 'GANJIL' | 'GENAP')}
                      options={[
                        { value: 'GANJIL', label: 'Ganjil' },
                        { value: 'GENAP', label: 'Genap' }
                      ]}
                      placeholder="Semester"
                      showSearch={false}
                      isClearable={false}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAcademicYear}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2 mt-4">
                  {academicYears.map((ay) => (
                    <div key={ay.id} className={`flex items-center justify-between p-3 rounded-xl border ${ay.active ? 'bg-teal-50 border-teal-200' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center space-x-3">
                        <Calendar className={`w-5 h-5 ${ay.active ? 'text-teal-500' : 'text-slate-400'}`} />
                        <div>
                          <p className={`text-sm font-extrabold ${ay.active ? 'text-teal-900' : 'text-slate-700'}`}>
                            {ay.year}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Semester {ay.semester}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {ay.active ? (
                          <span className="flex items-center text-[10px] font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-full uppercase tracking-wider">
                            <CheckCircle size={12} className="mr-1" /> Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetActivateAcademicYear(ay.id)}
                            className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
                          >
                            Aktifkan
                          </button>
                        )}
                        {!ay.active && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAcademicYear(ay.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Simpan Pengaturan Sistem</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'kop' && (
        <form onSubmit={handleSaveKop} className="space-y-6">
          <div className="bento-card bg-white">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                Pengaturan Desain KOP & Cetak
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6 border-r border-slate-100 pr-4">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Gaya Visual KOP</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1 text-left">
                      <label className="text-[13px] text-slate-600 font-medium">Perataan Teks (Alignment)</label>
                      <SearchableSelect
                        value={kopSettings.alignment || 'center'}
                        onChange={(val) => setKopSettings({...kopSettings, alignment: val as any})}
                        options={[
                          { value: 'center', label: 'Rata Tengah (KOP Tengah)' },
                          { value: 'left', label: 'Rata Kiri (KOP Pinggir Kiri)' },
                          { value: 'right', label: 'Rata Kanan (KOP Pinggir Kanan)' }
                        ]}
                        placeholder="Perataan Teks"
                        showSearch={false}
                        isClearable={false}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="useRoundedRectangle" 
                        checked={kopSettings.useRoundedRectangle} 
                        onChange={(e) => setKopSettings({...kopSettings, useRoundedRectangle: e.target.checked})}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <label htmlFor="useRoundedRectangle" className="text-xs font-semibold text-slate-700">Gunakan Bingkai Garis Putus (Rounded Rectangle)</label>
                    </div>
                    
                    <div className="space-y-1 text-left">
                      <label className="text-[13px] text-slate-600 font-medium">Jenis Garis Bawah KOP (Pemisah)</label>
                      <SearchableSelect
                        value={kopSettings.separatorLineType || 'none'}
                        onChange={(val) => setKopSettings({...kopSettings, separatorLineType: val as any})}
                        options={[
                          { value: 'none', label: 'Tanpa Garis' },
                          { value: 'solid', label: 'Garis Lurus Biasa (Solid)' },
                          { value: 'dashed', label: 'Garis Putus-putus (Dashed)' },
                          { value: 'double', label: 'Garis Ganda (Double)' }
                        ]}
                        placeholder="Jenis Garis"
                        showSearch={false}
                        isClearable={false}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="useColoredBackground" 
                        checked={kopSettings.useColoredBackground} 
                        onChange={(e) => setKopSettings({...kopSettings, useColoredBackground: e.target.checked})}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <label htmlFor="useColoredBackground" className="text-xs font-semibold text-slate-700">Gunakan Warna Latar Belakang (Background)</label>
                    </div>

                    {kopSettings.useColoredBackground && (
                      <div className="space-y-1 pl-6">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Warna Latar Belakang</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="color" 
                            value={kopSettings.backgroundColor} 
                            onChange={(e) => setKopSettings({...kopSettings, backgroundColor: e.target.value})}
                            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                          />
                          <input 
                            type="text" 
                            value={kopSettings.backgroundColor} 
                            onChange={(e) => setKopSettings({...kopSettings, backgroundColor: e.target.value})}
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Teks Khusus / Tambahan</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="useCustomText" 
                        checked={kopSettings.useCustomText} 
                        onChange={(e) => setKopSettings({...kopSettings, useCustomText: e.target.checked})}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <label htmlFor="useCustomText" className="text-xs font-semibold text-slate-700">Gunakan Teks Tambahan Khusus</label>
                    </div>

                    {kopSettings.useCustomText && (
                      <div className="pl-6 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Isi Teks</label>
                          <input 
                            type="text"
                            value={kopSettings.customText || ''}
                            onChange={(e) => setKopSettings({...kopSettings, customText: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                            placeholder="Contoh: Terakreditasi A"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ukuran Font</label>
                            <input 
                              type="number"
                              min="8" max="24"
                              value={kopSettings.customTextSize || 10}
                              onChange={(e) => setKopSettings({...kopSettings, customTextSize: parseInt(e.target.value) || 10})}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                            />
                          </div>
                          <div className="space-y-1 text-left">
                            <label className="text-[13px] text-slate-600 font-medium">Posisi Teks</label>
                            <SearchableSelect
                              value={kopSettings.customTextPosition || 'bottom'}
                              onChange={(val) => setKopSettings({...kopSettings, customTextPosition: val as any})}
                              options={[
                                { value: 'top', label: 'Paling Atas' },
                                { value: 'middle', label: 'Tengah (Bawah Penyelenggara)' },
                                { value: 'bottom', label: 'Paling Bawah' }
                              ]}
                              placeholder="Posisi Teks"
                              showSearch={false}
                              isClearable={false}
                            />
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="customTextBold" 
                              checked={kopSettings.customTextBold} 
                              onChange={(e) => setKopSettings({...kopSettings, customTextBold: e.target.checked})}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                            />
                            <label htmlFor="customTextBold" className="text-xs font-semibold text-slate-700">Tebal (Bold)</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="customTextItalic" 
                              checked={kopSettings.customTextItalic} 
                              onChange={(e) => setKopSettings({...kopSettings, customTextItalic: e.target.checked})}
                              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                            />
                            <label htmlFor="customTextItalic" className="text-xs font-semibold text-slate-700">Miring (Italic)</label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Elemen KOP (Tampilkan/Sembunyikan)</h4>
                  
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="showLogoKemdikbud" 
                          checked={kopSettings.showLogoKemdikbud} 
                          onChange={(e) => setKopSettings({...kopSettings, showLogoKemdikbud: e.target.checked})}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <label htmlFor="showLogoKemdikbud" className="text-xs font-semibold text-slate-700">Logo Kemdikdasmen</label>
                      </div>
                      {kopSettings.showLogoKemdikbud && (
                        <SearchableSelect
                          value={kopSettings.logoKemdikbudPosition || 'left'}
                          onChange={(val) => setKopSettings({...kopSettings, logoKemdikbudPosition: val as 'left'|'right'})}
                          options={[
                            { value: 'left', label: 'Kiri' },
                            { value: 'right', label: 'Kanan' }
                          ]}
                          placeholder="Posisi"
                          showSearch={false}
                          isClearable={false}
                          className="w-24 text-[10px]"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="showLogoKemenag" 
                          checked={kopSettings.showLogoKemenag} 
                          onChange={(e) => setKopSettings({...kopSettings, showLogoKemenag: e.target.checked})}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <label htmlFor="showLogoKemenag" className="text-xs font-semibold text-slate-700">Logo Kemenag</label>
                      </div>
                      {kopSettings.showLogoKemenag && (
                        <SearchableSelect
                          value={kopSettings.logoKemenagPosition || 'left'}
                          onChange={(val) => setKopSettings({...kopSettings, logoKemenagPosition: val as 'left'|'right'})}
                          options={[
                            { value: 'left', label: 'Kiri' },
                            { value: 'right', label: 'Kanan' }
                          ]}
                          placeholder="Posisi"
                          showSearch={false}
                          isClearable={false}
                          className="w-24 text-[10px]"
                        />
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id="showLogoLembaga" 
                          checked={kopSettings.showLogoLembaga} 
                          onChange={(e) => setKopSettings({...kopSettings, showLogoLembaga: e.target.checked})}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <label htmlFor="showLogoLembaga" className="text-xs font-semibold text-slate-700">Logo Lembaga (Utama)</label>
                      </div>
                      {kopSettings.showLogoLembaga && (
                        <SearchableSelect
                          value={kopSettings.logoLembagaPosition || 'right'}
                          onChange={(val) => setKopSettings({...kopSettings, logoLembagaPosition: val as 'left'|'right'})}
                          options={[
                            { value: 'left', label: 'Kiri' },
                            { value: 'right', label: 'Kanan' }
                          ]}
                          placeholder="Posisi"
                          showSearch={false}
                          isClearable={false}
                          className="w-24 text-[10px]"
                        />
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {[
                      { id: 'showOrganizer', label: 'Tampilkan Nama Penyelenggara (Yayasan)', prop: 'showOrganizer' },
                      { id: 'showName', label: 'Tampilkan Nama Lembaga Utama', prop: 'showName' },
                      { id: 'showAddress', label: 'Tampilkan Alamat', prop: 'showAddress' },
                      { id: 'showContact', label: 'Tampilkan Kontak (Email, Website, dsb)', prop: 'showContact' }
                    ].map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={item.id} 
                          checked={kopSettings[item.prop as keyof typeof kopSettings] as boolean} 
                          onChange={(e) => setKopSettings({...kopSettings, [item.prop]: e.target.checked})}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                        />
                        <label htmlFor={item.id} className="text-xs font-semibold text-slate-700">{item.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preview KOP</h4>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewOrientation('portrait')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${previewOrientation === 'portrait' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOrientation('landscape')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${previewOrientation === 'landscape' ? 'bg-white shadow text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Landscape
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-200/50 p-6 rounded-2xl border border-slate-200 overflow-x-auto shadow-inner flex justify-center">
                <div className="bg-white shadow-sm transition-all duration-300 origin-top" style={{ width: previewOrientation === 'landscape' ? '800px' : '560px', padding: '20px' }}>
                  <KopSurat institution={{...institution, kopSettings}} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="flex items-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">Simpan Pengaturan KOP</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
