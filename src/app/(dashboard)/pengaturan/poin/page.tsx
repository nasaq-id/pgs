"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Loader2, Search, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { api } from "@/lib/trpc/client"

const tabs = ["Kategori Sikap", "Tindak Lanjut", "Aturan Akumulasi"] as const
type Tab = (typeof tabs)[number]

function formatPoin(val: number) {
  return val > 0 ? `+${val}` : `${val}`
}

export default function PengaturanPoinPage() {
  const [tab, setTab] = useState<Tab>("Kategori Sikap")
  const utils = api.useUtils()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pengaturan Poin</h2>
        <p className="text-muted-foreground">Kelola kategori sikap, tindak lanjut, dan aturan akumulasi poin</p>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl neumo-card bg-background w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              tab === t
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Kategori Sikap" && <KategoriTab />}
      {tab === "Tindak Lanjut" && <TindakLanjutTab />}
      {tab === "Aturan Akumulasi" && <AturanTab />}
    </div>
  )
}

function KategoriTab() {
  const [search, setSearch] = useState("")
  const [filterJenis, setFilterJenis] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const utils = api.useUtils()

  const { data: list, isLoading } = api.poin.getAllKategori.useQuery({
    search: search || undefined,
    jenis: (filterJenis as any) || undefined,
  })

  const create = api.poin.createKategori.useMutation({
    onSuccess: () => { toast.success("Kategori ditambahkan"); utils.poin.getAllKategori.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const update = api.poin.updateKategori.useMutation({
    onSuccess: () => { toast.success("Kategori diperbarui"); utils.poin.getAllKategori.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const remove = api.poin.removeKategori.useMutation({
    onSuccess: () => { toast.success("Kategori dihapus"); utils.poin.getAllKategori.invalidate(); setDeleteId(null) },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      nama: form.get("nama") as string,
      jenis: form.get("jenis") as "positif" | "negatif",
      poin: Number(form.get("poin")),
    }
    if (editData?.id) {
      update.mutate({ id: editData.id, data })
    } else {
      create.mutate(data)
    }
  }

  return (
    <Card className="p-5 rounded-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari kategori..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" className="h-10 px-4">
              Cari
            </Button>
          </div>
          <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v || "")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Semua Jenis</SelectItem>
              <SelectItem value="positif">Positif</SelectItem>
              <SelectItem value="negatif">Negatif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => { setEditData(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Kategori
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : !list?.length ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada kategori sikap</div>
      ) : (
        <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Poin</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nama}</TableCell>
                  <TableCell>
                    <Badge variant={item.jenis === "positif" ? "default" : "destructive"}>
                      {item.jenis === "positif" ? "Positif" : "Negatif"}
                    </Badge>
                  </TableCell>
                  <TableCell className={item.poin > 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {formatPoin(item.poin)}
                  </TableCell>
                  <TableCell>{item.aktif ? <Badge variant="outline">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => {
                        const inst = item as any
                        setEditData({ id: inst.id, nama: inst.nama, jenis: inst.jenis, poin: String(inst.poin) })
                        setFormOpen(true)
                      }} />}><Pencil className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Edit</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)} />}><Trash2 className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Hapus</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden space-y-2">
          {list.map((item: any) => (
            <div key={item.id} className="neumo-card bg-background rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.nama}</span>
                <span className={`font-black text-sm ${item.poin > 0 ? "text-green-600" : "text-red-600"}`}>{formatPoin(item.poin)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge variant={item.jenis === "positif" ? "default" : "destructive"} style={{fontSize: "10px"}}>{item.jenis === "positif" ? "Positif" : "Negatif"}</Badge>
                {item.aktif ? <Badge variant="outline" className="text-[10px]">Aktif</Badge> : <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
              </div>
              <div className="flex gap-1 mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                <button onClick={() => { const inst = item as any; setEditData({ id: inst.id, nama: inst.nama, jenis: inst.jenis, poin: String(inst.poin) }); setFormOpen(true) }} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => setDeleteId(item.id)} className="rounded-lg p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditData(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editData ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Sikap</label>
              <Input name="nama" required defaultValue={editData?.nama || ""} placeholder="Mis: Menolong teman" />
            </div>
            <div>
              <label className="text-sm font-medium">Jenis</label>
              <Select name="jenis" defaultValue={editData?.jenis || "positif"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positif">Positif</SelectItem>
                  <SelectItem value="negatif">Negatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Poin</label>
              <Input name="poin" type="number" required defaultValue={editData?.poin || "0"} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Kategori</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus kategori ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate({ id: deleteId })} disabled={remove.isPending} className="bg-destructive">
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function TindakLanjutTab() {
  const [search, setSearch] = useState("")
  const [filterJenis, setFilterJenis] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const utils = api.useUtils()

  const { data: list, isLoading } = api.poin.getAllTindakLanjut.useQuery({
    search: search || undefined,
    jenis: (filterJenis as any) || undefined,
  })

  const create = api.poin.createTindakLanjut.useMutation({
    onSuccess: () => { toast.success("Tindak lanjut ditambahkan"); utils.poin.getAllTindakLanjut.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const update = api.poin.updateTindakLanjut.useMutation({
    onSuccess: () => { toast.success("Tindak lanjut diperbarui"); utils.poin.getAllTindakLanjut.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const remove = api.poin.removeTindakLanjut.useMutation({
    onSuccess: () => { toast.success("Tindak lanjut dihapus"); utils.poin.getAllTindakLanjut.invalidate(); setDeleteId(null) },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      nama: form.get("nama") as string,
      jenis: form.get("jenis") as "positif" | "negatif",
    }
    if (editData?.id) {
      update.mutate({ id: editData.id, data })
    } else {
      create.mutate(data)
    }
  }

  return (
    <Card className="p-5 rounded-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Cari tindak lanjut..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button type="button" variant="secondary" className="h-10 px-4">
              Cari
            </Button>
          </div>
          <Select value={filterJenis} onValueChange={(v) => setFilterJenis(v || "")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Semua Jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value=" ">Semua Jenis</SelectItem>
              <SelectItem value="positif">Positif</SelectItem>
              <SelectItem value="negatif">Negatif</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => { setEditData(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Tindak Lanjut
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : !list?.length ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada tindak lanjut</div>
      ) : (
        <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nama}</TableCell>
                  <TableCell>
                    <Badge variant={item.jenis === "positif" ? "default" : "destructive"}>
                      {item.jenis === "positif" ? "Positif" : "Negatif"}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.aktif ? <Badge variant="outline">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => { setEditData(item); setFormOpen(true) }} />}><Pencil className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Edit</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)} />}><Trash2 className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Hapus</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden space-y-2">
          {list.map((item: any) => (
            <div key={item.id} className="neumo-card bg-background rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{item.nama}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditData(item); setFormOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant={item.jenis === "positif" ? "default" : "destructive"} className="text-[10px]">{item.jenis === "positif" ? "Positif" : "Negatif"}</Badge>
                {item.aktif ? <Badge variant="outline" className="text-[10px]">Aktif</Badge> : <Badge variant="secondary" className="text-[10px]">Nonaktif</Badge>}
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditData(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editData ? "Edit Tindak Lanjut" : "Tambah Tindak Lanjut"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nama Tindak Lanjut</label>
              <Input name="nama" required defaultValue={editData?.nama || ""} placeholder="Mis: Teguran lisan" />
            </div>
            <div>
              <label className="text-sm font-medium">Jenis</label>
              <Select name="jenis" defaultValue={editData?.jenis || "positif"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positif">Positif</SelectItem>
                  <SelectItem value="negatif">Negatif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Tindak Lanjut</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus tindak lanjut ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate({ id: deleteId })} disabled={remove.isPending} className="bg-destructive">
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function AturanTab() {
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const utils = api.useUtils()

  const { data: list, isLoading } = api.poin.getAllAturan.useQuery()
  const create = api.poin.createAturan.useMutation({
    onSuccess: () => { toast.success("Aturan ditambahkan"); utils.poin.getAllAturan.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const update = api.poin.updateAturan.useMutation({
    onSuccess: () => { toast.success("Aturan diperbarui"); utils.poin.getAllAturan.invalidate(); setFormOpen(false); setEditData(null) },
    onError: (e) => toast.error(e.message),
  })
  const remove = api.poin.removeAturan.useMutation({
    onSuccess: () => { toast.success("Aturan dihapus"); utils.poin.getAllAturan.invalidate(); setDeleteId(null) },
    onError: (e) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const data = {
      poinMin: Number(form.get("poinMin")),
      poinMax: Number(form.get("poinMax")),
      tindakLanjut: form.get("tindakLanjut") as string,
      status: form.get("status") as string,
    }
    if (editData?.id) {
      update.mutate({ id: editData.id, data })
    } else {
      create.mutate(data)
    }
  }

  return (
    <Card className="p-5 rounded-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="text-sm text-muted-foreground">Aturan tindak lanjut otomatis berdasarkan rentang akumulasi poin siswa</p>
        </div>
        <Button style={{ backgroundColor: "hsl(142 72% 40%)" }} onClick={() => { setEditData(null); setFormOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Aturan
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
      ) : !list?.length ? (
        <div className="text-center py-16 text-muted-foreground">Belum ada aturan akumulasi</div>
      ) : (
        <>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rentang Poin</TableHead>
                <TableHead>Tindak Lanjut</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-bold">
                    {item.poinMin} — {item.poinMax}
                  </TableCell>
                  <TableCell>{item.tindakLanjut}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" onClick={() => { setEditData(item); setFormOpen(true) }} />}><Pencil className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Edit</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                      <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(item.id)} />}><Trash2 className="h-4 w-4" /></TooltipTrigger><TooltipPortal><TooltipPositioner><TooltipPopup>Hapus</TooltipPopup></TooltipPositioner></TooltipPortal></Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden space-y-2">
          {list.map((item: any) => (
            <div key={item.id} className="neumo-card bg-background rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">{item.poinMin} — {item.poinMax}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditData(item); setFormOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteId(item.id)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 hover:text-rose-700 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="font-semibold text-slate-500">{item.tindakLanjut}</span>
                <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
              </div>
            </div>
          ))}
        </div>
        </>
      )}

      <Dialog open={formOpen} onOpenChange={(v) => { if (!v) { setFormOpen(false); setEditData(null) } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editData ? "Edit Aturan" : "Tambah Aturan"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Poin Minimal</label>
                <Input name="poinMin" type="number" required defaultValue={editData?.poinMin ?? ""} />
              </div>
              <div>
                <label className="text-sm font-medium">Poin Maksimal</label>
                <Input name="poinMax" type="number" required defaultValue={editData?.poinMax ?? ""} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tindak Lanjut</label>
              <Input name="tindakLanjut" required defaultValue={editData?.tindakLanjut || ""} placeholder="Mis: SP 1 & Pendampingan Guru BK" />
            </div>
            <div>
              <label className="text-sm font-medium">Kode Status</label>
              <Input name="status" required defaultValue={editData?.status || ""} placeholder="Mis: sp1, sp2, apresiasi" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {(create.isPending || update.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Aturan</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus aturan ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate({ id: deleteId })} disabled={remove.isPending} className="bg-destructive">
              {remove.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
