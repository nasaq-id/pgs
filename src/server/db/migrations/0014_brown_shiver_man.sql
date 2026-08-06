CREATE TABLE "pengaturan_kalender" (
	"id" text PRIMARY KEY NOT NULL,
	"sekolah_id" text NOT NULL,
	"tanggal_mulai_ganjil" text DEFAULT '07-15' NOT NULL,
	"tanggal_selesai_ganjil" text DEFAULT '12-22' NOT NULL,
	"tanggal_mulai_genap" text DEFAULT '01-02' NOT NULL,
	"tanggal_selesai_genap" text DEFAULT '06-30' NOT NULL,
	"selaraskan_senin" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint

ALTER TABLE "pengaturan_kalender" ADD CONSTRAINT "pengaturan_kalender_sekolah_id_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "public"."sekolah"("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint

CREATE INDEX "pengaturan_kalender_sekolah_id_idx" ON "pengaturan_kalender" USING btree ("sekolah_id");
