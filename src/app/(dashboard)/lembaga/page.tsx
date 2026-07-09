"use client"

import { useState, useRef } from "react"
import { User, Mail, Globe, ImageIcon, Pencil, MessageCircle, Camera, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
import { uploadToCloudinary } from "@/lib/cloudinary"
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

function InfoItem({ icon: Icon, label, value, isLink = false, href }: { icon: React.ElementType; label: string; value?: string | null; isLink?: boolean; href?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        {isLink && href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline break-all">
            {value || "—"}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground break-all">{value || "—"}</p>
        )}
        </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
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

  const compressImage = (file: File, maxSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        let { width, height } = img
        const MAX_DIM = 800
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = (height / width) * MAX_DIM; width = MAX_DIM }
          else { width = (width / height) * MAX_DIM; height = MAX_DIM }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(img, 0, 0, width, height)

        const tryCompress = (quality: number) => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Gagal kompres")); return }
            if (blob.size <= maxSize || quality <= 0.1) resolve(blob)
            else tryCompress(quality - 0.1)
          }, "image/jpeg", quality)
        }
        tryCompress(0.9)
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let uploadFile = file
    if (file.size > 300 * 1024) {
      uploadFile = new File([await compressImage(file, 300 * 1024)], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
    }

    const previewUrl = URL.createObjectURL(uploadFile)
    setLogoPreview(previewUrl)

    setIsUploading(true)
    try {
      const presigned = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: uploadFile.name }),
      })
      const { signedUrl, publicUrl, error } = await presigned.json()
      if (!presigned.ok) throw new Error(error || "Gagal mendapatkan URL upload")

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      })
      if (!uploadRes.ok) throw new Error("Gagal upload ke storage")

      setForm({ ...form, logo: publicUrl })
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 space-y-4">
          <Skeleton className="h-28 w-28 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-28 mx-auto" />
        </div>
        <div className="lg:col-span-3 glass-card rounded-2xl p-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <Card className="lg:col-span-2 glass-card rounded-2xl">
        <CardContent className="flex flex-col items-center gap-5 pt-6">
          <div className="h-28 w-28 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
            {sekolah?.logo ? (
              <img src={sekolah.logo} alt="Logo sekolah" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-foreground uppercase tracking-wide">
            {sekolah?.namaSekolah || "—"}
          </h2>
          {sekolah?.npsn && (
            <p className="text-sm font-semibold text-primary mt-1">NPSN: {sekolah.npsn}</p>
          )}
        </div>
        {(sekolah?.akreditasi || sekolah?.kurikulum) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {sekolah?.akreditasi && (
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-yellow-400 text-yellow-600 bg-yellow-50">
                AKREDITASI {sekolah.akreditasi}
              </span>
            )}
            {sekolah?.kurikulum && (
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-primary/40 text-primary bg-primary/5">
                {sekolah.kurikulum}
              </span>
            )}
          </div>
        )}
        <div className="w-full border-t border-border" />
        <div className="w-full space-y-4">
          <InfoItem icon={User} label="Kepala Sekolah" value={sekolah?.kepalaSekolah} />
          <InfoItem icon={Mail} label="Email Resmi" value={sekolah?.emailSekolah} />
          <InfoItem icon={Globe} label="Situs Web" value={sekolah?.situsWeb} isLink={true} href={sekolah?.situsWeb ? (sekolah.situsWeb.startsWith("http") ? sekolah.situsWeb : `https://${sekolah.situsWeb}`) : undefined} />
          <InfoItem icon={MessageCircle} label="WhatsApp" value={sekolah?.whatsapp} isLink={true} href={sekolah?.whatsapp ? `https://wa.me/${sekolah.whatsapp.replace(/\D/g, "")}` : undefined} />
          {(sekolah?.facebook || sekolah?.instagram || sekolah?.youtube || sekolah?.tiktok) && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Sosial Media</p>
              <div className="flex items-center gap-2">
                {sekolah?.facebook && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a href={sekolah.facebook.startsWith("http") ? sekolah.facebook : `https://${sekolah.facebook}`} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-all duration-200" />
                      }
                    >
                      {sekolah.fotoFacebook ? (
                        <img src={sekolah.fotoFacebook} alt="Facebook" className="w-full h-full object-cover" />
                      ) : (
                        <FacebookIcon className="h-4 w-4 text-[#1877F2]" />
                      )}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>Facebook</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                )}
                {sekolah?.instagram && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a href={sekolah.instagram.startsWith("http") ? sekolah.instagram : `https://${sekolah.instagram}`} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#E4405F]/10 hover:bg-[#E4405F]/20 transition-all duration-200" />
                      }
                    >
                      {sekolah.fotoInstagram ? (
                        <img src={sekolah.fotoInstagram} alt="Instagram" className="w-full h-full object-cover" />
                      ) : (
                        <InstagramIcon className="h-4 w-4 text-[#E4405F]" />
                      )}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>Instagram</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                )}
                {sekolah?.youtube && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a href={sekolah.youtube.startsWith("http") ? sekolah.youtube : `https://${sekolah.youtube}`} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-[#FF0000]/10 hover:bg-[#FF0000]/20 transition-all duration-200" />
                      }
                    >
                      {sekolah.fotoYoutube ? (
                        <img src={sekolah.fotoYoutube} alt="YouTube" className="w-full h-full object-cover" />
                      ) : (
                        <YoutubeIcon className="h-4 w-4 text-[#FF0000]" />
                      )}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>YouTube</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                )}
                {sekolah?.tiktok && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <a href={sekolah.tiktok.startsWith("http") ? sekolah.tiktok : `https://${sekolah.tiktok}`} target="_blank" rel="noopener noreferrer" className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center bg-neutral-900/10 dark:bg-neutral-100/10 hover:bg-neutral-900/20 dark:hover:bg-neutral-100/20 transition-all duration-200" />
                      }
                    >
                      {sekolah.fotoTiktok ? (
                        <img src={sekolah.fotoTiktok} alt="TikTok" className="w-full h-full object-cover" />
                      ) : (
                        <TikTokIcon className="h-4 w-4 text-neutral-900 dark:text-neutral-100" />
                      )}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>TikTok</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                )}
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3 glass-card rounded-2xl relative overflow-visible">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon" onClick={openEdit} className="absolute top-3 right-5 h-8 w-8 rounded-xl" />}>
            <Pencil className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipPositioner>
              <TooltipPopup>Edit Profil Lembaga</TooltipPopup>
            </TooltipPositioner>
          </TooltipPortal>
        </Tooltip>
        <CardHeader className="flex-row items-center gap-3 border-b border-border">
          <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
          <CardTitle className="text-xs font-black uppercase tracking-widest">
            Detail Identitas Lembaga
          </CardTitle>
        </CardHeader>
        <CardContent>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 flex-1">
          <DetailRow label="Jenjang" value={sekolah?.jenjang ? (jenjangMap[sekolah.jenjang] || sekolah.jenjang) : "—"} />
          <DetailRow label="Status Sekolah" value={sekolah?.statusSekolah} />
          <DetailRow label="Penyelenggara" value={sekolah?.penyelenggara} />
          <DetailRow label="Kurikulum" value={sekolah?.kurikulum} />
          <DetailRow label="Kontak / No. Telp" value={sekolah?.telepon} />
          <DetailRow label="Akreditasi" value={sekolah?.akreditasi} />
          <div className="sm:col-span-2">
            <DetailRow label="Alamat Lengkap" value={sekolah?.alamat} />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Status: Data Tersimpan
          </span>
        </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profil Lembaga</DialogTitle>
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
            <div className="space-y-2">
              <Label>Nama Sekolah</Label>
              <Input value={form.namaSekolah || ""} onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })} />
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
            <Button onClick={handleSave} className="w-full" disabled={updateSekolah.isPending}>
              {updateSekolah.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
