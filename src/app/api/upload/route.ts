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

  const { fileName } = await req.json()
  const ext = (fileName || "image.png").split(".").pop() || "png"
  const path = `sekolah/${session.user.sekolahId}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabaseAdmin.storage.from("pgs").createSignedUploadUrl(path)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: publicUrl } = supabaseAdmin.storage.from("pgs").getPublicUrl(path)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: publicUrl.publicUrl,
    path: data.path,
    token: data.token,
  })
}
