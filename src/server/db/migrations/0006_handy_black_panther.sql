CREATE TABLE "agenda_khusus" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"hari" text NOT NULL,
	"nama" text NOT NULL,
	"icon" text DEFAULT 'clock',
	"jam_mulai" text NOT NULL,
	"jam_selesai" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengaturan_jadwal" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"durasi_jp" integer DEFAULT 40 NOT NULL,
	"hari_aktif" text DEFAULT '["senin","selasa","rabu","kamis","jumat"]' NOT NULL,
	"jam_mulai" text DEFAULT '07:00' NOT NULL,
	"jam_pulang" text DEFAULT '15:00' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD COLUMN "jp_mulai" integer;--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD COLUMN "jp_count" integer;--> statement-breakpoint
ALTER TABLE "agenda_khusus" ADD CONSTRAINT "agenda_khusus_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaturan_jadwal" ADD CONSTRAINT "pengaturan_jadwal_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;