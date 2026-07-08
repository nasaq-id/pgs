/**
 * Uploads a file to Cloudinary using unsigned upload preset.
 * Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local.
 */
export async function uploadToCloudinary(file: File, folderName?: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Konfigurasi Cloudinary belum lengkap. Silakan atur NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di file .env.local Anda."
    )
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  if (folderName) {
    formData.append("folder", folderName)
  }

  console.log(`☁️ [Cloudinary] Memulai upload file: ${file.name} (Tipe: ${file.type}, Ukuran: ${(file.size / 1024).toFixed(2)} KB)`)
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("❌ [Cloudinary] Upload Gagal:", errorData.error?.message || "Kesalahan HTTP")
    throw new Error(errorData.error?.message || "Gagal mengupload file ke Cloudinary")
  }

  const data = await response.json()
  console.log("✅ [Cloudinary] Upload Sukses! URL Foto:", data.secure_url)
  return data.secure_url
}
