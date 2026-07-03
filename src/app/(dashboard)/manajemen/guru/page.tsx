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
import GuruFormDialog from "@/components/guru/GuruFormDialog"
import GuruDetailDialog from "@/components/guru/GuruDetailDialog"
import ConfirmDialog from "@/components/shared/ConfirmDialog"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"

interface GuruItem {
  id: string
  nipnuptk: string | null
  nik: string | null
  namaLengkap: string
  jenisKelamin: string | null
  tempatLahir: string | null
  tanggalLahir: Date | string | null
  alamat: string | null
  noHp: string | null
  email: string | null
  pendidikanTerakhir: string | null
  statusKepegawaian: string | null
  kategoriPegawai: string | null
  tugasUtama: string | null
  tugasTambahan: string | null
  mulaiBertugas: Date | string | null
  akhirBertugas: Date | string | null
  jp: number | null
  foto: string | null
  active: boolean | null
  usernameGuru: string | null
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

export default function GuruPage() {
  const [search, setSearch] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [page, setPage] = useState(0)
  const limit = 25

  const { data: guruList, isLoading } = api.guru.getAll.useQuery({
    search: querySearch || undefined,
    limit,
    offset: page * limit,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editingGuru, setEditingGuru] = useState<GuruItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const removeMutation = api.guru.remove.useMutation({
    onSuccess: () => {
      toast.success("Data guru berhasil dihapus")
      setDeleteId(null)
    },
    onError: () => toast.error("Gagal menghapus data guru"),
  })

  const bulkCreateMutation = api.guru.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.length} data guru berhasil diimport`)
      setImporting(false)
      utils.guru.getAll.invalidate()
    },
    onError: (err) => {
      toast.error(err.message || "Gagal mengimport data guru")
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
    setEditingGuru(null)
    setFormOpen(true)
  }

  const handleEdit = (g: GuruItem) => {
    setEditingGuru(g)
    setFormOpen(true)
  }

  const handleView = (g: GuruItem) => {
    setDetailId(g.id)
    setDetailOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await removeMutation.mutateAsync({ id: deleteId })
  }

  const handleFormSuccess = () => {
    setFormOpen(false)
    utils.guru.getAll.invalidate()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const [res, sekolah, aktifTa] = await Promise.all([
        utils.client.guru.getAllExport.query({ search: querySearch || undefined }),
        utils.client.lembaga.getSekolah.query(),
        utils.client.lembaga.getActiveTahunAjaran.query(),
      ])

      const keys = [
        "No", "NIP/NUPTK", "NIK", "Nama Lengkap", "Jenis Kelamin",
        "Tempat Lahir", "Tanggal Lahir", "Alamat", "No HP", "Email",
        "Pendidikan Terakhir", "Status Kepegawaian", "Kategori Pegawai",
        "Tugas Utama", "Tugas Tambahan", "Username", "Status",
      ]

      const dataRows = res.map((g: any, i: number) => [
        i + 1,
        g.nipnuptk || "",
        g.nik || "",
        g.namaLengkap || "",
        g.jenisKelamin === "L" ? "Laki-laki" : g.jenisKelamin === "P" ? "Perempuan" : "",
        g.tempatLahir || "",
        g.tanggalLahir ? new Date(g.tanggalLahir).toLocaleDateString("id-ID") : "",
        g.alamat || "",
        g.noHp || "",
        g.email || "",
        g.pendidikanTerakhir || "",
        g.statusKepegawaian || "",
        g.kategoriPegawai || "",
        g.tugasUtama || "",
        g.tugasTambahan || "",
        g.usernameGuru || "",
        g.active !== false ? "Aktif" : "Non Aktif",
      ])

      const taLabel = aktifTa?.namaTahunAjaran ? ` Tahun Ajaran ${aktifTa.namaTahunAjaran}${aktifTa.semester ? ` Semester ${aktifTa.semester.charAt(0).toUpperCase() + aktifTa.semester.slice(1)}` : ""}` : ""
      const titleText = `Data Guru${taLabel}`

      const totalCols = keys.length
      const headerRows: (string | number)[][] = [
        [sekolah?.namaSekolah || "SEKOLAH"],
        [sekolah?.alamat || ""],
        [titleText],
        [],
        keys,
      ]

      const wb = XLSX.utils.book_new()
      const aoa = [...headerRows, ...dataRows]
      const ws = XLSX.utils.aoa_to_sheet(aoa)

      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      ]

      ws["!cols"] = keys.map((key) => ({
        wch: Math.max(key.length, 12),
      }))

      ws["!rows"] = [
        { hpt: 30 },
        { hpt: 18 },
        { hpt: 22 },
        { hpt: 8 },
        { hpt: 18 },
      ]

      XLSX.utils.book_append_sheet(wb, ws, "Data Guru")
      XLSX.writeFile(wb, `data_guru_${new Date().toISOString().split("T")[0]}.xlsx`)
      toast.success(`Data berhasil diexport (${res.length} guru)`)
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
        nipnuptk: String(row["NIP/NUPTK"] || "").trim() || undefined,
        nik: String(row.NIK || "").trim() || undefined,
        namaLengkap: String(row["Nama Lengkap"] || "").trim(),
        jenisKelamin: (String(row["Jenis Kelamin"] || "").trim() === "Laki-laki" ? "L" : String(row["Jenis Kelamin"] || "").trim() === "Perempuan" ? "P" : undefined) as "L" | "P" | undefined,
        tempatLahir: String(row["Tempat Lahir"] || "").trim() || undefined,
        alamat: String(row.Alamat || "").trim() || undefined,
        noHp: String(row["No HP"] || "").trim() || undefined,
        email: String(row.Email || "").trim() || undefined,
        pendidikanTerakhir: String(row["Pendidikan Terakhir"] || "").trim() || undefined,
        statusKepegawaian: String(row["Status Kepegawaian"] || "").trim() || undefined,
        kategoriPegawai: String(row["Kategori Pegawai"] || "Guru").trim() || undefined,
        tugasUtama: String(row["Tugas Utama"] || "").trim() || undefined,
        tugasTambahan: String(row["Tugas Tambahan"] || "").trim() || undefined,
        usernameGuru: String(row.Username || "").trim() || undefined,
        active: String(row.Status || "").trim().toLowerCase() !== "non aktif",
      })).filter((r) => r.namaLengkap)

      if (mapped.length === 0) {
        toast.error("Tidak ada data valid ditemukan di file Excel")
        setImporting(false)
        return
      }

      const confirmed = confirm(`Import ${mapped.length} data guru?`)
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

  const hasMore = guruList ? guruList.length >= limit : false
  const totalPages = hasMore ? page + 2 : page + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Data Guru & Tendik</h2>
          <p className="text-muted-foreground">Kelola data guru dan tenaga kependidikan</p>
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
            Tambah Guru
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Cari nama, NIP/NUPTK..."
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
                <TableHead className="min-w-[130px]">NIP/NUPTK</TableHead>
                <TableHead className="min-w-[160px]">Nama Lengkap</TableHead>
                <TableHead className="min-w-[130px]">Tugas Utama</TableHead>
                <TableHead className="min-w-[50px]">JK</TableHead>
                <TableHead className="min-w-[110px]">No HP</TableHead>
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
              ) : !guruList || guruList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada data guru
                  </TableCell>
                </TableRow>
              ) : (
                guruList.map((g, index) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground text-sm">{page * limit + index + 1}</TableCell>
                    <TableCell className="font-mono text-sm tracking-wider">{g.nipnuptk || "-"}</TableCell>
                    <TableCell className="font-medium">{g.namaLengkap}</TableCell>
                    <TableCell>{g.tugasUtama || "-"}</TableCell>
                    <TableCell>{g.jenisKelamin === "L" ? "L" : g.jenisKelamin === "P" ? "P" : "-"}</TableCell>
                    <TableCell>{g.noHp || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={g.active !== false ? "default" : "secondary"} className={g.active !== false ? "bg-green-600 text-white" : ""}>
                        {g.active !== false ? "Aktif" : "Non Aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger delay={0}>
                            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded-md">
                              <MoreHorizontal className="h-4 w-4" />
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipPortal>
                            <TooltipPositioner>
                              <TooltipPopup>Aksi</TooltipPopup>
                            </TooltipPositioner>
                          </TooltipPortal>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleView(g)} className="gap-2 clickable">
                            <Eye className="h-4 w-4" /> Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(g)} className="gap-2 clickable">
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(g.id)}
                            className="gap-2 clickable text-destructive focus:text-destructive"
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

        {guruList && guruList.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {guruList.length} data
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

      <GuruFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialData={editingGuru}
        onSuccess={handleFormSuccess}
      />

      {detailId && (
        <GuruDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          guruId={detailId}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Hapus Data Guru"
        description="Apakah Anda yakin ingin menghapus data guru ini? Tindakan ini tidak dapat dibatalkan."
        onConfirm={handleDelete}
        loading={removeMutation.isPending}
      />
    </div>
  )
}
