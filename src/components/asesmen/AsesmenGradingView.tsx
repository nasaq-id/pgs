"use client"

import { useState, useMemo } from "react"
import { api } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrowLeft,
  Save,
  Eye,
  Send,
  MessageSquare,
  Loader2,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import AsesmenSubmissionPreview from "./AsesmenSubmissionPreview"

interface Props {
  asesmenId: string
  onBack: () => void
}

const TEKNIK_LABEL: Record<string, string> = {
  tes_tertulis: "Tes Tertulis",
  tes_lisan: "Tes Lisan",
  penugasan: "Penugasan",
  praktik: "Praktik",
  proyek: "Proyek",
  portofolio: "Portofolio",
}

export default function AsesmenGradingView({ asesmenId, onBack }: Props) {

  const { data: detail, isLoading: loadingDetail } = api.asesmen.getById.useQuery(
    { id: asesmenId },
    { enabled: !!asesmenId },
  )

  const { data: entries, isLoading: loadingEntries, refetch: refetchEntries } = api.asesmen.getSiswaEntries.useQuery(
    { asesmenId },
    { enabled: !!asesmenId },
  )

  const { data: komentar, refetch: refetchKomentar } = api.asesmen.getKomentar.useQuery(
    { asesmenId },
    { enabled: !!asesmenId },
  )

  const nilaiMutation = api.asesmen.nilaiSiswa.useMutation()
  const komentarMutation = api.asesmen.createKomentar.useMutation()
  const utils = api.useUtils()

  const [nilaiInputs, setNilaiInputs] = useState<Record<string, string>>({})
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [nilaiLoading, setNilaiLoading] = useState<string | null>(null)
  const [pesanKomentar, setPesanKomentar] = useState("")
  const [previewEntry, setPreviewEntry] = useState<any>(null)

  const handleNilai = async (entryId: string, siswaNama: string) => {
    const nilai = parseInt(nilaiInputs[entryId])
    if (isNaN(nilai) || nilai < 0 || nilai > 100) {
      toast.error("Nilai harus antara 0-100")
      return
    }
    setNilaiLoading(entryId)
    try {
      await nilaiMutation.mutateAsync({
        asesmenSiswaId: entryId,
        nilai,
        feedback: feedbackInputs[entryId] || undefined,
      })
      toast.success(`Nilai ${siswaNama} berhasil disimpan: ${nilai}`)
      refetchEntries()
      utils.asesmen.getAll.invalidate()
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan nilai")
    } finally {
      setNilaiLoading(null)
    }
  }

  const handleKomentar = async () => {
    if (!pesanKomentar.trim()) return
    try {
      await komentarMutation.mutateAsync({ asesmenId, pesan: pesanKomentar.trim() })
      setPesanKomentar("")
      refetchKomentar()
      toast.success("Komentar terkirim")
    } catch {
      toast.error("Gagal mengirim komentar")
    }
  }

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const kktp = detail?.kktp ?? 70

  const sortedEntries = useMemo(() => {
    if (!entries) return []
    return [...entries].sort((a, b) => {
      const aName = (a as any).siswa?.namaLengkap || ""
      const bName = (b as any).siswa?.namaLengkap || ""
      return aName.localeCompare(bName)
    })
  }, [entries])

  if (loadingDetail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">Asesmen tidak ditemukan</p>
        <Button variant="ghost" onClick={onBack} className="mt-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>
      </div>
    )
  }

  const kelasName = detail.kelas ? `Kelas ${detail.kelas.tingkat} - ${detail.kelas.namaKelas}` : "-"
  const mapelName = detail.mataPelajaran?.namaMapel || "-"

  return (
    <div className="space-y-6 animate-fade-in text-left pb-10">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="neumo-sm px-4 py-2.5 bg-background rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:shadow-md"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Daftar</span>
        </button>
        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-1 rounded-xl">
          ID: {detail.id.slice(0, 12)}...
        </span>
      </div>

      {/* Assessment Info Card */}
      <div className="neumo-card bg-background rounded-[28px] p-6 space-y-4">
        <div>
          <Badge variant="outline" className="text-[10px] h-5 px-2 bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40 mb-2">
            {detail.kategori === "sumatif" ? "Sumatif" : "Formatif"}
          </Badge>
          <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {detail.judul}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5">
            Target KKTP: <span className="font-extrabold text-teal-600 dark:text-teal-400">{detail.kktp}</span>
            {" | "}<span className="font-bold text-foreground">{kelasName}</span>
            {" | "}<span className="font-bold text-foreground">{mapelName}</span>
            {" | "}<span className="font-semibold">{TEKNIK_LABEL[detail.teknik] || detail.teknik}</span>
          </p>
        </div>
        {detail.deskripsi && (
          <div className="border-t border-border/50 pt-3 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
            <span className="font-bold text-foreground block mb-1">Instruksi Tugas:</span>
            {detail.deskripsi}
          </div>
        )}
      </div>

      {/* Grading Matrix */}
      <div className="neumo-card bg-background rounded-[28px] p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h4 className="font-extrabold text-foreground text-sm">Matriks Penilaian & Tindak Lanjut</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Nilai siswa secara langsung. KKTP dihitung otomatis, Remedial disiapkan bila nilai kurang.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-bold w-fit bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40">
            Total Siswa: {sortedEntries.length}
          </Badge>
        </div>

        {loadingEntries ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-xs">
            Belum ada siswa terdaftar di kelas ini.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {sortedEntries.map((entry) => {
                const siswa = (entry as any).siswa
                const siswaNama = siswa?.namaLengkap || "Unknown"
                const currentNilai = nilaiInputs[entry.id] ?? (entry.nilai !== null ? String(entry.nilai) : "")
                const currentFeedback = feedbackInputs[entry.id] ?? entry.feedback ?? ""
                const scoreNum = Number(currentNilai)
                const isEntered = currentNilai.trim() !== "" && !isNaN(scoreNum)
                const isTuntas = isEntered ? scoreNum >= kktp : entry.statusKetuntasan === "tuntas"

                return (
                  <div
                    key={entry.id}
                    className="bg-muted/30 border border-border/50 p-4 rounded-2xl space-y-3 transition-all hover:border-teal-200 dark:hover:border-teal-900/40"
                  >
                    <div className="flex items-center justify-between border-b border-border/30 pb-2">
                      <span className="font-extrabold text-foreground text-sm">{siswaNama}</span>
                      {isEntered ? (
                        isTuntas ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[9px] h-5">TUNTAS</Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[9px] h-5">BELUM TUNTAS</Badge>
                        )
                      ) : entry.statusKetuntasan === "tuntas" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[9px] h-5">TUNTAS</Badge>
                      ) : entry.statusKetuntasan === "belum_tuntas" ? (
                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[9px] h-5">BELUM TUNTAS</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-5 text-muted-foreground">Belum Dinilai</Badge>
                      )}
                    </div>

                    {/* Submission Status */}
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Status:</span>
                      {entry.status === "sudah_dinilai" ? (
                        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-1">
                          <Badge className="bg-emerald-500 text-white text-[9px] h-4">Sudah Dinilai</Badge>
                          {entry.jawabanTeks && (
                            <p className="text-[10px] text-muted-foreground italic line-clamp-2">&quot;{entry.jawabanTeks}&quot;</p>
                          )}
                          {entry.berkasUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewEntry(entry)}
                              className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> Lihat Berkas
                            </button>
                          )}
                        </div>
                      ) : entry.status === "sudah_mengumpulkan" ? (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl space-y-1">
                          <Badge className="bg-amber-500 text-white text-[9px] h-4 animate-pulse">Menunggu Penilaian</Badge>
                          {entry.jawabanTeks && (
                            <p className="text-[10px] text-muted-foreground italic line-clamp-2">&quot;{entry.jawabanTeks}&quot;</p>
                          )}
                          {entry.berkasUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewEntry(entry)}
                              className="text-[10px] font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="h-3 w-3" /> Lihat Berkas
                            </button>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[9px] text-muted-foreground">Belum Mengumpulkan</Badge>
                      )}
                    </div>

                    {/* Grading Input */}
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Nilai (0-100):</label>
                        <Input
                          type="text"
                          placeholder="0-100"
                          value={currentNilai}
                          onChange={(e) => setNilaiInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          className="h-9 text-center font-black text-sm rounded-xl"
                        />
                        <div className="flex gap-1.5 justify-center">
                          <span className="text-[9px] text-muted-foreground font-bold uppercase mr-1 self-center">Instan:</span>
                          {[75, 85, 95, 100].map((score) => (
                            <button
                              key={score}
                              type="button"
                              onClick={() => setNilaiInputs((prev) => ({ ...prev, [entry.id]: String(score) }))}
                              className="flex-1 py-1.5 neumo-sm bg-background text-foreground text-[10px] font-black rounded-lg cursor-pointer transition-all active:scale-95"
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">Feedback:</label>
                        <Input
                          placeholder="Catatan untuk siswa..."
                          value={currentFeedback}
                          onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleNilai(entry.id, siswaNama)}
                      disabled={nilaiLoading === entry.id || !nilaiInputs[entry.id] || entry.status === "sudah_dinilai"}
                      className="w-full h-9 rounded-xl gap-1.5 text-xs font-bold"
                    >
                      {nilaiLoading === entry.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Simpan Nilai {siswaNama.split(" ")[0]}
                    </Button>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/50">
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Siswa</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-center">Tinjau</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider w-[140px]">Nilai (0-100)</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Ketuntasan (KKTP {kktp})</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Feedback</TableHead>
                    <TableHead className="text-[10px] font-black text-muted-foreground uppercase tracking-wider text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEntries.map((entry) => {
                    const siswa = (entry as any).siswa
                    const siswaNama = siswa?.namaLengkap || "Unknown"
                    const currentNilai = nilaiInputs[entry.id] ?? (entry.nilai !== null ? String(entry.nilai) : "")
                    const currentFeedback = feedbackInputs[entry.id] ?? entry.feedback ?? ""
                    const scoreNum = Number(currentNilai)
                    const isEntered = currentNilai.trim() !== "" && !isNaN(scoreNum)
                    const isTuntas = isEntered ? scoreNum >= kktp : entry.statusKetuntasan === "tuntas"

                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-extrabold text-sm text-foreground">
                          {siswaNama}
                        </TableCell>
                        <TableCell>
                          {entry.status === "sudah_dinilai" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] h-5">Dinilai</Badge>
                          ) : entry.status === "sudah_mengumpulkan" ? (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] h-5">Dikumpulkan</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">Belum</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {(entry.jawabanTeks || entry.berkasUrl) ? (
                            <button
                              type="button"
                              onClick={() => setPreviewEntry(entry)}
                              className="px-3 py-1.5 bg-foreground text-background rounded-xl text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-95"
                            >
                              <Eye className="h-3 w-3" />
                              Lihat
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 w-[130px]">
                            <Input
                              type="text"
                              placeholder="0-100"
                              value={currentNilai}
                              onChange={(e) => setNilaiInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                              className="h-8 w-[80px] text-center text-xs font-black rounded-xl"
                            />
                            <div className="flex flex-wrap gap-1">
                              {[75, 85, 95, 100].map((score) => (
                                <button
                                  key={score}
                                  type="button"
                                  onClick={() => setNilaiInputs((prev) => ({ ...prev, [entry.id]: String(score) }))}
                                  className="px-1.5 py-0.5 neumo-sm bg-background text-foreground text-[9px] font-bold rounded-md cursor-pointer transition-all"
                                >
                                  {score}
                                </button>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEntered ? (
                            isTuntas ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] h-5">TUNTAS</Badge>
                                <span className="text-[9px] text-muted-foreground block font-semibold">Pengayaan</span>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] h-5">BELUM TUNTAS</Badge>
                                <span className="text-[9px] text-muted-foreground block font-semibold">Remedial</span>
                              </div>
                            )
                          ) : entry.statusKetuntasan === "tuntas" ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] h-5">TUNTAS</Badge>
                              <span className="text-[9px] text-muted-foreground block font-semibold">Pengayaan</span>
                            </div>
                          ) : entry.statusKetuntasan === "belum_tuntas" ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-rose-500/10 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] h-5">BELUM TUNTAS</Badge>
                              <span className="text-[9px] text-muted-foreground block font-semibold">Remedial</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Menunggu input</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Feedback..."
                            value={currentFeedback}
                            onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                            className="h-8 text-xs rounded-xl min-w-[140px]"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleNilai(entry.id, siswaNama)}
                            disabled={nilaiLoading === entry.id || !nilaiInputs[entry.id] || entry.status === "sudah_dinilai"}
                            className="h-8 rounded-xl text-xs font-bold gap-1"
                          >
                            {nilaiLoading === entry.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Simpan
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Discussion / Q&A Section */}
      <div className="neumo-card bg-background rounded-[28px] p-6 space-y-4">
        <h4 className="font-extrabold text-foreground text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Kolom Tanya Jawab & Diskusi Pembelajaran</span>
        </h4>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 border-b border-border/30 pb-4">
          {!komentar || komentar.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground italic py-6">
              Belum ada diskusi mengenai asesmen ini.
            </p>
          ) : (
            komentar.map((k) => {
              const isGuru = (k as any).user?.role === "guru" || (k as any).user?.role === "super_admin" || (k as any).user?.role === "admin_sekolah"
              return (
                <div
                  key={k.id}
                  className={cn(
                    "p-4 rounded-2xl max-w-[80%]",
                    isGuru
                      ? "bg-teal-50/50 border border-teal-100/30 dark:bg-teal-950/20 dark:border-teal-900/30 mr-auto"
                      : "bg-muted/50 ml-auto"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-black text-muted-foreground mb-1 gap-4">
                    <span className={isGuru ? "text-teal-700 dark:text-teal-400" : "text-foreground"}>
                      {(k as any).user?.name || "User"}
                    </span>
                    <span>{fmtDate(k.createdAt)}</span>
                  </div>
                  <p className="text-xs text-foreground font-semibold leading-relaxed">{k.pesan}</p>
                </div>
              )
            })
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleKomentar()
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Tulis instruksi tambahan atau jawab pertanyaan siswa..."
            value={pesanKomentar}
            onChange={(e) => setPesanKomentar(e.target.value)}
            className="flex-1 h-10 rounded-2xl text-xs"
          />
          <Button
            type="submit"
            disabled={!pesanKomentar.trim()}
            className="h-10 px-5 rounded-2xl gap-1.5 text-xs font-bold"
          >
            <Send className="h-3.5 w-3.5" />
            Kirim
          </Button>
        </form>
      </div>

      {/* Submission Preview Modal */}
      {previewEntry && (
        <AsesmenSubmissionPreview
          entry={previewEntry}
          asesmen={detail}
          onClose={() => setPreviewEntry(null)}
          onGrade={(nilai, feedback) => {
            setNilaiInputs((prev) => ({ ...prev, [previewEntry.id]: String(nilai) }))
            if (feedback) setFeedbackInputs((prev) => ({ ...prev, [previewEntry.id]: feedback }))
            setPreviewEntry(null)
          }}
        />
      )}
    </div>
  )
}
