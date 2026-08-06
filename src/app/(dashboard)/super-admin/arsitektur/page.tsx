"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/trpc/client"
import {
  Folder, FileCode, ChevronRight, ChevronDown, RefreshCw, Layers,
  CheckCircle, ShieldAlert, AlertTriangle, Search, Info, HelpCircle, HardDrive
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

interface TreeNodeProps {
  node: any
  selectedPath: string | null
  onSelect: (path: string) => void
  expandedPaths: Set<string>
  onToggle: (path: string) => void
}

// Recursive Tree Node Component
function TreeNode({ node, selectedPath, onSelect, expandedPaths, onToggle }: TreeNodeProps) {
  const isDir = node.type === "dir"
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path

  if (isDir) {
    return (
      <div className="space-y-0.5">
        <div
          id={`tree-node-${node.path.replace(/\//g, "-")}`}
          onClick={() => onToggle(node.path)}
          className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl hover:bg-slate-100/70 text-slate-700 font-bold text-xs cursor-pointer transition-all select-none"
        >
          <span className="text-slate-400">
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </span>
          <Folder size={14} className="text-indigo-500 fill-indigo-50" />
          <span className="font-mono text-slate-800">{node.name}</span>
        </div>

        {isExpanded && node.children && (
          <div className="pl-4 border-l border-slate-200/60 ml-4 space-y-0.5 py-0.5">
            {node.children.map((child: any, idx: number) => (
              <TreeNode
                key={idx}
                node={child}
                selectedPath={selectedPath}
                onSelect={onSelect}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // File Node
  const healthColors = {
    critical: "bg-red-500 shadow-sm shadow-red-200",
    warning: "bg-amber-500 shadow-sm shadow-amber-200",
    healthy: "bg-emerald-500 shadow-sm shadow-emerald-200"
  }

  return (
    <div
      id={`tree-node-${node.path.replace(/\//g, "-")}`}
      onClick={() => onSelect(node.path)}
      className={`flex items-center justify-between py-1.5 px-2.5 border rounded-xl cursor-pointer transition-all select-none ${
        isSelected
          ? "bg-teal-50 border-teal-200 text-teal-950 font-bold scale-[1.01] shadow-sm"
          : "hover:bg-slate-50 border-transparent text-slate-650 text-xs"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FileCode size={14} className={isSelected ? "text-teal-600" : "text-slate-400"} />
        <span className="font-mono text-[11px] truncate">{node.name}</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-slate-400 font-bold font-mono">{node.lines} LOC</span>
        <span className={`w-2 h-2 rounded-full ${healthColors[node.health as keyof typeof healthColors]}`} />
      </div>
    </div>
  )
}

function getParentPaths(filePath: string): string[] {
  const parts = filePath.split("/")
  const parents: string[] = []
  let current = ""
  for (let i = 0; i < parts.length - 1; i++) {
    current = current ? `${current}/${parts[i]}` : parts[i]
    parents.push(current)
  }
  return parents
}

export default function CodebaseHealthPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(["app", "components", "server"]))
  const [healthFilter, setHealthFilter] = useState<string>("all")

  // Fetch the codebase audit data
  const { data: codebase = { files: [], tree: null }, isLoading, refetch, isRefetching } = api.superAdmin.getCodebaseHealth.useQuery()

  const [isModalOpen, setIsModalOpen] = useState(false)

  // Fetch codebase file content only when modal is open
  const { data: fileContentData, isLoading: isContentLoading } = api.superAdmin.getFileContent.useQuery(
    { path: selectedFilePath || "" },
    { enabled: !!selectedFilePath && isModalOpen }
  )

  // Auto-select first file or critical file when data is loaded
  useEffect(() => {
    if (codebase.files && codebase.files.length > 0 && !selectedFilePath) {
      // Prefer selecting a critical or warning file first to show refactoring advice
      const defaultFile = codebase.files.find((f: any) => f.health === "critical") ||
                          codebase.files.find((f: any) => f.health === "warning") ||
                          codebase.files[0]
      setSelectedFilePath(defaultFile.path)
    }
  }, [codebase.files, selectedFilePath])

  // Auto-expand parent folders in tree and scroll into view when selectedFilePath changes
  useEffect(() => {
    if (selectedFilePath) {
      const parentPaths = getParentPaths(selectedFilePath)
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        parentPaths.forEach((path) => next.add(path))
        return next
      })

      // Smooth scroll the selected node in the tree into view
      setTimeout(() => {
        const elementId = `tree-node-${selectedFilePath.replace(/\//g, "-")}`
        const element = document.getElementById(elementId)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" })
        }
      }, 150)
    }
  }, [selectedFilePath])

  // Helper toggle folder collapse
  const handleToggleFolder = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  // Filter files list based on search and health status filter
  const filteredFiles = codebase.files.filter((f: any) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.path.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = healthFilter === "all" || f.health === healthFilter
    return matchesSearch && matchesFilter
  })

  // Get selected file details
  const selectedFile = codebase.files.find((f: any) => f.path === selectedFilePath)

  // Compute Codebase metrics
  const totalFiles = codebase.files.length
  const totalLoc = codebase.files.reduce((acc: number, curr: any) => acc + curr.lines, 0)
  const criticalFiles = codebase.files.filter((f: any) => f.health === "critical").length
  const warningFiles = codebase.files.filter((f: any) => f.health === "warning").length
  const healthyFiles = codebase.files.filter((f: any) => f.health === "healthy").length
  const totalSizeBytes = codebase.files.reduce((acc: number, curr: any) => acc + curr.size, 0)
  const sizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(2)

  // Refresh data
  const handleSyncHealth = async () => {
    try {
      await refetch()
      toast.success("Berhasil melakukan re-audit struktur file codebase!")
    } catch (e) {
      toast.error("Gagal menganalisis codebase.")
    }
  }

  return (
    <div className="space-y-6 text-left">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-indigo-655 bg-indigo-50 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Info size={12} />
            <span>Architecture & Code Health</span>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none uppercase flex items-center gap-2">
            <Layers size={24} className="text-indigo-650" />
            <span>Kesehatan & Struktur Codebase</span>
          </h1>
          <p className="text-xs text-slate-400 font-bold mt-1">
            Analisis garis kode (LOC), ukuran file, kategorisasi kesehatan berkas, serta solusi rekomendasi refaktorisasi.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleSyncHealth}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider shadow-md cursor-pointer transition-all duration-300 transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefetching ? "animate-spin" : ""} />
            <span>{isRefetching ? "Re-Auditing..." : "Audit Ulang Codebase"}</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-xs font-bold text-slate-455 flex flex-col items-center gap-3">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>Menganalisis dan mengalkulasi garis kode di folder src/...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Stats Summary Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Berkas (Files)</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{totalFiles}</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Berkas terdaftar di folder src/</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-655 flex items-center justify-center">
                  <FileCode size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Total Garis Kode (LOC)</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{totalLoc.toLocaleString()}</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Garis baris kode dianalisis</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-655 flex items-center justify-center">
                  <Layers size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">File Kritis & Warning</p>
                  <h3 className={`text-3xl font-black mt-2 ${criticalFiles > 0 ? "text-red-655" : warningFiles > 0 ? "text-amber-500" : "text-slate-800"}`}>
                    {criticalFiles} / {warningFiles}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    {healthyFiles} berkas sehat ({((healthyFiles / totalFiles) * 100).toFixed(0)}%)
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${criticalFiles > 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-500"}`}>
                  <ShieldAlert size={24} />
                </div>
              </div>
            </div>

            <div className="neumo-card bg-background p-6 rounded-3xl relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-455 font-black uppercase tracking-wider">Volume Disk Codebase</p>
                  <h3 className="text-3xl font-black text-slate-800 mt-2">{sizeMb} MB</h3>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">Ukuran folder src/ di disk</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-655 flex items-center justify-center">
                  <HardDrive size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* ── Left Column: Interactive File Tree ── */}
            <div className="lg:col-span-5 neumo-card bg-background p-4 rounded-3xl flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Struktur Folder & Berkas</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Struktur folder real project lengkap</p>
                </div>
                <span className="text-[9px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded font-black uppercase">
                  Interactive Tree
                </span>
              </div>

              {/* Tree View Canvas */}
              <div className="overflow-y-auto pr-1 flex-1 space-y-1 max-h-[60vh]">
                {codebase.tree ? (
                  <TreeNode
                    node={codebase.tree}
                    selectedPath={selectedFilePath}
                    onSelect={setSelectedFilePath}
                    expandedPaths={expandedPaths}
                    onToggle={handleToggleFolder}
                  />
                ) : (
                  <div className="text-center text-xs py-8 text-slate-400 font-bold">Struktur tidak tersedia.</div>
                )}
              </div>
            </div>

            {/* ── Right Column: Codebase Health Rank & Details ── */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Selected File Health Inspector & Refactoring Advisor */}
              {selectedFile ? (
                <div className="neumo-card bg-background p-6 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      <h4 className="text-xs text-slate-400 font-black tracking-widest uppercase">File Inspector & Refactoring Advice</h4>
                      <h2 className="text-sm font-mono font-black text-slate-800 truncate mt-1">{selectedFile.name}</h2>
                      <p className="text-[9px] text-slate-450 font-mono mt-0.5">{selectedFile.path}</p>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border w-fit flex items-center gap-1.5 ${
                      selectedFile.health === "critical" ? "bg-red-50 text-red-700 border-red-100" :
                      selectedFile.health === "warning" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-emerald-50 text-emerald-700 border-emerald-100"
                    }`}>
                      {selectedFile.health === "critical" ? <ShieldAlert size={10} /> :
                       selectedFile.health === "warning" ? <AlertTriangle size={10} /> :
                       <CheckCircle size={10} />}
                      <span>{selectedFile.health.toUpperCase()}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50/50 border border-slate-150/70 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Garis Kode (LOC)</span>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{selectedFile.lines}</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Baris file kode</p>
                    </div>

                    <div className="bg-slate-50/50 border border-slate-150/70 p-3.5 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Ukuran File</span>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB</h4>
                      <p className="text-[9px] text-slate-400 font-bold">Ukuran di disk</p>
                    </div>
                  </div>

                  {/* View source code button */}
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200 transform active:scale-95 shadow-sm animate-in fade-in duration-200"
                  >
                    <FileCode size={14} />
                    <span>Lihat Kode Sumber ({selectedFile.name})</span>
                  </button>

                  {/* Refactoring Advice Alert Panel */}
                  <div className={`p-4 rounded-2xl border flex gap-3 ${
                    selectedFile.health === "critical" ? "bg-red-50/50 border-red-100 text-red-950" :
                    selectedFile.health === "warning" ? "bg-amber-50/50 border-amber-100 text-amber-950" :
                    "bg-emerald-50/50 border-emerald-100 text-emerald-950"
                  }`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {selectedFile.health === "critical" ? <ShieldAlert className="text-red-655" size={16} /> :
                       selectedFile.health === "warning" ? <AlertTriangle className="text-amber-600" size={16} /> :
                       <CheckCircle className="text-emerald-600" size={16} />}
                    </div>
                    <div className="text-xs space-y-1">
                      <h5 className="font-black">
                        {selectedFile.health === "critical" ? "Rekomendasi Refactoring Segera (Tinggi)" :
                         selectedFile.health === "warning" ? "Saran Pemisahan Modul (Menengah)" :
                         "Status File Sangat Sehat (Optimal)"}
                      </h5>
                      <p className="text-slate-655 leading-relaxed font-medium">
                        {selectedFile.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="neumo-card bg-background p-8 text-center text-xs font-bold text-slate-400">
                  Pilih file dari bagan direktori sebelah kiri untuk melihat saran refaktor.
                </div>
              )}

              {/* Card 2: Codebase Health Table List */}
              <div className="neumo-card bg-background p-6 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase">Daftar Audit Kesehatan Berkas</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Mengurutkan seluruh file dari LOC tertinggi</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-center">
                    {["all", "critical", "warning", "healthy"].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setHealthFilter(filter)}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          healthFilter === filter
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-450 hover:text-slate-650"
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter / Search File */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Saring nama file di codebase..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>

                <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-2.5 px-3">Nama Berkas</th>
                        <th className="py-2.5 px-3">Folder/Jalur</th>
                        <th className="py-2.5 px-3 text-right">LOC</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFiles.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-slate-400 font-bold">
                            Tidak ada berkas yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredFiles.map((file: any) => (
                          <tr
                            key={file.path}
                            onClick={() => setSelectedFilePath(file.path)}
                            className={`border-b border-slate-100/50 text-xs cursor-pointer hover:bg-slate-50/50 ${
                              selectedFilePath === file.path ? "bg-slate-50" : ""
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono font-black text-slate-800">{file.name}</td>
                            <td className="py-2.5 px-3 text-slate-450 font-mono text-[10px] truncate max-w-[200px]">{file.path}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{file.lines}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`w-2 h-2 rounded-full inline-block ${
                                file.health === "critical" ? "bg-red-500" :
                                file.health === "warning" ? "bg-amber-500" :
                                "bg-emerald-500"
                              }`} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Read-only Source Code Modal ── */}
      {isModalOpen && selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-background w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-100 overflow-hidden text-left animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight uppercase flex items-center gap-2">
                  <FileCode size={18} className="text-indigo-600" />
                  <span>Kode Sumber: {selectedFile.name}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  {selectedFile.path} • {selectedFile.lines} baris kode • Read-Only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 font-black text-xs uppercase tracking-wider p-2 rounded-xl hover:bg-slate-100/50 cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1 overflow-auto bg-slate-950">
              {isContentLoading ? (
                <div className="py-24 text-center text-xs font-bold text-slate-500 flex flex-col items-center gap-3 justify-center">
                  <RefreshCw size={24} className="animate-spin text-indigo-500" />
                  <span>Membaca isi berkas codebase...</span>
                </div>
              ) : fileContentData?.content ? (
                <div className="flex font-mono text-[11px] text-slate-300 leading-[18px]">
                  {/* Line Numbers column */}
                  <div className="text-slate-600 select-none text-right pr-4 border-r border-slate-800 flex-shrink-0">
                    {fileContentData.content.split("\n").map((_, i) => (
                      <div key={i} className="h-[18px]">{i + 1}</div>
                    ))}
                  </div>
                  {/* Code column */}
                  <pre className="pl-4 whitespace-pre overflow-x-auto flex-1 text-emerald-400 select-all selection:bg-slate-800 selection:text-white">
                    {fileContentData.content.split("\n").map((line, i) => (
                      <div key={i} className="h-[18px] hover:bg-slate-900/40 px-1 rounded transition-colors">
                        {line || " "}
                      </div>
                    ))}
                  </pre>
                </div>
              ) : (
                <div className="py-24 text-center text-xs font-bold text-slate-500">
                  Gagal membaca atau berkas kosong.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider cursor-pointer transition-all duration-200"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
