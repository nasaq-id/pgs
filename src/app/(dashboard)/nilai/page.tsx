"use client"

import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface NilaiRecord {
  id?: string
  siswaId: string
  nilaiTugas: number | null
  nilaiUts: number | null
  nilaiUas: number | null
  nilaiAkhir: number | null
}

export default function NilaiPage() {
  const [kelasId, setKelasId] = useState("")
  const [mataPelajaranId, setMataPelajaranId] = useState("")
  const [nilaiMap, setNilaiMap] = useState<Record<string, NilaiRecord>>({})
  const [saving, setSaving] = useState(false)

  const { data: kelasList } = api.kelas.getAll.useQuery({})
  const { data: mapelList } = api.mapel.getAll.useQuery({})
  const { data: siswaAll } = api.siswa.getAll.useQuery({})

  const nilaiQuery = api.nilai.getByKelas.useQuery(
    { kelasId, mataPelajaranId: mataPelajaranId || undefined },
    { enabled: !!kelasId && !!mataPelajaranId },
  )

  const createNilai = api.nilai.create.useMutation()
  const updateNilai = api.nilai.update.useMutation()

  const siswaDiKelas = (siswaAll || []).filter((s) => s.kelasId === kelasId)

  useEffect(() => {
    if (nilaiQuery.data && nilaiQuery.data.length > 0) {
      const map: Record<string, NilaiRecord> = {}
      for (const n of nilaiQuery.data) {
        map[n.siswaId] = {
          id: n.id,
          siswaId: n.siswaId,
          nilaiTugas: n.nilaiTugas,
          nilaiUts: n.nilaiUts,
          nilaiUas: n.nilaiUas,
          nilaiAkhir: n.nilaiAkhir,
        }
      }
      setNilaiMap(map)
    } else if (nilaiQuery.isFetched) {
      const map: Record<string, NilaiRecord> = {}
      for (const s of siswaDiKelas) {
        map[s.id] = { siswaId: s.id, nilaiTugas: null, nilaiUts: null, nilaiUas: null, nilaiAkhir: null }
      }
      setNilaiMap(map)
    }
  }, [nilaiQuery.data, nilaiQuery.isFetched, siswaDiKelas])

  useEffect(() => {
    if (kelasId && mataPelajaranId && !nilaiQuery.isLoading) {
      if (!nilaiQuery.data || nilaiQuery.data.length === 0) {
        const map: Record<string, NilaiRecord> = {}
        for (const s of siswaDiKelas) {
          map[s.id] = { siswaId: s.id, nilaiTugas: null, nilaiUts: null, nilaiUas: null, nilaiAkhir: null }
        }
        setNilaiMap(map)
      }
    }
  }, [kelasId, mataPelajaranId, siswaDiKelas])

  const updateNilaiField = useCallback((siswaId: string, field: "nilaiTugas" | "nilaiUts" | "nilaiUas", value: string) => {
    const num = value === "" ? null : Math.min(100, Math.max(0, parseInt(value) || 0))
    setNilaiMap((prev) => {
      const record = prev[siswaId] || { siswaId, nilaiTugas: null, nilaiUts: null, nilaiUas: null, nilaiAkhir: null }
      const updated = { ...record, [field]: num }
      const tugas = updated.nilaiTugas ?? 0
      const uts = updated.nilaiUts ?? 0
      const uas = updated.nilaiUas ?? 0
      updated.nilaiAkhir = tugas + uts + uas > 0 ? Math.round((tugas + uts + uas) / 3) : null
      return { ...prev, [siswaId]: updated }
    })
  }, [])

  const handleSave = async () => {
    if (!kelasId || !mataPelajaranId) {
      toast.error("Pilih kelas dan mata pelajaran terlebih dahulu")
      return
    }

    setSaving(true)
    try {
      const existingMap = new Map((nilaiQuery.data || []).map((n) => [n.siswaId, n]))
      const errors: string[] = []

      for (const s of siswaDiKelas) {
        const record = nilaiMap[s.id]
        if (!record) continue
        const data = {
          siswaId: s.id,
          mataPelajaranId,
          nilaiTugas: record.nilaiTugas,
          nilaiUts: record.nilaiUts,
          nilaiUas: record.nilaiUas,
          nilaiAkhir: record.nilaiAkhir,
        }
        try {
          const existing = existingMap.get(s.id)
          if (existing) {
            await updateNilai.mutateAsync({ id: existing.id, data })
          } else {
            await createNilai.mutateAsync(data)
          }
        } catch {
          errors.push(s.namaLengkap)
        }
      }

      if (errors.length === 0) {
        toast.success("Nilai berhasil disimpan")
        nilaiQuery.refetch()
      } else {
        toast.error(`Gagal menyimpan nilai untuk: ${errors.join(", ")}`)
      }
    } catch {
      toast.error("Gagal menyimpan nilai")
    }
    setSaving(false)
  }

  const isLoading = nilaiQuery.isLoading

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Penilaian</h2>
          <p className="text-muted-foreground">Kelola nilai dan penilaian siswa</p>
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

          <Select value={mataPelajaranId} onValueChange={(v) => setMataPelajaranId(v ?? "")}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Pilih Mapel" />
            </SelectTrigger>
            <SelectContent>
              {mapelList?.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.namaMapel}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="sm:ml-auto">
            <Button onClick={handleSave} disabled={!kelasId || !mataPelajaranId || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Save className="h-4 w-4 mr-2" /> Simpan Nilai
            </Button>
          </div>
        </div>
      </Card>

      {!kelasId || !mataPelajaranId ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Pilih Kelas & Mapel</h3>
            <p className="text-sm text-muted-foreground">Pilih kelas dan mata pelajaran untuk mulai menilai.</p>
          </div>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
        </div>
      ) : siswaDiKelas.length === 0 ? (
        <Card className="p-12">
          <p className="text-sm text-muted-foreground text-center">Tidak ada siswa di kelas ini.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>NISN</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead className="w-24 text-center">Nilai Tugas</TableHead>
                <TableHead className="w-24 text-center">Nilai UTS</TableHead>
                <TableHead className="w-24 text-center">Nilai UAS</TableHead>
                <TableHead className="w-24 text-center font-bold">Nilai Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siswaDiKelas.map((s, idx) => {
                const record = nilaiMap[s.id] || { nilaiTugas: null, nilaiUts: null, nilaiUas: null, nilaiAkhir: null }
                return (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{s.nisn}</TableCell>
                    <TableCell className="font-medium">{s.namaLengkap}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={record.nilaiTugas ?? ""}
                        onChange={(e) => updateNilaiField(s.id, "nilaiTugas", e.target.value)}
                        className="h-8 text-center w-20 mx-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={record.nilaiUts ?? ""}
                        onChange={(e) => updateNilaiField(s.id, "nilaiUts", e.target.value)}
                        className="h-8 text-center w-20 mx-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={record.nilaiUas ?? ""}
                        onChange={(e) => updateNilaiField(s.id, "nilaiUas", e.target.value)}
                        className="h-8 text-center w-20 mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center font-bold text-lg">
                      {record.nilaiAkhir !== null ? (
                        <span className={record.nilaiAkhir >= 75 ? "text-primary" : "text-destructive"}>
                          {record.nilaiAkhir}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
