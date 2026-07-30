"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, BookOpen, Activity, AlertTriangle, Users, CheckCircle2, FileText, Check } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { cn, parseLocalDate, parseLocalTime } from "@/lib/utils"

interface JurnalItem {
  id: string
  guruId: string
  kelasId: string
  mataPelajaranId: string
  jadwalPelajaranId?: string | null
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
  initialJadwalSlot?: any | null
}

const ATT_STATUS: Record<AttStatus, string> = { H: "Hadir (H)", I: "Izin (I)", S: "Sakit (S)", A: "Alpha (A)" }

const ATT_BTN: Record<AttStatus, { inactive: string; active: string }> = {
  H: {
    inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 font-bold",
    active: "bg-emerald-600 text-white font-black shadow-sm border border-emerald-600"
  },
  I: {
    inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30 font-bold",
    active: "bg-amber-500 text-white font-black shadow-sm border border-amber-500"
  },
  S: {
    inactive: "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/50 dark:bg-sky-950/20 dark:text-sky-400 dark:border-sky-900/30 font-bold",
    active: "bg-sky-600 text-white font-black shadow-sm border border-sky-600"
  },
  A: {
    inactive: "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30 font-bold",
    active: "bg-rose-600 text-white font-black shadow-sm border border-rose-600"
  },
}

