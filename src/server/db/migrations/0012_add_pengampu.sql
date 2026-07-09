CREATE TABLE "pengampu" (
	"id" text PRIMARY KEY NOT NULL,
	"guru_id" text NOT NULL,
	"mata_pelajaran_id" text NOT NULL,
	"kelas_id" text NOT NULL,
	"tahun_ajaran_id" text
);
--> statement-breakpoint
ALTER TABLE "pengampu" ADD CONSTRAINT "pengampu_guru_id_guru_id_fk" FOREIGN KEY ("guru_id") REFERENCES "public"."guru"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengampu" ADD CONSTRAINT "pengampu_mata_pelajaran_id_mata_pelajaran_id_fk" FOREIGN KEY ("mata_pelajaran_id") REFERENCES "public"."mata_pelajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengampu" ADD CONSTRAINT "pengampu_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengampu" ADD CONSTRAINT "pengampu_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pengampu_unique_idx" ON "pengampu" ("guru_id","mata_pelajaran_id","kelas_id");
