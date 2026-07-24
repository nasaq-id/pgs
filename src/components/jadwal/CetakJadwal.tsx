"use client"

import { useMemo, useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Printer, BookOpen, LayoutGrid } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { DAY_LABEL, timeToMinutes, minutesToTime, formatKelasLabel } from "./constants"
import { DAYS } from "./constants"

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
}

interface GuruRecord {
  id: string
  namaLengkap: string
  nipnuptk?: string | null
}

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

interface JadwalRecord {
  id: string
  kelasId: string
  mataPelajaranId: string
  guruId: string
  hari: string
  jamMulai: string | null
  jamSelesai: string | null
  jpMulai: number | null
  jpCount: number | null
}

interface SekolahData {
  namaSekolah: string
  alamat: string | null
  npsn: string | null
  kepalaSekolah: string | null
  logo?: string | null
  jenjang?: string | null
  useCustomKop?: boolean | null
  customKopGambar?: string | null
  customKopTinggi?: number | null
  logoKiriKop?: string | null
  kopBaris1?: string | null
  kopBaris2?: string | null
  kopBaris3?: string | null
  kopBaris4?: string | null
}

interface TimelineRecord {
  id: string
  hari: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CetakJadwal({ open, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [cetakMode, setCetakMode] = useState<"per-kelas" | "keseluruhan" | null>(null)
  const [selectedKelasId, setSelectedKelasId] = useState("")

  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: open,
  })

