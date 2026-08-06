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
import { Key, Loader2 } from "lucide-react"

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
}

export default function ResetPasswordDialog({
  open,
  onOpenChange,
  sekolah,
}: ResetPasswordDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedAdminId, setSelectedAdminId] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")

  // List admins for selected school to reset password
  const { data: adminsList = [], isLoading: isLoadingAdmins } = api.superAdmin.listSekolahAdmins.useQuery(
    { sekolahId: sekolah?.id ?? "" },
    { enabled: !!sekolah && open }
  )

  useEffect(() => {
    if (!open) {
      setSelectedAdminId("")
      setNewAdminPassword("")
    }
  }, [open])

  const resetPasswordMutation = api.superAdmin.resetAdminPassword.useMutation({
    onSuccess: () => {
      toast.success("Password admin berhasil diperbarui!")
      onOpenChange(false)
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal memperbarui password admin.")
    }
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedAdminId) {
      toast.error("Pilih akun admin terlebih dahulu.")
      return
    }
    setLoading(true)
    try {
      await resetPasswordMutation.mutateAsync({
        userId: selectedAdminId,
        newPassword: newAdminPassword,
      })
    } catch (err) {
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
              <Key size={20} />
            </div>
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight uppercase">
              Reset Password Admin
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-bold">
              Pilih akun admin sekolah {sekolah?.namaSekolah ? `(${sekolah.namaSekolah})` : ""} yang ingin direset dan masukkan password baru.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4 relative z-10">
            {/* Select Admin Section */}
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Pilih Akun Admin Sekolah <span className="text-rose-500">*</span>
                </label>
                {isLoadingAdmins ? (
                  <div className="flex items-center gap-2 text-xs text-slate-450 font-bold p-3 bg-slate-50/50 rounded-xl border border-slate-200/50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-650" />
                    <span>Memuat daftar administrator...</span>
                  </div>
                ) : adminsList.length === 0 ? (
                  <div className="text-xs text-rose-500 font-bold p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                    Tidak ada akun admin_sekolah terdaftar untuk instansi ini.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 transition-all duration-300 cursor-pointer"
                  >
                    <option value="">-- Pilih Akun Admin --</option>
                    {adminsList.map((adm: any) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.email} ({[adm.firstName, adm.lastName].filter(Boolean).join(" ") || "Admin"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-455 uppercase tracking-widest mb-1.5">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50/50 border border-slate-200/50 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 text-xs font-bold text-slate-700 placeholder-slate-400 transition-all duration-300"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || adminsList.length === 0 || !selectedAdminId}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
