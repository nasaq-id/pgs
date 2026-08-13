import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface MapelRecord {
  id: string
  namaMapel: string
  kodeMapel: string | null
  kelompok: string | null
  jumlahJam: number
  aktif: boolean
  urutan?: number | null
  pengampu?: {
    guru: { namaLengkap: string } | null
  }[]
}

interface KelasRecord {
  id: string
  namaKelas: string
  tingkat: string | null
}

const KELOMPOK_LABEL: Record<string, string> = {
  A: "Mapel Wajib",
  B: "Mapel Pilihan",
  C: "Mapel Pilihan",
  muatan_lokal: "Muatan Lokal",
}

export function formatTeacherNames(pengampu: any[] | undefined): string {
  if (!pengampu || pengampu.length === 0) return "Belum Ditunjuk"
  const names = pengampu.map((p) => p.guru?.namaLengkap).filter(Boolean)
  const uniqueNames = Array.from(new Set(names))
  return uniqueNames.length > 0 ? uniqueNames.join(", ") : "Belum Ditunjuk"
}

const REGULATION_KEYWORD_RANKS: { keywords: string[]; rank: number }[] = [
  { keywords: ["qur'an", "quran", "hadis", "hadits"], rank: 1 },
  { keywords: ["akidah", "aqidah", "akhlak"], rank: 2 },
  { keywords: ["fikih", "fiqih"], rank: 3 },
  { keywords: ["sejarah kebudayaan islam", "ski", "pai", "pendidikan agama"], rank: 4 },
  { keywords: ["pancasila", "pkn", "ppkn", "kewarganegaraan"], rank: 5 },
  { keywords: ["bahasa indonesia", "b. indonesia", "b.indo", "b indonesia"], rank: 6 },
  { keywords: ["bahasa arab", "b. arab", "b arab"], rank: 7 },
  { keywords: ["matematika", "mtk"], rank: 8 },
  { keywords: ["ilmu pengetahuan alam", "ipa", "fisika", "kimia", "biologi"], rank: 9 },
  { keywords: ["ilmu pengetahuan sosial", "ips", "geografi", "sosiologi", "ekonomi", "sejarah"], rank: 10 },
  { keywords: ["bahasa inggris", "b. inggris", "b.ing", "b inggris"], rank: 11 },
  { keywords: ["jasmani", "olahraga", "kesehatan", "pjok", "penjas"], rank: 12 },
  { keywords: ["informatika", "tik", "komputer"], rank: 13 },
  { keywords: ["seni", "budaya", "seni rupa", "seni musik", "seni tari", "seni teater"], rank: 14 },
  { keywords: ["prakarya", "keterampilan", "vokasi", "pilihan"], rank: 15 },
  { keywords: ["sunda", "jawa", "madura", "bali", "bahasa daerah", "mulok"], rank: 16 },
  { keywords: ["tahfidz", "kitab", "keagamaan", "kemuhammadiyahan", "ke-nu-an", "nu"], rank: 17 },
  { keywords: ["riset", "penelitian"], rank: 18 }
]

function getSubjectRankScore(sub: MapelRecord): number {
  const nameLower = (sub.namaMapel || "").toLowerCase()
  const codeLower = (sub.kodeMapel || "").toLowerCase()
  
  for (const item of REGULATION_KEYWORD_RANKS) {
    if (item.keywords.some(kw => nameLower.includes(kw) || codeLower.includes(kw))) {
      return item.rank
    }
  }
  return 99
}

export function sortSubjectsByRegulation(subjects: MapelRecord[]): MapelRecord[] {
  const list = [...subjects]
  
  const categoryOrder: Record<string, number> = {
    "Mapel Wajib": 1,
    "Mapel Pilihan": 2,
    "Muatan Lokal": 3
  }

  return list.sort((a, b) => {
    const catA = categoryOrder[KELOMPOK_LABEL[a.kelompok || "A"] || "Mapel Wajib"] || 1
    const catB = categoryOrder[KELOMPOK_LABEL[b.kelompok || "A"] || "Mapel Wajib"] || 1

    if (catA !== catB) return catA - catB

    const rankA = getSubjectRankScore(a)
    const rankB = getSubjectRankScore(b)

    if (rankA !== rankB) return rankA - rankB

    if (a.urutan !== null && b.urutan !== null && a.urutan !== undefined && b.urutan !== undefined) {
      return a.urutan - b.urutan
    }

    return (a.kodeMapel || a.namaMapel).localeCompare(b.kodeMapel || b.namaMapel)
  })
}

