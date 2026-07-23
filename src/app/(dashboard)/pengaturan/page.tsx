"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadToCloudinary, compressImage } from "@/lib/cloudinary"
import { Settings, Upload, Loader2, School, Image as ImageIcon, FileText, Check, Save } from "lucide-react"

export default function PengaturanPage() {
  const { data: sekolah, isLoading } = api.lembaga.getSekolah.useQuery()
  const updateSekolah = api.lembaga.updateSekolah.useMutation()
  const utils = api.useUtils()

  const [useCustomKop, setUseCustomKop] = useState(false)
  const [customKopGambar, setCustomKopGambar] = useState<string | null>(null)
  const [customKopTinggi, setCustomKopTinggi] = useState(35)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize values
  useEffect(() => {
    if (sekolah) {
      setUseCustomKop(sekolah.useCustomKop ?? false)
      setCustomKopGambar(sekolah.customKopGambar ?? null)
      setCustomKopTinggi(sekolah.customKopTinggi ?? 35)
    }
  }, [sekolah])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let uploadFile = file
    // Compress if larger than 500kb
    if (file.size > 500 * 1024) {
      try {
        const compressed = await compressImage(file, 500 * 1024, 1200)
        uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
      } catch (err) {
        console.error("Gagal mengompres gambar:", err)
      }
    }

    setIsUploading(true)
    try {
      const sekolahId = sekolah?.id || "default"
      const url = await uploadToCloudinary(uploadFile, "kop-dokumen", { sekolahId })
      setCustomKopGambar(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload gagal")
    }
    setIsUploading(false)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateSekolah.mutateAsync({
        useCustomKop,
        customKopGambar,
        customKopTinggi,
      })
      await utils.lembaga.getSekolah.invalidate()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan pengaturan")
    }
    setIsSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2.5">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat Pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="text-left">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pengaturan Dokumen</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi Kop Surat dan format header ekspor PDF sistem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Panel Card (Left 5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="rounded-[28px] border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur shadow-md p-6">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-4">
              Konfigurasi Kop
            </h3>

            {/* Segmented Picker Mode */}
            <div className="space-y-5">
              <div className="space-y-2 text-left">
                <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Mode Kop Surat</Label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/80 dark:bg-slate-950/80 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
                  <button
                    type="button"
                    onClick={() => setUseCustomKop(false)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      !useCustomKop
                        ? "bg-white dark:bg-slate-800 text-teal-650 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700/80"
                        : "text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <FileText className="size-4" />
                    <span>Teks Otomatis</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomKop(true)}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      useCustomKop
                        ? "bg-white dark:bg-slate-800 text-teal-655 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700/80"
                        : "text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    <ImageIcon className="size-4" />
                    <span>Gambar Kustom</span>
                  </button>
                </div>
              </div>

              {/* Conditional Settings Fields */}
              <AnimatePresence mode="wait">
                {useCustomKop ? (
                  <motion.div
                    key="custom-kop"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5 text-left"
                  >
                    {/* Upload Banner */}
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">File Gambar Banner Kop</Label>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/20 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all duration-300 cursor-pointer text-center"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Mengunggah ke Cloudinary...</p>
                          </div>
                        ) : customKopGambar ? (
                          <div className="space-y-3 w-full">
                            <div className="relative aspect-[7/1] rounded-xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 flex items-center justify-center shadow-xs">
                              <img src={customKopGambar} alt="Kop Banner" className="object-contain h-full w-full" />
                            </div>
                            <span className="text-[10px] font-extrabold text-teal-600 hover:text-teal-750 flex items-center justify-center gap-1">
                              <Upload className="size-3.5" /> Ganti Gambar Kop
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="size-11 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300 mb-2.5">
                              <Upload className="size-5" />
                            </div>
                            <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Pilih Berkas Gambar</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Format ideal: PNG/JPG Lebar (Rasio ± 7:1)</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Height Config */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Tinggi Kop di PDF</Label>
                        <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">{customKopTinggi} mm</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={15}
                          max={50}
                          value={customKopTinggi}
                          onChange={(e) => setCustomKopTinggi(Number(e.target.value))}
                          className="flex-1 accent-teal-650 h-1.5 bg-slate-100 dark:bg-slate-950 rounded-lg cursor-pointer"
                        />
                        <Input
                          type="number"
                          min={15}
                          max={50}
                          value={customKopTinggi}
                          onChange={(e) => setCustomKopTinggi(Math.min(50, Math.max(15, Number(e.target.value))))}
                          className="w-16 h-8 text-center text-xs font-black rounded-lg border border-slate-200 dark:border-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                        * Standard tinggi Kop Surat adalah 30mm s.d. 40mm. Lebar kop otomatis meregang penuh sesuai kertas dokumen.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="text-kop"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-left bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-4"
                  >
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">
                      💡 <strong>Mode Teks Otomatis</strong> menyusun Kop Surat dinamis dari database sekolah:
                    </p>
                    <ul className="text-[11px] text-muted-foreground space-y-1.5 list-disc pl-4">
                      <li>Logo Instansi Sekolah (sisi kiri)</li>
                      <li>Nama Sekolah / Lembaga Resmi (Bold besar)</li>
                      <li>Alamat Sekolah Lengkap & Kontak</li>
                      <li>Nomor NPSN Lembaga Resmi</li>
                    </ul>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold leading-normal pt-1.5 border-t border-slate-200/40 dark:border-slate-800/40">
                      Seluruh dokumen yang diexport otomatis memiliki kop surat legal resmi dengan batas garis ganda di bawahnya.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-5 mt-6 border-t border-slate-100 dark:border-slate-800 gap-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving || isUploading}
                className="rounded-xl text-xs font-black uppercase tracking-wider px-5 bg-teal-600 hover:bg-teal-700 text-white shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isSaving ? (
                  <><Loader2 className="size-4 animate-spin" /> Menyimpan...</>
                ) : saveSuccess ? (
                  <><Check className="size-4" /> Tersimpan!</>
                ) : (
                  <><Save className="size-4" /> Simpan Perubahan</>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* Live Preview Container (Right 7 Cols) */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <p className="text-xs font-black uppercase text-slate-400 tracking-wider pl-1">Pratinjau Kop Surat (Skala Cetak)</p>
          
          <Card className="rounded-[28px] border border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900 shadow-xl overflow-hidden aspect-[1.414/1] w-full flex flex-col p-8 relative select-none">
            {/* Paper Layout Mockup Header */}
            <div className="w-full flex-1 flex flex-col relative border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/20 dark:bg-slate-950/20 overflow-hidden">
              
              {/* Kop Surat Header Area */}
              <div 
                className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 flex items-center px-6 relative transition-all duration-300"
                style={{ height: useCustomKop ? `${customKopTinggi * 3.5}px` : "120px" }}
              >
                {useCustomKop ? (
                  customKopGambar ? (
                    <img 
                      src={customKopGambar} 
                      alt="Kustom Kop" 
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none p-1"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950/60 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 m-2 rounded-lg text-center p-4">
                      <p className="text-xs text-muted-foreground font-semibold">Silakan upload gambar banner kop surat kustom Anda</p>
                    </div>
                  )
                ) : (
                  <div className="w-full flex items-center gap-4 py-2">
                    {sekolah?.logo ? (
                      <img src={sekolah.logo} alt="Logo" className="w-14 h-14 object-contain shrink-0 border border-slate-100 dark:border-slate-805 rounded-lg p-1" />
                    ) : (
                      <div className="w-14 h-14 bg-slate-100 dark:bg-slate-955 flex items-center justify-center rounded-lg text-slate-450 border border-slate-200/40 dark:border-slate-800 shrink-0">
                        <School className="size-6" />
                      </div>
                    )}
                    <div className="flex-1 text-center pr-14">
                      <h4 className="text-xs font-black uppercase text-slate-850 dark:text-slate-200 tracking-tight leading-tight">
                        {sekolah?.namaSekolah || "SEKOLAH CONTOH"}
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-1 leading-normal font-semibold">
                        {sekolah?.alamat || "Alamat lengkap sekolah, no. telp, dan email preferensi resmi sekolah akan dicetak di sini."}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 mt-0.5">
                        {sekolah?.npsn ? `NPSN: ${sekolah.npsn}` : "NPSN: —"} {sekolah?.telepon ? ` | Telp: ${sekolah.telepon}` : ""}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Simulated double line border under Automatic Kop */}
                {!useCustomKop && (
                  <div className="absolute bottom-1 left-4 right-4 h-0.5 border-b-4 border-double border-slate-800 dark:border-slate-200 opacity-80" />
                )}
              </div>

              {/* Simulated Paper Content Area */}
              <div className="flex-1 p-6 space-y-4 overflow-hidden">
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-md" />
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 rounded-md" />
                  <div className="h-2 w-5/6 bg-slate-100 dark:bg-slate-900 rounded-md" />
                </div>
                
                {/* Simulated Table */}
                <div className="border border-slate-200/60 dark:border-slate-800 rounded-lg overflow-hidden mt-4">
                  <div className="h-6 bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-200/60 flex items-center px-3 gap-3">
                    <div className="h-2.5 w-6 bg-slate-350 dark:bg-slate-850 rounded-sm" />
                    <div className="h-2.5 w-24 bg-slate-350 dark:bg-slate-850 rounded-sm" />
                    <div className="h-2.5 w-16 bg-slate-350 dark:bg-slate-850 rounded-sm" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-2 w-full bg-slate-50 dark:bg-slate-900/60 rounded-md" />
                    <div className="h-2 w-full bg-slate-50 dark:bg-slate-900/60 rounded-md" />
                  </div>
                </div>
              </div>

            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
