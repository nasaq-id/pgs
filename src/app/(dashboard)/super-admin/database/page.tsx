"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import {
  Database, Search, RefreshCw, ArrowRight, GitFork, Key,
  Sparkles, Layers, Hash, CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

function getRLSInfo(tableName: string) {
  if (tableName === "sekolah" || tableName === "users") {
    return {
      category: "Global (Sistem)",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
      description: "Tabel sistem utama. Data dapat dibaca oleh semua tenant/sekolah, namun penulisan atau pengubahan data dibatasi hanya untuk akun super_admin.",
      sqlPolicy: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- 1. Kebijakan Membaca Data (Semua Orang)
CREATE POLICY global_read_policy ON ${tableName}
  FOR SELECT USING (true);

-- 2. Kebijakan Menulis/Mengubah Data (Hanya Super Admin)
CREATE POLICY global_write_policy ON ${tableName}
  FOR ALL
  USING (current_setting('app.current_role', true) = 'super_admin')
  WITH CHECK (current_setting('app.current_role', true) = 'super_admin');`
    }
  }
  
  if (tableName === "audit_logs" || tableName === "catatan_mutasi") {
    return {
      category: "Audit Logs (Append-Only)",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
      description: "Log aktivitas & jejak audit. Hanya boleh ditambahkan (INSERT), tidak boleh diedit (UPDATE) atau dihapus (DELETE) oleh siapapun demi integritas data audit.",
      sqlPolicy: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- 1. Kebijakan Menambahkan Log (Semua Transaksi)
CREATE POLICY audit_insert_policy ON ${tableName}
  FOR INSERT WITH CHECK (true);

-- 2. Kebijakan Membaca Log (Hanya Sekolah Terkait atau Super Admin)
CREATE POLICY audit_select_policy ON ${tableName}
  FOR SELECT
  USING (
    sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
    OR current_setting('app.current_role', true) = 'super_admin'
  );`
    }
  }

  // Tenant-Isolated tables by default
  return {
    category: "Tenant-Isolated",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-100",
    description: "Tabel terisolasi sekolah. Akses membaca dan menulis dibatasi ketat hanya untuk tenant sekolah pemilik data (berdasarkan sekolah_id) atau akun super_admin.",
    sqlPolicy: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Data (Hanya Sekolah Terkait atau Super Admin)
CREATE POLICY sekolah_isolation_policy ON ${tableName}
  AS RESTRICTIVE
  USING (
    sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
    OR current_setting('app.current_role', true) = 'super_admin'
  )
  WITH CHECK (
    sekolah_id = NULLIF(current_setting('app.current_sekolah_id', true), '')
    OR current_setting('app.current_role', true) = 'super_admin'
  );`
  }
}

export default function DatabaseSchemaPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTableKey, setSelectedTableKey] = useState<string | null>(null)

  // Fetch the schema dynamically from the codebase
  const { data: schema = [], isLoading, refetch, isRefetching } = api.superAdmin.getDatabaseSchema.useQuery()

  // Auto-select the first table when schema data is loaded
  useEffect(() => {
    if (schema && schema.length > 0 && !selectedTableKey) {
      const defaultTable = schema.find(t => t.tableName === "sekolah") || schema[0]
      setSelectedTableKey(defaultTable.keyName)
    }
  }, [schema, selectedTableKey])

  // Manual Fetch handler
  const handleManualFetch = async () => {
    try {
      await refetch()
      toast.success("Berhasil mensinkronisasi skema database terbaru dari codebase!")
    } catch {
      toast.error("Gagal melakukan sinkronisasi skema.")
    }
  }

  // Filter tables list based on search query
  const filteredTables = schema.filter(t => 
    t.tableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.keyName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get selected table details
  const selectedTable = schema.find(t => t.keyName === selectedTableKey)

  // Get RLS policy metadata
  const rlsInfo = selectedTable ? getRLSInfo(selectedTable.tableName) : null

  // Find parents (tables that selectedTable references)
  const parents = selectedTable
    ? selectedTable.foreignKeys.map(fk => {
        const parentTable = schema.find(t => t.tableName === fk.foreignTable)
        return {
          fk,
          table: parentTable || { tableName: fk.foreignTable, keyName: fk.foreignTable, columns: [] }
        }
      })
    : []

  // Find children (tables that reference selectedTable)
  const children = selectedTable
    ? schema.flatMap(t => 
        t.foreignKeys
          .filter(fk => fk.foreignTable === selectedTable.tableName)
          .map(fk => ({
            fk,
            table: t
          }))
      )
    : []

  return (
    <div className="space-y-6 text-left">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-teal-655 bg-teal-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles size={12} />
            <span>Codebase Schema Inspector</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase flex items-center gap-2">
            <Database size={24} className="text-teal-650" />
            <span>Skema Database Interaktif</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Visualisasi hubungan antar-tabel (Entity-Relationship Diagram) secara live langsung dari definisi Drizzle ORM di codebase.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleManualFetch}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition-all duration-300 transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            <span>{isRefetching ? "Syncing..." : "Sync Skema Codebase"}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-xs font-bold text-slate-455 flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-teal-600" />
          <span>Memproses data skema dari file Drizzle...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Stats Summary Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Tabel Database</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{schema.length}</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Tabel terdaftar di Drizzle</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-650 flex items-center justify-center">
                  <Layers size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Kolom Schema</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">
                    {schema.reduce((acc, curr) => acc + curr.columns.length, 0)}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Rata-rata {(schema.length > 0 ? (schema.reduce((acc, curr) => acc + curr.columns.length, 0) / schema.length).toFixed(1) : "0")} kolom/tabel
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-650 flex items-center justify-center">
                  <Hash size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Relasi Foreign Key</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">
                    {schema.reduce((acc, curr) => acc + curr.foreignKeys.length, 0)}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Jejaring relasi antar-tabel</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-650 flex items-center justify-center">
                  <GitFork size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Kategori RLS Terpetakan</p>
                  <h3 className="text-3xl font-black text-emerald-600 mt-2">3 Kategori</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Tenant, Global, & Logs</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle size={24} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Panel: List of Tables ── */}
          <div className="lg:col-span-4 neumo-card bg-background p-4 rounded-3xl space-y-4 max-h-[75vh] flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama tabel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[55vh]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">
                Daftar Tabel ({filteredTables.length})
              </p>
              {filteredTables.map((t) => {
                const isSelected = t.keyName === selectedTableKey
                return (
                  <button
                    key={t.keyName}
                    type="button"
                    onClick={() => setSelectedTableKey(t.keyName)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-teal-50 border border-teal-100 text-teal-700 font-black shadow-sm"
                        : "bg-slate-50/20 hover:bg-slate-50/70 border border-transparent text-slate-650"
                    }`}
                  >
                    <span className="font-mono">{t.tableName}</span>
                    <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                      {t.columns.length} col
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Right Panel: Selected Table Focused ERD ── */}
          <div className="lg:col-span-8 space-y-6">
            {selectedTable ? (
              <div className="space-y-6">
                {/* Visual Canvas Area */}
                <div className="neumo-card bg-background p-6 rounded-3xl min-h-[400px] flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-teal-50 rounded-full blur-3xl opacity-40 pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-40 pointer-events-none" />

                  <div className="text-center mb-6 z-10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Focused Relations View</p>
                    <h3 className="text-lg font-black text-slate-800 tracking-tight uppercase mt-0.5">
                      Relasi Tabel: <span className="font-mono text-teal-650">{selectedTable.tableName}</span>
                    </h3>
                  </div>

                  {/* Nodes Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center z-10 relative">
                    {/* Parents Column (Refers to) */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Referenced Tables (Parents)</p>
                      {parents.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold">
                          Tidak mereferensikan tabel lain
                        </div>
                      ) : (
                        parents.map((p, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedTableKey(p.table.keyName)}
                            className="bg-slate-50/50 hover:bg-slate-100/70 border border-slate-200/50 p-3 rounded-2xl text-xs space-y-1.5 cursor-pointer transition-all shadow-sm group hover:-translate-x-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-slate-700">{p.table.tableName}</span>
                              <ArrowRight size={12} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold">
                              FK: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100">{p.fk.columns.join(", ")}</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Selected Table Node (Center) */}
                    <div className="neumo-card bg-white border border-teal-500/20 p-5 rounded-3xl shadow-lg ring-4 ring-teal-500/5 scale-105">
                      <div className="flex items-center gap-1.5 text-teal-650 bg-teal-50 px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider w-fit mb-2">
                        <Layers size={10} />
                        <span>Selected Table</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-800 font-mono tracking-tight">{selectedTable.tableName}</h4>
                      <p className="text-[9px] text-slate-400 font-bold mt-1">Export: {selectedTable.keyName}</p>

                      <div className="border-t border-slate-100 my-3 pt-2 text-xs space-y-1 max-h-[220px] overflow-y-auto pr-1">
                        {selectedTable.columns.map((c) => (
                          <div key={c.name} className="flex items-center justify-between py-1 border-b border-slate-50/50 last:border-0">
                            <span className="font-mono text-slate-700 flex items-center gap-1 font-bold">
                              {c.primaryKey && <Key size={10} className="text-amber-500 flex-shrink-0" />}
                              <span>{c.name}</span>
                            </span>
                            <span className="font-mono text-[9px] text-slate-450 uppercase">{c.columnType}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Children Column (Referred by) */}
                    <div className="space-y-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Referencing Tables (Children)</p>
                      {children.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-slate-200 rounded-2xl text-[10px] text-slate-400 font-bold">
                          Tidak direferensikan tabel lain
                        </div>
                      ) : (
                        children.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedTableKey(c.table.keyName)}
                            className="bg-slate-50/50 hover:bg-slate-100/70 border border-slate-200/50 p-3 rounded-2xl text-xs space-y-1.5 cursor-pointer transition-all shadow-sm group hover:translate-x-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-black text-slate-700">{c.table.tableName}</span>
                              <ArrowRight size={12} className="text-slate-400 group-hover:text-teal-600 transition-colors" />
                            </div>
                            <p className="text-[9px] text-slate-450 font-bold">
                              By: <span className="font-mono bg-white px-1 py-0.5 rounded border border-slate-100">{c.fk.columns.join(", ")}</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* RLS Policies Reference */}
                {rlsInfo && (
                  <div className="neumo-card bg-background p-6 rounded-3xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                          Acuan Row Level Security (RLS) Supabase
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                          Kebijakan keamanan database PostgreSQL tingkat baris data untuk isolasi multi-tenant.
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border w-fit ${rlsInfo.badgeColor}`}>
                        {rlsInfo.category}
                      </span>
                    </div>

                    <div className="space-y-3 text-left">
                      <p className="text-xs text-slate-600 font-bold">
                        {rlsInfo.description}
                      </p>

                      <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto text-[11px] font-mono text-emerald-400 shadow-inner relative">
                        <div className="absolute top-3 right-3 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          SQL Policy Template
                        </div>
                        <pre className="whitespace-pre">{rlsInfo.sqlPolicy}</pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Inspector Detailed Columns List */}
                <div className="neumo-card bg-background p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                        Skema Kolom & Metadata
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        Menampilkan {selectedTable.columns.length} kolom dari tabel <span className="font-mono text-teal-650">{selectedTable.tableName}</span>
                      </p>
                    </div>
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-2.5 py-1 rounded-full font-black uppercase">
                      Drizzle: {selectedTable.keyName}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="py-2.5 px-3">Kolom Database</th>
                          <th className="py-2.5 px-3">Key Name</th>
                          <th className="py-2.5 px-3">Tipe Data</th>
                          <th className="py-2.5 px-3">Tipe Drizzle</th>
                          <th className="py-2.5 px-3 text-center">Nullable</th>
                          <th className="py-2.5 px-3 text-center">PK</th>
                          <th className="py-2.5 px-3 text-center">Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedTable.columns.map((c) => (
                          <tr key={c.name} className="border-b border-slate-100/50 text-xs text-slate-650">
                            <td className="py-2 px-3 font-mono font-black text-slate-800">{c.name}</td>
                            <td className="py-2 px-3 font-mono">{c.keyName}</td>
                            <td className="py-2 px-3">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-650 font-bold uppercase">
                                {c.dataType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500 text-[10px]">{c.columnType}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                c.notNull ? "bg-slate-100 text-slate-500" : "bg-teal-50 text-teal-650"
                              }`}>
                                {c.notNull ? "No" : "Yes"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {c.primaryKey ? (
                                <Key size={12} className="text-amber-500 mx-auto" />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                c.hasDefault ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-slate-300"
                              }`}>
                                {c.hasDefault ? "Default" : "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="neumo-card bg-background p-12 text-center text-xs font-bold text-slate-400">
                Pilih tabel dari daftar di sebelah kiri untuk melihat skema diagram.
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  )
}
