# Logika & Teori Generate Jadwal Pelajaran (JP)

Dokumen referensi untuk memahami rumus dan logika sistem **Auto-Scheduler (Generate AI JP)** di modul Akademik → Jadwal Pelajaran. Berlaku untuk penempatan blok, kapasitas, validasi overload, alasan slot kosong, dan konsistensi preview vs generate.

---

## 1. Konsep Dasar

| Istilah | Definisi |
|---|---|
| **JP (Jam Pelajaran)** | Unit waktu belajar (misal 1 JP = 40 menit), diatur di Pengaturan Jadwal. |
| **Slot JP** | Posisi JP ke-1 s.d. ke-N dalam sehari, diambil dari item timeline bertipe `"jp"`. Jumlah slot **dinamis** mengikuti timeline (bisa 8, 10, 12, dst per hari, dan bisa beda antar hari). |
| **Hari Aktif** | Hari yang punya slot JP di timeline dan **tidak** ditandai libur pada dialog generate. |
| **Blok Pertemuan** | Satu sesi mengajar mapel. Panjang blok **2–3 JP** (min 2, maks 3). |
| **Beban Kelas** | Total JP semua mapel kelas tsb dari Plotting Pengajar (Pengampu). |

---

## 2. Pemecahan Beban → Blok (`splitJP`)

```
nBlok = ceil(total / 3)
base  = floor(total / nBlok)
sisa  = total − (base × nBlok)

chunk ke-i = base + 1  (untuk i < sisa)
chunk ke-i = base      (untuk i ≥ sisa)
```

Contoh:
- 3 JP → `[3]`
- 4 JP → `[2, 2]`
- 5 JP → `[3, 2]`
- 6 JP → `[3, 3]`
- 7 JP → `[3, 2, 2]`
- 8 JP → `[3, 3, 2]`
- 1 JP → `[1]` (kasus khusus mapel berbobot 1)

---

## 3. Alur Generate

```
Plotting Pengajar → splitJP → Blok-blok
      ↓
Validasi Kapasitas Realistis (overload dini)      ← bagian 5
      ↓
Fase 1: Backtracking + shuffle (30 percobaan)     ← bagian 4
Fase 2: Relaksasi pengecualian guru (30 percobaan)
Fase 3: Greedy placement (fallback)
      ↓
Tidak ada blok gagal?  →  Kelompokkan blok kontigu → Simpan ke jadwal_pelajaran
Ada blok gagal?        →  Error "tidak dapat dijadwalkan" (tidak ada data parsial)
```

Urutan blok mula-mula: **terbesar dulu** (`sort jpCount desc`).

---

## 4. Algoritma Solver (3 Fase)

### Fase 1 — Backtracking dengan pengecualian guru
- Maks 30 percobaan; percobaan ke-0 deterministik (urut blok sesuai hasil sort), percobaan berikutnya di-shuffle dengan PRNG ter-seed (lihat bagian 7).
- Untuk tiap blok, urutan hari dicoba berdasarkan **hari dengan beban terendah untuk kelas itu** (least-loaded first).
- Dalam satu hari, slot dicoba dari **JP1 ke atas** (pagi dulu).
- Batas langkah: 20.000 langkah per percobaan.
- `avoidSame = true` untuk percobaan 0–19: mapel **tidak boleh 2× di hari yang sama**.
- `avoidConsecutive = true` untuk percobaan 0–9: mapel **tidak boleh di hari berurutan** (misal Senin–Selasa, Selasa–Rabu, dst).

### Fase 2 — Relaksasi pengecualian guru
- Jika Fase 1 gagal dan ada pengecualian guru (hari/JP berhalangan), jalankan ulang **tanpa** pengecualian guru (30 percobaan) supaya tetap ada solusi walau melanggar preferensi guru.

### Fase 3 — Greedy placement
- Jika kedua fase di atas gagal, blok ditempatkan greedy: hari dengan beban terendah dulu, slot bebas pertama dari JP1.
- Langkah A: hindari bentrok guru. Langkah B: bila terpaksa, prioritas kelas kosong (bentrok guru diminimalkan).
- Blok yang tetap gagal ditempatkan → **seluruh generate dibatalkan** (tidak menyimpan sebagian).

### Constraint yang ditegakkan
1. Kelas tidak boleh punya 2 jadwal di slot yang sama.
2. Guru tidak boleh mengajar 2 kelas di slot yang sama.
3. Guru tidak mengajar di hari libur / JP yang ditandai "Tidak Bisa JP Ke-N".
4. Mapel tidak 2× sehari (fase awal), tidak di hari berurutan (fase awal).
5. Hari libur sekolah (toggle di dialog) tidak dipakai sama sekali.

---

## 5. Kapasitas Realistis (Overload Dini) — Teori Bin-Packing

### Masalah kapasitas "mentah" vs "realistis"
Kapasitas mentah = jumlah slot. Contoh 5 hari × 10 slot = **50 JP**. Tapi blok tidak bisa dipotong:

| Komposisi blok | Isi maksimum per hari (kapasitas 10) | Kapasitas realistis 5 hari |
|---|---|---|
| Semua blok 3 JP | 3+3+3 = **9 JP** (slot ke-10 tak terisi) | **45 JP** |
| Semua blok 2 JP | 2×5 = **10 JP** | **50 JP** |
| Campur 3 & 2 | 3+3+2+2 = **10 JP** | 45–50 (tergantung jumlah masing-masing) |

> Contoh nyata: 16 mapel × 3 JP = 48 JP. Lolos cek mentah (48 < 50), tapi **mustahil disusun** karena butuh ⌈48/9⌉ = 6 hari > 5 hari. Inilah yang ditangkap validasi realistis.

