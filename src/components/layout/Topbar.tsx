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
  "/sarana": "Sarana & Prasarana",
  "/lms/jurnal": "Jurnal Mengajar",
  "/evaluasi/buku-nilai": "Buku Nilai",
  "/pengaturan": "Pengaturan",
  "/absensi": "Absensi Harian",
  "/absensi/izin": "Pengajuan Izin",
}

interface TopbarProps { onMenuClick: () => void }

export default function Topbar({ onMenuClick }: TopbarProps) {
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
    <div className="sticky top-0 z-40 glass h-16 flex items-center gap-4 px-5 rounded-b-[26px] mx-2 mt-2">
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

      <div className="hidden lg:block flex-shrink-0">
        <p className="text-[15px] font-bold text-foreground leading-none">Hi, {displayName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{pageTitle}</p>
      </div>
      <p className="lg:hidden text-base font-bold text-foreground flex-1">{pageTitle}</p>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger className="clickable hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-blue-600 px-3 py-1.5 rounded-xl bg-card/80 backdrop-blur-sm border hover:bg-card transition-colors" onClick={() => setShowCalendar(!showCalendar)}>
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
                <DropdownMenuTrigger className="relative rounded-xl h-9 w-9 flex items-center justify-center text-orange-500 hover:text-orange-600 hover:bg-foreground/[0.06] transition-all duration-200 cursor-pointer" />
              }
            >
              <span className="flex items-center justify-center"><Bell className="h-4 w-4" /></span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-background" />
              )}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>Notifikasi</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-semibold">Notifikasi</h4>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleMarkAllRead}
                className="text-xs h-6 px-2"
              >
                Tandai semua dibaca
              </Button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Tidak ada notifikasi</div>
              ) : (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3 cursor-pointer ${!notif.dibaca ? "bg-primary/5" : ""} hover:bg-muted/50`}
                    inset={false}
                  >
                    <div className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${notif.dibaca ? "bg-muted-foreground/30" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.dibaca ? "font-semibold" : "font-normal"}`}>{notif.judul}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.pesan}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(notif.createdAt), "d MMM HH:mm", { locale: id })}</p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-center text-primary hover:bg-primary/10 px-3 py-2 cursor-pointer"
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
                  className="rounded-xl h-9 w-9 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-foreground/[0.06] transition-all duration-200"
                />
              }
            >
              <MessageCircle className="h-4 w-4" />
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>Hubungi Admin via WhatsApp</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
        )}

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-600/20 ml-1 cursor-pointer overflow-hidden outline-none border-0" />
              }
            >
              {userPhoto ? (
                <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-white">{initials}</span>
              )}
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipPositioner>
                <TooltipPopup>{displayName}</TooltipPopup>
              </TooltipPositioner>
            </TooltipPortal>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border bg-card shadow-lg">
            <div className="px-2 py-1.5 border-b mb-1">
              <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded bg-primary/10 text-primary mt-1">
                {user?.role?.replace("_", " ")}
              </span>
            </div>
            <DropdownMenuItem
              className="hover:bg-primary/10 rounded-xl px-2 py-2 flex items-center gap-2 cursor-pointer font-semibold"
              onClick={() => window.location.href = "/profil"}
            >
              <User className="h-4 w-4" />
              Profil
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl px-2 py-2 flex items-center gap-2 cursor-pointer font-semibold"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full right-0 mt-2 z-50 bg-card/95 backdrop-blur-xl border rounded-xl p-4 shadow-lg w-80 animate-fade-in"
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
                  className={`h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selected
                      ? "bg-primary text-white"
                      : today
                      ? isLibur || dayOfWeek === 0
                        ? "bg-red-50 dark:bg-red-950/20 text-red-600 font-bold"
                        : "bg-primary/10 text-primary font-bold"
                      : hasEvent && !isLibur
                      ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                      : isLibur || dayOfWeek === 0
                      ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                      : dayOfWeek === 6
                      ? "text-blue-500 hover:bg-muted"
                      : "hover:bg-muted"
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


    </div>
  )
}