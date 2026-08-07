CREATE TABLE "absensi_hari" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"jenis" text NOT NULL,
	"kelas_id" text,
	"tanggal" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_absensi" ADD COLUMN "is_pulang_cepat_darurat" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "absensi_hari" ADD CONSTRAINT "absensi_hari_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi_hari" ADD CONSTRAINT "absensi_hari_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "absensi_hari_jenis_kelas_tanggal_idx" ON "absensi_hari" USING btree ("sekolah_id","jenis","kelas_id","tanggal");--> statement-breakpoint
CREATE INDEX "absensi_hari_sekolah_id_idx" ON "absensi_hari" USING btree ("sekolah_id");--> statement-breakpoint
CREATE INDEX "absensi_hari_tanggal_idx" ON "absensi_hari" USING btree ("tanggal");