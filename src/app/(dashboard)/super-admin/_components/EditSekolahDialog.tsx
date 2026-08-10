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
import { Pencil } from "lucide-react"

interface EditSekolahDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
  onSuccess: () => void
}

export default function EditSekolahDialog({
  open,
  onOpenChange,
  sekolah,
  onSuccess,
}: EditSekolahDialogProps) {
  const [loading, setLoading] = useState(false)
  const [namaSekolah, setNamaSekolah] = useState("")
  const [namaSingkat, setNamaSingkat] = useState("")
  const [npsn, setNpsn] = useState("")
  const [jenjang, setJenjang] = useState<"sd" | "smp" | "sma" | "smk" | "mi" | "mts" | "ma" | "tk">("sma")

  useEffect(() => {
    if (sekolah) {
      setNamaSekolah(sekolah.namaSekolah || "")
      setNamaSingkat(sekolah.namaSingkat || "")
      setNpsn(sekolah.npsn || "")
      setJenjang(sekolah.jenjang || "sma")
    }
  }, [sekolah, open])

  const utils = api.useUtils()

  const updateSekolahMutation = api.superAdmin.updateSekolah.useMutation({
    onSuccess: async () => {
      toast.success("Data sekolah berhasil diperbarui!")
      onOpenChange(false)
      await utils.superAdmin.listSekolah.invalidate()
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui data sekolah.")
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!sekolah) return
    setLoading(true)
    try {
      await updateSekolahMutation.mutateAsync({
        id: sekolah.id,
        namaSekolah,
        namaSingkat: namaSingkat || undefined,
        npsn: npsn || undefined,
        jenjang,
      })
    } catch {
      // Handled by onError
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-650 flex items-center justify-center mb-4">
              <Pencil size={20} />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Edit Data Sekolah
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Ubah rincian informasi sekolah / tenant terdaftar di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 relative z-10">
            {/* School Info Section */}
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Nama Resmi Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    Alias / Nama Singkat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SMAN 1 JKT"
                    value={namaSingkat}
                    onChange={(e) => setNamaSingkat(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                    NPSN
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 10293847"
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Jenjang Sekolah <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={jenjang}
                  onChange={(e) => setJenjang(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 transition-all duration-300 cursor-pointer"
                >
                  <option value="tk">TK / PAUD</option>
                  <option value="sd">SD / MI</option>
                  <option value="smp">SMP / MTS</option>
                  <option value="sma">SMA / MA</option>
                  <option value="smk">SMK / MAK</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Simpan</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
