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
  const year = parseInt(parts.find((p) => p.type === "year")?.value || "1970", 10)
  const month = parseInt(parts.find((p) => p.type === "month")?.value || "1", 10)
  const day = parseInt(parts.find((p) => p.type === "day")?.value || "1", 10)
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
}

/** Jakarta "HH:mm" of a Date as minutes since midnight. */
export function getSchoolTime(date: Date) {
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
