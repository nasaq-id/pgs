"use client"

import { useState, useEffect, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ClipboardCheck } from "lucide-react"
import { toast } from "sonner"

function FieldWrap({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
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

// Convert UTC or local date to localized YYYY-MM-DDTHH:mm string for datetime-local input
const toLocalDateTimeString = (date: Date | string) => {
  const d = new Date(date)
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
}

export default function AsesmenFormDialog({ open, item, onClose, onSaved }: Props) {
  const utils = api.useUtils()
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery()
  const { data: guruList } = api.guru.getLookup.useQuery(
    { limit: 500 },
    { enabled: !currentGuru },
  )

  const [guruId, setGuruId] = useState("")
  const [kelasId, setKelasId] = useState("") // Used for editing (single class)
  const [selectedKelasIds, setSelectedKelasIds] = useState<string[]>([]) // Used for creating (multiple classes)
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [judul, setJudul] = useState("")
  const [deskripsi, setDeskripsi] = useState("")
  const [kategori, setKategori] = useState("formatif_proses")
  const [teknik, setTeknik] = useState("tes_tertulis")
  const [jenisPengumpulan, setJenisPengumpulan] = useState("unggah_file")
  const [kktp, setKktp] = useState("70")
  const [deadline, setDeadline] = useState("")

  // Fetch teaching placements of currently logged-in guru
  const { data: pengampuList } = api.pengampu.getByGuru.useQuery(
    { guruId: currentGuru?.id ?? "" },
    { enabled: !!currentGuru }
  )

  const createMutation = api.asesmen.create.useMutation()
  const updateMutation = api.asesmen.update.useMutation()

  // Filter mapel list based on teacher's assignments
  const filteredMapelList = useMemo(() => {
    if (!currentGuru) return mapelList || []
    if (!pengampuList) return []
    // Get unique list of subjects taught by the teacher
    const subjectIds = new Set(pengampuList.map((p) => p.mataPelajaranId))
    return (mapelList || []).filter((m) => subjectIds.has(m.id))
  }, [mapelList, currentGuru, pengampuList])

  // Get available classes for creating based on selected subject (or all if admin)
  const availableClasses = useMemo(() => {
    if (!currentGuru) return kelasList || []
    if (!mataPelajaranId || !pengampuList) return []
    // Return only classes mapped to the teacher for the selected subject
    const list: any[] = []
    const seen = new Set()
    for (const p of pengampuList) {
      if (p.mataPelajaranId === mataPelajaranId && p.kelas) {
        if (!seen.has(p.kelas.id)) {
          seen.add(p.kelas.id)
          list.push(p.kelas)
        }
      }
    }
    return list
  }, [kelasList, currentGuru, mataPelajaranId, pengampuList])

  // Auto-select subject if there is only 1 mapped for the guru
  useEffect(() => {
    if (open && currentGuru && filteredMapelList.length > 0 && !mataPelajaranId && !item) {
      setMataPelajaranId(filteredMapelList[0].id)
    }
  }, [open, currentGuru, filteredMapelList, mataPelajaranId, item])

  // Sync state values when opening/closing or changing item
  useEffect(() => {
    if (!open) return
    if (item) {
      setGuruId(item.guruId || "")
      setKelasId(item.kelasId || "")
      setSelectedKelasIds([])
      setMataPelajaranId(item.mataPelajaranId || "")
      setJudul(item.judul || "")
      setDeskripsi(item.deskripsi || "")
      setKategori(item.kategori || "formatif_proses")
      setTeknik(item.teknik || "tes_tertulis")
      setJenisPengumpulan(item.jenisPengumpulan || "unggah_file")
      setKktp(String(item.kktp ?? 70))
      setDeadline(item.deadline ? toLocalDateTimeString(item.deadline) : "")
    } else {
      setGuruId(currentGuru?.id || "")
      setKelasId("")
      setSelectedKelasIds([])
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
    if (!mataPelajaranId) { toast.error("Mata pelajaran harus dipilih"); return }
    if (!guruId) { toast.error("Guru harus dipilih"); return }

    if (item) {
      if (!kelasId) { toast.error("Kelas harus dipilih"); return }
    } else {
      if (selectedKelasIds.length === 0) {
        toast.error("Minimal satu kelas harus dipilih")
        return
      }
    }

    setSaving(true)
    try {
      if (item) {
        // Edit flow
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
        await updateMutation.mutateAsync({ id: item.id, data: payload })
      } else {
        // Create flow (supports multiple classes)
        const payload = {
          guruId,
          kelasIds: selectedKelasIds,
          mataPelajaranId,
          judul: judul.trim(),
          deskripsi: deskripsi || null,
          kategori: kategori as any,
          teknik: teknik as any,
          jenisPengumpulan: jenisPengumpulan as any,
          kktp: parseInt(kktp) || 70,
          deadline: deadline ? new Date(deadline) : null,
        }
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
      <DialogContent className="max-w-lg p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative">
          <DialogHeader className="text-left mb-4 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-teal-550/10 flex items-center justify-center text-teal-650">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">{item ? "Edit Asesmen" : "Buat Asesmen Baru"}</DialogTitle>
                <p className="text-xs text-slate-450 font-bold mt-0.5">Lengkapi informasi asesmen di bawah ini</p>
              </div>
            </div>
          </DialogHeader>

        <div className="space-y-4 text-left">
          <FieldWrap label="Judul Asesmen" required>
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="e.g. Tes Formatif Bab 3" className="h-9 rounded-xl border-slate-200 dark:border-slate-800 focus:border-teal-500" />
          </FieldWrap>

          <div className="grid grid-cols-2 gap-3">
            {/* 1. Kategori Asesmen dengan opsi terbaru */}
            <FieldWrap label="Kategori Asesmen" required>
              <Select
                value={kategori}
                onValueChange={(v) => setKategori(v ?? "formatif_proses")}
                options={[
                  { value: "formatif_awal", label: "Formatif Awal (Diagnostik)" },
                  { value: "formatif_proses", label: "Formatif Proses (Latihan / Tugas)" },
                  { value: "sumatif", label: "Sumatif (Ulangan / UTS / UAS)" }
                ]}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formatif_awal">Formatif Awal (Diagnostik)</SelectItem>
                  <SelectItem value="formatif_proses">Formatif (Latihan / Tugas)</SelectItem>
                  <SelectItem value="sumatif">Sumatif (Ulangan / UTS / UAS)</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>

            <FieldWrap label="Teknik">
              <Select
                value={teknik}
                onValueChange={(v) => setTeknik(v ?? "tes_tertulis")}
                options={[
                  { value: "tes_tertulis", label: "Tes Tertulis" },
                  { value: "tes_lisan", label: "Tes Lisan" },
                  { value: "penugasan", label: "Penugasan" },
                  { value: "praktik", label: "Praktik" },
                  { value: "proyek", label: "Proyek" },
                  { value: "portofolio", label: "Portofolio" }
                ]}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
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
            {/* 2. Jenis Pengumpulan dengan opsi Langsung */}
            <FieldWrap label="Jenis Pengumpulan">
              <Select
                value={jenisPengumpulan}
                onValueChange={(v) => setJenisPengumpulan(v ?? "unggah_file")}
                options={[
                  { value: "unggah_file", label: "Unggah File" },
                  { value: "teks", label: "Teks" },
                  { value: "cbt", label: "CBT" },
                  { value: "langsung", label: "Langsung" }
                ]}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unggah_file">Unggah File</SelectItem>
                  <SelectItem value="teks">Teks</SelectItem>
                  <SelectItem value="cbt">CBT</SelectItem>
                  <SelectItem value="langsung">Langsung</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>

            <FieldWrap label="KKTP" required>
              <Input type="number" min={0} max={100} value={kktp} onChange={(e) => setKktp(e.target.value)} className="h-9 rounded-xl border-slate-200 dark:border-slate-800 focus:border-teal-500" />
            </FieldWrap>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Guru field (hanya jika admin) */}
            {!currentGuru && (
              <FieldWrap label="Guru" required>
                <Select
                  value={guruId}
                  onValueChange={(v) => setGuruId(v ?? "")}
                  options={guruList?.map((g) => ({ value: g.id, label: g.namaLengkap }))}
                >
                  <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Pilih guru" />
                  </SelectTrigger>
                  <SelectContent>
                    {guruList?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrap>
            )}

            {/* 3. Mata Pelajaran terisi otomatis sesuai akun guru */}
            <FieldWrap label="Mata Pelajaran" required>
              <Select
                value={mataPelajaranId}
                onValueChange={(v) => setMataPelajaranId(v ?? "")}
                options={filteredMapelList.map((m) => ({ value: m.id, label: m.namaMapel }))}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Pilih mapel" />
                </SelectTrigger>
                <SelectContent>
                  {filteredMapelList.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>

          {/* 4. Pilihan Kelas (Multi-select checkbox list untuk create, single Select untuk edit) */}
          {item ? (
            <FieldWrap label="Kelas" required>
              <Select
                value={kelasId}
                onValueChange={(v) => setKelasId(v ?? "")}
                options={kelasList?.map((k) => ({ value: k.id, label: `${k.tingkat ?? ""} - ${k.namaKelas}` }))}
              >
                <SelectTrigger className="h-9 rounded-xl border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelasList?.map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.tingkat ?? ""} - {k.namaKelas}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
          ) : (
            <FieldWrap label="Pilih Kelas (Bisa lebih dari satu)" required>
              {availableClasses.length === 0 ? (
                <p className="text-xs text-muted-foreground italic bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border border-dashed border-slate-200 dark:border-slate-800">
                  Silakan pilih mata pelajaran terlebih dahulu
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40">
                  {availableClasses.map((k) => {
                    const isChecked = selectedKelasIds.includes(k.id)
                    return (
                      <label key={k.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedKelasIds([...selectedKelasIds, k.id])
                            } else {
                              setSelectedKelasIds(selectedKelasIds.filter((id) => id !== k.id))
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>{k.tingkat ?? ""} - {k.namaKelas}</span>
                      </label>
                    )
                  })}
                </div>
              )}
            </FieldWrap>
          )}

          {/* 5. Form Deadline */}
          <FieldWrap label="Deadline Pengumpulan">
            <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="h-9 rounded-xl border-slate-200 dark:border-slate-800 focus:border-teal-500" />
          </FieldWrap>

          <FieldWrap label="Deskripsi">
            <Textarea value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Deskripsi asesmen..." className="rounded-xl min-h-[80px] border-slate-200 dark:border-slate-800 focus:border-teal-500" />
          </FieldWrap>
          </div>

          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{item ? "Perbarui" : "Simpan"}</span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
