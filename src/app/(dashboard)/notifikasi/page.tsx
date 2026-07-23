"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Plus,
  Check,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function NotifikasiPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === "super_admin" || role === "admin_sekolah"

  const [activeTab, setActiveTab] = useState<"semua" | "unread">("semua")
  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [newType, setNewType] = useState<"info" | "success" | "warning" | "error">("info")
  const [newLink, setNewLink] = useState("")
  const [creating, setCreating] = useState(false)

  const utils = api.useUtils()

  // Queries
  const { data: result, isLoading } = api.notifikasi.getAll.useQuery({
    unreadOnly: activeTab === "unread",
    limit: 100,
  })

  const notifications = result?.data || []

  // Mutations
  const markAsReadMutation = api.notifikasi.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
  })

  const markAllAsReadMutation = api.notifikasi.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("Semua notifikasi ditandai dibaca")
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
  })

  const createMutation = api.notifikasi.create.useMutation({
    onSuccess: () => {
      toast.success("Notifikasi berhasil dikirim!")
      setCreateOpen(false)
      setNewTitle("")
      setNewMessage("")
      setNewType("info")
      setNewLink("")
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal membuat notifikasi")
    },
  })

  const deleteMutation = api.notifikasi.remove.useMutation({
    onSuccess: () => {
      toast.success("Notifikasi berhasil dihapus")
      utils.notifikasi.getAll.invalidate()
      utils.notifikasi.getUnreadCount.invalidate()
    },
  })

  const handleNotificationClick = async (notif: any) => {
    if (!notif.dibaca) {
      await markAsReadMutation.mutateAsync({ id: notif.id })
    }
    if (notif.link) {
      router.push(notif.link)
    }
  }

  const handleCreateNotif = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newMessage.trim()) {
      toast.error("Judul dan pesan tidak boleh kosong")
      return
    }
    setCreating(true)
    try {
      await createMutation.mutateAsync({
        judul: newTitle,
        pesan: newMessage,
        tipe: newType,
        link: newLink || undefined,
      })
    } finally {
      setCreating(false)
    }
  }

  const getIcon = (tipe: string) => {
    switch (tipe) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-rose-500 dark:text-rose-400" />
      default:
        return <Info className="h-5 w-5 text-sky-500 dark:text-sky-400" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Meta tags / SEO */}
      <title>Notifikasi & Pemberitahuan - EduManage</title>
      <meta name="description" content="Halaman informasi dan pengumuman untuk guru, siswa, dan staf sekolah." />
      
      <div className="bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 -mt-6 sm:-mt-8 min-h-[calc(100vh-4rem)] transition-colors duration-300">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="text-left">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Notifikasi & Pemberitahuan</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lihat semua pengumuman dan aktivitas sistem terbaru untuk Anda.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {notifications.some((n) => !n.dibaca) && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 h-10 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-900/50 text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 cursor-pointer shadow-xs"
                >
                  <Check className="h-4 w-4 mr-1.5 shrink-0" />
                  Tandai Semua Dibaca
                </Button>
              </motion.div>
            )}
            {isAdmin && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateOpen(true)}
                  className="neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 h-10 rounded-xl font-black text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5 shrink-0" />
                  Kirim Notifikasi
                </Button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Tab Filter */}
        <div className="flex gap-2 p-1.5 neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] rounded-2xl w-fit mb-8 select-none">
          <button
            onClick={() => setActiveTab("semua")}
            className={`relative px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === "semua"
                ? "text-teal-600 dark:text-teal-450 z-10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "semua" && (
              <motion.div
                layoutId="activeNotifTabIndicator"
                className="absolute inset-0 neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-xl"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-20">Semua</span>
          </button>
          
          <button
            onClick={() => setActiveTab("unread")}
            className={`relative px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
              activeTab === "unread"
                ? "text-teal-600 dark:text-teal-450 z-10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === "unread" && (
              <motion.div
                layoutId="activeNotifTabIndicator"
                className="absolute inset-0 neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-xl"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-20">Belum Dibaca</span>
          </button>
        </div>

        {/* Main List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <Bell className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-700 dark:text-slate-200">Tidak ada notifikasi</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-sm">
                {activeTab === "unread"
                  ? "Hebat! Semua pemberitahuan sudah Anda baca."
                  : "Belum ada notifikasi baru untuk saat ini."}
              </p>
            </div>
          </div>
        ) : (
          /* Increased gap to space-y-6 to prevent shadows overlapping (Neomorphic Spacing) */
          <div className="space-y-6 text-left">
            <AnimatePresence mode="popLayout">
              {notifications.map((notif, index) => {
                const isUnread = !notif.dibaca
                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: Math.min(0.15, index * 0.03) }}
                    whileHover={{ y: -3, scale: 1.002 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`neumo-card bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] rounded-2xl p-5 flex items-start gap-4 transition-all relative group border-l-4 ${
                      isUnread ? "border-l-teal-500/80" : "border-l-transparent"
                    } ${notif.link ? "cursor-pointer" : ""}`}
                  >
                    {/* Recessed Inset Container for Neomorphic 3D Icon Look */}
                    <div className="w-10 h-10 rounded-xl neumo-inset bg-[oklch(0.94_0.01_250)] dark:bg-[oklch(0.14_0.01_250)] flex items-center justify-center shrink-0">
                      {getIcon(notif.tipe)}
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2.5">
                        <h3 className={`text-sm tracking-tight ${isUnread ? "font-extrabold text-slate-800 dark:text-slate-100" : "font-semibold text-slate-600 dark:text-slate-350"}`}>
                          {notif.judul}
                        </h3>
                        {isUnread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed break-words font-medium">
                        {notif.pesan}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-3.5 font-bold uppercase tracking-wider">
                        {format(new Date(notif.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                      </p>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteMutation.mutate({ id: notif.id })
                        }}
                        className="absolute right-4 top-4 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Hapus pemberitahuan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Dialog Pembuatan Notifikasi (Admins Only) */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md rounded-[28px] p-6 border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-2xl">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Kirim Notifikasi</DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                Kirim pengumuman atau peringatan ke seluruh pengguna lembaga sekolah.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNotif} className="space-y-4 py-2">
              <div className="space-y-1.5 text-left">
                <Label htmlFor="judul" className="text-xs font-black uppercase text-slate-400 tracking-wider">Judul Notifikasi</Label>
                <Input
                  id="judul"
                  placeholder="Contoh: Pengumuman Rapat Wali Kelas"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="rounded-xl border border-slate-200 dark:border-slate-800/80 focus:border-teal-500"
                />
              </div>
              
              <div className="space-y-1.5 text-left">
                <Label htmlFor="pesan" className="text-xs font-black uppercase text-slate-400 tracking-wider">Isi Pesan</Label>
                <textarea
                  id="pesan"
                  rows={3}
                  placeholder="Tuliskan detail pengumuman di sini..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  required
                  className="w-full text-xs font-medium rounded-xl bg-background border border-slate-200 dark:border-slate-800/80 px-3 py-2 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Jenis Notifikasi</Label>
                  <Select
                    value={newType}
                    onValueChange={(v: any) => setNewType(v)}
                  >
                    <SelectTrigger className="rounded-xl neumo-sm bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border border-slate-200/50 dark:border-slate-800/55 text-xs font-semibold">
                      <SelectValue placeholder="Pilih Jenis" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="info" className="text-xs font-semibold">Info (Biru)</SelectItem>
                      <SelectItem value="success" className="text-xs font-semibold">Sukses (Hijau)</SelectItem>
                      <SelectItem value="warning" className="text-xs font-semibold">Peringatan (Kuning)</SelectItem>
                      <SelectItem value="error" className="text-xs font-semibold">Bahaya (Merah)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="link" className="text-xs font-black uppercase text-slate-400 tracking-wider">Link Tujuan (Opsional)</Label>
                  <Input
                    id="link"
                    placeholder="Contoh: /lms/jurnal"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800/80"
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                  className="neumo bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 rounded-xl flex-1 h-11 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 dark:hover:bg-slate-900/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  disabled={creating}
                  className="neumo bg-[oklch(0.96_0.01_250)] dark:bg-[oklch(0.16_0.01_250)] border-0 rounded-xl flex-1 h-11 text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5 shrink-0" /> : null}
                  Kirim
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
