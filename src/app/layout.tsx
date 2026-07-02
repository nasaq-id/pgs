import type { Metadata, Viewport } from "next"
import "./globals.css"

const fontVariables = "font-sans"

export const metadata: Metadata = {
  title: "EduManage - PGS",
  description: "Sistem Informasi Manajemen Sekolah",
  manifest: "/manifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "EduManage",
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${fontVariables}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
