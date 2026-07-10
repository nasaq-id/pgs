"use client"

import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { uploadToCloudinary } from "@/lib/cloudinary"
import { toast } from "sonner"
import { Loader2, Upload, X, User, Eye, EyeOff } from "lucide-react"
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
      const url = await uploadToCloudinary(file, "avatar-guru")
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
        <div className="space-y-1">
          <Label>NIP/NUPTK</Label>
          <Input
            value={(form.nipnuptk as string) || ""}
            onChange={(e) => onChange("nipnuptk", e.target.value)}
            placeholder="Bisa diisi jika belum punya"
          />
        </div>
        <div className="space-y-1">
          <Label>NIK <span className="text-destructive">*</span></Label>
          <Input
            value={(form.nik as string) || ""}
            onChange={(e) => onChange("nik", e.target.value)}
            placeholder="16 digit angka"
            maxLength={16}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
          <Input
            value={(form.namaLengkap as string) || ""}
            onChange={(e) => onChange("namaLengkap", e.target.value)}
            placeholder="Contoh: Ahmad Fauzi, S.Pd."
          />
        </div>
        <div className="space-y-1">
          <Label>Jenis Kelamin <span className="text-destructive">*</span></Label>
          <Select
            value={(form.jenisKelamin as string) || ""}
            onValueChange={(v) => onChange("jenisKelamin", v)}
            options={[
              { value: "L", label: "Laki-laki" },
              { value: "P", label: "Perempuan" },
            ]}
          >
            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Laki-laki</SelectItem>
              <SelectItem value="P">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tempat Lahir</Label>
          <Input
            value={(form.tempatLahir as string) || ""}
            onChange={(e) => onChange("tempatLahir", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Tanggal Lahir</Label>
          <Input
            type="date"
            value={(form.tanggalLahir as string) || ""}
            onChange={(e) => onChange("tanggalLahir", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>No HP/Whatsapp</Label>
          <Input
            value={(form.noHp as string) || ""}
            onChange={(e) => onChange("noHp", e.target.value)}
            placeholder="08xx"
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Email</Label>
          <Input
            type="email"
            value={(form.email as string) || ""}
            onChange={(e) => onChange("email", e.target.value)}
            placeholder="harus mengandung tanda @"
          />
        </div>
        <div className="space-y-1">
          <Label>Username <span className="text-destructive">*</span></Label>
          <Input
            value={(form.usernameGuru as string) || ""}
            onChange={(e) => onChange("usernameGuru", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Password <span className="text-destructive">*</span></Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={(form.passwordGuru as string) || ""}
              onChange={(e) => onChange("passwordGuru", e.target.value)}
              className="pr-10"
            />
            <Tooltip>
              <TooltipTrigger
                delay={0}
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
