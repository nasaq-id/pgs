"use client"

import { api } from "@/lib/trpc/client"

export default function GlobalAuditLogsTab() {
  const { data: auditLogsList = [], isLoading: isLogsLoading } = api.superAdmin.listGlobalAuditLogs.useQuery({ limit: 50 })

  return (
    <div className="neumo-card bg-background rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Platform Audit Trails</h4>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold">50 data terbaru</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-4">Waktu</th>
              <th className="py-4 px-4">Pengguna</th>
              <th className="py-4 px-4">Sekolah</th>
              <th className="py-4 px-4 text-center">Aksi</th>
              <th className="py-4 px-4">Entitas</th>
              <th className="py-4 px-4">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {isLogsLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-450">
                  Memuat log transaksi...
                </td>
              </tr>
            ) : auditLogsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-450">
                  Belum ada transaksi log audit terekam di sistem.
                </td>
              </tr>
            ) : (
              auditLogsList.map((log: any) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-100/50 text-xs text-slate-600"
                >
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-4 font-bold">
                    {log.userFirstName || "System"}
                    <span className="block text-[9px] text-slate-400 font-mono font-normal">{log.userEmail || "system@pgs.id"}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-705">
                    {log.sekolahNama || "Sistem Utama (Global)"}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      log.action === "create" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                      log.action === "update" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-500 uppercase text-[9px]">{log.entity}</td>
                  <td className="py-3 px-4 font-mono text-[9px] text-slate-500 max-w-xs truncate">
                    {log.metadata ? JSON.stringify(log.metadata) : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
