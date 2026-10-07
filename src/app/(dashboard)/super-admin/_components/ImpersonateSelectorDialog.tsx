"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Building, UserCheck, GraduationCap, ArrowRight, Search, ShieldAlert } from "lucide-react"
import { api } from "@/lib/trpc/client"
import { Input } from "@/components/ui/input"

const IMPERSONATION_MAX_AGE = 7 * 24 * 60 * 60
const EXPIRED = "path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"

// Set cookie impersonasi lalu reload ke beranda. Di luar komponen agar
// mutasi document/window tidak dianggap mutasi nilai render (react-hooks/immutability).
function startImpersonation(sekolahId: string, user?: { userId: string; role: "guru" | "siswa" }) {
  document.cookie = `impersonated_sekolah_id=${sekolahId}; path=/; max-age=${IMPERSONATION_MAX_AGE}`
  if (user) {
    document.cookie = `impersonated_user_id=${user.userId}; path=/; max-age=${IMPERSONATION_MAX_AGE}`
    document.cookie = `impersonated_role=${user.role}; path=/; max-age=${IMPERSONATION_MAX_AGE}`
  } else {
    document.cookie = `impersonated_user_id=; ${EXPIRED}`
    document.cookie = `impersonated_role=; ${EXPIRED}`
  }
  window.location.href = "/"
}

interface ImpersonateSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sekolah: any
}

export default function ImpersonateSelectorDialog({
  open,
  onOpenChange,
  sekolah,
}: ImpersonateSelectorDialogProps) {
  const [selectedRole, setSelectedRole] = useState<"admin" | "guru" | "siswa">("admin")
  const [searchUser, setSearchUser] = useState("")

  const { data: userList = [], isLoading } = api.superAdmin.listUsersBySekolah.useQuery(
    { sekolahId: sekolah?.id ?? "", role: selectedRole as "guru" | "siswa" },
    { enabled: open && !!sekolah?.id && (selectedRole === "guru" || selectedRole === "siswa") }
  )

  const handleImpersonateAdmin = () => {
    if (!sekolah) return
    startImpersonation(sekolah.id)
  }

  const handleImpersonateUser = (userId: string, role: "guru" | "siswa") => {
    if (!sekolah) return
    startImpersonation(sekolah.id, { userId, role })
  }

  const filteredUsers = userList.filter((u: any) => {
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase()
    const email = u.email.toLowerCase()
    const query = searchUser.toLowerCase()
    return fullName.includes(query) || email.includes(query)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
        <DialogHeader className="text-left">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
            <ShieldAlert size={20} />
          </div>
          <DialogTitle className="text-base font-black text-slate-800 tracking-tight uppercase">
            Pilih Mode Impersonate
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400 font-bold">
            Pilih peran pengguna di <span className="text-slate-700">{sekolah?.namaSekolah}</span> yang ingin Anda impersonasi.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl mt-4">
          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              selectedRole === "admin"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Admin Sekolah
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("guru")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              selectedRole === "guru"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Guru
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("siswa")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              selectedRole === "siswa"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Siswa
          </button>
        </div>

        {/* Content based on role */}
        <div className="mt-4">
          {selectedRole === "admin" ? (
            <div className="bg-amber-50/60 border border-amber-150 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">Impersonate Admin Sekolah</h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Masuk dengan otoritas penuh administrator sekolah untuk melihat & mengelola sekolah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleImpersonateAdmin}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Masuk Kelola Sekolah</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder={`Cari nama / email ${selectedRole}...`}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-bold animate-pulse">
                    Memuat data {selectedRole}...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-bold">
                    Tidak ada akun {selectedRole} aktif ditemukan.
                  </div>
                ) : (
                  filteredUsers.map((u: any) => {
                    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email
                    return (
                      <div
                        key={u.id}
                        onClick={() => handleImpersonateUser(u.id, selectedRole)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {selectedRole === "guru" ? (
                            <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <GraduationCap className="h-4 w-4 text-blue-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-amber-600 transition-colors shrink-0" />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
