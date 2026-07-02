import type { Metadata } from "next"
import "./globals.css"

const fontVariables = "font-sans"

export const metadata: Metadata = {
  title: "EduManage - PGS",
  description: "Sistem Informasi Manajemen Sekolah",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${fontVariables}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
