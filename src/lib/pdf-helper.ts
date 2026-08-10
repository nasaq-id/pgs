import type jsPDF from "jspdf"

export interface SekolahKopData {
  namaSekolah?: string | null
  logo?: string | null
  logoKiriKop?: string | null
  kopBaris1?: string | null
  kopBaris2?: string | null
  kopBaris3?: string | null
  kopBaris4?: string | null
  alamat?: string | null
  npsn?: string | null
  telepon?: string | null
  jenjang?: string | null
}

export function drawGlobalKop(doc: jsPDF, sekolahData: SekolahKopData | null | undefined) {
  const pageW = doc.internal.pageSize.getWidth()
  
  if (!sekolahData) return

  // 1. Logo Kiri (Custom Dinas / Kemenag logo)
  const leftLogoUrl = sekolahData.logoKiriKop
  if (leftLogoUrl) {
    try {
      doc.addImage(leftLogoUrl, "PNG", 14, 10, 18, 18)
    } catch (e) {
      console.error("Failed to render left logo (logoKiriKop) in PDF", e)
    }
  } else {
    // Default Tut Wuri / Kemenag based on jenjang
    const isKemenag = ["mi", "mts", "ma"].includes(sekolahData.jenjang || "")
    if (isKemenag) {
      doc.setFillColor(16, 124, 65) // Kemenag Green
      doc.ellipse(23, 19, 9, 9, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6.5)
      doc.text("IKHLAS", 23, 18, { align: "center" })
      doc.text("BERAMAL", 23, 21, { align: "center" })
    } else {
      doc.setFillColor(37, 99, 235) // Blue-600
      doc.ellipse(23, 19, 9, 9, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(6.5)
      doc.text("TUT WURI", 23, 18, { align: "center" })
      doc.text("HANDAYANI", 23, 21, { align: "center" })
    }
  }

  // 2. Logo Kanan (Institution Logo, autofetch from profile lembaga)
  if (sekolahData.logo) {
    try {
      doc.addImage(sekolahData.logo, "PNG", pageW - 32, 10, 18, 18)
    } catch (e) {
      console.error("Failed to render right school logo in PDF", e)
    }
  }

  // 3. Center Text
  const line1 = sekolahData.kopBaris1 || ""
  const line2 = sekolahData.kopBaris2 || ""
  const line3 = sekolahData.kopBaris3 || (sekolahData.namaSekolah || "SEKOLAH").toUpperCase()
  const line4 = sekolahData.kopBaris4 || sekolahData.alamat || "Alamat Sekolah"

  let currentY = 12

  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59) // slate-800

  if (line1) {
    doc.setFontSize(9)
    doc.text(line1.toUpperCase(), pageW / 2, currentY, { align: "center" })
    currentY += 4
  }
  if (line2) {
    doc.setFontSize(9)
    doc.text(line2.toUpperCase(), pageW / 2, currentY, { align: "center" })
    currentY += 4
  }
  
  doc.setFontSize(12)
  doc.text(line3.toUpperCase(), pageW / 2, currentY, { align: "center" })
  currentY += 4.5

  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105) // slate-600
  doc.setFontSize(8.5)
  doc.text(line4, pageW / 2, currentY, { align: "center" })

  // Double border line under kop
  doc.setLineWidth(0.8)
  doc.setDrawColor(30, 41, 59)
  doc.line(14, 29, pageW - 14, 29)
  
  doc.setLineWidth(0.2)
  doc.line(14, 30, pageW - 14, 30)
}
