CREATE TABLE "absensi_siswa" (
	"id" text PRIMARY KEY NOT NULL,
	"siswa_id" text NOT NULL,
	"kelas_id" text NOT NULL,
	"tanggal" timestamp NOT NULL,
	"status" text NOT NULL,
	"keterangan" text
);
--> statement-breakpoint
CREATE TABLE "ekstrakurikuler" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"nama_ekskul" text NOT NULL,
	"pembina_id" text,
	"deskripsi" text,
	"hari" text,
	"jam" text
);
--> statement-breakpoint
CREATE TABLE "guru" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"nipnuptk" text,
	"nik" text,
	"nama_lengkap" text NOT NULL,
	"jenis_kelamin" text,
	"tempat_lahir" text,
	"tanggal_lahir" timestamp,
	"alamat" text,
	"no_hp" text,
	"email" text,
	"pendidikan_terakhir" text,
	"status_kepegawaian" text,
	"kategori_pegawai" text,
	"tugas_utama" text,
	"tugas_tambahan" text,
	"mulai_bertugas" timestamp,
	"akhir_bertugas" timestamp,
	"jp" integer,
	"foto" text,
	"active" boolean DEFAULT true NOT NULL,
	"username_guru" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jadwal_pelajaran" (
	"id" text PRIMARY KEY NOT NULL,
	"kelas_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"guru_id" text NOT NULL,
	"hari" text NOT NULL,
	"jam_mulai" timestamp,
	"jam_selesai" timestamp
);
--> statement-breakpoint
CREATE TABLE "jurnal_mengajar" (
	"id" text PRIMARY KEY NOT NULL,
	"guru_id" text NOT NULL,
	"kelas_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"jadwal_pelajaran_id" text,
	"tanggal" timestamp NOT NULL,
	"judul_jurnal" text,
	"tujuan_pembelajaran" text,
	"materi_konten" text,
	"kegiatan_pembelajaran" text,
	"catatan" text,
	"status_kehadiran" text,
	"detail_kehadiran" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"jam_mulai" timestamp,
	"jam_selesai" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kelas" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"tahun_ajaran_id" text,
	"nama_kelas" text NOT NULL,
	"tingkat" text,
	"wali_kelas_id" text,
	"kapasitas" integer
);
--> statement-breakpoint
CREATE TABLE "mata_pelajaran" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"nama_mapel" text NOT NULL,
	"kode_mapel" text,
	"kelompok" text,
	"kkm" integer DEFAULT 70,
	"aktif" boolean DEFAULT true NOT NULL,
	"urutan" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "nilai" (
	"id" text PRIMARY KEY NOT NULL,
	"siswa_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"tahun_ajaran_id" text,
	"nilai_tugas" integer,
	"nilai_uts" integer,
	"nilai_uas" integer,
	"nilai_akhir" integer,
	"deskripsi" text
);
--> statement-breakpoint
CREATE TABLE "pengumuman" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"judul" text NOT NULL,
	"konten" text,
	"target" text DEFAULT 'semua' NOT NULL,
	"tanggal_publish" timestamp,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prestasi" (
	"id" text PRIMARY KEY NOT NULL,
	"siswa_id" text NOT NULL,
	"nama_prestasi" text NOT NULL,
	"tingkat" text,
	"juara" text,
	"tanggal" timestamp,
	"sertifikat" text
);
--> statement-breakpoint
CREATE TABLE "ruang_kelas" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"nama_ruang" text NOT NULL,
	"kapasitas" integer
);
--> statement-breakpoint
CREATE TABLE "sekolah" (
	"id" text PRIMARY KEY NOT NULL,
	"nama_sekolah" text NOT NULL,
	"npsn" text,
	"jenjang" text,
	"alamat" text,
	"telepon" text,
	"email_sekolah" text,
	"kepala_sekolah" text,
	"logo" text,
	"active" boolean DEFAULT true NOT NULL,
	"penyelenggara" text,
	"status_sekolah" text,
	"kurikulum" text,
	"situs_web" text,
	"akreditasi" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siswa" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"kelas_id" text,
	"nisn" text NOT NULL,
	"nis_lokal" text,
	"nama_lengkap" text NOT NULL,
	"jenis_kelamin" text,
	"tempat_lahir" text,
	"tanggal_lahir" timestamp,
	"nik" text,
	"agama" text,
	"alamat" text,
	"no_hp_ortu" text,
	"email_siswa" text,
	"foto" text,
	"status" text DEFAULT 'aktif' NOT NULL,
	"hobi" text,
	"citacita" text,
	"jumlah_saudara" integer,
	"anak_ke" integer,
	"kewarganegaraan" text DEFAULT 'WNI',
	"pembiayaan_sekolah" text,
	"no_kartu_keluarga" text,
	"nama_kepala_keluarga" text,
	"nama_ayah" text,
	"nik_ayah" text,
	"tempat_lahir_ayah" text,
	"tanggal_lahir_ayah" timestamp,
	"pendidikan_ayah" text,
	"pekerjaan_ayah" text,
	"penghasilan_ayah" text,
	"status_ayah" text,
	"no_hp_ayah" text,
	"kewarganegaraan_ayah" text DEFAULT 'WNI',
	"provinsi_ayah" text,
	"kabupaten_kota_ayah" text,
	"kecamatan_ayah" text,
	"kelurahan_desa_ayah" text,
	"rt_ayah" text,
	"rw_ayah" text,
	"alamat_lengkap_ayah" text,
	"kode_pos_ayah" text,
	"status_kepemilikan_rumah_ayah" text,
	"nama_ibu" text,
	"nik_ibu" text,
	"tempat_lahir_ibu" text,
	"tanggal_lahir_ibu" timestamp,
	"pendidikan_ibu" text,
	"pekerjaan_ibu" text,
	"penghasilan_ibu" text,
	"status_ibu" text,
	"no_hp_ibu" text,
	"kewarganegaraan_ibu" text DEFAULT 'WNI',
	"alamat_ibu_sama_dengan_ayah" boolean DEFAULT true,
	"provinsi_ibu" text,
	"kabupaten_kota_ibu" text,
	"kecamatan_ibu" text,
	"kelurahan_desa_ibu" text,
	"rt_ibu" text,
	"rw_ibu" text,
	"alamat_lengkap_ibu" text,
	"kode_pos_ibu" text,
	"status_kepemilikan_rumah_ibu" text,
	"nama_wali" text,
	"nik_wali" text,
	"tempat_lahir_wali" text,
	"tanggal_lahir_wali" timestamp,
	"pendidikan_wali" text,
	"pekerjaan_wali" text,
	"penghasilan_wali" text,
	"status_wali" text,
	"no_hp_wali" text,
	"kewarganegaraan_wali" text DEFAULT 'WNI',
	"status_kepemilikan_rumah_wali" text,
	"provinsi_wali" text,
	"kabupaten_kota_wali" text,
	"kecamatan_wali" text,
	"kelurahan_desa_wali" text,
	"rt_wali" text,
	"rw_wali" text,
	"alamat_lengkap_wali" text,
	"kode_pos_wali" text,
	"status_tempat_tinggal_siswa" text,
	"jarak_tempat_tinggal_ke_sekolah" text,
	"transportasi_ke_sekolah" text,
	"waktu_tempuh_ke_sekolah" text,
	"username_siswa" text,
	"sekolah_asal" text,
	"diterima_pada_tanggal" timestamp,
	"no_hp_whatsapp" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_spp" (
	"id" text PRIMARY KEY NOT NULL,
	"siswa_id" text NOT NULL,
	"no_tagihan" text,
	"bulan" integer NOT NULL,
	"tahun" integer NOT NULL,
	"jumlah" integer NOT NULL,
	"status_pembayaran" text DEFAULT 'pending' NOT NULL,
	"tanggal_bayar" timestamp
);
--> statement-breakpoint
CREATE TABLE "tahun_ajaran" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"nama_tahun_ajaran" text NOT NULL,
	"tanggal_mulai" timestamp,
	"tanggal_selesai" timestamp,
	"semester" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tugas" (
	"id" text PRIMARY KEY NOT NULL,
	"guru_id" text NOT NULL,
	"kelas_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"jurnal_mengajar_id" text,
	"judul_tugas" text NOT NULL,
	"deskripsi" text,
	"jenis_tugas" text,
	"tanggal_diberikan" timestamp,
	"deadline" timestamp,
	"status" text DEFAULT 'aktif' NOT NULL,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"password" text NOT NULL,
	"role" text DEFAULT 'siswa' NOT NULL,
	"sekolah_id" text,
	"phone" text,
	"photo" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD CONSTRAINT "absensi_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD CONSTRAINT "absensi_siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ekstrakurikuler" ADD CONSTRAINT "ekstrakurikuler_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ekstrakurikuler" ADD CONSTRAINT "ekstrakurikuler_pembina_id_guru_id_fk" FOREIGN KEY ("pembina_id") REFERENCES "public"."guru"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guru" ADD CONSTRAINT "guru_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD CONSTRAINT "jadwal_pelajaran_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD CONSTRAINT "jadwal_pelajaran_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD CONSTRAINT "jadwal_pelajaran_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_mengajar" ADD CONSTRAINT "jurnal_mengajar_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_mengajar" ADD CONSTRAINT "jurnal_mengajar_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_mengajar" ADD CONSTRAINT "jurnal_mengajar_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurnal_mengajar" ADD CONSTRAINT "jurnal_mengajar_jadwal_pelajaran_id_jadwal_pelajaran_id_fk" FOREIGN KEY ("jadwal_pelajaran_id") REFERENCES "public"."jadwal_pelajaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kelas" ADD CONSTRAINT "kelas_wali_kelas_id_guru_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "public"."guru"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mata_pelajaran" ADD CONSTRAINT "mata_pelajaran_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nilai" ADD CONSTRAINT "nilai_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prestasi" ADD CONSTRAINT "prestasi_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ruang_kelas" ADD CONSTRAINT "ruang_kelas_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siswa" ADD CONSTRAINT "siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_spp" ADD CONSTRAINT "tagihan_spp_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tahun_ajaran" ADD CONSTRAINT "tahun_ajaran_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tugas" ADD CONSTRAINT "tugas_jurnal_mengajar_id_jurnal_mengajar_id_fk" FOREIGN KEY ("jurnal_mengajar_id") REFERENCES "public"."jurnal_mengajar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;