"use client"

import { useRef, useState } from "react"
import { Upload, Download, Loader2, FileSpreadsheet, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"

interface MapelRow {
  id: string
  namaMapel: string
  kodeMapel: string | null
  kelompok: string | null
  kkm: number | null
  jumlahJam: number | null
  aktif: boolean
}

function normalizeKelompok(v: unknown): "A" | "B" | "C" | "muatan_lokal" {
  if (typeof v !== "string") return "A"
  const key = v.trim().toUpperCase()
  if (key.includes("MUATAN") || key.includes("MULOK")) return "muatan_lokal"
  if (key === "C" || key.includes("PEMINATAN") || key.includes("PILIHAN")) return "C"
  if (key === "B") return "B"
  return "A"
}

export default function ImportExportMapel({
  mapelList,
  onDone,
}: {
  mapelList: MapelRow[] | undefined
  onDone?: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const utils = api.useUtils()

  const handleExport = async () => {
    const XLSX = await import("xlsx")
    const rows = (mapelList ?? []).map((m) => ({
      Kode: m.kodeMapel || "",
      "Nama Mapel": m.namaMapel,
      Kelompok: m.kelompok || "A",
      "Jumlah Jam (JP/Minggu)": m.jumlahJam ?? 0,
      KKM: m.kkm ?? 70,
      Aktif: m.aktif ? "Ya" : "Tidak",
    }))
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ Kode: "", "Nama Mapel": "", Kelompok: "A", "Jumlah Jam (JP/Minggu)": 0, KKM: 70, Aktif: "Ya" }])
    ws["!cols"] = [
      { wch: 8 },
      { wch: 32 },
      { wch: 14 },
      { wch: 22 },
      { wch: 6 },
      { wch: 8 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Mata Pelajaran")
    XLSX.writeFile(wb, `data_mapel_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success(`Berhasil mengekspor ${mapelList?.length ?? 0} mata pelajaran`)
  }

  const importMutation = api.mapel.importBulk.useMutation({
    onSuccess: (res) => {
      toast.success(`Import selesai: ${res.added} baru, ${res.updated} diperbarui`)
      utils.mapel.getAll.invalidate()
      onDone?.()
    },
    onError: (err) => toast.error(err.message || "Gagal import data mapel"),
  })

  const handleFile = async (file: File) => {
    setImporting(true)
    try {
      const XLSX = await import("xlsx")
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: "array" })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

      const items = raw
        .map((r) => {
          const nama = String(r["Nama Mapel"] ?? r["nama"] ?? r["Nama"] ?? "").trim()
          const kode = String(r["Kode"] ?? r["kode"] ?? "").trim()
          if (!nama) return null
          const jp = Number(r["Jumlah Jam (JP/Minggu)"] ?? r["JP"] ?? r["jumlahJam"] ?? 0)
          const kkmRaw = Number(r["KKM"] ?? r["kkm"] ?? 70)
          return {
            kode,
            nama,
            kelompok: normalizeKelompok(r["Kelompok"] ?? r["kelompok"]),
            jumlahJam: Number.isFinite(jp) && jp > 0 ? Math.min(60, Math.round(jp)) : 0,
            kkm: Number.isFinite(kkmRaw) ? Math.min(100, Math.max(0, Math.round(kkmRaw))) : 70,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)

      if (items.length === 0) {
        toast.error("Tidak ada data mapel valid pada file. Pastikan kolom 'Nama Mapel' terisi.")
        return
      }
      await importMutation.mutateAsync({ items })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membaca file XLSX")
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              className="h-10 px-4 w-full"
              disabled={importing}
            >
              {importing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              )}
              Cetak dan Export
              <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            <Upload />
            Import dari Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExport}>
            <Download />
            Export ke Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
