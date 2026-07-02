import { z } from "zod"

const HTML_TAG_RE = /<[^>]*>/g
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export function stripHtml(value: string) {
  return value.replace(HTML_TAG_RE, "").replace(CONTROL_CHAR_RE, "").trim()
}

export function sanitizedString(max = 255) {
  return z.preprocess(
    (value) => (typeof value === "string" ? stripHtml(value).slice(0, max) : value),
    z.string().max(max),
  )
}

export function requiredSanitizedString(max = 255, min = 1) {
  return z.preprocess(
    (value) => (typeof value === "string" ? stripHtml(value).slice(0, max) : value),
    z.string().min(min).max(max),
  )
}

export function nullableSanitizedString(max = 255) {
  return sanitizedString(max).nullable().optional()
}

export function sanitizedText(max = 5000) {
  return nullableSanitizedString(max)
}

export function sanitizedEmail() {
  return z.preprocess(
    (value) => (typeof value === "string" ? stripHtml(value).toLowerCase().slice(0, 320) : value),
    z.string().email().max(320),
  )
}
