"use client"

import { useState, useRef } from "react"
import { User, Mail, Globe, ImageIcon, Pencil, MessageCircle, Camera, Loader2, Upload, School, Award, BookOpen, MapPin, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
)

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
)

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98" fill="var(--background)"/></svg>
)

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.89 2.89 2.89 0 0 1-2.88-2.89 2.89 2.89 0 0 1 2.88-2.89c.31 0 .6.05.88.14v-3.5a6.37 6.37 0 0 0-.88-.05 6.33 6.33 0 0 0-6.33 6.33A6.33 6.33 0 0 0 6.63 19.6a6.33 6.33 0 0 0 6.33-6.33V9.9a7.76 7.76 0 0 0 4.2 1.9v-3.45a4.34 4.34 0 0 1-1.57-.66Z"/></svg>
)
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/client"
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const jenjangMap: Record<string, string> = {
  tk: "TK (Taman Kanak-kanak)", sd: "SD (Sekolah Dasar)",
  smp: "SMP (Sekolah Menengah Pertama)", sma: "SMA (Sekolah Menengah Atas)",
  smk: "SMK (Sekolah Menengah Kejuruan)", mi: "MI (Madrasah Ibtidaiyah)",
  mts: "MTS (Madrasah Tsanawiyah)", ma: "MA (Madrasah Aliyah)",
}

