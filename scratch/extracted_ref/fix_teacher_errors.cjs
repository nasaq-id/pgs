const fs = require('fs');
let code = fs.readFileSync('src/components/TeacherModal.tsx', 'utf8');

code = code.replace(
  'options={[\'PNS\', \'GTY\', \'GTT\', \'Honor\', \'Lainnya\']}\n                    placeholder="Pilih"\n                  />',
  'options={[\'PNS\', \'GTY\', \'GTT\', \'Honor\', \'Lainnya\']}\n                    placeholder="Pilih"\n                    error={!!errors.statusPegawai}\n                  />'
);

code = code.replace(
  'options={[\'Guru Kelas\', \'Guru Mata Pelajaran\', \'Guru BK\', \'Kepala Sekolah\', \'Kepala Madrasah\']}\n                      placeholder="Pilih tugas utama"\n                    />',
  'options={[\'Guru Kelas\', \'Guru Mata Pelajaran\', \'Guru BK\', \'Kepala Sekolah\', \'Kepala Madrasah\']}\n                      placeholder="Pilih tugas utama"\n                      error={!!errors.tugasUtama}\n                    />'
);

code = code.replace(
  'options={[\'Tata Usaha\', \'Pustakawan\', \'Laboran\', \'Penjaga Sekolah\', \'Petugas Kebersihan\', \'Operator\']}\n                      placeholder="Pilih tugas utama"\n                    />',
  'options={[\'Tata Usaha\', \'Pustakawan\', \'Laboran\', \'Penjaga Sekolah\', \'Petugas Kebersihan\', \'Operator\']}\n                      placeholder="Pilih tugas utama"\n                      error={!!errors.tugasUtama}\n                    />'
);

code = code.replace(
  'options={[\'SD\', \'SMP\', \'SMA\', \'D1\', \'D2\', \'D3\', \'D4\', \'S1\', \'S2\', \'S3\']}\n                    placeholder="Pilih Pendidikan"\n                  />',
  'options={[\'SD\', \'SMP\', \'SMA\', \'D1\', \'D2\', \'D3\', \'D4\', \'S1\', \'S2\', \'S3\']}\n                    placeholder="Pilih Pendidikan"\n                    error={!!errors.pendidikanTerakhir}\n                  />'
);

fs.writeFileSync('src/components/TeacherModal.tsx', code);
console.log("Added error props to TeacherModal");
