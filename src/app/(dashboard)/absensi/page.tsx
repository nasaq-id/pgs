"use client"

import { useState, useCallback, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ClipboardCheck, Save, Loader2, Calendar } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"

type StatusAbsensi = "hadir" | "izin" | "sakit" | "alpha"

const STATUS_OPTIONS: { value: StatusAbsensi; label: string }[] = [
  { value: "hadir", label: "Hadir" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alpha", label: "Alpha" },
]

const STATUS_COLORS: Record<StatusAbsensi, string> = {
  hadir: "bg-primary/10 text-primary border-primary/20",
  izin: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  sakit: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  alpha: "bg-destructive/10 text-destructive border-destructive/20",
}

export default function AbsensiPage() {
  const { data: session } = useSession()
  const [kelasId, setKelasId] = useState("")
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split("T")[0])
  const [records, setRecords] = useState<Record<string, StatusAbsensi>>({})
  const [siswaList, setSiswaList] = useState<any[]>([])

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: siswaAll } = api.siswa.getAll.useQuery({})

  const absensiQuery = api.absensi.getByKelas.useQuery(
    { kelasId, tanggal: new Date(tanggal + "T00:00:00") },
    { enabled: !!kelasId && !!tanggal },
  )

  const createAbsensi = api.absensi.create.useMutation()
  const updateAbsensi = api.absensi.update.useMutation()

  const siswaDiKelas = (siswaAll || []).filter((s) => s.kelasId === kelasId)

  useEffect(() => {
    if (absensiQuery.data && absensiQuery.data.length > 0) {
      const map: Record<string, StatusAbsensi> = {}
      for (const r of absensiQuery.data) {
        map[r.siswaId] = r.status as StatusAbsensi
      }
      setRecords(map)
    } else if (absensiQuery.isFetched) {
      const map: Record<string, StatusAbsensi> = {}
      for (const s of siswaDiKelas) {
        map[s.id] = "hadir"
      }
      setRecords(map)
    }
  }, [absensiQuery.data, absensiQuery.isFetched, siswaDiKelas.length])

  useEffect(() => {
    setSiswaList(siswaDiKelas)
    if (kelasId && tanggal && !absensiQuery.isLoading) {
      if (!absensiQuery.data || absensiQuery.data.length === 0) {
        const map: Record<string, StatusAbsensi> = {}
        for (const s of siswaDiKelas) {
          map[s.id] = "hadir"
        }
        setRecords(map)
      }
    }
  }, [kelasId, tanggal, siswaDiKelas])

  const updateStatus = useCallback((siswaId: string, status: StatusAbsensi) => {
    setRecords((prev) => ({ ...prev, [siswaId]: status }))
  }, [])

  const handleSave = async () => {
    if (!kelasId || !tanggal) {
      toast.error("Pilih kelas dan tanggal terlebih dahulu")
      return
    }

    try {
      const tanggalDate = new Date(tanggal + "T00:00:00")
      const existingMap = new Map((absensiQuery.data || []).map((r) => [r.siswaId, r]))
      const toCreate: any[] = []
      const toUpdate: { id: string; status: StatusAbsensi }[] = []

      for (const s of siswaList) {
        const status = records[s.id] || "hadir"
        const existing = existingMap.get(s.id)
        if (existing) {
          if (existing.status !== status) {
            toUpdate.push({ id: existing.id, status })
          }
        } else {
          toCreate.push({
            siswaId: s.id,
            kelasId,
            tanggal: tanggalDate,
            status,
          })
        }
      }

      if (toCreate.length > 0) {
        await createAbsensi.mutateAsync({ absensi: toCreate })
      }
      for (const u of toUpdate) {
        await updateAbsensi.mutateAsync(u)
      }

      toast.success("Absensi berhasil disimpan")
      absensiQuery.refetch()
    } catch {
      toast.error("Gagal menyimpan absensi")
    }
  }

  const isLoading = absensiQuery.isLoading

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Absensi Siswa</h2>
          <p className="text-muted-foreground">Kelola absensi siswa harian</p>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap">
          <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              {kelasList?.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.namaKelas}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-9 w-[160px]" />
          </div>

          <div className="sm:ml-auto">
            <Button onClick={handleSave} disabled={!kelasId || !tanggal || createAbsensi.isPending}>
              {(createAbsensi.isPending || updateAbsensi.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" /> Simpan Absensi
            </Button>
          </div>
        </div>
      </Card>

      {!kelasId ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Pilih Kelas</h3>
            <p className="text-sm text-muted-foreground">Pilih kelas dan tanggal untuk memulai absensi.</p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
        </div>
      ) : siswaList.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">Tidak ada siswa di kelas ini.</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>NISN</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="text-center w-[400px]">Status Kehadiran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siswaList.map((s, idx) => (
                <TableRow key={s.id}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{s.nisn}</TableCell>
                  <TableCell className="font-medium">{s.namaLengkap}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateStatus(s.id, opt.value)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            records[s.id] === opt.value
                              ? STATUS_COLORS[opt.value]
                              : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
