import React, { useState, useEffect, useRef } from 'react';
import { Menu, ArrowLeft, Bell, Phone, User, LogOut, Settings, Inbox } from 'lucide-react';
import { Institution, NotificationItem } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabaseClient';

interface HeaderProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  institution: Institution;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onLogoutClick: () => void;
  mobileSidebarOpen?: boolean;
  setMobileSidebarOpen?: (val: boolean) => void;
  userRole?: 'super_admin' | 'admin' | 'siswa' | 'guru' | 'kepsek' | 'wakasek' | null;
  currentUser?: any;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onPageChange,
  institution,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onLogoutClick,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  userRole = 'admin',
  currentUser,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const userInitials = currentUser?.nama ? currentUser.nama[0].toUpperCase() : 'U';
  const userName = currentUser?.nama || (
    userRole === 'super_admin' ? 'Super Admin' :
    userRole === 'admin' ? 'Admin' :
    userRole === 'kepsek' ? 'Kepala Sekolah' :
    userRole === 'wakasek' ? 'Wakil Kepala Sekolah' :
    userRole === 'guru' ? 'Guru Madrasah' : 'Siswa'
  );

  const userRoleLabel = (
    userRole === 'super_admin' ? 'Super Admin' :
    userRole === 'admin' ? 'Administrator' :
    userRole === 'kepsek' ? 'Kepala Sekolah' :
    userRole === 'wakasek' ? 'Wakil Kepala Sekolah' :
    userRole === 'guru' ? 'Guru & Tendik' : 'Siswa'
  );

  const userEmail = currentUser?.email || `${currentUser?.username || (userRole === 'super_admin' ? 'superadmin' : userRole || 'user')}@atsurmudzi.sch.id`;

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    profil: 'Lembaga',
    siswa: 'Data Siswa',
    guru: 'Guru & Tendik',
    sarpras: 'Sarana & Prasarana',
    akademik: 'Akademik',
    'lms-jurnal': 'LMS - Jurnal Mengajar',
    'lms-asesmen': 'LMS - Asesmen & Penilaian',
    presensi: 'Sistem Presensi & ID Card',
    'kesiswaan-poin': 'Kesiswaan - Poin Kedisiplinan Siswa',
    'kesiswaan-bk': 'Kesiswaan - Bimbingan Konseling (BK)',
    'kesiswaan-prestasi': 'Kesiswaan - Prestasi & Ekstrakurikuler',
    'kesiswaan-mutasi': 'Kesiswaan - Mutasi & Pindah Kelas',
    database: 'Database Supabase',
    settings: 'Pengaturan',
    notifikasi: 'Notifikasi',
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const openWhatsApp = () => {
    // Format the phone number (strip non-digits, replace leading 0 with 62)
    let cleanPhone = institution.phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    // Alternatively use default CONFIG.whatsapp
    const whatsappNum = "6282258921234";
    window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent('Halo Admin MTs At-Turmudzi, saya butuh bantuan.')}`, '_blank');
  };

  return (
    <header className="h-20 md:h-24 bg-transparent px-4 md:px-12 flex items-center justify-between relative z-30">
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Hamburger Menu on Mobile */}
        <button
          onClick={() => setMobileSidebarOpen && setMobileSidebarOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 md:hidden transition-colors cursor-pointer"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
        </button>

        {currentPage !== 'dashboard' && (
          <button
            onClick={() => onPageChange('dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
          </button>
        )}
        <div>
          <h2 className="text-lg md:text-2xl font-extrabold text-[#0f172a] tracking-tight leading-none">
            {pageTitles[currentPage] || 'Panel'}
          </h2>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 md:space-x-3">
        {/* Supabase Status Indicator Badge */}
        {(() => {
          const { url, anonKey } = getStoredSupabaseConfig();
          const isCloudConnected = !!(url && anonKey);
          return (
            <div 
              onClick={() => onPageChange('database')}
              className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none shadow-sm ${
                isCloudConnected 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' 
                  : 'bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100'
              }`}
              title={isCloudConnected ? "Terhubung ke Supabase Cloud (Sinkronisasi Otomatis)" : "Mode Lokal Offline (Belum Terhubung Supabase)"}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold">
                {isCloudConnected ? 'Cloud Active' : 'Offline Draft'}
              </span>
            </div>
          );
        })()}

        {/* Notifications Icon */}
        <div className="relative inline-block" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={`w-[42px] h-[42px] flex items-center justify-center bg-white border border-slate-200 rounded-xl text-amber-400 hover:text-amber-500 hover:border-amber-200 hover:bg-amber-50 transition-all shadow-sm cursor-pointer relative ${
              notifOpen ? 'ring-2 ring-amber-400/20' : ''
            }`}
            title="Notifikasi"
          >
            <Bell className="w-5 h-5 stroke-[2.5]" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Notification Dropdown Menu */}
          {notifOpen && (
            <div className="dropdown-menu active animate-fade-in w-[calc(100vw-2rem)] sm:w-80 overflow-hidden absolute right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-xl z-50">
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-800">Notifikasi</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={onMarkAllNotificationsRead}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold uppercase tracking-wider"
                    >
                      Tandai Semua Dibaca
                    </button>
                  )}
                </div>
                <div className="max-h-[250px] overflow-y-auto space-y-3 pr-1 scrollbar-hide">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                        <Inbox className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-semibold text-slate-400">Belum ada informasi baru</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className={`p-3 rounded-xl transition-all cursor-pointer border text-left ${
                          notif.read 
                            ? 'bg-slate-50/50 border-slate-100 text-slate-500' 
                            : 'bg-teal-50/30 border-teal-100/50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-bold truncate pr-2">{notif.title}</h5>
                          {!notif.read && <span className="w-1.5 h-1.5 bg-teal-500 rounded-full flex-shrink-0 mt-1"></span>}
                        </div>
                        <p className="text-[11px] mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
                        <span className="text-[9px] text-slate-400 mt-1.5 block">{notif.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="border-t border-slate-50">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    onPageChange('notifikasi');
                  }}
                  className="w-full py-4 text-center text-[10px] font-black text-amber-500 hover:bg-amber-50 transition-colors uppercase tracking-[0.2em]"
                >
                  Tampilkan Selengkapnya
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Support Phone / Whatsapp */}
        <button
          onClick={openWhatsApp}
          className="w-[42px] h-[42px] flex items-center justify-center bg-white border border-slate-200 rounded-xl text-emerald-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm cursor-pointer"
          title="Hubungi Admin WA"
        >
          <Phone className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="h-10 w-px bg-slate-200 mx-2"></div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-2 md:space-x-3 bg-white p-1.5 md:pr-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-teal-200 hover:bg-slate-50 transition-all"
          >
            <div className="w-9 h-9 md:w-10 md:h-10 bg-teal-100 rounded-lg flex items-center justify-center text-teal-700 font-bold text-xs md:text-sm shadow-sm border border-slate-100 uppercase">
              <span>{userInitials}</span>
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-[13px] font-bold text-slate-700 leading-tight truncate max-w-[100px]">{userName}</span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">{userRoleLabel}</span>
            </div>
          </div>

          {profileOpen && (
            <div className="dropdown-menu active animate-fade-in p-2 w-48 overflow-hidden absolute right-0 mt-3 bg-white border border-slate-100 rounded-2xl shadow-xl z-50">
              <div className="px-4 py-3 border-b border-slate-100 mb-1 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Akun Terhubung</p>
                <p className="text-xs font-bold text-slate-700 truncate mt-0.5">{userName}</p>
                <p className="text-[9px] text-slate-400 truncate">{userEmail}</p>
              </div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  onPageChange('settings');
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <User size={16} />
                <span>Profil Saya</span>
              </button>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  onPageChange('settings');
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Settings size={16} />
                <span>Pengaturan</span>
              </button>
              <div className="h-px bg-slate-100 my-1 mx-2"></div>
              <button
                onClick={() => {
                  setProfileOpen(false);
                  onLogoutClick();
                }}
                className="w-full text-left px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
                <span>Keluar Sistem</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
