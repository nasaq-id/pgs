"use client"

import { useRef, useState, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Printer, Loader2, Users, GraduationCap, Search, Phone } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { formatKelasLabel, formatTingkatLabel } from "@/components/jadwal/constants"

interface KelasDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kelasId: string
}

export default function KelasDetailDialog({ open, onOpenChange, kelasId }: KelasDetailDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { data: detail, isLoading } = api.kelas.getById.useQuery(
    { id: kelasId },
    { enabled: open && !!kelasId },
  )

  const filteredStudents = useMemo(() => {
    if (!detail?.students) return []
    if (!searchQuery.trim()) return detail.students
    const q = searchQuery.toLowerCase()
    return detail.students.filter(
      (s) =>
        s.namaLengkap.toLowerCase().includes(q) ||
        (s.nisn && s.nisn.includes(q)) ||
        (s.nisLokal && s.nisLokal.includes(q)),
    )
  }, [detail?.students, searchQuery])

  const percent = useMemo(() => {
    if (!detail) return 0
    const count = detail.students?.length || 0
    const max = detail.kapasitas || 1
    return Math.min(100, Math.round((count / max) * 100))
  }, [detail])

  const handlePrint = () => {
    if (!detail) return
    const win = window.open("", "_blank")
    if (!win) return

    const logoHtml = detail.sekolah?.logo
      ? `<img src="${detail.sekolah.logo}" alt="Logo" class="logo" />`
      : `<div class="logo-placeholder">🏫</div>`

    const rows = filteredStudents
      .map(
        (s, i) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${s.nisn || "-"}</td>
        <td>${s.nisLokal || "-"}</td>
        <td class="bold">${s.namaLengkap}</td>
        <td class="center">${s.jenisKelamin || "-"}</td>
        <td class="center">${s.status ? s.status.toUpperCase() : "AKTIF"}</td>
        <td>${s.noHpWhatsapp || s.noHpOrtu || "-"}</td>
      </tr>
    `,
      )
      .join("")

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Daftar Kelas - ${formatKelasLabel(detail)}</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 30px;
            color: #333;
          }
          .header {
            display: flex;
            align-items: center;
            border-bottom: 3px double #333;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .logo {
            width: 70px;
            height: 70px;
            object-fit: contain;
            margin-right: 20px;
          }
          .logo-placeholder {
            font-size: 50px;
            margin-right: 20px;
          }
          .title-area h2 {
            margin: 0;
            font-size: 20px;
            text-transform: uppercase;
          }
          .title-area p {
            margin: 3px 0 0 0;
            font-size: 12px;
            color: #666;
          }
          .info-box {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            font-size: 13px;
          }
          .info-item {
            display: flex;
            flex-direction: column;
          }
          .info-item span:first-child {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: bold;
          }
          .info-item span:last-child {
            font-weight: 600;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 11px;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .footer {
            margin-top: 40px;
            text-align: right;
            font-size: 12px;
            color: #666;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${logoHtml}
          <div class="title-area">
            <h2>${detail.sekolah?.namaSekolah || "LEMBAGA PENDIDIKAN"}</h2>
            <p>${detail.sekolah?.alamat || ""}</p>
          </div>
        </div>

        <h3 style="text-align: center; margin-bottom: 20px; font-size: 16px;">DAFTAR ROMBONGAN BELAJAR: ${formatKelasLabel(detail).toUpperCase()}</h3>

        <div class="info-box">
          <div class="info-item">
            <span>Tingkatan</span>
            <span>${formatTingkatLabel(detail.tingkat)}</span>
          </div>
          <div class="info-item">
            <span>Wali Kelas</span>
            <span>${detail.waliKelas?.namaLengkap || "Belum ditentukan"}</span>
          </div>
          <div class="info-item">
            <span>Kapasitas Rombel</span>
            <span>${detail.students?.length || 0} / ${detail.kapasitas || "-"} Siswa</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center" style="width: 40px;">No</th>
              <th style="width: 120px;">NISN</th>
              <th style="width: 100px;">NIS Lokal</th>
              <th>Nama Lengkap</th>
              <th class="center" style="width: 60px;">JK</th>
              <th class="center" style="width: 80px;">Status</th>
              <th>No HP Ortu</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" class="center">Belum ada siswa di kelas ini</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Dicetak pada: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
        <DialogHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500/20 to-emerald-500/20 dark:from-teal-500/10 dark:to-emerald-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <GraduationCap className="h-6 w-6 stroke-[1.5]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {detail ? formatKelasLabel(detail) : "Memuat detail..."}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Informasi lengkap dan daftar siswa rombongan belajar
                </DialogDescription>
              </div>
            </div>
            {detail && (
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="gap-2 rounded-xl h-9 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Cetak Roster
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            <p className="text-xs text-muted-foreground font-semibold">Mengambil data dari server...</p>
          </div>
        ) : !detail ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Data rombel tidak ditemukan.
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Tingkatan Rombel</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {formatTingkatLabel(detail.tingkat)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Wali Kelas</span>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-teal-500" />
                  {detail.waliKelas?.namaLengkap || "Belum Ditentukan"}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Kapasitas & Okupansi</span>
                <div className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>{detail.students?.length || 0} / {detail.kapasitas || "-"}</span>
                  <span className="text-[11px] text-teal-600 dark:text-teal-400">{percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Students List Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-500" />
                  Daftar Anggota Kelas ({detail.students?.length || 0} Siswa)
                </h4>
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Cari anggota kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  {searchQuery ? "Tidak ditemukan anggota kelas yang cocok" : "Belum ada siswa yang dimasukkan ke kelas ini"}
                </div>
              ) : (
                <div className="border border-border/60 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>NISN</TableHead>
                        <TableHead>L/P</TableHead>
                        <TableHead>Kontak Ortu</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s, idx) => (
                        <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                          <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
                            {s.namaLengkap}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.nisn || "-"}</TableCell>
                          <TableCell className="text-xs">{s.jenisKelamin || "-"}</TableCell>
                          <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {s.noHpWhatsapp || s.noHpOrtu || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                s.status === "aktif" || !s.status
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-500/10 dark:bg-emerald-950/20 dark:text-emerald-400 text-[10px] font-bold"
                                  : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 text-[10px] font-bold"
                              }
                            >
                              {s.status || "aktif"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
