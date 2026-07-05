CREATE TABLE "absensi_guru" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"guru_id" text NOT NULL,
	"tanggal" timestamp NOT NULL,
	"status" text NOT NULL,
	"jam_masuk" timestamp,
	"jam_pulang" timestamp,
	"keterangan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengajuan_izin" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"tipe_pengaju" text NOT NULL,
	"siswa_id" text,
	"guru_id" text,
	"jenis_izin" text NOT NULL,
	"alasan" text NOT NULL,
	"jam_pulang" text,
	"jumlah_hari" integer,
	"tanggal_mulai" timestamp NOT NULL,
	"tanggal_selesai" timestamp NOT NULL,
	"bukti" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"disetujui_oleh" text,
	"catatan_approval" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengaturan_absensi" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"jam_masuk" text DEFAULT '07:00' NOT NULL,
	"jam_pulang" text DEFAULT '14:00' NOT NULL,
	"toleransi" integer DEFAULT 15 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pengaturan_absensi_sekolah_id_unique" UNIQUE("sekolah_id")
);
--> statement-breakpoint
CREATE TABLE "timeline_item" (
	"id" text PRIMARY KEY NOT NULL,
	"pengaturan_jadwal_id" text NOT NULL,
	"hari" text NOT NULL,
	"tipe" text DEFAULT 'jp' NOT NULL,
	"label" text,
	"jam_mulai" text NOT NULL,
	"jam_selesai" text NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"warna" text
);
--> statement-breakpoint
ALTER TABLE "agenda_khusus" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "agenda_khusus" CASCADE;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD COLUMN "sekolah_id" text;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD COLUMN "jam_masuk" timestamp;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD COLUMN "jam_pulang" timestamp;--> statement-breakpoint
ALTER TABLE "absensi_guru" ADD CONSTRAINT "absensi_guru_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi_guru" ADD CONSTRAINT "absensi_guru_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_izin" ADD CONSTRAINT "pengajuan_izin_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_izin" ADD CONSTRAINT "pengajuan_izin_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengajuan_izin" ADD CONSTRAINT "pengajuan_izin_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaturan_absensi" ADD CONSTRAINT "pengaturan_absensi_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_item" ADD CONSTRAINT "timeline_item_pengaturan_jadwal_id_pengaturan_jadwal_id_fk" FOREIGN KEY ("pengaturan_jadwal_id") REFERENCES "public"."pengaturan_jadwal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "absensi_siswa" ADD CONSTRAINT "absensi_siswa_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengaturan_jadwal" DROP COLUMN "hari_aktif";--> statement-breakpoint
ALTER TABLE "pengaturan_jadwal" DROP COLUMN "jam_pulang";