function InfoItem({ icon: Icon, label, value, isLink = false, href, iconBgClass, iconClass }: { icon: React.ElementType; label: string; value?: string | null; isLink?: boolean; href?: string; iconBgClass?: string; iconClass?: string }) {
  return (
    <div className="flex items-center space-x-3">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border", iconBgClass || "bg-primary/10 border-primary/20 text-primary")}>
        <Icon className={cn("w-4.5 h-4.5 stroke-[2]", iconClass)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[9px] font-black text-muted-foreground uppercase leading-none tracking-wider">{label}</p>
        {isLink && href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-xs xl:text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline mt-1 block truncate max-w-[180px] lg:max-w-[150px] xl:max-w-[200px]"
            title={value || ""}
          >
            {value ? value.replace(/^https?:\/\//, '') : "—"}
          </a>
        ) : (
          <p className="text-xs xl:text-sm font-bold text-foreground mt-1 truncate max-w-[180px] lg:max-w-[150px] xl:max-w-[200px]" title={value || ""}>
            {value || "—"}
          </p>
        )}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="text-left">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs xl:text-sm font-bold text-foreground leading-relaxed">{value || "—"}</p>
    </div>
  )
}

export default function LembagaPage() {
  const { data: sekolah, isLoading } = api.lembaga.getSekolah.useQuery()
  const updateSekolah = api.lembaga.updateSekolah.useMutation()
  const utils = api.useUtils()

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [logoPreview, setLogoPreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [sosmedUploading, setSosmedUploading] = useState<string | null>(null)
  const [sosmedPreviews, setSosmedPreviews] = useState<Record<string, string>>({})
  const logoInputRef = useRef<HTMLInputElement>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let uploadFile = file
    if (file.size > 300 * 1024) {
      uploadFile = new File([await compressImage(file, 300 * 1024, 800)], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
    }

    const previewUrl = URL.createObjectURL(uploadFile)
    setLogoPreview(previewUrl)

    setIsUploading(true)
    try {
      const url = await uploadToCloudinary(uploadFile, "logo-lembaga")
      setForm({ ...form, logo: url })
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload gagal")
    }
    setIsUploading(false)
  }

  const handleSosmedUpload = async (field: string, file: File) => {
    setSosmedUploading(field)
    setSosmedPreviews((prev) => ({ ...prev, [field]: URL.createObjectURL(file) }))
    try {
      const url = await uploadToCloudinary(file, "sosmed-lembaga")
      setForm((prev) => ({ ...prev, [field]: url }))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload gagal")
      setSosmedPreviews((prev) => ({ ...prev, [field]: "" }))
    }
    setSosmedUploading(null)
  }

  const openEdit = () => {
    if (sekolah) {
      setForm({
        namaSekolah: sekolah.namaSekolah || "",
        namaSingkat: sekolah.namaSingkat || "",
        npsn: sekolah.npsn || "",
        jenjang: sekolah.jenjang || "",
        alamat: sekolah.alamat || "",
        telepon: sekolah.telepon || "",
        emailSekolah: sekolah.emailSekolah || "",
        kepalaSekolah: sekolah.kepalaSekolah || "",
        penyelenggara: sekolah.penyelenggara || "",
        statusSekolah: sekolah.statusSekolah || "",
        kurikulum: sekolah.kurikulum || "",
        situsWeb: sekolah.situsWeb || "",
        whatsapp: sekolah.whatsapp || "",
        facebook: sekolah.facebook || "",
        fotoFacebook: sekolah.fotoFacebook || "",
        instagram: sekolah.instagram || "",
        fotoInstagram: sekolah.fotoInstagram || "",
        youtube: sekolah.youtube || "",
        fotoYoutube: sekolah.fotoYoutube || "",
        tiktok: sekolah.tiktok || "",
        fotoTiktok: sekolah.fotoTiktok || "",
        akreditasi: sekolah.akreditasi || "",
        logo: sekolah.logo || "",
      })
      setLogoPreview(sekolah.logo || "")
      setSosmedPreviews({
        fotoFacebook: sekolah.fotoFacebook || "",
        fotoInstagram: sekolah.fotoInstagram || "",
        fotoYoutube: sekolah.fotoYoutube || "",
        fotoTiktok: sekolah.fotoTiktok || "",
      })
    }
    setEditOpen(true)
  }

  const handleSave = async () => {
    const cleanForm = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== "")
    )
    await updateSekolah.mutateAsync(cleanForm)
    utils.lembaga.getSekolah.invalidate()
    setEditOpen(false)
  }


  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
          <Skeleton className="h-28 w-28 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-28 mx-auto" />
        </div>
        <div className="lg:col-span-3 glass-card rounded-3xl p-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        <div className="lg:col-span-2 flex w-full">
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 text-center flex flex-col items-center relative w-full justify-start">
            <button
              onClick={openEdit}
              className="absolute top-4 right-4 p-2 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-full transition-colors cursor-pointer border border-slate-200 dark:border-slate-800"
              title="Edit Lembaga"
            >
              <Pencil className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col items-center w-full mt-4">
              <div className="w-28 h-28 bg-slate-50 dark:bg-slate-90 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800 relative overflow-hidden group shadow-inner">
                {sekolah?.logo ? (
                  <img 
                    src={sekolah.logo} 
                    alt={sekolah.namaSekolah} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-400">
                    <School className="w-8 h-8 stroke-[2]" />
                  </div>
                )}
              </div>
              
              <h3 className="text-base md:text-lg font-extrabold text-foreground tracking-tight uppercase line-clamp-2 px-2">
                {sekolah?.namaSekolah}
              </h3>
              <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">
                NPSN: {sekolah?.npsn || "—"}
              </p>

              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {sekolah?.akreditasi && (
                  <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase rounded-full border border-amber-100 dark:border-amber-900/30 flex items-center">
                    <Star className="w-2.5 h-2.5 mr-1 fill-amber-500 text-amber-500" />
                    Akreditasi {sekolah.akreditasi}
                  </span>
                )}
                {sekolah?.kurikulum && (
                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase rounded-full border border-blue-100 dark:border-blue-900/30 flex items-center">
                    <BookOpen className="w-2.5 h-2.5 mr-1 stroke-[2.5]" />
                    {sekolah.kurikulum.split(' ')[1] || 'Merdeka'}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-border/60 my-5"></div>

            <div className="w-full space-y-4 text-left">
              <InfoItem 
                icon={User} 
                label="Kepala Sekolah" 
                value={sekolah?.kepalaSekolah}
                iconBgClass="bg-blue-50 dark:bg-blue-950/30 border-blue-100/50 dark:border-blue-900/30 text-blue-500 dark:text-blue-400"
              />
              <InfoItem 
                icon={Mail} 
                label="Email Resmi" 
                value={sekolah?.emailSekolah}
                iconBgClass="bg-rose-50 dark:bg-rose-950/30 border-rose-100/50 dark:border-rose-900/30 text-rose-500 dark:text-rose-400"
              />
              <InfoItem 
                icon={Globe} 
                label="Situs Web" 
                value={sekolah?.situsWeb} 
                isLink={true} 
                href={sekolah?.situsWeb ? (sekolah.situsWeb.startsWith("http") ? sekolah.situsWeb : `https://${sekolah.situsWeb}`) : undefined}
                iconBgClass="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100/50 dark:border-emerald-900/30 text-emerald-500 dark:text-emerald-400"
              />
              <InfoItem 
                icon={MessageCircle} 
                label="WhatsApp Admin" 
                value={sekolah?.whatsapp} 
                isLink={true} 
                href={sekolah?.whatsapp ? `https://wa.me/${sekolah.whatsapp.replace(/\D/g, "")}` : undefined}
                iconBgClass="bg-teal-50 dark:bg-teal-950/30 border-teal-100/50 dark:border-teal-900/30 text-teal-500 dark:text-teal-400"
              />
            </div>
          </div>
        </div>

      <div className="lg:col-span-3 flex flex-col gap-5 justify-between w-full">
          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 flex-grow flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
                <h3 className="text-xs font-black text-foreground uppercase tracking-[0.15em]">
                  Detail Identitas Lembaga
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <DetailRow label="Jenjang Pendidikan" value={sekolah?.jenjang ? (jenjangMap[sekolah.jenjang] || sekolah.jenjang) : "—"} />
                <DetailRow label="Status Sekolah" value={sekolah?.statusSekolah} />
                <DetailRow label="Penyelenggara" value={sekolah?.penyelenggara} />
                <DetailRow label="Kurikulum" value={sekolah?.kurikulum} />
                <DetailRow label="Kontak / No. Telp" value={sekolah?.telepon} />
                <DetailRow label="Akreditasi" value={sekolah?.akreditasi ? `Akreditasi ${sekolah.akreditasi}` : "—"} />
                <div className="sm:col-span-2">
                  <DetailRow label="Alamat Lengkap" value={sekolah?.alamat} />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-start">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  Status: Data Tersimpan
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[26px] border border-slate-200/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
              <h3 className="text-xs font-black text-foreground uppercase tracking-[0.15em]">
                Media Sosial Resmi
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <a
                href={sekolah?.instagram ? (sekolah.instagram.startsWith("http") ? sekolah.instagram : `https://${sekolah.instagram}`) : "#"}
                target={sekolah?.instagram ? "_blank" : "_self"}
                rel="noreferrer"
                className={cn(
                  "bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-800 hover:bg-card hover:shadow-md transition-all group min-h-[75px] w-full text-center select-none",
                  !sekolah?.instagram && "opacity-50 grayscale cursor-not-allowed pointer-events-none"
                )}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-white mb-1.5 shadow-sm bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 flex-shrink-0">
                  {sekolah?.fotoInstagram ? (
                    <img src={sekolah.fotoInstagram} alt="Instagram" className="w-full h-full object-cover" />
                  ) : (
                    <InstagramIcon className="w-4 h-4 stroke-[2.5]" />
                  )}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Instagram</span>
              </a>

              <a
                href={sekolah?.facebook ? (sekolah.facebook.startsWith("http") ? sekolah.facebook : `https://${sekolah.facebook}`) : "#"}
                target={sekolah?.facebook ? "_blank" : "_self"}
                rel="noreferrer"
                className={cn(
                  "bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-800 hover:bg-card hover:shadow-md transition-all group min-h-[75px] w-full text-center select-none",
                  !sekolah?.facebook && "opacity-50 grayscale cursor-not-allowed pointer-events-none"
                )}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-white mb-1.5 shadow-sm bg-blue-600 flex-shrink-0">
                  {sekolah?.fotoFacebook ? (
                    <img src={sekolah.fotoFacebook} alt="Facebook" className="w-full h-full object-cover" />
                  ) : (
                    <FacebookIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Facebook</span>
              </a>

              <a
                href={sekolah?.tiktok ? (sekolah.tiktok.startsWith("http") ? sekolah.tiktok : `https://${sekolah.tiktok}`) : "#"}
                target={sekolah?.tiktok ? "_blank" : "_self"}
                rel="noreferrer"
                className={cn(
                  "bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-800 hover:bg-card hover:shadow-md transition-all group min-h-[75px] w-full text-center select-none",
                  !sekolah?.tiktok && "opacity-50 grayscale cursor-not-allowed pointer-events-none"
                )}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-white mb-1.5 shadow-sm bg-black dark:bg-slate-800 flex-shrink-0">
                  {sekolah?.fotoTiktok ? (
                    <img src={sekolah.fotoTiktok} alt="TikTok" className="w-full h-full object-cover" />
                  ) : (
                    <TikTokIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">TikTok</span>
              </a>

              <a
                href={sekolah?.youtube ? (sekolah.youtube.startsWith("http") ? sekolah.youtube : `https://${sekolah.youtube}`) : "#"}
                target={sekolah?.youtube ? "_blank" : "_self"}
                rel="noreferrer"
                className={cn(
                  "bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-800 hover:bg-card hover:shadow-md transition-all group min-h-[75px] w-full text-center select-none",
                  !sekolah?.youtube && "opacity-50 grayscale cursor-not-allowed pointer-events-none"
                )}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-white mb-1.5 shadow-sm bg-rose-600 flex-shrink-0">
                  {sekolah?.fotoYoutube ? (
                    <img src={sekolah.fotoYoutube} alt="YouTube" className="w-full h-full object-cover" />
                  ) : (
                    <YoutubeIcon className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">YouTube</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto p-6 relative">
            <DialogHeader className="text-left mb-4">
              <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">Edit Profil Lembaga</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-24 w-24 rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden clickable hover:border-primary/50 transition-colors"
                onClick={() => logoInputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                ) : logoPreview ? (
                  <img src={logoPreview} alt="Logo sekolah" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Camera className="h-6 w-6" />
                    <span className="text-[10px] font-medium">Upload</span>
                  </div>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              {logoPreview && (
                <button type="button" onClick={() => { setLogoPreview(""); setForm({ ...form, logo: "" }) }} className="text-xs text-destructive hover:underline cursor-pointer">
                  Hapus foto
                </button>
              )}
              <p className="text-xs text-muted-foreground">Klik lingkaran untuk upload foto/logo sekolah</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Sekolah</Label>
                <Input value={form.namaSekolah || ""} onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Alias / Nama Singkat</Label>
                <Input value={form.namaSingkat || ""} onChange={(e) => setForm({ ...form, namaSingkat: e.target.value })} placeholder="Contoh: SMAN 1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NPSN</Label>
                <Input value={form.npsn || ""} onChange={(e) => setForm({ ...form, npsn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jenjang</Label>
                <Select value={form.jenjang} onValueChange={(v) => v && setForm({ ...form, jenjang: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(jenjangMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.alamat || ""} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input value={form.telepon || ""} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.emailSekolah || ""} onChange={(e) => setForm({ ...form, emailSekolah: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kepala Sekolah</Label>
                <Input value={form.kepalaSekolah || ""} onChange={(e) => setForm({ ...form, kepalaSekolah: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Akreditasi</Label>
                <Input value={form.akreditasi || ""} onChange={(e) => setForm({ ...form, akreditasi: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status Sekolah</Label>
                <Input value={form.statusSekolah || ""} onChange={(e) => setForm({ ...form, statusSekolah: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Penyelenggara</Label>
                <Input value={form.penyelenggara || ""} onChange={(e) => setForm({ ...form, penyelenggara: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kurikulum</Label>
                <Input value={form.kurikulum || ""} onChange={(e) => setForm({ ...form, kurikulum: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Situs Web</Label>
                <Input value={form.situsWeb || ""} onChange={(e) => setForm({ ...form, situsWeb: e.target.value })} placeholder="https://example.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Admin (nomor tanpa +62)</Label>
              <Input value={form.whatsapp || ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value.replace(/\D/g, "") })} placeholder="81234567890" maxLength={13} />
              <p className="text-xs text-muted-foreground">Format: 8xxxxxxxxxx (akan digunakan untuk link WhatsApp di header)</p>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sosial Media</Label>
              {[
                { key: "facebook", label: "Facebook", fotoKey: "fotoFacebook", color: "#1877F2" },
                { key: "instagram", label: "Instagram", fotoKey: "fotoInstagram", color: "#E4405F" },
                { key: "youtube", label: "YouTube", fotoKey: "fotoYoutube", color: "#FF0000" },
                { key: "tiktok", label: "TikTok", fotoKey: "fotoTiktok", color: "#000000" },
              ].map((sosmed) => (
                <div key={sosmed.key} className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label>{sosmed.label}</Label>
                    <Input value={form[sosmed.key] || ""} onChange={(e) => setForm({ ...form, [sosmed.key]: e.target.value })} placeholder={`https://${sosmed.key}.com/...`} />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="h-10 w-10 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) handleSosmedUpload(sosmed.fotoKey, file)
                        }
                        input.click()
                      }}
                    >
                      {sosmedUploading === sosmed.fotoKey ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : sosmedPreviews[sosmed.fotoKey] ? (
                        <img src={sosmedPreviews[sosmed.fotoKey]} alt={sosmed.label} className="w-full h-full object-cover" />
                      ) : (
                        <Upload className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {sosmedPreviews[sosmed.fotoKey] && (
                      <button
                        type="button"
                        onClick={() => {
                          setSosmedPreviews((prev) => ({ ...prev, [sosmed.fotoKey]: "" }))
                          setForm((prev) => ({ ...prev, [sosmed.fotoKey]: "" }))
                        }}
                        className="text-[10px] text-destructive hover:underline cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateSekolah.isPending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed mt-6"
            >
              {updateSekolah.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Simpan</span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
