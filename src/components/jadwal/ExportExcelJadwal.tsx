"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, Loader2 } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { DAY_LABEL, timeToMinutes, minutesToTime } from "./constants"
import * as XLSX from "xlsx"
import { toast } from "sonner"
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

function getEntryAtSlot(
  jadwalRecords: JadwalRecord[],
  kelasId: string,
  hari: string,
  jpSlot: number
): JadwalRecord | null {
  const entries = jadwalRecords.filter(
    (e) =>
      e.kelasId === kelasId &&
      e.hari === hari &&
      e.jpMulai !== null &&
      e.jpCount !== null
  )
  for (const entry of entries) {
    const start = entry.jpMulai!
    const end = start + entry.jpCount!
    if (jpSlot >= start && jpSlot < end) return entry
  }
  return null
}

function getAgendaAtSlot(
  agendaRecords: AgendaData[],
  hari: string,
  jpSlot: number,
  startMinutes: number,
  durasiJP: number
): AgendaData | null {
  const hariAgenda = agendaRecords.filter((a) => a.hari === hari)
  for (const agenda of hariAgenda) {
    const startJp =
      Math.floor((timeToMinutes(agenda.jamMulai) - startMinutes) / durasiJP) + 1
    const endJp =
      Math.floor((timeToMinutes(agenda.jamSelesai) - startMinutes - 1) / durasiJP) + 1
    if (jpSlot >= startJp && jpSlot <= endJp) return agenda
  }
  return null
}

