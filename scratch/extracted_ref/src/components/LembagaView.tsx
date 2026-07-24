import React, { useState } from 'react';
import { School, Award, MapPin, Mail, Globe, RefreshCw, Star, BookOpen, Compass, Edit3, Youtube, User } from 'lucide-react';
import { Institution } from '../types';
import { LembagaEditModal } from './LembagaEditModal';

interface LembagaViewProps {
  institution: Institution;
  onUpdateTrigger: () => void;
  onSaveInstitution: (updated: Institution) => void;
}

export const LembagaView: React.FC<LembagaViewProps> = ({ institution, onUpdateTrigger: _onUpdateTrigger, onSaveInstitution }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  return (
    <div className="animate-fade-in block text-left lg:h-[calc(100vh-140px)] lg:overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch lg:h-full">
        {/* Left column - Card Profile */}
        <div className="w-full lg:w-1/3 flex">
          <div className="bento-card text-center flex flex-col items-center relative w-full justify-start p-5 lg:p-4 xl:p-5">
            <button
               onClick={() => setIsEditOpen(true)}
               className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-full transition-colors cursor-pointer border border-slate-200"
               title="Edit Lembaga"
            >
               <Edit3 className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center w-full">
              <div className="w-28 h-28 lg:w-24 lg:h-24 xl:w-28 xl:h-28 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 relative overflow-hidden group shadow-inner">
                {institution.logo ? (
                  <img 
                    src={institution.logo} 
                    alt={institution.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
                    <School className="w-8 h-8 stroke-[2]" />
                  </div>
                )}
              </div>
              <h3 className="text-lg lg:text-base xl:text-lg font-extrabold text-slate-800 tracking-tight uppercase line-clamp-2 px-2">
                {institution.name}
              </h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-0.5">
                NPSN: {institution.npsn}
              </p>

              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-full border border-amber-100 flex items-center">
                  <Star className="w-2.5 h-2.5 mr-1 fill-amber-500 text-amber-500" />
                  Akreditasi {institution.accreditation}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-full border border-blue-100 flex items-center">
                  <BookOpen className="w-2.5 h-2.5 mr-1 stroke-[2.5]" />
                  {institution.curriculum.split(' ')[1] || 'Merdeka'}
                </span>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-4 lg:my-3 xl:my-4"></div>

            <div className="w-full space-y-4 lg:space-y-3 xl:space-y-4 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <User className="w-4.5 h-4.5 lg:w-4 lg:h-4 xl:w-4.5 xl:h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-[9px] xl:text-[10px] font-black text-slate-400 uppercase leading-none tracking-wider">Kepala Sekolah</p>
                  <p className="text-sm lg:text-xs xl:text-sm font-bold text-slate-700 mt-1">{institution.principal}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4.5 h-4.5 lg:w-4 lg:h-4 xl:w-4.5 xl:h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-[9px] xl:text-[10px] font-black text-slate-400 uppercase leading-none tracking-wider">Email Resmi</p>
                  <p className="text-sm lg:text-xs xl:text-sm font-bold text-slate-700 mt-1 truncate max-w-[180px] lg:max-w-[150px] xl:max-w-[200px]" title={institution.email}>{institution.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 lg:w-8 lg:h-8 xl:w-9 xl:h-9 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4.5 h-4.5 lg:w-4 lg:h-4 xl:w-4.5 xl:h-4.5" />
                </div>
                <div>
                  <p className="text-[10px] lg:text-[9px] xl:text-[10px] font-black text-slate-400 uppercase leading-none tracking-wider">Situs Web</p>
                  <a
                    href={institution.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm lg:text-xs xl:text-sm font-bold text-emerald-600 hover:underline mt-1 block truncate max-w-[180px] lg:max-w-[150px] xl:max-w-[200px]"
                    title={institution.website}
                  >
                    {institution.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Bento detail info */}
        <div className="flex-1 w-full flex flex-col gap-4 lg:gap-4 xl:gap-5 justify-between lg:h-full">
          <div className="bento-card bg-white p-5 lg:p-4 xl:p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4 lg:mb-3 xl:mb-4">
                <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                  Detail Identitas Lembaga
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 lg:gap-x-6 lg:gap-y-2.5 xl:gap-x-8 xl:gap-y-3">
                <div>
                  <p className="institution-label">Jenjang Pendidikan</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">{institution.level}</p>
                </div>
                <div>
                  <p className="institution-label">Status Sekolah</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">{institution.status}</p>
                </div>
                <div>
                  <p className="institution-label">Penyelenggara</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">{institution.organizer}</p>
                </div>
                <div>
                  <p className="institution-label">Kurikulum</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">{institution.curriculum}</p>
                </div>
                <div>
                  <p className="institution-label">Kontak / No. Telp</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">{institution.phone}</p>
                </div>
                <div>
                  <p className="institution-label">Tahun Ajaran Aktif</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700">
                    {institution.academicYear} (Semester {institution.semester})
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="institution-label">Alamat Lengkap</p>
                  <p className="text-xs xl:text-sm font-bold text-slate-700 leading-relaxed line-clamp-2">{institution.address}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-start">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Status: Data Sinkron
                </span>
              </div>
            </div>
          </div>

          {/* Media Sosial Resmi Card */}
          <div className="bento-card bg-white p-5 lg:p-4 xl:p-5">
            <div className="flex items-center space-x-3 mb-3 lg:mb-2.5 xl:mb-3">
              <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">
                Media Sosial Resmi
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-2.5 xl:gap-3">
              {/* Instagram */}
              <a
                href={institution.social.instagram.url || '#'}
                target={institution.social.instagram.url ? '_blank' : '_self'}
                rel="noreferrer"
                className={`bg-slate-50 p-2.5 lg:p-2 xl:p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100 hover:bg-white hover:shadow-md transition-all group min-h-[75px] lg:min-h-[70px] xl:min-h-[80px] ${
                  !institution.social.instagram.url ? 'socmed-btn-inactive' : ''
                }`}
              >
                <div className="w-8 h-8 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 rounded-lg flex items-center justify-center text-white mb-1.5 shadow-sm">
                  <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Instagram</span>
                <span className="text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-slate-700 truncate w-full text-center tracking-tight px-1 leading-tight">
                  {institution.social.instagram.user || 'Tidak Ada'}
                </span>
              </a>

              {/* Facebook */}
              <a
                href={institution.social.facebook.url || '#'}
                target={institution.social.facebook.url ? '_blank' : '_self'}
                rel="noreferrer"
                className={`bg-slate-50 p-2.5 lg:p-2 xl:p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100 hover:bg-white hover:shadow-md transition-all group min-h-[75px] lg:min-h-[70px] xl:min-h-[80px] ${
                  !institution.social.facebook.url ? 'socmed-btn-inactive' : ''
                }`}
              >
                <div className="w-8 h-8 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-1.5 shadow-sm">
                  <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5 leading-none">Facebook</span>
                <span className="text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-slate-700 truncate w-full text-center tracking-tight px-1 leading-tight">
                  {institution.social.facebook.user || 'Tidak Ada'}
                </span>
              </a>

              {/* TikTok */}
              <a
                href={institution.social.tiktok.url || '#'}
                target={institution.social.tiktok.url ? '_blank' : '_self'}
                rel="noreferrer"
                className={`bg-slate-50 p-2.5 lg:p-2 xl:p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100 hover:bg-white hover:shadow-md transition-all group min-h-[75px] lg:min-h-[70px] xl:min-h-[80px] ${
                  !institution.social.tiktok.url ? 'socmed-btn-inactive' : ''
                }`}
              >
                <div className="w-8 h-8 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-black rounded-lg flex items-center justify-center text-white mb-1.5 shadow-sm">
                  <svg className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"></path>
                  </svg>
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5 leading-none">TikTok</span>
                <span className="text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-slate-700 truncate w-full text-center tracking-tight px-1 leading-tight">
                  {institution.social.tiktok.user || 'Tidak Ada'}
                </span>
              </a>

              {/* YouTube */}
              <a
                href={institution.social.youtube?.url || '#'}
                target={institution.social.youtube?.url ? '_blank' : '_self'}
                rel="noreferrer"
                className={`bg-slate-50 p-2.5 lg:p-2 xl:p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-100 hover:bg-white hover:shadow-md transition-all group min-h-[75px] lg:min-h-[70px] xl:min-h-[80px] ${
                  !institution.social.youtube?.url ? 'socmed-btn-inactive' : ''
                }`}
              >
                <div className="w-8 h-8 lg:w-7 lg:h-7 xl:w-8 xl:h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white mb-1.5 shadow-sm">
                  <Youtube className="w-4 h-4 lg:w-3.5 lg:h-3.5 xl:w-4 xl:h-4" />
                </div>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5 leading-none">YouTube</span>
                <span className="text-[10px] lg:text-[9px] xl:text-[10px] font-bold text-slate-700 truncate w-full text-center tracking-tight px-1 leading-tight">
                  {institution.social.youtube?.user || 'Tidak Ada'}
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Lembaga Edit Modal */}
      <LembagaEditModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        institution={institution}
        onSave={onSaveInstitution}
      />
    </div>
  );
};

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
