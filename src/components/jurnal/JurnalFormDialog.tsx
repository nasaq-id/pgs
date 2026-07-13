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
import { Loader2, BookOpen, Activity, AlertTriangle, Users } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"

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
}

const ATT_STATUS: Record<AttStatus, string> = { H: "Hadir", I: "Izin", S: "Sakit", A: "Alpa" }

const ATT_BTN: Record<AttStatus, { inactive: string; active: string }> = {
  H: {
    inactive: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30",
    active: "bg-emerald-600 text-white font-extrabold shadow-sm border border-emerald-600"
  },
  I: {
    inactive: "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-450 dark:border-amber-900/30",
    active: "bg-amber-500 text-white font-extrabold shadow-sm border border-amber-500"
  },
  S: {
    inactive: "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200/50 dark:bg-orange-950/20 dark:text-orange-450 dark:border-orange-900/30",
    active: "bg-orange-500 text-white font-extrabold shadow-sm border border-orange-500"
  },
  A: {
    inactive: "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/50 dark:bg-red-950/20 dark:text-red-450 dark:border-red-900/30",
    active: "bg-red-600 text-white font-extrabold shadow-sm border border-red-600"
  },
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
  const [selectedJadwalId, setSelectedJadwalId] = useState("")

  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"
  const isGuru = session?.user?.role === "guru"

  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: open && isGuru,
  })
  const currentGuruId = currentGuru?.id
  const targetGuruId = isAdmin ? guruId : currentGuruId

  const DAYS_EN = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
  const selectedDateObj = tanggal ? new Date(tanggal + "T00:00:00") : new Date()
  const queryHari = DAYS_EN[selectedDateObj.getDay()]

  const { data: guruJadwalList } = api.jadwal.getAll.useQuery(
    {
      guruId: targetGuruId || undefined,
      hari: queryHari as any,
    },
    {
      enabled: open && !!targetGuruId,
    }
  )

  const selectedJadwal = useMemo(() => {
    return (guruJadwalList ?? []).find((j) => j.id === selectedJadwalId)
  }, [guruJadwalList, selectedJadwalId])

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 500 }, { enabled: isAdmin })

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
      setSelectedJadwalId(item.jadwalPelajaranId || "")
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
      setSelectedJadwalId("")
    }
    setAttendance({})
    setHadirSemua(true)
  }, [open, item, defaultGuruId])

  // Auto-select schedule if there's exactly 1 and no selection has been made yet (in create mode)
  useEffect(() => {
    if (!item && guruJadwalList && guruJadwalList.length > 0 && !selectedJadwalId) {
      if (guruJadwalList.length === 1 && guruJadwalList[0]) {
        setSelectedJadwalId(guruJadwalList[0].id)
      }
    }
  }, [guruJadwalList, item, selectedJadwalId])

  // Sync details from selected schedule
  useEffect(() => {
    if (selectedJadwal) {
      setKelasId(selectedJadwal.kelasId)
      setMataPelajaranId(selectedJadwal.mataPelajaranId)
      if (isAdmin) {
        setGuruId(selectedJadwal.guruId)
      }
      if (selectedJadwal.jamMulai) {
        setJamMulai(new Date(selectedJadwal.jamMulai).toTimeString().slice(0, 5))
      }
      if (selectedJadwal.jamSelesai) {
        setJamSelesai(new Date(selectedJadwal.jamSelesai).toTimeString().slice(0, 5))
      }
    }
  }, [selectedJadwal, isAdmin])

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
            status,
          },
        })
        toast.success("Jurnal berhasil diperbarui")
      } else {
        await createJurnal.mutateAsync({
          guruId: targetGuruId,
          kelasId,
          mataPelajaranId,
          jadwalPelajaranId: selectedJadwalId || null,
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
        <DialogHeader className="px-6 pt-5 pb-3 flex-shrink-0 text-left border-b border-slate-100">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-slate-800 tracking-tight uppercase">
            <div className="h-8 w-8 rounded-lg bg-teal-550/10 flex items-center justify-center text-teal-650">
              <BookOpen className="h-4 w-4" />
            </div>
            <span>{item ? "Edit Jurnal" : "Buat Jurnal Baru"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="space-y-4">
            {/* 1. Deteksi & Pemilihan Jadwal Hari Ini */}
            {guruJadwalList && guruJadwalList.length > 0 && !item && (
              <FieldWrap label="Pilih Jadwal Mengajar Hari Ini" required>
                <Select
                  value={selectedJadwalId}
                  onValueChange={(v) => setSelectedJadwalId(v ?? "")}
                >
                  <SelectTrigger className="border-teal-200 focus:border-teal-500 hover:border-teal-350 transition-colors">
                    <SelectValue placeholder="-- Pilih Jadwal Mengajar --" />
                  </SelectTrigger>
                  <SelectContent>
                    {guruJadwalList.map((j) => {
                      const mapelName = mapelList?.find((m) => m.id === j.mataPelajaranId)?.namaMapel || "Mapel"
                      const jpStart = j.jpMulai ?? 0
                      const jpCount = j.jpCount ?? 0
                      return (
                        <SelectItem key={j.id} value={j.id}>
                          {mapelName} - {j.kelas?.namaKelas || "Kelas"} (JP {jpStart} s.d {jpStart + jpCount - 1})
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </FieldWrap>
            )}

            {/* 2. Data Terkunci (Read-Only) Info Card if Schedule is chosen */}
            {selectedJadwal ? (
              <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Activity className="h-4 w-4 text-teal-600" />
                    <span>Data Jadwal Terkunci (Read-Only)</span>
                  </div>
                  {!item && guruJadwalList && guruJadwalList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectedJadwalId("")}
                      className="text-[10px] font-black uppercase text-rose-600 hover:underline cursor-pointer"
                    >
                      Ubah Jadwal
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Guru Pengampu</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      {guruList?.find((g) => g.id === targetGuruId)?.namaLengkap || session?.user?.name || "Guru"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Mata Pelajaran</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      {mapelList?.find((m) => m.id === selectedJadwal.mataPelajaranId)?.namaMapel || "Mata Pelajaran"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Kelas</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      {kelasList?.find((k) => k.id === selectedJadwal.kelasId)?.namaKelas || "Kelas"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Jam Pelajaran (Jam ke-)</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                      JP {selectedJadwal.jpMulai ?? 0} - {(selectedJadwal.jpMulai ?? 0) + (selectedJadwal.jpCount ?? 0) - 1} ({selectedJadwal.jpCount ?? 0} JP)
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* 3. Manual Inputs when no schedule is selected */
              <>
                {isAdmin && (
                  <FieldWrap label="Guru Pengampu" required>
                    <Select value={guruId} onValueChange={(v) => setGuruId(v ?? "")} options={guruList?.map((g) => ({ value: g.id, label: g.namaLengkap }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih guru pengampu" /></SelectTrigger>
                      <SelectContent>
                        {guruList?.map((g) => <SelectItem key={g.id} value={g.id}>{g.namaLengkap}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWrap>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FieldWrap label="Kelas" required>
                    <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")} options={kelasList?.map((k) => ({ value: k.id, label: k.namaKelas }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                      <SelectContent>
                        {kelasList?.map((k) => <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWrap>
                  <FieldWrap label="Mata Pelajaran" required>
                    <Select value={mataPelajaranId} onValueChange={(v) => setMataPelajaranId(v ?? "")} options={mapelList?.map((m) => ({ value: m.id, label: m.namaMapel }))}>
                      <SelectTrigger><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                      <SelectContent>
                        {mapelList?.map((m) => <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FieldWrap>
                </div>
              </>
            )}

            <FieldWrap label="Judul Jurnal" optional>
              <Input value={judulJurnal} onChange={(e) => setJudulJurnal(e.target.value)} placeholder="Contoh: Bab 1 Bilangan (Kosongkan untuk isi otomatis)" />
            </FieldWrap>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FieldWrap label="Tanggal" required>
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
              </FieldWrap>
              {!selectedJadwal && (
                <>
                  <FieldWrap label="Jam Mulai">
                    <Input type="time" value={jamMulai} onChange={(e) => setJamMulai(e.target.value)} />
                  </FieldWrap>
                  <FieldWrap label="Jam Selesai">
                    <Input type="time" value={jamSelesai} onChange={(e) => setJamSelesai(e.target.value)} />
                  </FieldWrap>
                </>
              )}
            </div>

            <FieldWrap label="Tujuan Pembelajaran" required>
              <Textarea value={tujuanPembelajaran} onChange={(e) => setTujuanPembelajaran(e.target.value)} placeholder="Tuliskan tujuan pembelajaran..." rows={3} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Materi / Topik Pembelajaran" required>
              <Textarea value={materiKonten} onChange={(e) => setMateriKonten(e.target.value)} placeholder="Tuliskan materi atau topik yang diajarkan..." rows={3} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Kegiatan Pembelajaran" optional>
              <Textarea value={kegiatanPembelajaran} onChange={(e) => setKegiatanPembelajaran(e.target.value)} placeholder="Tuliskan gambaran ringkas kegiatan pembelajaran (opsional)..." rows={3} className="resize-none" />
            </FieldWrap>

            <FieldWrap label="Catatan" optional>
              <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Tuliskan kejadian khusus di kelas, misal siswa berkebutuhan khusus atau pelanggaran tata tertib (opsional)..." rows={3} className="resize-none" />
            </FieldWrap>

            {kelasId && (
              <div className="border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5 bg-slate-50/20 dark:bg-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-teal-605" />
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Presensi Siswa</h3>
                  </div>
                  <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                    {siswaList?.length ?? 0} siswa
                  </span>
                </div>

                {siswaList && siswaList.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {siswaList.map((siswa) => {
                      const s = attendance[siswa.id] || "H"
                      return (
                        <div
                          key={siswa.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 text-sm hover:border-slate-200 dark:hover:border-slate-800 transition-colors shadow-xs"
                        >
                          <span className="truncate min-w-0 flex-1 font-semibold text-slate-700 dark:text-slate-300">{siswa.namaLengkap}</span>
                          <div className="flex gap-1.5 shrink-0">
                            {(Object.keys(ATT_STATUS) as AttStatus[]).map((key) => {
                              const isActive = s === key
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setAttendance((prev) => ({ ...prev, [siswa.id]: key }))}
                                  className={cn(
                                    "h-8 w-8 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center shadow-xs",
                                    isActive ? ATT_BTN[key].active : ATT_BTN[key].inactive
                                  )}
                                  title={ATT_STATUS[key]}
                                >
                                  {key}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Tidak ada siswa aktif di kelas ini.</p>
                )}
              </div>
            )}

            <FieldWrap label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "selesai")} options={[{value:"draft", label:"Draft"}, {value:"selesai", label:"Selesai"}]}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </FieldWrap>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
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
              <span>{item ? "Simpan Perubahan" : "Buat Jurnal"}</span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function FieldWrap({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {optional && <span className="text-muted-foreground text-[8px] ml-1">(opsional)</span>}
      </Label>
      {children}
    </div>
  )
}
