"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, BookOpen } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

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
  statusKehadiran?: string | null
  detailKehadiran?: string | null
  status: "draft" | "selesai"
  jamMulai?: Date | null
  jamSelesai?: Date | null
}

interface AttendanceItem {
  siswaId: string
  status: "H" | "I" | "S" | "A"
}

type AttStatus = "H" | "I" | "S" | "A"

interface Props {
  item?: JurnalItem | null
  open: boolean
  onClose: () => void
  onSaved: () => void
  defaultGuruId?: string
}

const ATT_STATUS: Record<AttStatus, string> = { H: "Hadir", I: "Izin", S: "Sakit", A: "Alpa" }

const ATT_BTN: Record<AttStatus, string> = {
  H: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 data-[active=true]:bg-emerald-500 data-[active=true]:text-white",
  I: "bg-amber-100 text-amber-700 hover:bg-amber-200 data-[active=true]:bg-amber-500 data-[active=true]:text-white",
  S: "bg-orange-100 text-orange-700 hover:bg-orange-200 data-[active=true]:bg-orange-500 data-[active=true]:text-white",
  A: "bg-red-100 text-red-700 hover:bg-red-200 data-[active=true]:bg-red-500 data-[active=true]:text-white",
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
  const [hadirSemua, setHadirSemua] = useState(true)
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})

  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 }, { enabled: isAdmin })

  // Memos for selected dropdown labels to fix Radix/Base UI select trigger value display bugs
  const selectedGuruLabel = useMemo(() => {
    const g = guruList?.find((gr) => gr.id === guruId)
    return g ? g.namaLengkap : ""
  }, [guruId, guruList])

  const selectedKelasLabel = useMemo(() => {
    const k = kelasList?.find((kl) => kl.id === kelasId)
    return k ? (k.tingkat ? `${k.tingkat}-${k.namaKelas}` : k.namaKelas) : ""
  }, [kelasId, kelasList])

  const selectedMapelLabel = useMemo(() => {
    const m = mapelList?.find((mp) => mp.id === mataPelajaranId)
    return m ? m.namaMapel : ""
  }, [mataPelajaranId, mapelList])

  const { data: siswaList } = api.siswa.getAll.useQuery(
    { kelasId, status: "aktif", limit: 100 },
    { enabled: !!kelasId },
  )

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
    setAttendance({})
    setHadirSemua(true)
  }, [open, item, defaultGuruId])

  useEffect(() => {
    if (!open || !siswaList) return

    if (item?.detailKehadiran) {
      try {
        const parsed: AttendanceItem[] = JSON.parse(item.detailKehadiran)
        const attMap: Record<string, AttStatus> = {}
        let allHadir = true
        for (const a of parsed) {
          attMap[a.siswaId] = a.status
          if (a.status !== "H") allHadir = false
        }
        setAttendance(attMap)
        setHadirSemua(allHadir)
        return
      } catch {}
    }

    const defaultAtt: Record<string, AttStatus> = {}
    for (const s of siswaList) {
      defaultAtt[s.id] = "H"
    }
    setAttendance(defaultAtt)
    setHadirSemua(true)
  }, [siswaList, open, item?.detailKehadiran])

  const computeStatusKehadiran = () => {
    const counts = { H: 0, I: 0, S: 0, A: 0 }
    for (const s of Object.values(attendance)) {
      counts[s]++
    }
    return `Hadir: ${counts.H}, Izin: ${counts.I}, Sakit: ${counts.S}, Alpa: ${counts.A}`
  }

  const handleSave = async () => {
    if (!kelasId) { toast.error("Kelas wajib dipilih"); return }
    if (!mataPelajaranId) { toast.error("Mata pelajaran wajib dipilih"); return }
    if (!tanggal) { toast.error("Tanggal wajib diisi"); return }
    if (!tujuanPembelajaran.trim()) { toast.error("Tujuan pembelajaran wajib diisi"); return }
    if (!materiKonten.trim()) { toast.error("Materi/konten wajib diisi"); return }

    const targetGuruId = guruId || defaultGuruId || ""
    if (!targetGuruId) { toast.error("Guru pengampu wajib dipilih"); return }

    let finalJudul = judulJurnal.trim()
    if (!finalJudul) {
      const kelasName = kelasList?.find((k) => k.id === kelasId)?.namaKelas || ""
      const mapelName = mapelList?.find((m) => m.id === mataPelajaranId)?.namaMapel || ""
      const formattedDate = tanggal ? new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""
      finalJudul = `${kelasName} - ${mapelName} - ${formattedDate}`.trim()
      if (finalJudul.startsWith(" - ")) finalJudul = finalJudul.slice(3)
      if (!finalJudul) finalJudul = "Tanpa Judul"
    }

    setSaving(true)
    try {
      const tanggalDate = new Date(tanggal + "T00:00:00")
      const jamMulaiDate = jamMulai ? new Date(`${tanggal}T${jamMulai}:00`) : null
      const jamSelesaiDate = jamSelesai ? new Date(`${tanggal}T${jamSelesai}:00`) : null

      const detailKehadiran = JSON.stringify(
        Object.entries(attendance).map(([siswaId, st]) => ({ siswaId, status: st })),
      )
      const statusKehadiran = computeStatusKehadiran()

      if (item) {
        await updateJurnal.mutateAsync({
          id: item.id,
          data: {
            judulJurnal: finalJudul,
            kelasId,
            mataPelajaranId,
            tanggal: tanggalDate,
            jamMulai: jamMulaiDate,
            jamSelesai: jamSelesaiDate,
            tujuanPembelajaran,
            materiKonten,
            kegiatanPembelajaran: kegiatanPembelajaran || null,
            catatan: catatan || null,
            statusKehadiran,
            detailKehadiran,
            status,
          },
        })
        toast.success("Jurnal berhasil diperbarui")
      } else {
        await createJurnal.mutateAsync({
          guruId: targetGuruId,
          kelasId,
          mataPelajaranId,
          tanggal: tanggalDate,
          judulJurnal: finalJudul,
          jamMulai: jamMulaiDate,
          jamSelesai: jamSelesaiDate,
          tujuanPembelajaran,
          materiKonten,
          kegiatanPembelajaran: kegiatanPembelajaran || null,
          catatan: catatan || null,
          statusKehadiran,
          detailKehadiran,
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
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
            {isAdmin && (
              <FieldWrap label="Guru Pengampu" required>
                <Select value={guruId} onValueChange={(v) => setGuruId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih guru pengampu">{selectedGuruLabel || "Pilih guru pengampu"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {guruList?.map((g) => <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
            )}

            <FieldWrap label="Judul Jurnal" optional>
              <Input value={judulJurnal} onChange={(e) => setJudulJurnal(e.target.value)} placeholder="Contoh: Bab 1 Bilangan (Kosongkan untuk isi otomatis)" />
            </FieldWrap>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldWrap label="Kelas" required>
                <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas">{selectedKelasLabel || "Pilih kelas"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {kelasList?.map((k) => <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
              <FieldWrap label="Mata Pelajaran" required>
                <Select value={mataPelajaranId} onValueChange={(v) => setMataPelajaranId(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Pilih mapel">{selectedMapelLabel || "Pilih mapel"}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {mapelList?.map((m) => <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldWrap>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <FieldWrap label="Tujuan Pembelajaran" required>
              <Textarea value={tujuanPembelajaran} onChange={(e) => setTujuanPembelajaran(e.target.value)} placeholder="Tujuan pembelajaran..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Materi / Konten" required>
              <Textarea value={materiKonten} onChange={(e) => setMateriKonten(e.target.value)} placeholder="Materi yang diajarkan..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Kegiatan Pembelajaran" optional>
              <Textarea value={kegiatanPembelajaran} onChange={(e) => setKegiatanPembelajaran(e.target.value)} placeholder="Deskripsi kegiatan..." rows={2} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Catatan" optional>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan..." rows={2} className="resize-none" />
            </FieldWrap>

            {kelasId && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Presensi Siswa</h3>
                  <span className="text-xs text-muted-foreground">
                    {siswaList?.length ?? 0} siswa
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="hadir-semua"
                    checked={hadirSemua}
                    onCheckedChange={(checked) => {
                      setHadirSemua(checked === true)
                      if (checked) {
                        setAttendance((prev) => {
                          const next = { ...prev }
                          for (const key of Object.keys(next)) {
                            next[key] = "H"
                          }
                          return next
                        })
                      }
                    }}
                  />
                  <Label htmlFor="hadir-semua" className="text-sm cursor-pointer">
                    Hadir Semua
                  </Label>
                </div>

                {siswaList && siswaList.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {siswaList.map((siswa) => {
                      const s = attendance[siswa.id] || "H"
                      return (
                        <div
                          key={siswa.id}
                          className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="truncate min-w-0 flex-1">{siswa.namaLengkap}</span>
                          {hadirSemua ? (
                            <span className="text-xs font-medium text-emerald-600 shrink-0">Hadir</span>
                          ) : (
                            <div className="flex gap-1 shrink-0">
                              {(Object.keys(ATT_STATUS) as AttStatus[]).map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setAttendance((prev) => ({ ...prev, [siswa.id]: key }))}
                                  data-active={s === key}
                                  className={cn(
                                    "h-7 w-7 rounded text-xs font-semibold transition-colors",
                                    ATT_BTN[key],
                                    s === key && "ring-2 ring-offset-1 ring-primary",
                                  )}
                                >
                                  {key}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Tidak ada siswa aktif di kelas ini.</p>
                )}
              </div>
            )}

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

        <div className="flex justify-end gap-2 px-6 py-4 glass-dialog-footer flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving} style={{ backgroundColor: "hsl(142 72% 40%)" }} className="text-white hover:bg-[hsl(142_72%_35%)]">
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
