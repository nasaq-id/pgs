"use client"

import { useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, Printer, Loader2, IdCard, Phone, Mail, MapPin, Calendar, GraduationCap } from "lucide-react"
import { api } from "@/lib/trpc/client"

interface GuruDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guruId: string
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

function InfoCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value?: string | null; accent: string }) {
  return (
    <div className={`flex gap-3 items-start p-3 rounded-xl border ${accent}`}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold truncate">{value || "-"}</p>
      </div>
    </div>
  )
}

function SectionBlock({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div className={`px-4 py-2.5 ${color}`}>
        <h4 className="text-sm font-bold uppercase tracking-wider">{title}</h4>
      </div>
      <div className="p-4 space-y-0">{children}</div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-border/40 last:border-0 text-sm">
      <span className="w-44 flex-shrink-0 text-muted-foreground">{label}</span>
      <span className="flex-1 font-medium">{value || "-"}</span>
    </div>
  )
}

export default function GuruDetailDialog({ open, onOpenChange, guruId }: GuruDetailDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const { data: guru, isLoading } = api.guru.getById.useQuery(
    { id: guruId },
    { enabled: open && !!guruId },
  )

  const isAktif = guru?.active !== false

  const handlePrint = () => {
    const content = printRef.current?.innerHTML
    if (!content || !guru) return
    const win = window.open("", "_blank")
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html><head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
<meta charset="utf-8"/>
<title>Data Guru - ${guru.namaLengkap || ""}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a1a;padding:24px}
  .header{display:flex;align-items:center;gap:20px;padding:20px;background:linear-gradient(135deg,#3b82f6,#6366f1);color:white;border-radius:12px;margin-bottom:20px}
  .photo{width:80px;height:80px;border-radius:50%;border:3px solid rgba(255,255,255,0.5);overflow:hidden;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .photo img{width:100%;height:100%;object-fit:cover}
  .header-info h2{font-size:20px;font-weight:700}
  .header-info p{font-size:13px;opacity:.85;margin-top:4px}
  .badges{display:flex;gap:8px;margin-top:8px}
  .badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(255,255,255,0.2);color:white}
  .badge.aktif{background:#dcfce7;color:#166534}
  .badge.nonaktif{background:#f1f5f9;color:#475569}
  .section{margin-bottom:16px;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0}
  .section-title{padding:8px 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
  .s-blue{background:#dbeafe;color:#1d4ed8}
  .s-purple{background:#ede9fe;color:#6d28d9}
  .section-body{padding:8px 14px}
  .row{display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;font-size:12px}
  .row:last-child{border-bottom:none}
  .rl{width:160px;flex-shrink:0;color:#64748b}
  .rv{font-weight:500;flex:1}
  .chip{padding:2px 8px;border-radius:12px;font-size:11px;background:#ede9fe;color:#5b21b6;font-weight:500;display:inline-block;margin:2px}
  @media print{body{padding:12px}}
</style></head><body>
<div class="header">
  <div class="photo">${guru.foto ? `<img src="${guru.foto}"/>` : '<span style="color:rgba(255,255,255,0.7);font-size:28px;">&#x1F464;</span>'}</div>
  <div class="header-info">
    <h2>${guru.namaLengkap || "-"}</h2>
    <p>${guru.tugasUtama || "-"} ${guru.statusKepegawaian ? "· " + guru.statusKepegawaian : ""}</p>
    <div class="badges">
      <span class="badge">${guru.kategoriPegawai || "Guru"}</span>
      <span class="badge ${isAktif ? "aktif" : "nonaktif"}">${isAktif ? "Aktif" : "Non Aktif"}</span>
    </div>
  </div>
</div>
<div class="section">
  <div class="section-title s-blue">Informasi Utama</div>
  <div class="section-body">
    <div class="row"><span class="rl">NIP/NUPTK</span><span class="rv">${guru.nipnuptk || "-"}</span></div>
    <div class="row"><span class="rl">NIK</span><span class="rv">${guru.nik || "-"}</span></div>
    <div class="row"><span class="rl">Jenis Kelamin</span><span class="rv">${guru.jenisKelamin || "-"}</span></div>
    <div class="row"><span class="rl">Tempat, Tgl Lahir</span><span class="rv">${[guru.tempatLahir, fmt(guru.tanggalLahir)].filter(Boolean).join(", ") || "-"}</span></div>
    <div class="row"><span class="rl">No HP/Whatsapp</span><span class="rv">${guru.noHp || "-"}</span></div>
    <div class="row"><span class="rl">Email</span><span class="rv">${guru.email || "-"}</span></div>
    <div class="row"><span class="rl">Alamat</span><span class="rv">${guru.alamat || "-"}</span></div>
    <div class="row"><span class="rl">Username</span><span class="rv">${guru.usernameGuru || "-"}</span></div>
  </div>
</div>
<div class="section">
  <div class="section-title s-purple">Data Kepegawaian</div>
  <div class="section-body">
    <div class="row"><span class="rl">Status Kepegawaian</span><span class="rv">${guru.statusKepegawaian || "-"}</span></div>
    <div class="row"><span class="rl">Kategori Pegawai</span><span class="rv">${guru.kategoriPegawai || "-"}</span></div>
    <div class="row"><span class="rl">Tugas Utama</span><span class="rv">${guru.tugasUtama || "-"}</span></div>
    <div class="row"><span class="rl">Pendidikan Terakhir</span><span class="rv">${guru.pendidikanTerakhir || "-"}</span></div>
    <div class="row"><span class="rl">Mulai Bertugas</span><span class="rv">${fmt(guru.mulaiBertugas)}</span></div>
    <div class="row"><span class="rl">Akhir Bertugas</span><span class="rv">${fmt(guru.akhirBertugas)}</span></div>
    <div class="row"><span class="rl">JP</span><span class="rv">${guru.jp?.toString() || "-"}</span></div>
    <div class="row"><span class="rl">Tugas Tambahan</span><span class="rv"><div>${guru.tugasTambahan ? guru.tugasTambahan.split(",").map((t: string) => `<span class="chip">${t.trim()}</span>`).join("") : "-"}</div></span></div>
  </div>
</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Detail Guru / Tendik</DialogTitle>
            {guru && (
              <Button size="sm" variant="outline" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" /> Cetak PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !guru ? (
          <p className="text-center py-8 text-muted-foreground">Data tidak ditemukan</p>
        ) : (
          <div ref={printRef} className="space-y-5 pb-2">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white">
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 rounded-full border-2 border-white/50 overflow-hidden glass-subtle flex items-center justify-center flex-shrink-0">
                  {guru.foto ? (
                    <img src={guru.foto} alt="Foto guru" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-white/70" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{guru.namaLengkap || "-"}</h3>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {guru.tugasUtama || "-"} {guru.statusKepegawaian ? `· ${guru.statusKepegawaian}` : ""}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold glass-subtle text-white">
                      {guru.kategoriPegawai || "Guru"}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isAktif ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isAktif ? "Aktif" : "Non Aktif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoCard icon={<IdCard className="h-4 w-4 text-blue-500" />} label="NIP/NUPTK" value={guru.nipnuptk} accent="bg-blue-50 border-blue-100" />
              <InfoCard icon={<Phone className="h-4 w-4 text-green-500" />} label="No HP/WA" value={guru.noHp} accent="bg-green-50 border-green-100" />
              <InfoCard icon={<Mail className="h-4 w-4 text-purple-500" />} label="Email" value={guru.email} accent="bg-purple-50 border-purple-100" />
              <InfoCard icon={<MapPin className="h-4 w-4 text-orange-500" />} label="Alamat" value={guru.alamat} accent="bg-orange-50 border-orange-100" />
            </div>

            <SectionBlock title="Informasi Utama" color="bg-blue-50 text-blue-800">
              <DataRow label="NIK" value={guru.nik} />
              <DataRow label="Jenis Kelamin" value={guru.jenisKelamin === "L" ? "Laki-laki" : guru.jenisKelamin === "P" ? "Perempuan" : "-"} />
              <DataRow label="Tempat, Tgl Lahir" value={[guru.tempatLahir, fmt(guru.tanggalLahir)].filter(Boolean).join(", ")} />
              <DataRow label="Pendidikan Terakhir" value={guru.pendidikanTerakhir} />
              <DataRow label="Username" value={guru.usernameGuru} />
            </SectionBlock>

            <SectionBlock title="Data Kepegawaian" color="bg-purple-50 text-purple-800">
              <DataRow label="Status Kepegawaian" value={guru.statusKepegawaian} />
              <DataRow label="Kategori Pegawai" value={guru.kategoriPegawai} />
              <DataRow label="Tugas Utama" value={guru.tugasUtama} />
              <DataRow label="Mulai Bertugas" value={
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmt(guru.mulaiBertugas)}
                </span>
              } />
              <DataRow label="Akhir Bertugas" value={
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmt(guru.akhirBertugas)}
                </span>
              } />
              <DataRow label="JP" value={guru.jp?.toString()} />
              <div className="flex gap-2 py-1.5 text-sm">
                <span className="w-44 flex-shrink-0 text-muted-foreground">Tugas Tambahan</span>
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {guru.tugasTambahan
                    ? guru.tugasTambahan.split(",").map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          {t.trim()}
                        </Badge>
                      ))
                    : <span className="font-medium">-</span>
                  }
                </div>
              </div>
            </SectionBlock>

            {(() => {
              let pMap: Record<string, any> = {}
              try {
                if (guru.riwayatPendidikan) pMap = JSON.parse(guru.riwayatPendidikan)
              } catch {}
              const entries = Object.entries(pMap).filter(([, val]) => val && val.namaSekolah)
              if (entries.length === 0) return null
              return (
                <SectionBlock title="Riwayat Pendidikan" color="bg-emerald-50 text-emerald-800">
                  {entries.map(([j, val]) => (
                    <div key={j} className="py-2 border-b border-border/40 last:border-0 text-sm">
                      <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <GraduationCap className="h-4 w-4" /> {j} — {val.namaSekolah}
                        </span>
                        {val.tahunMasuk || val.tahunLulus ? (
                          <span className="text-xs text-muted-foreground font-normal">
                            {val.tahunMasuk || "?"} - {val.tahunLulus || "?"}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 pl-5 text-xs space-y-0.5 text-slate-600 dark:text-slate-400">
                        {val.fakultasProdi && <p>Prodi/Jurusan: <strong className="text-slate-800 dark:text-slate-200">{val.fakultasProdi}</strong> {val.gelar ? `(${val.gelar})` : ""}</p>}
                        {val.jurusan && <p>Jurusan: <strong className="text-slate-800 dark:text-slate-200">{val.jurusan}</strong></p>}
                        {val.noIjazah && <p>No. Ijazah: {val.noIjazah}</p>}
                        {val.ipk && <p>IPK/Nilai: {val.ipk}</p>}
                        {val.kota && <p>Lokasi: {val.kota}</p>}
                      </div>
                    </div>
                  ))}
                </SectionBlock>
              )
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
