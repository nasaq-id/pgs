"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Loader2, Camera, User, Eye, EyeOff } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { useProvinsi, useKabupatenKota, useKecamatan, useKelurahan, useKodePos } from "@/hooks/useWilayah"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { statusTempatTinggalOptions, jarakTempatTinggalOptions, waktuTempuhOptions } from "@/data/wilayah-indonesia"
import { uploadToCloudinary } from "@/lib/cloudinary"

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
  noHpWhatsapp: "",
  emailSiswa: "",
  status: "aktif",
  kewarganegaraan: "WNI",
  hobi: "",
  hobiLainnya: "",
  citacita: "",
  citacitaLainnya: "",
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
  hubunganWali: "",
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
  alamatAyah: "",
  statusKepemilikanRumahIbu: "",
  provinsiIbu: "",
  kabupatenKotaIbu: "",
  kecamatanIbu: "",
  kelurahanDesaIbu: "",
  rtIbu: "",
  rwIbu: "",
  kodePosIbu: "",
  alamatIbu: "",
  alamatWaliOption: "",
  statusKepemilikanRumahWali: "",
  provinsiWali: "",
  kabupatenKotaWali: "",
  kecamatanWali: "",
  kelurahanDesaWali: "",
  rtWali: "",
  rwWali: "",
  kodePosWali: "",
  alamatWali: "",
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
  const { data: session } = useSession()
  const [form, setForm] = useState({ ...defaultForm })
  const [activeTab, setActiveTab] = useState("siswa")
  const [fotoUrl, setFotoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const createMutation = api.siswa.create.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil ditambahkan")
      onSuccess()
    },
    onError: (err) => {
      console.error("Create siswa error:", err)
      toast.error(err.message || "Gagal menyimpan data siswa. Periksa kembali isian Anda.", { duration: 6000 })
    },
  })

  const updateMutation = api.siswa.update.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil diperbarui")
      onSuccess()
    },
    onError: (err) => {
      console.error("Update siswa error:", err)
      toast.error(err.message || "Gagal memperbarui data siswa. Periksa kembali isian Anda.", { duration: 6000 })
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEdit = !!initialData

  const { data: provinsiOptions = [], isLoading: loadingProvinsi } = useProvinsi()
  const { data: kabupatenAyahOptions = [], isLoading: loadingKabAyah } = useKabupatenKota(form.provinsiAyah)
  const { data: kabupatenIbuOptions = [], isLoading: loadingKabIbu } = useKabupatenKota(form.provinsiIbu)
  const { data: kabupatenWaliOptions = [], isLoading: loadingKabWali } = useKabupatenKota(form.provinsiWali)
  const { data: kecamatanAyahOptions = [], isLoading: loadingKecAyah } = useKecamatan(form.kabupatenKotaAyah)
  const { data: kecamatanIbuOptions = [], isLoading: loadingKecIbu } = useKecamatan(form.kabupatenKotaIbu)
  const { data: kecamatanWaliOptions = [], isLoading: loadingKecWali } = useKecamatan(form.kabupatenKotaWali)
  const { data: kelurahanAyahOptions = [], isLoading: loadingKelAyah } = useKelurahan(form.kecamatanAyah)
  const { data: kelurahanIbuOptions = [], isLoading: loadingKelIbu } = useKelurahan(form.kecamatanIbu)
  const { data: kelurahanWaliOptions = [], isLoading: loadingKelWali } = useKelurahan(form.kecamatanWali)
  const { data: kodePosAyah = "" } = useKodePos(form.kelurahanDesaAyah)
  const { data: kodePosIbu = "" } = useKodePos(form.kelurahanDesaIbu)
  const { data: kodePosWali = "" } = useKodePos(form.kelurahanDesaWali)

  const isAyahNotAlive = form.statusAyah === "Sudah Meninggal" || form.statusAyah === "Tidak Diketahui"
  const isIbuNotAlive = form.statusIbu === "Sudah Meninggal" || form.statusIbu === "Tidak Diketahui"
  const isAyahTidakBekerja = form.pekerjaanAyah === "Tidak Bekerja"
  const isIbuTidakBekerja = form.pekerjaanIbu === "Tidak Bekerja"
  const isWaliTidakBekerja = form.pekerjaanWali === "Tidak Bekerja"

  const alamatIbuTerisiOtomatis = form.alamatIbuSamaDenganAyah === "true"

  const emailError = form.emailSiswa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailSiswa) ? "Format email tidak valid" : ""

  useEffect(() => {
    if (kodePosAyah && form.kelurahanDesaAyah) {
      setForm((prev) => ({ ...prev, kodePosAyah: kodePosAyah }))
    }
  }, [kodePosAyah])

  useEffect(() => {
    if (kodePosIbu && form.kelurahanDesaIbu) {
      setForm((prev) => ({ ...prev, kodePosIbu: kodePosIbu }))
    }
  }, [kodePosIbu])

  useEffect(() => {
    if (kodePosWali && form.kelurahanDesaWali) {
      setForm((prev) => ({ ...prev, kodePosWali: kodePosWali }))
    }
  }, [kodePosWali])

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
          noHpWhatsapp: initialData.noHpWhatsapp || initialData.noHpOrtu || "",
          emailSiswa: initialData.emailSiswa || "",
          status: initialData.status || "aktif",
          kewarganegaraan: initialData.kewarganegaraan || "WNI",
          hobi: initialData.hobi || "",
          hobiLainnya: initialData.hobiLainnya || "",
          citacita: initialData.citacita || "",
          citacitaLainnya: initialData.citacitaLainnya || "",
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
          hubunganWali: initialData.hubunganWali || "",
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
          alamatAyah: initialData.alamatAyah || "",
          statusKepemilikanRumahIbu: initialData.statusKepemilikanRumahIbu || "",
          provinsiIbu: initialData.provinsiIbu || "",
          kabupatenKotaIbu: initialData.kabupatenKotaIbu || "",
          kecamatanIbu: initialData.kecamatanIbu || "",
          kelurahanDesaIbu: initialData.kelurahanDesaIbu || "",
          rtIbu: initialData.rtIbu || "",
          rwIbu: initialData.rwIbu || "",
          kodePosIbu: initialData.kodePosIbu || "",
          alamatIbu: initialData.alamatIbu || "",
          statusKepemilikanRumahWali: initialData.statusKepemilikanRumahWali || "",
          provinsiWali: initialData.provinsiWali || "",
          kabupatenKotaWali: initialData.kabupatenKotaWali || "",
          kecamatanWali: initialData.kecamatanWali || "",
          kelurahanDesaWali: initialData.kelurahanDesaWali || "",
          rtWali: initialData.rtWali || "",
          rwWali: initialData.rwWali || "",
          kodePosWali: initialData.kodePosWali || "",
          alamatWali: initialData.alamatWali || "",
          alamatWaliOption: initialData.alamatWaliOption ?? "",
          statusTempatTinggalSiswa: initialData.statusTempatTinggalSiswa || "",
          jarakTempatTinggalKeSekolah: initialData.jarakTempatTinggalKeSekolah || "",
          transportasiKeSekolah: initialData.transportasiKeSekolah || "",
          waktuTempuhKeSekolah: initialData.waktuTempuhKeSekolah || "",
          usernameSiswa: initialData.usernameSiswa || "",
          passwordSiswa: "",
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
    setForm((prev) => {
      const updated = { ...prev, [key]: value }

      if (key === "alamatIbuSamaDenganAyah" && value === "true") {
        updated.provinsiIbu = updated.provinsiAyah
        updated.kabupatenKotaIbu = updated.kabupatenKotaAyah
        updated.kecamatanIbu = updated.kecamatanAyah
        updated.kelurahanDesaIbu = updated.kelurahanDesaAyah
        updated.rtIbu = updated.rtAyah
        updated.rwIbu = updated.rwAyah
        updated.kodePosIbu = updated.kodePosAyah
        updated.alamatIbu = updated.alamatAyah
        updated.statusKepemilikanRumahIbu = updated.statusKepemilikanRumahAyah
      }

      if (key === "alamatWaliOption") {
        if (value === "sama_ayah") {
          updated.provinsiWali = updated.provinsiAyah
          updated.kabupatenKotaWali = updated.kabupatenKotaAyah
          updated.kecamatanWali = updated.kecamatanAyah
          updated.kelurahanDesaWali = updated.kelurahanDesaAyah
          updated.rtWali = updated.rtAyah
          updated.rwWali = updated.rwAyah
          updated.kodePosWali = updated.kodePosAyah
          updated.alamatWali = updated.alamatAyah
          updated.statusKepemilikanRumahWali = updated.statusKepemilikanRumahAyah
        } else if (value === "sama_ibu") {
          if (updated.alamatIbuSamaDenganAyah === "true") {
            updated.provinsiWali = updated.provinsiAyah
            updated.kabupatenKotaWali = updated.kabupatenKotaAyah
            updated.kecamatanWali = updated.kecamatanAyah
            updated.kelurahanDesaWali = updated.kelurahanDesaAyah
            updated.rtWali = updated.rtAyah
            updated.rwWali = updated.rwAyah
            updated.kodePosWali = updated.kodePosAyah
            updated.alamatWali = updated.alamatAyah
            updated.statusKepemilikanRumahWali = updated.statusKepemilikanRumahAyah
          } else {
            updated.provinsiWali = updated.provinsiIbu
            updated.kabupatenKotaWali = updated.kabupatenKotaIbu
            updated.kecamatanWali = updated.kecamatanIbu
            updated.kelurahanDesaWali = updated.kelurahanDesaIbu
            updated.rtWali = updated.rtIbu
            updated.rwWali = updated.rwIbu
            updated.kodePosWali = updated.kodePosIbu
            updated.alamatWali = updated.alamatIbu
            updated.statusKepemilikanRumahWali = updated.statusKepemilikanRumahIbu
          }
        }
      }

      if (key === "pekerjaanAyah" && value === "Tidak Bekerja") {
        updated.penghasilanAyah = ""
      }
      if (key === "pekerjaanIbu" && value === "Tidak Bekerja") {
        updated.penghasilanIbu = ""
      }
      if (key === "pekerjaanWali" && value === "Tidak Bekerja") {
        updated.penghasilanWali = ""
      }

      if (key === "hobi" && value !== "Lainnya") {
        updated.hobiLainnya = ""
      }
      if (key === "citacita" && value !== "Lainnya") {
        updated.citacitaLainnya = ""
      }

      return updated
    })
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

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const sekolahId = session?.user?.sekolahId || "super_admin"
      const url = await uploadToCloudinary(file, "avatar-siswa", { 
        maxSize: 200 * 1024, 
        maxDim: 500, 
        sekolahId 
      })
      setFotoUrl(url)
      handleChange("foto", url)
      toast.success("Foto berhasil diunggah!")
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Gagal mengunggah foto")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.namaLengkap) {
      toast.error("Nama lengkap wajib diisi")
      return
    }
    if (!form.nisLokal) {
      toast.error("NIS wajib diisi")
      return
    }
    if (!isEdit && !form.passwordSiswa) {
      toast.error("Password siswa wajib diisi")
      return
    }
    if (form.hobi === "Lainnya" && !form.hobiLainnya) {
      toast.error("Silakan isi hobi lainnya")
      return
    }
    if (form.citacita === "Lainnya" && !form.citacitaLainnya) {
      toast.error("Silakan isi cita-cita lainnya")
      return
    }
    if (form.statusWali === "Lainnya" && !form.hubunganWali) {
      toast.error("Silakan isi hubungan wali dengan siswa")
      return
    }
    if (form.emailSiswa && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailSiswa)) {
      toast.error("Email harus mengandung @")
      return
    }

    const finalHobi = form.hobi === "Lainnya" ? form.hobiLainnya : form.hobi
    const finalCitacita = form.citacita === "Lainnya" ? form.citacitaLainnya : form.citacita

    const payload: Record<string, unknown> = {
      nisn: form.nisn || "",
      nisLokal: form.nisLokal || undefined,
      namaLengkap: form.namaLengkap,
      jenisKelamin: form.jenisKelamin || undefined,
      tempatLahir: form.tempatLahir || undefined,
      tanggalLahir: form.tanggalLahir ? new Date(form.tanggalLahir) : undefined,
      nik: form.nik || undefined,
      agama: form.agama || undefined,
      noHpWhatsapp: form.noHpWhatsapp || undefined,
      emailSiswa: form.emailSiswa || undefined,
      status: form.status,
      kewarganegaraan: form.kewarganegaraan || undefined,
      hobi: finalHobi || undefined,
      citacita: finalCitacita || undefined,
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
      alamatLengkapAyah: form.alamatAyah || form.alamatLengkapAyah || undefined,
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
      alamatLengkapIbu: form.alamatIbu || form.alamatLengkapIbu || undefined,
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
      alamatLengkapWali: form.alamatWali || form.alamatLengkapWali || undefined,
      alamatIbuSamaDenganAyah: form.alamatIbuSamaDenganAyah === "true" || undefined,
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
      <DialogContent className="max-w-5xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              {isEdit ? "Edit Data Siswa" : "Tambah Data Siswa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-450 font-bold">
              Lengkapi form di bawah ini. Field bertanda <span className="text-destructive">*</span> wajib diisi.
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
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/40 bg-muted flex items-center justify-center overflow-hidden relative">
                    {uploading ? (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : null}
                    {fotoUrl ? (
                      <img src={fotoUrl} alt="Foto siswa" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground/50" />
                    )}
                  </div>
                  <Tooltip>
                    <TooltipTrigger
                      delay={0}
                      type="button"
                      onClick={() => fotoInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Camera className="w-3 h-3" />
                      )}
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>{uploading ? "Mengupload..." : "Upload foto"}</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoUpload} disabled={uploading} />
                </div>
                <div>
                  <p className="font-medium text-sm">Foto Siswa</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {uploading ? "Sedang mengunggah ke Cloudinary..." : "Klik ikon kamera untuk upload foto (opsional)"}
                  </p>
                  {fotoUrl && !uploading && (
                    <button type="button" onClick={() => { setFotoUrl(""); handleChange("foto", "") }} className="text-xs text-destructive mt-1 hover:underline cursor-pointer">
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
                  <Label htmlFor="nisn">NISN</Label>
                  <Input
                    id="nisn"
                    maxLength={10}
                    value={form.nisn}
                    onChange={(e) => handleChange("nisn", e.target.value.replace(/\D/g, ""))}
                    className="font-mono tracking-widest text-sm"
                    placeholder="terdiri dari 10 angka"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nisLokal">NIS *</Label>
                  <Input
                    id="nisLokal"
                    required
                    maxLength={6}
                    value={form.nisLokal}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "")
                      handleChange("nisLokal", val)
                      if (!isEdit) handleChange("usernameSiswa", val)
                    }}
                    className="font-mono tracking-widest text-sm"
                    placeholder="terdiri dari 6 digit angka"
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordSiswa">Password Siswa {!isEdit && "*"}</Label>
                  <div className="relative">
                    <Input
                      id="passwordSiswa"
                      type={showPassword ? "text" : "password"}
                      value={form.passwordSiswa as string}
                      onChange={(e) => handleChange("passwordSiswa", e.target.value)}
                      className="pr-10"
                      required={!isEdit}
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nik">NIK</Label>
                  <Input
                    id="nik"
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => handleChange("nik", e.target.value.replace(/\D/g, ""))}
                    placeholder="terdiri dari 16 digit angka"
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
                    onChange={(e) => handleChange("noHpWhatsapp", e.target.value.replace(/\D/g, ""))}
                    maxLength={13}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailSiswa">Email</Label>
                  <Input
                    id="emailSiswa"
                    type="email"
                    value={form.emailSiswa}
                    onChange={(e) => handleChange("emailSiswa", e.target.value)}
                    className={emailError ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50" : ""}
                  />
                  {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
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
                  {form.hobi === "Lainnya" && (
                    <Input
                      placeholder="Tulis hobi lainnya"
                      value={form.hobiLainnya}
                      onChange={(e) => handleChange("hobiLainnya", e.target.value)}
                      className="mt-2"
                    />
                  )}
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
                  {form.citacita === "Lainnya" && (
                    <Input
                      placeholder="Tulis cita-cita lainnya"
                      value={form.citacitaLainnya}
                      onChange={(e) => handleChange("citacitaLainnya", e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>No Kartu Keluarga</Label>
                  <Input
                    id="noKartuKeluarga"
                    maxLength={16}
                    value={form.noKartuKeluarga}
                    onChange={(e) => handleChange("noKartuKeluarga", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Kepala Keluarga</Label>
                  <Input
                    id="namaKepalaKeluarga"
                    value={form.namaKepalaKeluarga}
                    onChange={(e) => handleChange("namaKepalaKeluarga", e.target.value)}
                  />
                </div>
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
                        <Select value={form.penghasilanAyah} onValueChange={(v) => handleChange("penghasilanAyah", v)} disabled={isAyahTidakBekerja}>
                          <SelectTrigger className={isAyahTidakBekerja ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}>
                            <SelectValue placeholder={isAyahTidakBekerja ? "Tidak bekerja" : "Pilih"} />
                          </SelectTrigger>
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
                        <Input id="noHpAyah" type="tel" maxLength={13} value={form.noHpAyah} onChange={(e) => handleChange("noHpAyah", e.target.value.replace(/\D/g, ""))} placeholder="08xxxxxxxxxx" />
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
                        <Input id="nikIbu" maxLength={16} value={form.nikIbu} onChange={(e) => handleChange("nikIbu", e.target.value.replace(/\D/g, ""))} placeholder="terdiri dari 16 digit angka" />
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
                        <Select value={form.penghasilanIbu} onValueChange={(v) => handleChange("penghasilanIbu", v)} disabled={isIbuTidakBekerja}>
                          <SelectTrigger className={isIbuTidakBekerja ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}>
                            <SelectValue placeholder={isIbuTidakBekerja ? "Tidak bekerja" : "Pilih"} />
                          </SelectTrigger>
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
                        <Input id="noHpIbu" type="tel" maxLength={13} value={form.noHpIbu} onChange={(e) => handleChange("noHpIbu", e.target.value.replace(/\D/g, ""))} placeholder="08xxxxxxxxxx" />
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
                      <SelectContent sideOffset={0}>
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
                    <div className="space-y-2">
                      <Label htmlFor="hubunganWali">Hubungan dengan Siswa *</Label>
                      <Input
                        id="hubunganWali"
                        value={form.hubunganWali}
                        onChange={(e) => handleChange("hubunganWali", e.target.value)}
                        placeholder="Contoh: Paman, Bibi, Kakek, dll"
                      />
                    </div>
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
                        <Input id="nikWali" maxLength={16} value={form.nikWali} onChange={(e) => handleChange("nikWali", e.target.value.replace(/\D/g, ""))} placeholder="terdiri dari 16 digit angka" />
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
                        <Select value={form.penghasilanWali} onValueChange={(v) => handleChange("penghasilanWali", v)} disabled={isWaliTidakBekerja}>
                          <SelectTrigger className={isWaliTidakBekerja ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}>
                            <SelectValue placeholder={isWaliTidakBekerja ? "Tidak bekerja" : "Pilih"} />
                          </SelectTrigger>
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
                        <Input id="noHpWali" type="tel" maxLength={13} value={form.noHpWali} onChange={(e) => handleChange("noHpWali", e.target.value.replace(/\D/g, ""))} placeholder="08xxxxxxxxxx" />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alamat" className="space-y-6 mt-4">
              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Ayah</h3>
                <div className="space-y-2">
                  <Label htmlFor="alamatAyah">Alamat Lengkap</Label>
                  <Input id="alamatAyah" value={form.alamatAyah} onChange={(e) => handleChange("alamatAyah", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provinsi</Label>
                    <SearchableSelect
                      options={provinsiOptions}
                      value={form.provinsiAyah}
                      onValueChange={(v) => { handleChange("provinsiAyah", v); handleChange("kabupatenKotaAyah", ""); handleChange("kecamatanAyah", ""); handleChange("kelurahanDesaAyah", "") }}
                      placeholder="Pilih Provinsi"
                      loading={loadingProvinsi}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kabupaten/Kota</Label>
                    <SearchableSelect
                      options={kabupatenAyahOptions}
                      value={form.kabupatenKotaAyah}
                      onValueChange={(v) => { handleChange("kabupatenKotaAyah", v); handleChange("kecamatanAyah", ""); handleChange("kelurahanDesaAyah", "") }}
                      placeholder="Pilih Kab/Kota"
                      disabled={!form.provinsiAyah}
                      loading={loadingKabAyah}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kecamatan</Label>
                    <SearchableSelect
                      options={kecamatanAyahOptions}
                      value={form.kecamatanAyah}
                      onValueChange={(v) => { handleChange("kecamatanAyah", v); handleChange("kelurahanDesaAyah", "") }}
                      placeholder="Pilih Kecamatan"
                      disabled={!form.kabupatenKotaAyah}
                      loading={loadingKecAyah}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kelurahan/Desa</Label>
                    <SearchableSelect
                      options={kelurahanAyahOptions}
                      value={form.kelurahanDesaAyah}
                      onValueChange={(v) => handleChange("kelurahanDesaAyah", v)}
                      placeholder="Pilih Kelurahan/Desa"
                      disabled={!form.kecamatanAyah}
                      loading={loadingKelAyah}
                    />
                  </div>
                </div>
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
                    <Label htmlFor="kodePosAyah">Kode Pos</Label>
                    <Input id="kodePosAyah" maxLength={5} value={form.kodePosAyah} onChange={(e) => handleChange("kodePosAyah", e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rtAyah">RT</Label>
                    <Input id="rtAyah" maxLength={3} value={form.rtAyah} onChange={(e) => handleChange("rtAyah", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rwAyah">RW</Label>
                    <Input id="rwAyah" maxLength={3} value={form.rwAyah} onChange={(e) => handleChange("rwAyah", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Ibu</h3>
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
                {form.alamatIbuSamaDenganAyah === "true" ? (
                  <div className="bg-sky-50 border border-sky-100 text-sky-700 rounded-md px-3 py-2 text-sm">
                    Alamat Ibu akan terisi otomatis sama dengan Alamat Ayah
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="alamatIbu">Alamat Lengkap</Label>
                      <Input id="alamatIbu" value={form.alamatIbu} onChange={(e) => handleChange("alamatIbu", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Provinsi</Label>
                        <SearchableSelect
                          options={provinsiOptions}
                          value={form.provinsiIbu}
                          onValueChange={(v) => { handleChange("provinsiIbu", v); handleChange("kabupatenKotaIbu", ""); handleChange("kecamatanIbu", ""); handleChange("kelurahanDesaIbu", "") }}
                          placeholder="Pilih Provinsi"
                          loading={loadingProvinsi}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kabupaten/Kota</Label>
                        <SearchableSelect
                          options={kabupatenIbuOptions}
                          value={form.kabupatenKotaIbu}
                          onValueChange={(v) => { handleChange("kabupatenKotaIbu", v); handleChange("kecamatanIbu", ""); handleChange("kelurahanDesaIbu", "") }}
                          placeholder="Pilih Kab/Kota"
                          disabled={!form.provinsiIbu}
                          loading={loadingKabIbu}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kecamatan</Label>
                        <SearchableSelect
                          options={kecamatanIbuOptions}
                          value={form.kecamatanIbu}
                          onValueChange={(v) => { handleChange("kecamatanIbu", v); handleChange("kelurahanDesaIbu", "") }}
                          placeholder="Pilih Kecamatan"
                          disabled={!form.kabupatenKotaIbu}
                          loading={loadingKecIbu}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kelurahan/Desa</Label>
                        <SearchableSelect
                          options={kelurahanIbuOptions}
                          value={form.kelurahanDesaIbu}
                          onValueChange={(v) => handleChange("kelurahanDesaIbu", v)}
                          placeholder="Pilih Kelurahan/Desa"
                          disabled={!form.kecamatanIbu}
                          loading={loadingKelIbu}
                        />
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
                        <Label>Kode Pos</Label>
                        <Input id="kodePosIbu" maxLength={5} value={form.kodePosIbu} onChange={(e) => handleChange("kodePosIbu", e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rtIbu">RT</Label>
                        <Input id="rtIbu" maxLength={3} value={form.rtIbu} onChange={(e) => handleChange("rtIbu", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rwIbu">RW</Label>
                        <Input id="rwIbu" maxLength={3} value={form.rwIbu} onChange={(e) => handleChange("rwIbu", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Alamat Wali</h3>
                <div className="space-y-2">
                  <Label>Opsi Alamat</Label>
                  <Select value={form.alamatWaliOption} onValueChange={(v) => handleChange("alamatWaliOption", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih opsi alamat" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sama_ayah">Sama dengan Alamat Ayah</SelectItem>
                      <SelectItem value="sama_ibu">Sama dengan Alamat Ibu</SelectItem>
                      <SelectItem value="lainnya">Isi manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.alamatWaliOption === "sama_ayah" && (
                  <div className="bg-sky-50 border border-sky-100 text-sky-700 rounded-md px-3 py-2 text-sm">
                    Alamat Wali akan terisi otomatis sama dengan Alamat Ayah
                  </div>
                )}
                {form.alamatWaliOption === "sama_ibu" && (
                  <div className="bg-sky-50 border border-sky-100 text-sky-700 rounded-md px-3 py-2 text-sm">
                    Alamat Wali akan terisi otomatis sama dengan Alamat Ibu
                  </div>
                )}
                {form.alamatWaliOption === "lainnya" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="alamatWali">Alamat Lengkap</Label>
                      <Input id="alamatWali" value={form.alamatWali} onChange={(e) => handleChange("alamatWali", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Provinsi</Label>
                        <SearchableSelect
                          options={provinsiOptions}
                          value={form.provinsiWali}
                          onValueChange={(v) => { handleChange("provinsiWali", v); handleChange("kabupatenKotaWali", ""); handleChange("kecamatanWali", ""); handleChange("kelurahanDesaWali", "") }}
                          placeholder="Pilih Provinsi"
                          loading={loadingProvinsi}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kabupaten/Kota</Label>
                        <SearchableSelect
                          options={kabupatenWaliOptions}
                          value={form.kabupatenKotaWali}
                          onValueChange={(v) => { handleChange("kabupatenKotaWali", v); handleChange("kecamatanWali", ""); handleChange("kelurahanDesaWali", "") }}
                          placeholder="Pilih Kab/Kota"
                          disabled={!form.provinsiWali}
                          loading={loadingKabWali}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kecamatan</Label>
                        <SearchableSelect
                          options={kecamatanWaliOptions}
                          value={form.kecamatanWali}
                          onValueChange={(v) => { handleChange("kecamatanWali", v); handleChange("kelurahanDesaWali", "") }}
                          placeholder="Pilih Kecamatan"
                          disabled={!form.kabupatenKotaWali}
                          loading={loadingKecWali}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kelurahan/Desa</Label>
                        <SearchableSelect
                          options={kelurahanWaliOptions}
                          value={form.kelurahanDesaWali}
                          onValueChange={(v) => handleChange("kelurahanDesaWali", v)}
                          placeholder="Pilih Kelurahan/Desa"
                          disabled={!form.kecamatanWali}
                          loading={loadingKelWali}
                        />
                      </div>
                    </div>
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
                        <Label htmlFor="kodePosWali">Kode Pos</Label>
                        <Input id="kodePosWali" maxLength={5} value={form.kodePosWali} onChange={(e) => handleChange("kodePosWali", e.target.value.replace(/\D/g, ""))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rtWali">RT</Label>
                        <Input id="rtWali" maxLength={3} value={form.rtWali} onChange={(e) => handleChange("rtWali", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rwWali">RW</Label>
                        <Input id="rwWali" maxLength={3} value={form.rwWali} onChange={(e) => handleChange("rwWali", e.target.value.replace(/\D/g, ""))} placeholder="3 digit angka" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg">Tempat Tinggal Siswa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status Tempat Tinggal</Label>
                    <Select value={form.statusTempatTinggalSiswa} onValueChange={(v) => handleChange("statusTempatTinggalSiswa", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {statusTempatTinggalOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
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
                    <Label>Jarak Tempat Tinggal ke Sekolah</Label>
                    <Select value={form.jarakTempatTinggalKeSekolah} onValueChange={(v) => handleChange("jarakTempatTinggalKeSekolah", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {jarakTempatTinggalOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Waktu Tempuh ke Sekolah</Label>
                    <Select value={form.waktuTempuhKeSekolah} onValueChange={(v) => handleChange("waktuTempuhKeSekolah", v)}>
                      <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>
                        {waktuTempuhOptions.map((opt) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Simpan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DialogContent>
  </Dialog>
  )
}
