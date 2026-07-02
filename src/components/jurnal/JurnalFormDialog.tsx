"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

interface JurnalItem {
  id: string
  guruId: string
  kelasId: string
  mataPelajaranId: string
  tanggal: Date
  judulJurnal?: string | null
  tujuanPembelajaran?: string | null
  materiKonten?: string | null
  kegiatanPembelajaran?: string | null
  catatan?: string | null
  status: "draft" | "selesai"
  jamMulai?: Date | null
  jamSelesai?: Date | null
}

interface Props {
  item?: JurnalItem | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultGuruId?: string
}

export default function JurnalFormDialog({ item, open, onClose, onSaved, defaultGuruId }: Props) {
  const [judulJurnal, setJudulJurnal] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [jamMulai, setJamMulai] = useState("")
  const [jamSelesai, setJamSelesai] = useState("")
  const [tujuanPembelajaran, setTujuanPembelajaran] = useState("")
  const [materiKonten, setMateriKonten] = useState("")
  const [kegiatanPembelajaran, setKegiatanPembelajaran] = useState("")
  const [catatan, setCatatan] = useState("")
  const [status, setStatus] = useState<"draft" | "selesai">("draft")
  const [guruId, setGuruId] = useState("")
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: mapelList } = api.mapel.getAll.useQuery({})

  const createJurnal = api.lms.createJurnal.useMutation()
  const updateJurnal = api.lms.updateJurnal.useMutation()

  useEffect(() => {
    if (!open) return
    if (item) {
      setJudulJurnal(item.judulJurnal || "")
      setKelasId(item.kelasId)
      setMataPelajaranId(item.mataPelajaranId)
      setTanggal(item.tanggal ? new Date(item.tanggal).toISOString().split("T")[0] : "")
      setJamMulai(item.jamMulai ? new Date(item.jamMulai).toTimeString().slice(0, 5) : "")
      setJamSelesai(item.jamSelesai ? new Date(item.jamSelesai).toTimeString().slice(0, 5) : "")
      setTujuanPembelajaran(item.tujuanPembelajaran || "")
      setMateriKonten(item.materiKonten || "")
      setKegiatanPembelajaran(item.kegiatanPembelajaran || "")
      setCatatan(item.catatan || "")
      setStatus(item.status || "draft")
      setGuruId(item.guruId)
    } else {
      setJudulJurnal("")
      setKelasId("")
      setMataPelajaranId("")
      setTanggal(new Date().toISOString().split("T")[0])
      setJamMulai("")
      setJamSelesai("")
      setTujuanPembelajaran("")
      setMateriKonten("")
      setKegiatanPembelajaran("")
      setCatatan("")
      setStatus("draft")
      setGuruId(defaultGuruId || "")
    }
  }, [open, item, defaultGuruId])

  const handleSave = async () => {
    if (!judulJurnal.trim()) { toast.error("Judul jurnal wajib diisi"); return }
    if (!kelasId) { toast.error("Kelas wajib dipilih"); return }
    if (!mataPelajaranId) { toast.error("Mata pelajaran wajib dipilih"); return }
    if (!tanggal) { toast.error("Tanggal wajib diisi"); return }

    setSaving(true)
    try {
      const tanggalDate = new Date(tanggal + "T00:00:00")
      const jamMulaiDate = jamMulai ? new Date(`${tanggal}T${jamMulai}:00`) : null
      const jamSelesaiDate = jamSelesai ? new Date(`${tanggal}T${jamSelesai}:00`) : null

      if (item) {
        await updateJurnal.mutateAsync({
          id: item.id,
          data: {
            judulJurnal,
            kelasId,
            mataPelajaranId,
            tanggal: tanggalDate,
            jamMulai: jamMulaiDate,
            jamSelesai: jamSelesaiDate,
            tujuanPembelajaran: tujuanPembelajaran || null,
            materiKonten: materiKonten || null,
            kegiatanPembelajaran: kegiatanPembelajaran || null,
            catatan: catatan || null,
            status,
          },
        })
        toast.success("Jurnal berhasil diperbarui")
      } else {
        await createJurnal.mutateAsync({
          guruId: guruId || defaultGuruId || "",
          kelasId,
          mataPelajaranId,
          tanggal: tanggalDate,
          judulJurnal,
          jamMulai: jamMulaiDate,
          jamSelesai: jamSelesaiDate,
          tujuanPembelajaran: tujuanPembelajaran || null,
          materiKonten: materiKonten || null,
          kegiatanPembelajaran: kegiatanPembelajaran || null,
          catatan: catatan || null,
          status,
        })
        toast.success("Jurnal berhasil dibuat")
      }
      onSaved()
      onClose()
    } catch {
      toast.error("Gagal menyimpan jurnal")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            {item ? "Edit Jurnal" : "Buat Jurnal Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-4">
            <FieldWrap label="Judul Jurnal" required>
              <Input value={judulJurnal} onChange={(e) => setJudulJurnal(e.target.value)} placeholder="Contoh: Bab 1 Bilangan" />
            </FieldWrap>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Kelas" required>
                <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {kelasList?.map((k) => <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Mata Pelajaran" required>
                <Select value={mataPelajaranId} onValueChange={(v) => setMataPelajaranId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                  <SelectContent>
                    {mapelList?.map((m) => <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FieldWrap label="Tanggal" required>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Jam Mulai">
                <Input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Jam Selesai">
                <Input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
              </FieldWrap>
            </div>

            <FieldWrap label="Tujuan Pembelajaran">
              <Textarea value={tujuanPembelajaran} onChange={(e) => setTujuanPembelajaran(e.target.value)} placeholder="Tujuan pembelajaran..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Materi / Konten">
              <Textarea value={materiKonten} onChange={(e) => setMateriKonten(e.target.value)} placeholder="Materi yang diajarkan..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Kegiatan Pembelajaran">
              <Textarea value={kegiatanPembelajaran} onChange={(e) => setKegiatanPembelajaran(e.target.value)} placeholder="Deskripsi kegiatan..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Catatan">
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "selesai")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t bg-card flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {item ? "Simpan Perubahan" : "Buat Jurnal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldWrap({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {optional && <span className="text-muted-foreground text-xs ml-1">(opsional)</span>}
      </Label>
      {children}
    </div>
  )
}
