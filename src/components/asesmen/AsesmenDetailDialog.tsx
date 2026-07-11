"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, ClipboardCheck, Upload, Send, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const KATEGORI_LABEL: Record<string, string> = {
  formatif_awal: "Formatif Awal",
  formatif_proses: "Formatif",
  sumatif: "Sumatif",
}

const TEKNIK_LABEL: Record<string, string> = {
  tes_tertulis: "Tes Tertulis",
  tes_lisan: "Tes Lisan",
  penugasan: "Penugasan",
  praktik: "Praktik",
  proyek: "Proyek",
  portofolio: "Portofolio",
}

interface Props {
  open: boolean
  asesmenId: string | null
  onClose: () => void
}

export default function AsesmenDetailDialog({ open, asesmenId, onClose }: Props) {
  const { data: session } = useSession()
  const isGuru = session?.user?.role === "guru"
  const isSiswa = session?.user?.role === "siswa"
  const isAdmin = session?.user?.role === "super_admin" || session?.user?.role === "admin_sekolah"

  const { data: detail, isLoading } = api.asesmen.getById.useQuery(
    { id: asesmenId! },
    { enabled: !!asesmenId && open },
  )

  const { data: entries, refetch: refetchEntries } = api.asesmen.getSiswaEntries.useQuery(
    { asesmenId: asesmenId! },
    { enabled: !!asesmenId && open && (isGuru || isAdmin) },
  )

  const { data: komentar, refetch: refetchKomentar } = api.asesmen.getKomentar.useQuery(
    { asesmenId: asesmenId! },
    { enabled: !!asesmenId && open },
  )

  const submitMutation = api.asesmen.submitTugas.useMutation()
  const nilaiMutation = api.asesmen.nilaiSiswa.useMutation()
  const komentarMutation = api.asesmen.createKomentar.useMutation()
  const utils = api.useUtils()

  const [jawabanTeks, setJawabanTeks] = useState("")
  const [berkasUrl, setBerkasUrl] = useState("")
  const [nilaiInputs, setNilaiInputs] = useState<Record<string, string>>({})
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [pesanKomentar, setPesanKomentar] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [nilaiLoading, setNilaiLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setJawabanTeks("")
      setBerkasUrl("")
      setNilaiInputs({})
      setFeedbackInputs({})
      setPesanKomentar("")
    }
  }, [open])

  const handleSubmit = async () => {
    if (!asesmenId || (!jawabanTeks && !berkasUrl)) {
      toast.error("Isi jawaban atau upload file")
      return
    }
    setSubmitting(true)
    try {
      await submitMutation.mutateAsync({ asesmenId, jawabanTeks: jawabanTeks || undefined, berkasUrl: berkasUrl || undefined })
      toast.success("Jawaban berhasil dikumpulkan")
      refetchEntries()
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengumpulkan")
    } finally {
      setSubmitting(false)
    }
  }

  const handleNilai = async (asesmenSiswaId: string) => {
    const nilai = parseInt(nilaiInputs[asesmenSiswaId])
    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      toast.error("Nilai harus antara 0-100")
      return
    }
    setNilaiLoading(asesmenSiswaId)
    try {
      await nilaiMutation.mutateAsync({
        asesmenSiswaId,
        nilai,
        feedback: feedbackInputs[asesmenSiswaId] || undefined,
      })
      toast.success("Nilai berhasil disimpan")
      refetchEntries()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan nilai")
    } finally {
      setNilaiLoading(null)
    }
  }

  const handleKomentar = async () => {
    if (!asesmenId || !pesanKomentar.trim()) return
    try {
      await komentarMutation.mutateAsync({ asesmenId, pesan: pesanKomentar.trim() })
      setPesanKomentar("")
      refetchKomentar()
    } catch {
      toast.error("Gagal mengirim komentar")
    }
  }

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/50 flex-shrink-0">
          {isLoading ? (
            <Skeleton className="h-6 w-48" />
          ) : detail ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg truncate">{detail.judul}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50/50 text-blue-600 border-blue-100/80 dark:bg-blue-950/20 dark:text-blue-400">
                    {detail.kelas?.tingkat} - {detail.kelas?.namaKelas}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-violet-50/50 text-violet-600 border-violet-100/80 dark:bg-violet-950/20 dark:text-violet-400">
                    {detail.mataPelajaran?.namaMapel}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-emerald-50/50 text-emerald-600 border-emerald-100/80 dark:bg-emerald-950/20 dark:text-emerald-400">
                    {KATEGORI_LABEL[detail.kategori] || detail.kategori}
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">KKTP</p>
                  <p className="text-lg font-bold mt-0.5">{detail.kktp}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Teknik</p>
                  <p className="text-sm font-semibold mt-0.5">{TEKNIK_LABEL[detail.teknik] || detail.teknik}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Pengumpulan</p>
                  <p className="text-sm font-semibold mt-0.5 capitalize">{detail.jenisPengumpulan}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 border border-border/40">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Deadline</p>
                  <p className="text-sm font-semibold mt-0.5">{fmtDate(detail.deadline)}</p>
                </div>
              </div>

              {detail.deskripsi && (
                <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Deskripsi</p>
                  <p className="text-sm whitespace-pre-wrap">{detail.deskripsi}</p>
                </div>
              )}

              {(isGuru || isAdmin) && (
                <div>
                  <h4 className="text-sm font-bold mb-3">Daftar Siswa</h4>
                  <div className="border border-border/50 rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs">Siswa</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Nilai</TableHead>
                          <TableHead className="text-xs">Ketuntasan</TableHead>
                          <TableHead className="text-xs">Feedback</TableHead>
                          <TableHead className="text-xs w-[60px]">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!entries || entries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                              Belum ada siswa yang mengumpulkan
                            </TableCell>
                          </TableRow>
                        ) : (
                          entries.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell className="text-xs font-medium">
                                {(entry as any).siswa?.namaLengkap || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${
                                  entry.status === "sudah_dinilai" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                  entry.status === "sudah_mengumpulkan" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                  "bg-slate-50 text-slate-500 border-slate-100"
                                } dark:bg-opacity-20`}>
                                  {entry.status === "sudah_dinilai" ? "Dinilai" :
                                   entry.status === "sudah_mengumpulkan" ? "Dikumpulkan" : "Belum"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {entry.status === "sudah_dinilai" ? (
                                  <span className="font-bold">{entry.nilai}</span>
                                ) : (
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="h-7 w-16 text-xs rounded-lg"
                                    value={nilaiInputs[entry.id] ?? ""}
                                    onChange={(e) => setNilaiInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.statusKetuntasan ? (
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                    entry.statusKetuntasan === "tuntas" ? "text-emerald-600" : "text-rose-600"
                                  }`}>
                                    {entry.statusKetuntasan === "tuntas" ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    {entry.statusKetuntasan === "tuntas" ? "Tuntas" : "Belum Tuntas"}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Input
                                  value={feedbackInputs[entry.id] ?? (entry.feedback ?? "")}
                                  onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                                  placeholder="Feedback"
                                  className="h-7 text-xs rounded-lg"
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs rounded-lg"
                                  disabled={nilaiLoading === entry.id || !nilaiInputs[entry.id] || entry.status === "sudah_dinilai"}
                                  onClick={() => handleNilai(entry.id)}
                                >
                                  {nilaiLoading === entry.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Simpan"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {(isSiswa) && (
                <div>
                  <h4 className="text-sm font-bold mb-3">Pengumpulan</h4>
                  {(() => {
                    const myEntry = entries?.find((e) => (e as any).siswa?.emailSiswa === session?.user?.email)
                    if (myEntry && myEntry.status !== "belum_dikerjakan") {
                      return (
                        <div className="space-y-3">
                          <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
                            <Badge className={`${myEntry.status === "sudah_dinilai" ? "bg-emerald-500" : "bg-amber-500"}`}>
                              {myEntry.status === "sudah_dinilai" ? "Sudah Dinilai" : "Sudah Dikumpulkan"}
                            </Badge>
                          </div>
                          {myEntry.nilai !== null && (
                            <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Nilai</p>
                              <div className="flex items-center gap-3">
                                <span className={`text-2xl font-bold ${myEntry.statusKetuntasan === "tuntas" ? "text-emerald-500" : "text-rose-500"}`}>
                                  {myEntry.nilai}
                                </span>
                                <span className={`text-xs font-semibold ${myEntry.statusKetuntasan === "tuntas" ? "text-emerald-600" : "text-rose-600"}`}>
                                  / {detail.kktp} ({myEntry.statusKetuntasan === "tuntas" ? "Tuntas" : "Belum Tuntas"})
                                </span>
                              </div>
                            </div>
                          )}
                          {myEntry.feedback && (
                            <div className="bg-muted/20 rounded-xl p-4 border border-border/40">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Feedback Guru</p>
                              <p className="text-sm">{myEntry.feedback}</p>
                            </div>
                          )}
                        </div>
                      )
                    }
                    return (
                      <div className="space-y-3">
                        {detail.jenisPengumpulan === "teks" && (
                          <div>
                            <Label className="text-xs font-semibold">Jawaban Teks</Label>
                            <Textarea value={jawabanTeks} onChange={(e) => setJawabanTeks(e.target.value)} placeholder="Tulis jawaban Anda..." className="rounded-xl mt-1 min-h-[100px]" />
                          </div>
                        )}
                        {detail.jenisPengumpulan === "unggah_file" && (
                          <div>
                            <Label className="text-xs font-semibold">Upload Berkas</Label>
                            <Input value={berkasUrl} onChange={(e) => setBerkasUrl(e.target.value)} placeholder="URL file..." className="h-9 rounded-xl mt-1" />
                            <p className="text-[10px] text-muted-foreground mt-1">Masukkan URL file yang sudah diupload</p>
                          </div>
                        )}
                        <Button onClick={handleSubmit} disabled={submitting} className="gap-2 rounded-xl">
                          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          Kumpulkan
                        </Button>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div>
                <h4 className="text-sm font-bold mb-3">Komentar</h4>
                <div className="space-y-3 mb-3 max-h-[200px] overflow-y-auto">
                  {!komentar || komentar.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Belum ada komentar</p>
                  ) : (
                    komentar.map((k) => (
                      <div key={k.id} className="bg-muted/20 rounded-xl p-3 border border-border/40">
                        <p className="text-xs text-muted-foreground">{fmtDate(k.createdAt)}</p>
                        <p className="text-sm mt-1">{k.pesan}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={pesanKomentar}
                    onChange={(e) => setPesanKomentar(e.target.value)}
                    placeholder="Tulis komentar..."
                    className="h-9 rounded-xl flex-1"
                  />
                  <Button size="sm" className="h-9 rounded-xl gap-1" onClick={handleKomentar} disabled={!pesanKomentar.trim()}>
                    <Send className="h-3.5 w-3.5" /> Kirim
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Asesmen tidak ditemukan</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
