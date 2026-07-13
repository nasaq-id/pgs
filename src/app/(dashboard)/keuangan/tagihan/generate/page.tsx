"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Sparkles, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

export default function GenerateTagihanPage() {
  const router = useRouter()
  const [billingTypeId, setBillingTypeId] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [periodeBulan, setPeriodeBulan] = useState(new Date().getMonth() + 1)
  const [periodeTahun, setPeriodeTahun] = useState(new Date().getFullYear())
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)
  const [warningOpen, setWarningOpen] = useState(false)

  const { data: billingTypes } = api.keuangan.settings.billingType.list.useQuery()
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })
  const { data: siswaList } = api.siswa.getAll.useQuery({})
  const generateMutation = api.keuangan.billing.generate.useMutation()

  useEffect(() => {
    if (billingTypes && billingTypes.length === 0) {
      setWarningOpen(true)
    }
  }, [billingTypes])

  const targetSiswa = useMemo(() => {
    if (!siswaList) return []
    if (!kelasId) return siswaList
    return siswaList.filter((s: any) => s.kelasId === kelasId)
  }, [siswaList, kelasId])

  const handleGenerate = async () => {
    if (!billingTypeId) { toast.error("Pilih jenis tagihan"); return }
    if (!dueDate) { toast.error("Isi tanggal jatuh tempo"); return }

    setSaving(true)
    try {
      const res = await generateMutation.mutateAsync({
        billingTypeId,
        kelasId: kelasId || undefined,
        periodeBulan,
        periodeTahun,
        dueDate: new Date(dueDate),
      })
      setResult({ created: res.created, skipped: res.skipped })
      toast.success(`${res.created} tagihan berhasil dibuat`)
    } catch (err: any) {
      toast.error(err?.message || "Gagal generate tagihan")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center gap-3">
        <Link href="/keuangan/tagihan" className="text-slate-450 hover:text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Generate Tagihan</h2>
          <p className="text-xs text-slate-450 font-bold mt-1">Buat tagihan massal per periode</p>
        </div>
      </div>

      <Card className="glass-card rounded-[26px] p-6 space-y-4 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Jenis Tagihan</Label>
            <Select value={billingTypeId} onValueChange={(v) => v && setBillingTypeId(v)} options={billingTypes?.map((bt: any) => ({ value: bt.id, label: bt.name }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Pilih jenis tagihan" /></SelectTrigger>
              <SelectContent>
                {billingTypes?.map((bt: any) => (
                  <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Kelas (opsional)</Label>
            <Select value={kelasId} onValueChange={(v) => v && setKelasId(v)} options={kelasList?.map((k: any) => ({ value: k.id, label: `${k.tingkat || ""} ${k.namaKelas}` }))}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kelas</SelectItem>
                {kelasList?.map((k: any) => (
                  <SelectItem key={k.id} value={k.id}>{k.tingkat || ""} {k.namaKelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1.5">Periode Bulan</Label>
            <Select value={String(periodeBulan)} onValueChange={(v) => setPeriodeBulan(Number(v))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((nama, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5 max-w-[150px]">
          <Label className="block text-[9px] font-black text-slate-450 uppercase tracking-widest mb-1">Tahun</Label>
          <Input type="number" value={periodeTahun} onChange={(e) => setPeriodeTahun(Number(e.target.value))} />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <p className="text-xs text-slate-450 font-bold uppercase tracking-wider">
            Target: <span className="text-teal-650 font-extrabold">{targetSiswa.length} siswa</span>
            {kelasId && ` (filter kelas)`}
          </p>
          <button
            onClick={handleGenerate}
            disabled={saving || !billingTypeId}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            <span>Generate Tagihan</span>
          </button>
        </div>
      </Card>

      {result && (
        <Card className="glass-card rounded-[26px] p-6 space-y-4 border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Hasil Generate</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-550/10 border border-emerald-100/50 text-center">
              <p className="text-2xl font-black text-emerald-600">{result.created}</p>
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mt-1">Tagihan Dibuat</p>
            </div>
            <div className="p-4 rounded-2xl bg-amber-550/10 border border-amber-100/50 text-center">
              <p className="text-2xl font-black text-amber-600">{result.skipped}</p>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wider mt-1">Skip (sudah ada)</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/keuangan/tagihan")}
            className="w-full py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
          >
            Lihat Tagihan
          </button>
        </Card>
      )}

      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent className="sm:max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden">
          <div className="p-6 relative text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-550/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-2">Jenis Tagihan Belum Dibuat</h3>
            <p className="text-xs text-slate-450 font-bold mb-6">
              Anda belum membuat jenis tagihan di menu Pengaturan Keuangan. Silakan buat jenis tagihan terlebih dahulu sebelum melakukan generate tagihan.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/keuangan/tagihan")}
                className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-550 text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => router.push("/keuangan/pengaturan")}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Atur Sekarang
              </button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
