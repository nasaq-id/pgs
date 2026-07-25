import { z } from "zod"

const HTML_TAG_RE = /<[^>]*>/g
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function stripHtml(value: string) {
  return value.replace(HTML_TAG_RE, "").replace(CONTROL_CHAR_RE, "").trim()
}

const sanitize = (max: number) => (value: unknown) => {
  if (typeof value !== "string") return value
  return stripHtml(value).slice(0, max)
}

export function sanitizedString(max = 255) {
  return z.string().transform(sanitize(max))
}

export function requiredSanitizedString(max = 255, min = 1) {
  return z.string().min(min).max(max).transform(sanitize(max))
}

export function nullableSanitizedString(max = 255) {
  return z.string().max(max).nullable().optional().transform(sanitize(max))
}

export function sanitizedText(max = 5000) {
  return nullableSanitizedString(max)
}

export function sanitizedEmail() {
  return z.string().email().max(320).transform((v) => stripHtml(v).toLowerCase().slice(0, 320))
}

export const schemas = {
  name: requiredSanitizedString(100),
  description: nullableSanitizedString(500),
  text: sanitizedText(),
  email: sanitizedEmail(),
} as const
