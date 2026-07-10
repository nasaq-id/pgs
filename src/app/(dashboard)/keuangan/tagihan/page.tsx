"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import FilterBar from "@/components/keuangan/FilterBar"
import { DollarSign, Search, Plus, ArrowRight } from "lucide-react"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  issued: "default",
  partially_paid: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  issued: "Belum Dibayar",
  partially_paid: "Sebagian",
  paid: "Lunas",
  overdue: "Tertunggak",
  cancelled: "Dibatalkan",
}

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

export default function TagihanPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [kelasFilter, setKelasFilter] = useState("all")
  const [siswaId, setSiswaId] = useState("")

  const { data: siswaList, isLoading: siswaLoading } = api.siswa.getAll.useQuery({})
  const { data: kelasList } = api.kelas.getAll.useQuery({ limit: 100 })
  const { data: invoices, isLoading: invLoading } = api.keuangan.billing.getAll.useQuery({ limit: 500 })
  const { data: billingTypes } = api.keuangan.settings.billingType.list.useQuery()

  const siswaWithInvoice = useMemo(() => {
    if (!siswaList || !invoices) return []
    const invBySiswa = new Map<string, { total: number; paid: number; status: string; dueDate: string }>()
    for (const inv of invoices) {
      const existing = invBySiswa.get(inv.studentId)
      const total = Number(inv.totalAmount)
      const paid = Number(inv.paidAmount)
      if (existing) {
        existing.total += total
        existing.paid += paid
        if (inv.status === "overdue") existing.status = "overdue"
        else if (inv.status === "issued" && existing.status !== "overdue") existing.status = "issued"
        else if (inv.status === "partially_paid" && existing.status !== "overdue" && existing.status !== "issued") existing.status = "partially_paid"
      } else {
        invBySiswa.set(inv.studentId, { total, paid, status: inv.status, dueDate: inv.dueDate })
      }
    }

    return siswaList
      .map((s) => ({
        id: s.id,
        nama: s.namaLengkap,
        kelasId: s.kelasId || "",
        nisn: s.nisn,
        tagihan: invBySiswa.get(s.id) || null,
      }))
      .filter((s) => {
        if (statusFilter === "all") return true
        if (statusFilter === "lunas") return s.tagihan?.status === "paid"
        if (statusFilter === "menunggak") return s.tagihan && s.tagihan.status !== "paid" && s.tagihan.status !== "cancelled"
        if (statusFilter === "belum") return !s.tagihan
        return true
      })
      .filter((s) => {
        if (kelasFilter === "all") return true
        return s.kelasId === kelasFilter
      })
      .filter((s) => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q)
      })
      .sort((a, b) => {
        const aUnpaid = a.tagihan ? a.tagihan.total - a.tagihan.paid : 0
        const bUnpaid = b.tagihan ? b.tagihan.total - b.tagihan.paid : 0
        return bUnpaid - aUnpaid
      })
  }, [siswaList, invoices, statusFilter, kelasFilter, search])

  const kelasOptions = useMemo(() => [
    { value: "all", label: "Semua Kelas" },
    ...(kelasList || []).map((k: any) => ({ value: k.id, label: `${k.tingkat || ""} ${k.namaKelas}` })),
  ], [kelasList])

  const isLoading = siswaLoading || invLoading

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tagihan</h2>
          <p className="text-muted-foreground">Daftar tagihan semua siswa</p>
        </div>
        <Link href="/keuangan/tagihan/generate">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Generate Tagihan
          </Button>
        </Link>
      </div>

      <Card className="p-3">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari siswa..."
          filters={[
            { key: "status", label: "Status", options: [
              { value: "all", label: "Semua Status" },
              { value: "lunas", label: "Lunas" },
              { value: "menunggak", label: "Menunggak" },
              { value: "belum", label: "Belum Ada Tagihan" },
            ], value: statusFilter, onChange: setStatusFilter },
            { key: "kelas", label: "Kelas", options: kelasOptions, value: kelasFilter, onChange: setKelasFilter },
          ]}
        />
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>NISN</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead className="text-right">Total Tagihan</TableHead>
                <TableHead className="text-right">Terbayar</TableHead>
                <TableHead className="text-right">Sisa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {siswaWithInvoice.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Tidak ada data siswa
                  </TableCell>
                </TableRow>
              ) : (
                siswaWithInvoice.map((s) => {
                  const sisa = s.tagihan ? s.tagihan.total - s.tagihan.paid : 0
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.nama}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.nisn}</TableCell>
                      <TableCell className="text-xs">{kelasList?.find((k: any) => k.id === s.kelasId)?.namaKelas || "-"}</TableCell>
                      <TableCell className="text-right">{s.tagihan ? fmtRupiah(s.tagihan.total) : "-"}</TableCell>
                      <TableCell className="text-right">{s.tagihan ? fmtRupiah(s.tagihan.paid) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{s.tagihan ? fmtRupiah(sisa) : "-"}</TableCell>
                      <TableCell>
                        {s.tagihan ? (
                          <Badge variant={STATUS_COLORS[s.tagihan.status] || "secondary"} className="text-xs">
                            {STATUS_LABEL[s.tagihan.status] || s.tagihan.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Belum Ada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Link
                          href={`/keuangan/tagihan/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Detail <ArrowRight className="h-3 w-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
