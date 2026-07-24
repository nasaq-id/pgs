"use client"

import { Shield, BookOpen, AlertCircle, CheckCircle, Users, Scale, MessageSquare, Clock } from "lucide-react"

export default function SopEpoinPage() {
  return (
    <div className="space-y-6 text-left max-w-4xl">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-650 flex items-center justify-center">
            <BookOpen size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">SOP E-Poin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Standard Operating Procedure Pencatatan Poin & Alur Tindak Lanjut
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid SOP Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Maksud & Tujuan */}
        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <Scale size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Maksud & Tujuan</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            Sistem E-Poin dirancang bukan hanya sebagai instrumen hukuman, melainkan sebagai media pembentukan karakter, kejujuran, disiplin, dan wadah apresiasi atas prestasi yang dicapai oleh siswa.
          </p>
          <ul className="text-[11px] text-slate-500 space-y-2 pt-1 font-semibold list-disc list-inside">
            <li>Menciptakan iklim belajar yang aman dan suportif.</li>
            <li>Memberikan penghargaan (rewards) transparan bagi siswa teladan.</li>
            <li>Menyediakan data rekam medis perilaku yang valid bagi BK dan orang tua.</li>
          </ul>
        </div>

        {/* 2. Alur Pencatatan Poin */}
        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <Clock size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Alur Pencatatan & Input</h3>
          </div>
          <div className="space-y-3 text-[11px] text-slate-500 font-semibold">
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">1</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Temuan Kejadian:</strong>
                Guru/petugas menemukan pelanggaran atau prestasi sikap siswa di sekolah.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">2</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Input ke Sistem:</strong>
                Guru login ke portal, memilih siswa terkait, jenis kategori, mengunggah bukti foto (opsional), dan menyimpan data poin.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 font-black flex items-center justify-center flex-shrink-0">3</span>
              <p className="leading-relaxed">
                <strong className="text-slate-700 block">Notifikasi Orang Tua:</strong>
                Sistem otomatis memicu pemberitahuan dan meneruskan rekap data ke dasbor orang tua.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Hak Jawab & Klarifikasi Siswa */}
        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <MessageSquare size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Hak Jawab & Klarifikasi</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-bold">
            Setiap siswa yang dikenai poin negatif berhak memberikan klarifikasi guna menghindari kesalahpahaman data.
          </p>
          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 text-[11px] text-amber-800 leading-normal font-semibold">
            <span className="font-black uppercase tracking-wider block mb-1">⏳ Batas Waktu Klarifikasi:</span>
            Maksimal <strong>3 x 24 Jam</strong> sejak poin terdaftar. Siswa didampingi wali kelas dapat mengajukan hak jawab langsung ke ruang BK.
          </div>
        </div>

        {/* 4. Ketentuan Ambang Batas Disiplin */}
        <div className="neumo-card bg-background p-6 rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-teal-655 pb-2 border-b border-slate-100/50">
            <AlertCircle size={16} className="stroke-[2.5]" />
            <h3 className="text-xs font-black uppercase tracking-wider">Batas Akumulasi & Sanksi</h3>
          </div>
          <div className="space-y-3 text-[11px] text-slate-500 font-semibold">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span>Poin Negatif 10 - 20</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-black uppercase">Teguran & Pembinaan BK</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span>Poin Negatif 21 - 30</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">Penerbitan SP 1</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span>Poin Negatif 31 - 40</span>
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase">Penerbitan SP 2 & Perjanjian</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Poin Negatif &gt; 40</span>
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase">Penerbitan SP 3 & Skorsing</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
