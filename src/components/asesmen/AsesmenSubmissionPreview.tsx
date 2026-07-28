"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  X,
  FileText,
  ExternalLink,
  Save,
} from "lucide-react"

interface Props {
  entry: any
  asesmen: any
  onClose: () => void
  onGrade: (nilai: number, feedback: string) => void
}

export default function AsesmenSubmissionPreview({ entry, asesmen, onClose, onGrade }: Props) {
  const siswaNama = entry.siswa?.namaLengkap || "Unknown"
  const kktp = asesmen?.kktp ?? 70

  const [nilai, setNilai] = useState(entry.nilai !== null ? String(entry.nilai) : "")
  const [feedback, setFeedback] = useState(entry.feedback ?? "")

  const scoreNum = Number(nilai)
  const isEntered = nilai.trim() !== "" && !isNaN(scoreNum)
  const isTuntas = isEntered ? scoreNum >= kktp : entry.statusKetuntasan === "tuntas"

  const fmtDate = (d: Date | string | null | undefined) => {
    if (!d) return "-"
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-background rounded-[2rem] shadow-2xl border border-border max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-10">
        {/* Header */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider">
              Tinjau & Nilai Pekerjaan Siswa
            </span>
            <h3 className="text-lg font-black text-foreground leading-tight">{siswaNama}</h3>
            <p className="text-[10px] text-muted-foreground font-medium">
              Mapel: <span className="font-bold text-foreground">{asesmen?.mataPelajaran?.namaMapel || "-"}</span>
              {" | Kelas: "}<span className="font-bold text-foreground">
                {asesmen?.kelas ? `${asesmen.kelas.tingkat} - ${asesmen.kelas.namaKelas}` : "-"}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 neumo-sm bg-background rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body - Two columns */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left: Student Submission */}
          <div className="space-y-4 flex flex-col h-full min-h-[300px]">
            <div className="space-y-3 flex-1">
              <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Jawaban & Lampiran Siswa</span>
              </h4>

              <div className="bg-muted/30 border border-border/50 rounded-2xl p-4 flex-1 flex flex-col space-y-3 relative min-h-[220px]">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground">Lembar Jawaban Digital</span>
                  <span className="text-[9px] font-bold text-muted-foreground">
                    {fmtDate(entry.submittedAt || entry.createdAt)} WIB
                  </span>
                </div>

                {asesmen?.jenisPengumpulan === "unggah_file" && entry.berkasUrl ? (
                  <div className="space-y-3">
                    <div className="bg-background border border-border rounded-xl p-3 flex items-center gap-3 shadow-xs">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-lg flex items-center justify-center font-bold text-xs uppercase">
                        file
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{entry.berkasUrl}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold uppercase">DOKUMEN SISWA</p>
                      </div>
                    </div>
                    <div className="border border-border bg-background rounded-xl p-4 shadow-2xs min-h-[140px]">
                      <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                        {entry.jawabanTeks || "Siswa mengunggah berkas lampiran."}
                      </p>
                    </div>
                    {entry.berkasUrl.startsWith("http") && (
                      <a
                        href={entry.berkasUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 w-fit"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Buka Tautan Lampiran
                      </a>
                    )}
                  </div>
                ) : entry.jawabanTeks ? (
                  <div className="border border-border bg-background rounded-xl p-4 shadow-2xs relative min-h-[150px]">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-rose-100/80 dark:bg-rose-900/30" />
                    <div className="space-y-2 pl-6 text-xs text-foreground whitespace-pre-line leading-relaxed">
                      {entry.jawabanTeks}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
                    Tidak ada jawaban
                  </div>
                )}

                <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30 text-[10px] font-bold">
                  Guru disarankan memeriksa kelengkapan jawaban sebelum menetapkan status KKTP.
                </div>
              </div>
            </div>
          </div>

          {/* Right: Teacher Evaluation Form */}
          <div className="space-y-4 flex flex-col bg-muted/20 p-5 rounded-2xl border border-border/30">
            <div className="space-y-4 flex-1">
              <div>
                <h4 className="font-extrabold text-foreground text-xs uppercase tracking-wider">
                  Lembar Penilaian Guru & Umpan Balik
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Berikan nilai angka akhir dan feedback narasi tindak lanjut.</p>
              </div>

              <div className="space-y-3.5">
                {/* Score Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                    Nilai Akhir (0-100):
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0-100"
                      value={nilai}
                      onChange={(e) => setNilai(e.target.value)}
                      className="w-[100px] h-10 text-center text-sm font-black rounded-xl"
                    />
                    <div className="flex-1 flex gap-1 items-center">
                      {[75, 85, 95, 100].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setNilai(String(score))}
                          className="flex-1 py-2.5 neumo-sm bg-background text-foreground text-[10px] font-black rounded-xl transition-all cursor-pointer active:scale-95"
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Auto status */}
                {isEntered && (
                  <div
                    className={cn(
                      "p-3 rounded-xl flex items-center gap-2 border text-[10px] font-bold",
                      isTuntas
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                        : "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30 text-rose-800 dark:text-rose-300"
                    )}
                  >
                    <div className={cn("w-2 h-2 rounded-full", isTuntas ? "bg-emerald-500" : "bg-rose-500")} />
                    <span>
                      Status: {isTuntas ? "TUNTAS (Pengayaan otomatis)" : "BELUM TUNTAS (Wajib Remedial)"}
                    </span>
                  </div>
                )}

                {/* Feedback */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground font-black uppercase tracking-wider block">
                    Umpan Balik Naratif:
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Tulis ulasan/catatan tindak lanjut untuk siswa..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-border/30 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-10 rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                onClick={() => {
                  const n = parseInt(nilai)
                  if (isNaN(n) || n < 0 || n > 100) return
                  onGrade(n, feedback)
                }}
                disabled={nilai.trim() === "" || isNaN(Number(nilai)) || Number(nilai) < 0 || Number(nilai) > 100}
                className="flex-1 h-10 rounded-xl text-xs font-bold gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                Simpan & Selesai
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
