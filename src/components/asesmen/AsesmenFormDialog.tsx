"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, ClipboardCheck } from "lucide-react"
import { toast } from "sonner"

function FieldWrap({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/80">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  )
}

interface Props {
  open: boolean
  item?: any | null
  onClose: () => void
  onSaved: () => void
}

export default function AsesmenFormDialog({ open, item, onClose, onSaved }: Props) {
  const utils = api.useUtils()
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery()
  const { data: guruList } = api.guru.getAll.useQuery(
    { limit: 500 },
    { enabled: !currentGuru },
  )

  const [guruId, setGuruId] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [kategori, setKategori] = useState("formatif_proses")
  const [teknik, setTeknik] = useState("tes_tertulis")
  const [jenisPengumpulan, setJenisPengumpulan] = useState("unggah_file")
  const [kktp, setKktp] = useState("70")
  const [deadline, setDeadline] = useState("")

  const createMutation = api.asesmen.create.useMutation()
  const updateMutation = api.asesmen.update.useMutation()

  const selectedGuruLabel = useMemo(() => {
    if (!guruId) return ""
    const g = guruList?.find((g) => g.id === guruId)
    return g ? g.namaLengkap : ""
  }, [guruId, guruList])

  const selectedKelasLabel = useMemo(() => {
    if (!kelasId) return ""
    const k = kelasList?.find((k) => k.id === kelasId)
    return k ? `${k.tingkat ?? ""} - ${k.namaKelas}` : ""
  }, [kelasId, kelasList])

  const selectedMapelLabel = useMemo(() => {
    if (!mataPelajaranId) return ""
    const m = mapelList?.find((m) => m.id === mataPelajaranId)
    return m ? m.namaMapel : ""
  }, [mataPelajaranId, mapelList])

  useEffect(() => {
    if (!open) return
    if (item) {
      setGuruId(item.guruId || "")
      setKelasId(item.kelasId || "")
      setMataPelajaranId(item.mataPelajaranId || "")
      setJudul(item.judul || "")
      setDeskripsi(item.deskripsi || "")
      setKategori(item.kategori || "formatif_proses")
      setTeknik(item.teknik || "tes_tertulis")
      setJenisPengumpulan(item.jenisPengumpulan || "unggah_file")
      setKktp(String(item.kktp ?? 70))
      setDeadline(item.deadline ? new Date(item.deadline).toISOString().slice(0, 16) : "")
    } else {
      setGuruId(currentGuru?.id || "")
      setKelasId("")
      setMataPelajaranId("")
      setJudul("")
      setDeskripsi("")
      setKategori("formatif_proses")
      setTeknik("tes_tertulis")
      setJenisPengumpulan("unggah_file")
      setKktp("70")
      setDeadline("")
    }
  }, [open, item, currentGuru])

  const handleSave = async () => {
    if (!judul.trim()) { toast.error("Judul harus diisi"); return }
    if (!kelasId) { toast.error("Kelas harus dipilih"); return }
    if (!mataPelajaranId) { toast.error("Mata pelajaran harus dipilih"); return }
    if (!guruId) { toast.error("Guru harus dipilih"); return }

    setSaving(true)
    try {
      const payload = {
        guruId,
        kelasId,
        mataPelajaranId,
        judul: judul.trim(),
        deskripsi: deskripsi || null,
        kategori: kategori as any,
        teknik: teknik as any,
        jenisPengumpulan: jenisPengumpulan as any,
        kktp: parseInt(kktp) || 70,
        deadline: deadline ? new Date(deadline) : null,
      }

      if (item) {
        await updateMutation.mutateAsync({ id: item.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      toast.success(item ? "Asesmen berhasil diperbarui" : "Asesmen berhasil dibuat")
      utils.asesmen.getAll.invalidate()
      onSaved()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan asesmen")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">{item ? "Edit Asesmen" : "Buat Asesmen Baru"}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Lengkapi informasi asesmen di bawah ini</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <FieldWrap label="Judul Asesmen" required>
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="e.g. Tes Formatif Bab 3" className="h-9 rounded-xl" />
          </FieldWrap>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrap label="Kategori" required>
              <Select value={kategori} onValueChange={(v) => setKategori(v ?? "formatif_proses")}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formatif_awal">Formatif Awal</SelectItem>
                  <SelectItem value="formatif_proses">Formatif Proses</SelectItem>
                  <SelectItem value="sumatif">Sumatif</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>

            <FieldWrap label="Teknik">
              <Select value={teknik} onValueChange={(v) => setTeknik(v ?? "tes_tertulis")}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tes_tertulis">Tes Tertulis</SelectItem>
                  <SelectItem value="tes_lisan">Tes Lisan</SelectItem>
                  <SelectItem value="penugasan">Penugasan</SelectItem>
                  <SelectItem value="praktik">Praktik</SelectItem>
                  <SelectItem value="proyek">Proyek</SelectItem>
                  <SelectItem value="portofolio">Portofolio</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldWrap label="Jenis Pengumpulan">
              <Select value={jenisPengumpulan} onValueChange={(v) => setJenisPengumpulan(v ?? "unggah_file")}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unggah_file">Unggah File</SelectItem>
                  <SelectItem value="teks">Teks</SelectItem>
                  <SelectItem value="cbt">CBT</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>

            <FieldWrap label="KKTP" required>
              <Input type="number" min={0} max={100} value={kktp} onChange={(e) => setKktp(e.target.value)} className="h-9 rounded-xl" />
            </FieldWrap>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {!currentGuru && (
              <FieldWrap label="Guru" required>
                <Select value={guruId} onValueChange={(v) => setGuruId(v ?? "")}>
                  <SelectTrigger className="h-9 rounded-xl">
                    <SelectValue placeholder="Pilih guru">{selectedGuruLabel || "Pilih guru"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {guruList?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            )}
            <FieldWrap label="Kelas" required>
              <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Pilih kelas">{selectedKelasLabel || "Pilih kelas"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>

            <FieldWrap label="Mata Pelajaran" required>
              <Select value={mataPelajaranId} onValueChange={(v) => setMataPelajaranId(v ?? "")}>
                <SelectTrigger className="h-9 rounded-xl">
                  <SelectValue placeholder="Pilih mapel">{selectedMapelLabel || "Pilih mapel"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mapelList?.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>

          <FieldWrap label="Deadline">
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 rounded-xl" />
          </FieldWrap>

          <FieldWrap label="Deskripsi">
            <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi asesmen..." className="rounded-xl min-h-[80px]" />
          </FieldWrap>
        </div>

        <div className="p-5 pt-4 border-t border-border/50 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl h-9 px-4">Batal</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl h-9 px-4 gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {item ? "Perbarui" : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
