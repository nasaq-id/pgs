"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ClipboardList } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

interface TugasItem {
  id: string
  guruId: string
  kelasId: string
  mataPelajaranId: string
  judulTugas: string
  deskripsi?: string | null
  jenisTugas?: string | null
  tanggalDiberikan?: Date | null
  deadline?: Date | null
  status: "aktif" | "ditutup"
  catatan?: string | null
}

interface Props {
  item?: TugasItem | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultGuruId?: string
}

export default function TugasFormDialog({ item, open, onClose, onSaved, defaultGuruId }: Props) {
  const [judulTugas, setJudulTugas] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [jenisTugas, setJenisTugas] = useState("")
  const [guruId, setGuruId] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [tanggalDiberikan, setTanggalDiberikan] = useState("")
  const [deadline, setDeadline] = useState("")
  const [catatan, setCatatan] = useState("")
  const [status, setStatus] = useState<"aktif" | "ditutup">("aktif")
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: mapelList } = api.mapel.getAll.useQuery({})
  const { data: guruList } = api.guru.getAll.useQuery({})

  const createTugas = api.lms.createTugas.useMutation()
  const updateTugas = api.lms.updateTugas.useMutation()

  useEffect(() => {
    if (!open) return
    if (item) {
      setJudulTugas(item.judulTugas)
      setDeskripsi(item.deskripsi || "")
      setJenisTugas(item.jenisTugas || "")
      setGuruId(item.guruId)
      setKelasId(item.kelasId)
      setMataPelajaranId(item.mataPelajaranId)
      setTanggalDiberikan(item.tanggalDiberikan ? new Date(item.tanggalDiberikan).toISOString().split("T")[0] : "")
      setDeadline(item.deadline ? new Date(item.deadline).toISOString().split("T")[0] : "")
      setCatatan(item.catatan || "")
      setStatus(item.status || "aktif")
    } else {
      setJudulTugas("")
      setDeskripsi("")
      setJenisTugas("")
      setGuruId(defaultGuruId || "")
      setKelasId("")
      setMataPelajaranId("")
      setTanggalDiberikan(new Date().toISOString().split("T")[0])
      setDeadline("")
      setCatatan("")
      setStatus("aktif")
    }
  }, [open, item, defaultGuruId])

  const handleSave = async () => {
    if (!judulTugas.trim()) { toast.error("Judul tugas wajib diisi"); return }
    if (!jenisTugas) { toast.error("Jenis tugas wajib dipilih"); return }
    if (!guruId) { toast.error("Guru wajib dipilih"); return }
    if (!kelasId) { toast.error("Kelas wajib dipilih"); return }
    if (!mataPelajaranId) { toast.error("Mata pelajaran wajib dipilih"); return }
    if (!deadline) { toast.error("Deadline wajib diisi"); return }

    const payload = {
      judulTugas,
      guruId,
      kelasId,
      mataPelajaranId,
      jenisTugas,
      deskripsi: deskripsi || null,
      catatan: catatan || null,
      tanggalDiberikan: tanggalDiberikan ? new Date(tanggalDiberikan + "T00:00:00") : null,
      deadline: deadline ? new Date(deadline + "T00:00:00") : null,
      status,
    }

    setSaving(true)
    try {
      if (item) {
        await updateTugas.mutateAsync({ id: item.id, data: payload })
        toast.success("Tugas berhasil diperbarui")
      } else {
        await createTugas.mutateAsync(payload)
        toast.success("Tugas berhasil dibuat")
      }
      onSaved()
      onClose()
    } catch {
      toast.error("Gagal menyimpan tugas")
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            {item ? "Edit Tugas" : "Buat Tugas Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-4">
            <FieldWrap label="Judul Tugas" required>
              <Input value={judulTugas} onChange={(e) => setJudulTugas(e.target.value)} placeholder="Contoh: Latihan Soal Bab 3" />
            </FieldWrap>

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Jenis Tugas" required>
                <Select value={jenisTugas} onValueChange={(v) => setJenisTugas(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tugas Harian">Tugas Harian</SelectItem>
                    <SelectItem value="PR (Pekerjaan Rumah)">PR</SelectItem>
                    <SelectItem value="Proyek">Proyek</SelectItem>
                    <SelectItem value="Latihan">Latihan</SelectItem>
                    <SelectItem value="Ulangan">Ulangan</SelectItem>
                    <SelectItem value="Kuis">Kuis</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Guru" required>
                <Select value={guruId} onValueChange={(v) => setGuruId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                  <SelectContent>
                    {guruList?.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>

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

            <div className="grid grid-cols-2 gap-3">
              <FieldWrap label="Tanggal Diberikan" required>
                <Input type="date" value={tanggalDiberikan} onChange={(e) => setTanggalDiberikan(e.target.value)} />
              </FieldWrap>
              <FieldWrap label="Deadline" required>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} min={tanggalDiberikan} />
              </FieldWrap>
            </div>

            <FieldWrap label="Deskripsi Tugas" optional>
              <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Jelaskan tugas yang diberikan..." rows={3} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Catatan" optional>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2} className="resize-none" />
            </FieldWrap>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {item ? "Simpan Perubahan" : "Buat Tugas"}
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
