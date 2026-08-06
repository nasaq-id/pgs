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
import { ShieldAlert, Trash2 } from "lucide-react"

interface DeleteSekolahDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
  onSuccess: () => void
}

export default function DeleteSekolahDialog({
  open,
  onOpenChange,
  sekolah,
  onSuccess,
}: DeleteSekolahDialogProps) {
  const [deleteConfirmName, setDeleteConfirmName] = useState("")

  useEffect(() => {
    if (!open) {
      setDeleteConfirmName("")
    }
  }, [open])

  const utils = api.useUtils()

  const deleteSekolahMutation = api.superAdmin.deleteSekolah.useMutation({
    onSuccess: async (data: any) => {
      toast.success(`Sekolah ${data.namaSekolah} berhasil dihapus permanen!`)
      onOpenChange(false)
      await utils.superAdmin.listSekolah.invalidate()
      onSuccess()
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menghapus sekolah.")
    },
  })

  const confirmDeleteSekolah = () => {
    if (!sekolah) return
    if (deleteConfirmName !== sekolah.namaSekolah) {
      toast.error("Nama sekolah tidak cocok.")
      return
    }
    deleteSekolahMutation.mutate({ id: sekolah.id })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-6 relative text-left">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <DialogHeader className="text-left relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert size={20} className="animate-pulse" />
            </div>
            <DialogTitle className="text-lg font-black text-rose-600 tracking-tight uppercase">
              Hapus Sekolah Permanen
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Tindakan ini tidak dapat dibatalkan. Menghapus sekolah akan menghapus <span className="text-rose-600">seluruh data terkait</span> (guru, siswa, kelas, tagihan, dll) secara permanen dari database.
            </DialogDescription>
          </DialogHeader>

          {sekolah && (
            <div className="space-y-4 mt-4 relative z-10">
              <div className="bg-rose-50/50 border border-rose-100/50 p-4 rounded-xl text-xs space-y-1">
                <p className="font-black text-rose-800 uppercase tracking-wider text-[9px]">Sekolah Yang Akan Dihapus:</p>
                <p className="font-mono text-sm text-rose-900 font-black">{sekolah.namaSekolah}</p>
                {sekolah.npsn && (
                  <p className="text-[10px] text-rose-700 font-bold">NPSN: {sekolah.npsn}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest">
                  Tulis kembali nama sekolah untuk konfirmasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={sekolah.namaSekolah}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 text-xs font-bold text-slate-700 placeholder-slate-350 transition-all duration-300"
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
                  onClick={confirmDeleteSekolah}
                  disabled={deleteConfirmName !== sekolah.namaSekolah || deleteSekolahMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteSekolahMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Trash2 size={14} className="flex-shrink-0" />
                      <span>Hapus Permanen</span>
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