export function getUniqueTingkatList(classes: KelasRecord[]): string[] {
  const tingkatSet = new Set<string>()
  ;(classes || []).forEach((c) => {
    if (c.tingkat) {
      tingkatSet.add(c.tingkat.trim())
    }
  })
  const list = Array.from(tingkatSet)
  if (list.length === 0) return ["VII", "VIII", "IX"]

  const romanRank: Record<string, number> = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6,
    "VII": 7, "VIII": 8, "IX": 9,
    "X": 10, "XI": 11, "XII": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
    "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12
  }

  return list.sort((a, b) => (romanRank[a] || 99) - (romanRank[b] || 99))
}

export function isSubjectInTingkat(sub: MapelRecord, targetTingkat: string, classes: KelasRecord[]): boolean {
  if (targetTingkat === "Semua") return true
  if (!sub.pengampu || sub.pengampu.length === 0) return false
  return sub.pengampu.some((p: any) => p.kelas?.tingkat === targetTingkat)
}

export function filterSubjectsByTingkat(subjects: MapelRecord[], targetTingkat: string, classes: KelasRecord[]): MapelRecord[] {
  if (targetTingkat === "Semua") return subjects
  return subjects.filter(sub => isSubjectInTingkat(sub, targetTingkat, classes))
}

export function getInstInfo(institution?: any) {
  const name = (institution?.namaSekolah || "LEMBAGA PENDIDIKAN").toUpperCase()
  const organizer = (institution?.yayasan || "").toUpperCase()
  const address = institution?.alamat || "Alamat Lembaga Pendidikan"
  const npsnNsm = institution?.npsn ? `NPSN: ${institution.npsn}` : ""
  const email = institution?.email ? `Email: ${institution.email}` : ""
  const phone = institution?.telepon ? `Telp: ${institution.telepon}` : ""
  const contactInfo = [npsnNsm, email, phone].filter(Boolean).join(" | ")
  const principal = institution?.kepalaSekolah || "Kepala Lembaga, M.Pd."
  const nip = institution?.nip ? `NIP. ${institution.nip}` : "NIP. -"
  const academicYear = institution?.tahunAjaran || "2025/2026"
  const semester = institution?.semester || "GANJIL"

  return { name, organizer, address, contactInfo, principal, nip, academicYear, semester }
}

