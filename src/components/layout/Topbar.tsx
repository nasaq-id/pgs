"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Bell, Menu, CalendarDays, MessageCircle, ChevronRight, LogOut, User } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { id } from "date-fns/locale"

const pageTitles: Record<string, string> = {
  "/": "Dashboard", "/lembaga": "Lembaga",
  "/manajemen/siswa": "Siswa", "/manajemen/guru": "Guru & Tendik",
  "/manajemen/kelas": "Rombongan Belajar",
  "/akademik": "Akademik",
  "/sarpras": "Sarana & Prasarana",
  "/sarana/ruang-kelas": "Ruang Kelas & Sarana",
  "/lms/e-materi": "e-Materi Pembelajaran",
  "/lms/jurnal": "Jurnal Mengajar",
  "/lms/asesmen": "Asesmen",
  "/evaluasi/buku-nilai": "Buku Nilai",
  "/pengaturan": "Pengaturan",
  "/absensi": "Absensi Harian",
  "/absensi/guru": "Presensi Guru",
  "/absensi/izin": "Pengajuan Izin",
  "/absensi/rekap": "Rekap Presensi",
  "/absensi/pengaturan": "Pengaturan Presensi",
  "/kesiswaan/ekstrakurikuler": "Ekstrakurikuler",
  "/kesiswaan/prestasi": "Prestasi Siswa",
  "/kesiswaan/poin-siswa": "Poin Siswa",
  "/kesiswaan/monitoring-poin": "Monitoring Poin",
  "/kesiswaan/laporan-poin": "Laporan Poin",
}

interface TopbarProps {
  onMenuClick: () => void
  isMinimized?: boolean
  setIsMinimized?: (val: boolean) => void
}

function IosSwitch({ checked, onChange, title }: { checked: boolean; onChange: () => void; title?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "w-9 h-5 rounded-full relative transition-colors duration-300 outline-none cursor-pointer flex-shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]",
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
      )}
      title={title}
    >
      <span
        className={cn(
          "w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-300",
          checked ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  )
}