### Rumus batas bawah (per hari kapasitas C)
- Blok 3 JP: maks ⌊C/3⌋ blok → ⌊C/3⌋ × 3 JP
- Blok 2 JP: maks ⌊C/2⌋ blok → ⌊C/2⌋ × 2 JP
- Campuran: pakai DP exact (di bawah)

### Algoritma `computePackableCapacity` (DP exact bin-packing)
1. Hitung jumlah blok ukuran 1, 2, 3: `c1, c2, c3`.
2. Enumerasi semua kombinasi isi satu hari `(x1, x2, x3)` dengan `x1 + 2·x2 + 3·x3 ≤ C` (C = jumlah slot hari itu, bisa beda per hari).
3. BFS per layer = per hari terpakai:
   - state `(a1, a2, a3)` = blok yang sudah dikemas
   - dari state, tambahkan satu kombinasi isi hari (tidak melebihi `c1, c2, c3`)
   - jika mencapai `(c1, c2, c3)` → **muat** dalam layer itu hari → `minDays`
4. Jika dalam semua hari tidak tercapai → **tidak muat** (`minDays = hari+1`), laporkan `packableMax` = total JP maksimum yang tercapai.

### Validasi overload per kelas (urutan dalam kode)
```
beban kelas > kapasitas realistis  →  OVERLOAD (error dini, generate dibatalkan)
```
- Kapasitas realistis dihitung **per kelas** dari komposisi blok kelas tersebut.
- Satu helper dipakai server (`jadwal.ts`) dan replica client (`AiGenerateDialog.tsx`) agar indikator dialog konsisten.

### Format pesan error overload
```
Overload jadwal terdeteksi — generate dibatalkan:
• Kelas 7A: beban 48 JP > kapasitas realistis 45 JP
  (slot mentah 50, 5 slot tak bisa diisi blok 2-3 JP — butuh 6 hari)
Solusi: (1) kurangi jumlah JP di Plotting Pengajar,
        (2) tambah slot JP di Pengaturan Jadwal, atau
        (3) pecah bobot mapel agar blok pertemuannya lebih kecil (≤ 2 JP).
```

---

## 6. Alasan Slot Kosong (Preview)

Setiap slot kosong pada preview per kelas memiliki salah satu alasan:

| Alasan | Kondisi |
|---|---|
| `Guru X sedang mengajar Kelas Y di slot ini` | Solver menolak menempatkan blok di slot itu karena guru pengampunya sedang mengajar kelas lain (bentrok guru). |
| `Guru X tidak tersedia di slot ini (pengecualian)` | Guru ditandai tidak bisa di JP/hari tersebut di dialog. |
| `Sisa kapasitas` (fallback) | Slot tidak pernah dicoba solver karena beban kelas sudah terpenuhi — sisa slot memang tidak dibutuhkan. |

Catatan: lubang di tengah hari (misal Rabu JP5–6 kosong sementara JP7–9 terisi) hampir selalu karena **bentrok guru**; slot di akhir hari (JP8–10) hampir selalu **sisa kapasitas**.

---

## 7. Preview = Hasil Generate (Seeded RNG)

- `Math.random` diganti **PRNG deterministik mulberry32** dengan seed:
  ```
  seedKey = sekolahId | kelasId (atau "all") | hariLibur (urut) | JSON(constraints)
  ```
- Input sama → urutan shuffle sama → hasil solver **identik persis**.
- Karena itu preview (dry-run) dan hasil generate dijamin sama selama input tidak berubah.
- Percobaan ke-0 solver tidak memakai shuffle sama sekali → hasil stabil deterministik.

---

## 8. Rumus Ringkas (Cheat Sheet)

```
Blok mapel:          splitJP(JP) → blok 2–3 JP (maks 3 per pertemuan)
Isi maks/hari (C=10): 3-JP: 9 JP · 2-JP: 10 JP · campur: ≤ 10 JP (DP)
minDays (semua 3-JP): ⌈total / 9⌉
Overload:             beban kelas > packableMax(blok kelas, kapasitas hari timeline)
Penempatan:           JP1 dulu, hari paling longgar dulu
Mapel:                maks 1×/hari · tidak di hari berurutan (fase awal)
Preview == Generate:  seedKey (sekolah|kelas|hariLibur|constraints)
```

---

## 9. Referensi Kode

| Lokasi | Isi |
|---|---|
| `src/server/api/routers/jadwal.ts` — `splitJP` | Pemecahan beban → blok |
| `src/server/api/routers/jadwal.ts` — `computePackableCapacity` | DP exact kapasitas realistis |
| `src/server/api/routers/jadwal.ts` — `prepareGenerate` | Persiapan input (hari aktif, alokasi, validasi tenant) |
| `src/server/api/routers/jadwal.ts` — `solveSchedule` | Pipeline solver + validasi overload (dipakai autoGenerate & previewGenerate) |
| `src/server/api/routers/jadwal.ts` — `runBacktrackingSolver` | Fase 1–2 backtracking + pencatatan alasan |
| `src/server/api/routers/jadwal.ts` — `autoGenerate` | Simpan hasil ke `jadwal_pelajaran` |
| `src/server/api/routers/jadwal.ts` — `previewGenerate` | Dry-run → data preview per kelas (blok + slot kosong + alasan + kapasitas) |
| `src/server/api/routers/jadwal.ts` — `mulberry32`/`buildSeedKey` | Seeded RNG agar preview = generate |
| `src/components/jadwal/AiGenerateDialog.tsx` — `splitJPClient`, `computePackableCapacityClient` | Replica client (indikator overload konsisten) |
| `src/components/jadwal/AiGenerateDialog.tsx` — preview grid | Tampilan grid hari × JP + tooltip alasan |