  const { data: tahunAjaran } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: open,
  })

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: allJadwal, isLoading } = api.jadwal.getAll.useQuery({ limit: 5000 }, { enabled: open })
  const { data: pengaturan } = api.pengaturanJadwal.get.useQuery({}, { enabled: open })
  const { data: timelineList } = api.pengaturanJadwal.getTimeline.useQuery({}, { enabled: open })

  const sekolah = (sekolahData ?? null) as SekolahData | null
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasRecord[], [kelasList])
  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelRecord[], [mapelList])
  const guruRecords = useMemo(() => (guruList ?? []) as GuruRecord[], [guruList])
  const jadwalRecords = useMemo(() => (allJadwal ?? []) as JadwalRecord[], [allJadwal])
  const timelineRecords = useMemo(() => (timelineList ?? []) as TimelineRecord[], [timelineList])

  const mapelMap = useMemo(
    () => new Map(mapelRecords.map((m) => [m.id, m])),
    [mapelRecords]
  )
  const guruMap = useMemo(
    () => new Map(guruRecords.map((g) => [g.id, g])),
    [guruRecords]
  )

  const durasiJP = pengaturan?.durasiJP ?? 40
  const startMinutes = pengaturan?.jamMulai ? timeToMinutes(pengaturan.jamMulai) : 420

  const aktifDays = useMemo(() => {
    const days = new Set<string>()
    for (const t of timelineRecords) {
      if (t.tipe === "jp") days.add(t.hari)
    }
    if (days.size === 0) return DAYS
    return DAYS.filter((d) => days.has(d))
  }, [timelineRecords])

  const timelineByDay = useMemo(() => {
    const map = new Map<string, TimelineRecord[]>()
    for (const day of aktifDays) {
      map.set(day, timelineRecords.filter((t) => t.hari === day).sort((a, b) => a.urutan - b.urutan))
    }
    return map
  }, [timelineRecords, aktifDays])

  const totalJpSlots = useMemo(() => {
    let max = 0
    for (const day of aktifDays) {
      const jpCount = (timelineByDay.get(day) ?? []).filter((t) => t.tipe === "jp").length
      if (jpCount > max) max = jpCount
    }
    return Math.max(max, 1)
  }, [timelineByDay, aktifDays])

  const sortedKelas = useMemo(
    () => [...kelasRecords].sort((a, b) => {
      const tA = parseInt(a.tingkat || "0")
      const tB = parseInt(b.tingkat || "0")
      if (tA !== tB) return tA - tB
      return a.namaKelas.localeCompare(b.namaKelas)
    }),
    [kelasRecords]
  )

  const academicJpMap = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const day of aktifDays) {
      const dayItems = timelineByDay.get(day) ?? []
      let counter = 1
      for (let jp = 1; jp <= totalJpSlots; jp++) {
        const item = dayItems[jp - 1]
        if (item && item.tipe !== "jp") {
          map.set(`${day}-${jp}`, null)
        } else if (item && item.tipe === "jp") {
          map.set(`${day}-${jp}`, counter++)
        } else {
          map.set(`${day}-${jp}`, null)
        }
      }
    }
    return map
  }, [aktifDays, totalJpSlots, timelineByDay])

  const getEntry = (kelasId: string, hari: string, jpSlot: number): JadwalRecord | null => {
    const academicJp = academicJpMap.get(`${hari}-${jpSlot}`)
    if (academicJp === null || academicJp === undefined) return null
    const entries = jadwalRecords.filter(
      (e) => e.kelasId === kelasId && e.hari === hari && e.jpMulai !== null && e.jpCount !== null
    )
    for (const entry of entries) {
      const start = entry.jpMulai!
      const end = start + entry.jpCount!
      if (academicJp >= start && academicJp < end) return entry
    }
    return null
  }

  const getAgenda = (hari: string, jpSlot: number): TimelineRecord | null => {
    const dayItems = timelineByDay.get(hari) ?? []
    const item = dayItems[jpSlot - 1]
    if (item && item.tipe !== "jp") return item
    return null
  }

  const codesMap = useMemo(() => {
    const map = new Map<string, string>()
    const sortedTeachers = [...guruRecords].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap))
    let teacherCounter = 1
    for (const teacher of sortedTeachers) {
      const teacherSchedules = jadwalRecords.filter((j) => j.guruId === teacher.id)
      const uniqueSubjectIds = Array.from(new Set(teacherSchedules.map((j) => j.mataPelajaranId)))
      let subjectOffset = 0
      for (const mapelId of uniqueSubjectIds) {
        const suffix = subjectOffset === 0 ? "" : String.fromCharCode(96 + subjectOffset)
        const code = `${teacherCounter}${suffix}`
        map.set(`${teacher.id}-${mapelId}`, code)
        subjectOffset++
      }
      if (uniqueSubjectIds.length > 0) {
        teacherCounter++
      }
    }
    return map
  }, [guruRecords, jadwalRecords])

  const getKode = (entry: JadwalRecord | null): string => {
    if (!entry) return ""
    const key = `${entry.guruId}-${entry.mataPelajaranId}`
    return codesMap.get(key) || ""
  }



  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const win = window.open("", "_blank")
    if (!win) return

    const styles = Array.from(document.styleSheets)
      .map((sheet) => {
        try {
          return Array.from(sheet.cssRules || [])
            .map((rule) => rule.cssText)
            .join("")
        } catch {
          return ""
        }
      })
      .join("")

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cetak Jadwal Pelajaran</title>
        <style>
          ${styles}
          @page { size: landscape; margin: 12mm; }
          body { font-family: Arial, sans-serif; padding: 0; margin: 0; font-size: 10px; color: #000; }
          .print-area { padding: 15px; }
          .kop-container { display: flex; align-items: center; justify-content: center; gap: 20px; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 15px; }
          .kop-container h1 { font-size: 18px; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .kop-container p { font-size: 11px; margin: 2px 0; }
          .judul { text-align: center; margin: 12px 0; }
          .judul h2 { font-size: 14px; margin: 0; font-weight: bold; text-decoration: none; }
          .judul p { font-size: 11px; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
          th { background: #4f46e5 !important; color: #fff !important; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .day-cell { font-weight: bold; background: #fafafa; font-size: 9px; }
          .jp-cell { font-size: 7px; white-space: nowrap; }
          .agenda-cell { font-style: italic; color: #555; background: #f9f9f9; }
          .legend-section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
          .legend-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
          .legend-table { width: auto; font-size: 8px; margin-bottom: 10px; }
          .legend-table th, .legend-table td { padding: 2px 8px; }
          .signature { display: flex; justify-content: space-around; margin-top: 35px; page-break-inside: avoid; }
          .signature div { text-align: center; min-width: 200px; }
          .signature .name { margin-top: 55px; font-weight: bold; font-size: 11px; }
          .signature .label { font-size: 10px; margin-bottom: 50px; }
          .kelas-selector { margin-bottom: 15px; font-size: 11px; }
          .kelas-selector strong { margin-right: 8px; }
        </style>
      </head>
      <body>
        <div class="print-area">
          ${printContent.innerHTML}
        </div>
        <script>
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  const handleReset = () => {
    setCetakMode(null)
    setSelectedKelasId("")
    onClose()
  }

  const jpSlots = Array.from({ length: totalJpSlots }, (_, i) => i + 1)

  const renderKopHeader = () => {
    if (sekolah?.useCustomKop && sekolah?.customKopGambar) {
      return (
        <div className="kop-container" style={{ width: "100%", height: `${(sekolah.customKopTinggi || 35) * 3}px`, position: "relative", marginBottom: "15px" }}>
          <img 
            src={sekolah.customKopGambar} 
            alt="Kop Surat" 
            style={{ width: "100%", height: "100%", objectFit: "contain" }} 
          />
        </div>
      )
    }

    const isKemenag = ["mi", "mts", "ma"].includes(sekolah?.jenjang || "")
    const hasKopBaris = sekolah?.kopBaris1 || sekolah?.kopBaris2 || sekolah?.kopBaris3 || sekolah?.kopBaris4

    return (
      <div className="kop-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "15px", borderBottom: "3px double #000", paddingBottom: "10px", marginBottom: "15px", width: "100%" }}>
        {/* Left Logo */}
        {sekolah?.logoKiriKop ? (
          <img src={sekolah.logoKiriKop} alt="Logo Kiri" style={{ height: 55, width: 55, objectFit: "contain" }} />
        ) : isKemenag ? (
          <div style={{ height: 50, width: 50, borderRadius: "50%", backgroundColor: "#059669", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #047857", padding: "2px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase" }}>Kemenag</span>
          </div>
        ) : (
          <div style={{ height: 50, width: 50, borderRadius: "50%", backgroundColor: "#2563eb", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px solid #1d4ed8", padding: "2px", boxSizing: "border-box" }}>
            <span style={{ fontSize: "6px", fontWeight: "bold", textTransform: "uppercase" }}>Tut Wuri</span>
          </div>
        )}

        {/* Center Text */}
        <div style={{ flex: 1, textAlign: "center", fontFamily: "serif" }}>
          {hasKopBaris ? (
            <>
              {sekolah?.kopBaris1 && (
                <h5 style={{ fontSize: 9, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {sekolah.kopBaris1}
                </h5>
              )}
              {sekolah?.kopBaris2 && (
                <h5 style={{ fontSize: 9, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {sekolah.kopBaris2}
                </h5>
              )}
              <h4 style={{ fontSize: 13, margin: "2px 0", fontWeight: "bold", textTransform: "uppercase" }}>
                {sekolah?.kopBaris3 || sekolah?.namaSekolah || "SEKOLAH CONTOH"}
              </h4>
              <p style={{ fontSize: 8, margin: 0, color: "#4b5563" }}>
                {sekolah?.kopBaris4 || sekolah?.alamat || ""}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 15, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                {sekolah?.namaSekolah || "Nama Lembaga Pendidikan"}
              </h1>
              <p style={{ fontSize: 9, margin: "2px 0", color: "#4b5563" }}>
                {sekolah?.alamat || ""}{sekolah?.npsn ? ` | NPSN: ${sekolah.npsn}` : ""}
              </p>
            </>
          )}
        </div>

        {/* Right Logo */}
        {sekolah?.logo ? (
          <img src={sekolah.logo} alt="Logo Kanan" style={{ height: 55, width: 55, objectFit: "contain" }} />
        ) : (
          <div style={{ height: 50, width: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "8px", fontWeight: "bold", fontSize: 8, color: "#9ca3af" }}>LOGO</div>
        )}
      </div>
    )
  }

  const renderSelectionScreen = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
      <button
        onClick={() => setCetakMode("per-kelas")}
        className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
          <BookOpen className="size-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Cetak Per Kelas</p>
          <p className="text-xs text-muted-foreground mt-1">Tampilkan nama guru & mapel lengkap untuk satu kelas</p>
        </div>
      </button>
      <button
        onClick={() => setCetakMode("keseluruhan")}
        className="group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border p-6 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
      >
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
          <LayoutGrid className="size-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Cetak Keseluruhan</p>
          <p className="text-xs text-muted-foreground mt-1">Semua kelas ringkas dengan sistem kode angka</p>
        </div>
      </button>
    </div>
  )

  const renderPerKelas = () => {
    const kelas = sortedKelas.find((k) => k.id === selectedKelasId)
    const kelasLabel = kelas ? formatKelasLabel(kelas) : ""

    return (
      <>
        {!selectedKelasId ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-muted-foreground">Pilih kelas terlebih dahulu</p>
            <Select value={selectedKelasId} onValueChange={(v) => v && setSelectedKelasId(v)}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                {sortedKelas.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {formatKelasLabel(k)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div ref={printRef} className="bg-white text-black p-4">
            {renderKopHeader()}

            <div style={{ textAlign: "center", margin: "12px 0" }}>
              <h2 style={{ fontSize: 14, margin: 0, fontWeight: "bold", textDecoration: "none" }}>Jadwal Pelajaran</h2>
              <p style={{ fontSize: 11, margin: "2px 0" }}>
                Tahun Ajaran {tahunAjaran?.namaTahunAjaran || "-"} — Kelas {kelasLabel}
              </p>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#4f46e5", color: "#fff", width: 70 }}>Hari</th>
                  <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#4f46e5", color: "#fff", width: 30 }}>JP</th>
                  <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#4f46e5", color: "#fff", width: 70 }}>Jam</th>
                  <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#4f46e5", color: "#fff" }}>Mata Pelajaran</th>
                  <th style={{ border: "1px solid #000", padding: "4px 6px", background: "#4f46e5", color: "#fff" }}>Guru</th>
                </tr>
              </thead>
              <tbody>
                {aktifDays.map((day) =>
                  jpSlots.map((jpSlot, idx) => {
                    const dayItems = timelineByDay.get(day) ?? []
                    const item = dayItems[jpSlot - 1]
                    const timeStart = item?.jamMulai ?? minutesToTime(startMinutes + (jpSlot - 1) * durasiJP)
                    const timeEnd = item?.jamSelesai ?? minutesToTime(startMinutes + jpSlot * durasiJP)
                    const agenda = getAgenda(day, jpSlot)
                    const entry = agenda ? null : getEntry(selectedKelasId, day, jpSlot)

                    return (
                      <tr key={`${day}-${jpSlot}`}>
                        {idx === 0 && (
                          <td rowSpan={totalJpSlots} style={{ border: "1px solid #000", padding: "3px 5px", fontWeight: "bold", background: "#fafafa", fontSize: 10, verticalAlign: "middle" }}>
                            {DAY_LABEL[day]}
                          </td>
                        )}
                        <td style={{ border: "1px solid #000", padding: "2px 4px", fontSize: 8 }}>{jpSlot}</td>
                        <td style={{ border: "1px solid #000", padding: "2px 4px", fontSize: 7, whiteSpace: "nowrap" }}>
                          {timeStart}-{timeEnd}
                        </td>
                        {agenda ? (
                          <td colSpan={2} style={{ border: "1px solid #000", padding: "2px 4px", fontStyle: "italic", color: "#555", background: "#f9f9f9", fontSize: 8 }}>
                            {agenda.label || agenda.tipe}
                          </td>
                        ) : entry ? (
                          <>
                            <td style={{ border: "1px solid #000", padding: "2px 4px", fontWeight: "bold", fontSize: 9 }}>
                              {mapelMap.get(entry.mataPelajaranId)?.namaMapel || "-"}
                            </td>
                            <td style={{ border: "1px solid #000", padding: "2px 4px", fontSize: 9 }}>
                              {guruMap.get(entry.guruId)?.namaLengkap || "-"}
                            </td>
                          </>
                        ) : (
                          <td colSpan={2} style={{ border: "1px solid #000", padding: "2px 4px", color: "#999", fontSize: 8 }}>&mdash;</td>
                        )}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            <div className="signature" style={{ display: "flex", justifyContent: "space-around", marginTop: 35 }}>
              <div style={{ textAlign: "center", minWidth: 200 }}>
                <p style={{ fontSize: 10, margin: 0, marginBottom: 50 }}>Kepala Sekolah,</p>
                <div style={{ width: 200, borderBottom: "1px solid #000", margin: "0 auto" }} />
                <p style={{ margin: "5px 0 0", fontWeight: "bold", fontSize: 11 }}>
                  {sekolah?.kepalaSekolah || "(_________________)"}
                </p>
              </div>
              <div style={{ textAlign: "center", minWidth: 200 }}>
                <p style={{ fontSize: 10, margin: 0, marginBottom: 50 }}>Waka Kurikulum,</p>
                <div style={{ width: 200, borderBottom: "1px solid #000", margin: "0 auto" }} />
                <p style={{ margin: "5px 0 0", fontWeight: "bold", fontSize: 11 }}>
                  (_________________)
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  const renderKeseluruhan = () => (

      <div ref={printRef} className="bg-white text-black p-4">
        {renderKopHeader()}

        <div style={{ textAlign: "center", margin: "12px 0" }}>
          <h2 style={{ fontSize: 14, margin: 0, fontWeight: "bold", textDecoration: "none" }}>Jadwal Pelajaran</h2>
          <p style={{ fontSize: 11, margin: "2px 0" }}>
            Tahun Ajaran {tahunAjaran?.namaTahunAjaran || "-"}
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px 4px", background: "#4f46e5", color: "#fff", width: 60, verticalAlign: "middle" }}>
                JP / Jam
              </th>
              {aktifDays.map((day) => (
                <th
                  key={day}
                  colSpan={sortedKelas.length}
                  style={{ border: "1px solid #000", padding: "3px 4px", background: "#4f46e5", color: "#fff", fontSize: 9 }}
                >
                  {DAY_LABEL[day]}
                </th>
              ))}
            </tr>
            <tr>
              {aktifDays.map((day) =>
                sortedKelas.map((kelas) => (
                  <th key={`${day}-${kelas.id}`} style={{ border: "1px solid #000", padding: "2px 3px", background: "#4f46e5", color: "#fff", fontSize: 7 }}>
                    {formatKelasLabel(kelas)}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {jpSlots.map((jpSlot) => {
              const dayItems = timelineByDay.get(aktifDays[0]) ?? []
              const item = dayItems[jpSlot - 1]
              const timeStart = item?.jamMulai ?? minutesToTime(startMinutes + (jpSlot - 1) * durasiJP)
              const timeEnd = item?.jamSelesai ?? minutesToTime(startMinutes + jpSlot * durasiJP)

              return (
                <tr key={jpSlot}>
                  <td style={{ border: "1px solid #000", padding: "2px 3px", fontWeight: "bold", fontSize: 7, verticalAlign: "middle" }}>
                    JP {jpSlot}<br /><span style={{ fontSize: 6 }}>{timeStart}-{timeEnd}</span>
                  </td>
                  {aktifDays.map((day) =>
                    sortedKelas.map((kelas) => {
                      const agenda = getAgenda(day, jpSlot)
                      const entry = agenda ? null : getEntry(kelas.id, day, jpSlot)
                      return (
                        <td key={`${day}-${kelas.id}-${jpSlot}`} style={{ border: "1px solid #000", padding: "2px 3px", verticalAlign: "middle" }}>
                          {agenda ? (
                            <span style={{ fontStyle: "italic", color: "#555", fontSize: 7 }}>
                              {agenda.label || agenda.tipe}
                            </span>
                          ) : entry ? (
                            <strong style={{ fontSize: 8 }}>{getKode(entry)}</strong>
                          ) : (
                            <span style={{ color: "#999", fontSize: 7 }}>&mdash;</span>
                          )}
                        </td>
                      )
                    })
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {codesMap.size > 0 && (
          <div className="legend-section" style={{ marginTop: 20, borderTop: "1px solid #ccc", paddingTop: 10 }}>
            <p className="legend-title" style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5 }}>Keterangan Kode:</p>
            <table className="legend-table" style={{ borderCollapse: "collapse", fontSize: 8, marginBottom: 10 }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #000", padding: "2px 8px", background: "#4f46e5", color: "#fff", fontWeight: "bold" }}>Kode</th>
                  <th style={{ border: "1px solid #000", padding: "2px 8px", background: "#4f46e5", color: "#fff", fontWeight: "bold" }}>Nama Guru</th>
                  <th style={{ border: "1px solid #000", padding: "2px 8px", background: "#4f46e5", color: "#fff", fontWeight: "bold" }}>Mata Pelajaran</th>
                </tr>
              </thead>
              <tbody>
                {[...codesMap.entries()]
                  .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
                  .map(([key, code]) => {
                    const [guruId, mapelId] = key.split("-")
                    const guru = guruMap.get(guruId)
                    const mapel = mapelMap.get(mapelId)
                    return (
                      <tr key={key}>
                        <td style={{ border: "1px solid #000", padding: "2px 8px", fontWeight: "bold", textAlign: "center" }}>{code}</td>
                        <td style={{ border: "1px solid #000", padding: "2px 8px" }}>{guru?.namaLengkap || "-"}</td>
                        <td style={{ border: "1px solid #000", padding: "2px 8px" }}>{mapel?.namaMapel || "-"}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        )}

        <div className="signature" style={{ display: "flex", justifyContent: "space-around", marginTop: 35 }}>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <p style={{ fontSize: 10, margin: 0, marginBottom: 50 }}>Kepala Sekolah,</p>
            <div style={{ width: 200, borderBottom: "1px solid #000", margin: "0 auto" }} />
            <p style={{ margin: "5px 0 0", fontWeight: "bold", fontSize: 11 }}>
              {sekolah?.kepalaSekolah || "(_________________)"}
            </p>
          </div>
          <div style={{ textAlign: "center", minWidth: 200 }}>
            <p style={{ fontSize: 10, margin: 0, marginBottom: 50 }}>Waka Kurikulum,</p>
            <div style={{ width: 200, borderBottom: "1px solid #000", margin: "0 auto" }} />
            <p style={{ margin: "5px 0 0", fontWeight: "bold", fontSize: 11 }}>
              (_________________)
            </p>
          </div>
        </div>
      </div>
  )

  const loading = isLoading

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleReset()}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleReset()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cetakMode === null
              ? "Pilih Opsi Cetak"
              : cetakMode === "per-kelas"
              ? "Cetak Jadwal Per Kelas"
              : "Cetak Jadwal Keseluruhan Kelas"}
          </DialogTitle>
        </DialogHeader>

        {cetakMode === null && renderSelectionScreen()}
        {cetakMode === "per-kelas" && renderPerKelas()}
        {cetakMode === "keseluruhan" && renderKeseluruhan()}

        <DialogFooter>
          {cetakMode !== null && (
            <>
              <Button variant="outline" onClick={() => setCetakMode(null)}>
                Kembali
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Tutup
              </Button>
              <Button
                onClick={handlePrint}
                className="gap-2"
                style={{ backgroundColor: "hsl(142 72% 40%)" }}
                disabled={cetakMode === "per-kelas" && !selectedKelasId}
              >
                <Printer className="h-4 w-4" /> Cetak
              </Button>
            </>
          )}
          {cetakMode === null && (
            <Button variant="ghost" onClick={handleReset}>
              Tutup
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
