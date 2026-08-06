"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { School, Pencil, Key, Trash2 } from "lucide-react"

interface DetailSekolahDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
  onEdit: (sekolah: any) => void
  onResetPassword: (sekolah: any) => void
  onImpersonate: (sekolahId: string) => void
  onDelete: (sekolah: any) => void
}

export default function DetailSekolahDialog({
  open,
  onOpenChange,
  sekolah,
  onEdit,
  onResetPassword,
  onImpersonate,
  onDelete,
}: DetailSekolahDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-650 flex items-center justify-center mb-4">
              <School size={20} />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Detail Lembaga & Penggunaan Sumber Daya
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Informasi rinci kapasitas data dan kuota penggunaan database untuk sekolah terpilih.
            </DialogDescription>
          </DialogHeader>

          {sekolah && (
            <div className="space-y-6 mt-4 relative z-10">
              {/* School Profile Card */}
              <div className="bg-slate-50/50 border border-slate-105 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-base font-black text-slate-800 leading-tight">
                      {sekolah.namaSekolah}
                    </h4>
                    {sekolah.namaSingkat && (
                      <span className="inline-block mt-1 text-[10px] bg-teal-50 text-teal-650 px-2 py-0.5 rounded font-black uppercase">
                        {sekolah.namaSingkat}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    sekolah.active
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-rose-50 text-rose-600 border border-rose-100"
                  }`}>
                    {sekolah.active ? "Aktif" : "Suspended"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 text-xs">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NPSN</p>
                    <p className="font-mono text-slate-700 font-bold mt-0.5">{sekolah.npsn || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenjang Pendidikan</p>
                    <p className="uppercase text-slate-700 font-bold mt-0.5">{sekolah.jenjang}</p>
                  </div>
                </div>
              </div>

              {/* Database Row Quota Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-slate-550">Kuota Baris Data (Database Rows)</span>
                  <span className="text-slate-800 font-black">
                    {sekolah.stats?.dbRows?.toLocaleString("id-ID") ?? 0} / 10.000 Rows
                  </span>
                </div>
                {/* Progress Bar Container */}
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner relative">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      (sekolah.stats?.dbRows ?? 0) > 8000 ? "bg-rose-500" :
                      (sekolah.stats?.dbRows ?? 0) > 5000 ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(((sekolah.stats?.dbRows ?? 0) / 10000) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold">
                  * Batas standar gratis adalah 10.000 baris data database per instansi sekolah.
                </p>
              </div>

              {/* Resource Breakdown Grid */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Breakdown Baris Data Database</h5>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Siswa</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.siswa?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Guru & Staff</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.guru?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rombel (Kelas)</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.kelas?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mapel</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.mapel?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Absensi</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.absensi?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Keuangan (Invoice)</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.invoice?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jurnal Mengajar</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.jurnal?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/20 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-Poin (Pelanggaran)</p>
                    <p className="text-base font-black text-slate-700 font-mono mt-1">
                      {sekolah.stats?.poin?.toLocaleString("id-ID") ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(sekolah)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-655 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Pencil size={12} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onResetPassword(sekolah)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Key size={12} />
                  <span>Reset Pass</span>
                </button>

                {sekolah.active && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false)
                      onImpersonate(sekolah.id)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Kelola
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(sekolah)
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-650 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Trash2 size={12} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
