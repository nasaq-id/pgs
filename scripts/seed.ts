import { db } from "../src/server/db"
import { users, sekolah, guru, kelas, mataPelajaran, siswa, jadwalPelajaran, pengaturanJadwal, timelineItem } from "../src/server/db/schema"
import bcrypt from "bcryptjs"

async function seed() {
  const password = await bcrypt.hash("admin123", 10)

  const [sekolahBaru] = await db.insert(sekolah).values({
    id: "sekolah-1",
    namaSekolah: "Sekolah Demo",
    npsn: "12345678",
    jenjang: "sma",
    active: true,
  }).onConflictDoNothing().returning()

  const [user] = await db.insert(users).values({
    id: "user-1",
    email: "admin@demo.com",
    firstName: "Super",
    lastName: "Admin",
    password,
    role: "super_admin",
    sekolahId: sekolahBaru?.id || "sekolah-1",
    active: true,
  }).onConflictDoNothing().returning()

  if (user) {
    console.log("✅ Super admin created:")
    console.log("   Email:    admin@demo.com")
    console.log("   Password: admin123")
  } else {
    console.log("ℹ️  User already exists")
  }

  // Seed data pendukung jurnal
  console.log("\n📚 Seeding data pendukung jurnal...")

  // Guru
  const guruPassword = await bcrypt.hash("guru123", 10)
  const guruData = [
    { id: "guru-1", sekolahId: "sekolah-1", namaLengkap: "Budi Santoso, S.Pd", nipnuptk: "198501012010011001", usernameGuru: "budi.santoso", passwordGuru: guruPassword, active: true },
    { id: "guru-2", sekolahId: "sekolah-1", namaLengkap: "Siti Aminah, S.Pd", nipnuptk: "198702022011012002", usernameGuru: "siti.aminah", passwordGuru: guruPassword, active: true },
    { id: "guru-3", sekolahId: "sekolah-1", namaLengkap: "Ahmad Fauzi, M.Pd", nipnuptk: "198903032012011003", usernameGuru: "ahmad.fauzi", passwordGuru: guruPassword, active: true },
  ]
  for (const g of guruData) {
    await db.insert(guru).values(g).onConflictDoNothing()
  }
  console.log(`✅ ${guruData.length} guru created`)

  // Mata Pelajaran
  const mapelData = [
    { id: "mapel-1", sekolahId: "sekolah-1", namaMapel: "Bahasa Inggris", kodeMapel: "BING", kelompok: "A" },
    { id: "mapel-2", sekolahId: "sekolah-1", namaMapel: "Matematika", kodeMapel: "MTK", kelompok: "A" },
    { id: "mapel-3", sekolahId: "sekolah-1", namaMapel: "Bahasa Indonesia", kodeMapel: "BIND", kelompok: "A" },
    { id: "mapel-4", sekolahId: "sekolah-1", namaMapel: "IPA", kodeMapel: "IPA", kelompok: "B" },
  ]
  await db.insert(mataPelajaran).values(mapelData as any).onConflictDoNothing()
  console.log(`✅ ${mapelData.length} mata pelajaran created`)

  // Kelas
  const kelasData = [
    { id: "kelas-7a", sekolahId: "sekolah-1", namaKelas: "7A", tingkat: "7", waliKelasId: "guru-1" },
    { id: "kelas-7b", sekolahId: "sekolah-1", namaKelas: "7B", tingkat: "7", waliKelasId: "guru-2" },
    { id: "kelas-8a", sekolahId: "sekolah-1", namaKelas: "8A", tingkat: "8", waliKelasId: "guru-3" },
  ]
  await db.insert(kelas).values(kelasData as any).onConflictDoNothing()
  console.log(`✅ ${kelasData.length} kelas created`)

  // Siswa (5 per kelas)
  const siswaData = [
    // Kelas 7A
    { id: "siswa-7a-1", sekolahId: "sekolah-1", kelasId: "kelas-7a", nisn: "0012345671", namaLengkap: "Andi Pratama", jenisKelamin: "L" },
    { id: "siswa-7a-2", sekolahId: "sekolah-1", kelasId: "kelas-7a", nisn: "0012345672", namaLengkap: "Bella Safitri", jenisKelamin: "P" },
    { id: "siswa-7a-3", sekolahId: "sekolah-1", kelasId: "kelas-7a", nisn: "0012345673", namaLengkap: "Candra Wijaya", jenisKelamin: "L" },
    { id: "siswa-7a-4", sekolahId: "sekolah-1", kelasId: "kelas-7a", nisn: "0012345674", namaLengkap: "Dewi Lestari", jenisKelamin: "P" },
    { id: "siswa-7a-5", sekolahId: "sekolah-1", kelasId: "kelas-7a", nisn: "0012345675", namaLengkap: "Eko Prasetyo", jenisKelamin: "L" },
    // Kelas 7B
    { id: "siswa-7b-1", sekolahId: "sekolah-1", kelasId: "kelas-7b", nisn: "0012345681", namaLengkap: "Fajar Nugroho", jenisKelamin: "L" },
    { id: "siswa-7b-2", sekolahId: "sekolah-1", kelasId: "kelas-7b", nisn: "0012345682", namaLengkap: "Gita Puspita", jenisKelamin: "P" },
    { id: "siswa-7b-3", sekolahId: "sekolah-1", kelasId: "kelas-7b", nisn: "0012345683", namaLengkap: "Hadi Sucipto", jenisKelamin: "L" },
    { id: "siswa-7b-4", sekolahId: "sekolah-1", kelasId: "kelas-7b", nisn: "0012345684", namaLengkap: "Indah Permata", jenisKelamin: "P" },
    { id: "siswa-7b-5", sekolahId: "sekolah-1", kelasId: "kelas-7b", nisn: "0012345685", namaLengkap: "Joko Susilo", jenisKelamin: "L" },
    // Kelas 8A
    { id: "siswa-8a-1", sekolahId: "sekolah-1", kelasId: "kelas-8a", nisn: "0012345691", namaLengkap: "Kurnia Sari", jenisKelamin: "P" },
    { id: "siswa-8a-2", sekolahId: "sekolah-1", kelasId: "kelas-8a", nisn: "0012345692", namaLengkap: "Lukman Hakim", jenisKelamin: "L" },
    { id: "siswa-8a-3", sekolahId: "sekolah-1", kelasId: "kelas-8a", nisn: "0012345693", namaLengkap: "Maya Anggraini", jenisKelamin: "P" },
    { id: "siswa-8a-4", sekolahId: "sekolah-1", kelasId: "kelas-8a", nisn: "0012345694", namaLengkap: "Naufal Rizky", jenisKelamin: "L" },
    { id: "siswa-8a-5", sekolahId: "sekolah-1", kelasId: "kelas-8a", nisn: "0012345695", namaLengkap: "Olivia Putri", jenisKelamin: "P" },
  ]
  await db.insert(siswa).values(siswaData as any).onConflictDoNothing()
  console.log(`✅ ${siswaData.length} siswa created`)

  // Jadwal Pelajaran
  const jadwalData = [
    // Guru 1 (Budi) - Bahasa Inggris
    { id: "jadwal-1", sekolahId: "sekolah-1", kelasId: "kelas-7a", mataPelajaranId: "mapel-1", guruId: "guru-1", hari: "senin", jamMulai: new Date("2024-01-01T07:00:00"), jamSelesai: new Date("2024-01-01T08:30:00") },
    { id: "jadwal-2", sekolahId: "sekolah-1", kelasId: "kelas-7b", mataPelajaranId: "mapel-1", guruId: "guru-1", hari: "selasa", jamMulai: new Date("2024-01-01T07:00:00"), jamSelesai: new Date("2024-01-01T08:30:00") },
    { id: "jadwal-3", sekolahId: "sekolah-1", kelasId: "kelas-8a", mataPelajaranId: "mapel-1", guruId: "guru-1", hari: "rabu", jamMulai: new Date("2024-01-01T07:00:00"), jamSelesai: new Date("2024-01-01T08:30:00") },
    // Guru 2 (Siti) - Matematika
    { id: "jadwal-4", sekolahId: "sekolah-1", kelasId: "kelas-7a", mataPelajaranId: "mapel-2", guruId: "guru-2", hari: "senin", jamMulai: new Date("2024-01-01T08:30:00"), jamSelesai: new Date("2024-01-01T10:00:00") },
    { id: "jadwal-5", sekolahId: "sekolah-1", kelasId: "kelas-7b", mataPelajaranId: "mapel-2", guruId: "guru-2", hari: "rabu", jamMulai: new Date("2024-01-01T08:30:00"), jamSelesai: new Date("2024-01-01T10:00:00") },
    { id: "jadwal-6", sekolahId: "sekolah-1", kelasId: "kelas-8a", mataPelajaranId: "mapel-2", guruId: "guru-2", hari: "kamis", jamMulai: new Date("2024-01-01T08:30:00"), jamSelesai: new Date("2024-01-01T10:00:00") },
    // Guru 3 (Ahmad) - Bahasa Indonesia & IPA
    { id: "jadwal-7", sekolahId: "sekolah-1", kelasId: "kelas-7a", mataPelajaranId: "mapel-3", guruId: "guru-3", hari: "selasa", jamMulai: new Date("2024-01-01T10:00:00"), jamSelesai: new Date("2024-01-01T11:30:00") },
    { id: "jadwal-8", sekolahId: "sekolah-1", kelasId: "kelas-7b", mataPelajaranId: "mapel-3", guruId: "guru-3", hari: "kamis", jamMulai: new Date("2024-01-01T10:00:00"), jamSelesai: new Date("2024-01-01T11:30:00") },
    { id: "jadwal-9", sekolahId: "sekolah-1", kelasId: "kelas-8a", mataPelajaranId: "mapel-4", guruId: "guru-3", hari: "jumat", jamMulai: new Date("2024-01-01T07:00:00"), jamSelesai: new Date("2024-01-01T08:30:00") },
  ]
  await db.insert(jadwalPelajaran).values(jadwalData as any).onConflictDoNothing()
  console.log(`✅ ${jadwalData.length} jadwal pelajaran created`)

  // Pengaturan Jadwal
  await db.insert(pengaturanJadwal).values({
    id: "pengaturan-1",
    sekolahId: "sekolah-1",
    durasiJP: 40,
    jamMulai: "07:00",
  }).onConflictDoNothing()
  console.log("✅ Pengaturan jadwal created")

  // Timeline items (agenda khusus migrated to timeline_item)
  const timelineData = [
    { id: "timeline-senin-1", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "07:00", jamSelesai: "07:40", urutan: 1 },
    { id: "timeline-senin-2", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "07:40", jamSelesai: "08:20", urutan: 2 },
    { id: "timeline-senin-3", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "upacara", label: "Upacara", jamMulai: "08:20", jamSelesai: "08:50", urutan: 3 },
    { id: "timeline-senin-4", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "08:50", jamSelesai: "09:30", urutan: 4 },
    { id: "timeline-senin-5", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "09:30", jamSelesai: "10:10", urutan: 5 },
    { id: "timeline-senin-6", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "istirahat", label: "Istirahat", jamMulai: "10:10", jamSelesai: "10:40", urutan: 6 },
    { id: "timeline-senin-7", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "10:40", jamSelesai: "11:20", urutan: 7 },
    { id: "timeline-senin-8", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "senin", tipe: "jp", jamMulai: "11:20", jamSelesai: "12:00", urutan: 8 },
    { id: "timeline-selasa-1", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "pembiasaan", label: "Pembiasaan : Literasi Pagi", jamMulai: "07:00", jamSelesai: "07:20", urutan: 1 },
    { id: "timeline-selasa-2", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "07:20", jamSelesai: "08:00", urutan: 2 },
    { id: "timeline-selasa-3", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "08:00", jamSelesai: "08:40", urutan: 3 },
    { id: "timeline-selasa-4", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "08:40", jamSelesai: "09:20", urutan: 4 },
    { id: "timeline-selasa-5", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "istirahat", label: "Istirahat", jamMulai: "09:20", jamSelesai: "09:50", urutan: 5 },
    { id: "timeline-selasa-6", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "09:50", jamSelesai: "10:30", urutan: 6 },
    { id: "timeline-selasa-7", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "10:30", jamSelesai: "11:10", urutan: 7 },
    { id: "timeline-selasa-8", sekolahId: "sekolah-1", pengaturanJadwalId: "pengaturan-1", hari: "selasa", tipe: "jp", jamMulai: "11:10", jamSelesai: "11:50", urutan: 8 },
  ]
  await db.insert(timelineItem).values(timelineData as any).onConflictDoNothing()
  console.log(`✅ ${timelineData.length} timeline items created`)

  console.log("\n📋 Data login:")
  console.log("   Admin:    admin@demo.com / admin123")
  console.log("   Guru 1:   budi.santoso / guru123")
  console.log("   Guru 2:   siti.aminah / guru123")
  console.log("   Guru 3:   ahmad.fauzi / guru123")

  process.exit(0)
}

seed().catch((e) => {
  console.error(e)
  process.exit(1)
})
