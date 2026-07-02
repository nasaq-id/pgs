import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { auth } from "@/auth"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!session.user.sekolahId) {
    return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 400 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Storage tidak dikonfigurasi" }, { status: 500 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
  }

  if (file.size > 300 * 1024) {
    return NextResponse.json({ error: "File maksimal 300KB" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "png"
  const filename = `sekolah/${session.user.sekolahId}/${crypto.randomUUID()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error } = await supabaseAdmin.storage.from("pgs").upload(filename, buffer, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: publicUrl } = supabaseAdmin.storage.from("pgs").getPublicUrl(filename)

  return NextResponse.json({ url: publicUrl.publicUrl })
}
