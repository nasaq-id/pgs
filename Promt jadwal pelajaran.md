  
**Judul Tugas/Task:** Pembaruan Sistem & Logika Fitur Jadwal Pelajaran  
**A. Penyesuaian UI & Tombol (Pada Sub-Menu yang Sudah Ada)**

* Pada sub-menu Mata Pelajaran dan Jadwal Pelajaran yang sudah ada, pastikan sistemnya terintegrasi menggunakan **sistem Tab**.  
* Pastikan tampilan secara keseluruhan responsif dan enak untuk di HP (Mobile-friendly).  
* Untuk tombol aksi (khususnya tombol titik tiganya), jangan warna putih tapi menyesuaikan dengan template yang sudah dipakai sekarang.  
* Pada halaman Jadwal Pelajaran, ubah tombol "Tambah Jadwal" menjadi **"Pengaturan Jadwal"**.

**B. Pengaturan Jadwal (Global Settings)**  
Di dalam tombol "Pengaturan Jadwal", buatkan sistem konfigurasi berikut:

* **Hari Aktif:** Pengaturan hari efektif sekolah.  
* **Durasi per JP (Jam Pelajaran):** Pengaturan waktu untuk 1 JP (misal: 1 JP \= 40 menit).  
* **Agenda Khusus & Pembiasaan:** Tambahkan slot jadwal khusus untuk:  
  * **Pembiasaan** (contoh: literasi, dhuha, dsb).  
  * **Upacara** (khusus hari Senin).  
  * **Istirahat** (ganti icon-nya dengan yang lebih relevan).  
  * **Sholat**.  
  * *Catatan:* Pastikan seluruh agenda ini nantinya otomatis muncul dan terpetakan di dalam tabel jadwal.

**C. Logika Input Jadwal & Mata Pelajaran**

* **Otomatisasi Waktu (Hilangkan Form "Jam Mulai"):** Admin cukup mengisi jumlah JP saja (Maksimal 5 JP per input). Waktu akan otomatis terhitung berdasarkan "Pengaturan Jadwal". *(Contoh: Jika 1 JP \= 40 menit, dan input 2 JP, otomatis jadwal terekam 80 menit tanpa perlu input jam mulai).*  
* **Auto-Sequential:** Saat menginput mapel pertama sebanyak 3 JP, sistem otomatis mengisi jam ke-1 sampai ke-3. Saat ditambah mapel selanjutnya, otomatis langsung mulai meneruskan dari jam ke-4.  
* **Pemisahan Otomatis (Gaps):** Jika rentang jadwal suatu mapel terpotong oleh waktu Pembiasaan, Istirahat, atau Sholat, maka jamnya harus terpisah otomatis. *(Contoh: Input 2 JP di jam ke-4. Karena jam ke-5 istirahat, maka mapel terinput otomatis di jam ke-4 dan melompat ke jam ke-6).*  
* **Fleksibilitas Insert & Edit:**  
  * Jika ada mapel yang dihapus (misal jam ke-1 sampai ke-3 menjadi kosong), sistem harus bisa menyisipkan input mapel baru tepat di jam yang kosong tersebut (bisa *insert* di atas atau di bawah jadwal yang sudah ada).  
  * Jika jumlah JP di-edit (misal dari 2 JP diubah menjadi 3 JP), jam pelajaran di bawahnya harus langsung otomatis menyesuaikan/bergeser.

**D. Fitur Cetak (Print) & Perbaikan Bug Tabel**

* **Format Kop Surat:** Pada hasil cetakan wajib ada Kop Sekolah (Logo dan Alamat).  
* **Judul Cetakan:** Gunakan font yang rapi tanpa garis bawah. Format: "Jadwal Pelajaran", lalu di baris bawahnya "Tahun Ajaran \[Tahun\]".  
* **Format Tabel Semua Kelas (Full):** Sistem cetak seluruh kelas digabung dalam satu halaman. Baris ke bawah untuk Hari & Jam, lalu Kolom ke samping untuk Nama Kelas (contoh: 7a, 7b, 8a, 8b, dst).  
* **Sistem Kode Cetak:** Tampilkan **Kode Guru/Mapel** saja agar tabel cetak full kelas tidak penuh. *(Contoh: Guru A mengampu Fiqh \= Kode 1\. Jika mengajar mapel kedua \= Kode 1a).*  
* **Aturan Sel (Tanpa Merge):** Perbaiki sistem tabel saat ini (contoh: Fiqh 2 jam, tapi jam keduanya kosong). Jika 2 JP, pastikan nama mapel & guru terisi di dua kolom/sel jam tersebut secara penuh, **jangan di-merge cells**.  
* **Tanda Tangan:** Tambahkan area tanda tangan untuk Kepala Sekolah/Madrasah dan Waka Kurikulum di bagian bawah cetakan.

**E. Export ke Excel**

* Tambahkan fitur Export Excel dengan kolom yang **sudah otomatis rapi (Auto-Fit)**.  
* **Format Teks:** Nama Mata Pelajaran di-**Bold**, dan Nama Guru berada tepat di bawahnya.  
* Gunakan format tabel penuh kelas dengan sistem Kode Guru/Mapel (seperti poin D).

**F. Sistem AI Auto-Generate Jadwal**

* Buatkan sistem AI untuk *generate* jadwal mapel otomatis.  
* **Anti-Bentrok:** Memastikan jadwal guru tidak bentrok antar kelas.  
* **Custom Request:** Sistem bisa menerima request/pengecualian hari (contoh: Guru A tidak bisa mengajar di hari tertentu atau jam tertentu).

**G. Catatan Penting Batasan Pengembangan**

* Fokus *update* ini hanya pada logika fitur jadwal. Pastikan perubahan ini tidak mengubah, menghilangkan, atau merusak modul lain yang sudah berfungsi normal (terutama menu **Lembaga** dan bagian **Header** aplikasi).