export default function ExportExcelJadwal() {
  const [exporting, setExporting] = useState(false)
  const utils = api.useUtils()

  const handleExport = async () => {
    setExporting(true)
    try {
      const [sekolah, tahunAjaran, kelas, mapel, guru, jadwal, pengaturan, agenda] =
        await Promise.all([
          utils.client.lembaga.getSekolah.query(),
          utils.client.lembaga.getActiveTahunAjaran.query(),
          utils.client.kelas.getAll.query({}),
          utils.client.mapel.getAll.query({}),
          utils.client.guru.getAll.query({}),
          utils.client.jadwal.getAll.query({}),
          utils.client.pengaturanJadwal.get.query({}),
          utils.client.pengaturanJadwal.getAgenda.query({}),
        ])

      const sekolahData = (sekolah ?? null) as SekolahData | null
      const tahunAjaranData = (tahunAjaran ?? null) as {
        namaTahunAjaran: string
        semester?: string
      } | null
      const kelasRecords = (kelas ?? []) as KelasRecord[]
      const mapelRecords = (mapel ?? []) as MapelRecord[]
      const guruRecords = (guru ?? []) as GuruRecord[]
      const jadwalRecords = (jadwal ?? []) as JadwalRecord[]
      const agendaRecords = (agenda ?? []) as AgendaData[]
      const pengaturanData = (pengaturan ?? null) as {
        durasiJP: number
        jamMulai: string
        jamPulang: string
        hariAktif: string
      } | null

      const mapelMap = new Map(mapelRecords.map((m) => [m.id, m]))
      const guruMap = new Map(guruRecords.map((g) => [g.id, g]))

      const durasiJP = pengaturanData?.durasiJP ?? 40
      const startMinutes = pengaturanData?.jamMulai
        ? timeToMinutes(pengaturanData.jamMulai)
        : 420
      const endMinutes = pengaturanData?.jamPulang
        ? timeToMinutes(pengaturanData.jamPulang)
        : 900
      const totalJpSlots = Math.floor((endMinutes - startMinutes) / durasiJP)

      const aktifDays: string[] = (() => {
        if (!pengaturanData?.hariAktif) return DAYS
        try {
          const parsed = JSON.parse(pengaturanData.hariAktif)
          return Array.isArray(parsed) ? parsed : DAYS
        } catch {
          return DAYS
        }
      })()

      const sortedKelas = [...kelasRecords].sort((a, b) => {
        const tA = parseInt(a.tingkat || "0")
        const tB = parseInt(b.tingkat || "0")
        if (tA !== tB) return tA - tB
        return a.namaKelas.localeCompare(b.namaKelas)
      })

      const taLabel = tahunAjaranData?.namaTahunAjaran
        ? `Tahun Ajaran ${tahunAjaranData.namaTahunAjaran}${
            tahunAjaranData.semester
              ? ` Semester ${
                  tahunAjaranData.semester.charAt(0).toUpperCase() +
                  tahunAjaranData.semester.slice(1)
                }`
              : ""
          }`
        : ""

      const totalCols = 3 + sortedKelas.length

      const wb = XLSX.utils.book_new()

      const headerData: (string | undefined)[][] = [
        [sekolahData?.namaSekolah || "SEKOLAH"],
        [
          [sekolahData?.alamat, sekolahData?.npsn ? `NPSN: ${sekolahData.npsn}` : ""]
            .filter(Boolean)
            .join(" | "),
        ],
        ["Jadwal Pelajaran"],
        [taLabel],
        [],
        ["Hari", "JP", "Jam", ...sortedKelas.map((k) => (k.tingkat ? `${k.tingkat}-${k.namaKelas}` : k.namaKelas))],
      ]

      const ws = XLSX.utils.aoa_to_sheet(headerData)

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      ]

      // Style header rows (kop)
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c })
        if (!ws[addr]) continue
        ws[addr].s = { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } }
      }
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: 1, c })
        if (!ws[addr]) continue
        ws[addr].s = { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } }
      }
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: 2, c })
        if (!ws[addr]) continue
        ws[addr].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: "center", vertical: "center" } }
      }
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: 3, c })
        if (!ws[addr]) continue
        ws[addr].s = { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } }
      }

      // Style header row (row 5 = index 5)
      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: 5, c })
        if (!ws[addr]) continue
        ws[addr].s = {
          font: { bold: true, sz: 10 },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "E5E7EB" } },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        }
      }

      let currentRow = 6
      const dayStartRows: { day: string; startRow: number; endRow: number }[] = []

      for (const day of aktifDays) {
        dayStartRows.push({ day, startRow: currentRow, endRow: currentRow + totalJpSlots - 1 })

        for (let jp = 1; jp <= totalJpSlots; jp++) {
          const timeStart = minutesToTime(startMinutes + (jp - 1) * durasiJP)
          const timeEnd = minutesToTime(startMinutes + jp * durasiJP)

          // Col 0: Day (will be merged later)
          const dayCellAddr = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
          ws[dayCellAddr] = {
            t: "s",
            v: DAY_LABEL[day],
            s: {
              font: { bold: true, sz: 9 },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          // Col 1: JP number
          const jpCellAddr = XLSX.utils.encode_cell({ r: currentRow, c: 1 })
          ws[jpCellAddr] = {
            t: "s",
            v: `${jp}`,
            s: {
              font: { sz: 9 },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          // Col 2: Time
          const timeCellAddr = XLSX.utils.encode_cell({ r: currentRow, c: 2 })
          ws[timeCellAddr] = {
            t: "s",
            v: `${timeStart}-${timeEnd}`,
            s: {
              font: { sz: 8 },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          // Cols 3+: Kelas columns
          for (let ki = 0; ki < sortedKelas.length; ki++) {
            const kelas = sortedKelas[ki]
            const col = 3 + ki
            const agendaItem = getAgendaAtSlot(agendaRecords, day, jp, startMinutes, durasiJP)
            const entry = agendaItem ? null : getEntryAtSlot(jadwalRecords, kelas.id, day, jp)

            const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col })

            if (agendaItem) {
              ws[cellAddr] = {
                t: "s",
                v: agendaItem.nama,
                s: {
                  font: { italic: true, sz: 8, color: { rgb: "888888" } },
                  alignment: { horizontal: "center", vertical: "center", wrapText: true },
                  border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                  },
                },
              }
            } else if (entry) {
              const mapel = mapelMap.get(entry.mataPelajaranId)
              const guru = guruMap.get(entry.guruId)
              const mapelName = mapel?.namaMapel || "-"
              const guruName = guru?.namaLengkap || "-"

              ws[cellAddr] = {
                t: "s",
                r: [
                  { t: mapelName, s: { font: { bold: true, sz: 9 } } },
                  { t: `\n${guruName}`, s: { font: { sz: 8 } } },
                ],
                s: {
                  alignment: { horizontal: "center", vertical: "center", wrapText: true },
                  border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                  },
                },
              }
            } else {
              ws[cellAddr] = {
                t: "s",
                v: "\u2014",
                s: {
                  font: { sz: 8, color: { rgb: "999999" } },
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                  },
                },
              }
            }
          }

          currentRow++
        }
      }

      // Merge day cells vertically for each day
      for (const d of dayStartRows) {
        if (d.startRow !== d.endRow) {
          ws["!merges"]!.push({
            s: { r: d.startRow, c: 0 },
            e: { r: d.endRow, c: 0 },
          })
        }
      }

      // Auto-fit column widths
      const colWidths: number[] = []
      for (let c = 0; c < totalCols; c++) {
        let maxWidth = 0
        for (let r = 0; r < currentRow; r++) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (!cell) continue
          let text = ""
          if (cell.r) {
            text = (cell.r as { t: string }[]).map((run) => run.t).join("")
          } else if (cell.v) {
            text = String(cell.v)
          }
          const lines = text.split("\n")
          for (const line of lines) {
            const len = line.length
            if (c < 3) {
              maxWidth = Math.max(maxWidth, len)
            } else {
              maxWidth = Math.max(maxWidth, Math.min(len, 30))
            }
          }
        }
        colWidths.push(Math.max(maxWidth + 2, 8))
      }

      colWidths[0] = Math.max(colWidths[0], 10)
      colWidths[1] = Math.max(colWidths[1], 6)
      colWidths[2] = Math.max(colWidths[2], 14)

      ws["!cols"] = colWidths.map((w) => ({ wch: w }))

      // Row heights
      const rowHeights: { hpt: number }[] = []
      for (let r = 0; r < currentRow; r++) {
        if (r <= 4) {
          rowHeights.push({ hpt: [30, 18, 24, 20, 8][r] || 20 })
        } else {
          rowHeights.push({ hpt: 36 })
        }
      }
      ws["!rows"] = rowHeights

      XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pelajaran")
      XLSX.writeFile(wb, `jadwal_pelajaran_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success("Data berhasil diexport")
    } catch (err) {
      toast.error("Gagal mengexport data")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={handleExport}
      disabled={exporting}
    >
      {exporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-4 w-4" />
      )}
      Export Excel
    </Button>
  )
}
