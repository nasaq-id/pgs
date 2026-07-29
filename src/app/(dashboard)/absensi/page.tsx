"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
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
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import JSZip from "jszip"
import QRCode from "qrcode"
import { ClipboardCheck, Save, Loader2, Calendar, Settings, QrCode, ShieldAlert, CheckCircle2, Scan, Download, Printer, Compass, Shield, X, User } from "lucide-react"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"

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

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
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
  const [latitudeSetting, setLatitudeSetting] = useState("")
  const [longitudeSetting, setLongitudeSetting] = useState("")
  const [radiusSetting, setRadiusSetting] = useState(100)
  const [isUkurLoading, setIsUkurLoading] = useState(false)

  const [isScannerActive, setIsScannerActive] = useState(false)
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; name?: string; action?: string; status?: string } | null>(null)
  type ScanState = "idle" | "scanning" | "processing" | "cooldown"
  const [scannerState, setScannerState] = useState<ScanState>("idle")
  const scannerStateRef = useRef<ScanState>("idle")
  const scanProcessingLockRef = useRef(false)
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Late reason states
  const [lateDialogOpen, setLateDialogOpen] = useState(false)
  const [lateData, setLateData] = useState<{
    barcode: string
    latitude: number | null
    longitude: number | null
    name: string
    type: "siswa" | "guru"
  } | null>(null)
  const [lateReason, setLateReason] = useState("")
  const [submittingLateReason, setSubmittingLateReason] = useState(false)

  // Bulk download barcode states
  const [bulkFilterClassId, setBulkFilterClassId] = useState<string>("semua")
  const [bulkDownloading, setBulkDownloading] = useState(false)
  const [bulkProgress, setBulkProgress] = useState("")
  const [qrPerPage, setQrPerPage] = useState<string>("6")
  const [bulkPrinting, setBulkPrinting] = useState(false)
  const initializedSiswaKelasRef = useRef<string | null>(null)
  const initializedGuruRef = useRef(false)
  const [siswaQrUrl, setSiswaQrUrl] = useState<string | null>(null)
  const [guruQrUrl, setGuruQrUrl] = useState<string | null>(null)
  const [adminQrUrl, setAdminQrUrl] = useState<string | null>(null)

  useEffect(() => {
    setTanggal(new Date().toISOString().split("T")[0])
  }, [])

  // Queries
  const { data: ownGuru } = api.lms.getCurrentGuru.useQuery(undefined, {
    enabled: role === "guru",
  })
  const { data: classes } = api.kelas.getAll.useQuery({})
  const { data: siswaAll } = api.siswa.getAll.useQuery({ limit: 10000 })
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

  const { data: sekolah } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: canTakeAttendance,
  })

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
      setLatitudeSetting(settingsQuery.data.latitude || "")
      setLongitudeSetting(settingsQuery.data.longitude || "")
      setRadiusSetting(settingsQuery.data.radius ?? 100)
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
    return (siswaAll || []).find((s) => s.usernameSiswa === session?.user?.email || s.nisn === session?.user?.email || s.nisLokal === session?.user?.email)
  }, [siswaAll, role, session])

  // Generate personal QR data URLs locally instead of using external api.qrserver.com
  useEffect(() => {
    if (role === "siswa" && currentSiswaInfo) {
      const qrData = currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || currentSiswaInfo.id
      QRCode.toDataURL(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setSiswaQrUrl).catch(() => {})
    }
  }, [role, currentSiswaInfo])

  useEffect(() => {
    if (role === "guru" && ownGuru) {
      const qrData = ownGuru.nipnuptk || ownGuru.nik || ownGuru.id
      QRCode.toDataURL(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setGuruQrUrl).catch(() => {})
    }
  }, [role, ownGuru])

  useEffect(() => {
    if (role === "super_admin" || role === "admin_sekolah" || role === "tu") {
      const qrData = session?.user?.email || session?.user?.id || ""
      QRCode.toDataURL(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setAdminQrUrl).catch(() => {})
    }
  }, [role, session])

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
      initializedSiswaKelasRef.current = kelasId
    } else if (studentAttendanceQuery.isFetched && initializedSiswaKelasRef.current !== kelasId) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const s of siswaDiKelas) {
        map[s.id] = { status: "hadir", jamMasuk: "", jamPulang: "" }
      }
      setSiswaRecords(map)
      initializedSiswaKelasRef.current = kelasId
    }
  }, [studentAttendanceQuery.data, studentAttendanceQuery.isFetched, siswaDiKelas, kelasId])

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
      initializedGuruRef.current = true
    } else if (guruAttendanceQuery.isFetched && guruAll && !initializedGuruRef.current) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string }> = {}
      for (const g of guruAll) {
        map[g.id] = { status: "hadir", jamMasuk: "", jamPulang: "" }
      }
      setGuruRecords(map)
      initializedGuruRef.current = true
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
        latitude: latitudeSetting.trim() || null,
        longitude: longitudeSetting.trim() || null,
        radius: radiusSetting,
      })
      toast.success("Pengaturan absensi berhasil disimpan")
      settingsQuery.refetch()
    } catch {
      toast.error("Gagal menyimpan pengaturan")
    }
  }

  const handleSaveGeofence = async () => {
    try {
      await saveSettings.mutateAsync({
        jamMasuk: jamMasukSetting,
        jamPulang: jamPulangSetting,
        toleransi: toleransiSetting,
        latitude: latitudeSetting.trim() || null,
        longitude: longitudeSetting.trim() || null,
        radius: radiusSetting,
      })
      toast.success("Pengaturan geofencing berhasil disimpan")
      settingsQuery.refetch()
    } catch {
      toast.error("Gagal menyimpan pengaturan geofencing")
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
        const toCreate: { siswaId: string; kelasId: string; tanggal: Date; status: StatusAbsensi; jamMasuk: Date | null; jamPulang: Date | null }[] = []
        const toUpdate: { id: string; status: StatusAbsensi; jamMasuk: Date | null; jamPulang: Date | null }[] = []

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
        const updatePromises = toUpdate.map((u) => updateAbsensiSiswa.mutateAsync(u))
        await Promise.all(updatePromises)

        toast.success("Absensi siswa berhasil disimpan")
        studentAttendanceQuery.refetch()
      } else {
        // Guru
        if (!guruAll) return

        const guruPromises: Promise<any>[] = []

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
              guruPromises.push(saveGuruAbsensi.mutateAsync({
                id: existing.id,
                guruId: g.id,
                tanggal: tanggalDate,
                status: rec.status,
                jamMasuk: jamMasukDate,
                jamPulang: jamPulangDate,
              }))
            }
          } else {
            guruPromises.push(saveGuruAbsensi.mutateAsync({
              guruId: g.id,
              tanggal: tanggalDate,
              status: rec.status,
              jamMasuk: jamMasukDate,
              jamPulang: jamPulangDate,
            }))
          }
        }

        await Promise.all(guruPromises)

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

  const updateManualRecord = (id: string, field: "status" | "jamMasuk" | "jamPulang", value: string) => {
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
    if (scanProcessingLockRef.current || scannerStateRef.current !== "scanning") return
    scanProcessingLockRef.current = true
    setScannerState("processing")
    scannerStateRef.current = "processing"

    const scanner = scannerRef.current
    if (scanner.instance && !scanner.stopped) {
      try {
        await scanner.instance.stop()
        scanner.stopped = true
      } catch {}
    }

    try {
      let coords: { latitude: number; longitude: number } | null = null
      if (navigator.geolocation) {
        coords = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              })
            },
            () => {
              resolve(null)
            },
            { enableHighAccuracy: true, timeout: 5000 }
          )
        })
      }

      const result = (await barcodeScanMutation.mutateAsync({
        barcode: decodedText,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      })) as any

      if (result.requireReason) {
        setLateData({
          barcode: decodedText,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          name: result.name ?? "",
          type: result.type as "siswa" | "guru",
        })
        setLateReason("")
        setLateDialogOpen(true)
        playBeep("error")
        toast.warning(`Terlambat: Harap masukkan alasan keterlambatan.`)
        setScannerState("cooldown")
        scannerStateRef.current = "cooldown"
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
        cooldownTimerRef.current = setTimeout(() => {
          scanProcessingLockRef.current = false
          setScannerState("scanning")
          scannerStateRef.current = "scanning"
          setIsScannerActive(true)
        }, 2500)
        return
      }

      playBeep("success")
      setScanResult({
        success: true,
        name: result.name,
        action: result.action === "masuk" ? "MASUK" : "PULANG",
        status: STATUS_LABELS[result.status as StatusAbsensi],
        message: `Absensi ${result.action === "masuk" ? "Masuk" : "Pulang"} untuk ${result.name} berhasil dicatat dengan status ${STATUS_LABELS[result.status as StatusAbsensi]}.`,
      })
      toast.success(`Scan Berhasil: ${result.name} (${result.action === "masuk" ? "Masuk" : "Pulang"})`)

      setScannerState("cooldown")
      scannerStateRef.current = "cooldown"
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = setTimeout(() => {
        scanProcessingLockRef.current = false
        setScannerState("scanning")
        scannerStateRef.current = "scanning"
        setIsScannerActive(true)
      }, 2500)
    } catch (err: any) {
      playBeep("error")
      setScanResult({
        success: false,
        message: err.message || "Gagal memproses absensi barcode",
      })
      toast.error(err.message || "Scan Gagal")

      setScannerState("cooldown")
      scannerStateRef.current = "cooldown"
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
      cooldownTimerRef.current = setTimeout(() => {
        scanProcessingLockRef.current = false
        setScannerState("scanning")
        scannerStateRef.current = "scanning"
        setIsScannerActive(true)
      }, 2500)
    }
  }

  const handleLateReasonSubmit = async () => {
    if (!lateData || !lateReason.trim()) return
    setSubmittingLateReason(true)
    try {
      const result = await barcodeScanMutation.mutateAsync({
        barcode: lateData.barcode,
        latitude: lateData.latitude,
        longitude: lateData.longitude,
        alasan: lateReason.trim(),
      })
      playBeep("success")
      setScanResult({
        success: true,
        name: result.name,
        action: result.action === "masuk" ? "MASUK" : "PULANG",
        status: STATUS_LABELS[result.status as StatusAbsensi],
        message: `Absensi Masuk untuk ${result.name} berhasil dicatat dengan status ${STATUS_LABELS[result.status as StatusAbsensi]}. Alasan: ${lateReason.trim()}`,
      })
      toast.success(`Scan Berhasil: ${result.name} (Masuk - Terlambat)`)
      setLateDialogOpen(false)
      setLateData(null)
      setLateReason("")
    } catch (err: any) {
      playBeep("error")
      setScanResult({
        success: false,
        message: err.message || "Gagal mengirimkan alasan terlambat",
      })
      toast.error(err.message || "Gagal Kirim Alasan")
    } finally {
      setSubmittingLateReason(false)
    }
  }

  const handleBulkDownloadBarcodes = async () => {
    if (!siswaAll || siswaAll.length === 0) {
      toast.error("Data siswa tidak tersedia atau belum dimuat.")
      return
    }

    let filteredSiswa = siswaAll
    let filterName = "semua"

    if (bulkFilterClassId !== "semua") {
      filteredSiswa = siswaAll.filter((s) => s.kelasId === bulkFilterClassId)
      const targetClass = classes?.find((c) => c.id === bulkFilterClassId)
      if (targetClass) {
        filterName = targetClass.namaKelas.replace(/[/\\?%*:|"<>\s]+/g, "_")
      }
    }

    if (filteredSiswa.length === 0) {
      toast.error("Tidak ada siswa ditemukan untuk filter terpilih.")
      return
    }

    setBulkDownloading(true)
    setBulkProgress("Mempersiapkan...")

    try {
      const zip = new JSZip()
      let count = 0

      for (const std of filteredSiswa) {
        count++
        setBulkProgress(`Membuat QR (${count}/${filteredSiswa.length}): ${std.namaLengkap}`)

        const qrText = std.nisn || std.nisLokal || std.id
        const qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: "M",
        })

        const base64Data = qrDataUrl.split(",")[1]
        if (!base64Data) continue

        const classObj = classes?.find((c) => c.id === std.kelasId)
        const className = classObj ? classObj.namaKelas.replace(/[/\\?%*:|"<>\s]+/g, "_") : "Tanpa_Kelas"
        const studentNameClean = std.namaLengkap.replace(/[/\\?%*:|"<>\s]+/g, "_")
        const fileName = `${className}/${studentNameClean}_${qrText}.png`

        zip.file(fileName, base64Data, { base64: true })
      }

      setBulkProgress("Mengompresi berkas ZIP...")
      const zipBlob = await zip.generateAsync({ type: "blob" })

      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipBlob)
      link.download = `barcode_presensi_siswa_${filterName}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      toast.success(`Berhasil mengunduh ZIP barcode untuk ${filteredSiswa.length} siswa`)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Gagal membuat berkas ZIP barcode.")
    } finally {
      setBulkDownloading(false)
      setBulkProgress("")
    }
  }

  const handleBulkPrintQR = async () => {
    if (!siswaAll || siswaAll.length === 0) {
      toast.error("Data siswa tidak tersedia atau belum dimuat.")
      return
    }

    let filteredSiswa = siswaAll
    if (bulkFilterClassId !== "semua") {
      filteredSiswa = siswaAll.filter((s) => s.kelasId === bulkFilterClassId)
    }

    if (filteredSiswa.length === 0) {
      toast.error("Tidak ada siswa ditemukan untuk filter terpilih.")
      return
    }

    setBulkPrinting(true)
    setBulkProgress("Mempersiapkan Cetak QR...")

    try {
      const siswaWithQr: { name: string; class: string; identifier: string; qrDataUrl: string }[] = []
      let count = 0

      for (const std of filteredSiswa) {
        count++
        setBulkProgress(`Membuat QR (${count}/${filteredSiswa.length}): ${std.namaLengkap}`)

        const qrText = std.nisn || std.nisLokal || std.id
        const qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "M",
        })

        const classObj = classes?.find((c) => c.id === std.kelasId)
        const className = classObj ? classObj.namaKelas : "Tanpa Kelas"

        siswaWithQr.push({
          name: std.namaLengkap,
          class: className,
          identifier: std.nisn || std.nisLokal || "-",
          qrDataUrl,
        })
      }

      const limitPerPage = parseInt(qrPerPage) || 6
      const pages: typeof siswaWithQr[] = []
      for (let i = 0; i < siswaWithQr.length; i += limitPerPage) {
        pages.push(siswaWithQr.slice(i, i + limitPerPage))
      }

      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        toast.error("Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.")
        return
      }

      const printLayouts: Record<number, { cols: number; rows: number; gap: string; cardH: string; logoFz: string; titleFz: string; nameFz: string; descFz: string }> = {
        4: { cols: 2, rows: 2, gap: "20px", cardH: "115mm", logoFz: "0.9rem", titleFz: "0.8rem", nameFz: "1.2rem", descFz: "0.9rem" },
        6: { cols: 2, rows: 3, gap: "15px", cardH: "78mm", logoFz: "0.75rem", titleFz: "0.7rem", nameFz: "1rem", descFz: "0.8rem" },
        8: { cols: 2, rows: 4, gap: "10px", cardH: "58mm", logoFz: "0.7rem", titleFz: "0.65rem", nameFz: "0.9rem", descFz: "0.75rem" },
        9: { cols: 3, rows: 3, gap: "12px", cardH: "78mm", logoFz: "0.75rem", titleFz: "0.7rem", nameFz: "1rem", descFz: "0.8rem" },
        12: { cols: 3, rows: 4, gap: "10px", cardH: "58mm", logoFz: "0.7rem", titleFz: "0.65rem", nameFz: "0.9rem", descFz: "0.75rem" },
        16: { cols: 4, rows: 4, gap: "8px", cardH: "58mm", logoFz: "0.6rem", titleFz: "0.55rem", nameFz: "0.75rem", descFz: "0.65rem" },
      }
      const layout = printLayouts[limitPerPage] || { cols: 2, rows: 3, gap: "15px", cardH: "80mm", logoFz: "0.75rem", titleFz: "0.7rem", nameFz: "1rem", descFz: "0.8rem" }
      const { cols: gridCols, rows: gridRows, gap: gapSize, cardH: cardHeight, logoFz: logoFontSize, titleFz: titleFontSize, nameFz: nameFontSize, descFz: descFontSize } = layout

      const schoolName = sekolah?.namaSekolah || "PORTAL GARDA SEKOLAH"

      let htmlContent = `
        <html>
          <head>
            <title>Cetak Massal QR Code Presensi Siswa</title>
            <style>
              @page {
                size: A4;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .page {
                width: 210mm;
                height: 297mm;
                padding: 12mm;
                box-sizing: border-box;
                display: grid;
                grid-template-columns: repeat(${gridCols}, 1fr);
                grid-template-rows: repeat(${gridRows}, 1fr);
                gap: ${gapSize};
                page-break-after: always;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .card {
                border: 1.5px solid #e2e8f0;
                border-radius: 16px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                box-sizing: border-box;
                height: ${cardHeight};
                text-align: center;
                background-color: #fff;
                position: relative;
                overflow: hidden;
              }
              .card-accent {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #14b8a6, #10b981);
              }
              .logo {
                font-weight: 800;
                font-size: ${logoFontSize};
                color: #0f766e;
                margin-top: 4px;
                text-transform: uppercase;
                letter-spacing: 0.02em;
                line-height: 1.2;
              }
              .card-title {
                font-weight: 700;
                text-transform: uppercase;
                font-size: ${titleFontSize};
                letter-spacing: 0.05em;
                color: #10b981;
                margin: 2px 0;
              }
              .qr-img {
                max-width: 85%;
                max-height: 55%;
                object-fit: contain;
                margin: 4px 0;
              }
              .student-name {
                font-weight: 800;
                font-size: ${nameFontSize};
                color: #1e293b;
                margin: 2px 0;
                display: -webkit-box;
                -webkit-line-clamp: 1;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
              .student-info {
                font-size: ${descFontSize};
                color: #64748b;
                font-weight: 600;
                margin-bottom: 4px;
              }
              .identifier-badge {
                font-family: monospace;
                background: #f1f5f9;
                padding: 2px 8px;
                border-radius: 6px;
                font-size: calc(${descFontSize} - 0.08rem);
                font-weight: 700;
                color: #475569;
                display: inline-block;
              }
            </style>
          </head>
          <body>
      `;

      for (const pageSiswa of pages) {
        htmlContent += `<div class="page">`;
        for (const s of pageSiswa) {
          htmlContent += `
              <div class="card">
                <div class="card-accent"></div>
                <div class="logo">${escapeHtml(s.class)} &middot; ${escapeHtml(schoolName)}</div>
                <div class="card-title">Kartu Presensi Siswa</div>
                <img class="qr-img" src="${s.qrDataUrl}" alt="QR Code" />
                <div>
                  <div class="student-name">${escapeHtml(s.name)}</div>
                  <span class="identifier-badge">NIS/NISN: ${escapeHtml(s.identifier)}</span>
                </div>
              </div>
          `;
        }
        htmlContent += `</div>`;
      }

      htmlContent += `
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent)
      printWindow.document.close()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Gagal menyiapkan cetak massal.")
    } finally {
      setBulkPrinting(false)
      setBulkProgress("")
    }
  }

  const handleDownloadQR = async (data: string, name: string) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(data, { width: 300, margin: 2, errorCorrectionLevel: "M" })
      const link = document.createElement("a")
      link.href = qrDataUrl
      link.download = `QR_Absensi_${name.replace(/\s+/g, "_")}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("QR Code berhasil diunduh")
    } catch (e) {
      console.error("QR download failed", e)
      toast.error("Gagal mengunduh QR Code")
    }
  }

  const handlePrintQR = async (data: string, name: string, roleName: string, identifier: string) => {
    const printWindow = window.open("", "_blank", "width=600,height=600")
    if (!printWindow) return

    let qrDataUrl = ""
    try {
      qrDataUrl = await QRCode.toDataURL(data, { width: 250, margin: 2, errorCorrectionLevel: "M" })
    } catch {
      toast.error("Gagal membuat QR Code")
      return
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak QR Code - ${escapeHtml(name)}</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              border: 2px solid #ddd;
              border-radius: 16px;
              padding: 30px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              max-width: 320px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .logo {
              font-weight: 800;
              font-size: 1.1rem;
              color: #10b981;
              margin-bottom: 10px;
            }
            img {
              width: 180px;
              height: 180px;
              margin: 15px 0;
            }
            h2 {
              margin: 10px 0 5px 0;
              font-size: 1.1rem;
            }
            p {
              margin: 0;
              color: #666;
              font-size: 0.85rem;
            }
            .identifier {
              font-family: monospace;
              background: #f3f4f6;
              padding: 4px 8px;
              border-radius: 4px;
              display: inline-block;
              margin-top: 8px;
              font-size: 0.75rem;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">E-PRESENSI SEKOLAH</div>
            <p style="font-weight: 600; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; color: #10b981;">KARTU PRESENSI ${escapeHtml(roleName)}</p>
            <img src="${qrDataUrl}" alt="QR" />
            <h2>${escapeHtml(name)}</h2>
            <span class="identifier">${escapeHtml(identifier)}</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Camera initialization with safe cleanup
  const scannerRef = useRef<{ instance: any; stopped: boolean }>({ instance: null, stopped: true })
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      scanProcessingLockRef.current = false
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const scanner = scannerRef.current
    if (activeTab !== "scan" || !isScannerActive || scannerState === "processing" || scannerState === "cooldown") {
      if (scanner.instance && !scanner.stopped) {
        scanner.instance.stop().then(() => {
          scanner.instance.clear()
          scanner.stopped = true
        }).catch(() => {})
      }
      return
    }

    scanner.stopped = false
    const scannerId = "reader"

    const timer = setTimeout(() => {
      import("html5-qrcode").then(({ Html5Qrcode }) => {
        if (!mountedRef.current || scanner.stopped) return
        scanner.instance = new Html5Qrcode(scannerId)
        scanner.instance
          .start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText: string) => {
              handleScanSuccess(decodedText)
            },
            () => {},
          )
          .then(() => {
            if (scannerStateRef.current !== "processing" && scannerStateRef.current !== "cooldown") {
              setScannerState("scanning")
              scannerStateRef.current = "scanning"
            }
          })
          .catch((err: any) => {
            console.error("Camera scanner start failed:", err)
          })
      })
    }, 300)

    return () => {
      clearTimeout(timer)
      scanner.stopped = true
      if (scanner.instance) {
        try {
          scanner.instance.stop().then(() => {
            scanner.instance.clear()
          }).catch(() => {})
        } catch (e) {
          console.error("Cleanup camera failed", e)
        }
      }
    }
  }, [activeTab, isScannerActive, scannerState])

  return (
    <ErrorBoundary>
    <div className="space-y-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            <span className="text-[10px] font-black uppercase tracking-wider">Modul Presensi Kehadiran</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Absensi Harian</h2>
          <p className="text-muted-foreground text-xs mt-1">Kelola kehadiran harian guru, tendik, dan siswa</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v);
        setIsScannerActive(v === "scan");
      }} className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="bg-slate-100/85 dark:bg-slate-900/60 p-1 rounded-2xl w-full max-w-4xl flex gap-2 border border-slate-200/50 dark:border-slate-800 shadow-inner">
            {canManageGlobal && (
              <TabsTrigger value="setting" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 dark:data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Settings className="w-4 h-4" />
                <span>Pengaturan Presensi</span>
              </TabsTrigger>
            )}
            {canTakeAttendance && (
              <TabsTrigger value="manual" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <ClipboardCheck className="w-4 h-4" />
                <span>Presensi Manual</span>
              </TabsTrigger>
            )}
            {canTakeAttendance && (
              <TabsTrigger value="scan" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Scan className="w-4 h-4" />
                <span>Scan Barcode</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="pribadi" className="flex-1 rounded-xl px-4 py-2.5 font-bold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm data-[state=active]:text-teal-650 dark:data-[state=active]:text-teal-400 data-[state=active]:border data-[state=active]:border-slate-200/20 data-[state=active]:border-slate-700/50 cursor-pointer text-[10.5px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5">
              <User className="w-4 h-4" />
              <span>Presensi Saya</span>
            </TabsTrigger>
            {canTakeAttendance && (
              <>
                <button
                  type="button"
                  onClick={() => toast.info("Modul Sidik Jari akan diintegrasikan pada Fase 2")}
                  className="flex-1 rounded-xl px-4 py-2.5 font-black uppercase tracking-wider text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1 cursor-not-allowed text-[10.5px] sm:text-xs"
                >
                  Sidik Jari <span className="text-[8px] bg-slate-250 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded ml-1 font-bold">Soon</span>
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Modul Face Recognition akan diintegrasikan pada Fase 2")}
                  className="flex-1 rounded-xl px-4 py-2.5 font-black uppercase tracking-wider text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1 cursor-not-allowed text-[10.5px] sm:text-xs"
                >
                  Face ID <span className="text-[8px] bg-slate-250 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded ml-1 font-bold">Soon</span>
                </button>
              </>
            )}
          </TabsList>
        </div>
      </Tabs>

      {activeTab === "manual" && canTakeAttendance && (
        <div className="space-y-4">
          <div className="neumo-card bg-background rounded-[26px] p-4 md:p-5 flex flex-col md:flex-row gap-3 items-start md:items-center text-left">
            <div className="flex gap-2 flex-wrap items-center">
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as "siswa" | "guru")}
                options={[
                  { value: "siswa", label: "Siswa" },
                  { value: "guru", label: "Guru/Pegawai" }
                ]}
              >
                <SelectTrigger className="w-full sm:w-36 !h-10 !rounded-2xl text-xs font-bold cursor-pointer">
                  <SelectValue placeholder="Tipe Absen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="siswa">Siswa</SelectItem>
                  {canManageGlobal && <SelectItem value="guru">Guru/Pegawai</SelectItem>}
                </SelectContent>
              </Select>

              {targetType === "siswa" && (
                <Select
                  value={kelasId}
                  onValueChange={(v) => setKelasId(v ?? "")}
                  disabled={role === "guru" && isWaliKelas && !canManageGlobal}
                  options={classes?.map((c) => ({ value: c.id, label: c.namaKelas }))}
                >
                   <SelectTrigger className="w-full sm:w-48 !h-10 !rounded-2xl text-xs font-bold cursor-pointer">
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

              <div className="relative flex items-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 shrink-0 !h-10">
                <Calendar className="h-4 w-4 text-slate-450 dark:text-slate-500 mr-2" />
                <input
                  type="date"
                  lang="id-ID"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none w-[130px] cursor-pointer"
                />
              </div>
            </div>

            <div className="md:ml-auto flex gap-2 flex-wrap">
              <Button
                variant="outline"
                className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 bg-white dark:bg-slate-900 transition-all"
                onClick={handleHadirSemua}
                disabled={targetType === "siswa" && !kelasId}
              >
                Hadir Semua
              </Button>
              <button
                className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-teal-600 hover:bg-teal-700 text-white border-none px-4 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleManualSave}
                disabled={createAbsensiSiswa.isPending || saveGuruAbsensi.isPending || (targetType === "siswa" && !kelasId)}
              >
                {(createAbsensiSiswa.isPending || saveGuruAbsensi.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                <span>Simpan Absensi</span>
              </button>
            </div>
          </div>

          {targetType === "siswa" && !kelasId ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              Silakan pilih rombongan belajar (kelas) terlebih dahulu.
            </div>
          ) : targetType === "siswa" && studentAttendanceQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : targetType === "siswa" && siswaDiKelas.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              Tidak ada siswa terdaftar di kelas ini.
            </div>
          ) : targetType === "siswa" ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-[22px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm text-left">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                      <TableHead className="w-12 text-center text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">NISN</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Lengkap</TableHead>
                      <TableHead className="text-center w-[300px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status Absensi</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siswaDiKelas.map((std, idx) => {
                      const record = siswaRecords[std.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                      return (
                        <TableRow key={std.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="text-center text-slate-450 dark:text-slate-500 text-xs font-semibold">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{std.nisn}</TableCell>
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{std.namaLengkap}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center flex-wrap">
                              {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateManualRecord(std.id, "status", st)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                    record.status === st ? STATUS_COLORS[st] : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-850"
                                  }`}
                                >
                                  {STATUS_LABELS[st]}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              value={record.jamMasuk}
                              onChange={(e) => updateManualRecord(std.id, "jamMasuk", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              value={record.jamPulang}
                              onChange={(e) => updateManualRecord(std.id, "jamPulang", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {siswaDiKelas.map((std, idx) => {
                  const record = siswaRecords[std.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                  return (
                    <div key={std.id} className="neumo-card bg-background rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{std.namaLengkap}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{std.nisn}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Status</span>
                        <div className="flex gap-1 flex-wrap">
                          {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateManualRecord(std.id, "status", st)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                record.status === st ? STATUS_COLORS[st] : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-550"
                              }`}
                            >
                              {STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Datang</span>
                          <input
                            type="time"
                            value={record.jamMasuk}
                            onChange={(e) => updateManualRecord(std.id, "jamMasuk", e.target.value)}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Pulang</span>
                          <input
                            type="time"
                            value={record.jamPulang}
                            onChange={(e) => updateManualRecord(std.id, "jamPulang", e.target.value)}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}

          {targetType === "guru" && guruAttendanceQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : targetType === "guru" && (!guruAll || guruAll.length === 0) ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              Tidak ada guru terdaftar.
            </div>
          ) : targetType === "guru" && guruAll ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block rounded-[22px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm text-left">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                      <TableHead className="w-12 text-center text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">NIP/NUPTK</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Guru</TableHead>
                      <TableHead className="text-center w-[300px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status Absensi</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guruAll.map((g, idx) => {
                      const record = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                      return (
                        <TableRow key={g.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                          <TableCell className="text-center text-slate-450 dark:text-slate-500 text-xs font-semibold">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{g.nipnuptk || "-"}</TableCell>
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{g.namaLengkap}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center flex-wrap">
                              {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateManualRecord(g.id, "status", st)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                    record.status === st ? STATUS_COLORS[st] : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-850"
                                  }`}
                                >
                                  {STATUS_LABELS[st]}
                                </button>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              value={record.jamMasuk}
                              onChange={(e) => updateManualRecord(g.id, "jamMasuk", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              value={record.jamPulang}
                              onChange={(e) => updateManualRecord(g.id, "jamPulang", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {guruAll.map((g, idx) => {
                  const record = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "" }
                  return (
                    <div key={g.id} className="neumo-card bg-background rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{g.namaLengkap}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{g.nipnuptk || "-"}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Status</span>
                        <div className="flex gap-1 flex-wrap">
                          {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateManualRecord(g.id, "status", st)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                                record.status === st ? STATUS_COLORS[st] : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-550"
                              }`}
                            >
                              {STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Datang</span>
                          <input
                            type="time"
                            value={record.jamMasuk}
                            onChange={(e) => updateManualRecord(g.id, "jamMasuk", e.target.value)}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Pulang</span>
                          <input
                            type="time"
                            value={record.jamPulang}
                            onChange={(e) => updateManualRecord(g.id, "jamPulang", e.target.value)}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      )}

      {activeTab === "scan" && canTakeAttendance && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
          <div className="neumo-card bg-background rounded-[26px] p-5 lg:col-span-2 space-y-4 flex flex-col items-center">
            <div className="text-center">
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200">Scan Barcode / QR Code Kehadiran</h3>
              <p className="text-xs text-muted-foreground mt-1">Posisikan kode batang NISN Siswa atau NIP Guru di depan kamera</p>
            </div>

            <div className="relative w-full max-w-md aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
              {isScannerActive ? (
                <div id="reader" className="w-full h-full" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 text-slate-400">
                  <Scan className="h-16 w-16 mb-3 stroke-[1.5]" />
                  <p className="text-sm font-bold">Kamera tidak aktif</p>
                  <button
                    onClick={() => { setIsScannerActive(true); setScannerState("scanning"); scannerStateRef.current = "scanning"; }}
                    className="mt-4 bg-teal-650 hover:bg-teal-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer border-none shadow-sm"
                  >
                    Aktifkan Kamera
                  </button>
                </div>
              )}

              {scannerState === "processing" && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                  <p className="text-white text-sm font-bold">Memverifikasi absensi...</p>
                </div>
              )}

              {scannerState === "cooldown" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin text-white/50 mx-auto" />
                    <p className="text-white/50 text-xs font-semibold">Menyiapkan kamera...</p>
                  </div>
                </div>
              )}
            </div>

            {isScannerActive && (
              <button
                onClick={() => setIsScannerActive(false)}
                className="mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-5 rounded-xl transition-all cursor-pointer border-none shadow-sm"
              >
                Matikan Kamera
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="neumo-card bg-background rounded-[26px] p-5">
              <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">Hasil Pemindaian (Scan)</h4>
              {!scanResult ? (
                <div className="py-16 text-center text-slate-400 font-semibold text-xs">Menunggu pemindaian barcode...</div>
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
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">TIPE AKSES</p>
                      <p className="font-extrabold text-sm mt-0.5 text-slate-800 dark:text-slate-200">{scanResult.action}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">STATUS MASUK</p>
                      <p className="font-extrabold text-sm mt-0.5 text-slate-800 dark:text-slate-200">{scanResult.status}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed px-1 font-semibold">{scanResult.message}</p>
                </div>
              ) : (
                <div className="space-y-4 text-center animate-fade-in">
                  <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-10 w-10" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-red-600 leading-tight text-base">Pemindaian Gagal</h5>
                    <p className="text-xs text-muted-foreground mt-1">Sistem menolak scan</p>
                  </div>
                  <p className="text-xs text-rose-700 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-950/30 leading-relaxed font-semibold">
                    {scanResult.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "setting" && canManageGlobal && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-4xl text-left">
          {/* Main Setting Card */}
          <div className="neumo-card bg-background rounded-[26px] p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-teal-600" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Konfigurasi Absensi & Geofencing</h3>
            </div>

            {settingsQuery.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Section 1: Waktu & Toleransi */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wide">1. Waktu Kehadiran</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jam Masuk Wajib</Label>
                      <input
                        type="time"
                        value={jamMasukSetting}
                        onChange={(e) => setJamMasukSetting(e.target.value)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Toleransi (Menit)</Label>
                      <input
                        type="number"
                        min={0}
                        value={toleransiSetting}
                        onChange={(e) => setToleransiSetting(parseInt(e.target.value) || 0)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Jam Pulang (Lock Checkout)</Label>
                    <input
                      type="time"
                      value={jamPulangSetting}
                      onChange={(e) => setJamPulangSetting(e.target.value)}
                      className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                    />
                  </div>
                </div>

                {/* Section 2: Geofencing */}
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wide">2. Koordinat & Geofencing</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Latitude Sekolah</Label>
                      <input
                        type="text"
                        placeholder="Contoh: -6.9175"
                        value={latitudeSetting}
                        onChange={(e) => setLatitudeSetting(e.target.value)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Longitude Sekolah</Label>
                      <input
                        type="text"
                        placeholder="Contoh: 107.6191"
                        value={longitudeSetting}
                        onChange={(e) => setLongitudeSetting(e.target.value)}
                        className="h-10 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
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
                      <span>Dapatkan Koordinat GPS</span>
                    </button>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                  <button
                    className="h-10 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none px-6 flex items-center justify-center shadow-md shadow-teal-500/5 transition-all disabled:opacity-50"
                    onClick={handleSaveSettings}
                    disabled={saveSettings.isPending}
                  >
                    {saveSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    <span>Simpan Pengaturan</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Status Info Box */}
          <div className="space-y-4">
            <div className="neumo-card bg-background rounded-[26px] border border-emerald-500/20 bg-emerald-500/[0.01] p-5 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-4 w-4" />
                <h4 className="text-xs font-black uppercase tracking-wider">Geofence Multi-Tenancy</h4>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                Lembaga <strong className="text-slate-800 dark:text-slate-200">{sekolah?.namaSekolah || "Sekolah Anda"}</strong> diproteksi secara terenkripsi menggunakan koordinat global terisolasi. Seluruh log absensi di luar geofence akan ditolak secara otomatis untuk mengantisipasi manipulasi kehadiran.
              </p>
              
              <div className="border-t border-emerald-500/10 pt-3.5 space-y-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Konfigurasi Aktif:</h5>
                <div className="space-y-1.5 font-mono text-[10.5px] text-slate-600 dark:text-slate-350">
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">NPSN:</span>
                    <span className="font-bold">{sekolah?.npsn || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Koordinat:</span>
                    <span className="font-bold">
                      {settingsQuery.data?.latitude && settingsQuery.data?.longitude 
                        ? `${parseFloat(settingsQuery.data.latitude).toFixed(4)}, ${parseFloat(settingsQuery.data.longitude).toFixed(4)}` 
                        : "Belum diset"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Radius:</span>
                    <span className="font-bold">{settingsQuery.data?.radius ? `${settingsQuery.data.radius} meter` : "150 meter"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "pribadi" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="space-y-6">
            <div className="neumo-card bg-background rounded-[26px] p-6 space-y-5 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-200 leading-tight">Barcode Presensi Anda</h3>
              <p className="text-xs text-muted-foreground mt-1">Gunakan kode ini pada webcam scanner di sekolah</p>
            </div>

            {role === "siswa" && currentSiswaInfo && (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner">
                  {siswaQrUrl ? <img src={siswaQrUrl} alt="Siswa QR Code" className="w-48 h-48" /> : <Skeleton className="w-48 h-48 rounded-2xl" />}
                </div>
                <div className="w-full">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{currentSiswaInfo.namaLengkap}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">NIS/NISN: {currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || "-"}</p>
                  
                  <div className="flex gap-2 w-full mt-3">
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handleDownloadQR(currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || currentSiswaInfo.id, currentSiswaInfo.namaLengkap)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                    </button>
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handlePrintQR(currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || currentSiswaInfo.id, currentSiswaInfo.namaLengkap, "SISWA", `NIS/NISN: ${currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || ""}`)}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Cetak
                    </button>
                  </div>
                </div>
              </div>
            )}

            {role === "guru" && ownGuru && (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner">
                  {guruQrUrl ? <img src={guruQrUrl} alt="Guru QR Code" className="w-48 h-48" /> : <Skeleton className="w-48 h-48 rounded-2xl" />}
                </div>
                <div className="w-full">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{ownGuru.namaLengkap}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">NIP/NIK: {ownGuru.nipnuptk || ownGuru.nik || "-"}</p>
                  
                  <div className="flex gap-2 w-full mt-3">
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handleDownloadQR(ownGuru.nipnuptk || ownGuru.nik || ownGuru.id, ownGuru.namaLengkap)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                    </button>
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handlePrintQR(ownGuru.nipnuptk || ownGuru.nik || ownGuru.id, ownGuru.namaLengkap, "GURU", `NIP/NIK: ${ownGuru.nipnuptk || ownGuru.nik || ""}`)}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Cetak
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(role === "super_admin" || role === "admin_sekolah" || role === "tu") && (
              <div className="space-y-3 w-full flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner">
                  {adminQrUrl ? <img src={adminQrUrl} alt="Admin QR Code" className="w-48 h-48" /> : <Skeleton className="w-48 h-48 rounded-2xl" />}
                </div>
                <div className="w-full">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{session?.user?.name || "Administrator"}</h4>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">ROLE: {role?.toUpperCase()}</p>
                  
                  <div className="flex gap-2 w-full mt-3">
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handleDownloadQR(session?.user?.email || session?.user?.id || "", session?.user?.name || "Admin")}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Unduh
                    </button>
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handlePrintQR(session?.user?.email || session?.user?.id || "", session?.user?.name || "Admin", role?.toUpperCase() || "STAFF", `Email: ${session?.user?.email}`)}>
                      <Printer className="h-3.5 w-3.5 mr-1" /> Cetak
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bulk Barcode Download Card */}
          {(role === "super_admin" || role === "admin_sekolah" || role === "tu") && (
            <div className="neumo-card bg-background rounded-[26px] p-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 text-teal-600 flex items-center justify-center shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 leading-tight">Cetak & Unduh QR Siswa</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Cetak massal QR Code presensi untuk mading/kartu</p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                    Filter Rombel (Kelas)
                  </Label>
                  <Select
                    value={bulkFilterClassId}
                    onValueChange={(v) => setBulkFilterClassId(v ?? "semua")}
                    options={[
                      { value: "semua", label: "Semua Kelas & Siswa" },
                      ...(classes?.map((c) => ({ value: c.id, label: c.namaKelas })) || [])
                    ]}
                  >
                    <SelectTrigger className="h-10 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 font-semibold text-slate-750 dark:text-slate-300 w-full text-left">
                      <SelectValue placeholder="Semua Kelas" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg">
                      <SelectItem value="semua" className="text-xs font-semibold">Semua Kelas & Siswa</SelectItem>
                      {classes?.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                          {c.namaKelas}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                    Jumlah QR per Halaman
                  </Label>
                  <Select
                    value={qrPerPage}
                    onValueChange={(v) => setQrPerPage(v ?? "6")}
                    options={[
                      { value: "4", label: "4 QR / Halaman (2x2)" },
                      { value: "6", label: "6 QR / Halaman (2x3)" },
                      { value: "8", label: "8 QR / Halaman (2x4)" },
                      { value: "9", label: "9 QR / Halaman (3x3)" },
                      { value: "12", label: "12 QR / Halaman (3x4)" },
                      { value: "16", label: "16 QR / Halaman (4x4)" }
                    ]}
                  >
                    <SelectTrigger className="h-10 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 font-semibold text-slate-750 dark:text-slate-300 w-full text-left">
                      <SelectValue placeholder="6 QR / Halaman" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg">
                      <SelectItem value="4" className="text-xs font-semibold">4 QR / Halaman (2x2)</SelectItem>
                      <SelectItem value="6" className="text-xs font-semibold">6 QR / Halaman (2x3)</SelectItem>
                      <SelectItem value="8" className="text-xs font-semibold">8 QR / Halaman (2x4)</SelectItem>
                      <SelectItem value="9" className="text-xs font-semibold">9 QR / Halaman (3x3)</SelectItem>
                      <SelectItem value="12" className="text-xs font-semibold">12 QR / Halaman (3x4)</SelectItem>
                      <SelectItem value="16" className="text-xs font-semibold">16 QR / Halaman (4x4)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBulkPrintQR}
                    disabled={bulkPrinting || bulkDownloading || !siswaAll || siswaAll.length === 0}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-teal-650 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-1.5"
                  >
                    {bulkPrinting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span className="truncate max-w-[90px]">{bulkProgress || "Membuat..."}</span>
                      </>
                    ) : (
                      <>
                        <Printer className="h-3.5 w-3.5 shrink-0" />
                        <span>Cetak Massal</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDownloadBarcodes}
                    disabled={bulkPrinting || bulkDownloading || !siswaAll || siswaAll.length === 0}
                    className="flex-1 h-10 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-1.5"
                  >
                    {bulkDownloading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                        <span className="truncate max-w-[90px]">{bulkProgress || "ZIP..."}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>Unduh ZIP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="neumo-card bg-background rounded-[26px] p-5 md:col-span-2 space-y-4 text-left">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Riwayat Kehadiran (30 Hari Terakhir)</h3>
              <p className="text-xs text-muted-foreground mt-1">Log kehadiran masuk dan pulang mandiri</p>
            </div>

            {role === "siswa" && ownSiswaAttendanceQuery.isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            )}

            {role === "siswa" && ownSiswaAttendanceQuery.data && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Tanggal</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownSiswaAttendanceQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-450 font-bold py-10">
                        Tidak ada log kehadiran dalam 30 hari terakhir.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownSiswaAttendanceQuery.data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                        <TableCell className="text-xs font-bold text-slate-705 dark:text-slate-300">{new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[row.status as StatusAbsensi]} variant="secondary">
                            {STATUS_LABELS[row.status as StatusAbsensi]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.jamMasuk ? new Date(row.jamMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.jamPulang ? new Date(row.jamPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
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
                  <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Tanggal</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownGuruAttendanceQuery.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-455 font-bold py-10">
                        Tidak ada log kehadiran dalam 30 hari terakhir.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownGuruAttendanceQuery.data.map((row) => (
                      <TableRow key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                        <TableCell className="text-xs font-bold text-slate-705 dark:text-slate-300">{new Date(row.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[row.status as StatusAbsensi]} variant="secondary">
                            {STATUS_LABELS[row.status as StatusAbsensi]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.jamMasuk ? new Date(row.jamMasuk).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{row.jamPulang ? new Date(row.jamPulang).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}

      {/* Dialog Alasan Keterlambatan */}
      <Dialog open={lateDialogOpen} onOpenChange={(v) => { if (!v) { setLateDialogOpen(false); setLateData(null); } }}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                Konfirmasi Keterlambatan
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <p className="font-bold">⚠️ Perhatian:</p>
              <p className="mt-1">
                Waktu pemindaian absensi masuk untuk <strong>{lateData?.name}</strong> telah melewati batas toleransi keterlambatan 15 menit. Anda wajib mengisi alasan keterlambatan untuk mencatat kehadiran ini.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-1">
                Alasan Terlambat (Wajib)
              </Label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder="Masukkan alasan keterlambatan (misalnya: macet di jalan, kendala kendaraan, dll)..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-xs p-3 font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); }}
              disabled={submittingLateReason}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-85"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleLateReasonSubmit}
              disabled={submittingLateReason || !lateReason.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed transition-all duration-300 transform active:scale-95 h-[38px]"
            >
              {submittingLateReason && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              <span>Kirim & Absen</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  )
}
