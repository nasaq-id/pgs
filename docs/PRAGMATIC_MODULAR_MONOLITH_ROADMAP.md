Rekomendasi saya: targetkan Pragmatic Modular Monolith, bukan DDD penuh.
Urutan yang aman:
1. Pisahkan komponen UI monolith menjadi Table, Filters, Dialogs, Export, dan hooks.
2. Pilih satu domain berisiko tinggi, sebaiknya absensi atau keuangan.
3. Pindahkan business rule ke use case murni yang tidak bergantung pada Drizzle/tRPC.
4. Pisahkan repository/database adapter dari use case.
5. Jadikan tRPC router tipis sebagai presentation layer.
6. Tambahkan unit test untuk rule absensi/finance sebelum lanjut domain lain.
7. Ulangi pola tersebut secara bertahap.
Jangan membuat entity, value object, repository interface, dan folder berlapis untuk CRUD sederhana seperti mapel atau sekolah. DDD paling layak digunakan pada:
- Absensi dan aturan hari efektif.
- Keuangan, invoice, pembayaran, dan tunggakan.
- Jadwal dan conflict detection.
- Poin siswa dan threshold pembinaan.
Kesimpulannya: refactor monolith penting untuk kesehatan project jangka panjang, tetapi jangan dilakukan sebelum baseline performance dan behavior test tersedia. Fokus awal sebaiknya modularisasi satu domain secara vertical slice, bukan merombak seluruh codebase sekaligus.
