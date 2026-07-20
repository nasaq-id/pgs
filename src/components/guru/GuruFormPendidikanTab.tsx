"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, CheckCircle2, Building2 } from "lucide-react"

export interface PendidikanEntry {
  namaSekolah?: string
  fakultasProdi?: string
  jurusan?: string
  gelar?: string
  tahunMasuk?: string
  tahunLulus?: string
  noIjazah?: string
  ipk?: string
  kota?: string
}

export type RiwayatPendidikanMap = Record<string, PendidikanEntry>

interface GuruFormPendidikanTabProps {
  form: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

const JENJANG_LIST = [
  { value: "SD", label: "SD / MI (Sekolah Dasar)" },
  { value: "SMP", label: "SMP / MTs (Sekolah Menengah Pertama)" },
  { value: "SMA", label: "SMA / SMK / MA (Sekolah Menengah Atas)" },
  { value: "D3", label: "D3 (Diploma III)" },
  { value: "S1", label: "S1 (Sarjana)" },
  { value: "S2", label: "S2 (Magister)" },
  { value: "S3", label: "S3 (Doktor)" },
]

export default function GuruFormPendidikanTab({ form, onChange }: GuruFormPendidikanTabProps) {
  const [selectedJenjang, setSelectedJenjang] = useState<string>("S1")

  const getPendidikanMap = (): RiwayatPendidikanMap => {
    try {
      if (typeof form.riwayatPendidikan === "string" && form.riwayatPendidikan) {
        return JSON.parse(form.riwayatPendidikan)
      }
      if (typeof form.riwayatPendidikan === "object" && form.riwayatPendidikan !== null) {
        return form.riwayatPendidikan as RiwayatPendidikanMap
      }
    } catch {
      // ignore
    }
    return {}
  }

  const map = getPendidikanMap()
  const currentEntry = map[selectedJenjang] || {}

  const handleEntryChange = (field: keyof PendidikanEntry, val: string) => {
    const newMap: RiwayatPendidikanMap = {
      ...map,
      [selectedJenjang]: {
        ...currentEntry,
        [field]: val,
      },
    }
    onChange("riwayatPendidikan", JSON.stringify(newMap))
  }

  const isHigherDegree = ["D3", "S1", "S2", "S3"].includes(selectedJenjang)
  const isSma = selectedJenjang === "SMA"

  return (
    <div className="space-y-5">
      {/* Dropdown Pilihan Jenjang */}
      <div className="p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-black uppercase text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
            <GraduationCap className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            Pilih Jenjang Pendidikan
          </Label>
        </div>
        <Select
          options={JENJANG_LIST}
          value={selectedJenjang}
          onValueChange={(val) => val && setSelectedJenjang(val)}
        >
          <SelectTrigger className="bg-white dark:bg-slate-900 font-semibold text-slate-800 dark:text-slate-200">
            <SelectValue placeholder="Pilih Jenjang" />
          </SelectTrigger>
          <SelectContent>
            {JENJANG_LIST.map((j) => (
              <SelectItem key={j.value} value={j.value}>
                {j.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Badges of filled education levels */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {JENJANG_LIST.map((j) => {
            const isFilled = !!(map[j.value]?.namaSekolah)
            const isSelected = selectedJenjang === j.value
            return (
              <button
                key={j.value}
                type="button"
                onClick={() => setSelectedJenjang(j.value)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? "bg-teal-600 text-white shadow-sm"
                    : isFilled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {j.value}
                {isFilled && <CheckCircle2 className="h-3 w-3 shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Form sesuai jenjang yang dipilih */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 bg-white dark:bg-slate-900">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b pb-3 border-slate-100 dark:border-slate-800">
          <Building2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          Detail Pendidikan — {JENJANG_LIST.find((j) => j.value === selectedJenjang)?.label || selectedJenjang}
        </h4>

        <div className="space-y-4">
          {/* Nama Sekolah / Perguruan Tinggi */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              {isHigherDegree ? "Nama Perguruan Tinggi / Universitas" : "Nama Sekolah"}
            </Label>
            <Input
              value={currentEntry.namaSekolah || ""}
              onChange={(e) => handleEntryChange("namaSekolah", e.target.value)}
              placeholder={isHigherDegree ? "Contoh: Universitas Pendidikan Indonesia" : "Contoh: SMAN 1 Bandung"}
            />
          </div>

          {/* Program Studi & Gelar (D3, S1, S2, S3) */}
          {isHigherDegree && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Program Studi / Jurusan</Label>
                <Input
                  value={currentEntry.fakultasProdi || ""}
                  onChange={(e) => handleEntryChange("fakultasProdi", e.target.value)}
                  placeholder="Contoh: Pendidikan Matematika"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Gelar Akademik</Label>
                <Input
                  value={currentEntry.gelar || ""}
                  onChange={(e) => handleEntryChange("gelar", e.target.value)}
                  placeholder="Contoh: S.Pd. / M.Pd."
                />
              </div>
            </div>
          )}

          {isSma && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Jurusan / Peminatan</Label>
              <Input
                value={currentEntry.jurusan || ""}
                onChange={(e) => handleEntryChange("jurusan", e.target.value)}
                placeholder="Contoh: IPA / IPS / Rekayasa Perangkat Lunak"
              />
            </div>
          )}

          {/* Tahun Masuk & Lulus */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tahun Masuk</Label>
              <Input
                maxLength={4}
                value={currentEntry.tahunMasuk || ""}
                onChange={(e) => handleEntryChange("tahunMasuk", e.target.value.replace(/\D/g, ""))}
                placeholder="Contoh: 2012"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tahun Lulus / Tamat</Label>
              <Input
                maxLength={4}
                value={currentEntry.tahunLulus || ""}
                onChange={(e) => handleEntryChange("tahunLulus", e.target.value.replace(/\D/g, ""))}
                placeholder="Contoh: 2016"
              />
            </div>
          </div>

          {/* No. Ijazah, IPK, Kota */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">No. Ijazah</Label>
              <Input
                value={currentEntry.noIjazah || ""}
                onChange={(e) => handleEntryChange("noIjazah", e.target.value)}
                placeholder="No. Ijazah"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{isHigherDegree ? "IPK Akhir" : "Nilai Rata-rata"}</Label>
              <Input
                value={currentEntry.ipk || ""}
                onChange={(e) => handleEntryChange("ipk", e.target.value)}
                placeholder={isHigherDegree ? "Contoh: 3.75" : "Contoh: 85.5"}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Kota / Lokasi</Label>
              <Input
                value={currentEntry.kota || ""}
                onChange={(e) => handleEntryChange("kota", e.target.value)}
                placeholder="Kota lokasi"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
