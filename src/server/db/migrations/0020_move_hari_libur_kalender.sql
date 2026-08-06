ALTER TABLE "pengaturan_kalender" ADD COLUMN "hari_libur_mingguan" text DEFAULT '["sabtu", "minggu"]' NOT NULL;

UPDATE "pengaturan_kalender" pk
SET "hari_libur_mingguan" = COALESCE(pa."hari_libur", '["sabtu", "minggu"]')
FROM "pengaturan_absensi" pa
WHERE pa."sekolah_id" = pk."sekolah_id";

INSERT INTO "pengaturan_kalender" ("id", "sekolah_id", "hari_libur_mingguan")
SELECT 'libur-' || pa."sekolah_id", pa."sekolah_id", COALESCE(pa."hari_libur", '["sabtu", "minggu"]')
FROM "pengaturan_absensi" pa
WHERE NOT EXISTS (SELECT 1 FROM "pengaturan_kalender" pk WHERE pk."sekolah_id" = pa."sekolah_id");

ALTER TABLE "pengaturan_absensi" DROP COLUMN "hari_libur";
