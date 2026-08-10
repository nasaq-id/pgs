"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { X, Printer, Info, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

interface PrintBlock {
  type: "AGENDA" | "KBM" | "EMPTY"
  startTime: string
  endTime: string
  jpLabel?: string
  label?: string
  mapelName?: string
  teacherName?: string
}

interface LegendItem {
  code: string
  guru: string
  mapel: string
  mapelKode: string
}

const DAY_COLOR_STYLES: Record<
  string,
  { headerBg: string; jpBadgeBg: string; jpBadgeText: string; jpBadgeBorder: string }
> = {
  senin: {
    headerBg: "bg-[#4f46e5] print:bg-[#4f46e5] text-white",
    jpBadgeBg: "bg-indigo-50 print:bg-indigo-100/90",
    jpBadgeText: "text-indigo-700 print:text-indigo-950",
    jpBadgeBorder: "border-indigo-200/80",
  },
  selasa: {
    headerBg: "bg-[#059669] print:bg-[#059669] text-white",
    jpBadgeBg: "bg-emerald-50 print:bg-emerald-100/90",
    jpBadgeText: "text-emerald-700 print:text-emerald-950",
    jpBadgeBorder: "border-emerald-200/80",
  },
  rabu: {
    headerBg: "bg-[#9333ea] print:bg-[#9333ea] text-white",
    jpBadgeBg: "bg-purple-50 print:bg-purple-100/90",
    jpBadgeText: "text-purple-700 print:text-purple-950",
    jpBadgeBorder: "border-purple-200/80",
  },
  kamis: {
    headerBg: "bg-[#0284c7] print:bg-[#0284c7] text-white",
    jpBadgeBg: "bg-sky-50 print:bg-sky-100/90",
    jpBadgeText: "text-sky-700 print:text-sky-950",
    jpBadgeBorder: "border-sky-200/80",
  },
  jumat: {
    headerBg: "bg-[#0d9488] print:bg-[#0d9488] text-white",
    jpBadgeBg: "bg-teal-50 print:bg-teal-100/90",
    jpBadgeText: "text-teal-700 print:text-teal-950",
    jpBadgeBorder: "border-teal-200/80",
  },
  sabtu: {
    headerBg: "bg-[#d97706] print:bg-[#d97706] text-white",
    jpBadgeBg: "bg-amber-50 print:bg-amber-100/90",
    jpBadgeText: "text-amber-700 print:text-amber-950",
    jpBadgeBorder: "border-amber-200/80",
  },
  minggu: {
    headerBg: "bg-[#475569] print:bg-[#475569] text-white",
    jpBadgeBg: "bg-slate-50 print:bg-slate-100/90",
    jpBadgeText: "text-slate-700 print:text-slate-950",
    jpBadgeBorder: "border-slate-200/80",
  },
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function CetakJadwal({ open, onClose }: Props) {
  const [cetakMode, setCetakMode] = useState<"per-kelas" | "keseluruhan">("keseluruhan")
  const [selectedKelasId, setSelectedKelasId] = useState("semua")

  useEffect(() => {
    if (!open) {
      setCetakMode("keseluruhan")
      setSelectedKelasId("semua")
    }
  }, [open])

  const { data: sekolahData } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: open,
  })

  const { data: tahunAjaran } = api.lembaga.getActiveTahunAjaran.useQuery(undefined, {
    enabled: open,
  })

  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: mapelList } = api.mapel.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: guruList } = api.guru.getAll.useQuery({ limit: 1000 }, { enabled: open })
  const { data: allJadwal, isLoading } = api.jadwal.getAll.useQuery({ limit: 1000 }, { enabled: open })
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

  const slotTimeOf = (day: string, jpSlot: number) => {
    const dayItems = timelineByDay.get(day) ?? []
    const item = dayItems[jpSlot - 1]
    return {
      start: item?.jamMulai ?? minutesToTime(startMinutes + (jpSlot - 1) * durasiJP),
      end: item?.jamSelesai ?? minutesToTime(startMinutes + jpSlot * durasiJP),
    }
  }

  const academicJpOf = (day: string, jpSlot: number): number | null => {
    const v = academicJpMap.get(`${day}-${jpSlot}`)
    return v === undefined || v === null ? null : v
  }

  const getBlocksForKelas = (kelasId: string, day: string): PrintBlock[] => {
    const blocks: PrintBlock[] = []
    let jpSlot = 1
    while (jpSlot <= totalJpSlots) {
      const agenda = getAgenda(day, jpSlot)
      if (agenda) {
        blocks.push({
          type: "AGENDA",
          startTime: agenda.jamMulai,
          endTime: agenda.jamSelesai,
          label: agenda.label || agenda.tipe,
        })
        jpSlot++
        continue
      }

      const entry = getEntry(kelasId, day, jpSlot)
      if (entry) {
        let endSlot = jpSlot
        while (endSlot < totalJpSlots) {
          if (getAgenda(day, endSlot + 1)) break
          const nextEntry = getEntry(kelasId, day, endSlot + 1)
          if (nextEntry && nextEntry.id === entry.id) endSlot++
          else break
        }
        const startJp = academicJpOf(day, jpSlot)
        const endJp = academicJpOf(day, endSlot)
        const start = slotTimeOf(day, jpSlot)
        const end = slotTimeOf(day, endSlot)
        blocks.push({
          type: "KBM",
          jpLabel:
            startJp !== null && endJp !== null && endJp > startJp
              ? `JP ${startJp}\u2013${endJp}`
              : `JP ${startJp ?? jpSlot}`,
          startTime: start.start,
          endTime: end.end,
          mapelName: mapelMap.get(entry.mataPelajaranId)?.namaMapel || "-",
          teacherName: guruMap.get(entry.guruId)?.namaLengkap || "-",
        })
        jpSlot = endSlot + 1
      } else {
        let endSlot = jpSlot
        while (endSlot < totalJpSlots) {
          if (getAgenda(day, endSlot + 1)) break
          if (getEntry(kelasId, day, endSlot + 1)) break
          endSlot++
        }
        const startJp = academicJpOf(day, jpSlot)
        const endJp = academicJpOf(day, endSlot)
        const start = slotTimeOf(day, jpSlot)
        const end = slotTimeOf(day, endSlot)
        blocks.push({
          type: "EMPTY",
          jpLabel:
            startJp !== null && endJp !== null && endJp > startJp
              ? `JP ${startJp}\u2013${endJp}`
              : `JP ${startJp ?? jpSlot}`,
          startTime: start.start,
          endTime: end.end,
        })
        jpSlot = endSlot + 1
      }
    }
    return blocks
  }

  // ── Sistem kode guru-mapel (mengikuti prototipe: 1, 2a, 2b, ...) ──
  const { codeMap, legendMap } = useMemo(() => {
    const codeMap = new Map<string, string>()
    const legendMap: LegendItem[] = []
    const teacherMapels = new Map<string, string[]>()
    for (const j of jadwalRecords) {
      const list = teacherMapels.get(j.guruId) || []
      if (!list.includes(j.mataPelajaranId)) list.push(j.mataPelajaranId)
      teacherMapels.set(j.guruId, list)
    }
    let teacherCounter = 1
    for (const [guruId, mapelIds] of teacherMapels) {
      const guru = guruMap.get(guruId)
      if (!guru) continue
      const teacherCode = teacherCounter++
      mapelIds.forEach((mapelId, idx) => {
        const mapel = mapelMap.get(mapelId)
        const suffix = mapelIds.length > 1 ? String.fromCharCode(97 + idx) : ""
        const code = `${teacherCode}${suffix}`
        codeMap.set(`${guruId}|${mapelId}`, code)
        legendMap.push({
          code,
          guru: guru.namaLengkap,
          mapel: mapel?.namaMapel || "-",
          mapelKode: mapel?.kodeMapel || "",
        })
      })
    }
    return { codeMap, legendMap }
  }, [guruMap, mapelMap, jadwalRecords])

  const getKode = (entry: JadwalRecord | null): string => {
    if (!entry) return ""
    return codeMap.get(`${entry.guruId}|${entry.mataPelajaranId}`) || ""
  }

  const taLabel = useMemo(() => {
    if (!tahunAjaran?.namaTahunAjaran) return ""
    const s = tahunAjaran?.semester
    return `Tahun Ajaran ${tahunAjaran.namaTahunAjaran}${
      s ? ` • Semester ${s.charAt(0).toUpperCase() + s.slice(1)}` : ""
    }`
  }, [tahunAjaran])

  if (!open) return null

  const kelasShort = (k: KelasRecord) => formatKelasLabel(k).replace(/^kelas\s+/i, "")

  // ── Renderer: Kop (tidak berubah dari versi sebelumnya) ──
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

        <div style={{ flex: 1, textAlign: "center", fontFamily: "'Inter', sans-serif" }}>
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

        {sekolah?.logo ? (
          <img src={sekolah.logo} alt="Logo Kanan" style={{ height: 55, width: 55, objectFit: "contain" }} />
        ) : (
          <div style={{ height: 50, width: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "8px", fontWeight: "bold", fontSize: 8, color: "#9ca3af" }}>LOGO</div>
        )}
      </div>
    )
  }

  const renderSignatures = () => (
    <div className="grid grid-cols-2 mt-6 print:mt-2 text-center text-[10px] print:text-[8px] gap-8 print:gap-4 avoid-break">
      <div>
        <p className="font-bold">Kepala Sekolah,</p>
        <div className="h-14 print:h-10" />
        <p className="font-black text-slate-900">{sekolah?.kepalaSekolah || "(_________________)"}</p>
      </div>
      <div>
        <p className="font-bold text-slate-700">Waka Kurikulum,</p>
        <div className="h-14 print:h-10" />
        <p className="font-black text-slate-900">(_________________)</p>
      </div>
    </div>
  )

  const renderLegend = (mapData: LegendItem[]) => {
    if (mapData.length === 0) return null
    const guruGroups: Record<string, LegendItem[]> = {}
    mapData.forEach((item) => {
      if (!guruGroups[item.guru]) guruGroups[item.guru] = []
      guruGroups[item.guru].push(item)
    })
    const groupedList = Object.entries(guruGroups)
    const midpoint = Math.ceil(groupedList.length / 2)
    const leftGroups = groupedList.slice(0, midpoint)
    const rightGroups = groupedList.slice(midpoint)

    const renderTable = (groups: [string, LegendItem[]][]) => {
      if (groups.length === 0) return null
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 print:border-slate-300 bg-white shadow-2xs">
          <table className="w-full text-left text-xs print:text-[8px] border-collapse">
            <thead>
              <tr className="bg-slate-100/90 print:bg-slate-100 border-b border-slate-200 text-slate-700 print:text-slate-900 font-black">
                <th className="py-2 px-3 print:py-1 print:px-2 border-r border-slate-200 text-[10px] print:text-[8px] uppercase tracking-wider min-w-[100px]">Guru Pengampu</th>
                <th className="py-2 px-2 print:py-1 print:px-1.5 border-r border-slate-200 text-[10px] print:text-[8px] uppercase tracking-wider text-center w-[45px]">Kode</th>
                <th className="py-2 px-3 print:py-1 print:px-2 text-[10px] print:text-[8px] uppercase tracking-wider">Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {groups.flatMap(([guru, items]) =>
                items.map((item, idx) => (
                  <tr key={item.code + "-" + idx}>
                    {idx === 0 && (
                      <td rowSpan={items.length} className="py-1.5 px-3 print:py-0.5 print:px-2 border-r border-slate-100 print:border-slate-200 font-bold text-slate-900 bg-white align-middle leading-tight">
                        {guru}
                      </td>
                    )}
                    <td className="py-1.5 px-2 print:py-0.5 print:px-1 border-r border-slate-100 print:border-slate-200 text-center font-mono font-black text-indigo-700 print:text-indigo-900 bg-indigo-50/40 print:bg-slate-100/60 align-middle">
                      {item.code}
                    </td>
                    <td className="py-1.5 px-3 print:py-0.5 print:px-2 font-medium text-slate-700 print:text-slate-900 align-middle leading-tight">
                      <div className="flex items-center gap-1.5">
                        {item.mapelKode && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] print:text-[7px] font-black text-slate-800 uppercase tracking-wider">
                            {item.mapelKode}
                          </span>
                        )}
                        <span>{item.mapel}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="mt-6 bg-white print:bg-white rounded-2xl print:rounded-xl border border-slate-200 print:border-slate-300 overflow-hidden shadow-2xs avoid-break text-left">
        <div className="bg-[#4f46e5] print:bg-indigo-700 text-white px-4 py-2 print:px-3 print:py-1.5 flex items-center justify-between">
          <span className="font-black text-xs print:text-[9.5px] uppercase tracking-wider flex items-center gap-2">
            📌 KETERANGAN KODE GURU & MATA PELAJARAN
          </span>
          <span className="text-[10px] print:text-[8px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white">
            {mapData.length} Pengampu
          </span>
        </div>
        <div className="p-3 print:p-2 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-2 items-start">
            {renderTable(leftGroups)}
            {renderTable(rightGroups)}
          </div>
        </div>
      </div>
    )
  }

  const renderClassLegend = (mapData: LegendItem[]) => {
    if (mapData.length === 0) return null
    const uniqueItems = Array.from(
      new Map(mapData.map((item) => [`${item.mapelKode}-${item.guru}`, item])).values()
    )
    const midpoint = Math.ceil(uniqueItems.length / 2)
    const leftGroups = uniqueItems.slice(0, midpoint)
    const rightGroups = uniqueItems.slice(midpoint)

    const renderTable = (items: LegendItem[]) => {
      if (items.length === 0) return null
      return (
        <div className="overflow-hidden rounded-xl border border-slate-200 print:border-slate-300 bg-white shadow-2xs">
          <table className="w-full text-left text-xs print:text-[8px] border-collapse">
            <thead>
              <tr className="bg-slate-100/90 print:bg-slate-100 border-b border-slate-200 text-slate-700 print:text-slate-900 font-black">
                <th className="py-2 px-2 print:py-1 print:px-1.5 border-r border-slate-200 text-[10px] print:text-[8px] uppercase tracking-wider text-center w-[50px]">Kode</th>
                <th className="py-2 px-3 print:py-1 print:px-2 border-r border-slate-200 text-[10px] print:text-[8px] uppercase tracking-wider">Mata Pelajaran</th>
                <th className="py-2 px-3 print:py-1 print:px-2 text-[10px] print:text-[8px] uppercase tracking-wider">Guru Pengampu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 print:py-0.5 print:px-1 border-r border-slate-100 print:border-slate-200 text-center font-mono font-black text-indigo-700 print:text-indigo-900 bg-indigo-50/40 print:bg-slate-100/60 align-middle">
                    {item.code || "-"}
                  </td>
                  <td className="py-1.5 px-3 print:py-0.5 print:px-2 border-r border-slate-100 print:border-slate-200 font-bold text-slate-900 align-middle leading-tight">
                    {item.mapel}
                  </td>
                  <td className="py-1.5 px-3 print:py-0.5 print:px-2 font-medium text-slate-700 print:text-slate-900 align-middle leading-tight">
                    {item.guru}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <div className="mt-6 bg-white print:bg-white rounded-2xl print:rounded-xl border border-slate-200 print:border-slate-300 overflow-hidden shadow-2xs avoid-break text-left">
        <div className="bg-[#4f46e5] print:bg-indigo-700 text-white px-4 py-2 print:px-3 print:py-1.5 flex items-center justify-between">
          <span className="font-black text-xs print:text-[9.5px] uppercase tracking-wider flex items-center gap-2">
            📌 KETERANGAN MATA PELAJARAN & GURU PENGAMPU
          </span>
          <span className="text-[10px] print:text-[8px] font-bold bg-white/20 px-2.5 py-0.5 rounded-full text-white">
            {mapData.length} Mapel
          </span>
        </div>
        <div className="p-3 print:p-2 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-2 items-start">
            {renderTable(leftGroups)}
            {renderTable(rightGroups)}
          </div>
        </div>
      </div>
    )
  }

  // ── Mode Keseluruhan (Master Roster per Hari) ──
  const renderKeseluruhan = () => (
    <div className="space-y-6 text-left">
      {renderKopHeader()}

      <div className="text-center mt-2 print:mt-0 mb-3 print:mb-1">
        <span className="inline-block px-4 py-1 print:px-3 print:py-0.5 rounded-full bg-slate-100 print:bg-slate-200/80 border border-slate-200/80 text-slate-700 print:text-slate-900 font-extrabold text-xs print:text-[9px]">
          {taLabel} • {sortedKelas.length} KELAS
        </span>
      </div>

      {aktifDays.map((day) => {
        const dayItems = timelineByDay.get(day) ?? []
        if (dayItems.length === 0) return null
        const dayStyle = DAY_COLOR_STYLES[day] || DAY_COLOR_STYLES.senin
        const jpCount = dayItems.filter((s) => s.tipe === "jp").length

        return (
          <div
            key={day}
            className="bg-white print:bg-white rounded-2xl print:rounded-xl border border-slate-200 print:border-slate-300 overflow-hidden shadow-2xs mb-6 avoid-break"
          >
            <div className={`${dayStyle.headerBg} px-4 py-2 print:px-3 print:py-1.5 flex items-center justify-between`}>
              <span className="font-black text-sm print:text-xs uppercase tracking-wider flex items-center gap-2">
                HARI {DAY_LABEL[day].toUpperCase()}
              </span>
              <span className="text-xs print:text-[10px] font-black bg-white/20 px-3 py-0.5 rounded-full text-white">
                {jpCount} JP
              </span>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-center border-collapse text-xs print:text-[8.5px]">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100 border-b border-slate-200 text-slate-700 print:text-slate-900 font-bold">
                    <th className="py-2 px-2 print:py-1 print:px-1 border-r border-slate-200 text-[11px] print:text-[8px] font-black uppercase tracking-wider text-slate-600 min-w-[85px] print:min-w-0">
                      WAKTU
                    </th>
                    <th className="py-2 px-1.5 print:py-1 print:px-0.5 border-r border-slate-200 text-[11px] print:text-[8px] font-black uppercase tracking-wider text-slate-600 w-[45px] print:w-auto">
                      JP
                    </th>
                    {sortedKelas.map((c) => (
                      <th key={c.id} className="py-2 px-1.5 print:py-1 print:px-0.5 border-r border-slate-200 text-[11px] print:text-[8px] font-black uppercase text-slate-800 min-w-[65px] print:min-w-0">
                        {kelasShort(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {dayItems.map((item, sIdx) => {
                    if (item.tipe !== "jp") {
                      const isFlag = /upacara|apel/i.test(item.label || "")
                      return (
                        <tr key={sIdx} className="bg-[#fef9c3] print:bg-[#fef08a] border-b border-amber-200/90 print:border-amber-300">
                          <td className="py-2 px-2 print:py-1 font-mono font-bold text-[10.5px] print:text-[8px] text-amber-900 border-r border-amber-200/80 whitespace-nowrap">
                            {item.jamMulai}–{item.jamSelesai}
                          </td>
                          <td className="py-2 px-1 print:py-1 text-xs print:text-[9px] border-r border-amber-200/80">
                            {isFlag ? "🚩" : "☕"}
                          </td>
                          <td colSpan={sortedKelas.length} className="py-2 px-2 print:py-1 font-black text-[11px] print:text-[8.5px] text-amber-950 uppercase tracking-wider text-center">
                            {item.label || item.tipe}
                          </td>
                        </tr>
                      )
                    }

                    const academicJp = academicJpMap.get(`${day}-${sIdx + 1}`) ?? sIdx + 1

                    return (
                      <tr key={sIdx} className="border-b border-slate-100 print:border-slate-200">
                        <td className="py-2 px-2 print:py-1 font-mono font-extrabold text-[10.5px] print:text-[8px] text-slate-800 border-r border-slate-100 print:border-slate-200 whitespace-nowrap">
                          {item.jamMulai}–{item.jamSelesai}
                        </td>
                        <td className="py-2 px-1 print:py-1 font-black text-xs print:text-[8.5px] text-slate-800 border-r border-slate-100 print:border-slate-200">
                          {academicJp}
                        </td>
                        {sortedKelas.map((c) => {
                          const entry = getEntry(c.id, day, sIdx + 1)
                          if (entry) {
                            const mapel = mapelMap.get(entry.mataPelajaranId)
                            const mapelCode = mapel?.kodeMapel || mapel?.namaMapel || "MAPEL"
                            const tCode = getKode(entry)
                            return (
                              <td key={c.id} className="py-1.5 px-1 print:py-0.5 print:px-0.5 border-r border-slate-100 print:border-slate-200 text-center align-middle">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <span className={`inline-block px-2 py-0.5 rounded-md ${dayStyle.headerBg} font-black text-[10px] print:text-[7.5px] leading-none uppercase tracking-wider shadow-2xs`}>
                                    {mapelCode}
                                  </span>
                                  {tCode && (
                                    <span className="text-[9.5px] print:text-[7px] font-bold text-slate-600 print:text-slate-800 font-mono leading-none">
                                      {tCode}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )
                          }
                          return (
                            <td key={c.id} className="py-1.5 px-1 print:py-0.5 print:px-0.5 border-r border-slate-100 print:border-slate-200 text-center align-middle text-slate-300 font-light text-xs print:text-[8px]">
                              —
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {renderLegend(legendMap)}
      {renderSignatures()}
    </div>
  )

  // ── Mode Per Kelas (Grid Kartu per Hari) ──
  const selectedClasses =
    cetakMode === "per-kelas" && selectedKelasId !== "semua"
      ? sortedKelas.filter((c) => c.id === selectedKelasId)
      : sortedKelas

  const renderPerKelas = () => (
    <div className="space-y-12 text-left">
      {selectedClasses.map((c, index) => {
        const usedCodes = new Set<string>()
        jadwalRecords.filter((j) => j.kelasId === c.id).forEach((j) => {
          const code = getKode(j)
          if (code) usedCodes.add(code)
        })
        const classLegendMap = legendMap.filter((item) => usedCodes.has(item.code))

        return (
          <div key={c.id} className={`${index < selectedClasses.length - 1 ? "break-after-page" : ""} avoid-break space-y-3 print:space-y-1.5 text-left`}>
            {renderKopHeader()}

            <div className="text-center mt-2 print:mt-0 mb-3 print:mb-1 space-y-1 print:space-y-0.5">
              <div>
                <span className="inline-block px-4 py-1 print:px-3 print:py-0.5 rounded-full bg-slate-100 print:bg-slate-200/80 border border-slate-200/80 text-slate-700 print:text-slate-900 font-extrabold text-xs print:text-[9px]">
                  {taLabel}
                </span>
              </div>
              <div>
                <span className="inline-block px-5 py-1.5 print:px-4 print:py-0.5 rounded-full bg-indigo-600 print:bg-indigo-700 text-white font-black text-xs print:text-[10px] uppercase tracking-wider shadow-xs">
                  KELAS: {kelasShort(c).toUpperCase()}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${aktifDays.length}, minmax(0, 1fr))`,
                gap: 8,
              }}
            >
              {aktifDays.map((day) => {
                const blocks = getBlocksForKelas(c.id, day)
                if (blocks.length === 0) return null
                const dayStyle = DAY_COLOR_STYLES[day] || DAY_COLOR_STYLES.senin

                return (
                  <div
                    key={day}
                    className="bg-white print:bg-white rounded-xl print:rounded-lg border border-slate-200 print:border-slate-300 overflow-hidden shadow-2xs flex flex-col justify-start"
                  >
                    <div className={`${dayStyle.headerBg} px-2 py-1.5 print:py-1 text-center font-black text-xs print:text-[9.5px] uppercase tracking-wider`}>
                      {DAY_LABEL[day].toUpperCase()}
                    </div>
                    <div className="p-2 print:p-1 space-y-1.5 print:space-y-1 flex-1">
                      {blocks.map((block, bIdx) => {
                        if (block.type === "AGENDA") {
                          return (
                            <div
                              key={bIdx}
                              className="bg-[#fef9c3] print:bg-[#fef08a] border border-amber-200/90 print:border-amber-300 rounded-lg p-1.5 print:p-1 text-center shadow-2xs"
                            >
                              <div className="text-[9.5px] print:text-[7.5px] font-mono font-bold text-amber-900 leading-tight">
                                {block.startTime}–{block.endTime}
                              </div>
                              <div className="text-[10.5px] print:text-[8px] font-black text-amber-950 uppercase tracking-wide mt-0.5 leading-tight">
                                {block.label}
                              </div>
                            </div>
                          )
                        }

                        if (block.type === "KBM") {
                          return (
                            <div
                              key={bIdx}
                              className="bg-white print:bg-white border border-slate-200 print:border-slate-300 rounded-lg p-2 print:p-1 shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] print:text-[7px] font-black ${dayStyle.jpBadgeBg} ${dayStyle.jpBadgeText} border ${dayStyle.jpBadgeBorder} leading-none`}>
                                  {block.jpLabel}
                                </span>
                                <span className="font-mono text-[9px] print:text-[7px] text-slate-500 font-bold leading-none">
                                  {block.startTime}–{block.endTime}
                                </span>
                              </div>
                              <div className="font-extrabold text-[11px] print:text-[8.5px] text-slate-900 leading-tight">
                                {block.mapelName}
                              </div>
                              <div className="text-[10px] print:text-[7.5px] font-medium text-slate-500 print:text-slate-700 leading-tight truncate">
                                {block.teacherName}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div key={bIdx} className="bg-slate-50/70 print:bg-slate-50 border border-dashed border-slate-200 print:border-slate-300 rounded-lg p-1.5 print:p-0.5 text-center">
                            <div className="flex items-center justify-between text-[8.5px] print:text-[6.5px] font-mono text-slate-400">
                              <span>{block.jpLabel}</span>
                              <span>
                                {block.startTime}–{block.endTime}
                              </span>
                            </div>
                            <div className="text-[9px] print:text-[7px] font-medium text-slate-300 italic mt-0.5">
                              — Kosong —
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {renderClassLegend(classLegendMap)}
            {renderSignatures()}

            {index < selectedClasses.length - 1 && (
              <hr className="my-6 border-dashed border-slate-300 print:hidden" />
            )}
          </div>
        )
      })}
    </div>
  )

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      className="cetak-jadwal-modal fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[9999] overflow-y-auto"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 10mm 12mm;
          }
          body {
            background-color: #fff !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          .cetak-jadwal-modal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .cetak-jadwal-modal .print-card {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .break-after-page {
            page-break-after: always !important;
            break-after: page !important;
          }
          .avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          th, td {
            border: 1px solid #000 !important;
            color: #000 !important;
            padding: 4px 6px !important;
          }
          th {
            background-color: #f1f5f9 !important;
            font-weight: 900 !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      ` }} />

      {isLoading ? (
        <div className="bg-white rounded-3xl w-full max-w-xl p-10 shadow-2xl relative border border-slate-100 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)] mx-auto" />
          <p className="mt-3 text-sm font-bold text-slate-600">Menyiapkan data jadwal...</p>
        </div>
      ) : (
        <div className="print-card bg-white rounded-3xl max-w-6xl w-full p-6 md:p-8 shadow-2xl relative border border-slate-100 text-left my-auto max-h-[95vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 print:p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all cursor-pointer print:hidden"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 mb-4 print:hidden gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                Pratinjau Cetak Jadwal Pelajaran
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Tinjau tampilan format cetak landscape. Semua kolom disesuaikan dinamis terhadap isinya.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black">
                Landscape OK
              </span>
              <span className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-100 rounded-lg text-[10px] font-black">
                Lebar Auto-Fit
              </span>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center font-bold px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-2" />
                <span>Mulai Cetak / Simpan PDF</span>
              </button>
            </div>
          </div>

          {/* Device Compatibility Notification */}
          <div className="lg:hidden flex items-start gap-2.5 p-4 bg-indigo-50/80 border border-indigo-100 rounded-2xl text-xs mb-5 print:hidden text-left">
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="text-indigo-900">
              <p className="font-extrabold text-[11px] uppercase tracking-wide">💡 Panduan Layar HP & Tablet:</p>
              <p className="mt-1 text-slate-600 leading-relaxed text-[10.5px]">
                Tabel roster KBM sekolah ini dirancang dengan format <strong>Landscape (Mendatar)</strong> lebar. Anda dapat mengusap (scroll) tabel ke arah kanan-kiri untuk melakukan pratinjau. Untuk hasil pencetakan fisik atau penyimpanan PDF dengan format sempurna, kami menyarankan untuk mengakses menu cetak ini melalui PC/Laptop.
              </p>
            </div>
          </div>

          {/* Print Options Control Panel */}
          <div className="bg-slate-50 border border-slate-100/70 rounded-2xl p-4 mb-6 print:hidden text-left">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5">
              Pengaturan Format Hasil Cetak:
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Tipe Cetak:</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setCetakMode("keseluruhan")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      cetakMode === "keseluruhan"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Cetak Keseluruhan (Master Roster)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCetakMode("per-kelas")}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      cetakMode === "per-kelas"
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Cetak Per Kelas
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">
                  Pilihan Kelas:
                </span>
                <Select
                  value={selectedKelasId}
                  onValueChange={(v) => v && setSelectedKelasId(v)}
                  disabled={cetakMode !== "per-kelas"}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua Kelas (Halaman Terpisah)</SelectItem>
                    {sortedKelas.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {formatKelasLabel(k)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Printable Area */}
          <div className="print-area bg-white p-2 print:p-0.5 text-slate-900 font-sans">
            {cetakMode === "keseluruhan" ? renderKeseluruhan() : renderPerKelas()}
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
