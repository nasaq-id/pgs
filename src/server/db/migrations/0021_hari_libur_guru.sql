ALTER TABLE "pengaturan_kalender" ADD COLUMN "hari_libur_mingguan_guru" text DEFAULT '["sabtu", "minggu"]' NOT NULL;

ALTER TABLE "pengaturan_absensi" DROP COLUMN "hari_libur";
