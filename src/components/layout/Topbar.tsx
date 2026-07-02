"use client"

import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Bell, Menu, CalendarDays, MessageCircle, User, ChevronRight, BellOff } from "lucide-react"
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
import { id } from "date-fns/locale"

const pageTitles: Record<string, string> = {
  "/": "Dashboard", "/lembaga": "Lembaga",
  "/manajemen/siswa": "Siswa", "/manajemen/guru": "Guru & Tendik",
  "/manajemen/kelas": "Rombongan Belajar",
  "/akademik": "Akademik",
  "/sarana": "Sarana & Prasarana",
  "/lms/jurnal": "Jurnal Mengajar", "/lms/tugas": "Tugas",
  "/evaluasi/buku-nilai": "Buku Nilai",
  "/pengaturan": "Pengaturan",
}

interface TopbarProps { onMenuClick: () => void }

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const user = session?.user

  const displayName = (user?.name) || user?.email?.split("@")[0] || "Admin"
  const initials = (user?.name?.[0] || user?.email?.[0] || "A").toUpperCase()
  const pageTitle = pageTitles[pathname] ?? "Dashboard"
  const userPhoto = user?.photo

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDateEvents, setSelectedDateEvents] = useState<any[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const utils = api.useUtils()

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const data = await utils.client.notifikasi.getRecent.query({ limit: 5 })
        setNotifications(data)
      } catch (e) {
        console.error("Failed to fetch notifications", e)
      }
    }
    const fetchUnreadCount = async () => {
      try {
        const data = await utils.client.notifikasi.getAll.query({ unreadOnly: true, limit: 1 })
        setUnreadCount(data.total)
      } catch (e) {
        console.error("Failed to fetch unread count", e)
      }
    }
    fetchNotifications()
    fetchUnreadCount()
  }, [utils])

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
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, dibaca: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      } catch (e) {
        console.error("Failed to mark as read", e)
      }
    }
    if (notif.link) {
      window.location.href = notif.link
    }
    setShowNotifications(false)
  }

  const handleMarkAllRead = async () => {
    try {
      await utils.client.notifikasi.markAllAsRead.mutate()
      setNotifications(prev => prev.map(n => ({ ...n, dibaca: true })))
      setUnreadCount(0)
    } catch (e) {
      console.error("Failed to mark all as read", e)
    }
    setShowNotifications(false)
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const getEventsForDate = (date: Date) => {
    // Placeholder - would filter events from API
    return []
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setSelectedDateEvents(getEventsForDate(date))
  }

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  const formatDate = (date: Date) => format(date, "d MMMM yyyy", { locale: id })

  return (
    <div className="sticky top-0 z-40 glass h-16 flex items-center gap-4 px-5 rounded-b-[26px] mx-2 mt-2">
      <button
        onClick={onMenuClick}
        className="lg:hidden flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block flex-shrink-0">
        <p className="text-[15px] font-bold text-foreground leading-none">Hi, {displayName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{pageTitle}</p>
      </div>
      <p className="lg:hidden text-base font-bold text-foreground flex-1">{pageTitle}</p>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground px-3 py-1.5 rounded-xl glass-badge cursor-pointer" onClick={() => setShowCalendar(!showCalendar)}>
          <CalendarDays className="h-3.5 w-3.5" />
          {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-xl h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-all duration-200">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 ring-2 ring-background" />
              )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="p-3 border-b flex items-center justify-between">
              <h4 className="font-semibold">Notifikasi</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-xs h-6 px-2">
                  Tandai semua dibaca
                </Button>
              )}
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
            <DropdownMenuItem className="text-center text-primary hover:bg-primary/10 px-3 py-2" inset={false}>
              Lihat semua notifikasi
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {whatsappNumber && (
          <a
            href={`https://wa.me/62${whatsappNumber.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl h-9 w-9 flex items-center justify-center text-white hover:bg-green-700 transition-colors bg-green-600"
            title="Hubungi Admin via WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}

        <div
          className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm shadow-blue-600/20 ml-1 cursor-pointer"
          onClick={() => {}}
        >
          {userPhoto ? (
            <img src={userPhoto} alt={displayName} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="text-sm font-bold text-white">{initials}</span>
          )}
        </div>
      </div>

      {showCalendar && (
        <div
          ref={calendarRef}
          className="absolute top-full right-0 mt-2 z-50 glass-card rounded-xl p-4 shadow-lg w-80 animate-fade-in"
        >
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </button>
            <h4 className="font-semibold text-sm capitalize">{format(currentMonth, "MMMM yyyy", { locale: id })}</h4>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-xs mb-2">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
              <div key={d} className="text-muted-foreground font-medium py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}
            {daysInMonth.map((day) => {
              const today = isToday(day)
              const hasEvent = getEventsForDate(day).length > 0
              const selected = selectedDate && isSameDay(day, selectedDate)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={`h-8 rounded-lg text-xs font-medium transition-all ${
                    selected
                      ? "bg-primary text-white"
                      : today
                      ? "bg-primary/10 text-primary font-bold"
                      : "hover:bg-muted"
                  } ${hasEvent ? "relative" : ""}`}
                >
                  {format(day, "d")}
                  {hasEvent && (
                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${today ? "bg-primary" : "bg-orange-500"}`} />
                  )}
                </button>
              )
            })}
          </div>
          {selectedDate && selectedDateEvents.length > 0 && (
            <div className="mt-4 pt-3 border-t space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Acara pada {formatDate(selectedDate)}:</p>
              {selectedDateEvents.map((ev: any) => (
                <div key={ev.id} className="text-xs p-2 rounded bg-muted">
                  <p className="font-medium">{ev.judul}</p>
                  <p className="text-muted-foreground truncate">{ev.deskripsi}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}