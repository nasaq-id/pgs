"use client"

import { Label } from "@/components/ui/label"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

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
        <div className="space-y-1">
          <Label>Status Kepegawaian <span className="text-destructive">*</span></Label>
          <Select
            value={(form.statusKepegawaian as string) || ""}
            onValueChange={(v) => onChange("statusKepegawaian", v)}
          >
            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PNS">PNS</SelectItem>
              <SelectItem value="PPPK">PPPK</SelectItem>
              <SelectItem value="Guru Tetap Yayasan (GTY)">Guru Tetap Yayasan (GTY)</SelectItem>
              <SelectItem value="Honorer">Honorer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Kategori Pegawai <span className="text-destructive">*</span></Label>
          <div className="flex gap-3 pt-2">
            {["Guru", "Tendik"].map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => { onChange("kategoriPegawai", k); onChange("tugasUtama", "") }}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
                  kategori === k
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Tugas Utama <span className="text-destructive">*</span></Label>
          <Select
            value={(form.tugasUtama as string) || ""}
            onValueChange={(v) => onChange("tugasUtama", v)}
          >
            <SelectTrigger><SelectValue placeholder="Pilih tugas utama" /></SelectTrigger>
            <SelectContent>
              {tugasOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tugas Tambahan</Label>
        <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
          {TUGAS_TAMBAHAN.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox
                checked={tugasTambahan.includes(t)}
                onCheckedChange={() => toggleTugas(t)}
                id={`tt-${t}`}
              />
              <label htmlFor={`tt-${t}`} className="text-sm cursor-pointer">{t}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Mulai Bertugas</Label>
          <Input
            type="date"
            value={(form.mulaiBertugas as string) || ""}
            onChange={(e) => onChange("mulaiBertugas", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Akhir Bertugas</Label>
          <Input
            type="date"
            value={(form.akhirBertugas as string) || ""}
            onChange={(e) => onChange("akhirBertugas", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>JP (Jam Pelajaran)</Label>
          <Input
            type="number"
            readOnly
            className="bg-muted cursor-not-allowed"
            placeholder="Ditentukan di jadwal"
            value={(form.jp as number) ?? 0}
          />
        </div>
        <div className="space-y-1">
          <Label>Pendidikan Terakhir</Label>
          <Input
            value={(form.pendidikanTerakhir as string) || ""}
            onChange={(e) => onChange("pendidikanTerakhir", e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Alamat</Label>
          <Input
            value={(form.alamat as string) || ""}
            onChange={(e) => onChange("alamat", e.target.value)}
          />
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
        <Label htmlFor="active-switch">
          Status:{" "}
          <span className={(form.active as boolean) !== false ? "text-green-600 font-medium" : "text-muted-foreground font-medium"}>
            {(form.active as boolean) !== false ? "Aktif" : "Non Aktif"}
          </span>
        </Label>
      </div>
    </div>
  )
}
