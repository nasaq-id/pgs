Judul Tugas/Task: Pembuatan Fitur Jurnal Mengajar (Menu LMS) & Integrasi Presensi
A. Integrasi Jadwal & Logika Aplikasi Guru
Auto-Generate List Jurnal: Pada akun/aplikasi masing-masing guru, sistem harus secara otomatis memunculkan daftar Jurnal Mengajar yang harus diisi setiap harinya.
Integrasi Jadwal: List jurnal ini harus terintegrasi langsung dengan data Jadwal Pelajaran. (Contoh: Jika Guru A jadwalnya mengajar Bahasa Inggris pada hari Senin jam ke-1 sampai ke-2 di kelas 7A, maka pada hari Senin tersebut form jurnal khusus untuk kelas dan jam tersebut akan otomatis muncul di dashboard Guru A).
B. Form Isian Jurnal Mengajar
Ketika guru mengklik/mengisi jurnal tersebut, sediakan form field dengan ketentuan validasi berikut:
Tujuan Pembelajaran: (Wajib / Required)
Materi / Konten: (Wajib / Required)
Kegiatan Pembelajaran: (Opsional)
Catatan: (Opsional)
C. Sistem Daftar Hadir Siswa (Di dalam form Jurnal)
Integrasikan form presensi siswa ke dalam form Jurnal Mengajar dengan logika UI berikut:
Fitur Cepat "Hadir Semua": Sediakan tombol atau checkbox "Hadir Semua". Jika ini dicentang, sistem otomatis menandai seluruh siswa di kelas tersebut hadir, sehingga guru tidak perlu mengeklik satu per satu.
Opsi Ketidakhadiran: Jika ada siswa yang absen (tidak mencentang "Hadir Semua"), sediakan opsi status kehadiran per siswa berupa I (Izin), S (Sakit), dan A (Alpa).
D. Hak Akses & Fitur Admin
Monitoring Terpusat: Pada dashboard akun Admin, buatkan antarmuka untuk memonitoring seluruh Jurnal Mengajar dari semua guru (melihat rekap siapa yang sudah mengisi dan yang belum/kosong).
Fungsi Intervensi/Bypass: Admin harus memiliki hak akses untuk membantu mengisikan/mengedit form Jurnal Mengajar dan Presensi mewakili guru tertentu, untuk mengantisipasi kendala teknis di lapangan.
E. Standar UI/UX & Keamanan Modul
Pastikan form pengisian Jurnal Mengajar dan Presensi ini tampilannya rapi dan enak digunakan di HP (Mobile-friendly), mengingat fitur ini akan sering diakses guru melalui smartphone di dalam kelas.
Tombol-tombol aksi tetap mengikuti template dan skema warna aplikasi yang sedang berjalan (jangan gunakan tombol warna putih).
Pastikan penambahan fitur di menu LMS ini tidak merusak fungsi yang ada di menu lain (seperti menu Lembaga atau tampilan Header).
