"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ClipboardCheck, Save, Loader2, Calendar, Settings, QrCode, ShieldAlert, CheckCircle2, Scan } from "lucide-react"

type StatusAbsensi = "hadir" | "izin" | "sakit" | "alpha" | "terlambat"

const STATUS_LABELS: Record<StatusAbsensi, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpha: "Alpha",
  terlambat: "Terlambat",
}

const STATUS_COLORS: Record<StatusAbsensi, string> = {
  hadir: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  terlambat: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  izin: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  sakit: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  alpha: "bg-destructive/10 text-destructive border-destructive/20",
}

export default function AbsensiPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const utils = api.useUtils()

  const [activeTab, setActiveTab] = useState<string>("manual")
  const [targetType, setTargetType] = useState<"siswa" | "guru">("siswa")
  const [kelasId, setKelasId] = useState("")
  const [tanggal, setTanggal] = useState("")

  // Form states for manual attendance
  const [siswaRecords, setSiswaRecords] = useState<Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }>>({})
  const [guruRecords, setGuruRecords] = useState<Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }>>({})

  // Settings states
  const [jamMasukSetting, setJamMasukSetting] = useState("07:00")
  const [jamPulangSetting, setJamPulangSetting] = useState("14:00")
  const [toleransiSetting, setToleransiSetting] = useState(15)

  // Scanner states
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; name?: string; action?: string; status?: string } | null>(null)

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0])
  }, [])

  // Queries
  const { data: ownGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: role === "guru",
  })
  const { data: classes } = api.kelas.getAll.useQuery({})
  const { data: siswaAll } = api.siswa.getAll.useQuery({})
  const { data: guruAll } = api.guru.getAll.useQuery({}, {
    enabled: role === "super_admin" || role === "admin_sekolah" || role === "tu",
  })

  const isWaliKelas = !!(ownGuru && classes?.some((c) => c.waliKelasId === ownGuru.id))
  const isWakaOrKepsek = !!(
    ownGuru &&
    (ownGuru.tugasUtama?.toLowerCase().includes("kepala") ||
      ownGuru.tugasUtama?.toLowerCase().includes("waka") ||
      ownGuru.tugasTambahan?.toLowerCase().includes("kepala") ||
      ownGuru.tugasTambahan?.toLowerCase().includes("waka"))
  )

  const canManageGlobal = role === "super_admin" || role === "admin_sekolah"
  const canTakeAttendance = role === "super_admin" || role === "admin_sekolah" || role === "tu" || isWaliKelas

  // Load appropriate default tab
  useEffect(() => {
    if (!canTakeAttendance) {
      setActiveTab("pribadi")
    } else {
      setActiveTab("manual")
    }
  }, [canTakeAttendance])

  const settingsQuery = api.absensi.getPengaturan.useQuery(undefined, {
    enabled: canTakeAttendance,
  })

  // Load settings into state
  useEffect(() => {
    if (settingsQuery.data) {
      setJamMasukSetting(settingsQuery.data.jamMasuk)
      setJamPulangSetting(settingsQuery.data.jamPulang)
      setToleransiSetting(settingsQuery.data.toleransi)
    }
  }, [settingsQuery.data])

  const siswaDiKelas = useMemo(() => {
    if (!siswaAll) return []
    if (role === "guru" && isWaliKelas && !canManageGlobal) {
      const waliKelasClass = classes?.find((c) => c.waliKelasId === ownGuru?.id)
      return (siswaAll || []).filter((s) => s.kelasId === waliKelasClass?.id)
    }
    return (siswaAll || []).filter((s) => s.kelasId === kelasId)
  }, [siswaAll, kelasId, role, isWaliKelas, ownGuru, classes, canManageGlobal])

  // Automatically lock Wali Kelas to their class
  useEffect(() => {
    if (role === "guru" && isWaliKelas && classes && ownGuru) {
      const waliKelasClass = classes.find((c) => c.waliKelasId === ownGuru.id)
      if (waliKelasClass) setKelasId(waliKelasClass.id)
    }
  }, [role, isWaliKelas, classes, ownGuru])

  // Get student attendance
  const studentAttendanceQuery = api.absensi.getByKelas.useQuery(
    { kelasId, tanggal: new Date(tanggal + "T00:00:00") },
    { enabled: !!kelasId && !!tanggal && targetType === "siswa" && canTakeAttendance },
  )

  // Get guru attendance
  const guruAttendanceQuery = api.absensi.getGuruAbsensi.useQuery(
    { tanggal: new Date(tanggal + "T00:00:00") },
    { enabled: !!tanggal && targetType === "guru" && canTakeAttendance },
  )

  // Get personal attendance
  const ownGuruAttendanceQuery = api.absensi.getGuruOwnAbsensi.useQuery(
    { limit: 30 },
    { enabled: role === "guru" },
  )
  const ownSiswaAttendanceQuery = api.absensi.getStudentOwnAbsensi.useQuery(
    { limit: 30 },
    { enabled: role === "siswa" },
  )

  const currentSiswaInfo = useMemo(() => {
    if (role !== "siswa" || !siswaAll) return null
    return (siswaAll || []).find((s) => s.usernameSiswa === session?.user?.email || s.nisn === session?.user?.email)
  }, [siswaAll, role, session])

  // Populate manual records for siswa
  useEffect(() => {
    if (studentAttendanceQuery.data && studentAttendanceQuery.data.length > 0) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const r of studentAttendanceQuery.data) {
        map[r.siswaId] = {
          status: r.status as StatusAbsensi,
          jamMasuk: r.jamMasuk ? new Date(r.jamMasuk).toTimeString().slice(0, 5) : "",
          jamPulang: r.jamPulang ? new Date(r.jamPulang).toTimeString().slice(0, 5) : "",
        }
      }
      setSiswaRecords(map)
    } else if (studentAttendanceQuery.isFetched) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const s of siswaDiKelas) {
        map[s.id] = { status: "hadir", jamMasuk: "", jamPulang: "" }
      }
      setSiswaRecords(map)
    }
  }, [studentAttendanceQuery.data, studentAttendanceQuery.isFetched, siswaDiKelas])

  // Populate manual records for guru
  useEffect(() => {
    if (guruAttendanceQuery.data && guruAttendanceQuery.data.length > 0 && guruAll) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const r of guruAttendanceQuery.data) {
        map[r.guruId] = {
          status: r.status as StatusAbsensi,
          jamMasuk: r.jamMasuk ? new Date(r.jamMasuk).toTimeString().slice(0, 5) : "",
          jamPulang: r.jamPulang ? new Date(r.jamPulang).toTimeString().slice(0, 5) : "",
        }
      }
      setGuruRecords(map)
    } else if (guruAttendanceQuery.isFetched && guruAll) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const g of guruAll) {
        map[g.id] = { status: "hadir", jamMasuk: "", jamPulang: "" }
      }
      setGuruRecords(map)
    }
  }, [guruAttendanceQuery.data, guruAttendanceQuery.isFetched, guruAll])

  const createAbsensiSiswa = api.absensi.create.useMutation()
  const updateAbsensiSiswa = api.absensi.update.useMutation()
  const saveGuruAbsensi = api.absensi.createOrUpdateGuruAbsensi.useMutation()
  const saveSettings = api.absensi.savePengaturan.useMutation()
  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation()

  const handleSaveSettings = async () => {
    try {
      await saveSettings.mutateAsync({
        jamMasuk: jamMasukSetting,
        jamPulang: jamPulangSetting,
        toleransi: toleransiSetting,
      })
      toast.success("Pengaturan absensi berhasil disimpan")
      settingsQuery.refetch()
    } catch {
      toast.error("Gagal menyimpan pengaturan")
    }
  }

  const handleManualSave = async () => {
    if (!tanggal) {
      toast.error("Pilih tanggal terlebih dahulu")
      return
    }

    try {
      const tanggalDate = new Date(tanggal + "T00:00:00")

      if (targetType === "siswa") {
        if (!kelasId) {
          toast.error("Pilih kelas terlebih dahulu")
          return
        }

        const existingMap = new Map((studentAttendanceQuery.data || []).map((r) => [r.siswaId, r]))
        const toCreate: any[] = []
        const toUpdate: any[] = []

        for (const s of siswaDiKelas) {
          const rec = siswaRecords[s.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
          const existing = existingMap.get(s.id)

          const jamMasukDate = rec.jamMasuk ? new Date(tanggal + "T" + rec.jamMasuk + ":00") : null
          const jamPulangDate = rec.jamPulang ? new Date(tanggal + "T" + rec.jamPulang + ":00") : null

          if (existing) {
            if (
              existing.status !== rec.status ||
              (existing.jamMasuk && new Date(existing.jamMasuk).toTimeString().slice(0, 5) !== rec.jamMasuk) ||
              (!existing.jamMasuk && rec.jamMasuk) ||
              (existing.jamPulang && new Date(existing.jamPulang).toTimeString().slice(0, 5) !== rec.jamPulang) ||
              (!existing.jamPulang && rec.jamPulang)
            ) {
              toUpdate.push({
                id: existing.id,
                status: rec.status,
                jamMasuk: jamMasukDate,
                jamPulang: jamPulangDate,
              })
            }
          } else {
            toCreate.push({
              siswaId: s.id,
              kelasId,
              tanggal: tanggalDate,
              status: rec.status,
              jamMasuk: jamMasukDate,
              jamPulang: jamPulangDate,
            })
          }
        }

        if (toCreate.length > 0) {
          await createAbsensiSiswa.mutateAsync({ absensi: toCreate })
        }
        for (const u of toUpdate) {
          await updateAbsensiSiswa.mutateAsync(u)
        }

        toast.success("Absensi siswa berhasil disimpan")
        studentAttendanceQuery.refetch()
      } else {
        // Guru
        if (!guruAll) return

        for (const g of guruAll) {
          const rec = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
          const existing = (guruAttendanceQuery.data || []).find((r) => r.guruId === g.id)

          const jamMasukDate = rec.jamMasuk ? new Date(tanggal + "T" + rec.jamMasuk + ":00") : null
          const jamPulangDate = rec.jamPulang ? new Date(tanggal + "T" + rec.jamPulang + ":00") : null

          if (existing) {
            if (
              existing.status !== rec.status ||
              (existing.jamMasuk && new Date(existing.jamMasuk).toTimeString().slice(0, 5) !== rec.jamMasuk) ||
              (!existing.jamMasuk && rec.jamMasuk) ||
              (existing.jamPulang && new Date(existing.jamPulang).toTimeString().slice(0, 5) !== rec.jamPulang) ||
              (!existing.jamPulang && rec.jamPulang)
            ) {
              await saveGuruAbsensi.mutateAsync({
                id: existing.id,
                guruId: g.id,
                tanggal: tanggalDate,
                status: rec.status,
                jamMasuk: jamMasukDate,
                jamPulang: jamPulangDate,
              })
            }
          } else {
            await saveGuruAbsensi.mutateAsync({
              guruId: g.id,
              tanggal: tanggalDate,
              status: rec.status,
              jamMasuk: jamMasukDate,
              jamPulang: jamPulangDate,
            })
          }
        }

        toast.success("Absensi guru berhasil disimpan")
        guruAttendanceQuery.refetch()
      }
    } catch {
      toast.error("Gagal menyimpan absensi")
    }
  }

  const handleHadirSemua = () => {
    const nowTime = new Date().toTimeString().slice(0, 5)
    if (targetType === "siswa") {
      const updated = { ...siswaRecords }
      for (const s of siswaDiKelas) {
        updated[s.id] = { status: "hadir", jamMasuk: nowTime, jamPulang: "" }
      }
      setSiswaRecords(updated)
    } else if (guruAll) {
      const updated = { ...guruRecords }
      for (const g of guruAll) {
        updated[g.id] = { status: "hadir", jamMasuk: nowTime, jamPulang: "" }
      }
      setGuruRecords(updated)
    }
    toast.info("Status diset Hadir Semua dengan jam masuk saat ini")
  }

  const updateManualRecord = (id: string, field: "status" | "jamMasuk" | "jamPulang", value: any) => {
    const records = targetType === "siswa" ? siswaRecords : guruRecords
    const setRecords = targetType === "siswa" ? setSiswaRecords : setGuruRecords

    const current = records[id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
    const updated = { ...current, [field]: value }

    // Auto set time if status changes to hadir or terlambat and time is empty
    if (field === "status" && (value === "hadir" || value === "terlambat") && !current.jamMasuk) {
      updated.jamMasuk = new Date().toTimeString().slice(0, 5)
    }

    setRecords({ ...records, [id]: updated })
  }

  // Audio beep simulation for barcode scans
  const playBeep = (type: "success" | "error") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === "success") {
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime)
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch (e) {
      console.warn("Audio Context beep failed to play", e)
    }
  }

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const result = await barcodeScanMutation.mutateAsync({ barcode: decodedText })
      playBeep("success")
      setScanResult({
        success: true,
        name: result.name,
        action: result.action === "masuk" ? "MASUK" : "PULANG",
        status: STATUS_LABELS[result.status as StatusAbsensi],
        message: `Absensi ${result.action === "masuk" ? "Masuk" : "Pulang"} untuk ${result.name} berhasil dicatat dengan status ${STATUS_LABELS[result.status as StatusAbsensi]}.`,
      })
      toast.success(`Scan Berhasil: ${result.name} (${result.action === "masuk" ? "Masuk" : "Pulang"})`)
    } catch (err: any) {
      playBeep("error")
      setScanResult({
        success: false,
        message: err.message || "Gagal memproses absensi barcode",
      })
      toast.error(err.message || "Scan Gagal")
    }
  }

  // Camera initialization with Lazy Loading
  useEffect(() => {
    if (activeTab === "scan" && isScannerActive) {
      let html5Qrcode: any = null
      const scannerId = "reader"

      // Wait brief moment to guarantee div is mounted
      const timer = setTimeout(() => {
        import("html5-qrcode").then(({ Html5Qrcode }) => {
          html5Qrcode = new Html5Qrcode(scannerId)
          html5Qrcode
            .start(
              { facingMode: "environment" },
              { fps: 10, qrbox: { width: 250, height: 250 } },
              (decodedText: string) => {
                handleScanSuccess(decodedText)
              },
              () => {},
            )
            .catch((err: any) => {
              console.error("Camera scanner start failed:", err)
            })
        })
      }, 300)

      return () => {
        clearTimeout(timer)
        if (html5Qrcode) {
          try {
            if (html5Qrcode.isScanning) {
              html5Qrcode.stop().then(() => {
                html5Qrcode.clear()
              })
            }
          } catch (e) {
            console.error("Cleanup camera failed", e)
          }
        }
      }
    }
  }, [activeTab, isScannerActive])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold">Absensi Harian</h2>
          <p className="text-sm text-muted-foreground">Kelola kehadiran harian guru dan siswa</p>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-px">
        {canTakeAttendance && (
          <button
            onClick={() => {
              setActiveTab("manual")
              setIsScannerActive(false)
            }}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "manual" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Absen Manual
          </button>
        )}
        {canTakeAttendance && (
          <button
            onClick={() => {
              setActiveTab("scan")
              setIsScannerActive(true)
            }}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "scan" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Scan Barcode
          </button>
        )}
        {canManageGlobal && (
          <button
            onClick={() => {
              setActiveTab("setting")
              setIsScannerActive(false)
            }}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "setting" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Pengaturan Absen
          </button>
        )}
        {!canTakeAttendance && (
          <button
            onClick={() => setActiveTab("pribadi")}
            className={`pb-2.5 px-4 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "pribadi" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Presensi Saya
          </button>
        )}
        {canTakeAttendance && (
          <>
            <button onClick={() => toast.info("Modul Face Recognition akan diintegrasikan pada Fase 2")} className="pb-2.5 px-4 text-sm font-semibold border-b-2 border-transparent text-muted-foreground/50 cursor-pointer">
              Face Recognition <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-normal">Soon</span>
            </button>
            <button onClick={() => toast.info("Modul Sidik Jari akan diintegrasikan pada Fase 2")} className="pb-2.5 px-4 text-sm font-semibold border-b-2 border-transparent text-muted-foreground/50 cursor-pointer">
              Sidik Jari <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-normal">Soon</span>
            </button>
            <button onClick={() => toast.info("Modul NFC akan diintegrasikan pada Fase 2")} className="pb-2.5 px-4 text-sm font-semibold border-b-2 border-transparent text-muted-foreground/50 cursor-pointer">
              Tap NFC <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-normal">Soon</span>
            </button>
          </>
        )}
      </div>

      {activeTab === "manual" && canTakeAttendance && (
        <div className="space-y-4">
          <Card className="glass-card p-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex gap-2 flex-wrap items-center">
              <Select value={targetType} onValueChange={(v: any) => setTargetType(v)}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Tipe Absen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="siswa">Siswa</SelectItem>
                  {canManageGlobal && <SelectItem value="guru">Guru/Pegawai</SelectItem>}
                </SelectContent>
              </Select>

              {targetType === "siswa" && (
                <Select value={kelasId} onValueChange={(v) => setKelasId(v ?? "")} disabled={role === "guru" && isWaliKelas && !canManageGlobal}>
                  <SelectTrigger className="w-48 h-9">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.namaKelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="relative flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground absolute left-3" />
                <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-9 w-40 pl-9" />
              </div>
            </div>

            <div className="md:ml-auto flex gap-2 flex-wrap">
              <Button variant="outline" className="h-9" onClick={handleHadirSemua} disabled={targetType === "siswa" && !kelasId}>
                Hadir Semua
              </Button>
              <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} className="h-9 text-white" onClick={handleManualSave} disabled={createAbsensiSiswa.isPending || saveGuruAbsensi.isPending || (targetType === "siswa" && !kelasId)}>
                {(createAbsensiSiswa.isPending || saveGuruAbsensi.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" /> Simpan Absensi
              </Button>
            </div>
          </Card>

          {targetType === "siswa" && !kelasId ? (
            <Card className="p-12 text-center text-muted-foreground text-sm">Silakan pilih rombongan belajar (kelas) terlebih dahulu.</Card>
          ) : targetType === "siswa" && studentAttendanceQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : targetType === "siswa" && siswaDiKelas.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground text-sm">Tidak ada siswa terdaftar di kelas ini.</Card>
          ) : targetType === "siswa" ? (
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>NISN</TableHead>
                    <TableHead>Nama Lengkap</TableHead>
                    <TableHead className="text-center w-[300px]">Status Absensi</TableHead>
                    <TableHead className="w-[120px]">Jam Datang</TableHead>
                    <TableHead className="w-[120px]">Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {siswaDiKelas.map((std, idx) => {
                    const record = siswaRecords[std.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                    return (
                      <TableRow key={std.id}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{std.nisn}</TableCell>
                        <TableCell className="font-medium">{std.namaLengkap}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center flex-wrap">
                            {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateManualRecord(std.id, "status", st)}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                  record.status === st ? STATUS_COLORS[st] : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
                                }`}
                              >
                                {STATUS_LABELS[st]}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="time" className="h-8 py-0 px-2 text-xs" value={record.jamMasuk} onChange={(e) => updateManualRecord(std.id, "jamMasuk", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="time" className="h-8 py-0 px-2 text-xs" value={record.jamPulang} onChange={(e) => updateManualRecord(std.id, "jamPulang", e.target.value)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : null}

          {targetType === "guru" && guruAttendanceQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : targetType === "guru" && (!guruAll || guruAll.length === 0) ? (
            <Card className="p-12 text-center text-muted-foreground text-sm">Tidak ada guru terdaftar.</Card>
          ) : targetType === "guru" && guruAll ? (
            <Card className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>NIP/NUPTK</TableHead>
                    <TableHead>Nama Guru</TableHead>
                    <TableHead className="text-center w-[300px]">Status Absensi</TableHead>
                    <TableHead className="w-[120px]">Jam Datang</TableHead>
                    <TableHead className="w-[120px]">Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {guruAll.map((g, idx) => {
                    const record = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{g.nipnuptk || "-"}</TableCell>
                        <TableCell className="font-medium">{g.namaLengkap}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center flex-wrap">
                            {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => updateManualRecord(g.id, "status", st)}
                                className={`px-2 py-1 rounded text-xs font-semibold border transition-all cursor-pointer ${
                                  record.status === st ? STATUS_COLORS[st] : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted"
                                }`}
                              >
                                {STATUS_LABELS[st]}
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input type="time" className="h-8 py-0 px-2 text-xs" value={record.jamMasuk} onChange={(e) => updateManualRecord(g.id, "jamMasuk", e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="time" className="h-8 py-0 px-2 text-xs" value={record.jamPulang} onChange={(e) => updateManualRecord(g.id, "jamPulang", e.target.value)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          ) : null}
        </div>
      )}

      {activeTab === "scan" && canTakeAttendance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="glass-card p-5 lg:col-span-2 space-y-4 flex flex-col items-center">
            <div className="text-center">
              <h3 className="font-semibold text-lg">Scan Barcode / QR Code Kehadiran</h3>
              <p className="text-sm text-muted-foreground">Posisikan kode batang NISN Siswa atau NIP Guru di depan kamera</p>
            </div>

            <div className="relative w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-muted">
              {isScannerActive ? (
                <div id="reader" className="w-full h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 text-muted-foreground">
                  <Scan className="h-16 w-16 mb-3 stroke-[1.5]" />
                  <p className="text-sm font-medium">Kamera tidak aktif</p>
                  <Button className="mt-4" onClick={() => setIsScannerActive(true)}>
                    Aktifkan Kamera
                  </Button>
                </div>
              )}
            </div>

            {isScannerActive && (
              <Button variant="destructive" onClick={() => setIsScannerActive(false)}>
                Matikan Kamera
              </Button>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="glass-card p-5">
              <h4 className="font-bold text-sm mb-3">Hasil Pemindaian (Scan)</h4>
              {!scanResult ? (
                <div className="py-12 text-center text-muted-foreground text-xs">Menunggu pemindaian barcode...</div>
              ) : scanResult.success ? (
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-lg text-emerald-800 dark:text-emerald-300 leading-tight">{scanResult.name}</h5>
                    <p className="text-xs text-muted-foreground mt-1">Pemindaian berhasil</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-left">
                    <div className="bg-muted/50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold">TIPE AKSES</p>
                      <p className="font-bold text-sm mt-0.5">{scanResult.action}</p>
                    </div>
                    <div className="bg-muted/50 p-2.5 rounded-xl">
                      <p className="text-[10px] text-muted-foreground font-semibold">STATUS MASUK</p>
                      <p className="font-bold text-sm mt-0.5">{scanResult.status}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed px-1">{scanResult.message}</p>
                </div>
              ) : (
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-10 w-10" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-red-600 leading-tight">Pemindaian Gagal</h5>
                    <p className="text-xs text-muted-foreground mt-1">Sistem menolak scan</p>
                  </div>
                  <p className="text-sm text-muted-foreground bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-950/30 leading-relaxed">
                    {scanResult.message}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === "setting" && canManageGlobal && (
        <Card className="glass-card p-6 max-w-xl space-y-5">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Konfigurasi Absensi Global Siswa</h3>
          </div>

          {settingsQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jam Masuk Wajib</Label>
                  <Input type="time" value={jamMasukSetting} onChange={(e) => setJamMasukSetting(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Toleransi Keterlambatan (Menit)</Label>
                  <Input type="number" min={0} value={toleransiSetting} onChange={(e) => setToleransiSetting(parseInt(e.target.value) || 0)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Jam Pulang (Lock Checkout)</Label>
                <Input type="time" value={jamPulangSetting} onChange={(e) => setJamPulangSetting(e.target.value)} />
              </div>

              <div className="pt-2 flex justify-end">
                <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} className="text-white w-full sm:w-auto" onClick={handleSaveSettings} disabled={saveSettings.isPending}>
                  {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Simpan Konfigurasi
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === "pribadi" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-6 space-y-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Barcode Presensi Anda</h3>
              <p className="text-xs text-muted-foreground mt-1">Gunakan kode ini pada webcam scanner di sekolah</p>
            </div>

            {role === "siswa" && currentSiswaInfo && (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border border-muted flex items-center justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentSiswaInfo.nisn}`} alt="Siswa QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">{currentSiswaInfo.namaLengkap}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">NISN: {currentSiswaInfo.nisn}</p>
                </div>
              </div>
            )}

            {role === "guru" && ownGuru && (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border border-muted flex items-center justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ownGuru.nipnuptk || ownGuru.id}`} alt="Guru QR Code" className="w-48 h-48" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm">{ownGuru.namaLengkap}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">NIP/ID: {ownGuru.nipnuptk || ownGuru.id}</p>
                </div>
              </div>
            )}
          </Card>

          <Card className="glass-card p-5 md:col-span-2 space-y-4">
            <div>
              <h3 className="font-bold text-base">Riwayat Kehadiran (30 Hari Terakhir)</h3>
              <p className="text-xs text-muted-foreground">Log kehadiran masuk dan pulang mandiri</p>
            </div>

            {role === "siswa" && ownSiswaAttendanceQuery.isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {role === "siswa" && ownSiswaAttendanceQuery.data && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jam Datang</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownSiswaAttendanceQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Tidak ada log kehadiran dalam 30 hari terakhir.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownSiswaAttendanceQuery.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[row.status as StatusAbsensi]} variant="secondary">
                            {STATUS_LABELS[row.status as StatusAbsensi]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.jamMasuk ? new Date(row.jamMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.jamPulang ? new Date(row.jamPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {role === "guru" && ownGuruAttendanceQuery.isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {role === "guru" && ownGuruAttendanceQuery.data && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jam Datang</TableHead>
                    <TableHead>Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownGuruAttendanceQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Tidak ada log kehadiran dalam 30 hari terakhir.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownGuruAttendanceQuery.data.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[row.status as StatusAbsensi]} variant="secondary">
                            {STATUS_LABELS[row.status as StatusAbsensi]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.jamMasuk ? new Date(row.jamMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{row.jamPulang ? new Date(row.jamPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
