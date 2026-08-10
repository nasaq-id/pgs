"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { api } from "@/lib/trpc/client"
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
import { ClipboardCheck, Loader2, Calendar, QrCode, ShieldAlert, CheckCircle2, Scan, Download, Printer, X, User, Clock, Search, Check, Flame, PowerOff, Users, UserCheck, Info } from "lucide-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { parseLocalDate } from "@/lib/utils"

import { StatusSegmented, STATUS_LABELS, STATUS_DOT_CLASS, STATUS_ACTIVE_CLASS, type StatusAbsensi } from "@/components/absensi/StatusSegmented"

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

async function createQrDataUrl(
  data: string,
  options: { width: number; margin: number; errorCorrectionLevel: "M" },
) {
  const { default: QRCode } = await import("qrcode")
  return QRCode.toDataURL(data, options)
}

export default function AbsensiPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const utils = api.useUtils()

  const [activeTab, setActiveTab] = useState<string>("manual")
  const [targetType, setTargetType] = useState<"siswa" | "guru">("siswa")
  const [kelasId, setKelasId] = useState("")
  const [tanggal, setTanggal] = useState("")

  const [siswaRecords, setSiswaRecords] = useState<Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }>>({})
  const [guruRecords, setGuruRecords] = useState<Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }>>({})
  const [saveStates, setSaveStates] = useState<Record<string, "saving" | "saved" | "error">>({})
  const saveTimers = useRef<Record<string, NodeJS.Timeout>>({})
  const [createdSiswaIds, setCreatedSiswaIds] = useState<Set<string>>(new Set())
  const [createdGuruIds, setCreatedGuruIds] = useState<Set<string>>(new Set())

  const [isScannerActive, setIsScannerActive] = useState(false)
  const [searchSiswa, setSearchSiswa] = useState("")
  const [searchGuru, setSearchGuru] = useState("")
  const [html5QrcodeClass, setHtml5QrcodeClass] = useState<any>(null)
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
    action?: "masuk" | "pulang"
    jamMasuk?: string | null
  } | null>(null)
  const [lateReason, setLateReason] = useState("")
  const [submittingLateReason, setSubmittingLateReason] = useState(false)

  // Bulk download barcode states
  const [qrPrintMode, setQrPrintMode] = useState<"massal" | "single">("massal")
  const [bulkFilterClassId, setBulkFilterClassId] = useState<string>("semua")
  const [selectedSiswaSingleId, setSelectedSiswaSingleId] = useState<string>("")
  const [searchSiswaQuery, setSearchSiswaQuery] = useState<string>("")
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
  const { data: siswaAll } = api.siswa.getLookup.useQuery({ limit: 10000 })
  const { data: guruAll } = api.guru.getAll.useQuery({}, {
    enabled: role === "super_admin" || role === "admin_sekolah" || role === "tu",
  })

  const isWaliKelas = !!(ownGuru && classes?.some((c) => c.waliKelasId === ownGuru.id))

  const canManageGlobal = role === "super_admin" || role === "admin_sekolah"
  const canTakeAttendance = role === "super_admin" || role === "admin_sekolah" || role === "tu" || isWaliKelas

  const { data: sekolah } = api.lembaga.getSekolah.useQuery(undefined, {
    enabled: canTakeAttendance,
  })
  const { data: pengaturanAbsensi } = api.absensi.getPengaturan.useQuery(undefined, {
    enabled: canTakeAttendance,
  })

  useEffect(() => {
    if (!canTakeAttendance) {
      setActiveTab("pribadi")
    } else {
      setActiveTab("manual")
    }
  }, [canTakeAttendance])

  const bulkFilteredSiswaList = useMemo(() => {
    if (!siswaAll) return []
    let list = siswaAll
    if (bulkFilterClassId !== "semua") {
      list = siswaAll.filter((s) => s.kelasId === bulkFilterClassId)
    }
    if (searchSiswaQuery.trim() !== "") {
      const q = searchSiswaQuery.toLowerCase()
      list = list.filter((s) => 
        s.namaLengkap.toLowerCase().includes(q) || 
        (s.nisn && s.nisn.toLowerCase().includes(q)) || 
        (s.nisLokal && s.nisLokal.toLowerCase().includes(q))
      )
    }
    return list
  }, [siswaAll, bulkFilterClassId, searchSiswaQuery])

  useEffect(() => {
    setSelectedSiswaSingleId("")
  }, [bulkFilterClassId])



  const siswaDiKelas = useMemo(() => {
    if (!siswaAll) return []
    if (role === "guru" && isWaliKelas && !canManageGlobal) {
      const waliKelasClass = classes?.find((c) => c.waliKelasId === ownGuru?.id)
      return (siswaAll || []).filter((s) => s.kelasId === waliKelasClass?.id)
    }
    return (siswaAll || []).filter((s) => s.kelasId === kelasId)
  }, [siswaAll, kelasId, role, isWaliKelas, ownGuru, classes, canManageGlobal])

  const filteredSiswa = useMemo(() => {
    if (!searchSiswa.trim()) return siswaDiKelas
    const q = searchSiswa.toLowerCase()
    return siswaDiKelas.filter((s) => s.namaLengkap.toLowerCase().includes(q) || s.nisn?.toLowerCase().includes(q))
  }, [siswaDiKelas, searchSiswa])

  const filteredGuru = useMemo(() => {
    if (!searchGuru.trim() || !guruAll) return guruAll || []
    const q = searchGuru.toLowerCase()
    return guruAll.filter((g) => g.namaLengkap.toLowerCase().includes(q) || g.nipnuptk?.toLowerCase().includes(q))
  }, [guruAll, searchGuru])

  const summaryStats = useMemo(() => {
    const records = targetType === "siswa" ? siswaRecords : guruRecords
    const ids = targetType === "siswa" ? siswaDiKelas.map((s) => s.id) : (guruAll || []).map((g) => g.id)
    const counts: Record<StatusAbsensi, number> = { hadir: 0, izin: 0, sakit: 0, alpha: 0, terlambat: 0 }
    for (const id of ids) {
      const rec = records[id]
      if (rec) counts[rec.status]++
      else counts.hadir++
    }
    return counts
  }, [targetType, siswaRecords, guruRecords, siswaDiKelas, guruAll])

  // Automatically lock Wali Kelas to their class
  useEffect(() => {
    if (role === "guru" && isWaliKelas && classes && ownGuru) {
      const waliKelasClass = classes.find((c) => c.waliKelasId === ownGuru.id)
      if (waliKelasClass) setKelasId(waliKelasClass.id)
    }
  }, [role, isWaliKelas, classes, ownGuru])

  // Get student attendance
  const studentAttendanceQuery = api.absensi.getByKelas.useQuery(
    { kelasId, tanggal: parseLocalDate(tanggal) },
    { enabled: !!kelasId && !!tanggal && targetType === "siswa" && canTakeAttendance },
  )

  // Get guru attendance
  const guruAttendanceQuery = api.absensi.getGuruAbsensi.useQuery(
    { tanggal: parseLocalDate(tanggal) },
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

  // Info hari efektif bulan berjalan (dinamis dari kalender akademik)
  const infoHariEfektifQuery = api.absensi.getInfoHariEfektif.useQuery(
    {
      tanggalMulai: tanggal ? new Date(parseLocalDate(tanggal).getFullYear(), parseLocalDate(tanggal).getMonth(), 1) : new Date(),
      tanggalSelesai: tanggal ? new Date(parseLocalDate(tanggal).getFullYear(), parseLocalDate(tanggal).getMonth() + 1, 0) : new Date(),
    },
    { enabled: activeTab === "manual" && !!tanggal },
  )

  const currentSiswaInfo = useMemo(() => {
    if (role !== "siswa" || !siswaAll) return null
    return (siswaAll || []).find((s) => s.usernameSiswa === session?.user?.email || s.nisn === session?.user?.email || s.nisLokal === session?.user?.email)
  }, [siswaAll, role, session])

  // Generate personal QR data URLs locally instead of using external api.qrserver.com
  useEffect(() => {
    if (role === "siswa" && currentSiswaInfo) {
      const qrData = currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || currentSiswaInfo.id
      void createQrDataUrl(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setSiswaQrUrl).catch(() => {})
    }
  }, [role, currentSiswaInfo])

  useEffect(() => {
    if (role === "guru" && ownGuru) {
      const qrData = ownGuru.nipnuptk || ownGuru.nik || ownGuru.id
      void createQrDataUrl(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setGuruQrUrl).catch(() => {})
    }
  }, [role, ownGuru])

  useEffect(() => {
    if (role === "super_admin" || role === "admin_sekolah" || role === "tu") {
      const qrData = session?.user?.email || session?.user?.id || ""
      void createQrDataUrl(qrData, { width: 200, margin: 2, errorCorrectionLevel: "M" }).then(setAdminQrUrl).catch(() => {})
    }
  }, [role, session])

  // Populate manual records for siswa
  useEffect(() => {
    if (studentAttendanceQuery.data && studentAttendanceQuery.data.length > 0) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }> = {}
      for (const r of studentAttendanceQuery.data) {
        map[r.siswaId] = {
          status: r.status as StatusAbsensi,
          jamMasuk: r.jamMasuk ? new Date(r.jamMasuk).toTimeString().slice(0, 5) : "",
          jamPulang: r.jamPulang ? new Date(r.jamPulang).toTimeString().slice(0, 5) : "",
          keterangan: r.keterangan || "",
        }
      }
      setSiswaRecords(map)
      initializedSiswaKelasRef.current = kelasId
    } else if (studentAttendanceQuery.isFetched && initializedSiswaKelasRef.current !== kelasId) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }> = {}
      for (const s of siswaDiKelas) {
        map[s.id] = { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
      }
      setSiswaRecords(map)
      initializedSiswaKelasRef.current = kelasId
    }
  }, [studentAttendanceQuery.data, studentAttendanceQuery.isFetched, siswaDiKelas, kelasId])

  // Populate manual records for guru
  useEffect(() => {
    if (guruAttendanceQuery.data && guruAttendanceQuery.data.length > 0 && guruAll) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }> = {}
      for (const r of guruAttendanceQuery.data) {
        map[r.guruId] = {
          status: r.status as StatusAbsensi,
          jamMasuk: r.jamMasuk ? new Date(r.jamMasuk).toTimeString().slice(0, 5) : "",
          jamPulang: r.jamPulang ? new Date(r.jamPulang).toTimeString().slice(0, 5) : "",
          keterangan: r.keterangan || "",
        }
      }
      setGuruRecords(map)
      initializedGuruRef.current = true
    } else if (guruAttendanceQuery.isFetched && guruAll && !initializedGuruRef.current) {
      const map: Record<string, { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }> = {}
      for (const g of guruAll) {
        map[g.id] = { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
      }
      setGuruRecords(map)
      initializedGuruRef.current = true
    }
  }, [guruAttendanceQuery.data, guruAttendanceQuery.isFetched, guruAll])

  const createAbsensiSiswa = api.absensi.create.useMutation()
  const updateAbsensiSiswa = api.absensi.update.useMutation()
  const saveGuruAbsensi = api.absensi.createOrUpdateGuruAbsensi.useMutation()
  const barcodeScanMutation = api.absensi.absenViaBarcode.useMutation()
  const togglePulangCepatDaruratMutation = api.absensi.togglePulangCepatDarurat.useMutation({
    onSuccess: () => {
      utils.absensi.getPengaturan.invalidate()
    },
  })

  // ─── AUTOSAVE per baris ──────────────────────────────────
  const existingSiswaMap = useMemo(() => {
    const map = new Map<string, { id: string }>()
    for (const r of studentAttendanceQuery.data || []) map.set(r.siswaId, r)
    return map
  }, [studentAttendanceQuery.data])

  const existingGuruMap = useMemo(() => {
    const map = new Map<string, { id: string }>()
    for (const r of guruAttendanceQuery.data || []) map.set(r.guruId, r)
    return map
  }, [guruAttendanceQuery.data])

  const getDefaultJamMasuk = () => {
    const fromSettings =
      targetType === "siswa" ? pengaturanAbsensi?.jamMasukSiswa : pengaturanAbsensi?.jamMasuk
    return fromSettings || new Date().toTimeString().slice(0, 5)
  }

  const persistRow = async (
    id: string,
    rec: { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }
  ) => {
    if (!tanggal) return
    const tanggalDate = parseLocalDate(tanggal)
    const jamMasukDate = rec.jamMasuk ? new Date(tanggal + "T" + rec.jamMasuk + ":00") : null
    const jamPulangDate = rec.jamPulang ? new Date(tanggal + "T" + rec.jamPulang + ":00") : null

    setSaveStates((s) => ({ ...s, [id]: "saving" }))
    try {
      if (targetType === "siswa") {
        const existingRow = existingSiswaMap.get(id)
        if (existingRow) {
          await updateAbsensiSiswa.mutateAsync({
            id: existingRow.id,
            status: rec.status,
            jamMasuk: jamMasukDate,
            jamPulang: jamPulangDate,
            keterangan: rec.keterangan || null,
          })
        } else {
          await createAbsensiSiswa.mutateAsync({
            absensi: [{
              siswaId: id,
              kelasId,
              tanggal: tanggalDate,
              status: rec.status,
              jamMasuk: jamMasukDate,
              jamPulang: jamPulangDate,
              keterangan: rec.keterangan || null,
            }],
          })
          setCreatedSiswaIds((prev) => new Set(prev).add(id))
        }
      } else {
        const existingRow = existingGuruMap.get(id)
        await saveGuruAbsensi.mutateAsync({
          ...(existingRow ? { id: existingRow.id } : {}),
          guruId: id,
          tanggal: tanggalDate,
          status: rec.status,
          jamMasuk: jamMasukDate,
          jamPulang: jamPulangDate,
          keterangan: rec.keterangan || null,
        })
        setCreatedGuruIds((prev) => new Set(prev).add(id))
      }
      setSaveStates((s) => ({ ...s, [id]: "saved" }))
    } catch {
      setSaveStates((s) => ({ ...s, [id]: "error" }))
      toast.error("Gagal menyimpan absensi. Coba ubah kembali baris tersebut.")
    }
  }

  const scheduleSave = (id: string, rec?: { status: StatusAbsensi; jamMasuk: string; jamPulang: string; keterangan: string }) => {
    const records = targetType === "siswa" ? siswaRecords : guruRecords
    const target = rec || records[id]
    if (!target) return
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id])
    saveTimers.current[id] = setTimeout(() => {
      persistRow(id, target)
    }, 700)
  }

  const handleHadirSemua = () => {
    const defaultJam = getDefaultJamMasuk()
    if (targetType === "siswa") {
      const updated = { ...siswaRecords }
      for (const s of siswaDiKelas) {
        updated[s.id] = { status: "hadir", jamMasuk: defaultJam, jamPulang: "", keterangan: "" }
      }
      setSiswaRecords(updated)
      for (const s of siswaDiKelas) scheduleSave(s.id, updated[s.id])
    } else if (guruAll) {
      const updated = { ...guruRecords }
      for (const g of guruAll) {
        updated[g.id] = { status: "hadir", jamMasuk: defaultJam, jamPulang: "", keterangan: "" }
      }
      setGuruRecords(updated)
      for (const g of guruAll) scheduleSave(g.id, updated[g.id])
    }
    toast.info("Status diset Hadir Semua dengan jam masuk default sekolah")
  }

  const updateManualRecord = (id: string, field: "status" | "jamMasuk" | "jamPulang" | "keterangan", value: string) => {
    const records = targetType === "siswa" ? siswaRecords : guruRecords
    const setRecords = targetType === "siswa" ? setSiswaRecords : setGuruRecords

    const current = records[id] || { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
    const updated = { ...current, [field]: value }

    // Auto isi jam datang dengan default jam masuk sekolah saat status hadir/terlambat & jam masih kosong
    if (field === "status" && (value === "hadir" || value === "terlambat") && !current.jamMasuk) {
      updated.jamMasuk = getDefaultJamMasuk()
    }

    setRecords({ ...records, [id]: updated })
    scheduleSave(id, updated)
  }

  const handleSetAllStatus = (status: StatusAbsensi) => {
    const defaultJam = getDefaultJamMasuk()
    if (targetType === "siswa") {
      const updated = { ...siswaRecords }
      for (const s of siswaDiKelas) {
        const existing = siswaRecords[s.id]
        updated[s.id] = {
          status,
          jamMasuk: status === "hadir" || status === "terlambat" ? (existing?.jamMasuk || defaultJam) : "",
          jamPulang: existing?.jamPulang || "",
          keterangan: existing?.keterangan || "",
        }
      }
      setSiswaRecords(updated)
      for (const s of siswaDiKelas) scheduleSave(s.id, updated[s.id])
    } else if (guruAll) {
      const updated = { ...guruRecords }
      for (const g of guruAll) {
        const existing = guruRecords[g.id]
        updated[g.id] = {
          status,
          jamMasuk: status === "hadir" || status === "terlambat" ? (existing?.jamMasuk || defaultJam) : "",
          jamPulang: existing?.jamPulang || "",
          keterangan: existing?.keterangan || "",
        }
      }
      setGuruRecords(updated)
      for (const g of guruAll) scheduleSave(g.id, updated[g.id])
    }
    toast.info(`Status semua diset ke ${STATUS_LABELS[status]}`)
  }

  const handleSetAllTimeNow = (field: "jamMasuk" | "jamPulang") => {
    const nowTime = new Date().toTimeString().slice(0, 5)
    if (targetType === "siswa") {
      const updated = { ...siswaRecords }
      for (const s of siswaDiKelas) {
        const existing = siswaRecords[s.id] || { status: "hadir" as StatusAbsensi, jamMasuk: "", jamPulang: "", keterangan: "" }
        updated[s.id] = { ...existing, [field]: nowTime }
      }
      setSiswaRecords(updated)
      for (const s of siswaDiKelas) scheduleSave(s.id, updated[s.id])
    } else if (guruAll) {
      const updated = { ...guruRecords }
      for (const g of guruAll) {
        const existing = guruRecords[g.id] || { status: "hadir" as StatusAbsensi, jamMasuk: "", jamPulang: "", keterangan: "" }
        updated[g.id] = { ...existing, [field]: nowTime }
      }
      setGuruRecords(updated)
      for (const g of guruAll) scheduleSave(g.id, updated[g.id])
    }
    toast.info(`${field === "jamMasuk" ? "Jam masuk" : "Jam pulang"} semua diisi jam sekarang`)
  }

  const handleSetSingleTimeNow = (id: string, field: "jamMasuk" | "jamPulang") => {
    const nowTime = new Date().toTimeString().slice(0, 5)
    const records = targetType === "siswa" ? siswaRecords : guruRecords
    const setRecords = targetType === "siswa" ? setSiswaRecords : setGuruRecords
    const current = records[id] || { status: "hadir" as StatusAbsensi, jamMasuk: "", jamPulang: "", keterangan: "" }
    const updated = { ...current, [field]: nowTime }
    setRecords({ ...records, [id]: updated })
    scheduleSave(id, updated)
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

  const resetAndRestartScanner = async () => {
    scanProcessingLockRef.current = false
    setScannerState("scanning")
    scannerStateRef.current = "scanning"
    setIsScannerActive(true)
    setTimeout(() => {
      handleStartCamera()
    }, 100)
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
            { enableHighAccuracy: true, timeout: 1500 }
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
          action: result.action as "masuk" | "pulang",
          jamMasuk: result.jamMasuk ?? null,
        })
        setLateReason("")
        setLateDialogOpen(true)
        playBeep("error")
        if (result.action === "pulang") {
          toast.warning(
            result.jamMasuk
              ? `${result.name} sudah tercatat MASUK pukul ${result.jamMasuk}. Scan ini akan dicatat PULANG lebih awal — wajib isi alasan.`
              : `Pulang Cepat: Harap konfirmasi alasan kepulangan lebih awal.`
          )
        } else {
          toast.warning(`Terlambat: Harap masukkan alasan keterlambatan.`)
        }
        setScannerState("cooldown")
        scannerStateRef.current = "cooldown"
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
        await handleStopCamera()
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
        resetAndRestartScanner()
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
        resetAndRestartScanner()
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
        message: result.action === "pulang"
          ? `Absensi Pulang untuk ${result.name} berhasil dicatat (Pulang Lebih Awal). Alasan: ${lateReason.trim()}`
          : `Absensi Masuk untuk ${result.name} berhasil dicatat dengan status ${STATUS_LABELS[result.status as StatusAbsensi]}. Alasan: ${lateReason.trim()}`,
      })
      if (result.action === "pulang") {
        toast.success(`Scan Berhasil: ${result.name} (Pulang Cepat)`)
      } else {
        toast.success(`Scan Berhasil: ${result.name} (Masuk - Terlambat)`)
      }
      setLateDialogOpen(false)
      setLateData(null)
      setLateReason("")
      resetAndRestartScanner()
    } catch (err: any) {
      playBeep("error")
      setScanResult({
        success: false,
        message: err.message || (lateData?.action === "pulang" ? "Gagal mengirimkan alasan pulang cepat" : "Gagal mengirimkan alasan terlambat"),
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

    if (qrPrintMode === "single") {
      if (!selectedSiswaSingleId) {
        toast.error("Pilih siswa terlebih dahulu.")
        return
      }
      const std = siswaAll.find((s) => s.id === selectedSiswaSingleId)
      if (!std) {
        toast.error("Siswa tidak ditemukan.")
        return
      }
      handleDownloadQR(std.nisn || std.nisLokal || std.id, std.namaLengkap)
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
      const [{ default: JSZip }] = await Promise.all([import("jszip")])
      const zip = new JSZip()
      let count = 0

      for (const std of filteredSiswa) {
        count++
        setBulkProgress(`Membuat QR (${count}/${filteredSiswa.length}): ${std.namaLengkap}`)

        const qrText = std.nisn || std.nisLokal || std.id
        const qrDataUrl = await createQrDataUrl(qrText, {
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

    if (qrPrintMode === "single") {
      if (!selectedSiswaSingleId) {
        toast.error("Pilih siswa terlebih dahulu.")
        return
      }
      const std = siswaAll.find((s) => s.id === selectedSiswaSingleId)
      if (!std) {
        toast.error("Siswa tidak ditemukan.")
        return
      }
      const classObj = classes?.find((c) => c.id === std.kelasId)
      const className = classObj ? classObj.namaKelas : "Siswa"
      handlePrintQR(
        std.nisn || std.nisLokal || std.id,
        std.namaLengkap,
        "SISWA",
        `NIS/NISN: ${std.nisn || std.nisLokal || ""}`,
        className
      )
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
        const qrDataUrl = await createQrDataUrl(qrText, {
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

      const schoolName = sekolah?.namaSekolah || "PORTAL GUNA SEKOLAH"

      let htmlContent = `
        <html>
          <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
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
                font-family: 'Inter', sans-serif;
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
      const qrDataUrl = await createQrDataUrl(data, { width: 300, margin: 2, errorCorrectionLevel: "M" })
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

  const handlePrintQR = async (data: string, name: string, roleName: string, identifier: string, className?: string) => {
    const printWindow = window.open("", "_blank", "width=600,height=600")
    if (!printWindow) return

    let qrDataUrl = ""
    try {
      qrDataUrl = await createQrDataUrl(data, { width: 300, margin: 2, errorCorrectionLevel: "M" })
    } catch {
      toast.error("Gagal membuat QR Code")
      return
    }

    const schoolName = sekolah?.namaSekolah || "PORTAL GUNA SEKOLAH"
    const displayClass = className || (roleName === "SISWA" ? "Siswa" : roleName)

    printWindow.document.write(`
      <html>
        <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
          <title>Cetak QR Code - ${escapeHtml(name)}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: 'Inter', sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .card {
              border: 1.5px solid #e2e8f0;
              border-radius: 20px;
              padding: 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              box-sizing: border-box;
              width: 320px;
              height: 400px;
              text-align: center;
              background-color: #fff;
              position: relative;
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            }
            .card-accent {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 6px;
              background: linear-gradient(90deg, #14b8a6, #10b981);
            }
            .logo {
              font-weight: 800;
              font-size: 0.85rem;
              color: #0f766e;
              margin-top: 8px;
              text-transform: uppercase;
              letter-spacing: 0.02em;
              line-height: 1.2;
            }
            .card-title {
              font-weight: 700;
              text-transform: uppercase;
              font-size: 0.75rem;
              letter-spacing: 0.05em;
              color: #10b981;
              margin: 4px 0;
            }
            .qr-img {
              width: 180px;
              height: 180px;
              object-fit: contain;
              margin: 12px 0;
            }
            .student-name {
              font-weight: 850;
              font-size: 1.15rem;
              color: #1e293b;
              margin: 2px 0;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            .identifier-badge {
              font-family: 'Inter', sans-serif;
              background: #f1f5f9;
              padding: 4px 10px;
              border-radius: 8px;
              font-size: 0.75rem;
              font-weight: 700;
              color: #475569;
              display: inline-block;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="card-accent"></div>
            <div class="logo">${escapeHtml(displayClass)} &middot; ${escapeHtml(schoolName)}</div>
            <div class="card-title">Kartu Presensi ${roleName === "SISWA" ? "Siswa" : roleName === "GURU" ? "Guru" : "Staff"}</div>
            <img class="qr-img" src="${qrDataUrl}" alt="QR Code" />
            <div>
              <div class="student-name">${escapeHtml(name)}</div>
              <span class="identifier-badge">${escapeHtml(identifier)}</span>
            </div>
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
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      setHtml5QrcodeClass(() => Html5Qrcode)
    }).catch((err) => {
      console.error("Failed to load html5-qrcode library:", err)
    })
  }, [])

  const handleStartCamera = async () => {
    if (!html5QrcodeClass) {
      toast.warning("Pemindai kamera sedang disiapkan. Silakan coba beberapa saat lagi.")
      return
    }

    setIsScannerActive(true)
    setScannerState("scanning")
    scannerStateRef.current = "scanning"
    scannerRef.current.stopped = false

    const scannerId = "reader"
    scannerRef.current.instance = new html5QrcodeClass(scannerId)

    try {
      await scannerRef.current.instance.start(
        { facingMode: { ideal: "environment" } },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          handleScanSuccess(decodedText)
        },
        () => {},
      )
    } catch (err: any) {
      console.error("Camera scanner start failed:", err)
      let msg = "Gagal mengakses kamera."
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Akses kamera ditolak. Silakan izinkan kamera di pengaturan browser/iOS Anda."
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "Kamera tidak ditemukan pada perangkat Anda."
      } else if (err.name === "OverconstrainedError") {
        msg = "Spesifikasi kamera belakang tidak didukung oleh perangkat ini."
      } else {
        msg = `Gagal mengakses kamera: ${err.message || err}`
      }
      toast.error(msg)
      setIsScannerActive(false)
      setScannerState("idle")
      scannerStateRef.current = "idle"
    }
  }

  const handleStopCamera = async () => {
    const scanner = scannerRef.current
    scanner.stopped = true
    if (scanner.instance) {
      try {
        await scanner.instance.stop()
        scanner.instance.clear()
      } catch (e) {
        console.error("Cleanup camera failed", e)
      }
    }
    setIsScannerActive(false)
    setScannerState("idle")
    scannerStateRef.current = "idle"
  }

  useEffect(() => {
    const scanner = scannerRef.current
    if (activeTab !== "scan") {
      handleStopCamera()
    }
    return () => {
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
  }, [activeTab])

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
        <div className="w-full flex justify-center mb-6">
          <TabsList className="w-full md:w-fit">
              {canTakeAttendance && (
                <TabsTrigger value="manual" className="">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Presensi Manual</span>
                </TabsTrigger>
              )}
              {canTakeAttendance && (
                <TabsTrigger value="scan" className="">
                  <Scan className="w-4 h-4" />
                  <span>Scan Barcode</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="pribadi" className="">
                <User className="w-4 h-4" />
                <span>Presensi Saya</span>
              </TabsTrigger>
              {canManageGlobal && (
                <TabsTrigger value="qrmassal" className="">
                  <QrCode className="w-4 h-4" />
                  <span>QR Massal</span>
                </TabsTrigger>
              )}
              {canTakeAttendance && (
                <>
                  <button
                    type="button"
                    onClick={() => toast.info("Modul Sidik Jari akan diintegrasikan pada Fase 2")}
                    className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1 cursor-not-allowed whitespace-nowrap"
                  >
                    Sidik Jari <span className="text-[8px] bg-slate-250 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded ml-1 font-bold">Soon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toast.info("Modul Face Recognition akan diintegrasikan pada Fase 2")}
                    className="px-3.5 py-2 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-600 flex items-center justify-center gap-1 cursor-not-allowed whitespace-nowrap"
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
          <div className="sticky top-2 md:top-4 z-30 space-y-3">
            <div className="neumo-card bg-background rounded-[26px] p-4 md:p-5 flex flex-col gap-3 text-left shadow-lg shadow-black/5">
              {/* Row 1: filter + pencarian */}
              <div className="flex flex-wrap items-center gap-2">
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

                {((targetType === "siswa" && kelasId) || targetType === "guru") && (
                  <div className="relative ml-auto w-full sm:w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nama..."
                      value={targetType === "siswa" ? searchSiswa : searchGuru}
                      onChange={(e) => targetType === "siswa" ? setSearchSiswa(e.target.value) : setSearchGuru(e.target.value)}
                      className="h-10 pl-8 pr-3 rounded-2xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full focus:outline-none focus:ring-2 focus:ring-slate-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Info hari efektif bulan berjalan (baris penuh, tidak terpotong) */}
              {infoHariEfektifQuery.data?.hariEfektifPertama && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40 px-3 py-1.5 text-[10px] font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                  <span className="flex items-center gap-1 min-w-0">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>
                      {infoHariEfektifQuery.data.hariEfektif} hari efektif · mulai{" "}
                      {new Date(infoHariEfektifQuery.data.hariEfektifPertama + "T00:00:00Z").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </span>
                  {(infoHariEfektifQuery.data.hariEfektifAwalLibur ?? []).length > 0 && (
                    <span className="text-[9px] font-bold text-teal-600/70 dark:text-teal-400/60 normal-case tracking-normal">
                      {(infoHariEfektifQuery.data.hariEfektifAwalLibur ?? []).slice(0, 4).map((d) => new Date(d + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", weekday: "short" })).join(", ")}
                      {(infoHariEfektifQuery.data.hariEfektifAwalLibur ?? []).length > 4 ? " …" : ""} libur
                    </span>
                  )}
                </div>
              )}

              {/* Row 2: bulk action + statistik */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5">
                {/* Tips card: tombol bulk action bersifat auto-save */}
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/[0.05] dark:bg-amber-500/[0.04] border border-amber-200/70 dark:border-amber-900/40">
                  <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] leading-relaxed text-amber-700 dark:text-amber-300 font-semibold">
                    <span className="font-black uppercase tracking-wider">Auto-Save!</span> Tombol di bawah langsung
                    menyimpan perubahan untuk <strong>seluruh siswa sekaligus</strong> tanpa konfirmasi ulang —
                    periksa kembali pilihan sebelum mengklik.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white border-none px-4 transition-all w-full md:w-auto"
                        onClick={handleHadirSemua}
                        disabled={targetType === "siswa" && !kelasId}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        Hadir Semua
                      </Button>
                    }
                  />
                  <TooltipPortal>
                    <TooltipPositioner>
                      <TooltipPopup>Auto-save: semua siswa langsung dicatat HADIR</TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
                <div className="relative group w-full md:w-auto">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="outline"
                          className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 bg-white dark:bg-slate-900 transition-all w-full"
                          disabled={targetType === "siswa" && !kelasId}
                        >
                          Set Status Semua ▾
                        </Button>
                      }
                    />
                    <TooltipPortal>
                      <TooltipPositioner>
                        <TooltipPopup>Auto-save: set status (alpha/izin/sakit/terlambat) untuk semua siswa</TooltipPopup>
                      </TooltipPositioner>
                    </TooltipPortal>
                  </Tooltip>
                  <div className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-1 min-w-[140px]">
                      {(["alpha", "izin", "sakit", "terlambat"] as StatusAbsensi[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleSetAllStatus(st)}
                          className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          {STATUS_LABELS[st]} Semua
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 bg-white dark:bg-slate-900 transition-all w-full md:w-auto"
                        onClick={() => handleSetAllTimeNow("jamMasuk")}
                        disabled={targetType === "siswa" && !kelasId}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Jam Masuk Semua
                      </Button>
                    }
                  />
                  <TooltipPortal>
                    <TooltipPositioner>
                      <TooltipPopup>Auto-save: isi jam masuk sekarang untuk semua siswa</TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 px-4 bg-white dark:bg-slate-900 transition-all w-full md:w-auto"
                        onClick={() => handleSetAllTimeNow("jamPulang")}
                        disabled={targetType === "siswa" && !kelasId}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Jam Pulang Semua
                      </Button>
                    }
                  />
                  <TooltipPortal>
                    <TooltipPositioner>
                      <TooltipPopup>Auto-save: isi jam pulang sekarang untuk semua siswa</TooltipPopup>
                    </TooltipPositioner>
                  </TooltipPortal>
                </Tooltip>
                </div>

                {((targetType === "siswa" && kelasId) || targetType === "guru") && (
                  <div className="flex items-center gap-3 flex-wrap w-full md:w-auto md:ml-auto md:justify-end">
                    {(["hadir", "terlambat", "izin", "sakit", "alpha"] as StatusAbsensi[]).map((st) => (
                      <div key={st} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT_CLASS[st]}`} />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {STATUS_LABELS[st]}: <span className="font-extrabold text-slate-800 dark:text-slate-200">{summaryStats[st]}</span>
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      {Object.values(saveStates).includes("saving") ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Menyimpan...</span>
                        </>
                      ) : Object.values(saveStates).includes("error") ? (
                        <>
                          <ShieldAlert className="h-3 w-3 text-red-500" />
                          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Ada yang gagal</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Autosave</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
          ) : targetType === "siswa" && filteredSiswa.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[22px] p-16 text-center text-slate-400 font-semibold shadow-sm flex flex-col items-center justify-center">
              Tidak ada siswa terdaftar di kelas ini.
            </div>
          ) : targetType === "siswa" ? (
            <>
              {/* Desktop table */}
              <div className="hidden md:block neumo-card bg-background rounded-[22px] border border-slate-200/90 dark:border-slate-800 overflow-hidden text-left">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                      <TableHead className="w-12 text-center text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">NISN</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Lengkap</TableHead>
                      <TableHead className="text-center w-[300px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status Absensi</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Keterangan / Alasan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSiswa.map((std, idx) => {
                      const record = siswaRecords[std.id] || { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
                      const hasExistingData = existingSiswaMap.has(std.id) || createdSiswaIds.has(std.id)
                      const needsKeterangan = record.status !== "hadir"
                      const showJam = record.status === "hadir" || record.status === "terlambat"
                      const saveState = saveStates[std.id]
                      return (
                        <TableRow key={std.id} className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${
                          hasExistingData ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                        }`}>
                          <TableCell className="text-center text-slate-450 dark:text-slate-500 text-xs font-semibold">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{std.nisn}</TableCell>
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              {saveState === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0" />}
                              {saveState === "saved" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {saveState === "error" && <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />}
                              {std.namaLengkap}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusSegmented value={record.status} onChange={(st) => updateManualRecord(std.id, "status", st)} />
                          </TableCell>
                          <TableCell>
                            {showJam ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={record.jamMasuk}
                                  onChange={(e) => updateManualRecord(std.id, "jamMasuk", e.target.value)}
                                  className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSetSingleTimeNow(std.id, "jamMasuk")}
                                  className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Isi jam sekarang"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {showJam ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={record.jamPulang}
                                  onChange={(e) => updateManualRecord(std.id, "jamPulang", e.target.value)}
                                  className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSetSingleTimeNow(std.id, "jamPulang")}
                                  className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                                  title="Isi jam sekarang"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {needsKeterangan ? (
                              <input
                                type="text"
                                value={record.keterangan || ""}
                                onChange={(e) => updateManualRecord(std.id, "keterangan", e.target.value)}
                                placeholder={record.status === "terlambat" ? "Alasan terlambat..." : record.status === "izin" ? "Keterangan izin..." : record.status === "sakit" ? "Keterangan sakit..." : "Alasan alpha..."}
                                className="h-9 px-3 rounded-xl text-[11px] border border-slate-200 dark:border-slate-800 focus:outline-none bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredSiswa.map((std, idx) => {
                  const record = siswaRecords[std.id] || { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
                  const hasExistingData = existingSiswaMap.has(std.id) || createdSiswaIds.has(std.id)
                  const needsKeterangan = record.status !== "hadir"
                  const showJam = record.status === "hadir" || record.status === "terlambat"
                  const saveState = saveStates[std.id]
                  return (
                    <div key={std.id} className={`neumo-card bg-background rounded-2xl p-4 space-y-3 ${
                      hasExistingData ? "ring-1 ring-emerald-300 dark:ring-emerald-700" : ""
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                          {saveState === "saved" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          {saveState === "error" && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                          <div>
                            <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{std.namaLengkap}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{std.nisn}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Status</span>
                        <StatusSegmented value={record.status} onChange={(st) => updateManualRecord(std.id, "status", st)} />
                      </div>
                      {showJam && (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Datang</span>
                            <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={record.jamMasuk}
                              onChange={(e) => updateManualRecord(std.id, "jamMasuk", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetSingleTimeNow(std.id, "jamMasuk")}
                              className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Isi jam sekarang"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          </div>
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Pulang</span>
                            <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={record.jamPulang}
                              onChange={(e) => updateManualRecord(std.id, "jamPulang", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetSingleTimeNow(std.id, "jamPulang")}
                              className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Isi jam sekarang"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          </div>
                        </div>
                      )}
                      {needsKeterangan && (
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Keterangan / Alasan</span>
                          <input
                            type="text"
                            value={record.keterangan || ""}
                            onChange={(e) => updateManualRecord(std.id, "keterangan", e.target.value)}
                            placeholder={record.status === "terlambat" ? "Alasan terlambat..." : record.status === "izin" ? "Keterangan izin..." : record.status === "sakit" ? "Keterangan sakit..." : "Alasan alpha..."}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                      )}
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
              <div className="hidden md:block neumo-card bg-background rounded-[22px] border border-slate-200/90 dark:border-slate-800 overflow-hidden text-left">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800">
                      <TableHead className="w-12 text-center text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">No</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">NIP/NUPTK</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Nama Guru</TableHead>
                      <TableHead className="text-center w-[300px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Status Absensi</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Datang</TableHead>
                      <TableHead className="w-[120px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Jam Pulang</TableHead>
                      <TableHead className="w-[180px] text-[10px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-wider py-3">Keterangan / Alasan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGuru.map((g, idx) => {
                      const record = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
                      const hasExistingData = existingGuruMap.has(g.id) || createdGuruIds.has(g.id)
                      const needsKeterangan = record.status !== "hadir"
                      const showJam = record.status === "hadir" || record.status === "terlambat"
                      const saveState = saveStates[g.id]
                      return (
                        <TableRow key={g.id} className={`transition-colors border-b border-slate-100 dark:border-slate-800/60 ${
                          hasExistingData ? "bg-emerald-50/30 dark:bg-emerald-950/10" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                        }`}>
                          <TableCell className="text-center text-slate-450 dark:text-slate-500 text-xs font-semibold">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">{g.nipnuptk || "-"}</TableCell>
                          <TableCell className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            <div className="flex items-center gap-1.5">
                              {saveState === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-500 shrink-0" />}
                              {saveState === "saved" && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                              {saveState === "error" && <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />}
                              {g.namaLengkap}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusSegmented value={record.status} onChange={(st) => updateManualRecord(g.id, "status", st)} />
                          </TableCell>
                          <TableCell>
                            {showJam ? (
                              <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={record.jamMasuk}
                                onChange={(e) => updateManualRecord(g.id, "jamMasuk", e.target.value)}
                                className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => handleSetSingleTimeNow(g.id, "jamMasuk")}
                                className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="Isi jam sekarang"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {showJam ? (
                              <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={record.jamPulang}
                                onChange={(e) => updateManualRecord(g.id, "jamPulang", e.target.value)}
                                className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                              />
                              <button
                                type="button"
                                onClick={() => handleSetSingleTimeNow(g.id, "jamPulang")}
                                className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="Isi jam sekarang"
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {needsKeterangan ? (
                              <input
                                type="text"
                                value={record.keterangan || ""}
                                onChange={(e) => updateManualRecord(g.id, "keterangan", e.target.value)}
                                placeholder={record.status === "terlambat" ? "Alasan terlambat..." : record.status === "izin" ? "Keterangan izin..." : record.status === "sakit" ? "Keterangan sakit..." : "Alasan alpha..."}
                                className="h-9 px-3 rounded-xl text-[11px] border border-slate-200 dark:border-slate-800 focus:outline-none bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filteredGuru.map((g, idx) => {
                  const record = guruRecords[g.id] || { status: "hadir", jamMasuk: "", jamPulang: "", keterangan: "" }
                  const hasExistingData = existingGuruMap.has(g.id) || createdGuruIds.has(g.id)
                  const needsKeterangan = record.status !== "hadir"
                  const showJam = record.status === "hadir" || record.status === "terlambat"
                  const saveState = saveStates[g.id]
                  return (
                    <div key={g.id} className={`neumo-card bg-background rounded-2xl p-4 space-y-3 ${
                      hasExistingData ? "ring-1 ring-emerald-300 dark:ring-emerald-700" : ""
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {saveState === "saving" && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />}
                          {saveState === "saved" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          {saveState === "error" && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                          <div>
                            <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{g.namaLengkap}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{g.nipnuptk || "-"}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">#{idx + 1}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Status</span>
                        <StatusSegmented value={record.status} onChange={(st) => updateManualRecord(g.id, "status", st)} />
                      </div>
                      {showJam && (
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Datang</span>
                            <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={record.jamMasuk}
                              onChange={(e) => updateManualRecord(g.id, "jamMasuk", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetSingleTimeNow(g.id, "jamMasuk")}
                              className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Isi jam sekarang"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          </div>
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Jam Pulang</span>
                            <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={record.jamPulang}
                              onChange={(e) => updateManualRecord(g.id, "jamPulang", e.target.value)}
                              className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 flex-1 min-w-0"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetSingleTimeNow(g.id, "jamPulang")}
                              className="h-9 w-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-400 hover:text-teal-600 flex items-center justify-center transition-colors cursor-pointer"
                              title="Isi jam sekarang"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          </div>
                        </div>
                      )}
                      {needsKeterangan && (
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Keterangan / Alasan</span>
                          <input
                            type="text"
                            value={record.keterangan || ""}
                            onChange={(e) => updateManualRecord(g.id, "keterangan", e.target.value)}
                            placeholder={record.status === "terlambat" ? "Alasan terlambat..." : record.status === "izin" ? "Keterangan izin..." : record.status === "sakit" ? "Keterangan sakit..." : "Alasan alpha..."}
                            className="h-9 px-3 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-300 w-full"
                          />
                        </div>
                      )}
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
              <div
                id="reader"
                className="w-full h-full"
                style={{ display: isScannerActive ? "block" : "none" }}
              />

              {!isScannerActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 text-slate-400">
                  <Scan className="h-16 w-16 mb-3 stroke-[1.5]" />
                  <p className="text-sm font-bold">Kamera tidak aktif</p>
                  <button
                    onClick={handleStartCamera}
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
                onClick={handleStopCamera}
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

            {/* Control Panel: Pulang Cepat Darurat */}
            <div className="neumo-card bg-background rounded-[26px] p-5 space-y-4 border border-rose-100 dark:border-rose-950/20">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
                  <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider">
                    Kontrol Pulang Cepat Darurat
                  </h4>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                  pengaturanAbsensi?.isPulangCepatDarurat
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}>
                  {pengaturanAbsensi?.isPulangCepatDarurat ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Fitur ini digunakan saat terjadi keadaan darurat (misal: bencana alam, banjir, mati listrik total, dll) atau kebijakan sekolah khusus untuk memulangkan seluruh warga sekolah lebih awal tanpa harus memasukkan alasan pulang cepat secara individual.
              </p>

              <button
                type="button"
                disabled={togglePulangCepatDaruratMutation.isPending}
                onClick={async () => {
                  try {
                    const nextState = !pengaturanAbsensi?.isPulangCepatDarurat
                    await togglePulangCepatDaruratMutation.mutateAsync({ aktif: nextState })
                    toast.success(
                      nextState
                        ? "Pulang Cepat Darurat diaktifkan. Semua guru/siswa dapat melakukan scan pulang tanpa dialog alasan."
                        : "Pulang Cepat Darurat dinonaktifkan. Aturan kepulangan kembali normal."
                    )
                  } catch (error: any) {
                    toast.error(error.message || "Gagal mengubah status Pulang Cepat Darurat.")
                  }
                }}
                className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300 transform active:scale-95 shadow-md shadow-rose-500/5 cursor-pointer disabled:opacity-85 ${
                  pengaturanAbsensi?.isPulangCepatDarurat
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    : "bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-700 hover:to-orange-700 text-white"
                }`}
              >
                {togglePulangCepatDaruratMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pengaturanAbsensi?.isPulangCepatDarurat ? (
                  <>
                    <PowerOff className="h-4 w-4" />
                    Matikan Mode Darurat
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    Aktifkan Mode Darurat
                  </>
                )}
              </button>
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
                    <button className="flex-1 text-[10px] font-black uppercase tracking-wider h-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 cursor-pointer shadow-sm text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center" onClick={() => handlePrintQR(currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || currentSiswaInfo.id, currentSiswaInfo.namaLengkap, "SISWA", `NIS/NISN: ${currentSiswaInfo.nisn || currentSiswaInfo.nisLokal || ""}`, classes?.find((c) => c.id === currentSiswaInfo.kelasId)?.namaKelas || "Siswa")}>
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
                          <Badge className={STATUS_ACTIVE_CLASS[row.status as StatusAbsensi]} variant="secondary">
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
                          <Badge className={STATUS_ACTIVE_CLASS[row.status as StatusAbsensi]} variant="secondary">
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

      {activeTab === "qrmassal" && canManageGlobal && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="neumo-card bg-background rounded-[26px] p-6 space-y-5 text-left">
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
              {/* Toggle Mode Cetak QR (Tunggal vs Massal) */}
              <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setQrPrintMode("massal")
                    setSelectedSiswaSingleId("")
                    setSearchSiswaQuery("")
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                    qrPrintMode === "massal"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/20 dark:border-slate-700/50"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Cetak Per Kelas (Massal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQrPrintMode("single")
                    setSelectedSiswaSingleId("")
                    setSearchSiswaQuery("")
                  }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                    qrPrintMode === "single"
                      ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/20 dark:border-slate-700/50"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Cetak Per Siswa (Tunggal)</span>
                </button>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  Filter Rombel (Kelas)
                </Label>
                <Select
                  value={bulkFilterClassId}
                  onValueChange={(v) => {
                    setBulkFilterClassId(v ?? "semua")
                    setSelectedSiswaSingleId("")
                    setSearchSiswaQuery("")
                  }}
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

              {qrPrintMode === "single" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                      Cari Nama / NISN Siswa (Opsional)
                    </Label>
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Ketik nama atau NISN siswa..."
                        value={searchSiswaQuery}
                        onChange={(e) => {
                          setSearchSiswaQuery(e.target.value)
                          setSelectedSiswaSingleId("")
                        }}
                        className="h-10 pl-9 pr-8 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 font-semibold text-slate-750 dark:text-slate-350 w-full"
                      />
                      {searchSiswaQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchSiswaQuery("")
                            setSelectedSiswaSingleId("")
                          }}
                          className="absolute right-3 hover:text-slate-650 text-slate-400 p-1 rounded-md transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block mb-1">
                      Pilih Siswa Spesifik
                    </Label>
                    <Select
                      value={selectedSiswaSingleId}
                      onValueChange={(v) => setSelectedSiswaSingleId(v ?? "")}
                      options={[
                        { value: "", label: "Pilih Siswa..." },
                        ...(bulkFilteredSiswaList?.map((s) => ({ value: s.id, label: `${s.namaLengkap} (${s.nisn || s.nisLokal || "Tanpa NIS"})` })) || [])
                      ]}
                    >
                      <SelectTrigger className="h-10 px-3 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 font-semibold text-slate-750 dark:text-slate-300 w-full text-left">
                        <SelectValue placeholder="Pilih Siswa..." />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        <SelectItem value="" className="text-xs font-semibold">Pilih Siswa...</SelectItem>
                        {bulkFilteredSiswaList?.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs font-semibold">
                            {s.namaLengkap} ({s.nisn || s.nisLokal || "-"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {qrPrintMode === "massal" && (
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
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleBulkPrintQR}
                  disabled={bulkPrinting || bulkDownloading || !siswaAll || siswaAll.length === 0}
                  className="flex-1 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-teal-500/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  {bulkPrinting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span className="truncate max-w-[90px]">{bulkProgress || "Membuat..."}</span>
                    </>
                  ) : (
                    <>
                      <Printer className="h-3.5 w-3.5 shrink-0" />
                      <span>{qrPrintMode === "single" ? "Cetak QR Siswa" : "Cetak Massal"}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBulkDownloadBarcodes}
                  disabled={bulkPrinting || bulkDownloading || !siswaAll || siswaAll.length === 0}
                  className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  {bulkDownloading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span className="truncate max-w-[90px]">{bulkProgress || "ZIP..."}</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5 shrink-0" />
                      <span>{qrPrintMode === "single" ? "Unduh QR Siswa" : "Unduh ZIP"}</span>
                    </>
                  )}
                </button>
              </div>

              {(bulkPrinting || bulkDownloading) && bulkProgress && (
                <div className="pt-2">
                  <div className="text-[10px] text-muted-foreground font-semibold text-center">{bulkProgress}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialog Alasan Keterlambatan / Pulang Cepat */}
      <Dialog open={lateDialogOpen} onOpenChange={(v) => { if (!v) { setLateDialogOpen(false); setLateData(null); resetAndRestartScanner(); } }}>
        <DialogContent className="max-w-md p-0 rounded-3xl bg-background border-0 shadow-2xl overflow-hidden text-left">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
                {lateData?.action === "pulang" ? "Konfirmasi Pulang Lebih Awal" : "Konfirmasi Keterlambatan"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); resetAndRestartScanner(); }}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 text-xs font-semibold text-amber-800 dark:text-amber-300">
              <p className="font-bold">⚠️ Perhatian:</p>
              <p className="mt-1">
                {lateData?.action === "pulang" ? (
                  <>
                    <p>
                      <strong>{lateData?.name}</strong> sudah tercatat MASUK hari ini{lateData?.jamMasuk ? ` pukul ${lateData.jamMasuk}` : ""}.
                      Waktu pemindaian ini masih sebelum jam pulang — akan dicatat sebagai PULANG lebih awal. Anda wajib mengisi alasan kepulangan lebih awal.
                    </p>
                  </>
                ) : (
                  <>
                    Waktu pemindaian absensi masuk untuk <strong>{lateData?.name}</strong> telah melewati batas toleransi keterlambatan 15 menit. Anda wajib mengisi alasan keterlambatan untuk mencatat kehadiran ini.
                  </>
                )}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                {lateData?.action === "pulang" ? "Alasan Pulang Cepat (Wajib)" : "Alasan Terlambat (Wajib)"}
              </Label>
              <textarea
                value={lateReason}
                onChange={(e) => setLateReason(e.target.value)}
                placeholder={lateData?.action === "pulang" ? "Masukkan alasan pulang cepat (misalnya: sakit, urusan keluarga mendesak, dll)..." : "Masukkan alasan keterlambatan (misalnya: macet di jalan, kendala kendaraan, dll)..."}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 focus:ring-teal-500/10 focus:border-teal-500 bg-slate-50/50 dark:bg-slate-900/50 text-xs p-3 font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
            <button
              type="button"
              onClick={() => { setLateDialogOpen(false); setLateData(null); resetAndRestartScanner(); }}
              disabled={submittingLateReason}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-85"
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
