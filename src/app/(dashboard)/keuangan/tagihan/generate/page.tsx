"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Sparkles } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function GenerateTagihanPage() {
  const router = useRouter()
  const [billingTypeId, setBillingTypeId] = useState("")
  const [kelasId, setKelasId] = useState("")
  const [periodeBulan, setPeriodeBulan] = useState(new Date().getMonth() + 1)
  const [periodeTahun, setPeriodeTahun] = useState(new Date().getFullYear())
  const [dueDate, setDueDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  const { data: billingTypes } = api.keuangan.settings.billingType.list.useQuery()
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })
  const { data: siswaList } = api.siswa.getAll.useQuery({})
  const generateMutation = api.keuangan.billing.generate.useMutation()

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
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/keuangan/tagihan" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Generate Tagihan</h2>
          <p className="text-muted-foreground">Buat tagihan massal per periode</p>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Jenis Tagihan</Label>
            <Select value={billingTypeId} onValueChange={(v) => v && setBillingTypeId(v)} options={billingTypes?.map((bt: any) => ({ value: bt.id, label: bt.name }))}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {billingTypes?.map((bt: any) => (
                  <SelectItem key={bt.id} value={bt.id}>{bt.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kelas (opsional)</Label>
            <Select value={kelasId} onValueChange={(v) => v && setKelasId(v)} options={kelasList?.map((k: any) => ({ value: k.id, label: `${k.tingkat || ""} ${k.namaKelas}` }))}>
              <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Kelas</SelectItem>
                {kelasList?.map((k: any) => (
                  <SelectItem key={k.id} value={k.id}>{k.tingkat || ""} {k.namaKelas}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Periode Bulan</Label>
            <Select value={String(periodeBulan)} onValueChange={(v) => setPeriodeBulan(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"].map((nama, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Jatuh Tempo</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Tahun</Label>
          <Input type="number" value={periodeTahun} onChange={(e) => setPeriodeTahun(Number(e.target.value))} className="w-32" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Target: <strong>{targetSiswa.length} siswa</strong>
            {kelasId && ` (filter kelas)`}
          </p>
          <Button onClick={handleGenerate} disabled={saving || !billingTypeId}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate Tagihan
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Hasil Generate</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
              <p className="text-xs text-muted-foreground">Tagihan Dibuat</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
              <p className="text-2xl font-bold text-amber-600">{result.skipped}</p>
              <p className="text-xs text-muted-foreground">Skip (sudah ada)</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.push("/keuangan/tagihan")}>
            Lihat Tagihan
          </Button>
        </Card>
      )}
    </div>
  )
}
