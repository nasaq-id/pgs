ALTER TABLE "jadwal_pelajaran" ADD COLUMN "status" text DEFAULT 'PUBLISHED' NOT NULL;--> statement-breakpoint
ALTER TABLE "jadwal_pelajaran" ADD COLUMN "batch_id" text;--> statement-breakpoint
ALTER TABLE "pengampu" ADD COLUMN "max_jp_per_pertemuan" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "pengaturan_jadwal" ADD COLUMN "teacher_exceptions_json" json DEFAULT '{}';--> statement-breakpoint
CREATE INDEX "jadwal_pelajaran_batch_id_idx" ON "jadwal_pelajaran" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "jadwal_pelajaran_kelas_id_status_idx" ON "jadwal_pelajaran" USING btree ("kelas_id","status");