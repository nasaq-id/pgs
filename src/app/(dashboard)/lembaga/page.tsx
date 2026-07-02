"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Building2, User, Mail, Globe, RefreshCw, ImageIcon, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/trpc/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const jenjangMap: Record<string, string> = {
  tk: "TK (Taman Kanak-kanak)", sd: "SD (Sekolah Dasar)",
  smp: "SMP (Sekolah Menengah Pertama)", sma: "SMA (Sekolah Menengah Atas)",
  smk: "SMK (Sekolah Menengah Kejuruan)", mi: "MI (Madrasah Ibtidaiyah)",
  mts: "MTS (Madrasah Tsanawiyah)", ma: "MA (Madrasah Aliyah)",
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value || "—"}</p>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
    </div>
  )
}

export default function LembagaPage() {
  const { data: session } = useSession()
  const { data: sekolah, isLoading } = api.lembaga.getSekolah.useQuery()
  const updateSekolah = api.lembaga.updateSekolah.useMutation()
  const utils = api.useUtils()

  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const openEdit = () => {
    if (sekolah) {
      setForm({
        namaSekolah: sekolah.namaSekolah || "",
        npsn: sekolah.npsn || "",
        jenjang: sekolah.jenjang || "",
        alamat: sekolah.alamat || "",
        telepon: sekolah.telepon || "",
        emailSekolah: sekolah.emailSekolah || "",
        kepalaSekolah: sekolah.kepalaSekolah || "",
        penyelenggara: sekolah.penyelenggara || "",
        statusSekolah: sekolah.statusSekolah || "",
        kurikulum: sekolah.kurikulum || "",
        situsWeb: sekolah.situsWeb || "",
        akreditasi: sekolah.akreditasi || "",
      })
    }
    setEditOpen(true)
  }

  const handleSave = async () => {
    await updateSekolah.mutateAsync(form)
    utils.lembaga.getSekolah.invalidate()
    setEditOpen(false)
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 space-y-4">
          <Skeleton className="h-28 w-28 rounded-full mx-auto" />
          <Skeleton className="h-6 w-40 mx-auto" />
          <Skeleton className="h-4 w-28 mx-auto" />
        </div>
        <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-6 space-y-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 flex flex-col items-center gap-5">
        <div className="h-28 w-28 rounded-full border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
          <ImageIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-foreground uppercase tracking-wide">
            {sekolah?.namaSekolah || "—"}
          </h2>
          {sekolah?.npsn && (
            <p className="text-sm font-semibold text-primary mt-1">NPSN: {sekolah.npsn}</p>
          )}
        </div>
        {(sekolah?.akreditasi || sekolah?.kurikulum) && (
          <div className="flex flex-wrap gap-2 justify-center">
            {sekolah?.akreditasi && (
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-yellow-400 text-yellow-600 bg-yellow-50">
                AKREDITASI {sekolah.akreditasi}
              </span>
            )}
            {sekolah?.kurikulum && (
              <span className="text-xs font-bold px-3 py-1 rounded-full border border-primary/40 text-primary bg-primary/5">
                {sekolah.kurikulum}
              </span>
            )}
          </div>
        )}
        <div className="w-full border-t border-border" />
        <div className="w-full space-y-4">
          <InfoItem icon={User} label="Kepala Sekolah" value={sekolah?.kepalaSekolah} />
          <InfoItem icon={Mail} label="Email Resmi" value={sekolah?.emailSekolah} />
          <InfoItem icon={Globe} label="Situs Web" value={sekolah?.situsWeb} />
        </div>
      </div>

      <div className="lg:col-span-3 bg-card rounded-2xl border border-border p-6 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 rounded-full bg-primary flex-shrink-0" />
            <h3 className="text-xs font-black text-foreground uppercase tracking-widest">
              Detail Identitas Lembaga
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={openEdit} className="gap-2">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 flex-1">
          <DetailRow label="Jenjang" value={sekolah?.jenjang ? (jenjangMap[sekolah.jenjang] || sekolah.jenjang) : "—"} />
          <DetailRow label="Status Sekolah" value={sekolah?.statusSekolah} />
          <DetailRow label="Penyelenggara" value={sekolah?.penyelenggara} />
          <DetailRow label="Kurikulum" value={sekolah?.kurikulum} />
          <DetailRow label="Kontak / No. Telp" value={sekolah?.telepon} />
          <DetailRow label="Akreditasi" value={sekolah?.akreditasi} />
          <div className="sm:col-span-2">
            <DetailRow label="Alamat Lengkap" value={sekolah?.alamat} />
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Status: Data Tersimpan
          </span>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profil Lembaga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Sekolah</Label>
              <Input value={form.namaSekolah || ""} onChange={(e) => setForm({ ...form, namaSekolah: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NPSN</Label>
                <Input value={form.npsn || ""} onChange={(e) => setForm({ ...form, npsn: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jenjang</Label>
                <Select value={form.jenjang} onValueChange={(v) => v && setForm({ ...form, jenjang: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(jenjangMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alamat</Label>
              <Input value={form.alamat || ""} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input value={form.telepon || ""} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.emailSekolah || ""} onChange={(e) => setForm({ ...form, emailSekolah: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kepala Sekolah</Label>
                <Input value={form.kepalaSekolah || ""} onChange={(e) => setForm({ ...form, kepalaSekolah: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Akreditasi</Label>
                <Input value={form.akreditasi || ""} onChange={(e) => setForm({ ...form, akreditasi: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status Sekolah</Label>
                <Input value={form.statusSekolah || ""} onChange={(e) => setForm({ ...form, statusSekolah: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Penyelenggara</Label>
                <Input value={form.penyelenggara || ""} onChange={(e) => setForm({ ...form, penyelenggara: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kurikulum</Label>
                <Input value={form.kurikulum || ""} onChange={(e) => setForm({ ...form, kurikulum: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Situs Web</Label>
                <Input value={form.situsWeb || ""} onChange={(e) => setForm({ ...form, situsWeb: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} className="w-full" disabled={updateSekolah.isPending}>
              {updateSekolah.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
