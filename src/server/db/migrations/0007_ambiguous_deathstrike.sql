CREATE TABLE "asesmen" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"guru_id" text NOT NULL,
	"kelas_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"jurnal_mengajar_id" text,
	"judul" text NOT NULL,
	"deskripsi" text,
	"kategori" text DEFAULT 'formatif_proses' NOT NULL,
	"teknik" text DEFAULT 'tes_tertulis' NOT NULL,
	"jenis_pengumpulan" text DEFAULT 'unggah_file' NOT NULL,
	"kktp" integer DEFAULT 70 NOT NULL,
	"deadline" timestamp,
	"status" text DEFAULT 'aktif' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asesmen_komentar" (
	"id" text PRIMARY KEY NOT NULL,
	"asesmen_id" text NOT NULL,
	"user_id" text NOT NULL,
	"pesan" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asesmen_siswa" (
	"id" text PRIMARY KEY NOT NULL,
	"asesmen_id" text NOT NULL,
	"siswa_id" text NOT NULL,
	"status" text DEFAULT 'belum_dikerjakan' NOT NULL,
	"jawaban_teks" text,
	"berkas_url" text,
	"nilai" integer,
	"status_ketuntasan" text,
	"feedback" text,
	"submitted_at" timestamp,
	"dinilai_at" timestamp,
	"dinilai_oleh" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asesmen" ADD CONSTRAINT "asesmen_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen" ADD CONSTRAINT "asesmen_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen" ADD CONSTRAINT "asesmen_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen" ADD CONSTRAINT "asesmen_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen" ADD CONSTRAINT "asesmen_jurnal_mengajar_id_jurnal_mengajar_id_fk" FOREIGN KEY ("jurnal_mengajar_id") REFERENCES "public"."jurnal_mengajar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen_komentar" ADD CONSTRAINT "asesmen_komentar_asesmen_id_asesmen_id_fk" FOREIGN KEY ("asesmen_id") REFERENCES "public"."asesmen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen_komentar" ADD CONSTRAINT "asesmen_komentar_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen_siswa" ADD CONSTRAINT "asesmen_siswa_asesmen_id_asesmen_id_fk" FOREIGN KEY ("asesmen_id") REFERENCES "public"."asesmen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asesmen_siswa" ADD CONSTRAINT "asesmen_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;