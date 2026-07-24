"use client"

import { useState, useMemo, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar, Clock, CheckCircle2, AlertTriangle, BookOpen, User, Sparkles } from "lucide-react"
import { toast } from "sonner"
import JurnalFormDialog from "@/components/jurnal/JurnalFormDialog"

export default function JurnalMengajarPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"
  const isGuru = session?.user?.role === "guru"

  const [tanggal, setTanggal] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [selectedJadwalSlot, setSelectedJadwalSlot] = useState<any | null>(null)
  const [selectedJurnalItem, setSelectedJurnalItem] = useState<any | null>(null)

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0])
  }, [])

  const { data: currentGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: isGuru,
  })
  const currentGuruId = currentGuru?.id

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 500 })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 500 })
  const { data: guruListAll } = api.guru.getAll.useQuery({ limit: 500 })

  const kelasMap = useMemo(() => new Map((kelasList ?? []).map((k) => [k.id, k])), [kelasList])
  const mapelMap = useMemo(() => new Map((mapelList ?? []).map((m) => [m.id, m])), [mapelList])
  const guruMap = useMemo(() => new Map((guruListAll ?? []).map((g) => [g.id, g])), [guruListAll])

  const hariList = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
  const hariIndoMap: Record<string, string> = {
    senin: "Senin", selasa: "Selasa", rabu: "Rabu", kamis: "Kamis", jumat: "Jumat", sabtu: "Sabtu", minggu: "Minggu"
  }
  const selectedDate = tanggal ? new Date(tanggal + "T00:00:00") : new Date()
  const hariName = hariList[selectedDate.getDay()]
  const hariIndoName = hariIndoMap[hariName] || "Senin"

  // Query all schedule items for the selected day
  const { data: allJadwal, isLoading: isLoadingJadwal } = api.jadwal.getAll.useQuery(
    {
      hari: hariName as any,
      guruId: isGuru && currentGuruId ? currentGuruId : undefined,
      limit: 500
    },
    { enabled: tanggal !== "" }
  )

  // Query existing journals for the selected date
  const { data: jurnalList, isLoading: isLoadingJurnal } = api.lms.getJurnal.useQuery(
    {
      tanggal: selectedDate,
      limit: 500,
    },
    { enabled: tanggal !== "" }
  )

  const utils = api.useUtils()

  // Map schedule slots with their corresponding journal entries
  const kbmRows = useMemo(() => {
    if (!allJadwal) return []

    return allJadwal.map((j: any) => {
      const matchedJurnal = (jurnalList ?? []).find(
        (jur: any) =>
          jur.jadwalPelajaranId === j.id ||
          (jur.kelasId === j.kelasId && jur.mataPelajaranId === j.mataPelajaranId && jur.guruId === j.guruId)
      )

      const isFilled = matchedJurnal && matchedJurnal.status === "selesai"

      return {
        jadwal: j,
        jurnal: matchedJurnal || null,
        isFilled,
      }
    })
  }, [allJadwal, jurnalList])

  const handleOpenForm = (slot: any) => {
    setSelectedJadwalSlot(slot.jadwal)
    setSelectedJurnalItem(slot.jurnal)
    setFormOpen(true)
  }

  const fmtTime = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="space-y-6 text-left pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            LMS &ndash; Jurnal Mengajar
          </h2>
          <p className="text-muted-foreground text-xs mt-1">
            Pencatatan materi pembelajaran harian dan presensi kehadiran siswa kelas
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-2.5 shrink-0 shadow-xs">
          <Calendar className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-200 focus:outline-none w-[130px] cursor-pointer"
          />
          <span className="text-[10px] font-black px-2.5 py-1 bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 rounded-lg uppercase tracking-wider">
            {hariIndoName}
          </span>
        </div>
      </div>

      {/* Rekapitulasi Jurnal Card (Matching Screenshot) */}
      <Card className="p-6 rounded-3xl neumo-card bg-background space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center text-teal-600">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Daftar Rekapitulasi Jurnal ({kbmRows.length} Slot KBM)
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Menampilkan Jadwal Hari: <strong className="text-slate-700 dark:text-slate-300">{hariIndoName}</strong>
          </span>
        </div>

        {/* Table View Matching Screenshot */}
        {isLoadingJadwal || isLoadingJurnal ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        ) : kbmRows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground space-y-2">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tidak Ada Jadwal Mengajar Hari Ini ({hariIndoName})
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan pilih tanggal lain di pojok kanan atas atau pastikan plotting jadwal pelajaran sudah dikonfigurasi.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-900/40">
                  <TableRow>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">ROMBEL</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">PELAJARAN</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">GURU PENGAMPU</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">WAKTU (JP)</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">STATUS</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-wider py-3">SUPERVISI KEPSEK</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-400 uppercase tracking-wider py-3 pr-6">TINDAKAN / MONITORING</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kbmRows.map((row, idx) => {
                    const j = row.jadwal
                    const cls = j.kelas || kelasMap.get(j.kelasId)
                    const mapel = j.mataPelajaran || mapelMap.get(j.mataPelajaranId)
                    const guruRec = j.guru || guruMap.get(j.guruId)

                    const kelasName = cls ? `Kelas ${cls.namaKelas}` : "-"
                    const mapelName = mapel ? `${mapel.namaMapel}${mapel.kodeMapel ? ` (${mapel.kodeMapel})` : ""}` : "-"
                    const guruName = guruRec ? guruRec.namaLengkap : "-"

                    const jpStart = j.jpMulai ?? 1
                    const jpCount = j.jpCount ?? 2
                    const jpStr = `Jam ${jpStart}–${jpStart + jpCount - 1}`
                    const timeStr = j.jamMulai && j.jamSelesai ? `${fmtTime(j.jamMulai)} - ${fmtTime(j.jamSelesai)}` : "07:30 - 09:00"

                    return (
                      <TableRow key={j.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                        {/* ROMBEL */}
                        <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                          {kelasName}
                        </TableCell>

                        {/* PELAJARAN */}
                        <TableCell className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {mapelName}
                        </TableCell>

                        {/* GURU PENGAMPU */}
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-300">
                          {guruName}
                        </TableCell>

                        {/* WAKTU (JP) */}
                        <TableCell className="text-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 block">{jpStr}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{timeStr}</span>
                        </TableCell>

                        {/* STATUS */}
                        <TableCell>
                          {row.isFilled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Sudah Terisi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Belum Diisi
                            </span>
                          )}
                        </TableCell>

                        {/* SUPERVISI KEPSEK */}
                        <TableCell className="text-xs text-slate-400 font-bold">
                          &mdash;
                        </TableCell>

                        {/* TINDAKAN / MONITORING */}
                        <TableCell className="text-right pr-4">
                          <button
                            type="button"
                            onClick={() => handleOpenForm(row)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-xs active:scale-95 inline-flex items-center gap-1.5",
                              row.isFilled
                                ? "bg-teal-600 hover:bg-teal-700 text-white"
                                : "bg-amber-500 hover:bg-amber-600 text-white"
                            )}
                          >
                            <span>{row.isFilled ? "Edit Jurnal" : "Bantu Isikan"}</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View: Card Stack */}
            <div className="md:hidden space-y-3">
              {kbmRows.map((row, idx) => {
                const j = row.jadwal
                const cls = j.kelas || kelasMap.get(j.kelasId)
                const mapel = j.mataPelajaran || mapelMap.get(j.mataPelajaranId)
                const guruRec = j.guru || guruMap.get(j.guruId)

                const kelasName = cls ? `Kelas ${cls.namaKelas}` : "-"
                const mapelName = mapel ? `${mapel.namaMapel}` : "-"
                const guruName = guruRec ? guruRec.namaLengkap : "-"

                const jpStart = j.jpMulai ?? 1
                const jpCount = j.jpCount ?? 2
                const jpStr = `Jam ${jpStart}–${jpStart + jpCount - 1}`

                return (
                  <div key={j.id || idx} className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-slate-100">{kelasName}</span>
                      {row.isFilled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Sudah Terisi
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-50 text-rose-600 border border-rose-200">
                          Belum Diisi
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span className="font-semibold">Pelajaran:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{mapelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Guru Pengampu:</span>
                        <span>{guruName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">Waktu:</span>
                        <span>{jpStr}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenForm(row)}
                      className={cn(
                        "w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                        row.isFilled ? "bg-teal-600 text-white" : "bg-amber-500 text-white"
                      )}
                    >
                      {row.isFilled ? "Edit Jurnal" : "Bantu Isikan"}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* Form Dialog */}
      <JurnalFormDialog
        open={formOpen}
        item={selectedJurnalItem}
        initialJadwalSlot={selectedJadwalSlot}
        onClose={() => {
          setFormOpen(false)
          setSelectedJadwalSlot(null)
          setSelectedJurnalItem(null)
        }}
        onSaved={() => {
          utils.lms.getJurnal.invalidate()
        }}
      />
    </div>
  )
}
