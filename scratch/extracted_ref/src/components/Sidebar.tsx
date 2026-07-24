import React from 'react';
import { LayoutGrid, School, Users, GraduationCap, Settings, Calendar, Compass, X, Database, DoorOpen, Layers, BookOpen, ChevronDown, ChevronUp, BookMarked, Award } from 'lucide-react';
import { Institution } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  institution: Institution;
  mobileSidebarOpen?: boolean;
  setMobileSidebarOpen?: (val: boolean) => void;
  userRole?: 'super_admin' | 'admin' | 'guru' | 'siswa' | 'kepsek' | 'wakasek' | null;
  currentUser?: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  isMinimized,
  setIsMinimized,
  institution,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  userRole = 'admin',
  currentUser,
}) => {
  const toggleSidebar = () => {
    setIsMinimized(!isMinimized);
  };

  const [lmsExpanded, setLmsExpanded] = React.useState(true);
  const [kesiswaanExpanded, setKesiswaanExpanded] = React.useState(true);

  React.useEffect(() => {
    if (currentPage.startsWith('lms-')) {
      setLmsExpanded(true);
    }
    if (currentPage.startsWith('kesiswaan-')) {
      setKesiswaanExpanded(true);
    }
  }, [currentPage]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'profil', label: 'Lembaga', icon: School },
    { id: 'siswa', label: 'Siswa', icon: Users },
    { id: 'guru', label: 'Guru & Tendik', icon: GraduationCap },
    { id: 'sarpras', label: 'Sarpras', icon: DoorOpen },
    { id: 'akademik', label: 'Akademik', icon: BookOpen },
    { 
      id: 'lms', 
      label: 'LMS', 
      icon: BookMarked, 
      hasSubmenu: true, 
      submenus: [
        { id: 'lms-emateri', label: 'e-Materi' },
        { id: 'lms-jurnal', label: 'Jurnal Mengajar' },
        { id: 'lms-asesmen', label: 'Asesmen' }
      ] 
    },
    { id: 'presensi', label: 'Presensi', icon: Calendar },
    {
      id: 'kesiswaan',
      label: 'Kesiswaan',
      icon: Award,
      hasSubmenu: true,
      submenus: [
        { id: 'kesiswaan-poin', label: 'Poin Kedisiplinan' },
        { id: 'kesiswaan-bk', label: 'Bimbingan Konseling' },
        { id: 'kesiswaan-prestasi', label: 'Prestasi & Ekskul' },
        { id: 'kesiswaan-mutasi', label: 'Mutasi & Pindah Kelas' }
      ]
    },
    { id: 'database', label: 'Database Supabase', icon: Database },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  // Dynamic role-based navigation filtering
  const filteredNavItems = React.useMemo(() => {
    return navItems.filter((item) => {
      if (userRole === 'super_admin') {
        return true;
      }
      if (userRole === 'admin') {
        return item.id !== 'database';
      }
      if (userRole === 'kepsek' || userRole === 'wakasek') {
        return !['database', 'settings'].includes(item.id);
      }
      if (userRole === 'guru') {
        return ['dashboard', 'siswa', 'lms', 'presensi', 'kesiswaan'].includes(item.id);
      }
      if (userRole === 'siswa') {
        return ['dashboard', 'lms', 'presensi', 'kesiswaan'].includes(item.id);
      }
      return true;
    }).map((item) => {
      if (userRole === 'siswa') {
        if (item.id === 'lms') {
          return {
            ...item,
            submenus: item.submenus?.filter((sub) => ['lms-emateri', 'lms-asesmen'].includes(sub.id))
          };
        }
        if (item.id === 'kesiswaan') {
          return {
            ...item,
            submenus: item.submenus?.filter((sub) => ['kesiswaan-poin', 'kesiswaan-bk'].includes(sub.id))
          };
        }
      }
      if (userRole === 'guru') {
        if (item.id === 'kesiswaan') {
          return {
            ...item,
            submenus: item.submenus?.filter((sub) => sub.id !== 'kesiswaan-mutasi')
          };
        }
      }
      return item;
    });
  }, [userRole]);

  // Connected user card calculations
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

  // Dynamically split institution name to fit beautifully
  const nameParts = (institution.name || "MTs At-Turmudzi").split(' ');
  const prefix = nameParts[0] || 'MTs';
  const mainName = nameParts.slice(1).join(' ') || 'At-Turmudzi';

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[110] md:hidden transition-opacity duration-300 animate-fade-in"
          onClick={() => setMobileSidebarOpen && setMobileSidebarOpen(false)}
        />
      )}

      <aside
        id="main-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-[120] md:z-20 flex-shrink-0 flex flex-col bg-white border-r border-slate-200/60 shadow-[4px_0_24px_rgba(0,0,0,0.02)] md:shadow-none transition-all duration-300 ease-in-out
          ${isMinimized ? 'md:w-20 sidebar-minimized' : 'md:w-72'}
          w-72
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo / Branding Section */}
        <div className={`h-20 md:h-24 flex items-center px-6 justify-between border-b border-slate-200/50 transition-all duration-300 ${isMinimized ? 'md:px-4' : 'md:px-6'}`}>
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none group" 
            onClick={() => {
              if (isMinimized) {
                toggleSidebar();
              }
            }}
          >
            {/* Glowing Logo Icon */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white flex-shrink-0 transform group-hover:scale-105 transition-transform duration-300">
              <Compass className="w-5.5 h-5.5 animate-spin-slow stroke-[2]" />
            </div>
            
            {/* Logo Text */}
            {!isMinimized && (
              <div className="flex flex-col whitespace-nowrap logo-text animate-fade-in">
                <span className="text-slate-800 font-extrabold text-lg leading-none tracking-tight flex items-center gap-1">
                  {prefix} <span className="text-teal-600 font-extrabold">{mainName}</span>
                </span>
                <span className="text-slate-400 text-[9px] font-bold tracking-[0.2em] mt-1 uppercase">MANAGEMENT SYSTEM</span>
              </div>
            )}
          </div>

          {/* Toggle Button for Desktop */}
          {!isMinimized && (
            <div className="hidden md:block">
              <button
                onClick={toggleSidebar}
                className="p-1.5 hover:bg-slate-100/80 text-slate-400 hover:text-slate-700 rounded-lg transition-colors duration-200"
                title="Sembunyikan Menu"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Close Button for Mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileSidebarOpen && setMobileSidebarOpen(false)}
              className="p-1.5 hover:bg-slate-100/80 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Dynamic Desktop Expander Toggler (Only shown when minimized to let user expand easily) */}
        {isMinimized && (
          <div className="hidden md:flex justify-center py-4 border-b border-slate-200/50">
            <button
              onClick={toggleSidebar}
              className="p-1.5 hover:bg-slate-100/80 text-slate-400 hover:text-slate-700 rounded-lg transition-colors duration-200"
              title="Tampilkan Menu"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Tahun Akademik / Academic Year Box */}
        {!isMinimized ? (
          <div className="mx-4 mt-6 p-4 bg-gradient-to-br from-slate-50/80 to-slate-100/50 rounded-2xl border border-slate-200/60 sidebar-text-container transition-all duration-300">
            <div className="flex items-center space-x-2 text-slate-400 mb-2">
              <Calendar className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-[9px] font-black uppercase tracking-wider">Tahun Akademik</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{institution.academicYear}</span>
              <span className="text-[9px] font-black px-2 py-0.5 bg-teal-50/80 text-teal-600 border border-teal-500/20 rounded-full tracking-wider uppercase">
                {institution.semester}
              </span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center py-4 text-slate-400 border-b border-slate-200/50" title={`Tahun Ajaran ${institution.academicYear}`}>
            <Calendar className="w-5 h-5 text-teal-500 mb-1" />
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-teal-50/80 text-teal-600 rounded border border-teal-500/20">
              {institution.semester.slice(0, 3)}
            </span>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto py-6 scrollbar-hide">
          {filteredNavItems.map((item) => {
            if (item.hasSubmenu) {
              const isSubActive = currentPage.startsWith(item.id + '-');
              const Icon = item.icon;
              const isExpanded = item.id === 'lms' ? lmsExpanded : kesiswaanExpanded;
              
              if (isMinimized) {
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      const defaultSub = item.id === 'lms' ? 'lms-jurnal' : 'kesiswaan-poin';
                      onPageChange(defaultSub);
                      if (setMobileSidebarOpen) {
                        setMobileSidebarOpen(false);
                      }
                    }}
                    className={`relative flex items-center px-4 py-3.5 mx-3 rounded-xl cursor-pointer select-none group transition-all duration-200 justify-center
                      ${isSubActive 
                        ? 'bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 shadow-sm border border-teal-100/50 font-bold' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 border border-transparent'
                      }
                    `}
                    id={`menu-${item.id}`}
                    title={item.label}
                  >
                    {isSubActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-teal-500 rounded-r-full" />
                    )}
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isSubActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  </div>
                );
              }

              return (
                <div key={item.id} className="space-y-1">
                  <div
                    onClick={() => {
                      if (item.id === 'lms') setLmsExpanded(!lmsExpanded);
                      else if (item.id === 'kesiswaan') setKesiswaanExpanded(!kesiswaanExpanded);
                    }}
                    className={`relative flex items-center justify-between px-4 py-3.5 mx-4 rounded-xl cursor-pointer select-none group transition-all duration-200
                      ${isSubActive 
                        ? 'bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 shadow-sm border border-teal-100/50 font-bold' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 border border-transparent'
                      }
                    `}
                    id={`menu-${item.id}`}
                    title={item.label}
                  >
                    {isSubActive && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 bg-teal-500 rounded-r-full" />
                    )}
                    <div className="flex items-center">
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isSubActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                      <span className="text-[13px] tracking-tight sidebar-text-container ml-3">{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={`w-4 h-4 transition-colors ${isSubActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    ) : (
                      <ChevronDown className={`w-4 h-4 transition-colors ${isSubActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mx-8 pl-4 border-l border-slate-100 space-y-1">
                      {item.submenus?.map((sub) => {
                        const isCurrentSubActive = currentPage === sub.id;
                        return (
                          <div
                            key={sub.id}
                            onClick={() => {
                              onPageChange(sub.id);
                              if (setMobileSidebarOpen) {
                                setMobileSidebarOpen(false);
                              }
                            }}
                            className={`flex items-center px-3 py-2 rounded-lg cursor-pointer select-none text-[12px] transition-all duration-150
                              ${isCurrentSubActive
                                ? 'bg-teal-50 text-teal-700 font-bold border border-teal-100/50'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                              }
                            `}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-2.5 transition-all
                              ${isCurrentSubActive ? 'bg-teal-500 scale-125 shadow-[0_0_8px_rgba(20,184,166,0.6)]' : 'bg-slate-300'}
                            `} />
                            {sub.label}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  onPageChange(item.id);
                  if (setMobileSidebarOpen) {
                    setMobileSidebarOpen(false);
                  }
                }}
                className={`relative flex items-center px-4 py-3.5 mx-4 rounded-xl cursor-pointer select-none group transition-all duration-200
                  ${isMinimized ? 'md:justify-center md:px-0 md:mx-3' : 'justify-start'}
                  ${isActive 
                    ? 'bg-gradient-to-r from-teal-50/80 to-emerald-50/40 text-teal-700 shadow-sm border border-teal-100/50 font-bold' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/80 border border-transparent'
                  }
                `}
                id={`menu-${item.id}`}
                title={item.label}
              >
                {/* Visual indicator bar on the left of the active link */}
                {isActive && !isMinimized && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-teal-500 rounded-r-full" />
                )}

                <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                
                {!isMinimized && (
                  <span className="text-[13px] tracking-tight sidebar-text-container ml-3">{item.label}</span>
                )}

                {/* Minimized item tooltip (native title handles this, but custom styles make it extra solid) */}
              </div>
            );
          })}
        </nav>

        {/* Footer Admin / System Info Section */}
        <div className="border-t border-slate-200/50 p-4 bg-slate-50">
          {!isMinimized ? (
            <div className="sidebar-text-container">
              {/* Connected Admin Card */}
              <div className="flex items-center space-x-3 bg-white/80 p-3 rounded-2xl border border-slate-200/60 shadow-sm">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-sm shadow-sm uppercase">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-black text-slate-700 truncate leading-none">{userName}</p>
                  <p className="text-[9px] text-slate-400 font-bold leading-none mt-1.5 uppercase tracking-wide">{userRoleLabel}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 px-1">
                <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Sistem Portal</span>
                <span className="text-[9px] text-teal-600 font-black bg-teal-50/80 px-2 py-0.5 rounded-full border border-teal-100">v1.0.5</span>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center" title={`${userName} - ${userRoleLabel}`}>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-black text-sm shadow-sm uppercase">
                {userInitials}
              </div>
              <span className="text-[8px] text-teal-600 font-bold mt-2">v1.0.5</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
