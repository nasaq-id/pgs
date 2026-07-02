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
          usernameGuru: initialData.usernameGuru || "",
          passwordGuru: initialData.passwordGuru || "",
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Data Guru/Tendik" : "Tambah Guru/Tendik"}</DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Informasi Utama</TabsTrigger>
            <TabsTrigger value="kepegawaian" className="flex-1">Data Kepegawaian</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="pt-4">
            <GuruFormInfoTab form={form} onChange={handleChange} />
          </TabsContent>
          <TabsContent value="kepegawaian" className="pt-4">
            <GuruFormKepegawaianTab form={form} onChange={handleChange} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
