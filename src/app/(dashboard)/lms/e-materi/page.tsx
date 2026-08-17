"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  Video,
  Link2,
  Image as ImageIcon,
  Eye,
  Pencil,
  Trash2,
  FolderOpen,
  ChevronRight,
  User,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Play,
  Book,
  Film,
  Globe,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { api } from "@/lib/trpc/client"
import { useOptimisticRemove } from "@/hooks/useOptimisticRemove"
import { useDebounce } from "@/hooks/useDebounce"
import { toast } from "sonner"
import EMateriFormDialog, { type EMateriFormData, formatTingkatLabel } from "@/components/lms/EMateriFormDialog"

// ── Helper: tingkat (angka / romawi) ──
const normalizeTingkat = (t: string): string => {
  if (!t) return ""
  const clean = t.trim().toUpperCase()
  const map: Record<string, string> = {
    I: "1", II: "2", III: "3", IV: "4", V: "5", VI: "6",
    VII: "7", VIII: "8", IX: "9", X: "10", XI: "11", XII: "12",
  }
  if (map[clean]) return map[clean]
  if (/^\d+$/.test(clean)) return clean.replace(/^0+/, "") || clean
  return t
}

const extractTingkatFromClassName = (name: string): string => {
  if (!name) return ""
  const clean = name.trim().toUpperCase()
  const orders = ["VIII", "VII", "IX", "XII", "XI", "X", "VI", "IV", "V", "III", "II", "I"]
  for (const o of orders) {
    if (clean.includes(o)) return normalizeTingkat(o)
  }
  const num = clean.match(/(\d{1,2})/)
  if (num && !clean.toLowerCase().includes("kelas")) return normalizeTingkat(num[1])
  return name
}

const getTargetKelasLabel = (kelasId?: string | null, kelasNama?: string | null): string => {
  if (!kelasId || kelasId === "all" || kelasId === "Semua") return "Semua Kls"
  if (kelasNama) return `Kls ${kelasNama}`
  if (kelasId.includes("-")) return `Kls ${kelasId}`
  if (/^\d+$/.test(kelasId)) return `Kls ${kelasId}`
  return `Kls ${kelasId}`
}

// ── Helper: YouTube / video / embed ──
const getYoutubeId = (url: string): string | null => {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

const isDirectVideoUrl = (url: string): boolean => {
  if (!url) return false
  return url.startsWith("data:video/") || url.startsWith("blob:") || /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)
}

const getEmbedUrl = (url: string, tipe: string): string => {
  if (!url) return ""
  if (tipe === "video") {
    const ytId = getYoutubeId(url)
    if (ytId) return `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`
  }
  if (url.includes("drive.google.com")) {
    if (url.includes("/view")) return url.replace(/\/view(\?.*)?$/, "/preview")
    const match = url.match(/[?&]id=([^&]+)/)
    if (match && match[1]) return `https://drive.google.com/file/d/${match[1]}/preview`
  }
  return url
}

// ── Helper: gradient stabil berdasarkan id ──
const getGradientClass = (id: string): string => {
  const colors = [
    "from-indigo-600 to-purple-800",
    "from-teal-600 to-emerald-800",
    "from-rose-600 to-orange-700",
    "from-blue-600 to-cyan-800",
    "from-violet-600 to-fuchsia-800",
    "from-amber-600 to-rose-700",
  ]
  const charCodeSum = id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return colors[charCodeSum % colors.length]
}

interface MateriItem {
  id: string
  judul: string
  bab?: string | null
  deskripsi?: string | null
  tipeMateri: string
  url?: string | null
  coverUrl?: string | null
  guruId?: string | null
  kelasId?: string | null
  tingkat?: string | null
  status: string
  pembuatNama?: string | null
  viewsCount: number
  createdAt: string | Date
  mataPelajaran?: { id: string; namaMapel: string; kodeMapel?: string | null } | null
  kelas?: { id: string; namaKelas: string; tingkat?: string | null } | null
}

interface MapelItem {
  id: string
  namaMapel: string
  kodeMapel?: string | null
  tingkat?: string | null
  kategori?: string | null
  pengampu?: { guru?: { id: string; namaLengkap: string } | null; kelas?: { id: string; namaKelas: string; tingkat?: string | null } | null }[] | null
}

interface KelasItem {
  id: string
  namaKelas: string
  tingkat: string | null
}

