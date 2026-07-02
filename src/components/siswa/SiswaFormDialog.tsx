"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Camera, User, Eye, EyeOff } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

interface SiswaFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: any | null
  onSuccess: () => void
}

const defaultForm = {
  nisn: "",
  nisLokal: "",
  namaLengkap: "",
  jenisKelamin: "",
  tempatLahir: "",
  tanggalLahir: "",
  nik: "",
  agama: "",
  alamat: "",
  noHpWhatsapp: "",
  emailSiswa: "",
  status: "aktif",
  kewarganegaraan: "WNI",
  hobi: "",
  citacita: "",
  jumlahSaudara: "",
  anakKe: "",
  pembiayaanSekolah: "",
  noKartuKeluarga: "",
  namaKepalaKeluarga: "",
  namaAyah: "",
  statusAyah: "Masih Hidup",
  kewarganegaraanAyah: "WNI",
  nikAyah: "",
  tempatLahirAyah: "",
  tanggalLahirAyah: "",
  pendidikanAyah: "",
  pekerjaanAyah: "",
  penghasilanAyah: "",
  noHpAyah: "",
  alamatLengkapAyah: "",
  namaIbu: "",
  statusIbu: "Masih Hidup",
  kewarganegaraanIbu: "WNI",
  nikIbu: "",
  tempatLahirIbu: "",
  tanggalLahirIbu: "",
  pendidikanIbu: "",
  pekerjaanIbu: "",
  penghasilanIbu: "",
  noHpIbu: "",
  alamatLengkapIbu: "",
  statusWali: "",
  namaWali: "",
  kewarganegaraanWali: "WNI",
  nikWali: "",
  tempatLahirWali: "",
  tanggalLahirWali: "",
  pendidikanWali: "",
  pekerjaanWali: "",
  penghasilanWali: "",
  noHpWali: "",
  alamatLengkapWali: "",
  alamatIbuSamaDenganAyah: "",
  statusKepemilikanRumahAyah: "",
  provinsiAyah: "",
  kabupatenKotaAyah: "",
  kecamatanAyah: "",
  kelurahanDesaAyah: "",
  rtAyah: "",
  rwAyah: "",
  kodePosAyah: "",
  statusKepemilikanRumahIbu: "",
  provinsiIbu: "",
  kabupatenKotaIbu: "",
  kecamatanIbu: "",
  kelurahanDesaIbu: "",
  rtIbu: "",
  rwIbu: "",
  kodePosIbu: "",
  statusKepemilikanRumahWali: "",
  provinsiWali: "",
  kabupatenKotaWali: "",
  kecamatanWali: "",
  kelurahanDesaWali: "",
  rtWali: "",
  rwWali: "",
  kodePosWali: "",
  statusTempatTinggalSiswa: "",
  jarakTempatTinggalKeSekolah: "",
  transportasiKeSekolah: "",
  waktuTempuhKeSekolah: "",
  usernameSiswa: "",
  passwordSiswa: "",
  sekolahAsal: "",
  diterimaPadaTanggal: "",
}

