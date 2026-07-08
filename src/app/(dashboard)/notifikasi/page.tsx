"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { format } from "date-fns"
import { id } from "date-fns/locale"
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
      window.location.href = notif.link
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
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getBackground = (tipe: string, dibaca: boolean) => {
    if (dibaca) return "bg-card/50"
    switch (tipe) {
      case "success":
        return "bg-green-500/[0.04] border-green-500/20"
      case "warning":
        return "bg-amber-500/[0.04] border-amber-500/20"
      case "error":
        return "bg-rose-500/[0.04] border-rose-500/20"
      default:
        return "bg-blue-500/[0.04] border-blue-500/20"
    }
  }

  return (
    <div className="space-y-6">
      {/* Meta tags / SEO */}
      <title>Notifikasi & Pemberitahuan - EduManage</title>
      <meta name="description" content="Halaman informasi dan pengumuman untuk guru, siswa, dan staf sekolah." />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Notifikasi & Pemberitahuan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat semua pengumuman dan aktivitas sistem terbaru untuk Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.dibaca) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-10 rounded-xl"
            >
              <Check className="h-4 w-4 mr-2" />
              Tandai Semua Dibaca
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-xl font-semibold shadow-sm shadow-primary/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              Kirim Notifikasi
            </Button>
          )}
        </div>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl w-fit border">
        <button
          onClick={() => setActiveTab("semua")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === "semua" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            activeTab === "unread" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Belum Dibaca
        </button>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Memuat notifikasi...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
            <Bell className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Tidak ada notifikasi</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === "unread"
                ? "Hebat! Semua pemberitahuan sudah Anda baca."
                : "Belum ada notifikasi baru untuk saat ini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const isUnread = !notif.dibaca
            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`glass-card rounded-2xl p-5 border flex items-start gap-4 transition-all duration-300 relative group ${
                  notif.link ? "clickable" : ""
                } ${getBackground(notif.tipe, notif.dibaca)}`}
              >
                <div className="mt-0.5 flex-shrink-0">{getIcon(notif.tipe)}</div>
                
                <div className="flex-1 min-w-0 pr-8">
                  <div className="flex items-center gap-2.5">
                    <h3 className={`text-sm ${isUnread ? "font-bold text-foreground" : "font-semibold text-foreground/80"}`}>
                      {notif.judul}
                    </h3>
                    {isUnread && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed break-words">
                    {notif.pesan}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-3 font-medium">
                    {format(new Date(notif.createdAt), "dd MMMM yyyy, HH:mm", { locale: id })}
                  </p>
                </div>

                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteMutation.mutate({ id: notif.id })
                    }}
                    className="absolute right-4 top-4 h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title="Hapus pemberitahuan"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialog Pembuatan Notifikasi (Admins Only) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Kirim Notifikasi Baru</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Kirim pengumuman atau peringatan ke seluruh pengguna lembaga sekolah.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNotif} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="judul">Judul Notifikasi</Label>
              <Input
                id="judul"
                placeholder="Contoh: Pengumuman Rapat Wali Kelas"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="pesan">Isi Pesan</Label>
              <textarea
                id="pesan"
                rows={3}
                placeholder="Tuliskan detail pengumuman di sini..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                required
                className="w-full text-sm rounded-xl bg-background border px-3 py-2 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Jenis Notifikasi</Label>
                <Select
                  value={newType}
                  onValueChange={(v: any) => setNewType(v)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Pilih Jenis" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="info">Info (Biru)</SelectItem>
                    <SelectItem value="success">Sukses (Hijau)</SelectItem>
                    <SelectItem value="warning">Peringatan (Kuning)</SelectItem>
                    <SelectItem value="error">Bahaya (Merah)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="link">Link Tujuan (Opsional)</Label>
                <Input
                  id="link"
                  placeholder="Contoh: /lms/jurnal"
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl flex-1 h-11"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-xl flex-1 h-11 shadow-sm shadow-primary/20"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Kirim Notifikasi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
