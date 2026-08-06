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
  const [logoKiriKop, setLogoKiriKop] = useState<string | null>(null)
  const [kopBaris1, setKopBaris1] = useState("")
  const [kopBaris2, setKopBaris2] = useState("")
  const [kopBaris3, setKopBaris3] = useState("")
  const [kopBaris4, setKopBaris4] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingLogoKiri, setIsUploadingLogoKiri] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const logoKiriFileInputRef = useRef<HTMLInputElement>(null)

  // Initialize values
  useEffect(() => {
    if (sekolah) {
      setUseCustomKop(sekolah.useCustomKop ?? false)
      setCustomKopGambar(sekolah.customKopGambar ?? null)
      setCustomKopTinggi(sekolah.customKopTinggi ?? 35)
      setLogoKiriKop((sekolah as any).logoKiriKop ?? null)
      setKopBaris1((sekolah as any).kopBaris1 ?? "")
      setKopBaris2((sekolah as any).kopBaris2 ?? "")
      setKopBaris3((sekolah as any).kopBaris3 ?? "")
      setKopBaris4((sekolah as any).kopBaris4 ?? "")
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

  const handleLogoKiriUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    let uploadFile = file
    if (file.size > 500 * 1024) {
      try {
        const compressed = await compressImage(file, 500 * 1024, 800)
        uploadFile = new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
      } catch (err) {
        console.error("Gagal mengompres gambar:", err)
      }
    }

    setIsUploadingLogoKiri(true)
    try {
      const sekolahId = sekolah?.id || "default"
      const url = await uploadToCloudinary(uploadFile, "logo-kiri-kop", { sekolahId })
      setLogoKiriKop(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload gagal")
    }
    setIsUploadingLogoKiri(false)
  }

  const handleSaveSettings = async () => {
    setIsSaving(true)
    try {
      await updateSekolah.mutateAsync({
        useCustomKop,
        customKopGambar,
        customKopTinggi,
        logoKiriKop,
        kopBaris1,
        kopBaris2,
        kopBaris3,
        kopBaris4,
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
                ) : (                  <motion.div
                    key="text-kop"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 text-left"
                  >
                    {/* Logos configuration */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Logo Kiri Custom Upload */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Logo Kiri (Dinas/Kemenag)</Label>
                        <div
                          onClick={() => logoKiriFileInputRef.current?.click()}
                          className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20 hover:border-teal-500/50 hover:bg-teal-500/5 transition-all duration-300 cursor-pointer text-center min-h-[90px]"
                        >
                          <input
                            type="file"
                            ref={logoKiriFileInputRef}
                            onChange={handleLogoKiriUpload}
                            accept="image/*"
                            className="hidden"
                          />
                          {isUploadingLogoKiri ? (
                            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                          ) : logoKiriKop ? (
                            <div className="relative size-12 rounded-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-200/60 dark:border-slate-800/60">
                              <img src={logoKiriKop} alt="Logo Kiri" className="object-contain size-full p-1" />
                            </div>
                          ) : (
                            <>
                              <Upload className="size-4 text-slate-400 group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-400">Upload Logo</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Logo Kanan Auto-fetch */}
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Logo Kanan (Lembaga)</Label>
                        <div className="flex flex-col items-center justify-center border border-slate-200/60 dark:border-slate-800/60 rounded-xl p-3 bg-slate-50/20 dark:bg-slate-950/10 min-h-[90px] text-center">
                          {sekolah?.logo ? (
                            <div className="relative size-12 rounded-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center border border-slate-250/60 dark:border-slate-800/60">
                              <img src={sekolah.logo} alt="Logo Lembaga" className="object-contain size-full p-1" />
                            </div>
                          ) : (
                            <span className="text-[9px] text-muted-foreground italic">Logo Kosong</span>
                          )}
                          <span className="text-[8px] font-bold text-teal-600 dark:text-teal-400 mt-1 uppercase">Autofetch Profil</span>
                        </div>
                      </div>
                    </div>

                    {/* Text Inputs */}
                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="space-y-1">
                        <Label htmlFor="baris1" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kop Baris 1 (Pemerintah/Yayasan)</Label>
                        <Input
                          id="baris1"
                          placeholder="e.g. PEMERINTAH KABUPATEN BOGOR"
                          value={kopBaris1}
                          onChange={(e) => setKopBaris1(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="baris2" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kop Baris 2 (Dinas/Cabang Dinas)</Label>
                        <Input
                          id="baris2"
                          placeholder="e.g. DINAS PENDIDIKAN"
                          value={kopBaris2}
                          onChange={(e) => setKopBaris2(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="baris3" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kop Baris 3 (Nama Sekolah/Instansi)</Label>
                        <Input
                          id="baris3"
                          placeholder={sekolah?.namaSekolah || "e.g. SMP NEGERI 1 BOGOR"}
                          value={kopBaris3}
                          onChange={(e) => setKopBaris3(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="baris4" className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kop Baris 4 (Alamat & Kontak)</Label>
                        <Input
                          id="baris4"
                          placeholder={sekolah?.alamat || "e.g. Jl. Raya Pajajaran No. 1, Telp: ..."}
                          value={kopBaris4}
                          onChange={(e) => setKopBaris4(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end pt-5 mt-6 border-t border-slate-100 dark:border-slate-800 gap-2">
              <Button
                onClick={handleSaveSettings}
                disabled={isSaving || isUploading || isUploadingLogoKiri}
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
                    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-955/60 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 m-2 rounded-lg text-center p-4">
                      <p className="text-xs text-muted-foreground font-semibold">Silakan upload gambar banner kop surat kustom Anda</p>
                    </div>
                  )
                ) : (
                  <div className="w-full flex items-center justify-between gap-3 py-2 px-2">
                    {/* Logo Kiri (Dinas/Kemenag) */}
                    {logoKiriKop ? (
                      <img src={logoKiriKop} alt="Logo Dinas" className="w-12 h-12 object-contain shrink-0" />
                    ) : (
                      (() => {
                        const isKemenag = ["mi", "mts", "ma"].includes(sekolah?.jenjang || "")
                        if (isKemenag) {
                          return (
                            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex flex-col items-center justify-center shrink-0 border border-emerald-500 shadow-sm p-1 select-none">
                              <span className="text-[6px] font-black uppercase leading-tight scale-90">Kemenag</span>
                              <span className="text-[5px] leading-none opacity-85 mt-0.5 scale-75">Ikhlas</span>
                              <span className="text-[5px] leading-none opacity-85 scale-75">Beramal</span>
                            </div>
                          )
                        } else {
                          return (
                            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex flex-col items-center justify-center shrink-0 border border-blue-500 shadow-sm p-1 select-none">
                              <span className="text-[6px] font-black uppercase leading-tight scale-90">Tut Wuri</span>
                              <span className="text-[5px] leading-none opacity-85 mt-0.5 scale-75">Handayani</span>
                            </div>
                          )
                        }
                      })()
                    )}

                    {/* Kop Center Text */}
                    <div className="flex-1 text-center font-sans text-slate-800 dark:text-slate-200">
                      {kopBaris1 && (
                        <h5 className="text-[8px] font-black uppercase leading-tight tracking-wide">
                          {kopBaris1}
                        </h5>
                      )}
                      {kopBaris2 && (
                        <h5 className="text-[8px] font-black uppercase leading-tight tracking-wide">
                          {kopBaris2}
                        </h5>
                      )}
                      <h4 className="text-[10px] font-extrabold uppercase leading-tight tracking-normal mt-0.5">
                        {kopBaris3 || sekolah?.namaSekolah || "SEKOLAH CONTOH"}
                      </h4>
                      <p className="text-[7px] text-slate-500 mt-1 leading-snug">
                        {kopBaris4 || sekolah?.alamat || "Alamat lengkap sekolah, nomor telepon, email, dan situs web resmi."}
                      </p>
                    </div>

                    {/* Logo Lembaga (Kanan) */}
                    {sekolah?.logo ? (
                      <img src={sekolah.logo} alt="Logo Sekolah" className="w-12 h-12 object-contain shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center rounded-xl text-slate-400 shrink-0 select-none">
                        <School className="size-5" />
                      </div>
                    )}
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
