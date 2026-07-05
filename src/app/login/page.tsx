"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, GraduationCap, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const emailVal = form.get("email")
    
    try {
      const res = await signIn("credentials", {
        email: emailVal,
        password: form.get("password"),
        redirect: false,
      })

      if (res?.error) {
        console.error("Login Gagal. Response error:", res.error)
        toast.error("Login Gagal: Email, NISN, atau password salah.")
        setError("Email atau password salah")
        setLoading(false)
      } else {
        console.log("Login Berhasil! Mengalihkan pengguna...")
        toast.success("Login Berhasil! Selamat datang.")
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      console.error("Fatal login error:", err)
      toast.error("Terjadi kesalahan sistem saat mencoba masuk.")
      setError("Terjadi kesalahan sistem")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-primary/5" />
      <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />

      <div className="w-full max-w-md glass-card rounded-3xl p-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm shadow-primary/20">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">EduManage</h1>
            <p className="text-sm text-muted-foreground mt-1">Sistem Informasi Manajemen Sekolah</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email / Username / NISN</Label>
            <Input
              id="email"
              name="email"
              type="text"
              placeholder="Email, NIP, atau NISN siswa"
              required
              className="h-11 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                className="h-11 rounded-xl bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-200 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="default"
            size="lg"
            className="w-full h-11 rounded-xl font-semibold shadow-sm shadow-primary/20 transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Masuk
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground/60">
          Portal Garda Sekolah
        </p>
      </div>
    </div>
  )
}
