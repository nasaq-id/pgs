export const compressImage = (
  file: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file instanceof File && !file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Gagal membaca file berkas"))
        }
      }
      reader.onerror = (error) => reject(error)
      return
    }

    const processImageSrc = (src: string) => {
      const img = new Image()
      img.src = src
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(src)
          return
        }

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, width, height)

        let compressedDataUrl = canvas.toDataURL("image/webp", quality)

        if (compressedDataUrl.length > 300000) {
          compressedDataUrl = canvas.toDataURL("image/webp", quality - 0.2)
        }

        resolve(compressedDataUrl)
      }
      img.onerror = (error) => reject(error)
    }

    if (typeof file === "string") {
      if (file.startsWith("data:application/pdf")) {
        resolve(file)
        return
      }
      processImageSrc(file)
    } else {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        if (event.target?.result) {
          processImageSrc(event.target.result as string)
        } else {
          reject(new Error("Gagal membaca file gambar"))
        }
      }
      reader.onerror = (error) => reject(error)
    }
  })
}
