"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react"
import { api } from "@/lib/trpc/client"

const ALL_DAYS = [
  { value: "senin", label: "Senin" },
  { value: "selasa", label: "Selasa" },
  { value: "rabu", label: "Rabu" },
  { value: "kamis", label: "Kamis" },
  { value: "jumat", label: "Jumat" },
  { value: "sabtu", label: "Sabtu" },
]

interface AgendaItem {
  id?: string
  hari: string
  nama: string
  icon: string
  jamMulai: string
  jamSelesai: string
  urutan: number
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function PengaturanJadwalDialog({ open, onClose }: Props) {
  const utils = api.useUtils()

  const { data: pengaturan, isLoading: loadPengaturan } = api.pengaturanJadwal.get.useQuery(
    {},
    { enabled: open }
  )

  const upsertPengaturan = api.pengaturanJadwal.upsert.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.get.invalidate()
    },
  })

  const { data: agendaList, isLoading: loadAgenda } = api.pengaturanJadwal.getAgenda.useQuery(
    {},
    { enabled: open }
  )

  const upsertAgenda = api.pengaturanJadwal.upsertAgenda.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getAgenda.invalidate()
    },
  })

  const deleteAgenda = api.pengaturanJadwal.deleteAgenda.useMutation({
    onSuccess: () => {
      utils.pengaturanJadwal.getAgenda.invalidate()
    },
  })

  const [hariAktif, setHariAktif] = useState<string[]>(["senin", "selasa", "rabu", "kamis", "jumat"])
  const [durasiJP, setDurasiJP] = useState(40)
  const [jamMulai, setJamMulai] = useState("07:00")
  const [jamPulang, setJamPulang] = useState("15:00")
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [saving, setSaving] = useState(false)

  const [agendaFormOpen, setAgendaFormOpen] = useState(false)
  const [editAgenda, setEditAgenda] = useState<AgendaItem | null>(null)
  const [afHari, setAfHari] = useState("senin")
  const [afNama, setAfNama] = useState("")
  const [afIcon, setAfIcon] = useState("clock")
  const [afJamMulai, setAfJamMulai] = useState("07:00")
  const [afJamSelesai, setAfJamSelesai] = useState("07:40")
  const [afUrutan, setAfUrutan] = useState(0)

  useEffect(() => {
    if (!open) return
    if (pengaturan) {
      try {
        const parsed = JSON.parse(pengaturan.hariAktif)
        setHariAktif(Array.isArray(parsed) ? parsed : ["senin", "selasa", "rabu", "kamis", "jumat"])
      } catch {
        setHariAktif(["senin", "selasa", "rabu", "kamis", "jumat"])
      }
      setDurasiJP(pengaturan.durasiJP)
      setJamMulai(pengaturan.jamMulai)
      setJamPulang(pengaturan.jamPulang)
    }
  }, [open, pengaturan])

  useEffect(() => {
    if (!open) return
    if (agendaList) {
      setAgendaItems(agendaList as AgendaItem[])
    }
  }, [open, agendaList])

  const toggleDay = (day: string) => {
    setHariAktif((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSavePengaturan = async () => {
    setSaving(true)
    try {
      await upsertPengaturan.mutateAsync({
        durasiJP,
        hariAktif: JSON.stringify(hariAktif),
        jamMulai,
        jamPulang,
      })
    } finally {
      setSaving(false)
    }
  }

  const openAddAgenda = () => {
    setEditAgenda(null)
    setAfHari("senin")
    setAfNama("")
    setAfIcon("clock")
    setAfJamMulai("07:00")
    setAfJamSelesai("07:40")
    setAfUrutan(agendaItems.length + 1)
    setAgendaFormOpen(true)
  }

  const openEditAgenda = (item: AgendaItem) => {
    setEditAgenda(item)
    setAfHari(item.hari)
    setAfNama(item.nama)
    setAfIcon(item.icon || "clock")
    setAfJamMulai(item.jamMulai)
    setAfJamSelesai(item.jamSelesai)
    setAfUrutan(item.urutan)
    setAgendaFormOpen(true)
  }

  const handleSaveAgenda = async () => {
    if (!afNama || !afJamMulai || !afJamSelesai) return
    await upsertAgenda.mutateAsync({
      id: editAgenda?.id,
      hari: afHari as any,
      nama: afNama,
      icon: afIcon,
      jamMulai: afJamMulai,
      jamSelesai: afJamSelesai,
      urutan: afUrutan,
    })
    setAgendaFormOpen(false)
  }

  const handleDeleteAgenda = async (id: string) => {
    await deleteAgenda.mutateAsync({ id })
  }

  const handleClose = () => {
    if (upsertPengaturan.isPending) return
    onClose()
  }

  const savingAgenda = upsertAgenda.isPending
  const loading = loadPengaturan || loadAgenda

  const agendaByDay = ALL_DAYS.reduce((acc, day) => {
    acc[day.value] = agendaItems.filter((a) => a.hari === day.value).sort((a, b) => a.urutan - b.urutan)
    return acc
  }, {} as Record<string, AgendaItem[]>)

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pengaturan Jadwal</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[hsl(142_72%_40%)]" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Hari Aktif</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_DAYS.map((day) => (
                    <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={hariAktif.includes(day.value)}
                        onCheckedChange={() => toggleDay(day.value)}
                      />
                      <span className="text-sm">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Durasi per JP (menit)</Label>
                  <Input
                    type="number"
                    min={15}
                    max={120}
                    value={durasiJP}
                    onChange={(e) => setDurasiJP(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jam Mulai</Label>
                  <Input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jam Pulang</Label>
                  <Input
                    type="time"
                    value={jamPulang}
                    onChange={(e) => setJamPulang(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Agenda Khusus</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={openAddAgenda}
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Agenda
                  </Button>
                </div>

                {agendaItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Belum ada agenda khusus. Tambahkan agenda seperti Pembiasaan, Upacara, Istirahat, atau Sholat.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ALL_DAYS.map((day) => {
                      const items = agendaByDay[day.value]
                      if (items.length === 0) return null
                      return (
                        <div key={day.value}>
                          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase">
                            {day.label}
                          </p>
                          <div className="space-y-1 ml-2">
                            {items.map((item) => (
                              <div
                                key={item.id || item.nama + item.jamMulai}
                                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
                              >
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground text-xs">
                                    {item.jamMulai} - {item.jamSelesai}
                                  </span>
                                  <span className="font-medium">{item.nama}</span>
                                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    JP ke-{item.urutan}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => openEditAgenda(item)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => item.id && handleDeleteAgenda(item.id)}
                                    disabled={deleteAgenda.isPending}
                                  >
                                    {deleteAgenda.isPending ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Tutup
            </Button>
            <Button
              onClick={handleSavePengaturan}
              disabled={saving || loading}
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Simpan Pengaturan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={agendaFormOpen} onOpenChange={(v) => !v && setAgendaFormOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editAgenda ? "Edit Agenda" : "Tambah Agenda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Agenda</Label>
              <Input
                value={afNama}
                onChange={(e) => setAfNama(e.target.value)}
                placeholder="Contoh: Pembiasaan Literasi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hari</Label>
              <select
                value={afHari}
                onChange={(e) => setAfHari(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                {ALL_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Icon Agenda</Label>
              <select
                value={afIcon}
                onChange={(e) => setAfIcon(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
              >
                <option value="book-open">Pembiasaan (Buku)</option>
                <option value="flag">Upacara (Bendera)</option>
                <option value="coffee">Istirahat (Kopi)</option>
                <option value="sparkles">Sholat (Bintang/Sinar)</option>
                <option value="clock">Lainnya (Jam)</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jam Mulai</Label>
                <Input
                  type="time"
                  value={afJamMulai}
                  onChange={(e) => setAfJamMulai(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jam Selesai</Label>
                <Input
                  type="time"
                  value={afJamSelesai}
                  onChange={(e) => setAfJamSelesai(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Urutan JP</Label>
              <Input
                type="number"
                min={0}
                value={afUrutan}
                onChange={(e) => setAfUrutan(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgendaFormOpen(false)} disabled={savingAgenda}>
              Batal
            </Button>
            <Button
              onClick={handleSaveAgenda}
              disabled={savingAgenda || !afNama}
              style={{ backgroundColor: "hsl(142 72% 40%)" }}
            >
              {savingAgenda && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editAgenda ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
