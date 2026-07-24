const fs = require('fs');
let code = fs.readFileSync('src/components/TeacherModal.tsx', 'utf8');

// 1. Add SearchableSelect import
if (!code.includes('SearchableSelect')) {
  code = code.replace("import { X, Eye, EyeOff } from 'lucide-react';", "import { X, Eye, EyeOff } from 'lucide-react';\nimport { SearchableSelect } from './SearchableSelect';");
}

// 2. Jenis Kelamin - replace select with radio
const jkSelectRegex = /<label className="block text-\[13px\] text-slate-600 mb-1\.5 font-medium">Jenis Kelamin <span className="text-rose-500">\*<\/span><\/label>\s*<select[\s\S]*?<\/select>/;
const jkRadio = `<label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Jenis Kelamin <span className="text-rose-500">*</span></label>
                  <div className="flex items-center space-x-6 py-2.5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Laki-laki'}
                        onChange={() => handleChange('jk', 'Laki-laki')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Laki-laki</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jk"
                        checked={formData.jk === 'Perempuan'}
                        onChange={() => handleChange('jk', 'Perempuan')}
                        className="w-4 h-4 text-[#10b981] border-slate-300 focus:ring-[#10b981]"
                      />
                      <span className="text-[13px] text-slate-600">Perempuan</span>
                    </label>
                  </div>`;
code = code.replace(jkSelectRegex, jkRadio);

// 3. NIP/NUPTK placeholder
code = code.replace('placeholder="Bisa diisi jika belum"', 'placeholder="Kosongkan jika belum memiliki"');

// 4. Tugas Utama Guru & Tendik
// Also replace <select> with SearchableSelect
const tugasUtamaSelect = /<select\s+value=\{formData\.tugasUtama\}[\s\S]*?<\/select>/;

const tugasUtamaSearchable = `{formData.kategori === 'Guru' ? (
                    <SearchableSelect
                      showSearch={false}
                      value={formData.tugasUtama}
                      onChange={(val) => handleChange('tugasUtama', val)}
                      options={['Guru Kelas', 'Guru Mata Pelajaran', 'Guru BK', 'Kepala Sekolah', 'Kepala Madrasah']}
                      placeholder="Pilih tugas utama"
                    />
                  ) : (
                    <SearchableSelect
                      showSearch={false}
                      value={formData.tugasUtama}
                      onChange={(val) => handleChange('tugasUtama', val)}
                      options={['Tata Usaha', 'Pustakawan', 'Laboran', 'Penjaga Sekolah', 'Petugas Kebersihan', 'Operator']}
                      placeholder="Pilih tugas utama"
                    />
                  )}`;
code = code.replace(tugasUtamaSelect, tugasUtamaSearchable);

// 5. Status Kepegawaian
const statusPegawaiSelect = /<select\s+value=\{formData\.statusPegawai\}[\s\S]*?<\/select>/;
const statusPegawaiSearchable = `<SearchableSelect
                    showSearch={false}
                    value={formData.statusPegawai}
                    onChange={(val) => handleChange('statusPegawai', val)}
                    options={['PNS', 'GTY', 'GTT', 'Honor', 'Lainnya']}
                    placeholder="Pilih"
                  />`;
code = code.replace(statusPegawaiSelect, statusPegawaiSearchable);

// 6. Pendidikan Terakhir - change input to SearchableSelect
const pendidikanInput = /<label className="block text-\[13px\] text-slate-600 mb-1\.5 font-medium">Pendidikan Terakhir<\/label>\s*<input\s+type="text"\s+value=\{formData\.pendidikanTerakhir\}\s+onChange=\{\(e\) => handleChange\('pendidikanTerakhir', e\.target\.value\)\}\s+placeholder=""\s+className="w-full px-4 py-2\.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-\[\#10b981\] focus:ring-1 focus:ring-\[\#10b981\] text-\[16px\] md:text-\[13px\] text-slate-700 transition-colors"\s+\/>/;
const pendidikanSearchable = `<label className="block text-[13px] text-slate-600 mb-1.5 font-medium">Pendidikan Terakhir</label>
                  <SearchableSelect
                    showSearch={false}
                    value={formData.pendidikanTerakhir}
                    onChange={(val) => handleChange('pendidikanTerakhir', val)}
                    options={['SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'D4', 'S1', 'S2', 'S3']}
                    placeholder="Pilih Pendidikan"
                  />`;
code = code.replace(pendidikanInput, pendidikanSearchable);

// 7. JP - Make it readonly and updated placeholder
const jpInput = /<label className="block text-\[13px\] text-slate-600 mb-1\.5 font-medium">JP \(Jam Pelajaran\)<\/label>\s*<input\s+type="number"\s+value=\{formData\.jamPelajaran \|\| ''\}\s+onChange=\{\(e\) => handleChange\('jamPelajaran', parseInt\(e\.target\.value\) \|\| 0\)\}\s+placeholder="0"\s+min="0"\s+className="w-full px-4 py-2\.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-\[\#10b981\] focus:ring-1 focus:ring-\[\#10b981\] text-\[16px\] md:text-\[13px\] text-slate-700 transition-colors"\s+\/>/;
const jpReadOnly = `<label className="block text-[13px] text-slate-600 mb-1.5 font-medium">JP (Jam Pelajaran)</label>
                  <input
                    type="number"
                    value={formData.jamPelajaran || ''}
                    readOnly
                    placeholder="Terisi otomatis dari jadwal"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-100 text-[16px] md:text-[13px] text-slate-500 cursor-not-allowed"
                  />`;
code = code.replace(jpInput, jpReadOnly);

fs.writeFileSync('src/components/TeacherModal.tsx', code);
console.log("Teacher modal updated");
