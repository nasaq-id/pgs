"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Printer, Check, QrCode, CreditCard, ChevronRight, Sliders, Layout, Settings2, RefreshCw, X, ShieldAlert, Sparkles } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch, SwitchThumb } from "@/components/ui/switch"
import { toast } from "sonner"

// Type Definitions
interface SiswaItem {
  id: string
  nisn: string | null
  nisLokal: string | null
  namaLengkap: string
  foto: string | null
  kelasId: string | null
  status: string | null
}

interface GuruItem {
  id: string
  nipnuptk: string | null
  nik: string | null
  namaLengkap: string
  foto: string | null
  tugasUtama: string | null
  kategoriPegawai: string | null
  active: boolean | null
}

type CardTheme = "blue" | "emerald" | "teal" | "indigo" | "slate" | "red"
type CardOrientation = "portrait" | "landscape"

export default function IdCardPage() {
  const [activeTab, setActiveTab] = useState<"siswa" | "guru">("siswa")
  const [search, setSearch] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [selectedKelas, setSelectedKelas] = useState("all")
  
  // Selection states
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<Record<string, boolean>>({})
  const [selectedGuruIds, setSelectedGuruIds] = useState<Record<string, boolean>>({})

  // Card Configurations
  const [themeColor, setThemeColor] = useState<CardTheme>("blue")
  const [orientation, setOrientation] = useState<CardOrientation>("portrait")
  const [showQr, setShowQr] = useState(true)
  const [showSignature, setShowSignature] = useState(true)
  const [showLogo, setShowLogo] = useState(true)
  const [showBackSide, setShowBackSide] = useState(true)
  const [customTitle, setCustomTitle] = useState("")
  const [customRules, setCustomRules] = useState<string[]>([
    "Kartu ini wajib dibawa dan dikenakan selama berada di lingkungan sekolah.",
    "Kartu tidak boleh dipindahtangankan, dicoret-coret, atau dirusak.",
    "Apabila kartu ini hilang, segera laporkan ke bagian tata usaha sekolah.",
    "Jika menemukan kartu ini, harap dikembalikan ke alamat sekolah tertera."
  ])

  // Queries
  const { data: sekolahInfo } = api.lembaga.getSekolah.useQuery()
  const { data: kelasList } = api.kelas.getAll.useQuery({})
  
  const { data: siswaList, isLoading: isLoadingSiswa } = api.siswa.getAll.useQuery({
    search: querySearch || undefined,
    status: "aktif",
    kelasId: selectedKelas === "all" ? undefined : selectedKelas,
    limit: 100,
  })

  const { data: guruList, isLoading: isLoadingGuru } = api.guru.getAll.useQuery({
    search: querySearch || undefined,
    limit: 100,
  })

  // Class mapping helper
  const kelasMap = kelasList?.reduce<Record<string, string>>((acc, item) => {
    acc[item.id] = item.namaKelas
    return acc
  }, {}) || {}

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (activeTab === "siswa" && siswaList) {
      const newSelection: Record<string, boolean> = {}
      if (checked) {
        siswaList.forEach(s => {
          newSelection[s.id] = true
        })
      }
      setSelectedSiswaIds(newSelection)
    } else if (activeTab === "guru" && guruList) {
      const newSelection: Record<string, boolean> = {}
      if (checked) {
        guruList.forEach(g => {
          newSelection[g.id] = true
        })
      }
      setSelectedGuruIds(newSelection)
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (activeTab === "siswa") {
      setSelectedSiswaIds(prev => ({
        ...prev,
        [id]: checked
      }))
    } else {
      setSelectedGuruIds(prev => ({
        ...prev,
        [id]: checked
      }))
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuerySearch(search)
  }

  const handleResetFilters = () => {
    setSearch("")
    setQuerySearch("")
    setSelectedKelas("all")
    setSelectedSiswaIds({})
    setSelectedGuruIds({})
  }

  // Theme styling generator
  const getThemeStyles = (color: CardTheme) => {
    switch (color) {
      case "emerald":
        return {
          headerBg: "bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-950 text-emerald-50",
          accentColor: "border-emerald-600 text-emerald-700 bg-emerald-50",
          cardBorder: "border-emerald-800/20",
          badgeBg: "bg-emerald-600 text-white",
          watermark: "text-emerald-900/5",
          accentLine: "bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500",
        }
      case "teal":
        return {
          headerBg: "bg-gradient-to-r from-teal-900 via-teal-800 to-teal-950 text-teal-50",
          accentColor: "border-teal-600 text-teal-700 bg-teal-50",
          cardBorder: "border-teal-800/20",
          badgeBg: "bg-teal-600 text-white",
          watermark: "text-teal-900/5",
          accentLine: "bg-gradient-to-r from-amber-400 via-teal-500 to-amber-500",
        }
      case "indigo":
        return {
          headerBg: "bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-950 text-indigo-50",
          accentColor: "border-indigo-600 text-indigo-700 bg-indigo-50",
          cardBorder: "border-indigo-800/20",
          badgeBg: "bg-indigo-600 text-white",
          watermark: "text-indigo-900/5",
          accentLine: "bg-gradient-to-r from-rose-400 via-indigo-500 to-rose-500",
        }
      case "slate":
        return {
          headerBg: "bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-slate-50",
          accentColor: "border-slate-600 text-slate-700 bg-slate-50",
          cardBorder: "border-slate-800/20",
          badgeBg: "bg-slate-700 text-white",
          watermark: "text-slate-900/5",
          accentLine: "bg-gradient-to-r from-zinc-300 via-slate-600 to-zinc-400",
        }
      case "red":
        return {
          headerBg: "bg-gradient-to-r from-red-950 via-red-800 to-red-900 text-red-50",
          accentColor: "border-red-600 text-red-700 bg-red-50",
          cardBorder: "border-red-800/20",
          badgeBg: "bg-red-600 text-white",
          watermark: "text-red-900/5",
          accentLine: "bg-gradient-to-r from-amber-400 via-red-500 to-amber-500",
        }
      case "blue":
      default:
        return {
          headerBg: "bg-gradient-to-r from-blue-950 via-blue-800 to-blue-900 text-blue-50",
          accentColor: "border-blue-600 text-blue-700 bg-blue-50",
          cardBorder: "border-blue-800/20",
          badgeBg: "bg-blue-600 text-white",
          watermark: "text-blue-900/5",
          accentLine: "bg-gradient-to-r from-amber-400 via-blue-500 to-amber-500",
        }
    }
  }

  const styles = getThemeStyles(themeColor)

  // Get currently selected items as objects
  const selectedSiswaItems = siswaList?.filter(s => selectedSiswaIds[s.id]) || []
  const selectedGuruItems = guruList?.filter(g => selectedGuruIds[g.id]) || []
  const totalSelected = activeTab === "siswa" ? selectedSiswaItems.length : selectedGuruItems.length

  // Print execution handler
  const handlePrint = () => {
    if (totalSelected === 0) {
      toast.warning("Silakan pilih minimal 1 siswa atau guru untuk dicetak")
      return
    }
    
    // Trigger browser print
    window.print()
  }

  const handlePrintSingle = (id: string, role: "siswa" | "guru") => {
    // Simpan selection state saat ini
    const originalSiswa = { ...selectedSiswaIds }
    const originalGuru = { ...selectedGuruIds }
    const originalTab = activeTab

    // Set selection hanya untuk item yang dicetak
    if (role === "siswa") {
      setActiveTab("siswa")
      setSelectedSiswaIds({ [id]: true })
      setSelectedGuruIds({})
    } else {
      setActiveTab("guru")
      setSelectedSiswaIds({})
      setSelectedGuruIds({ [id]: true })
    }

    // Trigger cetak setelah DOM render ulang
    setTimeout(() => {
      window.print()
      // Kembalikan selection state semula
      setSelectedSiswaIds(originalSiswa)
      setSelectedGuruIds(originalGuru)
      setActiveTab(originalTab)
    }, 150)
  }

  // Live previews for rendering single item on screen
  const getPreviewItem = () => {
    if (activeTab === "siswa") {
      if (selectedSiswaItems.length > 0) return { type: "siswa", data: selectedSiswaItems[0] }
      if (siswaList && siswaList.length > 0) return { type: "siswa", data: siswaList[0] }
    } else {
      if (selectedGuruItems.length > 0) return { type: "guru", data: selectedGuruItems[0] }
      if (guruList && guruList.length > 0) return { type: "guru", data: guruList[0] }
    }
    return null
  }

  const previewItem = getPreviewItem()

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      {/* Dynamic Style Block for Print Layout */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide Web Layout */
          header, nav, aside, footer, button, .no-print, [data-slot="tabs-list"] {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          #print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8mm !important;
            padding: 10mm !important;
            justify-content: center !important;
          }
          .print-card-wrapper {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-bottom: 5mm !important;
          }
          /* Custom sizing mapping for PDF/Printer CR80 (85.6mm x 54mm) */
          .id-card-element {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
        
        /* Web Custom scrollbar inside lists */
        .custom-scroll::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .dark .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />

      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cetak Kartu ID (ID Card Generator)</h1>
          <p className="text-sm text-muted-foreground">
            Desain, buat kustomisasi, dan cetak kartu identitas siswa dan guru lengkap dengan QR Code absensi secara massal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={totalSelected === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-80 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak Kartu ({totalSelected})</span>
          </button>
        </div>
      </div>

      {/* Konten Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* Panel Kiri: List & Filter (Col 7) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass rounded-2xl p-5 border">
            <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val as "siswa" | "guru")
              setSelectedSiswaIds({})
              setSelectedGuruIds({})
            }}>
              <div className="flex items-center justify-between border-b pb-3 mb-4">
                <TabsList>
                  <TabsTrigger value="siswa" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Siswa ({siswaList?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="guru" className="flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Guru & Tendik ({guruList?.length || 0})
                  </TabsTrigger>
                </TabsList>

                {/* Counter Pilihan */}
                {totalSelected > 0 && (
                  <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1.5 animate-pulse bg-primary/10 text-primary border-primary/20">
                    <Check className="h-3 w-3" />
                    {totalSelected} Terpilih
                  </Badge>
                )}
              </div>

              {/* Form Filter & Search */}
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={activeTab === "siswa" ? "Cari nama atau NISN siswa..." : "Cari nama atau NIP guru..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                {activeTab === "siswa" && (
                  <div className="w-full md:w-48">
                    <Select value={selectedKelas} onValueChange={(val) => setSelectedKelas(val || "all")}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Pilih Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Kelas</SelectItem>
                        {kelasList?.map((k) => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.namaKelas}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" variant="secondary" className="h-10 px-4">
                    Cari
                  </Button>
                  {(search || selectedKelas !== "all") && (
                    <Button type="button" variant="ghost" onClick={handleResetFilters} className="h-10 px-3">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>

              {/* TAB SISWA */}
              <TabsContent value="siswa" className="m-0">
                <div className="border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto custom-scroll">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={
                              siswaList && siswaList.length > 0 && 
                              siswaList.every(s => selectedSiswaIds[s.id])
                            }
                            onCheckedChange={(checked) => handleSelectAll(checked === true)}
                          />
                        </TableHead>
                        <TableHead>Nama Siswa</TableHead>
                        <TableHead>NISN / NIS</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead className="text-center">Foto</TableHead>
                        <TableHead className="text-right pr-4">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingSiswa ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : siswaList && siswaList.length > 0 ? (
                        siswaList.map((siswa) => (
                          <TableRow 
                            key={siswa.id} 
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleSelectOne(siswa.id, !selectedSiswaIds[siswa.id])}
                          >
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={!!selectedSiswaIds[siswa.id]}
                                onCheckedChange={(checked) => handleSelectOne(siswa.id, checked === true)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{siswa.namaLengkap}</TableCell>
                            <TableCell>{siswa.nisn || siswa.nisLokal || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{siswa.kelasId ? (kelasMap[siswa.kelasId] || "Loading...") : "Tanpa Rombel"}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {siswa.foto ? (
                                <img src={siswa.foto} alt="" className="h-7 w-7 rounded-full object-cover mx-auto border shadow-sm" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground mx-auto border font-semibold">
                                  {siswa.namaLengkap.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold"
                                onClick={() => handlePrintSingle(siswa.id, "siswa")}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Cetak
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Data siswa tidak ditemukan atau filter tidak aktif.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB GURU */}
              <TabsContent value="guru" className="m-0">
                <div className="border rounded-xl overflow-hidden max-h-[500px] overflow-y-auto custom-scroll">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={
                              guruList && guruList.length > 0 && 
                              guruList.every(g => selectedGuruIds[g.id])
                            }
                            onCheckedChange={(checked) => handleSelectAll(checked === true)}
                          />
                        </TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>NIP / NIK</TableHead>
                        <TableHead>Tugas Utama</TableHead>
                        <TableHead className="text-center">Foto</TableHead>
                        <TableHead className="text-right pr-4">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingGuru ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-center"><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-6 w-6 rounded-full mx-auto" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : guruList && guruList.length > 0 ? (
                        guruList.map((guru) => (
                          <TableRow 
                            key={guru.id} 
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleSelectOne(guru.id, !selectedGuruIds[guru.id])}
                          >
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={!!selectedGuruIds[guru.id]}
                                onCheckedChange={(checked) => handleSelectOne(guru.id, checked === true)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{guru.namaLengkap}</TableCell>
                            <TableCell>{guru.nipnuptk || guru.nik || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200">
                                {guru.tugasUtama || guru.kategoriPegawai || "Guru"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {guru.foto ? (
                                <img src={guru.foto} alt="" className="h-7 w-7 rounded-full object-cover mx-auto border shadow-sm" />
                              ) : (
                                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground mx-auto border font-semibold">
                                  {guru.namaLengkap.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold"
                                onClick={() => handlePrintSingle(guru.id, "guru")}
                              >
                                <Printer className="h-3 w-3 mr-1" />
                                Cetak
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Data guru tidak ditemukan.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Panel Kanan: Kustomisasi & Pratinjau (Col 5) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Pratinjau ID Card Live */}
          <div className="glass rounded-2xl p-5 border space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2 font-semibold">
                <Layout className="h-4 w-4 text-primary" />
                <span>Pratinjau Real-Time</span>
              </div>
              <span className="text-xs text-muted-foreground">Front & Back Side</span>
            </div>

            {previewItem ? (
              <div className="flex flex-col items-center gap-6 py-2">
                {/* SISI DEPAN (FRONT) */}
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tampak Depan</span>
                  <div className={`id-card-element shadow-lg rounded-xl overflow-hidden bg-white border relative text-slate-800 transition-all select-none ${
                    orientation === "portrait" ? "w-[240px] h-[380px]" : "w-[380px] h-[240px] flex"
                  }`}>
                    {/* Header Kop */}
                    <div className={`${styles.headerBg} p-2 flex items-center gap-2 border-b border-white/10 ${
                      orientation === "portrait" ? "flex-row text-center justify-center h-16" : "flex-col w-28 justify-start text-center h-full border-r border-b-0"
                    }`}>
                      {showLogo && (
                        sekolahInfo?.logo ? (
                          <img src={sekolahInfo.logo} alt="Logo" className={`${orientation === "portrait" ? "h-8 w-8" : "h-10 w-10 mt-2"} object-contain`} />
                        ) : (
                          <div className={`rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ${
                            orientation === "portrait" ? "h-8 w-8" : "h-10 w-10 mt-2"
                          }`}>
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                        )
                      )}
                      <div className="leading-tight">
                        <p className="text-[10px] font-bold uppercase tracking-wider line-clamp-2">
                          {customTitle || sekolahInfo?.namaSekolah || "NAMA SEKOLAH ANDA"}
                        </p>
                        {orientation === "portrait" && sekolahInfo?.npsn && (
                          <p className="text-[7px] opacity-75">NPSN: {sekolahInfo.npsn}</p>
                        )}
                      </div>
                    </div>

                    {/* Accent Color Line separator */}
                    {orientation === "portrait" && <div className={`h-1 w-full ${styles.accentLine}`} />}

                    {/* Body Depan */}
                    <div className={`flex flex-col items-center flex-1 p-4 ${
                      orientation === "portrait" ? "justify-center" : "justify-center w-full"
                    }`}>
                      {/* Photo Container */}
                      <div className="relative mb-3 flex-shrink-0">
                        {previewItem.data.foto ? (
                          <img 
                            src={previewItem.data.foto} 
                            alt={previewItem.data.namaLengkap} 
                            className="h-24 w-20 object-cover rounded-lg border-2 border-white shadow-md bg-muted"
                          />
                        ) : (
                          <div className="h-24 w-20 rounded-lg border-2 border-white shadow-md bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                            <CreditCard className="h-8 w-8 opacity-50" />
                            <span className="text-[7px] mt-1 font-semibold uppercase tracking-wider">No Photo</span>
                          </div>
                        )}
                        <span className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[7px] font-extrabold px-2 py-0.5 rounded-full uppercase shadow-xs ${styles.badgeBg}`}>
                          {previewItem.type === "siswa" ? "SISWA" : "GURU"}
                        </span>
                      </div>

                      {/* Biodata info */}
                      <div className="text-center w-full space-y-1 mt-1">
                        <h3 className="text-xs font-extrabold text-slate-800 line-clamp-1 leading-tight tracking-tight px-1">
                          {previewItem.data.namaLengkap}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-500 leading-none">
                          {previewItem.type === "siswa" 
                            ? `NISN: ${(previewItem.data as SiswaItem).nisn || (previewItem.data as SiswaItem).nisLokal || "-"}`
                            : `NIP/NIK: ${(previewItem.data as GuruItem).nipnuptk || (previewItem.data as GuruItem).nik || "-"}`
                          }
                        </p>
                        {previewItem.type === "siswa" && (
                          <p className="text-[9px] font-semibold text-slate-600">
                            Kelas: {(previewItem.data as SiswaItem).kelasId ? (kelasMap[(previewItem.data as SiswaItem).kelasId!] || "-") : "-"}
                          </p>
                        )}
                        {previewItem.type === "guru" && (previewItem.data as GuruItem).tugasUtama && (
                          <p className="text-[9px] font-semibold text-slate-600 truncate max-w-[180px] mx-auto">
                            {(previewItem.data as GuruItem).tugasUtama}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SISI BELAKANG (BACK) */}
                {showBackSide && (
                  <div className="flex flex-col items-center gap-1.5 w-full border-t pt-4">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tampak Belakang</span>
                    <div className={`id-card-element shadow-lg rounded-xl overflow-hidden bg-white border relative text-slate-800 p-3 flex flex-col justify-between select-none ${
                      orientation === "portrait" ? "w-[240px] h-[380px]" : "w-[380px] h-[240px]"
                    }`}>
                      {/* Watermark/Background ornament */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none">
                        <QrCode className="w-36 h-36" />
                      </div>

                      {/* Header Belakang */}
                      <div className="text-center border-b pb-1">
                        <p className="text-[8px] font-black text-slate-700 tracking-wider uppercase">TATA TERTIB & KETENTUAN</p>
                      </div>

                      {/* Aturan/Ketentuan */}
                      <div className="space-y-1.5 my-2 flex-1 flex flex-col justify-center">
                        {customRules.map((rule, idx) => (
                          <div key={idx} className="flex gap-1 items-start text-[7px] text-slate-600 leading-tight">
                            <span className="font-bold">{idx + 1}.</span>
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>

                      {/* QR & Tanda Tangan */}
                      <div className="flex items-end justify-between border-t pt-2 mt-auto">
                        {/* QR Code Section */}
                        {showQr && (
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${
                                previewItem.type === "siswa"
                                  ? ((previewItem.data as SiswaItem).nisn || (previewItem.data as SiswaItem).nisLokal || previewItem.data.id)
                                  : ((previewItem.data as GuruItem).nipnuptk || (previewItem.data as GuruItem).nik || previewItem.data.id)
                              }`} 
                              alt="QR" 
                              className="h-14 w-14 border p-0.5 rounded bg-white"
                            />
                            <span className="text-[6px] text-slate-500 font-semibold tracking-wider">SCAN ABSENSI</span>
                          </div>
                        )}

                        {/* Signature Section */}
                        {showSignature && (
                          <div className="text-right text-[7px] space-y-0.5 max-w-[120px]">
                            <p className="text-slate-500">Dikeluarkan oleh sekolah,</p>
                            <p className="font-bold text-slate-700">Kepala Sekolah</p>
                            
                            {/* Dummy Signature Area */}
                            <div className="h-6 flex items-center justify-end pr-3">
                              <span className="text-[8px] italic text-slate-300 font-serif">Stempel Sekolah</span>
                            </div>
                            
                            <p className="font-bold text-slate-800 underline leading-none">
                              {sekolahInfo?.kepalaSekolah || "Nama Kepala Sekolah"}
                            </p>
                            {sekolahInfo?.npsn && (
                              <p className="text-slate-500 text-[6px]">NPSN: {sekolahInfo.npsn}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <CreditCard className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-sm">Tidak ada data untuk dipratinjau.</p>
              </div>
            )}
          </div>

          {/* Panel Kustomisasi Desain */}
          <div className="glass rounded-2xl p-5 border space-y-5">
            <div className="flex items-center gap-2 font-semibold pb-3 border-b">
              <Sliders className="h-4 w-4 text-primary" />
              <span>Pengaturan Desain Kartu</span>
            </div>

            {/* Warna Tema */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Warna Tema Kartu</label>
              <div className="flex flex-wrap gap-2">
                {(["blue", "emerald", "teal", "indigo", "slate", "red"] as CardTheme[]).map((col) => {
                  const borderCol = 
                    col === "blue" ? "bg-blue-600" :
                    col === "emerald" ? "bg-emerald-600" :
                    col === "teal" ? "bg-teal-600" :
                    col === "indigo" ? "bg-indigo-600" :
                    col === "slate" ? "bg-slate-700" : "bg-red-600"
                  return (
                    <button
                      key={col}
                      onClick={() => setThemeColor(col)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all ${borderCol} ${
                        themeColor === col ? "border-slate-800 scale-110 shadow-md dark:border-white" : "border-transparent opacity-80"
                      }`}
                    >
                      {themeColor === col && <Check className="h-3 w-3 text-white" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Orientasi Kartu */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Orientasi</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={orientation === "portrait" ? "default" : "outline"}
                  onClick={() => setOrientation("portrait")}
                  className="flex-1 text-xs"
                >
                  Portrait (Tegak)
                </Button>
                <Button
                  size="sm"
                  variant={orientation === "landscape" ? "default" : "outline"}
                  onClick={() => setOrientation("landscape")}
                  className="flex-1 text-xs"
                >
                  Landscape (Mendatar)
                </Button>
              </div>
            </div>

            {/* Toggle elemen */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Cetak Sisi Belakang</label>
                  <p className="text-[10px] text-muted-foreground">Cetak sisi tata tertib & QR Code</p>
                </div>
                <Switch checked={showBackSide} onCheckedChange={setShowBackSide}>
                  <SwitchThumb />
                </Switch>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Logo Sekolah</label>
                  <p className="text-[10px] text-muted-foreground">Tampilkan logo sekolah di kop</p>
                </div>
                <Switch checked={showLogo} onCheckedChange={setShowLogo}>
                  <SwitchThumb />
                </Switch>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tampilkan QR Code</label>
                  <p className="text-[10px] text-muted-foreground">Tampilkan QR Code scan absensi</p>
                </div>
                <Switch checked={showQr} onCheckedChange={setShowQr}>
                  <SwitchThumb />
                </Switch>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Tanda Tangan & Stempel</label>
                  <p className="text-[10px] text-muted-foreground">Tampilkan tanda tangan kepala sekolah</p>
                </div>
                <Switch checked={showSignature} onCheckedChange={setShowSignature}>
                  <SwitchThumb />
                </Switch>
              </div>
            </div>

            {/* Input Custom Title */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Judul Kop Sekolah Kustom</label>
              <Input
                placeholder={sekolahInfo?.namaSekolah || "Ganti nama sekolah..."}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================
          AREA KHUSUS PRINT - HIDDEN DI LAYOUT WEB (CSS PRINT ONLY)
          ======================================================= */}
      <div id="print-area" className="hidden">
        <div className="print-grid">
          {/* CETAK SISWA */}
          {activeTab === "siswa" && selectedSiswaItems.map((siswa) => (
            <div key={siswa.id} className="print-card-wrapper flex flex-col gap-4 items-center">
              
              {/* SISI DEPAN (FRONT) */}
              <div className={`id-card-element bg-white border text-slate-900 rounded-lg overflow-hidden flex flex-col justify-between shadow-none ${
                orientation === "portrait" ? "w-[54mm] h-[85.6mm]" : "w-[85.6mm] h-[54mm] flex-row"
              }`}>
                {/* Header Kop */}
                <div className={`${styles.headerBg} p-1.5 flex items-center gap-1.5 border-b border-slate-200 ${
                  orientation === "portrait" ? "flex-row text-center justify-center h-12" : "flex-col w-20 justify-start text-center h-full border-r border-b-0"
                }`}>
                  {showLogo && (
                    sekolahInfo?.logo ? (
                      <img src={sekolahInfo.logo} alt="Logo" className={`${orientation === "portrait" ? "h-6 w-6" : "h-8 w-8 mt-1"} object-contain`} />
                    ) : (
                      <div className={`rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ${
                        orientation === "portrait" ? "h-6 w-6" : "h-8 w-8 mt-1"
                      }`}>
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )
                  )}
                  <div className="leading-none text-left">
                    <p className="text-[7.5px] font-black uppercase tracking-wider leading-tight">
                      {customTitle || sekolahInfo?.namaSekolah || "SIM SEKOLAH"}
                    </p>
                    {orientation === "portrait" && sekolahInfo?.npsn && (
                      <p className="text-[5.5px] opacity-75 font-medium leading-none">NPSN: {sekolahInfo.npsn}</p>
                    )}
                  </div>
                </div>

                {/* Body Depan */}
                <div className={`flex flex-col items-center justify-center flex-1 p-2 ${
                  orientation === "portrait" ? "" : "w-full"
                }`}>
                  {/* Photo */}
                  <div className="relative mb-2 flex-shrink-0">
                    {siswa.foto ? (
                      <img src={siswa.foto} alt="" className="h-20 w-16 object-cover rounded-md border border-slate-300" />
                    ) : (
                      <div className="h-20 w-16 rounded-md border border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <CreditCard className="h-6 w-6 opacity-30" />
                        <span className="text-[5px] font-bold">NO FOTO</span>
                      </div>
                    )}
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[5.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${styles.badgeBg}`}>
                      SISWA
                    </span>
                  </div>

                  {/* Bio */}
                  <div className="text-center space-y-0.5 w-full">
                    <h3 className="text-[8.5px] font-black text-slate-800 line-clamp-1 leading-tight">
                      {siswa.namaLengkap}
                    </h3>
                    <p className="text-[7px] font-bold text-slate-500 leading-none">
                      NISN: {siswa.nisn || siswa.nisLokal || "-"}
                    </p>
                    <p className="text-[7px] font-semibold text-slate-600 leading-none">
                      Kelas: {siswa.kelasId ? (kelasMap[siswa.kelasId] || "-") : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* SISI BELAKANG (BACK) */}
              {showBackSide && (
                <div className={`id-card-element bg-white border text-slate-900 rounded-lg overflow-hidden flex flex-col justify-between p-2.5 ${
                  orientation === "portrait" ? "w-[54mm] h-[85.6mm]" : "w-[85.6mm] h-[54mm]"
                }`}>
                  <div className="text-center border-b pb-0.5">
                    <p className="text-[6.5px] font-black text-slate-700 tracking-wider">KETENTUAN PENGGUNAAN</p>
                  </div>
                  
                  <div className="space-y-1 my-1.5 flex-1 flex flex-col justify-center">
                    {customRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-0.5 items-start text-[5.5px] text-slate-600 leading-tight">
                        <span className="font-bold">{idx + 1}.</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between border-t pt-1.5">
                    {/* QR Code */}
                    {showQr && (
                      <div className="flex flex-col items-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${siswa.nisn || siswa.nisLokal || siswa.id}`} 
                          alt="QR" 
                          className="h-10 w-10 border p-0.5 rounded bg-white"
                        />
                        <span className="text-[4.5px] text-slate-500 font-bold">SCAN ABSENSI</span>
                      </div>
                    )}

                    {/* Signature */}
                    {showSignature && (
                      <div className="text-right text-[5.5px] space-y-0.5 max-w-[80px]">
                        <p className="text-slate-500 leading-none">Dikeluarkan oleh,</p>
                        <p className="font-bold text-slate-700 leading-none">Kepala Sekolah</p>
                        <div className="h-4"></div>
                        <p className="font-bold text-slate-800 underline leading-none">{sekolahInfo?.kepalaSekolah || "Kepala Sekolah"}</p>
                        {sekolahInfo?.npsn && <p className="text-slate-500 text-[4.5px] leading-none">NPSN: {sekolahInfo.npsn}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* CETAK GURU */}
          {activeTab === "guru" && selectedGuruItems.map((guru) => (
            <div key={guru.id} className="print-card-wrapper flex flex-col gap-4 items-center">
              
              {/* SISI DEPAN (FRONT) */}
              <div className={`id-card-element bg-white border text-slate-900 rounded-lg overflow-hidden flex flex-col justify-between shadow-none ${
                orientation === "portrait" ? "w-[54mm] h-[85.6mm]" : "w-[85.6mm] h-[54mm] flex-row"
              }`}>
                {/* Header Kop */}
                <div className={`${styles.headerBg} p-1.5 flex items-center gap-1.5 border-b border-slate-200 ${
                  orientation === "portrait" ? "flex-row text-center justify-center h-12" : "flex-col w-20 justify-start text-center h-full border-r border-b-0"
                }`}>
                  {showLogo && (
                    sekolahInfo?.logo ? (
                      <img src={sekolahInfo.logo} alt="Logo" className={`${orientation === "portrait" ? "h-6 w-6" : "h-8 w-8 mt-1"} object-contain`} />
                    ) : (
                      <div className={`rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 ${
                        orientation === "portrait" ? "h-6 w-6" : "h-8 w-8 mt-1"
                      }`}>
                        <Sparkles className="h-3 w-3 text-white" />
                      </div>
                    )
                  )}
                  <div className="leading-none text-left">
                    <p className="text-[7.5px] font-black uppercase tracking-wider leading-tight">
                      {customTitle || sekolahInfo?.namaSekolah || "SIM SEKOLAH"}
                    </p>
                    {orientation === "portrait" && sekolahInfo?.npsn && (
                      <p className="text-[5.5px] opacity-75 font-medium leading-none">NPSN: {sekolahInfo.npsn}</p>
                    )}
                  </div>
                </div>

                {/* Body Depan */}
                <div className={`flex flex-col items-center justify-center flex-1 p-2 ${
                  orientation === "portrait" ? "" : "w-full"
                }`}>
                  {/* Photo */}
                  <div className="relative mb-2 flex-shrink-0">
                    {guru.foto ? (
                      <img src={guru.foto} alt="" className="h-20 w-16 object-cover rounded-md border border-slate-300" />
                    ) : (
                      <div className="h-20 w-16 rounded-md border border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                        <CreditCard className="h-6 w-6 opacity-30" />
                        <span className="text-[5px] font-bold">NO FOTO</span>
                      </div>
                    )}
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[5.5px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${styles.badgeBg}`}>
                      GURU
                    </span>
                  </div>

                  {/* Bio */}
                  <div className="text-center space-y-0.5 w-full">
                    <h3 className="text-[8.5px] font-black text-slate-800 line-clamp-1 leading-tight">
                      {guru.namaLengkap}
                    </h3>
                    <p className="text-[7px] font-bold text-slate-500 leading-none">
                      NIP/NIK: {guru.nipnuptk || guru.nik || "-"}
                    </p>
                    <p className="text-[7px] font-semibold text-slate-600 line-clamp-1 leading-none">
                      {guru.tugasUtama || "Pendidik"}
                    </p>
                  </div>
                </div>
              </div>

              {/* SISI BELAKANG (BACK) */}
              {showBackSide && (
                <div className={`id-card-element bg-white border text-slate-900 rounded-lg overflow-hidden flex flex-col justify-between p-2.5 ${
                  orientation === "portrait" ? "w-[54mm] h-[85.6mm]" : "w-[85.6mm] h-[54mm]"
                }`}>
                  <div className="text-center border-b pb-0.5">
                    <p className="text-[6.5px] font-black text-slate-700 tracking-wider">KETENTUAN PENGGUNAAN</p>
                  </div>
                  
                  <div className="space-y-1 my-1.5 flex-1 flex flex-col justify-center">
                    {customRules.map((rule, idx) => (
                      <div key={idx} className="flex gap-0.5 items-start text-[5.5px] text-slate-600 leading-tight">
                        <span className="font-bold">{idx + 1}.</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between border-t pt-1.5">
                    {/* QR Code */}
                    {showQr && (
                      <div className="flex flex-col items-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${guru.nipnuptk || guru.nik || guru.id}`} 
                          alt="QR" 
                          className="h-10 w-10 border p-0.5 rounded bg-white"
                        />
                        <span className="text-[4.5px] text-slate-500 font-bold">SCAN ABSENSI</span>
                      </div>
                    )}

                    {/* Signature */}
                    {showSignature && (
                      <div className="text-right text-[5.5px] space-y-0.5 max-w-[80px]">
                        <p className="text-slate-500 leading-none">Dikeluarkan oleh,</p>
                        <p className="font-bold text-slate-700 leading-none">Kepala Sekolah</p>
                        <div className="h-4"></div>
                        <p className="font-bold text-slate-800 underline leading-none">{sekolahInfo?.kepalaSekolah || "Kepala Sekolah"}</p>
                        {sekolahInfo?.npsn && <p className="text-slate-500 text-[4.5px] leading-none">NPSN: {sekolahInfo.npsn}</p>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
