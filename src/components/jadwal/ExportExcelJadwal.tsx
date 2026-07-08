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

interface TimelineRecord {
  id: string
  hari: string
  tipe: string
  label: string | null
  jamMulai: string
  jamSelesai: string
  urutan: number
}

export default function ExportExcelJadwal() {
  const [exporting, setExporting] = useState(false)
  const utils = api.useUtils()

  const handleExport = async () => {
    setExporting(true)
    try {
      const [sekolah, tahunAjaran, kelas, mapel, guru, jadwal, pengaturan, timeline] =
        await Promise.all([
          utils.client.lembaga.getSekolah.query(),
          utils.client.lembaga.getActiveTahunAjaran.query(),
          utils.client.kelas.getAll.query({}),
          utils.client.mapel.getAll.query({}),
          utils.client.guru.getAll.query({}),
          utils.client.jadwal.getAll.query({}),
          utils.client.pengaturanJadwal.get.query({}),
          utils.client.pengaturanJadwal.getTimeline.query({}),
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
      const timelineRecords = (timeline ?? []) as TimelineRecord[]
      const pengaturanData = (pengaturan ?? null) as {
        durasiJP: number
        jamMulai: string
      } | null

      const mapelMap = new Map(mapelRecords.map((m) => [m.id, m]))
      const guruMap = new Map(guruRecords.map((g) => [g.id, g]))

      const durasiJP = pengaturanData?.durasiJP ?? 40

      const aktifDays = (() => {
        const days = new Set<string>()
        for (const t of timelineRecords) {
          if (t.tipe === "jp") days.add(t.hari)
        }
        if (days.size === 0) return DAYS
        return DAYS.filter((d) => days.has(d))
      })()

      const timelineByDay = new Map<string, TimelineRecord[]>()
      for (const day of aktifDays) {
        timelineByDay.set(day, timelineRecords.filter((t) => t.hari === day).sort((a, b) => a.urutan - b.urutan))
      }

      let maxJpSlots = 0
      for (const day of aktifDays) {
        const jpCount = (timelineByDay.get(day) ?? []).filter((t) => t.tipe === "jp").length
        if (jpCount > maxJpSlots) maxJpSlots = jpCount
      }

      const totalJpSlots = Math.max(maxJpSlots, 1)

      const academicJpMap = new Map<string, number | null>()
      for (const day of aktifDays) {
        const dayItems = timelineByDay.get(day) ?? []
        let academicCounter = 1
        for (let jp = 1; jp <= totalJpSlots; jp++) {
          const timelineItem = dayItems[jp - 1]
          if (timelineItem && timelineItem.tipe !== "jp") {
            academicJpMap.set(`${day}-${jp}`, null)
          } else if (timelineItem && timelineItem.tipe === "jp") {
            academicJpMap.set(`${day}-${jp}`, academicCounter++)
          } else {
            academicJpMap.set(`${day}-${jp}`, null)
          }
        }
      }

      const sortedKelas = [...kelasRecords].sort((a, b) => {
        const tA = parseInt(a.tingkat || "0")
        const tB = parseInt(b.tingkat || "0")
        if (tA !== tB) return tA - tB
        return a.namaKelas.localeCompare(b.namaKelas)
      })

      const taLabel = tahunAjaranData?.namaTahunAjaran
        ? `Tahun Ajaran ${tahunAjaranData.namaTahunAjaran}${
            tahunAjaranData.semester
              ? ` Semester ${tahunAjaranData.semester.charAt(0).toUpperCase() + tahunAjaranData.semester.slice(1)}`
              : ""
          }`
        : ""

      // ── Code system ──
      const codesMap = new Map<string, string>()
      const sortedTeachers = [...guruRecords].sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap))
      let teacherCounter = 1
      for (const teacher of sortedTeachers) {
        const teacherSchedules = jadwalRecords.filter((j) => j.guruId === teacher.id)
        const uniqueSubjectIds = Array.from(new Set(teacherSchedules.map((j) => j.mataPelajaranId)))
        let subjectOffset = 0
        for (const mapelId of uniqueSubjectIds) {
          const suffix = subjectOffset === 0 ? "" : String.fromCharCode(96 + subjectOffset)
          const code = `${teacherCounter}${suffix}`
          codesMap.set(`${teacher.id}-${mapelId}`, code)
          subjectOffset++
        }
        if (uniqueSubjectIds.length > 0) {
          teacherCounter++
        }
      }

      const getKode = (entry: JadwalRecord | null): string => {
        if (!entry) return ""
        const key = `${entry.guruId}-${entry.mataPelajaranId}`
        return codesMap.get(key) || ""
      }

      // ── Helpers ──
      const getEntryAtSlot = (hari: string, kelasId: string, jpSlot: number): JadwalRecord | null => {
        const academicJp = academicJpMap.get(`${hari}-${jpSlot}`)
        if (academicJp === null || academicJp === undefined) return null
        const entries = jadwalRecords.filter(
          (e) => e.hari === hari && e.kelasId === kelasId && e.jpMulai !== null && e.jpCount !== null
        )
        for (const entry of entries) {
          const start = entry.jpMulai!
          const end = start + entry.jpCount!
          if (academicJp >= start && academicJp < end) return entry
        }
        return null
      }

      const getAgendaAtSlot = (hari: string, jpSlot: number): TimelineRecord | null => {
        const dayItems = timelineByDay.get(hari) ?? []
        const item = dayItems[jpSlot - 1]
        if (item && item.tipe !== "jp") return item
        return null
      }

      const classCount = sortedKelas.length
      const dayCount = aktifDays.length
      const totalCols = 1 + dayCount * classCount

      const wb = XLSX.utils.book_new()

      // ── Header rows (0-4) ──
      const headerData: (string | undefined)[][] = [
        [sekolahData?.namaSekolah || "SEKOLAH"],
        [
          [sekolahData?.alamat, sekolahData?.npsn ? `NPSN: ${sekolahData.npsn}` : ""]
            .filter(Boolean)
            .join(" | "),
        ],
        ["Jadwal Pelajaran Keseluruhan Kelas"],
        [taLabel],
        [],
      ]

      const ws = XLSX.utils.aoa_to_sheet(headerData)

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      ]

      // Style header info
      for (let c = 0; c < totalCols; c++) {
        ws[XLSX.utils.encode_cell({ r: 0, c })] = {
          ...ws[XLSX.utils.encode_cell({ r: 0, c })],
          s: { font: { bold: true, sz: 14 }, alignment: { horizontal: "center", vertical: "center" } },
        }
        ws[XLSX.utils.encode_cell({ r: 1, c })] = {
          ...ws[XLSX.utils.encode_cell({ r: 1, c })],
          s: { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } },
        }
        ws[XLSX.utils.encode_cell({ r: 2, c })] = {
          ...ws[XLSX.utils.encode_cell({ r: 2, c })],
          s: { font: { bold: true, sz: 12 }, alignment: { horizontal: "center", vertical: "center" } },
        }
        ws[XLSX.utils.encode_cell({ r: 3, c })] = {
          ...ws[XLSX.utils.encode_cell({ r: 3, c })],
          s: { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } },
        }
      }

      // ── Column A merge ──
      const colAMerge = { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } }
      ws["!merges"]!.push(colAMerge)

      // ── Row 5: Day names ──
      const row5colA = XLSX.utils.encode_cell({ r: 5, c: 0 })
      ws[row5colA] = {
        t: "s",
        v: "JP / Jam",
        s: {
          font: { bold: true, sz: 9 },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          fill: { fgColor: { rgb: "E5E7EB" } },
          border: {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          },
        },
      }

      for (let di = 0; di < dayCount; di++) {
        const day = aktifDays[di]
        const startCol = 1 + di * classCount
        const endCol = startCol + classCount - 1

        ws["!merges"]!.push({ s: { r: 5, c: startCol }, e: { r: 5, c: endCol } })

        const cellAddr = XLSX.utils.encode_cell({ r: 5, c: startCol })
        ws[cellAddr] = {
          t: "s",
          v: DAY_LABEL[day],
          s: {
            font: { bold: true, sz: 10 },
            alignment: { horizontal: "center", vertical: "center" },
            fill: { fgColor: { rgb: "E5E7EB" } },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          },
        }

        // Fill remaining merged cells with style
        for (let ci = startCol + 1; ci <= endCol; ci++) {
          const fillAddr = XLSX.utils.encode_cell({ r: 5, c: ci })
          ws[fillAddr] = {
            t: "s",
            v: "",
            s: {
              fill: { fgColor: { rgb: "E5E7EB" } },
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

      // ── Row 6: Class names ──
      for (let di = 0; di < dayCount; di++) {
        for (let ci = 0; ci < classCount; ci++) {
          const kelas = sortedKelas[ci]
          const col = 1 + di * classCount + ci
          const cellAddr = XLSX.utils.encode_cell({ r: 6, c: col })
          ws[cellAddr] = {
            t: "s",
            v: kelas.tingkat ? `${kelas.tingkat}-${kelas.namaKelas}` : kelas.namaKelas,
            s: {
              font: { bold: true, sz: 8 },
              alignment: { horizontal: "center", vertical: "center", wrapText: true },
              fill: { fgColor: { rgb: "F3F4F6" } },
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

      // ── Data rows (starting row 7) ──
      let currentRow = 7

      for (let jp = 1; jp <= totalJpSlots; jp++) {
        const dayItems = timelineByDay.get(aktifDays[0]) ?? []
        const item = dayItems[jp - 1]
        const timeStart = item?.jamMulai ?? minutesToTime(420 + (jp - 1) * durasiJP)
        const timeEnd = item?.jamSelesai ?? minutesToTime(420 + jp * durasiJP)

        // Col A: JP number & time
        const colAAddr = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
        ws[colAAddr] = {
          t: "s",
          v: `JP ${jp}\n${timeStart}-${timeEnd}`,
          s: {
            font: { bold: true, sz: 8 },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
              top: { style: "thin" },
              bottom: { style: "thin" },
              left: { style: "thin" },
              right: { style: "thin" },
            },
          },
        }

        for (let di = 0; di < dayCount; di++) {
          const day = aktifDays[di]
          const agendaItem = getAgendaAtSlot(day, jp)

          for (let ci = 0; ci < classCount; ci++) {
            const kelas = sortedKelas[ci]
            const col = 1 + di * classCount + ci
            const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col })

            if (agendaItem) {
              ws[cellAddr] = {
                t: "s",
                v: agendaItem.label || agendaItem.tipe || "-",
                s: {
                  font: { italic: true, sz: 8, color: { rgb: "888888" } },
                  alignment: { horizontal: "center", vertical: "center" },
                  border: {
                    top: { style: "thin" },
                    bottom: { style: "thin" },
                    left: { style: "thin" },
                    right: { style: "thin" },
                  },
                },
              }
            } else {
              const entry = getEntryAtSlot(day, kelas.id, jp)
              if (entry) {
                ws[cellAddr] = {
                  t: "s",
                  v: getKode(entry),
                  s: {
                    font: { bold: true, sz: 9 },
                    alignment: { horizontal: "center", vertical: "center" },
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
          }
        }

        currentRow++
      }

      // ── Legend: 3 kolom ──
      if (codesMap.size > 0) {
        currentRow += 2

        const titleAddr = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
        ws[titleAddr] = {
          t: "s",
          v: "Keterangan Kode:",
          s: { font: { bold: true, sz: 10 } },
        }
        ws["!merges"]!.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 2 } })
        currentRow++

        const legHeaders = ["Kode", "Nama Guru", "Mata Pelajaran"]
        for (let c = 0; c < 3; c++) {
          const addr = XLSX.utils.encode_cell({ r: currentRow, c })
          ws[addr] = {
            t: "s",
            v: legHeaders[c],
            s: {
              font: { bold: true, sz: 9 },
              fill: { fgColor: { rgb: "E5E7EB" } },
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
        currentRow++

        const sortedCodes = [...codesMap.entries()].sort((a, b) =>
          a[1].localeCompare(b[1], undefined, { numeric: true })
        )
        for (const [key, code] of sortedCodes) {
          const [guruId, mapelId] = key.split("-")
          const guru = guruMap.get(guruId)
          const mapel = mapelMap.get(mapelId)

          const addr0 = XLSX.utils.encode_cell({ r: currentRow, c: 0 })
          ws[addr0] = {
            t: "s",
            v: code,
            s: {
              font: { bold: true, sz: 9 },
              alignment: { horizontal: "center", vertical: "center" },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          const addr1 = XLSX.utils.encode_cell({ r: currentRow, c: 1 })
          ws[addr1] = {
            t: "s",
            v: guru?.namaLengkap || "-",
            s: {
              font: { sz: 9 },
              alignment: { horizontal: "left", vertical: "center" },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          const addr2 = XLSX.utils.encode_cell({ r: currentRow, c: 2 })
          ws[addr2] = {
            t: "s",
            v: mapel?.namaMapel || "-",
            s: {
              font: { sz: 9 },
              alignment: { horizontal: "left", vertical: "center" },
              border: {
                top: { style: "thin" },
                bottom: { style: "thin" },
                left: { style: "thin" },
                right: { style: "thin" },
              },
            },
          }

          currentRow++
        }
      }

      // ── Tanda Tangan ──
      currentRow += 2

      const mengetahuiAddr = XLSX.utils.encode_cell({ r: currentRow, c: Math.floor(totalCols / 2) - 1 })
      ws[mengetahuiAddr] = {
        t: "s",
        v: "Mengetahui,",
        s: { font: { sz: 10, italic: true } },
      }
      ws["!merges"]!.push({
        s: { r: currentRow, c: Math.floor(totalCols / 2) - 1 },
        e: { r: currentRow, c: Math.floor(totalCols / 2) },
      })
      currentRow++

      const kepalaAddr = XLSX.utils.encode_cell({ r: currentRow, c: 1 })
      ws[kepalaAddr] = {
        t: "s",
        v: "Kepala Sekolah/Madrasah",
        s: { font: { bold: true, sz: 10 } },
      }
      ws["!merges"]!.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 3 } })

      const wakaAddr = XLSX.utils.encode_cell({ r: currentRow, c: Math.floor(totalCols / 2) + 1 })
      ws[wakaAddr] = {
        t: "s",
        v: "Waka Kurikulum",
        s: { font: { bold: true, sz: 10 } },
      }
      ws["!merges"]!.push({
        s: { r: currentRow, c: Math.floor(totalCols / 2) + 1 },
        e: { r: currentRow, c: Math.floor(totalCols / 2) + 3 },
      })
      currentRow += 4

      const namaKepsek = sekolahData?.kepalaSekolah || "(_________________________)"
      const kepsekNamaAddr = XLSX.utils.encode_cell({ r: currentRow, c: 1 })
      ws[kepsekNamaAddr] = {
        t: "s",
        v: namaKepsek,
        s: { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } },
      }
      ws["!merges"]!.push({ s: { r: currentRow, c: 1 }, e: { r: currentRow, c: 3 } })

      const wakaNamaAddr = XLSX.utils.encode_cell({ r: currentRow, c: Math.floor(totalCols / 2) + 1 })
      ws[wakaNamaAddr] = {
        t: "s",
        v: "(_________________________)",
        s: { font: { sz: 10 }, alignment: { horizontal: "center", vertical: "center" } },
      }
      ws["!merges"]!.push({
        s: { r: currentRow, c: Math.floor(totalCols / 2) + 1 },
        e: { r: currentRow, c: Math.floor(totalCols / 2) + 3 },
      })

      // ── Auto-fit column widths ──
      const colWidths: number[] = []
      for (let c = 0; c < totalCols; c++) {
        if (c === 0) {
          colWidths.push(12)
          continue
        }
        const kelasIdx = (c - 1) % classCount
        const kelas = sortedKelas[kelasIdx]
        const label = kelas.tingkat ? `${kelas.tingkat}-${kelas.namaKelas}` : kelas.namaKelas
        colWidths.push(Math.max(label.length + 2, 8))
      }

      ws["!cols"] = colWidths.map((w) => ({ wch: w }))

      const rowHeights: { hpt: number }[] = []
      for (let r = 0; r <= currentRow; r++) {
        if (r === 0) rowHeights.push({ hpt: 30 })
        else if (r === 1) rowHeights.push({ hpt: 18 })
        else if (r === 2) rowHeights.push({ hpt: 22 })
        else if (r === 3) rowHeights.push({ hpt: 18 })
        else if (r === 4) rowHeights.push({ hpt: 8 })
        else if (r === 5) rowHeights.push({ hpt: 22 })
        else if (r === 6) rowHeights.push({ hpt: 20 })
        else rowHeights.push({ hpt: 32 })
      }
      ws["!rows"] = rowHeights

      // ── Page setup: Landscape ──
      ws["!pageSetup"] = {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      }

      XLSX.utils.book_append_sheet(wb, ws, "Jadwal Pelajaran")
      XLSX.writeFile(wb, `jadwal_pelajaran_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success("Data berhasil diexport")
    } catch {
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