export function exportSubjectsToExcel({
  subjects,
  classes,
  institution,
  selectedTingkat = "Semua"
}: {
  subjects: MapelRecord[]
  classes: KelasRecord[]
  institution: any
  selectedTingkat?: string
}) {
  const wb = XLSX.utils.book_new()
  const allTingkatList = getUniqueTingkatList(classes)

  const sheetsToGenerate: { sheetName: string; targetTingkat: string }[] = [
    { sheetName: "Semua Tingkat", targetTingkat: "Semua" }
  ]

  allTingkatList.forEach(t => {
    const label = t.toLowerCase().startsWith("kelas") ? t : `Kelas ${t}`
    sheetsToGenerate.push({ sheetName: label, targetTingkat: t })
  })

  const inst = getInstInfo(institution)

  sheetsToGenerate.forEach(({ sheetName, targetTingkat }) => {
    const filtered = filterSubjectsByTingkat(subjects, targetTingkat, classes)
    const sorted = sortSubjectsByRegulation(filtered)
    const isAllTingkat = targetTingkat === "Semua"

    const sheetData: any[][] = []

    if (inst.organizer) {
      sheetData.push([inst.organizer])
    }
    sheetData.push([inst.name])
    sheetData.push([inst.address])
    sheetData.push([inst.contactInfo])
    sheetData.push(["========================================================================"])
    sheetData.push([""])

    sheetData.push(["STRUKTUR KURIKULUM & PROGRAM MATA PELAJARAN"])
    sheetData.push([
      `Tingkat / Target: ${targetTingkat === "Semua" ? "Semua Tingkat" : `Kelas ${targetTingkat}`}   |   Tahun Akademik: ${inst.academicYear}`
    ])
    sheetData.push([""])

    const tableHeaders = isAllTingkat
      ? ["NO", "KODE MAPEL", "NAMA MATA PELAJARAN", ...allTingkatList.map(t => (t.toLowerCase().startsWith("kelas") ? t : `KELAS ${t}`).toUpperCase()), "TOTAL JP", "GURU PENGAMPU"]
      : ["NO", "KODE MAPEL", "NAMA MATA PELAJARAN", "BEBAN (JP)", "GURU PENGAMPU"]
    
    sheetData.push(tableHeaders)
    const totalCols = tableHeaders.length

    const categories = ["Mapel Wajib", "Mapel Pilihan", "Muatan Lokal"]
    let globalNo = 1

    categories.forEach(cat => {
      const catMapel = sorted.filter(s => KELOMPOK_LABEL[s.kelompok || "A"] === cat)
      if (catMapel.length > 0) {
        sheetData.push(["", "", `>>> ${cat.toUpperCase()} (${catMapel.length} Mapel) <<<`])

        catMapel.forEach(sub => {
          if (isAllTingkat) {
            const tJps = allTingkatList.map(t => isSubjectInTingkat(sub, t, classes) ? `${sub.jumlahJam || 0} JP` : "-")
            const activeCount = allTingkatList.filter(t => isSubjectInTingkat(sub, t, classes)).length
            const subTotalJP = activeCount * (sub.jumlahJam || 0)

            sheetData.push([
              globalNo++,
              sub.kodeMapel || "-",
              sub.namaMapel || "-",
              ...tJps,
              `${subTotalJP} JP`,
              formatTeacherNames(sub.pengampu)
            ])
          } else {
            sheetData.push([
              globalNo++,
              sub.kodeMapel || "-",
              sub.namaMapel || "-",
              `${sub.jumlahJam || 0} JP`,
              formatTeacherNames(sub.pengampu)
            ])
          }
        })
      }
    })

    if (isAllTingkat) {
      const tTotals = allTingkatList.map(t => {
        return sorted.reduce((sum, s) => sum + (isSubjectInTingkat(s, t, classes) ? (s.jumlahJam || 0) : 0), 0)
      })
      const grandTotalJP = tTotals.reduce((a, b) => a + b, 0)

      sheetData.push([
        "", "", "TOTAL BEBAN MENGAJAR",
        ...tTotals.map(tot => `${tot} JP`),
        `${grandTotalJP} JP`,
        `${sorted.length} Mapel`
      ])
    } else {
      const totalJP = sorted.reduce((sum, s) => sum + (s.jumlahJam || 0), 0)
      sheetData.push(["", "", "TOTAL BEBAN MENGAJAR", `${totalJP} JP`, `${sorted.length} Mapel`])
    }

    sheetData.push([""])

    const lastColIdx = totalCols - 1
    const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    const signRow1 = Array(totalCols).fill("")
    signRow1[Math.max(0, lastColIdx - 1)] = "Ditetapkan di: Lembaga"
    const signRow2 = Array(totalCols).fill("")
    signRow2[Math.max(0, lastColIdx - 1)] = `Pada Tanggal: ${todayStr}`
    const signRow3 = Array(totalCols).fill("")
    signRow3[Math.max(0, lastColIdx - 1)] = `Kepala ${inst.name}`
    const signRow4 = Array(totalCols).fill("")
    signRow4[Math.max(0, lastColIdx - 1)] = inst.principal
    const signRow5 = Array(totalCols).fill("")
    signRow5[Math.max(0, lastColIdx - 1)] = inst.nip

    sheetData.push(signRow1, signRow2, signRow3, [""], [""], signRow4, signRow5)

    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    const cleanSheetName = sheetName.replace(/[:\\/?*\[\]]/g, "").slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, cleanSheetName)
  })

  XLSX.writeFile(wb, `Program_Mata_Pelajaran_${inst.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`)
}

