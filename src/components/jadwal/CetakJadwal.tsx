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

interface AgendaData {
  id: string
  hari: string
  nama: string
  icon: string | null
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
  const { data: agendaList } = api.pengaturanJadwal.getAgenda.useQuery({}, { enabled: open })

  const sekolah = (sekolahData ?? null) as SekolahData | null
  const kelasRecords = useMemo(() => (kelasList ?? []) as KelasRecord[], [kelasList])
  const mapelRecords = useMemo(() => (mapelList ?? []) as MapelRecord[], [mapelList])
  const guruRecords = useMemo(() => (guruList ?? []) as GuruRecord[], [guruList])
  const jadwalRecords = useMemo(() => (allJadwal ?? []) as JadwalRecord[], [allJadwal])
  const agendaRecords = useMemo(() => (agendaList ?? []) as AgendaData[], [agendaList])

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
  const endMinutes = pengaturan?.jamPulang ? timeToMinutes(pengaturan.jamPulang) : 900
  const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

  const aktifDays = useMemo(() => {
    if (!pengaturan?.hariAktif) return ["senin", "selasa", "rabu", "kamis", "jumat"]
    try {
      const parsed = JSON.parse(pengaturan.hariAktif)
      return Array.isArray(parsed) ? parsed : ["senin", "selasa", "rabu", "kamis", "jumat"]
    } catch {
      return ["senin", "selasa", "rabu", "kamis", "jumat"]
    }
  }, [pengaturan])

  const sortedKelas = useMemo(
    () => [...kelasRecords].sort((a, b) => {
      const tA = parseInt(a.tingkat || "0")
      const tB = parseInt(b.tingkat || "0")
      if (tA !== tB) return tA - tB
      return a.namaKelas.localeCompare(b.namaKelas)
    }),
    [kelasRecords]
  )

  const getEntry = (kelasId: string, hari: string, jpSlot: number): JadwalRecord | null => {
    const entries = jadwalRecords.filter(
      (e) => e.kelasId === kelasId && e.hari === hari && e.jpMulai !== null && e.jpCount !== null
    )
    for (const entry of entries) {
      const start = entry.jpMulai!
      const end = start + entry.jpCount!
      if (jpSlot >= start && jpSlot < end) return entry
    }
    return null
  }

  const getAgenda = (hari: string, jpSlot: number): AgendaData | null => {
    const hariAgenda = agendaRecords.filter((a) => a.hari === hari)
    for (const agenda of hariAgenda) {
      const startJp = Math.floor((timeToMinutes(agenda.jamMulai) - startMinutes) / durasiJP) + 1
      const endJp = Math.floor((timeToMinutes(agenda.jamSelesai) - startMinutes - 1) / durasiJP) + 1
      if (jpSlot >= startJp && jpSlot <= endJp) return agenda
    }
    return null
  }

  const getKode = (entry: JadwalRecord | null): string => {
    if (!entry) return ""
    const mapel = mapelMap.get(entry.mataPelajaranId)
    const guru = guruMap.get(entry.guruId)
    const kodeMapel = mapel?.kodeMapel || mapel?.namaMapel.slice(0, 3).toUpperCase() || "?"
    const kodeGuru = guru?.nipnuptk || guru?.namaLengkap.slice(0, 3).toUpperCase() || "?"
    return `${kodeMapel}/${kodeGuru}`
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
          body { font-family: Arial, sans-serif; padding: 0; margin: 0; font-size: 10px; }
          .print-area { padding: 15px; }
          .kop-sekolah { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 8px; }
          .kop-sekolah h1 { font-size: 16px; margin: 0; font-weight: bold; }
          .kop-sekolah p { font-size: 11px; margin: 2px 0; }
          .judul { text-align: center; margin: 12px 0; }
          .judul h2 { font-size: 14px; margin: 0; font-weight: bold; }
          .judul p { font-size: 11px; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 8px; }
          th, td { border: 1px solid #000; padding: 1.5px 2px; text-align: center; vertical-align: middle; }
          th { background: #f0f0f0; font-weight: bold; }
          .day-cell { font-weight: bold; background: #fafafa; font-size: 9px; }
          .jp-cell { font-size: 7px; white-space: nowrap; }
          .agenda-cell { font-style: italic; color: #555; }
          .signature { display: flex; justify-content: space-around; margin-top: 35px; }
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

        <div ref={printRef}>
          <div className="kop-sekolah" style={{ textAlign: "center", marginBottom: 15, borderBottom: "2px solid #000", paddingBottom: 8 }}>
            <h1 style={{ fontSize: 16, margin: 0, fontWeight: "bold" }}>
              {sekolah?.namaSekolah || "Nama Sekolah"}
            </h1>
            <p style={{ fontSize: 11, margin: "2px 0" }}>
              {sekolah?.alamat || ""}{sekolah?.npsn ? ` | NPSN: ${sekolah.npsn}` : ""}
            </p>
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
                jpSlots.map((jpSlot, idx) => (
                  <tr key={`${day}-${jpSlot}`}>
                    {idx === 0 && (
                      <td rowSpan={totalJpSlots} style={{ border: "1px solid #000", padding: "2px 3px", fontWeight: "bold", background: "#fafafa", fontSize: 9, verticalAlign: "middle" }}>
                        {DAY_LABEL[day]}
                      </td>
                    )}
                    <td style={{ border: "1px solid #000", padding: "1.5px 2px", fontSize: 7, whiteSpace: "nowrap" }}>
                      JP {jpSlot}<br />
                      <span style={{ fontSize: 6 }}>{minutesToTime(startMinutes + (jpSlot - 1) * durasiJP)}</span>
                    </td>
                    {sortedKelas.map((kelas) => {
                      const agenda = getAgenda(day, jpSlot)
                      const entry = agenda ? null : getEntry(kelas.id, day, jpSlot)
                      return (
                        <td key={kelas.id} style={{ border: "1px solid #000", padding: "1.5px 2px", verticalAlign: "middle" }}>
                          {agenda ? (
                            <span style={{ fontStyle: "italic", color: "#555", fontSize: 7 }}>
                              {agenda.nama}
                            </span>
                          ) : entry ? (
                            getKode(entry)
                          ) : (
                            "\u2014"
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-around", marginTop: 35 }}>
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
