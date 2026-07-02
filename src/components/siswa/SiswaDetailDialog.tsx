"use client"

import { useRef, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { User, Printer, Loader2, UserRound, Users, Home, CreditCard } from "lucide-react"
import { api } from "@/lib/trpc/client"

interface SiswaDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  siswaId: string
}

function fmt(date?: Date | string | null) {
  if (!date) return "-"
  try {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return String(date)
  }
}

function DataRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0 text-sm">
      <span className="w-40 flex-shrink-0 text-muted-foreground text-xs leading-5">{label}</span>
      <span className="flex-1 font-medium text-xs leading-5">{value ?? "-"}</span>
    </div>
  )
}

function SectionBlock({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div className={`px-4 py-2 ${color}`}>
        <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

const tabs = [
  { id: "pribadi", label: "Data Pribadi", icon: UserRound },
  { id: "ortu", label: "Orang Tua", icon: Users },
  { id: "wali", label: "Wali & Tinggal", icon: Home },
  { id: "kk", label: "Kartu Keluarga", icon: CreditCard },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function SiswaDetailDialog({ open, onOpenChange, siswaId }: SiswaDetailDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>("pribadi")
  const { data: siswa, isLoading } = api.siswa.getById.useQuery(
    { id: siswaId },
    { enabled: open && !!siswaId },
  )

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content) return
    const win = window.open("", "_blank")
    if (!win) return
    const s = siswa
    if (!s) return

    const row = (label: string, val: any) =>
      `<div class="row"><span class="rl">${label}</span><span class="rv">${val || "-"}</span></div>`
    const sec = (title: string, cls: string, rows: string) =>
      `<div class="sec"><div class="sh ${cls}">${title}</div><div class="sb">${rows}</div></div>`

    win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Buku Induk - ${s.namaLengkap || ""}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a1a;padding:20px;font-size:11px}
  .hero{display:flex;gap:16px;align-items:center;padding:16px;background:linear-gradient(135deg,#10b981,#059669);color:white;border-radius:12px;margin-bottom:16px}
  .photo{width:72px;height:90px;border-radius:8px;border:2px solid rgba(255,255,255,0.5);overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .photo img{width:100%;height:100%;object-fit:cover}
  .hi h2{font-size:17px;font-weight:700}
  .hi p{font-size:11px;opacity:.85;margin-top:3px}
  .badges{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
  .badge{padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600}
  .b-green{background:#dcfce7;color:#166534}
  .b-blue{background:#dbeafe;color:#1e40af}
  .b-gray{background:#f1f5f9;color:#475569}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  .sec{border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:12px}
  .sh{padding:6px 12px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}
  .s-green{background:#dcfce7;color:#065f46}
  .s-blue{background:#dbeafe;color:#1e40af}
  .s-purple{background:#ede9fe;color:#5b21b6}
  .s-orange{background:#ffedd5;color:#9a3412}
  .s-rose{background:#ffe4e6;color:#9f1239}
  .s-cyan{background:#cffafe;color:#164e63}
  .sb{padding:6px 12px}
  .row{display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f8fafc;font-size:10.5px}
  .row:last-child{border-bottom:none}
  .rl{width:140px;flex-shrink:0;color:#64748b}
  .rv{font-weight:500;flex:1}
  @media print{body{padding:10px}}
</style></head><body>
<div class="hero">
  <div class="photo">${s.foto ? `<img src="${s.foto}"/>` : '<span style="font-size:28px;color:rgba(255,255,255,.7)">&#x1F464;</span>'}</div>
  <div class="hi">
    <h2>${s.namaLengkap || "-"}</h2>
    <p>NISN: ${s.nisn || "-"} ${s.kelas?.namaKelas ? `| ${s.kelas.namaKelas}` : ""}</p>
    <div class="badges">
      ${s.status ? `<span class="badge b-green">${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</span>` : ""}
      ${s.jenisKelamin ? `<span class="badge b-blue">${s.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}</span>` : ""}
      ${s.agama ? `<span class="badge b-gray">${s.agama}</span>` : ""}
    </div>
  </div>
</div>
<div class="grid2">
  <div>
    ${sec("A. Data Pribadi Siswa", "s-green", [
      row("NISN", s.nisn), row("NIS Lokal", s.nisLokal), row("NIK", s.nik),
      row("Kewarganegaraan", s.kewarganegaraan), row("Tempat Lahir", s.tempatLahir),
      row("Tanggal Lahir", fmt(s.tanggalLahir)), row("Agama", s.agama),
      row("Jenis Kelamin", s.jenisKelamin === "L" ? "Laki-laki" : s.jenisKelamin === "P" ? "Perempuan" : ""),
      row("Cita-cita", s.citacita), row("Hobi", s.hobi),
      row("Jumlah Saudara", s.jumlahSaudara?.toString()), row("Anak Ke", s.anakKe?.toString()),
      row("No HP/WA", s.noHpWhatsapp || s.noHpOrtu), row("Email", s.emailSiswa),
      row("Pembiayaan Sekolah", s.pembiayaanSekolah), row("Alamat", s.alamat),
      row("Sekolah Asal", s.sekolahAsal), row("Diterima Tanggal", fmt(s.diterimaPadaTanggal)),
      row("Status", s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : ""),
    ].join(""))}
    ${sec("B. Data Wali", "s-cyan", [
      row("Status Wali", s.statusWali), row("Nama Wali", s.namaWali),
      row("NIK", s.nikWali), row("Tempat Lahir", s.tempatLahirWali),
      row("Tanggal Lahir", fmt(s.tanggalLahirWali)),
      row("Pendidikan", s.pendidikanWali), row("Pekerjaan", s.pekerjaanWali),
      row("Penghasilan", s.penghasilanWali), row("No HP", s.noHpWali),
    ].join(""))}
    ${sec("C. Tempat Tinggal", "s-orange", [
      row("Status Tinggal", s.statusTempatTinggalSiswa),
      row("Jarak ke Sekolah", s.jarakTempatTinggalKeSekolah),
      row("Transportasi", s.transportasiKeSekolah),
      row("Waktu Tempuh", s.waktuTempuhKeSekolah),
    ].join(""))}
  </div>
  <div>
    ${sec("D. Ayah Kandung", "s-blue", [
      row("Nama Ayah", s.namaAyah), row("Status", s.statusAyah),
      row("NIK", s.nikAyah), row("Kewarganegaraan", s.kewarganegaraanAyah),
      row("Tempat Lahir", s.tempatLahirAyah), row("Tanggal Lahir", fmt(s.tanggalLahirAyah)),
      row("Pendidikan", s.pendidikanAyah), row("Pekerjaan", s.pekerjaanAyah),
      row("Penghasilan", s.penghasilanAyah), row("No HP", s.noHpAyah),
      row("Alamat", s.alamatLengkapAyah),
    ].join(""))}
    ${sec("E. Ibu Kandung", "s-rose", [
      row("Nama Ibu", s.namaIbu), row("Status", s.statusIbu),
      row("NIK", s.nikIbu), row("Kewarganegaraan", s.kewarganegaraanIbu),
      row("Tempat Lahir", s.tempatLahirIbu), row("Tanggal Lahir", fmt(s.tanggalLahirIbu)),
      row("Pendidikan", s.pendidikanIbu), row("Pekerjaan", s.pekerjaanIbu),
      row("Penghasilan", s.penghasilanIbu), row("No HP", s.noHpIbu),
      row("Alamat", s.alamatLengkapIbu),
    ].join(""))}
    ${sec("F. Kartu Keluarga", "s-purple", [
      row("No Kartu Keluarga", s.noKartuKeluarga),
      row("Nama Kepala Keluarga", s.namaKepalaKeluarga),
    ].join(""))}
  </div>
</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Detail Siswa</DialogTitle>
            {siswa && (
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Cetak PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !siswa ? (
          <p className="text-center py-8 text-muted-foreground">Data tidak ditemukan</p>
        ) : (
          <div ref={printRef} className="space-y-4 pb-2">
            <div className="flex items-center gap-5 p-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <div className="w-20 h-24 rounded-xl border-2 border-white/40 overflow-hidden glass-subtle flex items-center justify-center flex-shrink-0">
                {siswa.foto ? (
                  <img src={siswa.foto} alt={siswa.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-white/60" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold">{siswa.namaLengkap || "-"}</h3>
                <p className="text-emerald-100 text-sm mt-0.5">
                  NISN: {siswa.nisn || "-"} {siswa.kelas?.namaKelas ? `· ${siswa.kelas.namaKelas}` : ""}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <Badge className={`text-xs ${siswa.status === "aktif" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"}`}>
                    {siswa.status ? siswa.status.charAt(0).toUpperCase() + siswa.status.slice(1) : "-"}
                  </Badge>
                  {siswa.jenisKelamin && (
                    <Badge className="text-xs bg-blue-100 text-blue-800">
                      {siswa.jenisKelamin === "L" ? "Laki-laki" : "Perempuan"}
                    </Badge>
                  )}
                  {siswa.agama && <Badge className="text-xs glass-subtle text-white">{siswa.agama}</Badge>}
                </div>
              </div>
            </div>

            <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold
                      transition-all duration-200 cursor-pointer
                      ${isActive
                        ? "bg-white dark:bg-neutral-800 shadow-sm text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800"
                        : "text-muted-foreground hover:bg-white/50 dark:hover:bg-neutral-800/50 hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {activeTab === "pribadi" && (
              <div className="space-y-4">
                <SectionBlock title="A. Data Pribadi Siswa" color="bg-emerald-50 text-emerald-800">
                  <DataRow label="NISN" value={siswa.nisn} />
                  <DataRow label="NIS Lokal" value={siswa.nisLokal} />
                  <DataRow label="NIK" value={siswa.nik} />
                  <DataRow label="Kewarganegaraan" value={siswa.kewarganegaraan} />
                  <DataRow label="Tempat Lahir" value={siswa.tempatLahir} />
                  <DataRow label="Tanggal Lahir" value={fmt(siswa.tanggalLahir)} />
                  <DataRow label="Agama" value={siswa.agama} />
                  <DataRow label="Jenis Kelamin" value={siswa.jenisKelamin === "L" ? "Laki-laki" : siswa.jenisKelamin === "P" ? "Perempuan" : "-"} />
                  <DataRow label="Cita-cita" value={siswa.citacita} />
                  <DataRow label="Hobi" value={siswa.hobi} />
                  <DataRow label="Jumlah Saudara" value={siswa.jumlahSaudara?.toString()} />
                  <DataRow label="Anak Ke" value={siswa.anakKe?.toString()} />
                  <DataRow label="No HP/WA" value={siswa.noHpWhatsapp || siswa.noHpOrtu} />
                  <DataRow label="Email" value={siswa.emailSiswa} />
                  <DataRow label="Pembiayaan Sekolah" value={siswa.pembiayaanSekolah} />
                  <DataRow label="Alamat" value={siswa.alamat} />
                  <DataRow label="Sekolah Asal" value={siswa.sekolahAsal} />
                  <DataRow label="Diterima Tanggal" value={fmt(siswa.diterimaPadaTanggal)} />
                </SectionBlock>
              </div>
            )}

            {activeTab === "ortu" && (
              <div className="grid grid-cols-2 gap-4">
                <SectionBlock title="D. Ayah Kandung" color="bg-blue-50 text-blue-800">
                  <DataRow label="Nama Ayah" value={siswa.namaAyah} />
                  <DataRow label="Status" value={siswa.statusAyah} />
                  <DataRow label="NIK" value={siswa.nikAyah} />
                  <DataRow label="Kewarganegaraan" value={siswa.kewarganegaraanAyah} />
                  <DataRow label="Tempat Lahir" value={siswa.tempatLahirAyah} />
                  <DataRow label="Tanggal Lahir" value={fmt(siswa.tanggalLahirAyah)} />
                  <DataRow label="Pendidikan" value={siswa.pendidikanAyah} />
                  <DataRow label="Pekerjaan" value={siswa.pekerjaanAyah} />
                  <DataRow label="Penghasilan" value={siswa.penghasilanAyah} />
                  <DataRow label="No HP" value={siswa.noHpAyah} />
                  <DataRow label="Alamat" value={siswa.alamatLengkapAyah} />
                </SectionBlock>

                <SectionBlock title="E. Ibu Kandung" color="bg-rose-50 text-rose-800">
                  <DataRow label="Nama Ibu" value={siswa.namaIbu} />
                  <DataRow label="Status" value={siswa.statusIbu} />
                  <DataRow label="NIK" value={siswa.nikIbu} />
                  <DataRow label="Kewarganegaraan" value={siswa.kewarganegaraanIbu} />
                  <DataRow label="Tempat Lahir" value={siswa.tempatLahirIbu} />
                  <DataRow label="Tanggal Lahir" value={fmt(siswa.tanggalLahirIbu)} />
                  <DataRow label="Pendidikan" value={siswa.pendidikanIbu} />
                  <DataRow label="Pekerjaan" value={siswa.pekerjaanIbu} />
                  <DataRow label="Penghasilan" value={siswa.penghasilanIbu} />
                  <DataRow label="No HP" value={siswa.noHpIbu} />
                  <DataRow label="Alamat" value={siswa.alamatLengkapIbu} />
                </SectionBlock>
              </div>
            )}

            {activeTab === "wali" && (
              <div className="grid grid-cols-2 gap-4">
                <SectionBlock title="B. Data Wali" color="bg-cyan-50 text-cyan-800">
                  <DataRow label="Status Wali" value={siswa.statusWali} />
                  <DataRow label="Nama Wali" value={siswa.namaWali} />
                  <DataRow label="NIK" value={siswa.nikWali} />
                  <DataRow label="Tempat Lahir" value={siswa.tempatLahirWali} />
                  <DataRow label="Tanggal Lahir" value={fmt(siswa.tanggalLahirWali)} />
                  <DataRow label="Pendidikan" value={siswa.pendidikanWali} />
                  <DataRow label="Pekerjaan" value={siswa.pekerjaanWali} />
                  <DataRow label="Penghasilan" value={siswa.penghasilanWali} />
                  <DataRow label="No HP" value={siswa.noHpWali} />
                </SectionBlock>

                <SectionBlock title="C. Tempat Tinggal" color="bg-orange-50 text-orange-800">
                  <DataRow label="Status Tinggal" value={siswa.statusTempatTinggalSiswa} />
                  <DataRow label="Jarak ke Sekolah" value={siswa.jarakTempatTinggalKeSekolah} />
                  <DataRow label="Transportasi" value={siswa.transportasiKeSekolah} />
                  <DataRow label="Waktu Tempuh" value={siswa.waktuTempuhKeSekolah} />
                </SectionBlock>
              </div>
            )}

            {activeTab === "kk" && (
              <SectionBlock title="F. Kartu Keluarga" color="bg-purple-50 text-purple-800">
                <DataRow label="No Kartu Keluarga" value={siswa.noKartuKeluarga} />
                <DataRow label="Nama Kepala Keluarga" value={siswa.namaKepalaKeluarga} />
              </SectionBlock>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