export function exportSubjectsToPdf({
  subjects,
  classes,
  institution,
  selectedTingkat = "Semua"
}: {
  subjects: MapelRecord[]
  classes: KelasRecord[]
  institution: any
  selectedTingkat?: string
}) {
  const filtered = filterSubjectsByTingkat(subjects, selectedTingkat, classes)
  const sorted = sortSubjectsByRegulation(filtered)
  const inst = getInstInfo(institution)
  const allTingkatList = getUniqueTingkatList(classes)
  const isLandscape = selectedTingkat === "Semua"

  const doc = new jsPDF({ orientation: isLandscape ? "landscape" : "portrait", unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()

  let startY = 15

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  if (inst.organizer) {
    doc.text(inst.organizer, pageWidth / 2, startY, { align: "center" })
    startY += 5
  }

  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(inst.name, pageWidth / 2, startY, { align: "center" })
  startY += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text(inst.address, pageWidth / 2, startY, { align: "center" })
  startY += 4

  if (inst.contactInfo) {
    doc.text(inst.contactInfo, pageWidth / 2, startY, { align: "center" })
    startY += 4
  }

  doc.setLineWidth(0.8)
  doc.setDrawColor(15, 23, 42)
  doc.line(14, startY, pageWidth - 14, startY)
  doc.setLineWidth(0.2)
  doc.line(14, startY + 1, pageWidth - 14, startY + 1)

  startY += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(13, 148, 136)
  doc.text("PROGRAM & STRUKTUR MATA PELAJARAN", pageWidth / 2, startY, { align: "center" })
  startY += 5

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(51, 65, 85)
  doc.text(
    `Tingkat Target: ${selectedTingkat === "Semua" ? "Semua Tingkat / Umum" : `Kelas ${selectedTingkat}`}   |   Tahun Akademik: ${inst.academicYear}`,
    pageWidth / 2,
    startY,
    { align: "center" }
  )
  startY += 7

  const tableRows: any[] = []
  let no = 1

  const categories = ["Mapel Wajib", "Mapel Pilihan", "Muatan Lokal"]
  const numCols = isLandscape ? 3 + allTingkatList.length + 2 : 5

  categories.forEach(cat => {
    const catMapel = sorted.filter(s => KELOMPOK_LABEL[s.kelompok || "A"] === cat)
    if (catMapel.length > 0) {
      tableRows.push([
        { content: `${cat.toUpperCase()} (${catMapel.length} Mapel)`, colSpan: numCols, styles: { fillColor: [241, 245, 249], fontStyle: "bold", textColor: [15, 118, 110] } }
      ])

      catMapel.forEach(sub => {
        if (isLandscape) {
          const tJps = allTingkatList.map(t => isSubjectInTingkat(sub, t, classes) ? `${sub.jumlahJam || 0} JP` : "-")
          const activeCount = allTingkatList.filter(t => isSubjectInTingkat(sub, t, classes)).length
          const totalSubJP = activeCount * (sub.jumlahJam || 0)

          tableRows.push([
            no++,
            sub.kodeMapel || "-",
            sub.namaMapel || "-",
            ...tJps,
            `${totalSubJP} JP`,
            formatTeacherNames(sub.pengampu)
          ])
        } else {
          tableRows.push([
            no++,
            sub.kodeMapel || "-",
            sub.namaMapel || "-",
            `${sub.jumlahJam || 0} JP`,
            formatTeacherNames(sub.pengampu)
          ])
        }
      })
    }
  })

  if (isLandscape) {
    const tTotals = allTingkatList.map(t => {
      return sorted.reduce((sum, s) => sum + (isSubjectInTingkat(s, t, classes) ? (s.jumlahJam || 0) : 0), 0)
    })
    const grandTotalJP = tTotals.reduce((a, b) => a + b, 0)

    tableRows.push([
      { content: "TOTAL BEBAN MENGAJAR", colSpan: 3, styles: { halign: "right", fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } },
      ...tTotals.map(tot => ({ content: `${tot} JP`, styles: { halign: "center", fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } })),
      { content: `${grandTotalJP} JP`, styles: { halign: "center", fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } },
      { content: `${sorted.length} Mapel`, styles: { fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } }
    ])
  } else {
    const totalJP = sorted.reduce((sum, s) => sum + (s.jumlahJam || 0), 0)
    tableRows.push([
      { content: "TOTAL BEBAN MENGAJAR", colSpan: 3, styles: { halign: "right", fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } },
      { content: `${totalJP} JP`, styles: { fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } },
      { content: `${sorted.length} Mapel`, styles: { fontStyle: "bold", fillColor: [204, 251, 241], textColor: [17, 94, 89] } }
    ])
  }

  const tableHead = isLandscape
    ? [["No", "Kode", "Nama Mata Pelajaran", ...allTingkatList.map(t => t.toLowerCase().startsWith("kelas") ? t : `Kelas ${t}`), "Total JP", "Guru Pengampu"]]
    : [["No", "Kode", "Nama Mata Pelajaran", "Beban", "Guru Pengampu"]]

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 10, halign: "center" },
    1: { cellWidth: 22, halign: "center" },
    2: { cellWidth: isLandscape ? 85 : 80, halign: "left" }
  }

  if (isLandscape) {
    allTingkatList.forEach((_, idx) => {
      columnStyles[3 + idx] = { cellWidth: 20, halign: "center" }
    })
    const totalColIdx = 3 + allTingkatList.length
    const teacherColIdx = totalColIdx + 1
    columnStyles[totalColIdx] = { cellWidth: 22, halign: "center" }
    columnStyles[teacherColIdx] = { cellWidth: "auto", halign: "left" }
  } else {
    columnStyles[3] = { cellWidth: 20, halign: "center" }
    columnStyles[4] = { cellWidth: "auto", halign: "left" }
  }

  autoTable(doc, {
    startY: startY,
    head: tableHead,
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      halign: "center"
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59]
    },
    columnStyles: columnStyles,
    margin: { left: 14, right: 14 }
  })

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : startY + 50
  const signatureX = pageWidth - 70

  if (finalY + 35 < doc.internal.pageSize.getHeight()) {
    const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "normal")
    doc.text(`Ditetapkan di: Lembaga`, signatureX, finalY)
    doc.text(`Pada Tanggal: ${todayStr}`, signatureX, finalY + 4)
    doc.text(`Kepala ${inst.name}`, signatureX, finalY + 8)

    doc.setFont("helvetica", "bold")
    doc.text(inst.principal, signatureX, finalY + 28)
    doc.setFont("helvetica", "normal")
    doc.text(inst.nip, signatureX, finalY + 32)
  }

  doc.save(`Program_Mata_Pelajaran_${inst.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`)
}
