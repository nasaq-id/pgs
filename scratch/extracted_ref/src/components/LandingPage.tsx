import React, { useState } from 'react';
import { 
  Compass, 
  Users, 
  GraduationCap, 
  School, 
  Key, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles, 
  Award, 
  BookMarked,
  Clock,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Student, Teacher, Institution, UserRole } from '../types';

interface LandingPageProps {
  students: Student[];
  teachers: Teacher[];
  institution: Institution;
  onLoginSuccess: (role: UserRole, user: any) => void;
  addToast: (message: string, action?: string, type?: 'success' | 'info' | 'error') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  students,
  teachers,
  institution,
  onLoginSuccess,
  addToast,
}) => {
  // Tabs: 'siswa' | 'guru' | 'admin'
  const [activePortal, setActivePortal] = useState<'siswa' | 'guru' | 'admin'>('siswa');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Handle standard manual login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!username.trim() || !password.trim()) {
      setLoginError('Username dan password wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    // Simulate database lookup network latency
    setTimeout(() => {
      setIsSubmitting(false);

      if (activePortal === 'admin') {
        const u = username.trim().toLowerCase();
        if (u === 'superadmin' && password === 'password123') {
          addToast('Selamat datang, Super Admin!', 'Akses Diterima', 'success');
          onLoginSuccess('super_admin', { nama: 'M. Ilyas S.Kom', username: 'superadmin', id: 'admin-0', email: 'superadmin@atsurmudzi.sch.id' });
        } else if ((u === 'admindemo' || u === 'admin') && password === 'password123') {
          addToast('Selamat datang, Administrator System!', 'Akses Diterima', 'success');
          onLoginSuccess('admin', { nama: 'Fatimah S.Pd', username: 'admin', id: 'admin-1', email: 'admin@atsurmudzi.sch.id' });
        } else if (u === 'kepsek' && password === 'password123') {
          addToast('Selamat datang, Kepala Sekolah!', 'Akses Diterima', 'success');
          onLoginSuccess('kepsek', { nama: 'Dr. KH. Ahmad Fauzi M.Ag', username: 'kepsek', id: 'kepsek-1', email: 'kepsek@atsurmudzi.sch.id' });
        } else if (u === 'wakasek' && password === 'password123') {
          addToast('Selamat datang, Wakil Kepala Sekolah!', 'Akses Diterima', 'success');
          onLoginSuccess('wakasek', { nama: 'Ustadz Syarifudin M.Ag', username: 'wakasek', id: 'wakasek-1', email: 'wakasek@atsurmudzi.sch.id' });
        } else {
          setLoginError('Username atau Password Manajemen salah. Coba: superadmin, admin, kepsek, wakasek.');
        }
      } else if (activePortal === 'guru') {
        // Match teacher credentials
        const foundTeacher = teachers.find(
          t => t.username.toLowerCase() === username.toLowerCase().trim() || 
               t.nipNuptk === username.trim()
        );

        if (foundTeacher) {
          const expectedPassword = foundTeacher.password || 'password123';
          if (password === expectedPassword) {
            addToast(`Selamat datang Guru, ${foundTeacher.nama}!`, 'Akses Diterima', 'success');
            onLoginSuccess('guru', foundTeacher);
          } else {
            setLoginError('Password yang Anda masukkan salah.');
          }
        } else {
          setLoginError('Akun Guru tidak ditemukan. Gunakan username guru demo.');
        }
      } else if (activePortal === 'siswa') {
        // Match student credentials
        const foundStudent = students.find(
          s => s.username.toLowerCase() === username.toLowerCase().trim() || 
               s.nis === username.trim() || 
               s.nisn === username.trim()
        );

        if (foundStudent) {
          const expectedPassword = foundStudent.password || 'password123';
          if (password === expectedPassword) {
            addToast(`Selamat datang Siswa, ${foundStudent.nama}!`, 'Akses Diterima', 'success');
            onLoginSuccess('siswa', foundStudent);
          } else {
            setLoginError('Password yang Anda masukkan salah.');
          }
        } else {
          setLoginError('Akun Siswa tidak ditemukan. Gunakan username siswa demo.');
        }
      }
    }, 450);
  };

  // One-click quick login for demo evaluators
  const handleQuickDemoLogin = (role: UserRole, userVal: string, passVal: string) => {
    if (role === 'siswa') {
      setActivePortal('siswa');
    } else if (role === 'guru') {
      setActivePortal('guru');
    } else {
      setActivePortal('admin');
    }
    setUsername(userVal);
    setPassword(passVal);
    setLoginError('');
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      if (role === 'super_admin') {
        addToast('Login Sukses via Demo Autologin!', 'Demo Super Admin', 'success');
        onLoginSuccess('super_admin', { nama: 'M. Ilyas S.Kom', username: 'superadmin', id: 'admin-0', email: 'superadmin@atsurmudzi.sch.id' });
      } else if (role === 'admin') {
        addToast('Login Sukses via Demo Autologin!', 'Demo Admin', 'success');
        onLoginSuccess('admin', { nama: 'Fatimah S.Pd', username: 'admin', id: 'admin-1', email: 'admin@atsurmudzi.sch.id' });
      } else if (role === 'kepsek') {
        addToast('Login Sukses via Demo Autologin!', 'Demo Kepala Sekolah', 'success');
        onLoginSuccess('kepsek', { nama: 'Dr. KH. Ahmad Fauzi M.Ag', username: 'kepsek', id: 'kepsek-1', email: 'kepsek@atsurmudzi.sch.id' });
      } else if (role === 'wakasek') {
        addToast('Login Sukses via Demo Autologin!', 'Demo Wakil Kepala Sekolah', 'success');
        onLoginSuccess('wakasek', { nama: 'Ustadz Syarifudin M.Ag', username: 'wakasek', id: 'wakasek-1', email: 'wakasek@atsurmudzi.sch.id' });
      } else if (role === 'guru') {
        const found = teachers.find(t => t.username === userVal) || teachers[0];
        addToast(`Login Sukses via Demo Autologin: ${found.nama}!`, 'Demo Guru', 'success');
        onLoginSuccess('guru', found);
      } else if (role === 'siswa') {
        const found = students.find(s => s.username === userVal) || students[1]; // Siti Rahmawati
        addToast(`Login Sukses via Demo Autologin: ${found.nama}!`, 'Demo Siswa', 'success');
        onLoginSuccess('siswa', found);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      
      {/* Top Header / Branding Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-4 px-6 md:px-12 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
            <Compass className="w-5.5 h-5.5 stroke-[2] animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-tight leading-none">
              MTs <span className="text-teal-600">At-Turmudzi</span>
            </h1>
            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-1 block">Madrasah Management System</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-600 border border-teal-100">
            TAHUN AJARAN {institution.academicYear} ({institution.semester})
          </span>
          <span className="text-xs text-slate-400 font-bold">v1.0.5</span>
        </div>
      </nav>

      {/* Main Body Section */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Madrasah Information & Stats */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Gerbang Portal Madrasah</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Satu Sistem Untuk <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                Pendidikan Unggul & Berakhlak
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 max-w-xl font-medium leading-relaxed">
              Selamat datang di portal akademik terpadu Madrasah Tsanawiyah At-Turmudzi. Sistem manajemen modern yang mengintegrasikan administrasi kesiswaan, bimbingan konseling, penilaian LMS, presensi digital, serta keterhubungan dengan wali siswa secara instan.
            </p>
          </div>

          {/* Institutional Stats Bento Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-3">
                <Users size={20} />
              </div>
              <p className="text-2xl font-black text-slate-800">{students.length}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">Siswa Aktif</p>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap size={20} />
              </div>
              <p className="text-2xl font-black text-slate-800">{teachers.length}</p>
              <p className="text-xs text-slate-400 font-bold mt-1">Guru & Tendik</p>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <School size={20} />
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded">TERAKREDITASI</span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-800">Grade {institution.accreditation}</p>
                <p className="text-xs text-slate-400 font-bold mt-1">{institution.curriculum}</p>
              </div>
            </div>
          </div>

          {/* Bullet Highlight Capabilities */}
          <div className="space-y-3 pt-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-black">✔</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">LMS & Jurnal Pembelajaran:</strong> Pencatatan materi, jurnal mengajar guru, dan pengumpulan tugas siswa secara daring.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-black">✔</span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">Sistem Poin Kedisiplinan:</strong> Pencatatan sikap positif (prestasi) dan negatif (pelanggaran) real-time dengan pemberitahuan WhatsApp wali murid.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Login Container */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-[2.5rem] p-8 relative overflow-hidden">
            
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            {/* Portal Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-slate-55 bg-slate-100 p-1.5 rounded-2xl mb-8 relative z-10">
              <button
                type="button"
                onClick={() => {
                  setActivePortal('siswa');
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePortal === 'siswa'
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePortal('guru');
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePortal === 'guru'
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Guru
              </button>
              <button
                type="button"
                onClick={() => {
                  setActivePortal('admin');
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className={`py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activePortal === 'admin'
                    ? 'bg-white text-slate-800 shadow-md'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Admin
              </button>
            </div>

            {/* Login Card Heading */}
            <div className="mb-6 relative z-10 text-left">
              <h3 className="text-xl font-extrabold text-slate-800">
                Masuk Portal {activePortal === 'siswa' ? 'Siswa' : activePortal === 'guru' ? 'Guru' : 'Administrator'}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-1">
                {activePortal === 'siswa' && 'Gunakan NIS / Username dan sandi siswa Anda'}
                {activePortal === 'guru' && 'Masukkan NIP / Username dan password mengajar Anda'}
                {activePortal === 'admin' && 'Akses kontrol utama sistem manajemen madrasah'}
              </p>
            </div>

            {/* Error Message Box */}
            {loginError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl mb-6 flex items-start space-x-2 text-xs font-bold animate-fade-in relative z-10 text-left">
                <ShieldAlert className="w-4.5 h-4.5 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleLogin} className="space-y-5 relative z-10 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  {activePortal === 'siswa' ? 'NIS / Username' : activePortal === 'guru' ? 'NIP / Username' : 'Username'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 text-sm font-bold text-slate-700"
                    placeholder={
                      activePortal === 'siswa' ? 'Masukkan username siswa (e.g. siti_rahma)' :
                      activePortal === 'guru' ? 'Masukkan username guru (e.g. guru1)' : 'Masukkan username (e.g. admindemo)'
                    }
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Kata Sandi
                  </label>
                  {activePortal === 'siswa' && (
                    <span className="text-[10px] text-teal-600 font-bold">Lupa sandi? Hubungi BK</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 text-sm font-bold text-slate-700 pr-11"
                    placeholder="Masukkan sandi akun Anda"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Masuk Ke Sistem</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Accounts Helper Box - Absolute Craftsman Addition! */}
          <div className="bg-slate-100/80 rounded-3xl border border-slate-200/50 p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block leading-none">
                Uji Coba Cepat (Autologin)
              </span>
              <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black">DEMO PORTAL</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              
              {/* Super Admin Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('super_admin', 'superadmin', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-indigo-600 font-black uppercase tracking-wider mb-1 leading-none">Super Admin</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-indigo-700 transition-colors">superadmin</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin', 'admin', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-teal-600 font-black uppercase tracking-wider mb-1 leading-none">Admin Demo</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-teal-700 transition-colors">admin</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

              {/* Kepsek Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('kepsek', 'kepsek', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-amber-600 font-black uppercase tracking-wider mb-1 leading-none">Kepala Sekolah</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-amber-700 transition-colors">kepsek</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

              {/* Wakasek Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('wakasek', 'wakasek', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-rose-600 font-black uppercase tracking-wider mb-1 leading-none">Wakil Kepsek</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-rose-700 transition-colors">wakasek</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

              {/* Guru Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guru', 'guru1', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider mb-1 leading-none">Guru Demo</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-blue-700 transition-colors">guru1</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

              {/* Siswa Button */}
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('siswa', 'siti_rahma', 'password123')}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex flex-col text-left transition-all cursor-pointer shadow-xs group"
              >
                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-wider mb-1 leading-none">Siswa Demo</span>
                <span className="text-[11px] font-extrabold text-slate-700 leading-none group-hover:text-emerald-700 transition-colors">siti_rahma</span>
                <span className="text-[9px] text-slate-400 font-bold mt-1">Sandi: password123</span>
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* Elegant Footer Area */}
      <footer className="border-t border-slate-200/50 bg-white py-6 text-center text-slate-400 text-xs font-semibold">
        <p>© 2026 {institution.name} | {institution.organizer}. All rights reserved.</p>
        <p className="text-[10px] text-slate-400 mt-1">{institution.address}</p>
      </footer>

    </div>
  );
};
