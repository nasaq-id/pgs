"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Settings, Loader2, Compass, Shield, CheckCircle2, Clock, MapPin } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function PengaturanPresensiPage() {
  const settingsQuery = api.absensi.getPengaturan.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })
  const { data: sekolah } = api.lembaga.getSekolah.useQuery(undefined, {
    refetchOnWindowFocus: false,
  })
  const saveSettings = api.absensi.savePengaturan.useMutation()

  // Master selection state
  const [aturanGuru, setAturanGuru] = useState<"per_jp" | "umum">("per_jp")
  const [activeSubTab, setActiveSubTab] = useState<"swasta" | "negeri">("swasta")

  // Swasta specific states
  const [toleransiSwasta, setToleransiSwasta] = useState(15)

  // Negeri/PNS specific states
  const [jamMasukNegeri, setJamMasukNegeri] = useState("07:00")
  const [jamPulangNegeri, setJamPulangNegeri] = useState("14:00")
  const [toleransiNegeri, setToleransiNegeri] = useState(15)

  // Shared Geofence states
  const [latitudeSetting, setLatitudeSetting] = useState("")
  const [longitudeSetting, setLongitudeSetting] = useState("")
  const [radiusSetting, setRadiusSetting] = useState(100)
  const [isUkurLoading, setIsUkurLoading] = useState(false)

  // Load settings into state
  useEffect(() => {
    if (settingsQuery.data) {
      const dbAturan = (settingsQuery.data.aturanGuru as "per_jp" | "umum") || "per_jp"
      setAturanGuru(dbAturan)
      setActiveSubTab(dbAturan === "per_jp" ? "swasta" : "negeri")
      
      // Init states
      if (dbAturan === "per_jp") {
        setToleransiSwasta(settingsQuery.data.toleransi)

        // Fallbacks for Negeri state
        setJamMasukNegeri(settingsQuery.data.jamMasuk)
        setJamPulangNegeri(settingsQuery.data.jamPulang)
        setToleransiNegeri(15)
      } else {
        setJamMasukNegeri(settingsQuery.data.jamMasuk)
        setJamPulangNegeri(settingsQuery.data.jamPulang)
        setToleransiNegeri(settingsQuery.data.toleransi)

        // Fallbacks for Swasta state
        setToleransiSwasta(15)
      }

      setLatitudeSetting(settingsQuery.data.latitude || "")
      setLongitudeSetting(settingsQuery.data.longitude || "")
      setRadiusSetting(settingsQuery.data.radius ?? 100)
    }
  }, [settingsQuery.data])

  const handleSaveAll = async () => {
    try {
      await saveSettings.mutateAsync({
        aturanGuru,
        toleransi: aturanGuru === "per_jp" ? toleransiSwasta : toleransiNegeri,
        jamMasuk: jamMasukNegeri,
        jamPulang: jamPulangNegeri,
        latitude: latitudeSetting.trim() || null,
        longitude: longitudeSetting.trim() || null,
        radius: radiusSetting,
      })
      toast.success("Pengaturan presensi berhasil disimpan")
      settingsQuery.refetch()
    } catch {
      toast.error("Gagal menyimpan pengaturan presensi")
    }
  }

  const handleUkurPosisi = () => {
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak didukung oleh browser Anda")
      return
    }
    setIsUkurLoading(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitudeSetting(position.coords.latitude.toString())
        setLongitudeSetting(position.coords.longitude.toString())
        setIsUkurLoading(false)
        toast.success("Berhasil mendapatkan koordinat GPS terbaru!")
      },
      (error) => {
        setIsUkurLoading(false)
        console.error("GPS Error:", error)
        toast.error("Gagal mendapatkan lokasi GPS: " + (error.message || "Izin ditolak"))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-left">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Pengaturan Presensi Guru & Pegawai</h2>
        <p className="text-xs text-slate-500 font-semibold">Tentukan metode dan toleransi presensi masuk/pulang guru sesuai dengan jenis pengelolaan sekolah.</p>
      </div>

      {/* 1. Master Toggle Card */}
      <div className="neumo-card bg-background rounded-[26px] p-6 space-y-4 text-left">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-teal-600" />
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Metode Aturan Aktif</h3>
        </div>

        {settingsQuery.isLoading ? (
          <Skeleton className="h-16 w-full rounded-2xl" />
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pilih Metode Presensi Guru</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                Tentukan apakah sekolah menerapkan perhitungan kehadiran berbasis jam mengajar (Swasta) atau jam kerja seragam (Negeri/PNS).
              </p>
            </div>

            <Select
              value={aturanGuru}
              onValueChange={(v) => {
                if (v === "per_jp" || v === "umum") {
                  setAturanGuru(v)
                }
              }}
            >
              <SelectTrigger className="w-full md:w-[280px] h-10 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-teal-650 dark:text-teal-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850">
                <SelectValue placeholder="Pilih aturan presensi" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg">
                <SelectItem value="per_jp" className="text-xs font-semibold">Sekolah Swasta (Jam Pelajaran)</SelectItem>
                <SelectItem value="umum" className="text-xs font-semibold">Sekolah Negeri/PNS (Jam Kerja Umum)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 text-left">
        {/* Left Side: Settings Panel */}
        <div className="neumo-card bg-background rounded-[26px] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Konfigurasi Detail Parameter</h3>
          </div>

          {settingsQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : (
            <>
              <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)} className="w-full">
                <TabsList className="bg-slate-100/85 dark:bg-slate-900/60 p-1 rounded-2xl w-full flex gap-2 border border-slate-200/50 dark:border-slate-800 shadow-inner mb-6">
                  <TabsTrigger 
                    value="swasta" 
                    className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans"
                  >
                    <span>Sekolah Swasta (JP)</span>
                    {aturanGuru === "per_jp" && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-black tracking-wider text-white bg-emerald-600 dark:bg-emerald-500 rounded-md">AKTIF</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="negeri" 
                    className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 data-[state=active]:border-slate-700/50 cursor-pointer text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 font-sans"
                  >
                    <span>Sekolah Negeri/PNS</span>
                    {aturanGuru === "umum" && (
                      <span className="px-1.5 py-0.5 text-[8.5px] font-black tracking-wider text-white bg-emerald-600 dark:bg-emerald-500 rounded-md">AKTIF</span>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Sekolah Swasta */}
                <TabsContent value="swasta" className="space-y-5 focus-visible:outline-none">
                  <div className="p-4 bg-teal-500/[0.03] border border-teal-500/10 rounded-2xl text-[11.5px] leading-relaxed text-teal-850 dark:text-teal-400 font-semibold space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10.5px]">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>Metode Presensi Jam Pelajaran (JP)</span>
                    </div>
                    <p>Batas keterlambatan guru dihitung secara otomatis berdasarkan jam mulai **Jam Pelajaran (JP)** pertama yang diampu masing-masing guru pada hari tersebut. Jam pulang juga dikunci hingga jam selesai JP terakhir.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Toleransi Keterlambatan (Menit)</Label>
                      <input
                        type="number"
                        min={0}
                        value={toleransiSwasta}
                        onChange={(e) => setToleransiSwasta(parseInt(e.target.value) || 0)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                      <span className="text-[10px] text-slate-400 font-medium block">Toleransi keterlambatan setelah jam pelajaran dimulai.</span>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Sekolah Negeri */}
                <TabsContent value="negeri" className="space-y-5 focus-visible:outline-none">
                  <div className="p-4 bg-teal-500/[0.03] border border-teal-500/10 rounded-2xl text-[11.5px] leading-relaxed text-teal-800 dark:text-teal-400 font-semibold space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[10.5px]">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>Metode Presensi Jam Kerja Umum PNS</span>
                    </div>
                    <p>Batas keterlambatan dan checkout guru dihitung secara umum sesuai jam masuk wajib & jam pulang sekolah yang telah ditentukan di bawah ini, mengabaikan jadwal pelajaran (JP) guru pada hari bersangkutan.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jam Masuk Wajib</Label>
                      <input
                        type="time"
                        value={jamMasukNegeri}
                        onChange={(e) => setJamMasukNegeri(e.target.value)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Toleransi (Menit)</Label>
                      <input
                        type="number"
                        min={0}
                        value={toleransiNegeri}
                        onChange={(e) => setToleransiNegeri(parseInt(e.target.value) || 0)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jam Pulang (Lock Checkout)</Label>
                    <input
                      type="time"
                      value={jamPulangNegeri}
                      onChange={(e) => setJamPulangNegeri(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Unified Save Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                <button
                  className="h-10 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none px-6 flex items-center justify-center shadow-md shadow-teal-500/5 transition-all disabled:opacity-50"
                  onClick={handleSaveAll}
                  disabled={saveSettings.isPending}
                >
                  {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <span>Simpan Seluruh Pengaturan</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Side: Geofence Location Settings */}
        <div className="space-y-6">
          <div className="neumo-card bg-background rounded-[26px] p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-teal-600 dark:text-teal-400">
              <MapPin className="h-5 w-5" />
              <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Lokasi & Geofencing</h4>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Latitude</Label>
                <input
                  type="text"
                  placeholder="Contoh: -6.9175"
                  value={latitudeSetting}
                  onChange={(e) => setLatitudeSetting(e.target.value)}
                  className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Longitude</Label>
                <input
                  type="text"
                  placeholder="Contoh: 107.6191"
                  value={longitudeSetting}
                  onChange={(e) => setLongitudeSetting(e.target.value)}
                  className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Radius Toleransi (Meter)</Label>
                <input
                  type="number"
                  min={10}
                  value={radiusSetting}
                  onChange={(e) => setRadiusSetting(parseInt(e.target.value) || 100)}
                  className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                />
              </div>

              <button
                type="button"
                onClick={handleUkurPosisi}
                disabled={isUkurLoading}
                className="h-10 px-3 rounded-xl text-[10.5px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 w-full"
              >
                {isUkurLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Compass className="h-4 w-4" />
                )}
                <span>Dapatkan GPS Terkini</span>
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="neumo-card bg-background rounded-[26px] border border-emerald-500/20 bg-emerald-500/[0.01] p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-4 w-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">Geofence Keamanan</h4>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
              Sistem geofencing membatasi radius absensi guru dan pegawai untuk lembaga <strong className="text-slate-800 dark:text-slate-200">{sekolah?.namaSekolah || "Sekolah Anda"}</strong>. Absensi di luar koordinat ini akan ditolak demi menjaga integritas data presensi.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
