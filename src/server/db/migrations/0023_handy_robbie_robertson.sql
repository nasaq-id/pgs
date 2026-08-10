-- Dedupe data historis: pertahankan 1 record terbaru per (siswa_id, tanggal).
-- Wajib dijalankan SEBELUM create unique index, jika tidak index gagal dibuat
-- karena adanya duplikat absensi di hari yang sama.
DELETE FROM "absensi_siswa" a USING "absensi_siswa" b
WHERE a."siswa_id" = b."siswa_id"
  AND a."tanggal" = b."tanggal"
  AND (
    a."created_at" < b."created_at"
    OR (a."created_at" = b."created_at" AND a."id" < b."id")
  );

CREATE UNIQUE INDEX "absensi_siswa_siswa_tanggal_unique_idx" ON "absensi_siswa" USING btree ("siswa_id","tanggal");
