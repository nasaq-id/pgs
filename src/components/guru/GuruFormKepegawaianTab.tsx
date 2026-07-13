"use client"

import { Label } from "@/components/ui/label"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar, Clock, GraduationCap, MapPin } from "lucide-react"

const TUGAS_GURU = ["Kepala Sekolah/Madrasah", "Guru Kelas", "Guru Mata Pelajaran", "Guru BK"]
const TUGAS_TENDIK = ["Tata Usaha", "Operator", "Bendahara", "Petugas Keamanan", "Petugas Kebersihan", "Pembina Ekskul", "Lainnya"]
const TUGAS_TAMBAHAN = ["Wakil Kepala Sekolah/Madrasah", "Kepala Pustakawan", "Kepala Laboratorium", "Wali Kelas", "Guru Piket", "Koordinator Projek", "Guru Wali"]

interface Props {
  form: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export default function GuruFormKepegawaianTab({ form, onChange }: Props) {
  const kategori = form.kategoriPegawai as string
  const tugasOptions = kategori === "Tendik" ? TUGAS_TENDIK : TUGAS_GURU
  const tugasTambahan = (form.tugasTambahan as string[]) || []

  const toggleTugas = (val: string) => {
    const current = tugasTambahan
    onChange("tugasTambahan", current.includes(val) ? current.filter((t) => t !== val) : [...current, val])
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Status Kepegawaian <span className="text-destructive">*</span></Label>
          <Select
            value={(form.statusKepegawaian as string) || ""}
            onValueChange={(v) => onChange("statusKepegawaian", v)}
          >
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PNS">PNS</SelectItem>
              <SelectItem value="PPPK">PPPK</SelectItem>
              <SelectItem value="Guru Tetap Yayasan (GTY)">Guru Tetap Yayasan (GTY)</SelectItem>
              <SelectItem value="Honorer">Honorer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Kategori Pegawai <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            {["Guru", "Tendik"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { onChange("kategoriPegawai", k); onChange("tugasUtama", "") }}
                className={`flex-1 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  kategori === k
                    ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-sm border-transparent"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Tugas Utama <span className="text-destructive">*</span></Label>
          <Select
            value={(form.tugasUtama as string) || ""}
            onValueChange={(v) => onChange("tugasUtama", v)}
          >
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih tugas utama" /></SelectTrigger>
            <SelectContent>
              {tugasOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest">Tugas Tambahan</Label>
        <div className="grid grid-cols-2 gap-2 p-4 border border-slate-100 rounded-2xl bg-slate-50/30">
          {TUGAS_TAMBAHAN.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox
                checked={tugasTambahan.includes(t)}
                onCheckedChange={() => toggleTugas(t)}
                id={`tt-${t}`}
              />
              <label htmlFor={`tt-${t}`} className="text-xs font-bold text-slate-600 cursor-pointer">{t}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Mulai Bertugas</Label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="date"
              value={(form.mulaiBertugas as string) || ""}
              onChange={(e) => onChange("mulaiBertugas", e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Akhir Bertugas</Label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="date"
              value={(form.akhirBertugas as string) || ""}
              onChange={(e) => onChange("akhirBertugas", e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">JP (Jam Pelajaran)</Label>
          <div className="relative">
            <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="number"
              readOnly
              className="pl-10 bg-muted cursor-not-allowed w-full"
              placeholder="Ditentukan di jadwal"
              value={(form.jp as number) ?? 0}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Pendidikan Terakhir</Label>
          <div className="relative">
            <GraduationCap size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.pendidikanTerakhir as string) || ""}
              onChange={(e) => onChange("pendidikanTerakhir", e.target.value)}
              className="pl-10 w-full"
              placeholder="Contoh: S1 Pendidikan Matematika"
            />
          </div>
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Alamat</Label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={(form.alamat as string) || ""}
              onChange={(e) => onChange("alamat", e.target.value)}
              className="pl-10 w-full"
              placeholder="Alamat lengkap tempat tinggal"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Switch
          checked={(form.active as boolean) ?? true}
          onCheckedChange={(v) => onChange("active", v)}
          id="active-switch"
        >
          <SwitchThumb />
        </Switch>
        <Label htmlFor="active-switch" className="text-xs font-bold text-slate-650 cursor-pointer">
          Status:{" "}
          <span className={(form.active as boolean) !== false ? "text-green-600 font-bold" : "text-slate-400 font-bold"}>
            {(form.active as boolean) !== false ? "Aktif" : "Non Aktif"}
          </span>
        </Label>
      </div>
    </div>
  )
}
