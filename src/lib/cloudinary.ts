/**
 * Uploads a file to Cloudinary using unsigned upload preset.
 * Requires NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.local.
 *
 * Opsi kompresi: bila `maxSize` diberikan dan file lebih besar dari itu,
 * gambar akan di-resize (maks `maxDim` px) dan di-compress ke JPEG agar
 * tidak memakan kuota storage Cloudinary.
 */
export interface UploadOptions {
  /** Batas maksimal ukuran file dalam byte. Bila terlewati, gambar di-compress. */
  maxSize?: number
  /** Dimensi maksimal (lebar/tinggi) dalam px sebelum di-compress. */
  maxDim?: number
  /** Kualitas awal JPEG (0.1 - 1). */
  quality?: number
  /** ID Sekolah untuk mempartisi folder Cloudinary per tenant. */
  sekolahId?: string
}

export async function compressImage(
  file: File,
  maxSize: number,
  maxDim = 800,
  startQuality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim
          width = maxDim
        } else {
          width = (width / height) * maxDim
          height = maxDim
        }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)

      const tryCompress = (quality: number) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Gagal mengompres gambar"))
            return
          }
          if (blob.size <= maxSize || quality <= 0.1) resolve(blob)
          else tryCompress(quality - 0.1)
        }, "image/jpeg", quality)
      }
      tryCompress(startQuality)
    }
    img.onerror = () => reject(new Error("Gagal memuat gambar"))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Menambahkan transformasi Cloudinary (resize + format otomatis) pada URL
 * gambar agar ukuran terkirim proporsional dengan kebutuhan render.
 * Aman untuk URL non-Cloudinary: dikembalikan apa adanya.
 */
export function optimizeImageUrl(
  url: string | null | undefined,
  width = 96
): string {
  if (!url) return ""
  const marker = "/image/upload/"
  const idx = url.indexOf(marker)
  if (idx === -1) return url
  return `${url.slice(0, idx + marker.length)}w_${width},q_auto,f_auto/${url.slice(idx + marker.length)}`
}

export async function uploadToCloudinary(  file: File,
  folderName?: string,
  options?: UploadOptions
): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Konfigurasi Cloudinary belum lengkap. Silakan atur NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME dan NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET di file .env.local Anda."
    )
  }

  let uploadFile: File | Blob = file
  const maxSize = options?.maxSize
  if (maxSize && file.size > maxSize) {
    const blob = await compressImage(file, maxSize, options?.maxDim ?? 1000, options?.quality ?? 0.9)
    uploadFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
  }

  const formData = new FormData()
  formData.append("file", uploadFile)
  formData.append("upload_preset", uploadPreset)
  
  // Scope folder name with sekolahId prefix if available
  const sekolahId = options?.sekolahId
  const finalFolder = sekolahId 
    ? (folderName ? `${sekolahId}/${folderName}` : sekolahId)
    : folderName

  if (finalFolder) {
    formData.append("folder", finalFolder)
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
