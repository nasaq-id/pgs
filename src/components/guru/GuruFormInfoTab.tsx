"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { toast } from "sonner"
import { Loader2, Upload, X, User, Eye, EyeOff, FileText, Smartphone, Mail, Calendar, Key } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

interface Props {
  form: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export default function GuruFormInfoTab({ form, onChange }: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const fotoUrl = (form.foto as string) || ""

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, "avatar-guru", { maxSize: 200 * 1024, maxDim: 500 })
      onChange("foto", url)
      toast.success("Foto berhasil diunggah!")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      {/* Foto */}
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted relative">
          {uploading ? (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
          {fotoUrl ? (
            <img src={fotoUrl} alt="Foto" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploading ? "Uploading..." : "Upload Foto"}
          </Button>
          {fotoUrl && !uploading && (
            <Button type="button" size="sm" variant="outline" onClick={() => onChange("foto", "")}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">NIP/NUPTK</Label>
          <div className="relative">
            <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.nipnuptk as string) || ""}
              onChange={(e) => onChange("nipnuptk", e.target.value)}
              className="pl-10 w-full"
              placeholder="Bisa diisi jika belum punya"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">NIK <span className="text-destructive">*</span></Label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.nik as string) || ""}
              onChange={(e) => onChange("nik", e.target.value)}
              className="pl-10 w-full"
              placeholder="16 digit angka"
              maxLength={16}
            />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Nama Lengkap <span className="text-destructive">*</span></Label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.namaLengkap as string) || ""}
              onChange={(e) => onChange("namaLengkap", e.target.value)}
              className="pl-10 w-full"
              placeholder="Contoh: Ahmad Fauzi, S.Pd."
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Jenis Kelamin <span className="text-destructive">*</span></Label>
          <Select
            value={(form.jenisKelamin as string) || ""}
            onValueChange={(v) => onChange("jenisKelamin", v)}
          >
            <SelectTrigger className="w-full rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Laki-laki</SelectItem>
              <SelectItem value="P">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Tempat Lahir</Label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.tempatLahir as string) || ""}
              onChange={(e) => onChange("tempatLahir", e.target.value)}
              className="pl-10 w-full"
              placeholder="Contoh: Jakarta"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Tanggal Lahir</Label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="date"
              value={(form.tanggalLahir as string) || ""}
              onChange={(e) => onChange("tanggalLahir", e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">No HP/Whatsapp</Label>
          <div className="relative">
            <Smartphone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.noHp as string) || ""}
              onChange={(e) => onChange("noHp", e.target.value)}
              className="pl-10 w-full"
              placeholder="08xx"
            />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Email</Label>
          <div className="relative">
            <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              value={(form.email as string) || ""}
              onChange={(e) => onChange("email", e.target.value)}
              className="pl-10 w-full"
              placeholder="harus mengandung tanda @"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Username <span className="text-destructive">*</span></Label>
          <div className="relative">
            <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.usernameGuru as string) || ""}
              onChange={(e) => onChange("usernameGuru", e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Password <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"}
              value={(form.passwordGuru as string) || ""}
              onChange={(e) => onChange("passwordGuru", e.target.value)}
              className="pl-10 pr-10 w-full"
            />
            <Tooltip>
              <TooltipTrigger
                delay={0}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipPositioner>
                  <TooltipPopup>{showPassword ? "Sembunyikan password" : "Tampilkan password"}</TooltipPopup>
                </TooltipPositioner>
              </TooltipPortal>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}
