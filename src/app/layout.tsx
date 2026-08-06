import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.css"
import { TRPCProvider } from "@/lib/trpc/provider"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "Sistem Manajemen Lembaga",
    template: "%s | Sistem Manajemen Lembaga",
  },
  description: "Sistem Informasi Manajemen Sekolah",
  manifest: "/manifest",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sistem Manajemen Lembaga",
  },
}

export const viewport: Viewport = {
  themeColor: "#f5f3f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${fontSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        <meta name="screen-orientation" content="portrait" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col">
        <TRPCProvider>
          {children}
        </TRPCProvider>
        <Toaster richColors position="top-right" />
        <SpeedInsights />
      </body>
    </html>
  )
}
