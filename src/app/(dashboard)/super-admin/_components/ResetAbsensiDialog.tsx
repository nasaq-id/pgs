"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { CalendarX2 } from "lucide-react"

interface ResetAbsensiDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
  onSuccess: () => void
}

export default function ResetAbsensiDialog({
  open,
  onOpenChange,
  sekolah,
  onSuccess,
}: ResetAbsensiDialogProps) {
  const [confirmText, setConfirmText] = useState("")

  useEffect(() => {
    if (!open) {
      setConfirmText("")
    }
  }, [open])

  const utils = api.useUtils()

  const resetMutation = api.superAdmin.resetDataAbsensi.useMutation({
    onSuccess: async (data: any) => {
      const c = data?.counts ?? {}
      toast.success(`Data absensi ${sekolah?.namaSekolah ?? "sekolah"} berhasil direset! (Siswa: ${c.absensiSiswa ?? 0}, Guru: ${c.absensiGuru ?? 0}, Hari: ${c.absensiHari ?? 0}, Izin: ${c.pengajuanIzin ?? 0})`)
      onOpenChange(false)
      await utils.superAdmin.listSekolah.invalidate()
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mereset data absensi.")
    },
  })

  const confirmReset = () => {
    if (!sekolah) return
    if (confirmText.trim().toUpperCase() !== "RESET") {
      toast.error("Ketik RESET untuk konfirmasi.")
      return
    }
    resetMutation.mutate({ sekolahId: sekolah.id })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
              <CalendarX2 size={20} className="animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-black text-amber-600 tracking-tight uppercase">
              Reset Data Absensi
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Tindakan ini akan menghapus <span className="text-amber-600">seluruh record absensi dan pengajuan izin</span> sekolah secara permanen. Data siswa, guru, kelas, dan data lainnya <span className="text-emerald-600">tidak terpengaruh</span>.
            </DialogDescription>
          </DialogHeader>

          {sekolah && (
            <div className="space-y-4 mt-4 relative z-10">
              <div className="bg-amber-50/50 border border-amber-100/50 p-4 rounded-xl text-xs space-y-1">
                <p className="font-black text-amber-800 uppercase tracking-wider text-[9px]">Sekolah Yang Akan Direset:</p>
                <p className="font-mono text-sm text-amber-900 font-black">{sekolah.namaSekolah}</p>
                {sekolah.npsn && (
                  <p className="text-[10px] text-amber-700 font-bold">NPSN: {sekolah.npsn}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest">
                  Ketik <span className="text-amber-500">RESET</span> untuk konfirmasi <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="RESET"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 text-xs font-bold text-slate-700 placeholder-slate-350 transition-all duration-300"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-555 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  disabled={confirmText.trim().toUpperCase() !== "RESET" || resetMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CalendarX2 size={14} className="flex-shrink-0" />
                      <span>Reset Absensi</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
