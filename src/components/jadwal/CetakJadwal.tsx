"use client"

import { useMemo, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Printer } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { DAY_LABEL, timeToMinutes, minutesToTime } from "./constants"

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

  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: open,
  })

  const { data: tahunAjaran } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: open,
  })

  const { data: kelasList } = api.kelas.getAll.useQuery({}, { enabled: open })
  const { data: mapelList } = api.mapel.getAll.useQuery({}, { enabled: open })
  const { data: guruList } = api.guru.getAll.useQuery({}, { enabled: open })
  const { data: allJadwal, isLoading } = api.jadwal.getAll.useQuery({}, { enabled: open })
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

  // Get active days from timeline
  const aktifDays = useMemo(() => {
    const days = new Set<string>()
    for (const t of timelineRecords) {
      if (t.tipe === "jp") days.add(t.hari)
    }
    if (days.size === 0) return ["senin", "selasa", "rabu", "kamis", "jumat"]
    return ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu"].filter((d) => days.has(d))
  }, [timelineRecords])

  // Build timeline by day
  const timelineByDay = useMemo(() => {
    const map = new Map<string, TimelineRecord[]>()
    for (const day of aktifDays) {
      map.set(day, timelineRecords.filter((t) => t.hari === day).sort((a, b) => a.urutan - b.urutan))
    }
    return map
  }, [timelineRecords, aktifDays])

  // Total JP slots = max JP items across all days
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

  // Build academic JP mapping for entry lookup
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

  // Build codes map
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
          .kop-container p { font-size: 11px; margin: 2px 0; font-style: italic; }
          .judul { text-align: center; margin: 12px 0; }
          .judul h2 { font-size: 14px; margin: 0; font-weight: bold; }
          .judul p { font-size: 11px; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 15px; }
          th, td { border: 1px solid #000; padding: 3px 4px; text-align: center; vertical-align: middle; }
          th { background: #f0f0f0; font-weight: bold; }
          .day-cell { font-weight: bold; background: #fafafa; font-size: 9px; }
          .jp-cell { font-size: 7px; white-space: nowrap; }
          .agenda-cell { font-style: italic; color: #555; background: #f9f9f9; }
          .legend-section { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
          .legend-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; }
          .legend-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; font-size: 8px; }
          .signature { display: flex; justify-content: space-around; margin-top: 35px; page-break-inside: avoid; }
          .signature div { text-align: center; min-width: 200px; }
          .signature .name { margin-top: 55px; font-weight: bold; font-size: 11px; }
          .signature .label { font-size: 10px; margin-bottom: 50px; }
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

  const loading = isLoading

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-6xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)]" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const jpSlots = Array.from({ length: totalJpSlots }, (_, i) => i + 1)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cetak Jadwal Pelajaran</DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="bg-white text-black p-4">
          <div className="kop-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", borderBottom: "3px double #000", paddingBottom: "10px", marginBottom: "15px" }}>
            {sekolah?.logo ? (
              <img src={sekolah.logo} alt="Logo" style={{ height: 60, width: 60, objectFit: "contain" }} />
            ) : (
              <div style={{ height: 60, width: 60, display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "50%", fontWeight: "bold", fontSize: 10 }}>LOGO</div>
            )}
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 18, margin: 0, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>
                {sekolah?.namaSekolah || "Nama Lembaga Pendidikan"}
              </h1>
              <p style={{ fontSize: 11, margin: "2px 0", fontStyle: "italic" }}>
                {sekolah?.alamat || ""}{sekolah?.npsn ? ` | NPSN: ${sekolah.npsn}` : ""}
              </p>
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "12px 0" }}>
            <h2 style={{ fontSize: 14, margin: 0, fontWeight: "bold" }}>Jadwal Pelajaran</h2>
            <p style={{ fontSize: 11, margin: "2px 0" }}>
              Tahun Ajaran {tahunAjaran?.namaTahunAjaran || "-"}
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 8 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ border: "1px solid #000", padding: "2px 3px", background: "#f0f0f0", width: 60 }}>Hari</th>
                <th rowSpan={2} style={{ border: "1px solid #000", padding: "2px 3px", background: "#f0f0f0", width: 55 }}>Jam</th>
                {sortedKelas.map((k) => (
                  <th key={k.id} style={{ border: "1px solid #000", padding: "2px 3px", background: "#f0f0f0" }}>
                    {k.tingkat ? `${k.tingkat}-` : ""}{k.namaKelas}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aktifDays.map((day) =>
                jpSlots.map((jpSlot, idx) => {
                  const dayItems = timelineByDay.get(day) ?? []
                  const item = dayItems[jpSlot - 1]
                  const timeStart = item?.jamMulai ?? minutesToTime(startMinutes + (jpSlot - 1) * durasiJP)
                  const timeEnd = item?.jamSelesai ?? minutesToTime(startMinutes + jpSlot * durasiJP)
                  return (
                    <tr key={`${day}-${jpSlot}`}>
                      {idx === 0 && (
                        <td rowSpan={totalJpSlots} style={{ border: "1px solid #000", padding: "2px 3px", fontWeight: "bold", background: "#fafafa", fontSize: 9, verticalAlign: "middle" }}>
                          {DAY_LABEL[day]}
                        </td>
                      )}
                      <td style={{ border: "1px solid #000", padding: "1.5px 2px", fontSize: 7, whiteSpace: "nowrap" }}>
                        JP {jpSlot}<br />
                        <span style={{ fontSize: 6 }}>{timeStart}</span>
                      </td>
                      {sortedKelas.map((kelas) => {
                        const agenda = getAgenda(day, jpSlot)
                        const entry = agenda ? null : getEntry(kelas.id, day, jpSlot)
                        return (
                          <td key={kelas.id} style={{ border: "1px solid #000", padding: "1.5px 2px", verticalAlign: "middle" }}>
                            {agenda ? (
                              <span style={{ fontStyle: "italic", color: "#555", fontSize: 7 }}>
                                {agenda.label || agenda.tipe}
                              </span>
                            ) : entry ? (
                              <strong>{getKode(entry)}</strong>
                            ) : (
                              "\u2014"
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {/* Codes Legend Section */}
          {codesMap.size > 0 && (
            <div className="legend-section" style={{ marginTop: 20, borderTop: "1px solid #ccc", paddingTop: 10 }}>
              <p className="legend-title" style={{ fontSize: 10, fontWeight: "bold", marginBottom: 5 }}>Keterangan Kode Guru & Mata Pelajaran:</p>
              <div className="legend-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", fontSize: 8 }}>
                {Array.from(codesMap.entries()).map(([key, code]) => {
                  const [guruId, mapelId] = key.split("-")
                  const guru = guruMap.get(guruId)
                  const mapel = mapelMap.get(mapelId)
                  return (
                    <div key={key}>
                      <strong>{code}</strong>: {guru?.namaLengkap || "Guru"} - {mapel?.namaMapel || "Mapel"}
                    </div>
                  )
                })}
              </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2"
            style={{ backgroundColor: "hsl(142 72% 40%)" }}
          >
            <Printer className="h-4 w-4" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
