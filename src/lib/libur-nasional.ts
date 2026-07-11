export function getLiburNasional(year: number) {
  return [
    { judul: "Tahun Baru Masehi", tanggalMulai: `${year}-01-01`, tanggalSelesai: null },
    { judul: "Hari Buruh Internasional", tanggalMulai: `${year}-05-01`, tanggalSelesai: null },
    { judul: "Hari Kebangkitan Nasional", tanggalMulai: `${year}-05-20`, tanggalSelesai: null },
    { judul: "Hari Lahir Pancasila", tanggalMulai: `${year}-06-01`, tanggalSelesai: null },
    { judul: "Hari Kemerdekaan RI", tanggalMulai: `${year}-08-17`, tanggalSelesai: null },
    { judul: "Hari Pahlawan", tanggalMulai: `${year}-11-10`, tanggalSelesai: null },
    { judul: "Hari Natal", tanggalMulai: `${year}-12-25`, tanggalSelesai: null },

    ...getIslamicHolidays(year),
  ]
}

function getIslamicHolidays(year: number) {
  const holidays: Record<number, Array<{ judul: string; tanggalMulai: string; tanggalSelesai: null }>> = {
    2025: [
      { judul: "Isra Mi'raj Nabi Muhammad", tanggalMulai: "2025-01-27", tanggalSelesai: null },
      { judul: "Hari Raya Idul Fitri", tanggalMulai: "2025-03-31", tanggalSelesai: null },
      { judul: "Hari Raya Idul Adha", tanggalMulai: "2025-06-07", tanggalSelesai: null },
      { judul: "Tahun Baru Islam", tanggalMulai: "2025-06-27", tanggalSelesai: null },
      { judul: "Maulid Nabi Muhammad", tanggalMulai: "2025-09-05", tanggalSelesai: null },
    ],
    2026: [
      { judul: "Isra Mi'raj Nabi Muhammad", tanggalMulai: "2026-01-16", tanggalSelesai: null },
      { judul: "Hari Raya Idul Fitri", tanggalMulai: "2026-03-21", tanggalSelesai: null },
      { judul: "Hari Raya Idul Adha", tanggalMulai: "2026-05-27", tanggalSelesai: null },
      { judul: "Tahun Baru Islam", tanggalMulai: "2026-06-16", tanggalSelesai: null },
      { judul: "Maulid Nabi Muhammad", tanggalMulai: "2026-09-25", tanggalSelesai: null },
    ],
    2027: [
      { judul: "Isra Mi'raj Nabi Muhammad", tanggalMulai: "2027-01-05", tanggalSelesai: null },
      { judul: "Hari Raya Idul Fitri", tanggalMulai: "2027-03-10", tanggalSelesai: null },
      { judul: "Hari Raya Idul Adha", tanggalMulai: "2027-05-17", tanggalSelesai: null },
      { judul: "Tahun Baru Islam", tanggalMulai: "2027-06-06", tanggalSelesai: null },
      { judul: "Maulid Nabi Muhammad", tanggalMulai: "2027-09-15", tanggalSelesai: null },
    ],
  }

  const cny: Record<number, string> = {
    2025: "2025-01-29",
    2026: "2026-02-17",
    2027: "2027-02-06",
  }

  const nyepi: Record<number, string> = {
    2025: "2025-03-29",
    2026: "2026-03-18",
    2027: "2027-03-07",
  }

  const wafatIsa: Record<number, string> = {
    2025: "2025-04-18",
    2026: "2026-04-03",
    2027: "2027-03-26",
  }

  const kenaikanIsa: Record<number, string> = {
    2025: "2025-05-29",
    2026: "2026-05-14",
    2027: "2027-05-06",
  }

  const result: Array<{ judul: string; tanggalMulai: string; tanggalSelesai: null }> = []

  if (cny[year]) result.push({ judul: "Tahun Baru Imlek", tanggalMulai: cny[year], tanggalSelesai: null })
  if (nyepi[year]) result.push({ judul: "Hari Raya Nyepi", tanggalMulai: nyepi[year], tanggalSelesai: null })
  if (wafatIsa[year]) result.push({ judul: "Wafat Isa Almasih", tanggalMulai: wafatIsa[year], tanggalSelesai: null })
  if (kenaikanIsa[year]) result.push({ judul: "Kenaikan Isa Almasih", tanggalMulai: kenaikanIsa[year], tanggalSelesai: null })

  if (holidays[year]) {
    result.push(...holidays[year].map(h => ({ ...h, tanggalSelesai: null as null })))
  }

  return result
}
