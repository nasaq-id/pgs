"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Camera, Mail, Shield, Building2, Phone, MapPin, BookOpen, Cake, User, Users, Award, CalendarDays, FileText, Clock, ChevronRight, Edit3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/trpc/client"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { uploadToCloudinary } from "@/lib/cloudinary"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin_sekolah: "Admin Sekolah",
  guru: "Guru & Tendik",
  siswa: "Siswa",
  tu: "Tata Usaha",
  yayasan: "Yayasan",
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/40 last:border-0">
      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value || "-"}</p>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="neumo-card bg-background rounded-3xl p-5 space-y-1">
      {title && (
        <div className="flex items-center gap-2 pb-3 mb-1 border-b border-border/40">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{title}</h3>
        </div>
      )}
      {children}
    </div>
  )
}

export default function ProfilPage() {
  const { data: session, update: updateSession } = useSession()
  const utils = api.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const user = session?.user
  const { data: profile, isLoading } = api.profil.getProfile.useQuery()
  const p = profile as any
  const role = user?.role || ""
  const roleData = p?.roleData as Record<string, unknown> | undefined

  const [editOpen, setEditOpen] = useState(false)
  const [emailInput, setEmailInput] = useState("")
  const [phoneInput, setPhoneInput] = useState("")
  const [alamatInput, setAlamatInput] = useState("")
  const [noHpOrtuInput, setNoHpOrtuInput] = useState("")
  const [pendidikanInput, setPendidikanInput] = useState("")

  const handleOpenEdit = () => {
    setEmailInput(p?.email || p?.emailSiswa || "")
    setPhoneInput(p?.phone || p?.noHp || p?.noHpWhatsapp || "")
    setAlamatInput(p?.alamat || "")
    setNoHpOrtuInput(p?.noHpOrtu || "")
    setPendidikanInput(p?.pendidikanTerakhir || "")
    setEditOpen(true)
  }

  const updateProfileMutation = api.profil.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profil berhasil diperbarui!")
      utils.profil.getProfile.invalidate()
      updateSession()
      setEditOpen(false)
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memperbarui profil.")
    }
  })

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateProfileMutation.mutateAsync({
      email: emailInput || undefined,
      phone: phoneInput || undefined,
      alamat: alamatInput || undefined,
      noHpOrtu: role === "siswa" ? noHpOrtuInput || undefined : undefined,
      pendidikanTerakhir: role === "guru" ? pendidikanInput || undefined : undefined,
    })
  }

  const updatePhoto = api.profil.updateProfilePhoto.useMutation({
    onSuccess: (res) => {
      utils.profil.getProfile.invalidate()
      updateSession()
    },
  })

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const sekolahId = session?.user?.sekolahId || "super_admin"
      const url = await uploadToCloudinary(file, "profile-photo", { 
        maxSize: 200 * 1024, 
        maxDim: 500, 
        sekolahId 
      })
      await updatePhoto.mutateAsync({ photo: url })
    } catch (err) {
      console.error("Upload error:", err)
    } finally {
      setUploading(false)
    }
  }

  const photoUrl = user?.photo || p?.photo
  const displayName = p?.namaLengkap || p?.firstName || user?.name || ""

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profil Saya</h2>
          <p className="text-muted-foreground">Informasi biodata Anda</p>
        </div>
        <Button onClick={handleOpenEdit} className="rounded-2xl gap-2 font-semibold shadow-md">
          <Edit3 className="size-4" />
          Edit Profil
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left - Photo */}
        <div className="neumo-card bg-background rounded-3xl p-6 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div
              onClick={handlePhotoClick}
              className="h-36 w-36 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden ring-4 ring-border/50 cursor-pointer group relative"
            >
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-primary">
                  {displayName[0] || "?"}
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <h3 className="text-lg font-bold text-foreground">{displayName || "-"}</h3>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary">
            <Shield className="h-3 w-3" />
            {roleLabels[role] || role}
          </span>
          <p className="text-xs text-muted-foreground mt-3">Klik foto untuk mengganti</p>
        </div>

        {/* Right - Biodata */}
        <div className="space-y-6">
          {/* Data Akun */}
          <SectionCard title="Data Akun">
            <InfoRow icon={Mail} label="Email" value={p?.email || p?.emailSiswa as string} />
            <InfoRow icon={Phone} label="No. Handphone" value={p?.phone as string || p?.noHp as string || p?.noHpWhatsapp as string} />
            <InfoRow icon={Building2} label="Sekolah" value={p?.sekolah?.nama as string} />
            <InfoRow icon={User} label="Username" value={role === "siswa" ? p?.usernameSiswa as string : p?.usernameGuru as string} />
          </SectionCard>

          {/* Data Pribadi - role specific */}
          {role === "siswa" && (
            <SectionCard title="Data Pribadi">
              <InfoRow icon={FileText} label="NISN" value={p?.nisn as string} />
              <InfoRow icon={FileText} label="NIS Lokal" value={p?.nisLokal as string} />
              <InfoRow icon={User} label="Nama Lengkap" value={p?.namaLengkap as string} />
              <InfoRow icon={Users} label="Jenis Kelamin" value={p?.jenisKelamin as string === "L" ? "Laki-laki" : p?.jenisKelamin as string === "P" ? "Perempuan" : "-"} />
              <InfoRow icon={Cake} label="Tempat, Tanggal Lahir" value={p?.tempatLahir && p?.tanggalLahir ? `${p?.tempatLahir}, ${format(new Date(p?.tanggalLahir as string), "d MMMM yyyy", { locale: id })}` : p?.tempatLahir as string || (p?.tanggalLahir ? format(new Date(p?.tanggalLahir as string), "d MMMM yyyy", { locale: id }) : "-")} />
              <InfoRow icon={BookOpen} label="Agama" value={p?.agama as string} />
              <InfoRow icon={Award} label="Rombel" value={(roleData?.kelas as Record<string, unknown>)?.namaKelas as string} />
              <InfoRow icon={MapPin} label="Alamat" value={p?.alamat as string} />
              <InfoRow icon={Phone} label="No. HP Orang Tua" value={p?.noHpOrtu as string} />
              <InfoRow icon={Clock} label="Status" value={p?.status as string} />
            </SectionCard>
          )}

          {role === "guru" && (
            <>
              <SectionCard title="Data Pribadi">
                <InfoRow icon={FileText} label="NIP/NUPTK" value={p?.nipnuptk as string} />
                <InfoRow icon={FileText} label="NIK" value={p?.nik as string} />
                <InfoRow icon={User} label="Nama Lengkap" value={p?.namaLengkap as string} />
                <InfoRow icon={Users} label="Jenis Kelamin" value={p?.jenisKelamin as string === "L" ? "Laki-laki" : p?.jenisKelamin as string === "P" ? "Perempuan" : "-"} />
                <InfoRow icon={Cake} label="Tempat, Tanggal Lahir" value={p?.tempatLahir && p?.tanggalLahir ? `${p?.tempatLahir}, ${format(new Date(p?.tanggalLahir as string), "d MMMM yyyy", { locale: id })}` : p?.tempatLahir as string || (p?.tanggalLahir ? format(new Date(p?.tanggalLahir as string), "d MMMM yyyy", { locale: id }) : "-")} />
                <InfoRow icon={MapPin} label="Alamat" value={p?.alamat as string} />
                <InfoRow icon={Phone} label="No. HP" value={p?.noHp as string} />
              </SectionCard>
              <SectionCard title="Data Kepegawaian">
                <InfoRow icon={BookOpen} label="Pendidikan Terakhir" value={p?.pendidikanTerakhir as string} />
                <InfoRow icon={Clock} label="Status Kepegawaian" value={p?.statusKepegawaian as string} />
                <InfoRow icon={Award} label="Tugas Utama" value={p?.tugasUtama as string} />
                <InfoRow icon={Award} label="Tugas Tambahan" value={p?.tugasTambahan as string} />
                <InfoRow icon={CalendarDays} label="Mulai Bertugas" value={p?.mulaiBertugas ? format(new Date(p?.mulaiBertugas as string), "d MMMM yyyy", { locale: id }) : "-"} />
              </SectionCard>
            </>
          )}

          {!["siswa", "guru"].includes(role) && (
            <SectionCard title="Data Admin">
              <InfoRow icon={User} label="Nama Depan" value={p?.firstName as string} />
              <InfoRow icon={User} label="Nama Belakang" value={p?.lastName as string} />
              <InfoRow icon={Mail} label="Email" value={p?.email as string} />
              <InfoRow icon={Shield} label="Role" value={roleLabels[role] || role} />
              <InfoRow icon={Phone} label="No. Handphone" value={p?.phone as string} />
              <InfoRow icon={Building2} label="Sekolah" value={p?.sekolah?.nama as string} />
            </SectionCard>
          )}
        </div>
      </div>

      {/* Dialog Edit Profil */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md rounded-[28px] border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">Edit Profil Saya</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-semibold mt-1">
              Perbarui informasi kontak dan biodata Anda secara mandiri di bawah ini.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Email</Label>
              <Input
                id="email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Alamat email Anda"
                className="rounded-xl border-border bg-slate-50/50 dark:bg-slate-950/30"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-semibold text-slate-700 dark:text-slate-300 text-xs">No. Handphone</Label>
              <Input
                id="phone"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Nomor handphone aktif"
                className="rounded-xl border-border bg-slate-50/50 dark:bg-slate-950/30"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alamat" className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Alamat Tempat Tinggal</Label>
              <Textarea
                id="alamat"
                value={alamatInput}
                onChange={(e) => setAlamatInput(e.target.value)}
                placeholder="Alamat lengkap tempat tinggal saat ini"
                className="rounded-xl border-border bg-slate-50/50 dark:bg-slate-950/30 min-h-[80px]"
              />
            </div>

            {role === "siswa" && (
              <div className="space-y-1.5">
                <Label htmlFor="noHpOrtu" className="font-semibold text-slate-700 dark:text-slate-300 text-xs">No. HP Orang Tua / Wali</Label>
                <Input
                  id="noHpOrtu"
                  value={noHpOrtuInput}
                  onChange={(e) => setNoHpOrtuInput(e.target.value)}
                  placeholder="Nomor handphone orang tua/wali"
                  className="rounded-xl border-border bg-slate-50/50 dark:bg-slate-950/30"
                />
              </div>
            )}

            {role === "guru" && (
              <div className="space-y-1.5">
                <Label htmlFor="pendidikan" className="font-semibold text-slate-700 dark:text-slate-300 text-xs">Pendidikan Terakhir</Label>
                <Input
                  id="pendidikan"
                  value={pendidikanInput}
                  onChange={(e) => setPendidikanInput(e.target.value)}
                  placeholder="Pendidikan terakhir (misal: S1 Pendidikan)"
                  className="rounded-xl border-border bg-slate-50/50 dark:bg-slate-950/30"
                />
              </div>
            )}

            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl font-semibold text-xs py-2 h-9">
                Batal
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending} className="rounded-xl font-semibold text-xs gap-1.5 py-2 h-9 shadow-sm shadow-primary/20">
                {updateProfileMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