const TIPE_BADGES: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  dokumen: { label: "Dokumen", cls: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/60", icon: FileText },
  video: { label: "Video", cls: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60", icon: Video },
  gambar: { label: "Gambar", cls: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/60", icon: ImageIcon },
  link: { label: "Link", cls: "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/60", icon: Link2 },
}

export default function EMateriPage() {
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? "siswa"
  const isGuru = userRole === "guru"
  const isSiswa = userRole === "siswa"
  // Kepsek setara admin sekolah untuk kelola e-materi (create/update/remove)
  const canManage = ["super_admin", "admin_sekolah", "tu", "guru", "kepsek"].includes(userRole)

  const { data: profile } = api.profil.getProfile.useQuery(undefined, { enabled: !!session })

  // Navigasi & tab
  const [selectedMapelId, setSelectedMapelId] = useState<string | null>(null)
  const [guruActiveTab, setGuruActiveTab] = useState<"my-materials" | "explore">("my-materials")

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTingkat, setSelectedTingkat] = useState("Semua")
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("Semua")
  const [materiSearchQuery, setMateriSearchQuery] = useState("")

  // Modal states
  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<EMateriFormData | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<MateriItem | null>(null)
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  // Konteks mapel saat membuka form (dari tombol "+" di card mapel, tanpa masuk layar detail)
  const [formContextMapelId, setFormContextMapelId] = useState<string | null>(null)

  const debouncedSearchMapel = useDebounce(searchQuery)

  // tRPC Queries — search di-server; filter tingkat di-client (normalisasi angka/romawi).
  // limit 200 ≠ cache default (100) → selalu fresh dari DB, sinkron realtime dengan page mapel.
  const { data: mapelList, isLoading: isLoadingMapel } = api.mapel.getAll.useQuery({
    search: debouncedSearchMapel || undefined,
    limit: 200,
  }, { refetchOnWindowFocus: true })
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 200 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 })

  // Muat SEMUA materi (tanpa filter) lalu filter di client — konsisten dengan
  // prototipe SIM yang menyimpan seluruh materi dalam state. Count per mapel di
  // layar 1 harus akurat tanpa terpengaruh search/filter tipe.
  const { data: materiList, isLoading: isLoadingMateri } = api.eMateri.getAll.useQuery({
    status: isSiswa ? "terbit" : undefined,
    limit: 1000,
  })

  // Mapel ploting guru yang sedang login (untuk guru)
  const guruId = isGuru ? (profile?.id as string) : ""
  const { data: guruPengampuList } = api.pengampu.getByGuru.useQuery(
    { guruId },
    { enabled: isGuru && !!guruId }
  )

  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelItem[], [mapelList])
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasItem[], [kelasList])
  const materiRecords = useMemo(() => (materiList ?? []) as MateriItem[], [materiList])
  const guruRecords = useMemo(() => (guruList ?? []) as { id: string; namaLengkap: string }[], [guruList])

  const guruMap = useMemo(() => new Map(guruRecords.map((g) => [g.id, g.namaLengkap])), [guruRecords])

  // Mapel yang diploting ke guru login
  const teacherAssignedMapel = useMemo(() => {
    if (!isGuru) return []
    if (!guruPengampuList || guruPengampuList.length === 0) return []
    const ids = new Set<string>()
    const result: MapelItem[] = []
    for (const p of guruPengampuList as any[]) {
      if (!p?.mataPelajaran?.id) continue
      if (ids.has(p.mataPelajaran.id)) continue
      ids.add(p.mataPelajaran.id)
      result.push({
        id: p.mataPelajaran.id,
        namaMapel: p.mataPelajaran.namaMapel,
        kodeMapel: p.mataPelajaran.kodeMapel ?? null,
        tingkat: p.mataPelajaran.tingkat ?? null,
        kategori: p.mataPelajaran.kategori ?? null,
      })
    }
    return result
  }, [isGuru, guruPengampuList])

  // Siswa: kelas & tingkat
  const studentKelasId = (profile?.kelasId as string) || ""
  const studentKelasObj = useMemo(() => {
    if (!studentKelasId) return null
    return kelasRecords.find((k) => k.id === studentKelasId) || null
  }, [studentKelasId, kelasRecords])
  const studentTingkat = useMemo(() => {
    if (studentKelasObj?.tingkat) return normalizeTingkat(studentKelasObj.tingkat)
    if (studentKelasId) return normalizeTingkat(extractTingkatFromClassName(studentKelasId))
    return ""
  }, [studentKelasObj, studentKelasId])

  // Apakah mapel berlaku untuk siswa — berdasarkan tingkat kelas dari ploting pengampu
  const isSubjectForStudent = useMemo(() => (m: MapelItem): boolean => {
    if (!m.pengampu || m.pengampu.length === 0) return true
    const pengampuList = m.pengampu as { kelas?: { id: string; tingkat?: string | null; namaKelas: string } | null }[]
    return pengampuList.some((p) => {
      const kelas = p?.kelas
      if (!kelas) return false
      const kTingkat = normalizeTingkat(kelas.tingkat || "") || normalizeTingkat(extractTingkatFromClassName(kelas.namaKelas))
      if (!kTingkat) return true
      return kTingkat === studentTingkat
    })
  }, [studentTingkat])

  const isMaterialForStudent = useMemo(() => (mat: MateriItem): boolean => {
    if (!mat.kelasId || mat.kelasId === "all" || mat.kelasId === "Semua") return true
    if (studentKelasId && mat.kelasId.toLowerCase() === studentKelasId.toLowerCase()) return true
    const normMatKelasId = normalizeTingkat(mat.kelasId)
    if (normMatKelasId && normMatKelasId === studentTingkat) return true
    const extracted = normalizeTingkat(extractTingkatFromClassName(mat.kelasId))
    if (extracted && extracted === studentTingkat) return true
    return false
  }, [studentKelasId, studentTingkat])

  // Filter mapel (layar 1) — search sudah difilter server; tingkat & role di-client.
  // Guru tetap bisa MELIHAT semua mapel (pembatasan ploting hanya saat memilih mapel di form).
  const filteredSubjects = useMemo(() => {
    return mapelRecords.filter((m) => {
      if (isSiswa) return isSubjectForStudent(m)
      if (selectedTingkat !== "Semua") {
        const pengampuKelas = (m.pengampu ?? []).find((p) => p?.kelas)
        const tingkat = pengampuKelas?.kelas?.tingkat
        if (normalizeTingkat(tingkat || "") !== normalizeTingkat(selectedTingkat)) return false
      }
      return true
    })
  }, [mapelRecords, isSiswa, isSubjectForStudent, selectedTingkat])

  // Filter materi (layar 2)
  const filteredMaterials = useMemo(() => {
    if (!selectedMapelId) return []
    return materiRecords.filter((mat) => {
      if ((mat as any).mataPelajaranId !== selectedMapelId) return false
      const matchesSearch =
        mat.judul.toLowerCase().includes(materiSearchQuery.toLowerCase()) ||
        (mat.deskripsi || "").toLowerCase().includes(materiSearchQuery.toLowerCase())
      const matchesType = selectedTypeFilter === "Semua" || mat.tipeMateri === selectedTypeFilter
      if (!matchesSearch || !matchesType) return false
      if (isSiswa && !isMaterialForStudent(mat)) return false
      return true
    })
  }, [materiRecords, selectedMapelId, materiSearchQuery, selectedTypeFilter, isSiswa, isMaterialForStudent])

  // Materi milik guru (tab Materi Saya)
  const myMaterials = useMemo(() => {
    if (!isGuru) return []
    return materiRecords.filter((mat) => {
      const isOwner = mat.guruId === guruId || (mat.pembuatNama && profile?.namaLengkap && mat.pembuatNama.toLowerCase() === (profile.namaLengkap as string).toLowerCase())
      if (!isOwner) return false
      const matchesSearch =
        mat.judul.toLowerCase().includes(materiSearchQuery.toLowerCase()) ||
        (mat.deskripsi || "").toLowerCase().includes(materiSearchQuery.toLowerCase())
      const matchesType = selectedTypeFilter === "Semua" || mat.tipeMateri === selectedTypeFilter
      return matchesSearch && matchesType
    })
  }, [isGuru, materiRecords, guruId, profile, materiSearchQuery, selectedTypeFilter])

  const utils = api.useUtils()

  const createMutation = api.eMateri.create.useMutation({
    onSuccess: () => {
      utils.eMateri.getAll.invalidate()
    },
  })

  const updateMutation = api.eMateri.update.useMutation({
    onSuccess: () => {
      utils.eMateri.getAll.invalidate()
    },
  })

  const removeMutation = api.eMateri.remove.useMutation({
    ...useOptimisticRemove({ queryKey: [["eMateri", "getAll"]] }),
  })

  const incrementViewsMutation = api.eMateri.incrementViews.useMutation()

  const handleSubmitForm = async (formData: EMateriFormData) => {
    if (formData.id) {
      await updateMutation.mutateAsync({
        id: formData.id,
        data: { ...formData, guruId: guruId || null },
      })
      toast.success("Materi berhasil diperbarui")
    } else {
      await createMutation.mutateAsync({ ...formData, guruId: guruId || null } as any)
      toast.success(`Materi "${formData.judul}" berhasil diunggah`)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
    setDeleteId(null)
  }

  const handleOpenPreview = (item: MateriItem) => {
    setPreviewMaterial(item)
    setIsFullscreenPreview(false)
    setIsCopied(false)
    incrementViewsMutation.mutate({ id: item.id })
  }

  // Buka form tambah untuk mapel tertentu (dari tombol "+" di card mapel)
  const handleOpenAddForMapel = (mapelId: string) => {
    setEditingItem(null)
    setFormContextMapelId(mapelId)
    setFormOpen(true)
  }

  const handleCopyLink = (url: string) => {
    if (!url) return
    navigator.clipboard?.writeText(url)
    setIsCopied(true)
    toast.info("Tautan materi berhasil disalin ke clipboard")
    setTimeout(() => setIsCopied(false), 2500)
  }

  const canEditOrDelete = (mat: MateriItem): boolean => {
    // Kepsek setara admin sekolah — bisa kelola semua materi
    if (["super_admin", "admin_sekolah", "tu", "kepsek"].includes(userRole)) return true
    if (userRole === "guru") {
      const profileName = (profile?.namaLengkap as string) || ""
      return mat.guruId === guruId || (!!mat.pembuatNama && !!profileName && mat.pembuatNama.toLowerCase() === profileName.toLowerCase())
    }
    return false
  }

  // ── Helper cover visual (mengikuti prototipe SIM) ──
  const renderMaterialCover = (mat: MateriItem) => {
    const customCover = mat.coverUrl
    const tipe = mat.tipeMateri

    if (customCover) {
      return (
        <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-slate-900 border border-slate-200/80 group-hover:shadow-md transition-all duration-300">
          <img src={customCover} alt={mat.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-md text-[7px] font-black uppercase text-white tracking-widest border border-white/20 inline-flex items-center space-x-1">
            <FileText size={9} />
            <span>{TIPE_BADGES[tipe]?.label || tipe}</span>
          </div>
        </div>
      )
    }

    switch (tipe) {
      case "dokumen": {
        const gradient = getGradientClass(mat.id)
        return (
          <div className={`h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-gradient-to-br ${gradient} flex items-center p-2.5 shadow-xs border border-black/10 group-hover:shadow-md transition-all duration-300`}>
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/15 border-r border-white/5" />
            <div className="absolute left-2 top-0 bottom-0 w-[1px] bg-white/10" />
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/5 rounded-full blur-xl" />
            <div className="absolute right-3 top-3 w-8 h-8 bg-black/10 rounded-full blur-md" />
            <div className="ml-2.5 flex flex-col justify-between h-full w-full text-white">
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md text-[7px] font-black uppercase tracking-widest border border-white/20 inline-flex items-center space-x-1">
                  <FileText size={9} />
                  <span>E-Book / PDF</span>
                </span>
                <Book size={11} className="text-white/60" />
              </div>
              <div className="space-y-0.5 pr-1">
                <p className="font-extrabold text-[9px] sm:text-[10px] leading-tight line-clamp-2 tracking-tight uppercase">{mat.judul}</p>
                <div className="w-5 h-[1.5px] bg-white/40 rounded-full" />
              </div>
              <div className="text-[6px] text-white/50 font-mono tracking-wider flex items-center space-x-1">
                <span>DIGITAL LIBRARY</span>
              </div>
            </div>
          </div>
        )
      }
      case "video": {
        const ytId = getYoutubeId(mat.url || "")
        if (ytId) {
          return (
            <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-slate-950 border border-slate-100/10 group-hover:shadow-md transition-all duration-300">
              <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={mat.judul} className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-white/25 backdrop-blur-md rounded-full flex items-center justify-center border border-white/40 text-white shadow-lg shadow-black/10 group-hover:scale-110 group-hover:bg-teal-500 group-hover:border-teal-400 transition-all duration-300">
                  <Play size={12} fill="currentColor" className="ml-0.5" />
                </div>
              </div>
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/45 backdrop-blur-md text-[7px] font-black uppercase text-white tracking-widest border border-white/10 inline-flex items-center space-x-1">
                <Video size={9} />
                <span>Video Ajar</span>
              </div>
            </div>
          )
        }
        return (
          <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 flex flex-col justify-between p-2.5 border border-slate-800/90 group-hover:border-teal-500/40 group-hover:shadow-md transition-all duration-300">
            <div className="absolute -right-4 -top-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-teal-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[7px] font-black uppercase tracking-widest inline-flex items-center space-x-1 backdrop-blur-md">
                <Video size={9} />
                <span>Video Ajar</span>
              </span>
              <Film size={11} className="text-slate-500" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center space-y-0.5">
              <div className="w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center text-teal-400 group-hover:scale-110 group-hover:border-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-all duration-300 shadow-md">
                <Play size={13} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between text-[7px] text-slate-400 font-medium">
              <span className="truncate max-w-[150px]">{mat.judul}</span>
              <span className="text-[6px] font-mono uppercase text-slate-500">Materi Video</span>
            </div>
          </div>
        )
      }
      case "gambar": {
        const isDirectImage = mat.url && (mat.url.startsWith("data:image/") || mat.url.startsWith("blob:") || (/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i.test(mat.url) && !mat.url.includes("unsplash.com")))
        if (isDirectImage) {
          return (
            <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-slate-900 border border-slate-100/10 group-hover:shadow-md transition-all duration-300">
              <img src={mat.url!} alt={mat.judul} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/45 backdrop-blur-md text-[7px] font-black uppercase text-white tracking-widest border border-white/10 inline-flex items-center space-x-1">
                <ImageIcon size={9} />
                <span>Infografis / Foto</span>
              </div>
            </div>
          )
        }
        const gradient = getGradientClass(mat.id)
        return (
          <div className={`h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-gradient-to-br ${gradient} flex flex-col justify-between p-2.5 shadow-xs border border-black/10 group-hover:shadow-md transition-all duration-300 text-white`}>
            <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full blur-lg pointer-events-none" />
            <div className="absolute left-2 top-2 w-12 h-12 bg-black/10 rounded-full blur-md pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-md text-[7px] font-black uppercase tracking-widest border border-white/20 inline-flex items-center space-x-1">
                <ImageIcon size={9} />
                <span>Infografis / Foto</span>
              </span>
              <BookOpen size={11} className="text-white/60" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center space-y-0.5">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <ImageIcon size={16} />
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between text-[7px] text-white/80 font-medium">
              <span className="truncate max-w-[150px] font-semibold">{mat.judul}</span>
              <span className="text-[6px] font-mono text-white/60 uppercase">Visual Materi</span>
            </div>
          </div>
        )
      }
      case "link": {
        let domain = "Website"
        try {
          domain = new URL(mat.url || "https://example.com").hostname
        } catch {
          /* noop */
        }
        return (
          <div className="h-24 sm:h-28 w-full rounded-xl overflow-hidden relative mb-2.5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/90 group-hover:border-teal-500/40 group-hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="relative z-10 p-1.5 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500/80" />
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="px-1.5 py-0.5 bg-white/10 rounded text-[6px] text-white/80 font-mono truncate max-w-[110px]">{domain}</div>
              <div className="w-2" />
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 space-y-0.5">
              <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center border border-teal-500/30 text-teal-300 group-hover:scale-110 transition-transform duration-300">
                <Link2 size={12} />
              </div>
              <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">Tautan Interaktif</span>
            </div>
            <div className="relative z-10 px-2 py-1 bg-black/30 border-t border-white/5 flex items-center justify-between text-[7px] text-teal-300 font-medium">
              <span className="truncate max-w-[150px] text-slate-300">{mat.judul}</span>
              <span className="text-[6px] uppercase tracking-wider text-teal-400 font-mono flex items-center space-x-0.5">
                <Globe size={7} />
                <span>Web Portal</span>
              </span>
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  // ── Kartu materi (dipakai di grid & materi saya) ──
  const renderMaterialCard = (mat: MateriItem) => {
    const mapel = mat.mataPelajaran
    const uploaderName = mat.pembuatNama || guruMap.get(mat.guruId || "") || "Pengajar"
    const tipe = mat.tipeMateri

    return (
      <div
        key={mat.id}
        onClick={() => handleOpenPreview(mat)}
        className="group neumo-card bg-background rounded-[26px] p-3 hover:shadow-xl hover:border-teal-300/50 dark:hover:border-teal-800/50 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer"
      >
        <div className="space-y-2.5">
          {renderMaterialCover(mat)}

          <div className="flex items-center justify-between pt-0.5">
            <div className="flex flex-col space-y-0.5 min-w-0 flex-1">
              <span className="text-[8px] sm:text-[9px] font-black uppercase text-teal-600 tracking-wider truncate block" title={mapel?.namaMapel}>
                {mapel ? mapel.namaMapel : "Mata Pelajaran"}
              </span>
              <div className="flex items-center space-x-1 min-w-0">
                <span className="text-[7px] sm:text-[8px] font-bold uppercase text-slate-400 tracking-wider truncate">
                  {TIPE_BADGES[tipe]?.label || tipe} • <span className="text-indigo-600 font-black">{getTargetKelasLabel(mat.kelasId, mat.kelas?.namaKelas)}</span>
                </span>
              </div>
            </div>

            {canEditOrDelete(mat) && (
              <div className="flex items-center space-x-0.5 flex-shrink-0 ml-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingItem(mat as any)
                    setFormContextMapelId(null)
                    setFormOpen(true)
                  }}
                  title="Edit Materi"
                  className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded transition-colors cursor-pointer"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteId(mat.id)
                  }}
                  title="Hapus Materi"
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs leading-snug line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" title={mat.judul}>
              {mat.judul}
            </h4>
            {mat.deskripsi && (
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-relaxed line-clamp-1">
                {mat.deskripsi}
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-400 font-bold">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="flex items-center space-x-1">
              <Calendar size={10} className="text-slate-300 flex-shrink-0" />
              <span className="truncate">{new Date(mat.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
            </div>
            <div className="flex items-center space-x-1">
              <User size={10} className="text-slate-300 flex-shrink-0" />
              <span className="truncate">Oleh: {uploaderName.split(",")[0].split(" ")[0]}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleOpenPreview(mat)
            }}
            className="px-2 py-1 bg-slate-950 dark:bg-slate-700 hover:bg-teal-600 text-white rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-colors flex items-center justify-center space-x-1 shadow-2xs cursor-pointer ml-1.5"
          >
            <span>Buka</span>
            <Eye size={8} />
          </button>
        </div>
      </div>
    )
  }

  // ── Render utama ──
  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">e-Materi Pembelajaran</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isGuru
              ? "Kelola dan unggah materi pembelajaran digital untuk kelas Anda"
              : "Pilih mata pelajaran untuk mengakses modul ajar digital dari Guru"}
          </p>
        </div>
      </div>

      {/* Tab Navigation khusus Guru: Materi Saya vs Jelajahi Mapel */}
      {isGuru && (
        <div className="flex bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-1 rounded-2xl max-w-sm">
          <button
            type="button"
            onClick={() => {
              setGuruActiveTab("my-materials")
              setSelectedMapelId(null)
            }}
            className={`relative flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer text-center ${
              guruActiveTab === "my-materials" && !selectedMapelId
                ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Materi Saya
          </button>
          <button
            type="button"
            onClick={() => {
              setGuruActiveTab("explore")
              setSelectedMapelId(null)
            }}
            className={`relative flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer text-center ${
              guruActiveTab === "explore" || selectedMapelId
                ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Jelajahi Mapel
          </button>
        </div>
      )}

      {/*
        ─────────────────────────────────────────────
        VIEW 1: Guru — "Materi Saya"
        ─────────────────────────────────────────────
      */}
      {isGuru && !selectedMapelId && guruActiveTab === "my-materials" ? (
        <div className="space-y-6">
          {/* Header banner */}
          <div className="neumo-card bg-background rounded-[26px] p-3.5 sm:p-4 md:p-5 border-0 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={17} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Koleksi Materi Saya</h2>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">MANAJEMEN MODUL DIGITAL GURU</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed pl-10 sm:pl-11">
                Kelola dan unggah materi pembelajaran digital (E-Book, Video, LKS, Infografis) untuk kelas Anda.
              </p>
            </div>
          </div>

          {/* Search + filter tipe */}
          <div className="neumo-card bg-background rounded-[22px] p-4 border-0 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Cari judul materi atau deskripsi saya..."
                value={materiSearchQuery}
                onChange={(e) => setMateriSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="flex overflow-x-auto bg-slate-100/90 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800">
              {["Semua", "dokumen", "video", "gambar", "link"].map((type) => {
                const label = type === "Semua" ? "Semua" : (TIPE_BADGES[type]?.label || type)
                const isActive = selectedTypeFilter === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTypeFilter(type)}
                    className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {myMaterials.length === 0 ? (
            <div className="neumo-card bg-background rounded-[26px] py-16 text-center border-0 space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <FolderOpen size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Belum Ada Materi Terunggah</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Mulai unggah materi pertama Anda dari tab &quot;Jelajahi Mapel&quot;, klik tombol &quot;+&quot; pada kartu mata pelajaran.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 md:gap-4">
              {myMaterials.map((mat) => renderMaterialCard(mat))}
            </div>
          )}
        </div>
      ) : !selectedMapelId ? (
        /* ─────────────────────────────────────────────
           VIEW 2: Pilih Mapel (Portal / Jelajahi Mapel)
           ───────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="neumo-card bg-background rounded-[26px] p-3.5 sm:p-4 md:p-5 border-0 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-teal-50 dark:bg-teal-950/50 text-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen size={17} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug">Portal Pembelajaran e-Materi</h2>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">MATERI AJAR & MODUL MANDIRI DIGITAL</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 max-w-xl leading-relaxed pl-10 sm:pl-11">
                Pilih mata pelajaran untuk mengakses modul ajar (E-Book, Video Tutorial, LKS, Infografis) dari Guru.
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 bg-slate-50/90 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-2 sm:p-2.5 flex-shrink-0 self-start md:self-auto">
              <div className="text-center px-3 sm:px-4 border-r border-slate-200 dark:border-slate-700">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold block">{isSiswa ? "Mapel Kelas" : "Total Mapel"}</span>
                <span className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 leading-tight">{filteredSubjects.length}</span>
              </div>
              <div className="text-center px-3 sm:px-4">
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold block">{isSiswa ? "Materi Kelas" : "Total Materi"}</span>
                <span className="text-base sm:text-lg font-black text-teal-600 leading-tight">
                  {isSiswa ? materiRecords.filter((m) => isMaterialForStudent(m)).length : materiRecords.length}
                </span>
              </div>
            </div>
          </div>

          {/* Filtering */}
          <div className="neumo-card bg-background rounded-[22px] p-4 border-0 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Cari nama mapel, kode, atau guru pengampu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            {!isSiswa && (
              <div className="w-full sm:w-[200px]">
                <Select value={selectedTingkat} onValueChange={(v) => setSelectedTingkat(v ?? "Semua")}>
                  <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <SelectValue placeholder="Semua Tingkat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua" label="Semua Tingkat">Semua Tingkat</SelectItem>
                    {kelasRecords.map((k) => k.tingkat && (
                      <SelectItem key={k.id} value={k.tingkat} label={`Kelas ${k.tingkat}`}>
                        Kelas {k.tingkat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <BookOpen size={14} className="text-teal-600" />
                <span>Daftar Mata Pelajaran {selectedTingkat !== "Semua" ? `(Kelas ${selectedTingkat})` : ""}</span>
              </h3>
              {searchQuery.trim() !== "" && (
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 px-3 py-1 rounded-full">
                  Pencarian: &quot;{searchQuery}&quot;
                </span>
              )}
            </div>

            {isLoadingMapel ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] p-6 space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="neumo-card bg-background rounded-[26px] py-16 text-center border-0 space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <BookOpen size={32} />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Tidak Ada Mata Pelajaran Ditemukan</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Coba sesuaikan kata kunci pencarian atau filter tingkat kelas Anda.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSubjects.map((sub) => {
                  const pengampuList = sub.pengampu ?? []
                  const namaGuru = pengampuList.length > 0 && pengampuList[0]?.guru
                    ? pengampuList[0].guru.namaLengkap
                    : "Belum Ditunjuk"
                  const count = materiRecords.filter((m) => {
                    if ((m as any).mataPelajaranId !== sub.id) return false
                    if (isSiswa && !isMaterialForStudent(m)) return false
                    return true
                  }).length

                  return (
                    <div
                      key={sub.id}
                      className="neumo-card bg-background rounded-[28px] p-6 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-5 group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-bl-full transition-all group-hover:from-teal-500/10" />

                      <div className="space-y-4 relative z-10">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-900 rounded-full text-[10px] font-black uppercase tracking-wider">
                            {(() => {
                              const pengampuKelas = (sub.pengampu ?? []).find((p) => p?.kelas)
                              const tingkat = pengampuKelas?.kelas?.tingkat
                              if (!tingkat || tingkat === "Semua") return "Semua Tingkat"
                              return `Kelas ${formatTingkatLabel(tingkat)}`
                            })()}
                          </span>
                          <span className="text-[10px] text-slate-400 font-extrabold">
                            {sub.kodeMapel}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-1">
                            {sub.namaMapel}
                          </h4>
                          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium">
                            <User size={12} className="text-slate-300" />
                            <span className="truncate">{namaGuru}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between relative z-10">
                        <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold">
                          <FolderOpen size={14} className="text-slate-400" />
                          <span>{count === 0 ? "Belum Ada" : `${count} File`} Materi</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {canManage && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenAddForMapel(sub.id)
                              }}
                              title={`Tambah e-Materi ${sub.namaMapel}`}
                              className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-600 hover:text-white text-teal-600 dark:text-teal-400 flex items-center justify-center transition-all shadow-sm neumo-sm cursor-pointer"
                            >
                              <Plus size={15} />
                            </button>
                          )}
                          <span className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/40 group-hover:text-teal-600 dark:group-hover:text-teal-400 text-slate-400 flex items-center justify-center transition-colors">
                            <ChevronRight size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────
           VIEW 3: Detail Mapel — Daftar Materi
           ───────────────────────────────────────────── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setSelectedMapelId(null)
                setMateriSearchQuery("")
                setSelectedTypeFilter("Semua")
              }}
              className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer inline-flex items-center space-x-2 shadow-2xs"
            >
              <ArrowLeft size={14} />
              <span>Kembali Ke Mapel</span>
            </button>
          </div>

          {(() => {
            const selectedMapel = mapelRecords.find((m) => m.id === selectedMapelId)
            return (
              <div className="neumo-card bg-background rounded-[26px] p-3.5 sm:p-4 md:p-5 border-0 flex items-center justify-between gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-900 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                      {(() => {
                        const pengampuKelas = (selectedMapel?.pengampu ?? []).find((p) => p?.kelas)
                        const tingkat = pengampuKelas?.kelas?.tingkat
                        if (!tingkat || tingkat === "Semua") return "Semua Tingkat"
                        return `Kelas ${formatTingkatLabel(tingkat)}`
                      })()}
                    </span>
                    {selectedMapel?.kodeMapel && (
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {selectedMapel.kodeMapel}
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-snug truncate">
                    {selectedMapel?.namaMapel}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-500 font-medium">
                    {(() => {
                      const pengampuList = selectedMapel?.pengampu ?? []
                      const guruNama = pengampuList.length > 0 && pengampuList[0]?.guru ? pengampuList[0].guru.namaLengkap : "Belum Ditunjuk"
                      return (
                        <div className="inline-flex items-center space-x-1 min-w-0">
                          <User size={12} className="text-slate-400 flex-shrink-0" />
                          <span className="truncate">Guru: <strong className="text-slate-700 dark:text-slate-300">{guruNama}</strong></span>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center">
                  <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-br from-teal-50 dark:from-teal-950/40 to-slate-50 dark:to-slate-900 rounded-xl border border-teal-100/80 dark:border-teal-900/50 flex flex-col items-center justify-center min-w-[56px] sm:min-w-[64px] shadow-2xs">
                    <span className="text-base sm:text-xl md:text-2xl font-black text-teal-600 leading-none">{filteredMaterials.length}</span>
                    <span className="text-[8px] sm:text-[9px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5 leading-none">Materi</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Search & filter */}
          <div className="neumo-card bg-background rounded-[22px] p-3 sm:p-3.5 border-0 flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                placeholder="Cari judul materi atau deskripsi..."
                value={materiSearchQuery}
                onChange={(e) => setMateriSearchQuery(e.target.value)}
                className="pl-10 rounded-xl h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap justify-between md:justify-end">
              <div className="flex overflow-x-auto bg-slate-100/90 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800 flex-1 sm:flex-none">
                {["Semua", "dokumen", "video", "gambar", "link"].map((type) => {
                  const label = type === "Semua" ? "Semua" : (TIPE_BADGES[type]?.label || type)
                  const isActive = selectedTypeFilter === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedTypeFilter(type)}
                      className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-xs border border-slate-200/50 dark:border-slate-700"
                          : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {!isSiswa && (
                <Button
                  onClick={() => {
                    setEditingItem(null)
                    setFormContextMapelId(null)
                    setFormOpen(true)
                  }}
                  className="px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all inline-flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm shadow-teal-600/15 flex-shrink-0 whitespace-nowrap"
                >
                  <Plus size={14} />
                  <span>Tambah Materi</span>
                </Button>
              )}
            </div>
          </div>

          {isLoadingMateri ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-3 space-y-3">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="neumo-card bg-background rounded-[26px] py-16 text-center border-0 space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <FolderOpen size={32} />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Belum Ada Materi Pembelajaran</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isSiswa
                    ? "Belum ada modul ajar digital yang diunggah oleh guru untuk mata pelajaran ini."
                    : "Klik tombol \"Tambah Materi\" di atas untuk menambahkan materi ajar digital baru."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3.5 md:gap-4">
              {filteredMaterials.map((mat) => renderMaterialCard(mat))}
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <EMateriFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingItem(null)
          setFormContextMapelId(null)
        }}
        onSubmit={handleSubmitForm}
        initial={editingItem}
        saving={createMutation.isPending || updateMutation.isPending}
        contextMapelId={formContextMapelId ?? selectedMapelId}
        assignedMapel={isGuru ? teacherAssignedMapel : null}
      />

      {/* Preview Modal */}
      {previewMaterial && (
        <Dialog open={!!previewMaterial} onOpenChange={(val) => {
          if (!val) {
            setPreviewMaterial(null)
            setIsFullscreenPreview(false)
          }
        }}>
          <DialogContent className={cn(
            "rounded-3xl overflow-hidden p-0 bg-white dark:bg-slate-900",
            previewMaterial.tipeMateri === "video" ? "max-w-4xl" : "max-w-lg"
          )}>
            {previewMaterial.tipeMateri === "video" ? (
              <>
                <div className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/50">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <Video size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 text-[8px] font-black uppercase tracking-wider">
                          Video Ajar
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 truncate">
                          {previewMaterial.mataPelajaran?.namaMapel} ({getTargetKelasLabel(previewMaterial.kelasId, previewMaterial.kelas?.namaKelas)})
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold truncate max-w-xs sm:max-w-md md:max-w-xl text-slate-900 dark:text-slate-100" title={previewMaterial.judul}>
                        {previewMaterial.judul}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                      title={isFullscreenPreview ? "Kecilkan Pop-up" : "Putar Layar Penuh"}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold"
                    >
                      {isFullscreenPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                      <span className="hidden sm:inline">{isFullscreenPreview ? "Normal" : "Layar Penuh"}</span>
                    </button>
                    {previewMaterial.url && (
                      <a
                        href={previewMaterial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Buka Video di Tab Baru"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold"
                      >
                        <ExternalLink size={14} />
                        <span className="hidden md:inline">Buka Halaman Asli</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewMaterial(null)}
                      title="Tutup Preview"
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-300 hover:text-rose-600 transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className={cn(isFullscreenPreview ? "h-[80vh] flex flex-col" : "aspect-video max-h-[56vh] min-h-[260px]")}>
                  <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
                    {(() => {
                      const ytId = getYoutubeId(previewMaterial.url || "")
                      if (ytId) {
                        return (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1&playsinline=1`}
                            title={previewMaterial.judul}
                            className="w-full h-full border-0"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            allowFullScreen
                          />
                        )
                      }
                      if (isDirectVideoUrl(previewMaterial.url || "")) {
                        return (
                          <video src={previewMaterial.url || ""} controls preload="metadata" className="w-full h-full object-contain" />
                        )
                      }
                      if (previewMaterial.url) {
                        return (
                          <iframe
                            src={getEmbedUrl(previewMaterial.url, "video")}
                            title={previewMaterial.judul}
                            className="w-full h-full border-0"
                            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            allowFullScreen
                          />
                        )
                      }
                      return (
                        <div className="p-8 text-center space-y-2">
                          <Video size={40} className="mx-auto text-slate-600" />
                          <p className="text-sm font-bold text-slate-300">Tautan video tidak tersedia</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {!isFullscreenPreview && (
                  <div className="p-5 border-t border-slate-150 dark:border-slate-800 space-y-3.5">
                    {previewMaterial.deskripsi && (
                      <div className="space-y-1">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Deskripsi & Petunjuk</h5>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                          {previewMaterial.deskripsi}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-1.5">
                          <User size={13} className="text-teal-600" />
                          <span>Pengunggah: <strong className="text-slate-800 dark:text-slate-200">{previewMaterial.pembuatNama || "Pengajar"}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <Calendar size={13} className="text-teal-600" />
                          <span>Tanggal: <strong className="text-slate-800 dark:text-slate-200">{new Date(previewMaterial.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong></span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <FolderOpen size={13} className="text-teal-600" />
                          <span>Target: <strong className="text-slate-800 dark:text-slate-200">{getTargetKelasLabel(previewMaterial.kelasId, previewMaterial.kelas?.namaKelas)}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {previewMaterial.url && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(previewMaterial.url!)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          >
                            {isCopied ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
                            <span>{isCopied ? "Tersalin!" : "Salin Tautan"}</span>
                          </button>
                        )}
                        {canEditOrDelete(previewMaterial) && (
                          <button
                            type="button"
                            onClick={() => {
                              const mat = previewMaterial
                              setPreviewMaterial(null)
                              setEditingItem(mat as any)
                              setFormContextMapelId(null)
                              setFormOpen(true)
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
                          >
                            <Pencil size={12} />
                            <span>Edit Materi</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-5 py-4 bg-gradient-to-r from-teal-50/80 via-white to-slate-50/80 dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 flex-shrink-0">
                      {previewMaterial.tipeMateri === "dokumen" && <FileText size={18} />}
                      {previewMaterial.tipeMateri === "gambar" && <ImageIcon size={18} />}
                      {previewMaterial.tipeMateri === "link" && <Link2 size={18} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-100/80 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-[8px] font-black uppercase tracking-wider">
                          {previewMaterial.tipeMateri === "dokumen" ? "Modul Dokumen" : previewMaterial.tipeMateri === "gambar" ? "Infografis / Foto" : "Tautan Web"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold truncate">
                          {previewMaterial.mataPelajaran?.namaMapel || "Materi Pembelajaran"}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-sm mt-0.5" title={previewMaterial.judul}>
                        {previewMaterial.judul}
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewMaterial(null)}
                    title="Tutup Preview"
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-5 sm:p-6 overflow-y-auto space-y-4 max-h-[75vh]">
                  {previewMaterial.tipeMateri === "gambar" && (previewMaterial.url || previewMaterial.coverUrl) && (
                    <div className="w-full max-h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center shadow-xs">
                      <img
                        src={previewMaterial.coverUrl || previewMaterial.url || ""}
                        alt={previewMaterial.judul}
                        className="max-h-48 w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  <div className="bg-slate-50/90 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Materi</div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 leading-snug">{previewMaterial.judul}</h4>
                    {previewMaterial.deskripsi ? (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200/60 dark:border-slate-800 mt-2">
                        {previewMaterial.deskripsi}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 italic pt-1 border-t border-slate-200/60 dark:border-slate-800 mt-2">
                        Tidak ada deskripsi tambahan untuk materi ini.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <FolderOpen size={12} className="text-teal-600" />
                        <span>Target Kelas</span>
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate">
                        {getTargetKelasLabel(previewMaterial.kelasId, previewMaterial.kelas?.namaKelas)}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <User size={12} className="text-teal-600" />
                        <span>Pengunggah</span>
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate">
                        {previewMaterial.pembuatNama || "Guru Pengampu"}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <Calendar size={12} className="text-teal-600" />
                        <span>Tanggal Upload</span>
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">
                        {new Date(previewMaterial.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xs space-y-1">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        <BookOpen size={12} className="text-teal-600" />
                        <span>Mata Pelajaran</span>
                      </div>
                      <div className="font-extrabold text-slate-800 dark:text-slate-200 text-xs truncate">
                        {previewMaterial.mataPelajaran?.namaMapel || "Umum"}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    {previewMaterial.url ? (
                      <a
                        href={previewMaterial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transition-all flex items-center justify-center space-x-2 text-xs uppercase tracking-wider cursor-pointer group"
                      >
                        <span>Buka {previewMaterial.tipeMateri === "dokumen" ? "Dokumen / File" : previewMaterial.tipeMateri === "gambar" ? "Gambar Penuh" : "Tautan Web"} di Halaman Penuh</span>
                        <ExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ) : (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl text-center text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Tautan berkas materi belum disematkan.
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      {previewMaterial.url && (
                        <button
                          type="button"
                          onClick={() => handleCopyLink(previewMaterial.url!)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          {isCopied ? <Check size={13} className="text-teal-600" /> : <Copy size={13} />}
                          <span>{isCopied ? "Tautan Tersalin!" : "Salin Tautan"}</span>
                        </button>
                      )}
                      {canEditOrDelete(previewMaterial) && (
                        <button
                          type="button"
                          onClick={() => {
                            const mat = previewMaterial
                            setPreviewMaterial(null)
                            setEditingItem(mat as any)
                            setFormContextMapelId(null)
                            setFormOpen(true)
                          }}
                          className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center space-x-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Pencil size={13} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Alert Dialog Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-extrabold">Hapus Materi Pembelajaran?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus materi pembelajaran ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs font-bold uppercase">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
