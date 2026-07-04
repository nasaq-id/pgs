CREATE TABLE IF NOT EXISTS "timeline_item" (
  "id" text PRIMARY KEY NOT NULL,
  "pengaturan_jadwal_id" text NOT NULL REFERENCES "pengaturan_jadwal"("id") ON DELETE CASCADE,
  "hari" text NOT NULL,
  "tipe" text NOT NULL DEFAULT 'jp',
  "label" text,
  "jam_mulai" text NOT NULL,
  "jam_selesai" text NOT NULL,
  "urutan" integer NOT NULL DEFAULT 0,
  "warna" text
);

--> statement-breakpoint

-- Migrate existing agenda_khusus data to timeline_item
INSERT INTO "timeline_item" ("id", "pengaturan_jadwal_id", "hari", "tipe", "label", "jam_mulai", "jam_selesai", "urutan")
SELECT
  a."id",
  pj."id",
  a."hari",
  CASE
    WHEN LOWER(a."nama") LIKE '%pembiasaan%' THEN 'pembiasaan'
    WHEN LOWER(a."nama") LIKE '%upacara%' THEN 'upacara'
    WHEN LOWER(a."nama") LIKE '%istirahat%' THEN 'istirahat'
    WHEN LOWER(a."nama") LIKE '%sholat%' OR LOWER(a."nama") LIKE '%shalat%' THEN 'sholat'
    ELSE 'lainnya'
  END,
  a."nama",
  a."jam_mulai",
  a."jam_selesai",
  a."urutan"
FROM "agenda_khusus" a
INNER JOIN "pengaturan_jadwal" pj ON pj."sekolah_id" = a."sekolah_id";

--> statement-breakpoint

-- Generate default JP 1-10 timeline items for each pengaturan_jadwal
-- For each existing pengaturan_jadwal, generate 10 JP slots for each active day
DO $$
DECLARE
  pj_record RECORD;
  day_items text[];
  day_val text;
  hh int;
  mm int;
  total_min int;
  start_h int;
  start_m int;
  durasi int;
  jp_idx int;
  jp_start_min int;
  jp_end_min int;
  jp_start_h int;
  jp_start_m int;
  jp_end_h int;
  jp_end_m int;
BEGIN
  FOR pj_record IN SELECT * FROM "pengaturan_jadwal" LOOP
    durasi := COALESCE(pj_record."durasi_jp", 40);
    start_h := 7;
    start_m := 0;
    BEGIN
      start_h := EXTRACT(HOUR FROM pj_record."jam_mulai"::time)::int;
      start_m := EXTRACT(MINUTE FROM pj_record."jam_mulai"::time)::int;
    EXCEPTION WHEN OTHERS THEN
      start_h := 7;
      start_m := 0;
    END;

    -- Determine active days from existing hari_aktif, or default to weekdays
    IF pj_record."hari_aktif" IS NOT NULL AND pj_record."hari_aktif" != '' THEN
      BEGIN
        day_items := ARRAY(
          SELECT value::text
          FROM json_array_elements_text(pj_record."hari_aktif"::json)
        );
      EXCEPTION WHEN OTHERS THEN
        day_items := ARRAY['senin','selasa','rabu','kamis','jumat'];
      END;
    ELSE
      day_items := ARRAY['senin','selasa','rabu','kamis','jumat'];
    END IF;

    FOREACH day_val IN ARRAY day_items LOOP
      FOR jp_idx IN 1..10 LOOP
        jp_start_min := start_h * 60 + start_m + (jp_idx - 1) * durasi;
        jp_end_min := start_h * 60 + start_m + jp_idx * durasi;
        jp_start_h := jp_start_min / 60;
        jp_start_m := jp_start_min % 60;
        jp_end_h := jp_end_min / 60;
        jp_end_m := jp_end_min % 60;

        INSERT INTO "timeline_item" ("id", "pengaturan_jadwal_id", "hari", "tipe", "jam_mulai", "jam_selesai", "urutan")
        VALUES (
          gen_random_uuid()::text,
          pj_record."id",
          day_val,
          'jp',
          LPAD(jp_start_h::text, 2, '0') || ':' || LPAD(jp_start_m::text, 2, '0'),
          LPAD(jp_end_h::text, 2, '0') || ':' || LPAD(jp_end_m::text, 2, '0'),
          jp_idx
        )
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

--> statement-breakpoint

-- Drop the old agenda_khusus table
DROP TABLE IF EXISTS "agenda_khusus" CASCADE;

--> statement-breakpoint

-- Remove deprecated columns from pengaturan_jadwal
ALTER TABLE "pengaturan_jadwal" DROP COLUMN IF EXISTS "hari_aktif";
ALTER TABLE "pengaturan_jadwal" DROP COLUMN IF EXISTS "jam_pulang";