export default function JurnalFormDialog({
  item,
  open,
  onClose,
  onSaved,
  defaultGuruId,
  initialJadwalSlot,
}: Props) {
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
  const [status, setStatus] = useState<"draft" | "selesai">("selesai")
  const [guruId, setGuruId] = useState("")
  const [saving, setSaving] = useState(false)
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({})
  const [selectedJadwalId, setSelectedJadwalId] = useState("")

  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"
  const isGuru = session?.user?.role === "guru"

  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: open && isGuru,
  })
  const currentGuruId = currentGuru?.id
  const targetGuruId = isAdmin ? (guruId || defaultGuruId) : currentGuruId

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 }, { enabled: isAdmin })

  const { data: siswaList } = api.siswa.getAll.useQuery(
    { kelasId, status: "aktif", limit: 500 },
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
      setStatus(item.status || "selesai")
      setGuruId(item.guruId)
      setSelectedJadwalId(item.jadwalPelajaranId || "")
    } else if (initialJadwalSlot) {
      setJudulJurnal("")
      setKelasId(initialJadwalSlot.kelasId)
      setMataPelajaranId(initialJadwalSlot.mataPelajaranId)
      setGuruId(initialJadwalSlot.guruId)
      setSelectedJadwalId(initialJadwalSlot.id)
      setTanggal(new Date().toISOString().split("T")[0])
      setJamMulai(initialJadwalSlot.jamMulai ? new Date(initialJadwalSlot.jamMulai).toTimeString().slice(0, 5) : "")
      setJamSelesai(initialJadwalSlot.jamSelesai ? new Date(initialJadwalSlot.jamSelesai).toTimeString().slice(0, 5) : "")
      setTujuanPembelajaran("")
      setMateriKonten("")
      setKegiatanPembelajaran("")
      setCatatan("")
      setStatus("selesai")
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
      setStatus("selesai")
      setGuruId(defaultGuruId || "")
      setSelectedJadwalId("")
    }
    setAttendance({})
  }, [open, item, initialJadwalSlot, defaultGuruId])

  useEffect(() => {
    if (!open || !siswaList) return

    if (item?.detailKehadiran) {
      try {
        const parsed: AttendanceItem[] = JSON.parse(item.detailKehadiran)
        const attMap: Record<string, AttStatus> = {}
        for (const a of parsed) {
          attMap[a.siswaId] = a.status
        }
        setAttendance(attMap)
        return
      } catch {}
    }

    const defaultAtt: Record<string, AttStatus> = {}
    for (const s of siswaList) {
      defaultAtt[s.id] = "H"
    }
    setAttendance(defaultAtt)
  }, [siswaList, open, item?.detailKehadiran])

  const computeStatusKehadiran = () => {
    const counts = { H: 0, I: 0, S: 0, A: 0 }
    for (const s of Object.values(attendance)) {
      if (counts[s] !== undefined) counts[s]++
    }
    return `Hadir: ${counts.H}, Izin: ${counts.I}, Sakit: ${counts.S}, Alpa: ${counts.A}`
  }

  const handleSave = async () => {
    if (!kelasId) { toast.error("Kelas wajib dipilih"); return }
    if (!mataPelajaranId) { toast.error("Mata pelajaran wajib dipilih"); return }
    if (!tujuanPembelajaran.trim()) { toast.error("Tujuan pembelajaran wajib diisi"); return }
    if (!materiKonten.trim()) { toast.error("Materi pokok wajib diisi"); return }

    const targetGuruIdFinal = guruId || defaultGuruId || currentGuruId || ""
    if (!targetGuruIdFinal) { toast.error("Guru pengampu wajib dipilih"); return }

    let finalJudul = judulJurnal.trim()
    if (!finalJudul) {
      const kelasName = kelasList?.find((k) => k.id === kelasId)?.namaKelas || ""
      const mapelName = mapelList?.find((m) => m.id === mataPelajaranId)?.namaMapel || ""
      const formattedDate = tanggal ? parseLocalDate(tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : ""
      finalJudul = `${kelasName} - ${mapelName} - ${formattedDate}`.trim()
      if (finalJudul.startsWith(" - ")) finalJudul = finalJudul.slice(3)
      if (!finalJudul) finalJudul = "Tanpa Judul"
    }

    setSaving(true)
    try {
      const tanggalDate = tanggal ? parseLocalDate(tanggal) : new Date()
      const jamMulaiDate = jamMulai ? parseLocalTime(tanggal, jamMulai) : null
      const jamSelesaiDate = jamSelesai ? parseLocalTime(tanggal, jamSelesai) : null

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
            jadwalPelajaranId: selectedJadwalId || null,
            tanggal: tanggalDate,
            jamMulai: jamMulaiDate,
            jamSelesai: jamSelesaiDate,
            tujuanPembelajaran,
            materiKonten,
            kegiatanPembelajaran: kegiatanPembelajaran || null,
            catatan: catatan || null,
            statusKehadiran,
            detailKehadiran,
            status: "selesai",
          },
        })
        toast.success("Jurnal & Presensi berhasil disimpan")
      } else {
        await createJurnal.mutateAsync({
          guruId: targetGuruIdFinal,
          kelasId,
          mataPelajaranId,
          jadwalPelajaranId: selectedJadwalId || null,
          tanggal: tanggalDate,
          jamMulai: jamMulaiDate,
          jamSelesai: jamSelesaiDate,
          judulJurnal: finalJudul,
          tujuanPembelajaran,
          materiKonten,
          kegiatanPembelajaran: kegiatanPembelajaran || null,
          catatan: catatan || null,
          statusKehadiran,
          detailKehadiran,
          status: "selesai",
        })
        toast.success("Jurnal & Presensi berhasil disimpan")
      }
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan jurnal")
    }
    setSaving(false)
  }

  // Display details for Summary Header Cards
  const selectedKelasObj = kelasList?.find((k) => k.id === kelasId)
  const selectedMapelObj = mapelList?.find((m) => m.id === mataPelajaranId)
  const selectedGuruObj = guruList?.find((g) => g.id === targetGuruId) || currentGuru

  const jpMulaiNum = initialJadwalSlot?.jpMulai ?? 1
  const jpCountNum = initialJadwalSlot?.jpCount ?? 2
  const jpRangeStr = `Jam Ke-${jpMulaiNum}-${jpMulaiNum + jpCountNum - 1}`
  const timeRangeStr = jamMulai && jamSelesai ? `(${jamMulai} - ${jamSelesai})` : "(07:30 - 09:00)"

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-3xl">
        <DialogHeader className="px-6 py-4 flex-shrink-0 text-left border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <DialogTitle className="flex items-center gap-2.5 text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
            <div className="h-9 w-9 rounded-2xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <span>Formulir Jurnal Mengajar</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Read-Only Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-teal-700/70 dark:text-teal-400/70 uppercase tracking-wider block">
                Mata Pelajaran
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                {selectedMapelObj ? `${selectedMapelObj.kodeMapel ? `${selectedMapelObj.kodeMapel} ` : ""}${selectedMapelObj.namaMapel}` : "Mapel Wajib"}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-teal-700/70 dark:text-teal-400/70 uppercase tracking-wider block">
                Kelas Rombel
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                {selectedKelasObj ? `Kelas ${selectedKelasObj.namaKelas}` : "Rombel"}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-teal-700/70 dark:text-teal-400/70 uppercase tracking-wider block">
                Waktu / Jam Pelajaran
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                {jpRangeStr} {timeRangeStr}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-black text-teal-700/70 dark:text-teal-400/70 uppercase tracking-wider block">
                Guru Pengampu
              </span>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                {selectedGuruObj?.namaLengkap || "Guru Pengampu"}
              </span>
            </div>
          </div>

          {/* Input Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tujuan Pembelajaran <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                required
                rows={2}
                value={tujuanPembelajaran}
                onChange={(e) => setTujuanPembelajaran(e.target.value)}
                placeholder="Tuliskan tujuan pembelajaran yang ingin dicapai..."
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Materi Pokok <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                required
                rows={2}
                value={materiKonten}
                onChange={(e) => setMateriKonten(e.target.value)}
                placeholder="Tuliskan judul atau materi pokok pembahasan hari ini..."
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Kegiatan Pembelajaran <span className="font-normal text-slate-400">(Opsional)</span>
              </Label>
              <Textarea
                rows={2}
                value={kegiatanPembelajaran}
                onChange={(e) => setKegiatanPembelajaran(e.target.value)}
                placeholder="Gambaran singkat jalannya kegiatan pembelajaran / diskusi kelas..."
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Catatan Kejadian Penting / Hambatan <span className="font-normal text-slate-400">(Opsional)</span>
              </Label>
              <Textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan hambatan, siswa berprestasi, atau kejadian penting..."
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>

            {/* Presensi & Absensi Siswa Section */}
            <div className="pt-2">
              <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Presensi & Absensi Siswa Kelas ({siswaList?.length ?? 0} Siswa)
                    </h4>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      Default status: Hadir (H)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allH: Record<string, AttStatus> = {}
                        siswaList?.forEach((s) => { allH[s.id] = "H" })
                        setAttendance(allH)
                      }}
                      className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      Semua Hadir
                    </button>
                  </div>
                </div>

                {!siswaList ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Memuat daftar siswa...</p>
                ) : siswaList.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Belum ada data siswa di kelas ini</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {siswaList.map((siswa, idx) => {
                      const currentStatus = attendance[siswa.id] || "H"
                      const shortId = siswa.id.slice(0, 8)

                      return (
                        <div
                          key={siswa.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-xs flex-wrap gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-400">{idx + 1}.</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{siswa.namaLengkap}</span>
                            <span className="text-[10px] font-mono text-slate-400">ID: {shortId}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {(["H", "I", "S", "A"] as AttStatus[]).map((stKey) => {
                              const isSelected = currentStatus === stKey
                              return (
                                <button
                                  key={stKey}
                                  type="button"
                                  onClick={() => setAttendance({ ...attendance, [siswa.id]: stKey })}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] transition-all cursor-pointer",
                                    isSelected ? ATT_BTN[stKey].active : ATT_BTN[stKey].inactive
                                  )}
                                >
                                  {ATT_STATUS[stKey]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl h-10 text-xs font-bold cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10 text-xs font-extrabold uppercase tracking-wider gap-2 cursor-pointer shadow-md shadow-emerald-500/10"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Jurnal & Presensi</span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
