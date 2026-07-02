CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"sekolah_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kalender_event" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"judul" text NOT NULL,
	"deskripsi" text,
	"tanggal_mulai" timestamp NOT NULL,
	"tanggal_selesai" timestamp,
	"tipe" text DEFAULT 'kegiatan' NOT NULL,
	"is_libur_nasional" boolean DEFAULT false NOT NULL,
	"warna" text DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifikasi" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"user_id" text,
	"judul" text NOT NULL,
	"pesan" text NOT NULL,
	"tipe" text DEFAULT 'info' NOT NULL,
	"dibaca" boolean DEFAULT false NOT NULL,
	"link" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "whatsapp" text;--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "youtube" text;--> statement-breakpoint
ALTER TABLE "sekolah" ADD COLUMN "twitter" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kalender_event" ADD CONSTRAINT "kalender_event_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;