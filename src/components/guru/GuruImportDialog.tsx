"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Upload, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface PreviewRow {
  row: number
  nama: string
  username: string
  jenisKelamin: string
  password: string
  valid: boolean
  errors: string[]
}

interface GuruImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: any[]) => Promise<void>
  importing: boolean
}

export default function GuruImportDialog({ open, onOpenChange, onImport, importing }: GuruImportDialogProps) {
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [fileName, setFileName] = useState("")
  const [activeTab, setActiveTab] = useState("preview")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    try {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      const mapped = rows.map((row: any, idx: number) => {
        const nama = String(row["Nama"] || "").trim()
        const username = String(row["Username"] || "").trim()
        const jenisKelamin = String(row["Jenis Kelamin"] || "").trim()
        const password = String(row["Password"] || "").trim()

        const errors: string[] = []
        if (!nama) errors.push("Nama tidak boleh kosong")
        if (!password) errors.push("Password tidak boleh kosong")
        if (jenisKelamin && !["Laki-laki", "Perempuan"].includes(jenisKelamin)) {
          errors.push("Jenis Kelamin harus 'Laki-laki' atau 'Perempuan'")
        }

        return {
          row: idx + 1,
          nama,
          username,
          jenisKelamin,
          password,
          valid: errors.length === 0,
          errors,
        }
      })

      setPreviewData(mapped)
      setParsedRows(rows)
      setActiveTab("preview")
    } catch {
      toast.error("Gagal membaca file Excel")
    }

    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleImport = async () => {
    const validData = parsedRows
      .map((row: any, idx: number) => {
        const p = previewData[idx]
        if (!p?.valid) return null
        return {
          namaLengkap: String(row["Nama"] || "").trim(),
          usernameGuru: String(row["Username"] || "").trim() || undefined,
          jenisKelamin: (String(row["Jenis Kelamin"] || "").trim() === "Laki-laki" ? "L" : String(row["Jenis Kelamin"] || "").trim() === "Perempuan" ? "P" : undefined) as "L" | "P" | undefined,
          passwordGuru: String(row["Password"] || "").trim(),
        }
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)

    if (validData.length === 0) {
      toast.error("Tidak ada data valid untuk diimport")
      return
    }

    await onImport(validData)
  }

  const handleClose = () => {
    setPreviewData([])
    setParsedRows([])
    setFileName("")
    onOpenChange(false)
  }

  const validCount = previewData.filter((p) => p.valid).length
  const invalidCount = previewData.length - validCount

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Data Guru</DialogTitle>
            <DialogDescription>
              Pilih file Excel untuk mengimport data guru
            </DialogDescription>
          </DialogHeader>

          {previewData.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Belum ada file dipilih</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Pilih File Excel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">{fileName}</span>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="preview">Preview Data</TabsTrigger>
                  <TabsTrigger value="invalid" disabled={invalidCount === 0}>
                    Data Tidak Valid ({invalidCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview">
                  <div className="rounded-md border overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Jenis Kelamin</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead className="w-20">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row) => (
                          <TableRow key={row.row} className={!row.valid ? "bg-destructive/5" : ""}>
                            <TableCell>{row.row}</TableCell>
                            <TableCell>{row.nama || <span className="text-destructive italic">(kosong)</span>}</TableCell>
                            <TableCell>{row.username || "-"}</TableCell>
                            <TableCell>{row.jenisKelamin || "-"}</TableCell>
                            <TableCell>{row.password ? "••••••" : <span className="text-destructive italic">(kosong)</span>}</TableCell>
                            <TableCell>
                              {row.valid ? (
                                <span className="text-green-600 text-xs">Valid</span>
                              ) : (
                                <span className="text-destructive text-xs" title={row.errors.join(", ")}>
                                  Tidak Valid
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {previewData.length} baris ditemukan, {validCount} valid
                  </p>
                </TabsContent>

                <TabsContent value="invalid">
                  <div className="rounded-md border overflow-x-auto max-h-80 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Nama</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead>Jenis Kelamin</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.filter((r) => !r.valid).map((row) => (
                          <TableRow key={row.row}>
                            <TableCell>{row.row}</TableCell>
                            <TableCell>{row.nama}</TableCell>
                            <TableCell>{row.username || "-"}</TableCell>
                            <TableCell>{row.jenisKelamin || "-"}</TableCell>
                            <TableCell>{row.password ? "••••••" : "(kosong)"}</TableCell>
                            <TableCell className="text-destructive text-xs">
                              {row.errors.join("; ")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between pt-2">
                {invalidCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {invalidCount} baris memiliki data tidak valid dan akan dilewati
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button variant="outline" onClick={handleClose} disabled={importing}>
                    Batal
                  </Button>
                  <Button onClick={handleImport} disabled={importing || validCount === 0}>
                    {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Import {validCount} Data
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
