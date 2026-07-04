import { db } from "@/server/db"
import { notifikasi } from "@/server/db/schema"

type NotifSession = {
  user?: {
    id?: string | null
    sekolahId?: string | null
  } | null
} | null

type NotifContext = {
  session: NotifSession
}

type NotifPayload = {
  judul: string
  pesan: string
  tipe?: "info" | "success" | "warning" | "error"
  link?: string
}

export async function createNotifikasi(ctx: NotifContext, payload: NotifPayload) {
  const sekolahId = ctx.session?.user?.sekolahId
  if (!sekolahId) return

  await db.insert(notifikasi).values({
    id: crypto.randomUUID(),
    sekolahId,
    judul: payload.judul,
    pesan: payload.pesan,
    tipe: payload.tipe ?? "info",
    link: payload.link ?? null,
  })
}
