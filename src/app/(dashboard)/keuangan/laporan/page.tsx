"use client"

import { useState } from "react"
import { api } from "@/lib/trpc/client"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileDown, Printer } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

function fmtRupiah(num: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(num)
}

const STATUS_LABEL: Record<string, string> = {
  issued: "Belum Dibayar",
  partially_paid: "Sebagian",
  paid: "Lunas",
  overdue: "Tertunggak",
  cancelled: "Dibatalkan",
}

const STATUS_COLOR: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  issued: "secondary",
  partially_paid: "outline",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
}

export default function LaporanPage() {
  const tahunSkrg = new Date().getFullYear()
  const [tahun] = useState(tahunSkrg)

  const { data: trend, isLoading: trendLoading } = api.keuangan.report.monthlyTrend.useQuery({ tahun })
  const { data: outstanding, isLoading: outstandingLoading } = api.keuangan.report.outstanding.useQuery({})
  const { data: rekap, isLoading: rekapLoading } = api.keuangan.report.rekapSpp.useQuery({ tahun })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Laporan</h2>
          <p className="text-muted-foreground">Laporan keuangan, piutang, dan rekap SPP</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2"><FileDown className="h-4 w-4" /> Export Excel</Button>
          <Button variant="outline" size="sm" className="gap-2"><Printer className="h-4 w-4" /> Cetak</Button>
        </div>
      </div>

      <Tabs defaultValue="cashflow">
        <TabsList>
          <TabsTrigger value="cashflow">Arus Kas</TabsTrigger>
          <TabsTrigger value="piutang">Piutang</TabsTrigger>
          <TabsTrigger value="rekap">Rekap SPP</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Arus Kas per Bulan (Tahun {tahun})</h3>
            {trendLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-right">Total Tagihan</TableHead>
                      <TableHead className="text-right">Terkumpul</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Efektivitas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!trend || trend.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell>
                      </TableRow>
                    ) : (
                      trend.map((b: any) => {
                        const sisa = b.total - b.paid
                        const efektivitas = b.total > 0 ? Math.round((b.paid / b.total) * 100) : 0
                        return (
                          <TableRow key={b.bulan}>
                            <TableCell className="font-medium">{BULAN[b.bulan - 1]}</TableCell>
                            <TableCell className="text-right">{fmtRupiah(b.total)}</TableCell>
                            <TableCell className="text-right">{fmtRupiah(b.paid)}</TableCell>
                            <TableCell className="text-right">{fmtRupiah(sisa)}</TableCell>
                            <TableCell>
                              <Badge variant={efektivitas >= 80 ? "default" : efektivitas >= 50 ? "secondary" : "destructive"}>
                                {efektivitas}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {(!trend || trend.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Belum ada data</div>
                ) : (
                  trend.map((b: any) => {
                    const sisa = b.total - b.paid
                    const efektivitas = b.total > 0 ? Math.round((b.paid / b.total) * 100) : 0
                    return (
                      <div key={b.bulan} className="neumo-card bg-background rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{BULAN[b.bulan - 1]}</span>
                          <Badge variant={efektivitas >= 80 ? "default" : efektivitas >= 50 ? "secondary" : "destructive"}>{efektivitas}%</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex justify-between"><span className="font-semibold">Tagihan:</span><span>{fmtRupiah(b.total)}</span></div>
                          <div className="flex justify-between"><span className="font-semibold">Terkumpul:</span><span>{fmtRupiah(b.paid)}</span></div>
                          <div className="flex justify-between"><span className="font-semibold">Sisa:</span><span>{fmtRupiah(sisa)}</span></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="piutang" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Piutang Tertunggak</h3>
            {outstandingLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Terbayar</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!outstanding || outstanding.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Tidak ada piutang</TableCell>
                      </TableRow>
                    ) : (
                      outstanding.slice(0, 50).map((inv) => {
                        const total = Number(inv.totalAmount)
                        const paid = Number(inv.paidAmount)
                        return (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-xs">{inv.studentId.slice(0, 8)}...</TableCell>
                            <TableCell className="text-right">{fmtRupiah(total)}</TableCell>
                            <TableCell className="text-right">{fmtRupiah(paid)}</TableCell>
                            <TableCell className="text-right font-medium">{fmtRupiah(total - paid)}</TableCell>
                            <TableCell>
                              <Badge variant={STATUS_COLOR[inv.status] || "secondary"} className="text-xs">
                                {STATUS_LABEL[inv.status] || inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {(!outstanding || outstanding.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada piutang</div>
                ) : (
                  outstanding.slice(0, 50).map((inv) => {
                    const total = Number(inv.totalAmount)
                    const paid = Number(inv.paidAmount)
                    return (
                      <div key={inv.id} className="neumo-card bg-background rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{inv.studentId.slice(0, 8)}...</span>
                          <Badge variant={STATUS_COLOR[inv.status] || "secondary"} className="text-xs">{STATUS_LABEL[inv.status] || inv.status}</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-slate-500">
                          <div className="flex justify-between"><span className="font-semibold">Total:</span><span>{fmtRupiah(total)}</span></div>
                          <div className="flex justify-between"><span className="font-semibold">Terbayar:</span><span>{fmtRupiah(paid)}</span></div>
                          <div className="flex justify-between font-medium"><span className="font-semibold">Sisa:</span><span>{fmtRupiah(total - paid)}</span></div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              </>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="rekap" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Rekap SPP {tahun}</h3>
            {rekapLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Bulan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Terbayar</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(!rekap || rekap.length === 0) ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada data</TableCell>
                      </TableRow>
                    ) : (
                      rekap.slice(0, 100).map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs">{inv.id.slice(0, 8)}...</TableCell>
                          <TableCell>{BULAN[(inv.periodMonth || 1) - 1]}</TableCell>
                          <TableCell className="text-right">{fmtRupiah(Number(inv.totalAmount))}</TableCell>
                          <TableCell className="text-right">{fmtRupiah(Number(inv.paidAmount))}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_COLOR[inv.status] || "secondary"} className="text-xs">
                              {STATUS_LABEL[inv.status] || inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-2">
                {(!rekap || rekap.length === 0) ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Belum ada data</div>
                ) : (
                  rekap.slice(0, 100).map((inv: any) => (
                    <div key={inv.id} className="neumo-card bg-background rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{inv.id.slice(0, 8)}...</span>
                        <Badge variant={STATUS_COLOR[inv.status] || "secondary"} className="text-xs">{STATUS_LABEL[inv.status] || inv.status}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <div className="flex justify-between"><span className="font-semibold">Bulan:</span><span>{BULAN[(inv.periodMonth || 1) - 1]}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">Jumlah:</span><span>{fmtRupiah(Number(inv.totalAmount))}</span></div>
                        <div className="flex justify-between"><span className="font-semibold">Terbayar:</span><span>{fmtRupiah(Number(inv.paidAmount))}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
