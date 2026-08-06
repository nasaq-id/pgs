import { db } from "@/server/db"
import { pengaturanKalender, kalenderEvent } from "@/server/db/schema"
import { eq, and, lte, or, gte, isNull } from "drizzle-orm"

/**
 * Shared server-side datetime helpers for the school domain.
 *
 * The app stores "tanggal" (attendance day) as a UTC-midnight Date that
 * represents a *Jakarta (Asia/Jakarta, UTC+7) calendar day*. All insert and
 * query paths must normalise via {@link getSchoolDayDate} so that browser/server
 * timezone differences never shift a recorded day by ~7 hours (which caused
 * manually-entered attendance to miss the /rekap page).
 */

/** Convert any Date to the UTC-midnight Date representing its Jakarta calendar day. */
export function getSchoolDayDate(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
  const parts = formatter.formatToParts(date)
  const y = parseInt(parts.find((p) => p.type === "year")?.value || "1970", 10)
  const m = parseInt(parts.find((p) => p.type === "month")?.value || "1", 10)
  const d = parseInt(parts.find((p) => p.type === "day")?.value || "1", 10)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0))
}

function getSchoolTime(date: Date): { hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10)
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10)
  return { hour, minute }
}

export function getMinutesSinceMidnightInSchoolTime(date: Date): number {
  const { hour, minute } = getSchoolTime(date)
  return hour * 60 + minute
}

/** Calculate the count and dates of school effective days, excluding weekly holidays and calendar holiday events. */
export async function getHariEfektif(
  sekolahId: string,
  startDate: Date,
  endDate: Date,
  role: "siswa" | "guru" = "siswa"
): Promise<{ count: number; dates: string[] }> {
  // 1. Fetch weekly holidays configuration (siswa only; guru pakai aturannya sendiri)
  let weeklyHolidays: string[] = ["sabtu", "minggu"]

  if (role === "siswa") {
    const settings = await db.query.pengaturanKalender.findFirst({
      where: eq(pengaturanKalender.sekolahId, sekolahId),
    })

    if (settings?.hariLiburMingguan) {
      try {
        weeklyHolidays = JSON.parse(settings.hariLiburMingguan)
      } catch (e) {
        console.error("Failed to parse weekly holidays:", e)
      }
    }
  }

  // Convert to lowercase
  weeklyHolidays = weeklyHolidays.map((d) => d.toLowerCase())

  // 2. Fetch calendar holiday events overlapping the range
  const holidays = await db.query.kalenderEvent.findMany({
    where: and(
      eq(kalenderEvent.sekolahId, sekolahId),
      or(
        eq(kalenderEvent.tipe, "libur"),
        eq(kalenderEvent.isLiburNasional, true)
      ),
      lte(kalenderEvent.tanggalMulai, endDate),
      or(
        gte(kalenderEvent.tanggalSelesai, startDate),
        isNull(kalenderEvent.tanggalSelesai)
      )
    )
  })

  // Normalize holiday dates
  const calendarHolidays = new Set<string>()
  for (const h of holidays) {
    const s = getSchoolDayDate(h.tanggalMulai)
    const e = h.tanggalSelesai ? getSchoolDayDate(h.tanggalSelesai) : s

    const curr = new Date(s)
    while (curr <= e) {
      calendarHolidays.add(curr.toISOString().split("T")[0])
      curr.setUTCDate(curr.getUTCDate() + 1)
    }
  }

  // 3. Loop calendar days
  const DAYS_OF_WEEK = ["minggu", "senin", "selasa", "rabu", "kamis", "jumat", "sabtu"]
  const dates: string[] = []

  const current = new Date(startDate)
  const limit = new Date(endDate)

  while (current <= limit) {
    const dayOfWeek = current.getUTCDay()
    const dayName = DAYS_OF_WEEK[dayOfWeek]
    const dateStr = current.toISOString().split("T")[0]

    const isWeeklyHoliday = weeklyHolidays.includes(dayName)
    const isCalendarHoliday = calendarHolidays.has(dateStr)

    if (!isWeeklyHoliday && !isCalendarHoliday) {
      dates.push(dateStr)
    }

    current.setUTCDate(current.getUTCDate() + 1)
  }

  return {
    count: dates.length,
    dates,
  }
}
