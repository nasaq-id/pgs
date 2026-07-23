"use client"

import { useState, useRef, useEffect } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Compass, Eye, EyeOff, ShieldAlert, Sparkles, Users, GraduationCap,
  School, ArrowRight, BookMarked, Award, CheckCircle2, BookOpen, Shield,
} from "lucide-react"
import { toast } from "sonner"
import {
  Tooltip, TooltipTrigger, TooltipPortal, TooltipPositioner,
  TooltipPopup, TooltipProvider,
} from "@/components/ui/tooltip"
import { api } from "@/lib/trpc/client"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeRole, setActiveRole] = useState<"siswa" | "guru" | "admin">("siswa")
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Persiapan untuk Custom Domain di masa depan:
  // const [hostname, setHostname] = useState("")
  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     setHostname(window.location.hostname)
  //   }
  // }, [])
  // const { data: publicSekolah } = api.lembaga.getPublicSekolahByDomain.useQuery(
  //   { domain: hostname },
  //   { enabled: hostname !== "" }
  // )

  type RoleKey = "siswa" | "guru" | "admin"

  const ROLE_CONFIG: Record<RoleKey, { emailLabel: string; emailPlaceholder: string }> = {
    siswa: {
      emailLabel: "NISN / NIS Lokal / Username Siswa",
      emailPlaceholder: "Masukkan NISN, NIS lokal, atau username",
    },
    guru: {
      emailLabel: "NIP / NUPTK / Username Guru",
      emailPlaceholder: "Masukkan NIP, NUPTK, atau username",
    },
    admin: {
      emailLabel: "Email / Username Admin",
      emailPlaceholder: "Masukkan email atau username admin",
    },
  }

  const ROLE_TABS: { key: RoleKey; label: string; icon: React.ElementType }[] = [
    { key: "siswa", label: "Siswa", icon: GraduationCap },
    { key: "guru", label: "Guru", icon: BookOpen },
    { key: "admin", label: "Admin", icon: Shield },
  ]

  const DEMO_CREDENTIALS = [
    { label: "Siswa Demo", role: "siswa" as const, email: "123455", password: "daus123" },
    { label: "Guru Demo", role: "guru" as const, email: "mohtb", password: "mohtb123" },
    { label: "Admin Cikalongwetan", role: "admin" as const, email: "admin.smpn2cikalongwetan@demo.com", password: "cikalongwetan123" },
    { label: "Admin Muhammadiyah 1", role: "admin" as const, email: "admin.smam1bdg@demo.com", password: "muhammadiyah123" },
  ]

  function handleRoleChange(role: RoleKey) {
    setActiveRole(role)
    setError("")
    setShowPassword(false)
    if (emailRef.current) emailRef.current.value = ""
    if (passwordRef.current) passwordRef.current.value = ""
  }

  function handleDemoLogin(creds: typeof DEMO_CREDENTIALS[number]) {
    setActiveRole(creds.role)
    setError("")
    setShowPassword(false)
    if (emailRef.current) emailRef.current.value = creds.email
    if (passwordRef.current) passwordRef.current.value = creds.password
    formRef.current?.requestSubmit()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const emailVal = form.get("email")

    try {
      const res = await signIn("credentials", {
        email: emailVal,
        password: form.get("password"),
        redirect: false,
      })

      if (res?.error) {
        toast.error("Login Gagal: Email, NISN, atau password salah.")
        setError("Email atau password salah")
        setLoading(false)
      } else {
        toast.success("Login Berhasil! Selamat datang.")
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      toast.error("Terjadi kesalahan sistem saat mencoba masuk.")
      setError("Terjadi kesalahan sistem")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      <title>Masuk Sistem | Portal Garda Sekolah</title>
      {/* ── Brand Nav ── */}
      <nav className="glass py-4 px-6 md:px-12 flex items-center justify-between sticky top-2 z-50 mx-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
            <img src="/pgs-icon.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none">
              Portal Garda Sekolah
            </h1>
            <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5 block">
              Sistem Informasi Manajemen
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-bold">v1.0.0</span>
      </nav>

      {/* ── Main Body ── */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
        {/* ── Left Column: Hero + Stats + Features ── */}
        <div className="lg:col-span-7 space-y-8">
          {/* Hero */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Portal Sekolah</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Satu Sistem Untuk{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-500">
                Pendidikan Unggul & Berakhlak
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-500 max-w-xl font-medium leading-relaxed">
              Sistem manajemen sekolah modern yang mengintegrasikan administrasi, akademik, LMS, 
              keuangan, presensi digital, dan kesiswaan dalam satu platform terpadu.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="neumo-card bg-background p-5 rounded-2xl hover:scale-[1.02] transition-all duration-300">
              <div className="w-10 h-10 neumo-inset bg-[oklch(0.94_0.01_250)] text-teal-600 rounded-xl flex items-center justify-center mb-3">
                <Users size={20} />
              </div>
              <p className="text-2xl font-black text-foreground">—</p>
              <p className="text-xs text-muted-foreground font-bold mt-1">Siswa Terdaftar</p>
            </div>
            <div className="neumo-card bg-background p-5 rounded-2xl hover:scale-[1.02] transition-all duration-300">
              <div className="w-10 h-10 neumo-inset bg-[oklch(0.94_0.01_250)] text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <GraduationCap size={20} />
              </div>
              <p className="text-2xl font-black text-foreground">—</p>
              <p className="text-xs text-muted-foreground font-bold mt-1">Guru & Tendik</p>
            </div>
            <div className="col-span-2 sm:col-span-1 neumo-card bg-background p-5 rounded-2xl hover:scale-[1.02] transition-all duration-300 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 neumo-inset bg-[oklch(0.94_0.01_250)] text-amber-600 rounded-xl flex items-center justify-center">
                  <School size={20} />
                </div>
                <span className="bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[10px] font-black px-2 py-0.5 rounded">TERAKREDITASI</span>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-foreground">A</p>
                <p className="text-xs text-muted-foreground font-bold mt-1">Akreditasi</p>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle2 size={12} />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">LMS & Jurnal Pembelajaran:</strong> Pencatatan materi, jurnal mengajar guru, dan pengumpulan tugas siswa.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle2 size={12} />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">Manajemen Keuangan:</strong> Tagihan SPP otomatis, pencatatan pembayaran, dan laporan keuangan real-time.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle2 size={12} />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">Sistem Poin & Prestasi:</strong> Pencatatan sikap positif dan pelanggaran dengan notifikasi otomatis.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Column: Login Card ── */}
        <div className="lg:col-span-5 space-y-6">
          <div className="neumo-card bg-background rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

            {/* Header */}
            <div className="text-left mb-6 relative z-10">
              <div className="inline-flex items-center gap-1.5 text-teal-600 bg-teal-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
                <Sparkles size={12} />
                <span>Portal Masuk</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
                Masuk Ke Sistem
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Masukkan akun Anda untuk melanjutkan
              </p>
            </div>

            {/* Role Switcher */}
            <div className="flex p-1 neumo-inset bg-[oklch(0.94_0.01_250)] rounded-xl mb-6 relative z-10">
              {ROLE_TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleRoleChange(key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeRole === key
                      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={14} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl mb-6 flex items-start gap-2 text-xs font-bold relative z-10 text-left">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 relative z-10 text-left">
              <div>
                <label htmlFor="email" className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                  {ROLE_CONFIG[activeRole].emailLabel}
                </label>
                <div className="relative">
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="text"
                    required
                    className="w-full px-4 py-3.5 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] border-0 focus:outline-none focus:ring-2 focus:ring-teal-500/15 text-sm font-bold text-foreground placeholder-slate-400"
                    placeholder={ROLE_CONFIG[activeRole].emailPlaceholder}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    Kata Sandi
                  </label>
                </div>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full px-4 py-3.5 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] border-0 focus:outline-none focus:ring-2 focus:ring-teal-500/15 text-sm font-bold text-foreground pr-11 placeholder-slate-400"
                    placeholder="Masukkan sandi akun Anda"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="text-xs text-slate-300 cursor-not-allowed select-none">
                        Lupa sandi?
                      </TooltipTrigger>
                      <TooltipPortal>
                        <TooltipPositioner side="top" sideOffset={4}>
                          <TooltipPopup>Hubungi admin sekolah untuk mereset sandi.</TooltipPopup>
                        </TooltipPositioner>
                      </TooltipPortal>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-teal-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk Ke Sistem</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Login Section (Outside Login Card) */}
          <div className="neumo-card bg-background rounded-3xl p-6 relative z-10 space-y-4">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest text-center">
              Akses Cepat Demo
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((creds, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleDemoLogin(creds)}
                  className="text-[11px] px-3 py-2 rounded-xl neumo-sm bg-background hover:scale-[1.02] active:scale-[0.98] text-muted-foreground hover:text-teal-750 font-bold transition-all cursor-pointer text-center leading-tight min-h-[50px] flex flex-col justify-center items-center"
                >
                  <span className="block font-black">{creds.label}</span>
                  <span className="block text-[9px] text-muted-foreground/60 font-mono mt-0.5">{creds.email}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Info */}
          <div className="neumo-card bg-background rounded-3xl p-5 text-center">
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
              Butuh bantuan? Hubungi administrator sekolah
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/50 bg-white py-6 text-center text-slate-400 text-xs font-semibold">
        <p>&copy; {new Date().getFullYear()} Sistem Manajemen Lembaga. Sistem Informasi Manajemen Sekolah.</p>
      </footer>
    </div>
  )
}