export default function SiswaFormDialog({ open, onOpenChange, initialData, onSuccess }: SiswaFormDialogProps) {
  const [form, setForm] = useState({ ...defaultForm })
  const [activeTab, setActiveTab] = useState("siswa")
  const [fotoUrl, setFotoUrl] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const createMutation = api.siswa.create.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil ditambahkan")
      onSuccess()
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan data siswa"),
  })

  const updateMutation = api.siswa.update.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil diperbarui")
      onSuccess()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui data siswa"),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEdit = !!initialData

  const isAyahNotAlive = form.statusAyah === "Sudah Meninggal" || form.statusAyah === "Tidak Diketahui"
  const isIbuNotAlive = form.statusIbu === "Sudah Meninggal" || form.statusIbu === "Tidak Diketahui"

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          nisn: initialData.nisn || "",
          nisLokal: initialData.nisLokal || "",
          namaLengkap: initialData.namaLengkap || "",
          jenisKelamin: initialData.jenisKelamin || "",
          tempatLahir: initialData.tempatLahir || "",
          tanggalLahir: initialData.tanggalLahir
            ? new Date(initialData.tanggalLahir).toISOString().split("T")[0]
            : "",
          nik: initialData.nik || "",
          agama: initialData.agama || "",
          alamat: initialData.alamat || "",
          noHpWhatsapp: initialData.noHpWhatsapp || initialData.noHpOrtu || "",
          emailSiswa: initialData.emailSiswa || "",
          status: initialData.status || "aktif",
          kewarganegaraan: initialData.kewarganegaraan || "WNI",
          hobi: initialData.hobi || "",
          citacita: initialData.citacita || "",
          jumlahSaudara: initialData.jumlahSaudara?.toString() || "",
          anakKe: initialData.anakKe?.toString() || "",
          pembiayaanSekolah: initialData.pembiayaanSekolah || "",
          noKartuKeluarga: initialData.noKartuKeluarga || "",
          namaKepalaKeluarga: initialData.namaKepalaKeluarga || "",
          namaAyah: initialData.namaAyah || "",
          statusAyah: initialData.statusAyah || "Masih Hidup",
          kewarganegaraanAyah: initialData.kewarganegaraanAyah || "WNI",
          nikAyah: initialData.nikAyah || "",
          tempatLahirAyah: initialData.tempatLahirAyah || "",
          tanggalLahirAyah: initialData.tanggalLahirAyah
            ? new Date(initialData.tanggalLahirAyah).toISOString().split("T")[0]
            : "",
          pendidikanAyah: initialData.pendidikanAyah || "",
          pekerjaanAyah: initialData.pekerjaanAyah || "",
          penghasilanAyah: initialData.penghasilanAyah || "",
          noHpAyah: initialData.noHpAyah || "",
          alamatLengkapAyah: initialData.alamatLengkapAyah || "",
          namaIbu: initialData.namaIbu || "",
          statusIbu: initialData.statusIbu || "Masih Hidup",
          kewarganegaraanIbu: initialData.kewarganegaraanIbu || "WNI",
          nikIbu: initialData.nikIbu || "",
          tempatLahirIbu: initialData.tempatLahirIbu || "",
          tanggalLahirIbu: initialData.tanggalLahirIbu
            ? new Date(initialData.tanggalLahirIbu).toISOString().split("T")[0]
            : "",
          pendidikanIbu: initialData.pendidikanIbu || "",
          pekerjaanIbu: initialData.pekerjaanIbu || "",
          penghasilanIbu: initialData.penghasilanIbu || "",
          noHpIbu: initialData.noHpIbu || "",
          alamatLengkapIbu: initialData.alamatLengkapIbu || "",
          statusWali: initialData.statusWali || "",
          namaWali: initialData.namaWali || "",
          kewarganegaraanWali: initialData.kewarganegaraanWali || "WNI",
          nikWali: initialData.nikWali || "",
          tempatLahirWali: initialData.tempatLahirWali || "",
          tanggalLahirWali: initialData.tanggalLahirWali
            ? new Date(initialData.tanggalLahirWali).toISOString().split("T")[0]
            : "",
          pendidikanWali: initialData.pendidikanWali || "",
          pekerjaanWali: initialData.pekerjaanWali || "",
          penghasilanWali: initialData.penghasilanWali || "",
          noHpWali: initialData.noHpWali || "",
          alamatLengkapWali: initialData.alamatLengkapWali || "",
          alamatIbuSamaDenganAyah: initialData.alamatIbuSamaDenganAyah ?? "",
          statusKepemilikanRumahAyah: initialData.statusKepemilikanRumahAyah || "",
          provinsiAyah: initialData.provinsiAyah || "",
          kabupatenKotaAyah: initialData.kabupatenKotaAyah || "",
          kecamatanAyah: initialData.kecamatanAyah || "",
          kelurahanDesaAyah: initialData.kelurahanDesaAyah || "",
          rtAyah: initialData.rtAyah || "",
          rwAyah: initialData.rwAyah || "",
          kodePosAyah: initialData.kodePosAyah || "",
          statusKepemilikanRumahIbu: initialData.statusKepemilikanRumahIbu || "",
          provinsiIbu: initialData.provinsiIbu || "",
          kabupatenKotaIbu: initialData.kabupatenKotaIbu || "",
          kecamatanIbu: initialData.kecamatanIbu || "",
          kelurahanDesaIbu: initialData.kelurahanDesaIbu || "",
          rtIbu: initialData.rtIbu || "",
          rwIbu: initialData.rwIbu || "",
          kodePosIbu: initialData.kodePosIbu || "",
          statusKepemilikanRumahWali: initialData.statusKepemilikanRumahWali || "",
          provinsiWali: initialData.provinsiWali || "",
          kabupatenKotaWali: initialData.kabupatenKotaWali || "",
          kecamatanWali: initialData.kecamatanWali || "",
          kelurahanDesaWali: initialData.kelurahanDesaWali || "",
          rtWali: initialData.rtWali || "",
          rwWali: initialData.rwWali || "",
          kodePosWali: initialData.kodePosWali || "",
          statusTempatTinggalSiswa: initialData.statusTempatTinggalSiswa || "",
          jarakTempatTinggalKeSekolah: initialData.jarakTempatTinggalKeSekolah || "",
          transportasiKeSekolah: initialData.transportasiKeSekolah || "",
          waktuTempuhKeSekolah: initialData.waktuTempuhKeSekolah || "",
          usernameSiswa: initialData.usernameSiswa || "",
          passwordSiswa: initialData.passwordSiswa || "",
          sekolahAsal: initialData.sekolahAsal || "",
          diterimaPadaTanggal: initialData.diterimaPadaTanggal
            ? new Date(initialData.diterimaPadaTanggal).toISOString().split("T")[0]
            : "",
        })
      } else {
        setForm({ ...defaultForm })
      }
      setActiveTab("siswa")
    }
  }, [open, initialData])

  const handleChange = (key: string, value: string | null) => {
    if (value === null) return
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleStatusWali = (value: string | null) => {
    if (value === null) return
    setForm((prev) => {
      const base = { ...prev, statusWali: value }
      if (value === "Ayah") {
        return {
          ...base,
          namaWali: prev.namaAyah,
          kewarganegaraanWali: prev.kewarganegaraanAyah,
          nikWali: prev.nikAyah,
          tempatLahirWali: prev.tempatLahirAyah,
          tanggalLahirWali: prev.tanggalLahirAyah,
          pendidikanWali: prev.pendidikanAyah,
          pekerjaanWali: prev.pekerjaanAyah,
          penghasilanWali: prev.penghasilanAyah,
          noHpWali: prev.noHpAyah,
        }
      }
      if (value === "Ibu") {
        return {
          ...base,
          namaWali: prev.namaIbu,
          kewarganegaraanWali: prev.kewarganegaraanIbu,
          nikWali: prev.nikIbu,
          tempatLahirWali: prev.tempatLahirIbu,
          tanggalLahirWali: prev.tanggalLahirIbu,
          pendidikanWali: prev.pendidikanIbu,
          pekerjaanWali: prev.pekerjaanIbu,
          penghasilanWali: prev.penghasilanIbu,
          noHpWali: prev.noHpIbu,
        }
      }
      if (value === "Lainnya") {
        return {
          ...base,
          namaWali: "",
          kewarganegaraanWali: "WNI",
          nikWali: "",
          tempatLahirWali: "",
          tanggalLahirWali: "",
          pendidikanWali: "",
          pekerjaanWali: "",
          penghasilanWali: "",
          noHpWali: "",
        }
      }
      return base
    })
  }

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = reader.result as string
      setFotoUrl(url)
      handleChange("foto", url)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.namaLengkap) {
      toast.error("Nama lengkap wajib diisi")
      return
    }
    if (!form.nisn) {
      toast.error("NISN wajib diisi")
      return
    }

    const payload: Record<string, unknown> = {
      nisn: form.nisn,
      nisLokal: form.nisLokal || undefined,
      namaLengkap: form.namaLengkap,
      jenisKelamin: form.jenisKelamin || undefined,
      tempatLahir: form.tempatLahir || undefined,
      tanggalLahir: form.tanggalLahir ? new Date(form.tanggalLahir) : undefined,
      nik: form.nik || undefined,
      agama: form.agama || undefined,
      alamat: form.alamat || undefined,
      noHpWhatsapp: form.noHpWhatsapp || undefined,
      emailSiswa: form.emailSiswa || undefined,
      status: form.status,
      kewarganegaraan: form.kewarganegaraan || undefined,
      hobi: form.hobi || undefined,
      citacita: form.citacita || undefined,
      jumlahSaudara: form.jumlahSaudara ? Number(form.jumlahSaudara) : undefined,
      anakKe: form.anakKe ? Number(form.anakKe) : undefined,
      pembiayaanSekolah: form.pembiayaanSekolah || undefined,
      noKartuKeluarga: form.noKartuKeluarga || undefined,
      namaKepalaKeluarga: form.namaKepalaKeluarga || undefined,
      namaAyah: form.namaAyah || undefined,
      statusAyah: form.statusAyah || undefined,
      kewarganegaraanAyah: form.kewarganegaraanAyah || undefined,
      nikAyah: form.nikAyah || undefined,
      tempatLahirAyah: form.tempatLahirAyah || undefined,
      tanggalLahirAyah: form.tanggalLahirAyah ? new Date(form.tanggalLahirAyah) : undefined,
      pendidikanAyah: form.pendidikanAyah || undefined,
      pekerjaanAyah: form.pekerjaanAyah || undefined,
      penghasilanAyah: form.penghasilanAyah || undefined,
      noHpAyah: form.noHpAyah || undefined,
      alamatLengkapAyah: form.alamatLengkapAyah || undefined,
      namaIbu: form.namaIbu || undefined,
      statusIbu: form.statusIbu || undefined,
      kewarganegaraanIbu: form.kewarganegaraanIbu || undefined,
      nikIbu: form.nikIbu || undefined,
      tempatLahirIbu: form.tempatLahirIbu || undefined,
      tanggalLahirIbu: form.tanggalLahirIbu ? new Date(form.tanggalLahirIbu) : undefined,
      pendidikanIbu: form.pendidikanIbu || undefined,
      pekerjaanIbu: form.pekerjaanIbu || undefined,
      penghasilanIbu: form.penghasilanIbu || undefined,
      noHpIbu: form.noHpIbu || undefined,
      alamatLengkapIbu: form.alamatLengkapIbu || undefined,
      statusWali: form.statusWali || undefined,
      namaWali: form.namaWali || undefined,
      kewarganegaraanWali: form.kewarganegaraanWali || undefined,
      nikWali: form.nikWali || undefined,
      tempatLahirWali: form.tempatLahirWali || undefined,
      tanggalLahirWali: form.tanggalLahirWali ? new Date(form.tanggalLahirWali) : undefined,
      pendidikanWali: form.pendidikanWali || undefined,
      pekerjaanWali: form.pekerjaanWali || undefined,
      penghasilanWali: form.penghasilanWali || undefined,
      noHpWali: form.noHpWali || undefined,
      alamatLengkapWali: form.alamatLengkapWali || undefined,
      alamatIbuSamaDenganAyah: form.alamatIbuSamaDenganAyah || undefined,
      statusKepemilikanRumahAyah: form.statusKepemilikanRumahAyah || undefined,
      provinsiAyah: form.provinsiAyah || undefined,
      kabupatenKotaAyah: form.kabupatenKotaAyah || undefined,
      kecamatanAyah: form.kecamatanAyah || undefined,
      kelurahanDesaAyah: form.kelurahanDesaAyah || undefined,
      rtAyah: form.rtAyah || undefined,
      rwAyah: form.rwAyah || undefined,
      kodePosAyah: form.kodePosAyah || undefined,
      statusKepemilikanRumahIbu: form.statusKepemilikanRumahIbu || undefined,
      provinsiIbu: form.provinsiIbu || undefined,
      kabupatenKotaIbu: form.kabupatenKotaIbu || undefined,
      kecamatanIbu: form.kecamatanIbu || undefined,
      kelurahanDesaIbu: form.kelurahanDesaIbu || undefined,
      rtIbu: form.rtIbu || undefined,
      rwIbu: form.rwIbu || undefined,
      kodePosIbu: form.kodePosIbu || undefined,
      statusKepemilikanRumahWali: form.statusKepemilikanRumahWali || undefined,
      provinsiWali: form.provinsiWali || undefined,
      kabupatenKotaWali: form.kabupatenKotaWali || undefined,
      kecamatanWali: form.kecamatanWali || undefined,
      kelurahanDesaWali: form.kelurahanDesaWali || undefined,
      rtWali: form.rtWali || undefined,
      rwWali: form.rwWali || undefined,
      kodePosWali: form.kodePosWali || undefined,
      statusTempatTinggalSiswa: form.statusTempatTinggalSiswa || undefined,
      jarakTempatTinggalKeSekolah: form.jarakTempatTinggalKeSekolah || undefined,
      transportasiKeSekolah: form.transportasiKeSekolah || undefined,
      waktuTempuhKeSekolah: form.waktuTempuhKeSekolah || undefined,
      usernameSiswa: form.usernameSiswa || undefined,
      passwordSiswa: form.passwordSiswa || undefined,
      sekolahAsal: form.sekolahAsal || undefined,
      diterimaPadaTanggal: form.diterimaPadaTanggal ? new Date(form.diterimaPadaTanggal) : undefined,
    }

    try {
      if (isEdit && initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload as any)
      }
    } catch {
      // error handled by mutation callbacks
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Data Siswa" : "Tambah Data Siswa"}</DialogTitle>
          <DialogDescription>
            Lengkapi form di bawah ini. Field bertanda * wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="siswa">Data Siswa</TabsTrigger>
              <TabsTrigger value="ortu">Data Orang Tua</TabsTrigger>
              <TabsTrigger value="wali">Data Wali</TabsTrigger>
              <TabsTrigger value="alamat">Data Alamat</TabsTrigger>
            </TabsList>

            <TabsContent value="siswa" className="space-y-4 mt-4">
              {/* Photo Upload */}
              <div className="flex items-center gap-6 p-4 border rounded-lg bg-muted/30">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted flex items-center justify-center overflow-hidden">
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Foto siswa" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fotoInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} />
                </div>
                <div>
                  <p className="font-medium text-sm">Foto Siswa</p>
                  <p className="text-xs text-muted-foreground mt-1">Klik ikon kamera untuk upload foto (opsional)</p>
                  {fotoUrl && (
                    <button type="button" onClick={() => { setFotoUrl(""); handleChange("foto", "") }} className="text-xs text-destructive mt-1 hover:underline">
                      Hapus foto
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
                  <Input
                    id="namaLengkap"
                    required
                    value={form.namaLengkap}
                    onChange={(e) => handleChange("namaLengkap", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nisn">NISN *</Label>
                  <Input
                    id="nisn"
                    required
                    maxLength={10}
                    value={form.nisn}
                    onChange={(e) => handleChange("nisn", e.target.value.replace(/\D/g, ""))}
                    className="font-mono tracking-widest text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nisLokal">NIS Lokal</Label>
                  <Input
                    id="nisLokal"
                    maxLength={6}
                    value={form.nisLokal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "")
                      handleChange("nisLokal", val)
                      if (!isEdit) handleChange("usernameSiswa", val)
                    }}
                    className="font-mono tracking-widest text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kewarganegaraan</Label>
                  <Select value={form.kewarganegaraan} onValueChange={(v) => handleChange("kewarganegaraan", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WNI">WNI</SelectItem>
                      <SelectItem value="WNA">WNA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="usernameSiswa">Username Siswa</Label>
                  <Input
                    id="usernameSiswa"
                    readOnly
                    value={form.usernameSiswa as string}
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                    placeholder="Otomatis dari NIS"
                  />
                  <p className="text-xs text-muted-foreground">Otomatis terisi dari NIS</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordSiswa">Password Siswa</Label>
                  <div className="relative">
                    <Input
                      id="passwordSiswa"
                      type={showPassword ? "text" : "password"}
                      value={form.passwordSiswa as string}
                      onChange={(e) => handleChange("passwordSiswa", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK</Label>
                  <Input
                    id="nik"
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => handleChange("nik", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tempatLahir">Tempat Lahir</Label>
                  <Input
                    id="tempatLahir"
                    value={form.tempatLahir}
                    onChange={(e) => handleChange("tempatLahir", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tanggalLahir">Tanggal Lahir</Label>
                  <Input
                    id="tanggalLahir"
                    type="date"
                    value={form.tanggalLahir}
                    onChange={(e) => handleChange("tanggalLahir", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jenis Kelamin <span className="text-destructive">*</span></Label>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <input type="radio" id="laki" name="jk" value="L" checked={form.jenisKelamin === "L"} onChange={(e) => handleChange("jenisKelamin", e.target.value)} className="h-4 w-4 accent-primary" />
                      <Label htmlFor="laki">Laki-laki</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" id="perempuan" name="jk" value="P" checked={form.jenisKelamin === "P"} onChange={(e) => handleChange("jenisKelamin", e.target.value)} className="h-4 w-4 accent-primary" />
                      <Label htmlFor="perempuan">Perempuan</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Agama</Label>
                  <Select value={form.agama} onValueChange={(v) => handleChange("agama", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Agama" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Kristen Protestan">Kristen Protestan</SelectItem>
                      <SelectItem value="Katolik">Katolik</SelectItem>
                      <SelectItem value="Hindu">Hindu</SelectItem>
                      <SelectItem value="Budha">Budha</SelectItem>
                      <SelectItem value="Kong Hu Cu">Kong Hu Cu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => handleChange("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="lulus">Lulus</SelectItem>
                      <SelectItem value="pindah">Pindah</SelectItem>
                      <SelectItem value="keluar">Keluar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noHpWhatsapp">No HP/Whatsapp</Label>
                  <Input
                    id="noHpWhatsapp"
                    type="tel"
                    value={form.noHpWhatsapp}
                    onChange={(e) => handleChange("noHpWhatsapp", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailSiswa">Email</Label>
                  <Input
                    id="emailSiswa"
                    type="email"
                    value={form.emailSiswa}
                    onChange={(e) => handleChange("emailSiswa", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jumlahSaudara">Jumlah Saudara</Label>
                  <Input
                    id="jumlahSaudara"
                    type="number"
                    min="0"
                    value={form.jumlahSaudara}
                    onChange={(e) => handleChange("jumlahSaudara", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="anakKe">Anak Ke</Label>
                  <Input
                    id="anakKe"
                    type="number"
                    min="1"
                    value={form.anakKe}
                    onChange={(e) => handleChange("anakKe", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hobi</Label>
                  <Select value={form.hobi} onValueChange={(v) => handleChange("hobi", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Hobi" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Olahraga">Olahraga</SelectItem>
                      <SelectItem value="Kesenian">Kesenian</SelectItem>
                      <SelectItem value="Membaca">Membaca</SelectItem>
                      <SelectItem value="Menulis">Menulis</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cita-cita</Label>
                  <Select value={form.citacita} onValueChange={(v) => handleChange("citacita", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Cita-cita" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PNS">PNS</SelectItem>
                      <SelectItem value="TNI/Polri">TNI/Polri</SelectItem>
                      <SelectItem value="Dosen/Guru">Dosen/Guru</SelectItem>
                      <SelectItem value="Dokter">Dokter</SelectItem>
                      <SelectItem value="Wiraswasta">Wiraswasta</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input
                    id="alamat"
                    value={form.alamat}
                    onChange={(e) => handleChange("alamat", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pembiayaan Sekolah</Label>
                  <Select value={form.pembiayaanSekolah} onValueChange={(v) => handleChange("pembiayaanSekolah", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Orang Tua">Orang Tua</SelectItem>
                      <SelectItem value="Wali/Orang Tua Asuh">Wali/Orang Tua Asuh</SelectItem>
                      <SelectItem value="Tanggungan Sendiri">Tanggungan Sendiri</SelectItem>
                      <SelectItem value="Lainnya">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sekolahAsal">Sekolah Asal</Label>
                  <Input
                    id="sekolahAsal"
                    value={form.sekolahAsal}
                    onChange={(e) => handleChange("sekolahAsal", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diterimaPadaTanggal">Diterima Tanggal</Label>
                  <Input
                    id="diterimaPadaTanggal"
                    type="date"
                    value={form.diterimaPadaTanggal}
                    onChange={(e) => handleChange("diterimaPadaTanggal", e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ortu" className="space-y-6 mt-4">
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">A. Ayah Kandung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="namaAyah">Nama Lengkap</Label>
                    <Input id="namaAyah" value={form.namaAyah} onChange={(e) => handleChange("namaAyah", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.statusAyah} onValueChange={(v) => handleChange("statusAyah", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                        <SelectItem value="Sudah Meninggal">Sudah Meninggal</SelectItem>
                        <SelectItem value="Tidak Diketahui">Tidak Diketahui</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!isAyahNotAlive && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kewarganegaraan</Label>
                        <Select value={form.kewarganegaraanAyah} onValueChange={(v) => handleChange("kewarganegaraanAyah", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WNI">WNI</SelectItem>
                            <SelectItem value="WNA">WNA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nikAyah">NIK</Label>
                        <Input id="nikAyah" maxLength={16} value={form.nikAyah} onChange={(e) => handleChange("nikAyah", e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tempatLahirAyah">Tempat Lahir</Label>
                        <Input id="tempatLahirAyah" value={form.tempatLahirAyah} onChange={(e) => handleChange("tempatLahirAyah", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tanggalLahirAyah">Tanggal Lahir</Label>
                        <Input id="tanggalLahirAyah" type="date" value={form.tanggalLahirAyah} onChange={(e) => handleChange("tanggalLahirAyah", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pendidikan</Label>
                        <Select value={form.pendidikanAyah} onValueChange={(v) => handleChange("pendidikanAyah", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SD/Sederajat">SD/Sederajat</SelectItem>
                            <SelectItem value="SMP/Sederajat">SMP/Sederajat</SelectItem>
                            <SelectItem value="SMA/Sederajat">SMA/Sederajat</SelectItem>
                            <SelectItem value="D3">D3</SelectItem>
                            <SelectItem value="D4/S1">D4/S1</SelectItem>
                            <SelectItem value="S2">S2</SelectItem>
                            <SelectItem value="S3">S3</SelectItem>
                            <SelectItem value="Tidak Bersekolah">Tidak Bersekolah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pekerjaan</Label>
                        <Select value={form.pekerjaanAyah} onValueChange={(v) => handleChange("pekerjaanAyah", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tidak Bekerja">Tidak Bekerja</SelectItem>
                            <SelectItem value="PNS">PNS</SelectItem>
                            <SelectItem value="TNI/Polisi">TNI/Polisi</SelectItem>
                            <SelectItem value="Guru/Dosen">Guru/Dosen</SelectItem>
                            <SelectItem value="Pegawai Swasta">Pegawai Swasta</SelectItem>
                            <SelectItem value="Wiraswasta">Wiraswasta</SelectItem>
                            <SelectItem value="Pedagang">Pedagang</SelectItem>
                            <SelectItem value="Petani/Peternak">Petani/Peternak</SelectItem>
                            <SelectItem value="Buruh">Buruh</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Penghasilan</Label>
                        <Select value={form.penghasilanAyah} onValueChange={(v) => handleChange("penghasilanAyah", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dibawah 800.000">Dibawah 800.000</SelectItem>
                            <SelectItem value="800.001 - 1.200.000">800.001 - 1.200.000</SelectItem>
                            <SelectItem value="1.200.001 - 1.800.000">1.200.001 - 1.800.000</SelectItem>
                            <SelectItem value="1.800.001 - 2.500.000">1.800.001 - 2.500.000</SelectItem>
                            <SelectItem value="2.500.001 - 3.500.000">2.500.001 - 3.500.000</SelectItem>
                            <SelectItem value="3.500.001 - 4.800.000">3.500.001 - 4.800.000</SelectItem>
                            <SelectItem value="4.800.001 - 6.500.000">4.800.001 - 6.500.000</SelectItem>
                            <SelectItem value="6.500.001 - 10.000.000">6.500.001 - 10.000.000</SelectItem>
                            <SelectItem value="Diatas 10.000.000">Diatas 10.000.000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="noHpAyah">No HP</Label>
                        <Input id="noHpAyah" type="tel" value={form.noHpAyah} onChange={(e) => handleChange("noHpAyah", e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">B. Ibu Kandung</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="namaIbu">Nama Lengkap</Label>
                    <Input id="namaIbu" value={form.namaIbu} onChange={(e) => handleChange("namaIbu", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={form.statusIbu} onValueChange={(v) => handleChange("statusIbu", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masih Hidup">Masih Hidup</SelectItem>
                        <SelectItem value="Sudah Meninggal">Sudah Meninggal</SelectItem>
                        <SelectItem value="Tidak Diketahui">Tidak Diketahui</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!isIbuNotAlive && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kewarganegaraan</Label>
                        <Select value={form.kewarganegaraanIbu} onValueChange={(v) => handleChange("kewarganegaraanIbu", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WNI">WNI</SelectItem>
                            <SelectItem value="WNA">WNA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nikIbu">NIK</Label>
                        <Input id="nikIbu" maxLength={16} value={form.nikIbu} onChange={(e) => handleChange("nikIbu", e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tempatLahirIbu">Tempat Lahir</Label>
                        <Input id="tempatLahirIbu" value={form.tempatLahirIbu} onChange={(e) => handleChange("tempatLahirIbu", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tanggalLahirIbu">Tanggal Lahir</Label>
                        <Input id="tanggalLahirIbu" type="date" value={form.tanggalLahirIbu} onChange={(e) => handleChange("tanggalLahirIbu", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pendidikan</Label>
                        <Select value={form.pendidikanIbu} onValueChange={(v) => handleChange("pendidikanIbu", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SD/Sederajat">SD/Sederajat</SelectItem>
                            <SelectItem value="SMP/Sederajat">SMP/Sederajat</SelectItem>
                            <SelectItem value="SMA/Sederajat">SMA/Sederajat</SelectItem>
                            <SelectItem value="D3">D3</SelectItem>
                            <SelectItem value="D4/S1">D4/S1</SelectItem>
                            <SelectItem value="S2">S2</SelectItem>
                            <SelectItem value="S3">S3</SelectItem>
                            <SelectItem value="Tidak Bersekolah">Tidak Bersekolah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Pekerjaan</Label>
                        <Select value={form.pekerjaanIbu} onValueChange={(v) => handleChange("pekerjaanIbu", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tidak Bekerja">Tidak Bekerja</SelectItem>
                            <SelectItem value="PNS">PNS</SelectItem>
                            <SelectItem value="TNI/Polisi">TNI/Polisi</SelectItem>
                            <SelectItem value="Guru/Dosen">Guru/Dosen</SelectItem>
                            <SelectItem value="Pegawai Swasta">Pegawai Swasta</SelectItem>
                            <SelectItem value="Wiraswasta">Wiraswasta</SelectItem>
                            <SelectItem value="Pedagang">Pedagang</SelectItem>
                            <SelectItem value="Petani/Peternak">Petani/Peternak</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Penghasilan</Label>
                        <Select value={form.penghasilanIbu} onValueChange={(v) => handleChange("penghasilanIbu", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dibawah 800.000">Dibawah 800.000</SelectItem>
                            <SelectItem value="800.001 - 1.200.000">800.001 - 1.200.000</SelectItem>
                            <SelectItem value="1.200.001 - 1.800.000">1.200.001 - 1.800.000</SelectItem>
                            <SelectItem value="1.800.001 - 2.500.000">1.800.001 - 2.500.000</SelectItem>
                            <SelectItem value="2.500.001 - 3.500.000">2.500.001 - 3.500.000</SelectItem>
                            <SelectItem value="3.500.001 - 4.800.000">3.500.001 - 4.800.000</SelectItem>
                            <SelectItem value="4.800.001 - 6.500.000">4.800.001 - 6.500.000</SelectItem>
                            <SelectItem value="6.500.001 - 10.000.000">6.500.001 - 10.000.000</SelectItem>
                            <SelectItem value="Diatas 10.000.000">Diatas 10.000.000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="noHpIbu">No HP</Label>
                        <Input id="noHpIbu" type="tel" value={form.noHpIbu} onChange={(e) => handleChange("noHpIbu", e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="wali" className="space-y-6 mt-4">
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">C. Wali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Wali</Label>
                    <Select value={form.statusWali} onValueChange={handleStatusWali}>
                      <SelectTrigger><SelectValue placeholder="Pilih Status Wali" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ayah">Ayah</SelectItem>
                        <SelectItem value="Ibu">Ibu</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {(form.statusWali === "Ayah" || form.statusWali === "Ibu") && (
                  <div className="bg-sky-50 border border-sky-100 text-sky-700 rounded-md px-3 py-2 text-sm">
                    Data wali akan otomatis terisi sama dengan{" "}
                    {form.statusWali === "Ayah" ? "Ayah Kandung" : "Ibu Kandung"}
                  </div>
                )}

                {form.statusWali === "Lainnya" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="namaWali">Nama Lengkap Wali</Label>
                        <Input id="namaWali" value={form.namaWali} onChange={(e) => handleChange("namaWali", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Kewarganegaraan</Label>
                        <Select value={form.kewarganegaraanWali} onValueChange={(v) => handleChange("kewarganegaraanWali", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WNI">WNI</SelectItem>
                            <SelectItem value="WNA">WNA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nikWali">NIK</Label>
                        <Input id="nikWali" maxLength={16} value={form.nikWali} onChange={(e) => handleChange("nikWali", e.target.value.replace(/\D/g, ""))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tempatLahirWali">Tempat Lahir</Label>
                        <Input id="tempatLahirWali" value={form.tempatLahirWali} onChange={(e) => handleChange("tempatLahirWali", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tanggalLahirWali">Tanggal Lahir</Label>
                        <Input id="tanggalLahirWali" type="date" value={form.tanggalLahirWali} onChange={(e) => handleChange("tanggalLahirWali", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Pendidikan</Label>
                        <Select value={form.pendidikanWali} onValueChange={(v) => handleChange("pendidikanWali", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SD/Sederajat">SD/Sederajat</SelectItem>
                            <SelectItem value="SMP/Sederajat">SMP/Sederajat</SelectItem>
                            <SelectItem value="SMA/Sederajat">SMA/Sederajat</SelectItem>
                            <SelectItem value="D3">D3</SelectItem>
                            <SelectItem value="D4/S1">D4/S1</SelectItem>
                            <SelectItem value="S2">S2</SelectItem>
                            <SelectItem value="S3">S3</SelectItem>
                            <SelectItem value="Tidak Bersekolah">Tidak Bersekolah</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Pekerjaan</Label>
                        <Select value={form.pekerjaanWali} onValueChange={(v) => handleChange("pekerjaanWali", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tidak Bekerja">Tidak Bekerja</SelectItem>
                            <SelectItem value="PNS">PNS</SelectItem>
                            <SelectItem value="TNI/Polisi">TNI/Polisi</SelectItem>
                            <SelectItem value="Guru/Dosen">Guru/Dosen</SelectItem>
                            <SelectItem value="Pegawai Swasta">Pegawai Swasta</SelectItem>
                            <SelectItem value="Wiraswasta">Wiraswasta</SelectItem>
                            <SelectItem value="Pedagang">Pedagang</SelectItem>
                            <SelectItem value="Petani/Peternak">Petani/Peternak</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Penghasilan</Label>
                        <Select value={form.penghasilanWali} onValueChange={(v) => handleChange("penghasilanWali", v)}>
                          <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dibawah 800.000">Dibawah 800.000</SelectItem>
                            <SelectItem value="800.001 - 1.200.000">800.001 - 1.200.000</SelectItem>
                            <SelectItem value="1.200.001 - 1.800.000">1.200.001 - 1.800.000</SelectItem>
                            <SelectItem value="1.800.001 - 2.500.000">1.800.001 - 2.500.000</SelectItem>
                            <SelectItem value="2.500.001 - 3.500.000">2.500.001 - 3.500.000</SelectItem>
                            <SelectItem value="3.500.001 - 4.800.000">3.500.001 - 4.800.000</SelectItem>
                            <SelectItem value="4.800.001 - 6.500.000">4.800.001 - 6.500.000</SelectItem>
                            <SelectItem value="6.500.001 - 10.000.000">6.500.001 - 10.000.000</SelectItem>
                            <SelectItem value="Diatas 10.000.000">Diatas 10.000.000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="noHpWali">No HP</Label>
                        <Input id="noHpWali" type="tel" value={form.noHpWali} onChange={(e) => handleChange("noHpWali", e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alamat" className="space-y-6 mt-4">
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Ayah</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Kepemilikan Rumah</Label>
                    <Select value={form.statusKepemilikanRumahAyah} onValueChange={(v) => handleChange("statusKepemilikanRumahAyah", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Milik Sendiri">Milik Sendiri</SelectItem>
                        <SelectItem value="Kontrakan">Kontrakan</SelectItem>
                        <SelectItem value="Sewa">Sewa</SelectItem>
                        <SelectItem value="Rumah Dinas">Rumah Dinas</SelectItem>
                        <SelectItem value="Milik Orang Tua">Milik Orang Tua</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provinsiAyah">Provinsi</Label>
                    <Input id="provinsiAyah" value={form.provinsiAyah} onChange={(e) => handleChange("provinsiAyah", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kabupatenKotaAyah">Kabupaten/Kota</Label>
                    <Input id="kabupatenKotaAyah" value={form.kabupatenKotaAyah} onChange={(e) => handleChange("kabupatenKotaAyah", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecamatanAyah">Kecamatan</Label>
                    <Input id="kecamatanAyah" value={form.kecamatanAyah} onChange={(e) => handleChange("kecamatanAyah", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kelurahanDesaAyah">Kelurahan/Desa</Label>
                    <Input id="kelurahanDesaAyah" value={form.kelurahanDesaAyah} onChange={(e) => handleChange("kelurahanDesaAyah", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kodePosAyah">Kode Pos</Label>
                    <Input id="kodePosAyah" maxLength={5} value={form.kodePosAyah} onChange={(e) => handleChange("kodePosAyah", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rtAyah">RT</Label>
                    <Input id="rtAyah" maxLength={3} value={form.rtAyah} onChange={(e) => handleChange("rtAyah", e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rwAyah">RW</Label>
                    <Input id="rwAyah" maxLength={3} value={form.rwAyah} onChange={(e) => handleChange("rwAyah", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Ibu</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="alamatIbuSamaDenganAyah"
                      checked={form.alamatIbuSamaDenganAyah === "true"}
                      onChange={(e) => handleChange("alamatIbuSamaDenganAyah", e.target.checked ? "true" : "false")}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="alamatIbuSamaDenganAyah" className="text-sm font-normal">Alamat Ibu sama dengan Alamat Ayah</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Kepemilikan Rumah</Label>
                    <Select value={form.statusKepemilikanRumahIbu} onValueChange={(v) => handleChange("statusKepemilikanRumahIbu", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Milik Sendiri">Milik Sendiri</SelectItem>
                        <SelectItem value="Kontrakan">Kontrakan</SelectItem>
                        <SelectItem value="Sewa">Sewa</SelectItem>
                        <SelectItem value="Rumah Dinas">Rumah Dinas</SelectItem>
                        <SelectItem value="Milik Orang Tua">Milik Orang Tua</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provinsiIbu">Provinsi</Label>
                    <Input id="provinsiIbu" value={form.provinsiIbu} onChange={(e) => handleChange("provinsiIbu", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kabupatenKotaIbu">Kabupaten/Kota</Label>
                    <Input id="kabupatenKotaIbu" value={form.kabupatenKotaIbu} onChange={(e) => handleChange("kabupatenKotaIbu", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecamatanIbu">Kecamatan</Label>
                    <Input id="kecamatanIbu" value={form.kecamatanIbu} onChange={(e) => handleChange("kecamatanIbu", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kelurahanDesaIbu">Kelurahan/Desa</Label>
                    <Input id="kelurahanDesaIbu" value={form.kelurahanDesaIbu} onChange={(e) => handleChange("kelurahanDesaIbu", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kodePosIbu">Kode Pos</Label>
                    <Input id="kodePosIbu" maxLength={5} value={form.kodePosIbu} onChange={(e) => handleChange("kodePosIbu", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rtIbu">RT</Label>
                    <Input id="rtIbu" maxLength={3} value={form.rtIbu} onChange={(e) => handleChange("rtIbu", e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rwIbu">RW</Label>
                    <Input id="rwIbu" maxLength={3} value={form.rwIbu} onChange={(e) => handleChange("rwIbu", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Wali</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Kepemilikan Rumah</Label>
                    <Select value={form.statusKepemilikanRumahWali} onValueChange={(v) => handleChange("statusKepemilikanRumahWali", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Milik Sendiri">Milik Sendiri</SelectItem>
                        <SelectItem value="Kontrakan">Kontrakan</SelectItem>
                        <SelectItem value="Sewa">Sewa</SelectItem>
                        <SelectItem value="Rumah Dinas">Rumah Dinas</SelectItem>
                        <SelectItem value="Milik Orang Tua">Milik Orang Tua</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provinsiWali">Provinsi</Label>
                    <Input id="provinsiWali" value={form.provinsiWali} onChange={(e) => handleChange("provinsiWali", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kabupatenKotaWali">Kabupaten/Kota</Label>
                    <Input id="kabupatenKotaWali" value={form.kabupatenKotaWali} onChange={(e) => handleChange("kabupatenKotaWali", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kecamatanWali">Kecamatan</Label>
                    <Input id="kecamatanWali" value={form.kecamatanWali} onChange={(e) => handleChange("kecamatanWali", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kelurahanDesaWali">Kelurahan/Desa</Label>
                    <Input id="kelurahanDesaWali" value={form.kelurahanDesaWali} onChange={(e) => handleChange("kelurahanDesaWali", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kodePosWali">Kode Pos</Label>
                    <Input id="kodePosWali" maxLength={5} value={form.kodePosWali} onChange={(e) => handleChange("kodePosWali", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rtWali">RT</Label>
                    <Input id="rtWali" maxLength={3} value={form.rtWali} onChange={(e) => handleChange("rtWali", e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rwWali">RW</Label>
                    <Input id="rwWali" maxLength={3} value={form.rwWali} onChange={(e) => handleChange("rwWali", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Tempat Tinggal Siswa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Tempat Tinggal</Label>
                    <Select value={form.statusTempatTinggalSiswa} onValueChange={(v) => handleChange("statusTempatTinggalSiswa", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bersama Orang Tua">Bersama Orang Tua</SelectItem>
                        <SelectItem value="Bersama Wali">Bersama Wali</SelectItem>
                        <SelectItem value="Kos">Kos</SelectItem>
                        <SelectItem value="Asrama">Asrama</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Transportasi ke Sekolah</Label>
                    <Select value={form.transportasiKeSekolah} onValueChange={(v) => handleChange("transportasiKeSekolah", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jalan Kaki">Jalan Kaki</SelectItem>
                        <SelectItem value="Sepeda">Sepeda</SelectItem>
                        <SelectItem value="Motor">Motor</SelectItem>
                        <SelectItem value="Mobil">Mobil</SelectItem>
                        <SelectItem value="Angkutan Umum">Angkutan Umum</SelectItem>
                        <SelectItem value="Antar Jemput">Antar Jemput</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jarakTempatTinggalKeSekolah">Jarak Tempat Tinggal ke Sekolah</Label>
                    <Input id="jarakTempatTinggalKeSekolah" value={form.jarakTempatTinggalKeSekolah} onChange={(e) => handleChange("jarakTempatTinggalKeSekolah", e.target.value)} placeholder="Contoh: 2 km" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waktuTempuhKeSekolah">Waktu Tempuh ke Sekolah</Label>
                    <Input id="waktuTempuhKeSekolah" value={form.waktuTempuhKeSekolah} onChange={(e) => handleChange("waktuTempuhKeSekolah", e.target.value)} placeholder="Contoh: 15 menit" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-6 mt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