export default function Topbar({ onMenuClick, isMinimized = false, setIsMinimized }: TopbarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const user = session?.user

  // Fetch the latest profile data from server so that profile picture updates instantly
  const { data: profile } = api.profil.getProfile.useQuery(undefined, {
    enabled: !!session,
  })

  const displayName =
    (profile?.namaLengkap as string) ||
    (profile?.firstName ? `${profile.firstName} ${profile.lastName || ""}`.trim() : null) ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "Admin"
  const initials = (displayName[0] || "A").toUpperCase()
  const rawPageTitle = pageTitles[pathname] ?? "Dashboard"
  const pageTitle = pathname === "/evaluasi/buku-nilai" && (user?.role === "siswa" || user?.role === "ortu")
    ? "Laporan Hasil Belajar"
    : rawPageTitle
  const userPhoto = (profile?.photo as string) || user?.photo

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showAllNotif, setShowAllNotif] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const utils = api.useUtils()

  const { data: monthEvents } = api.kalender.getAll.useQuery({
    bulan: currentMonth.getMonth() + 1,
    tahun: currentMonth.getFullYear(),
  })

  // Fetch active academic year
  const { data: activeTa } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 30000,
  })

  const { data: notifications = [] } = api.notifikasi.getRecent.useQuery(
    { limit: 5 },
    { refetchInterval: 15000 },
  )

  const { data: unreadData } = api.notifikasi.getAll.useQuery(
    { unreadOnly: true, limit: 1 },
    { refetchInterval: 15000 },
  )

  const unreadCount = unreadData?.total ?? 0

  const { data: allNotifData } = api.notifikasi.getAll.useQuery(
    { limit: 50, offset: 0 },
    { enabled: showAllNotif },
  )

  const allNotifications = allNotifData?.data ?? []

  useEffect(() => {
    const fetchWhatsApp = async () => {
      try {
        const data = await utils.client.lembaga.getSekolah.query()
        if (data?.whatsapp) setWhatsappNumber(data.whatsapp)
      } catch (e) {
        console.error("Failed to fetch WhatsApp", e)
      }
    }
    fetchWhatsApp()
  }, [utils])
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        const toggleBtn = document.getElementById("calendar-toggle-btn")
        if (toggleBtn && toggleBtn.contains(event.target as Node)) {
          return
        }
        setShowCalendar(false)
      }
    }
    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("touchstart", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [showCalendar])


  const handleNotificationClick = async (notif: any) => {
    if (!notif.dibaca) {
      try {
        await utils.client.notifikasi.markAsRead.mutate({ id: notif.id })
        utils.notifikasi.getRecent.invalidate()
        utils.notifikasi.getAll.invalidate()
      } catch (e) {
        console.error("Failed to mark as read", e)
      }
    }
    if (notif.link) {
      window.location.href = notif.link // eslint-disable-line react-hooks/immutability
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await utils.client.notifikasi.markAllAsRead.mutate()
      utils.notifikasi.getRecent.invalidate()
      utils.notifikasi.getAll.invalidate()
    } catch (e) {
      console.error("Failed to mark all as read", e)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await utils.client.notifikasi.markAsRead.mutate({ id })
      utils.notifikasi.getRecent.invalidate()
      utils.notifikasi.getAll.invalidate()
    } catch (e) {
      console.error("Failed to mark as read", e)
    }
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const getEventsForDate = (date: Date) => {
    if (!monthEvents) return []
    const dateStr = format(date, "yyyy-MM-dd")
    return monthEvents.filter((ev: any) => {
      const startStr = format(new Date(ev.tanggalMulai), "yyyy-MM-dd")
      const endStr = ev.tanggalSelesai
        ? format(new Date(ev.tanggalSelesai), "yyyy-MM-dd")
        : startStr
      return dateStr >= startStr && dateStr <= endStr
    })
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const formatDate = (date: Date) => format(date, "d MMMM yyyy", { locale: id })

  return (
    <div className="sticky top-0 z-40 glass-strong h-16 flex items-center gap-4 px-5 rounded-b-2xl border-x border-b border-slate-200/40 dark:border-slate-800/30 mx-2 mt-2 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
      <Tooltip>
        <TooltipTrigger
          onClick={onMenuClick}
          className="lg:hidden flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner>
            <TooltipPopup>Menu</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>

      <div className="hidden lg:flex items-center gap-3.5 flex-shrink-0">
        <h1 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
          {pageTitle}
        </h1>
        {user?.role !== "super_admin" && activeTa && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-teal-500/[0.04] to-emerald-500/[0.04] dark:from-teal-500/[0.02] dark:to-emerald-500/[0.02] border border-teal-500/15 rounded-full text-[10px] font-bold text-teal-650 dark:text-teal-400 shadow-sm transition-all hover:border-teal-500/30 select-none">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500"></span>
            </span>
            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold tracking-wide uppercase">TA:</span>
            <span className="text-slate-800 dark:text-slate-200 font-extrabold">{activeTa.namaTahunAjaran}</span>
            <span className="h-2.5 w-px bg-teal-500/20" />
            <span className="text-[8px] font-black uppercase px-1.5 py-0.5 bg-teal-500/10 text-teal-650 dark:text-teal-400 rounded-full tracking-wider leading-none">
              {activeTa.semester}
            </span>
          </div>
        )}
      </div>
      <p className="lg:hidden text-base font-bold text-slate-850 dark:text-slate-200 flex-grow md:flex-grow-0">{pageTitle}</p>

      <div className="flex-grow" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger 
            id="calendar-toggle-btn"
            className="clickable hidden lg:flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 px-3 py-1.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 backdrop-blur-sm border border-teal-200/50 dark:border-teal-900/40 hover:bg-teal-100/50 dark:hover:bg-teal-900/30 transition-all shadow-sm"
            onClick={() => setShowCalendar(!showCalendar)}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipPositioner>
              <TooltipPopup>Kalender</TooltipPopup>
            </TooltipPositioner>
          </TooltipPortal>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              delay={0}
              render={
                <DropdownMenuTrigger className="relative w-10 h-10 flex items-center justify-center neumo-sm bg-background rounded-xl text-amber-500 hover:text-amber-600 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all cursor-pointer outline-none" />
              }
            >
              <span className="flex items-center justify-center"><Bell className="h-4.5 w-4.5 stroke-[2.2] text-amber-500" /></span>
              {unreadCount > 0 && (
                <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-background" />
              )}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>Notifikasi</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl border bg-card shadow-lg">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-bold text-sm">Notifikasi</h4>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleMarkAllRead}
                className="text-xs h-6 px-2 text-teal-600 hover:text-teal-700 font-bold uppercase tracking-wider"
              >
                Tandai semua dibaca
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto py-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Tidak ada notifikasi</div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "flex items-start gap-3 p-3 mx-2 my-1.5 rounded-xl cursor-pointer transition-all border text-left outline-none",
                      notif.dibaca
                        ? "bg-slate-50/50 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/40 text-muted-foreground"
                        : "bg-teal-50/30 dark:bg-teal-950/20 border-teal-100/50 dark:border-teal-900/40 text-foreground font-medium"
                    )}
                    inset={false}
                  >
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0",
                      notif.dibaca ? "bg-muted-foreground/30" : "bg-teal-500 animate-pulse"
                    )} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-bold leading-tight truncate">{notif.judul}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{notif.pesan}</p>
                      <span className="text-[9px] text-muted-foreground mt-1.5 block">
                        {format(new Date(notif.createdAt), "d MMM HH:mm", { locale: id })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-center text-teal-600 hover:text-teal-700 font-bold hover:bg-teal-50/30 dark:hover:bg-teal-950/20 py-2.5 cursor-pointer uppercase tracking-wider text-[10px]"
              inset={false}
              onClick={() => { window.location.href = "/notifikasi" }}
            >
              Lihat semua notifikasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {whatsappNumber && (
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={`https://wa.me/62${whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center bg-card dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-emerald-500 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all shadow-sm cursor-pointer"
                />
              }
            >
              <MessageCircle className="h-4.5 w-4.5 stroke-[2.2]" />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>Hubungi Admin via WhatsApp</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
        )}

        {setIsMinimized && (
          <div className="hidden lg:flex items-center gap-2 mr-1">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expand Menu</span>
            <IosSwitch
              checked={!isMinimized}
              onChange={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Tampilkan Menu" : "Sembunyikan Menu"}
            />
          </div>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger id="profile-dropdown-tour" className="flex items-center space-x-2 md:space-x-3 neumo-sm bg-background p-1.5 md:pr-4 rounded-xl cursor-pointer hover:border-teal-200 dark:hover:border-teal-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all text-left outline-none" />
              }
            >
              {userPhoto ? (
                <div className="w-7.5 h-7.5 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-7.5 h-7.5 bg-teal-100 dark:bg-teal-950/60 rounded-lg flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-xs shadow-sm border border-slate-100 dark:border-slate-800 uppercase flex-shrink-0">
                  <span>{initials}</span>
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[12px] font-bold text-foreground leading-tight truncate max-w-[100px]">{displayName}</span>
                <span className="text-[9px] text-muted-foreground font-bold leading-tight capitalize">{user?.role?.replace("_", " ")}</span>
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>{displayName}</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-60 p-2.5 rounded-2xl bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border border-white/40 dark:border-slate-800/40 neumo-card shadow-xl z-50 text-left">
            <div className="px-3 py-2.5 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] mb-2.5 text-left">
              <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate">{displayName}</p>
              <p className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/10 mt-1.5">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
            
            <DropdownMenuItem
              className="focus:bg-[oklch(0.94_0.01_250)] dark:focus:bg-[oklch(0.14_0.01_250)] focus:neumo-inset rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer font-bold text-xs transition-all text-slate-700 dark:text-slate-355 outline-none"
              onClick={() => window.location.href = "/profil"}
            >
              <User className="h-4 w-4 text-slate-400" />
              <span>Profil Saya</span>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="my-1.5 bg-slate-200/50 dark:bg-slate-800/50" />
            
            <DropdownMenuItem
              className="text-red-650 hover:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20 focus:neumo-inset rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer font-bold text-xs transition-all outline-none"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="h-4 w-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full right-0 mt-2 z-50 bg-card/95 backdrop-blur-xl border rounded-xl p-4 shadow-lg w-[calc(100vw-2.5rem)] sm:w-80 max-w-sm animate-fade-in"
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors cursor-pointer">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <h4 className="font-semibold text-sm capitalize">{format(currentMonth, "MMMM yyyy", { locale: id })}</h4>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-2">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d, i) => (
              <div key={d} className={`font-medium py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {daysInMonth.map((day) => {
              const today = isToday(day)
              const dayEvents = getEventsForDate(day)
              const selected = selectedDate && isSameDay(day, selectedDate)
              const dayOfWeek = day.getDay()
              const hasEvent = dayEvents.length > 0
              const isLibur = dayEvents.some((ev: any) => ev.tipe === "libur" || ev.isLiburNasional)
              const eventTooltip = dayEvents.map((ev: any) => ev.judul).join(", ")
              const eventColors: string[] = []
              dayEvents.forEach((ev: any) => {
                const c = ev.warna || (ev.isLiburNasional || ev.tipe === "libur" ? "#ef4444" : ev.tipe === "kegiatan" ? "#3b82f6" : "#22c55e")
                if (!eventColors.includes(c)) eventColors.push(c)
              })
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  title={hasEvent ? eventTooltip : undefined}
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selected
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-sm shadow-teal-500/20"
                      : today
                      ? isLibur || dayOfWeek === 0
                        ? "neumo-sm bg-[oklch(0.97_0.015_250)] dark:bg-[oklch(0.17_0.01_250)] text-red-600 font-black"
                        : "neumo-sm bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black"
                      : hasEvent && !isLibur
                      ? "neumo-sm bg-amber-50 dark:bg-amber-950/20 text-amber-600 font-bold"
                      : isLibur || dayOfWeek === 0
                      ? "neumo-sm bg-red-50/50 dark:bg-red-950/10 text-red-500"
                      : dayOfWeek === 6
                      ? "neumo-sm bg-blue-50/50 dark:bg-blue-950/10 text-blue-500"
                      : "neumo-sm bg-[oklch(0.97_0.015_250)] dark:bg-[oklch(0.17_0.01_250)] text-foreground/80"
                  } ${hasEvent ? "relative" : ""}`}
                >
                  {format(day, "d")}
                  {hasEvent && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {eventColors.map((c, i) => (
                        <span key={i} className="h-1 w-1 rounded-full" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {selectedDate && selectedDateEvents.length > 0 && (
            <div className="mt-4 pt-3 border-t space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Acara pada {formatDate(selectedDate)}:</p>
              {selectedDateEvents.map((ev: any) => (
                <div key={ev.id} className="text-xs p-2 rounded bg-muted flex items-start gap-2">
                  <span className="h-3 w-3 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: ev.warna || (ev.isLiburNasional || ev.tipe === "libur" ? "#ef4444" : ev.tipe === "kegiatan" ? "#3b82f6" : "#22c55e") }} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{ev.judul}</p>
                    {ev.deskripsi && <p className="text-muted-foreground truncate">{ev.deskripsi}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 z-[110] shadow-xl">
          <DialogHeader className="text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 flex items-center justify-center text-red-500 mx-auto">
              <LogOut className="w-6 h-6 stroke-[2.5]" />
            </div>
            <DialogTitle className="text-base font-black text-slate-800 dark:text-slate-100">Konfirmasi Keluar</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold">
              Apakah Anda yakin ingin keluar dari sistem presensi dan manajemen PGS ini?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3.5 mt-6">
            <button
              onClick={() => setLogoutDialogOpen(false)}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs transition-all active:scale-95 cursor-pointer text-center border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Batal
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-all active:scale-95 cursor-pointer text-center shadow-sm"
            >
              Keluar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}