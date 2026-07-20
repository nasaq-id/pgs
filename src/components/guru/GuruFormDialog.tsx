"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import GuruFormInfoTab from "./GuruFormInfoTab"
import GuruFormKepegawaianTab from "./GuruFormKepegawaianTab"
import GuruFormPendidikanTab from "./GuruFormPendidikanTab"

interface GuruFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: any | null
  onSuccess: () => void
}

const defaultForm: Record<string, unknown> = {
  nipnuptk: "",
  nik: "",
  namaLengkap: "",
  jenisKelamin: "",
  tempatLahir: "",
  tanggalLahir: "",
  noHp: "",
  email: "",
  pendidikanTerakhir: "",
  riwayatPendidikan: "",
  usernameGuru: "",
  passwordGuru: "",
  statusKepegawaian: "",
  kategoriPegawai: "Guru",
  tugasUtama: "",
  tugasTambahan: [] as string[],
  jp: undefined as number | undefined,
  mulaiBertugas: "",
  akhirBertugas: "",
  active: true,
  foto: "",
  alamat: "",
}

export default function GuruFormDialog({ open, onOpenChange, initialData, onSuccess }: GuruFormDialogProps) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...defaultForm })
  const [activeTab, setActiveTab] = useState("info")

  const createMutation = api.guru.create.useMutation({
    onSuccess: () => {
      toast.success("Data guru berhasil ditambahkan")
      onSuccess()
    },
    onError: (err) => toast.error(err.message || "Gagal menyimpan data guru"),
  })

  const updateMutation = api.guru.update.useMutation({
    onSuccess: () => {
      toast.success("Data guru berhasil diperbarui")
      onSuccess()
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui data guru"),
  })

  const isSaving = createMutation.isPending || updateMutation.isPending
  const isEdit = !!initialData

  const handleChange = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (open) {
      if (initialData) {
        setForm({
          nipnuptk: initialData.nipnuptk || "",
          nik: initialData.nik || "",
          namaLengkap: initialData.namaLengkap || "",
          jenisKelamin: initialData.jenisKelamin || "",
          tempatLahir: initialData.tempatLahir || "",
          tanggalLahir: initialData.tanggalLahir
            ? new Date(initialData.tanggalLahir).toISOString().split("T")[0]
            : "",
          noHp: initialData.noHp || "",
          email: initialData.email || "",
          pendidikanTerakhir: initialData.pendidikanTerakhir || "",
          riwayatPendidikan: initialData.riwayatPendidikan || "",
          usernameGuru: initialData.usernameGuru || "",
          passwordGuru: "",
          statusKepegawaian: initialData.statusKepegawaian || "",
          kategoriPegawai: initialData.kategoriPegawai || "Guru",
          tugasUtama: initialData.tugasUtama || "",
          tugasTambahan: initialData.tugasTambahan
            ? typeof initialData.tugasTambahan === "string"
              ? initialData.tugasTambahan.split(",").map((t: string) => t.trim()).filter(Boolean)
              : initialData.tugasTambahan
            : [],
          jp: initialData.jp ?? undefined,
          mulaiBertugas: initialData.mulaiBertugas
            ? new Date(initialData.mulaiBertugas).toISOString().split("T")[0]
            : "",
          akhirBertugas: initialData.akhirBertugas
            ? new Date(initialData.akhirBertugas).toISOString().split("T")[0]
            : "",
          active: initialData.active !== false,
          foto: initialData.foto || "",
          alamat: initialData.alamat || "",
        })
      } else {
        setForm({ ...defaultForm })
      }
      setActiveTab("info")
    }
  }, [open, initialData])

  const handleSubmit = async () => {
    if (!form.namaLengkap) return toast.error("Nama lengkap wajib diisi")
    if (!form.usernameGuru) return toast.error("Username wajib diisi")
    if (!isEdit && !form.passwordGuru) return toast.error("Password wajib diisi")

    const tugasTambahan = Array.isArray(form.tugasTambahan)
      ? form.tugasTambahan.filter(Boolean).join(", ")
      : String(form.tugasTambahan || "")

    const payload: Record<string, unknown> = {
      nipnuptk: form.nipnuptk || undefined,
      nik: form.nik || undefined,
      namaLengkap: form.namaLengkap,
      jenisKelamin: form.jenisKelamin || undefined,
      tempatLahir: form.tempatLahir || undefined,
      tanggalLahir: form.tanggalLahir ? new Date(form.tanggalLahir as string) : undefined,
      alamat: form.alamat || undefined,
      noHp: form.noHp || undefined,
      email: form.email || undefined,
      pendidikanTerakhir: form.pendidikanTerakhir || undefined,
      riwayatPendidikan: form.riwayatPendidikan ? String(form.riwayatPendidikan) : undefined,
      statusKepegawaian: form.statusKepegawaian || undefined,
      kategoriPegawai: form.kategoriPegawai || undefined,
      tugasUtama: form.tugasUtama || undefined,
      tugasTambahan: tugasTambahan || undefined,
      mulaiBertugas: form.mulaiBertugas ? new Date(form.mulaiBertugas as string) : undefined,
      akhirBertugas: form.akhirBertugas ? new Date(form.akhirBertugas as string) : undefined,
      jp: form.jp !== undefined && form.jp !== "" ? Number(form.jp) : undefined,
      usernameGuru: form.usernameGuru || undefined,
      passwordGuru: form.passwordGuru || undefined,
      active: form.active !== false,
      foto: form.foto || undefined,
    }

    try {
      if (isEdit && initialData?.id) {
        await updateMutation.mutateAsync({ id: initialData.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload as any)
      }
      onOpenChange(false)
    } catch {
      // handled by mutation callbacks
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              {isEdit ? "Edit Data Guru/Tendik" : "Tambah Guru/Tendik"}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full flex p-1 bg-slate-100 rounded-xl mb-4">
              <TabsTrigger value="info" className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                Informasi Utama
              </TabsTrigger>
              <TabsTrigger value="kepegawaian" className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                Data Kepegawaian
              </TabsTrigger>
              <TabsTrigger value="pendidikan" className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg data-[state=active]:bg-white data-[state=active]:text-teal-600 data-[state=active]:shadow-sm">
                Riwayat Pendidikan
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="pt-2">
              <GuruFormInfoTab form={form} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="kepegawaian" className="pt-2">
              <GuruFormKepegawaianTab form={form} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="pendidikan" className="pt-2">
              <GuruFormPendidikanTab form={form} onChange={handleChange} />
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
              type="button"
              onClick={handleSubmit}
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
