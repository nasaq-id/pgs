"use client"

import { useState, useRef } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Upload, Download, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import SiswaFormDialog from "@/components/siswa/SiswaFormDialog"
import SiswaDetailDialog from "@/components/siswa/SiswaDetailDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { toast } from "sonner"
import * as XLSX from "xlsx"

interface SiswaItem {
  id: string
  nisn: string | null
  nisLokal: string | null
  namaLengkap: string
  jenisKelamin: string | null
  tempatLahir: string | null
  tanggalLahir: Date | string | null
  nik: string | null
  agama: string | null
  alamat: string | null
  status: string | null
  foto: string | null
  kelasId: string | null
  emailSiswa: string | null
  noHpOrtu: string | null
}

function getPaginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | "...")[] = [1]
  if (current > 3) pages.push("...")
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push("...")
  pages.push(total)
  return pages
}

export default function SiswaPage() {
  const [search, setSearch] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [page, setPage] = useState(0)
  const limit = 25

  const { data: siswaList, isLoading } = api.siswa.getAll.useQuery({
    search: querySearch || undefined,
    limit,
    offset: page * limit,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingSiswa, setEditingSiswa] = useState<SiswaItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const removeMutation = api.siswa.remove.useMutation({
    onSuccess: () => {
      toast.success("Data siswa berhasil dihapus")
      setDeleteId(null)
    },
    onError: () => toast.error("Gagal menghapus data siswa"),
  })

  const bulkCreateMutation = api.siswa.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.length} data siswa berhasil diimport`)
      setImporting(false)
      utils.siswa.getAll.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengimport data siswa")
      setImporting(false)
    },
  })

  const utils = api.useUtils()

  const handleSearch = () => {
    setPage(0)
    setQuerySearch(search)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  const handleCreate = () => {
    setEditingSiswa(null)
    setFormOpen(true)
  }

  const handleEdit = (s: SiswaItem) => {
    setEditingSiswa(s)
    setFormOpen(true)
  }

  const handleView = (s: SiswaItem) => {
    setDetailId(s.id)
    setDetailOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    utils.siswa.getAll.invalidate()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await utils.client.siswa.getAllExport.query({ search: querySearch || undefined })
      const ws = XLSX.utils.json_to_sheet(res.map((s: any, i: number) => ({
        No: i + 1,
        NISN: s.nisn || "",
        "NIS Lokal": s.nisLokal || "",
        "Nama Lengkap": s.namaLengkap || "",
        "Jenis Kelamin": s.jenisKelamin === "L" ? "Laki-laki" : s.jenisKelamin === "P" ? "Perempuan" : "",
        "Tempat Lahir": s.tempatLahir || "",
        "Tanggal Lahir": s.tanggalLahir ? new Date(s.tanggalLahir).toLocaleDateString("id-ID") : "",
        NIK: s.nik || "",
        Agama: s.agama || "",
        Alamat: s.alamat || "",
        "No HP/WA": s.noHpWhatsapp || s.noHpOrtu || "",
        Email: s.emailSiswa || "",
        Status: s.status || "",
        Hobi: s.hobi || "",
        "Cita-cita": s.citacita || "",
        "Pembiayaan Sekolah": s.pembiayaanSekolah || "",
        "No KK": s.noKartuKeluarga || "",
        "Nama Kepala Keluarga": s.namaKepalaKeluarga || "",
        "Nama Ayah": s.namaAyah || "",
        "Status Ayah": s.statusAyah || "",
        "NIK Ayah": s.nikAyah || "",
        "Tempat Lahir Ayah": s.tempatLahirAyah || "",
        "Tanggal Lahir Ayah": s.tanggalLahirAyah ? new Date(s.tanggalLahirAyah).toLocaleDateString("id-ID") : "",
        "Pendidikan Ayah": s.pendidikanAyah || "",
        "Pekerjaan Ayah": s.pekerjaanAyah || "",
        "Penghasilan Ayah": s.penghasilanAyah || "",
        "No HP Ayah": s.noHpAyah || "",
        "Nama Ibu": s.namaIbu || "",
        "Status Ibu": s.statusIbu || "",
        "NIK Ibu": s.nikIbu || "",
        "Tempat Lahir Ibu": s.tempatLahirIbu || "",
        "Tanggal Lahir Ibu": s.tanggalLahirIbu ? new Date(s.tanggalLahirIbu).toLocaleDateString("id-ID") : "",
        "Pendidikan Ibu": s.pendidikanIbu || "",
        "Pekerjaan Ibu": s.pekerjaanIbu || "",
        "Penghasilan Ibu": s.penghasilanIbu || "",
        "No HP Ibu": s.noHpIbu || "",
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Data Siswa")
      XLSX.writeFile(wb, `data_siswa_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success("Data berhasil diexport")
    } catch {
      toast.error("Gagal mengexport data")
    } finally {
      setExporting(false)
    }
  }

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)
      const mapped = rows.map((row: any) => ({
        nisn: String(row.NISN || "").trim(),
        nisLokal: String(row["NIS Lokal"] || "").trim() || undefined,
        namaLengkap: String(row["Nama Lengkap"] || row.NamaLengkap || "").trim(),
        jenisKelamin: (String(row["Jenis Kelamin"] || "").trim() === "Laki-laki" ? "L" : String(row["Jenis Kelamin"] || "").trim() === "Perempuan" ? "P" : undefined) as "L" | "P" | undefined,
        tempatLahir: String(row["Tempat Lahir"] || "").trim() || undefined,
        nik: String(row.NIK || "").trim() || undefined,
        agama: String(row.Agama || "").trim() || undefined,
        alamat: String(row.Alamat || "").trim() || undefined,
        noHpWhatsapp: String(row["No HP/WA"] || "").trim() || undefined,
        emailSiswa: String(row.Email || "").trim() || undefined,
        status: (String(row.Status || "aktif").trim().toLowerCase() as "aktif" | "lulus" | "pindah" | "keluar") || "aktif",
        hobi: String(row.Hobi || "").trim() || undefined,
        citacita: String(row["Cita-cita"] || "").trim() || undefined,
        pembiayaanSekolah: String(row["Pembiayaan Sekolah"] || "").trim() || undefined,
        noKartuKeluarga: String(row["No KK"] || "").trim() || undefined,
        namaKepalaKeluarga: String(row["Nama Kepala Keluarga"] || "").trim() || undefined,
        namaAyah: String(row["Nama Ayah"] || "").trim() || undefined,
        statusAyah: String(row["Status Ayah"] || "").trim() || undefined,
        nikAyah: String(row["NIK Ayah"] || "").trim() || undefined,
        tempatLahirAyah: String(row["Tempat Lahir Ayah"] || "").trim() || undefined,
        pendidikanAyah: String(row["Pendidikan Ayah"] || "").trim() || undefined,
        pekerjaanAyah: String(row["Pekerjaan Ayah"] || "").trim() || undefined,
        penghasilanAyah: String(row["Penghasilan Ayah"] || "").trim() || undefined,
        noHpAyah: String(row["No HP Ayah"] || "").trim() || undefined,
        namaIbu: String(row["Nama Ibu"] || "").trim() || undefined,
        statusIbu: String(row["Status Ibu"] || "").trim() || undefined,
        nikIbu: String(row["NIK Ibu"] || "").trim() || undefined,
        tempatLahirIbu: String(row["Tempat Lahir Ibu"] || "").trim() || undefined,
        pendidikanIbu: String(row["Pendidikan Ibu"] || "").trim() || undefined,
        pekerjaanIbu: String(row["Pekerjaan Ibu"] || "").trim() || undefined,
        penghasilanIbu: String(row["Penghasilan Ibu"] || "").trim() || undefined,
        noHpIbu: String(row["No HP Ibu"] || "").trim() || undefined,
      })).filter((r) => r.namaLengkap && r.nisn)

      if (mapped.length === 0) {
        toast.error("Tidak ada data valid ditemukan di file Excel")
        setImporting(false)
        return
      }

      const confirmed = confirm(`Import ${mapped.length} data siswa?`)
      if (!confirmed) {
        setImporting(false)
        return
      }

      await bulkCreateMutation.mutateAsync({ data: mapped })
    } catch {
      toast.error("Gagal membaca file Excel")
      setImporting(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const hasMore = siswaList ? siswaList.length >= limit : false
  const totalPages = hasMore ? page + 2 : page + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Siswa</h2>
          <p className="text-muted-foreground">Kelola data siswa sekolah</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileImport}
          />
          <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Siswa
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cari nama atau NISN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="max-w-sm"
            />
            <Button variant="secondary" size="sm" onClick={handleSearch}>
              Cari
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead className="min-w-[120px]">NISN</TableHead>
                <TableHead className="min-w-[160px]">Nama Lengkap</TableHead>
                <TableHead className="min-w-[50px]">JK</TableHead>
                <TableHead className="min-w-[100px]">Tempat Lahir</TableHead>
                <TableHead className="min-w-[110px]">Tanggal Lahir</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="text-right w-20">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !siswaList || siswaList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada data siswa
                  </TableCell>
                </TableRow>
              ) : (
                siswaList.map((s, index) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-muted-foreground text-sm">{page * limit + index + 1}</TableCell>
                    <TableCell className="font-mono text-sm tracking-wider">{s.nisn || "-"}</TableCell>
                    <TableCell className="font-medium">{s.namaLengkap}</TableCell>
                    <TableCell>{s.jenisKelamin === "L" ? "L" : s.jenisKelamin === "P" ? "P" : "-"}</TableCell>
                    <TableCell>{s.tempatLahir || "-"}</TableCell>
                    <TableCell>
                      {s.tanggalLahir
                        ? new Date(s.tanggalLahir).toLocaleDateString("id-ID")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "aktif" ? "default" : "secondary"} className={s.status === "aktif" ? "bg-green-600 text-white" : ""}>
                        {s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded-md">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleView(s)} className="gap-2 cursor-pointer">
                            <Eye className="h-4 w-4" /> Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(s)} className="gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(s.id)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Hapus
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {siswaList && siswaList.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {siswaList.length} data
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage(0)}>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationPages(page + 1, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`e-${i}`} className="px-1.5 text-muted-foreground text-sm">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={page + 1 === p ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setPage((p as number) - 1)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page + 1 >= totalPages} onClick={() => setPage(totalPages - 1)}>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <SiswaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingSiswa}
        onSuccess={handleFormSuccess}
      />

      {detailId && (
        <SiswaDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          siswaId={detailId}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Data Siswa"
        description="Apakah Anda yakin ingin menghapus data siswa ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        loading={removeMutation.isPending}
      />
    </div>
  )
}
