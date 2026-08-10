Baik, saya akan explore codebase secara menyeluruh untuk memahami arsitektur, struktur, dan pola yang digunakan. Ini akan membantu saya ketika mulai implementasi roadmap performance nanti.
✓Explore Task — Explore project structure
↳ 34 toolcalls · 2m 21s
✓Explore Task — Explore database and API layer
↳ 37 toolcalls · 1m 51s
✓Explore Task — Explore frontend architecture
↳ 48 toolcalls · 3m 51s
✓Explore Task — Explore auth and tenant system
↳ 50 toolcalls · 4m 4s
✓Explore Task — Explore current performance patterns
↳ 32 toolcalls · 2m 37s
✓Explore Task — Explore lint and code quality
↳ 53 toolcalls · 12m 43s
ctrl+x down view subagents
+ Thought: 849ms
📊 Codebase Exploration Complete
Saya sudah explore codebase secara menyeluruh. Berikut rangkumannya:
🏗️ Arsitektur & Tech Stack
Core Technology
- Next.js 16.2.10 (App Router, React 19.2)
- TypeScript 5 (strict mode enabled, 0 type errors)
- Drizzle ORM (PostgreSQL, 42 tabel)
- tRPC 11 (31 routers, end-to-end type safety)
- TanStack React Query 5 (data fetching & caching)
- NextAuth v5 (JWT strategy, 8-hour sessions)
- Tailwind CSS 4 + shadcn/ui v4 (base-nova style)
Key Features
- Multi-tenant: School-based isolation (sekolahId di 38+ tabel)
- 6 user roles: super_admin, admin_sekolah, guru, siswa, tu, yayasan
- PWA-enabled: Service worker, push notifications, installable
- Heavy libs lazy-loaded: PDF (jspdf), Excel (xlsx), QR scanner, charts (recharts)
📁 Project Structure
pgs/
├── src/
│   ├── app/
│   │   ├── (dashboard)/        # 20 route groups (absensi, akademik, keuangan, dll)
│   │   ├── api/                # NextAuth, tRPC, cron, payment webhooks
│   │   └── login/
│   ├── components/
│   │   ├── ui/                 # 22 shadcn/ui primitives
│   │   ├── layout/             # Sidebar, Topbar, MainLayout
│   │   ├── providers/          # Session, PWA, Push (deferred)
│   │   └── [domain]/           # siswa/, guru/, absensi/, keuangan/, dll
│   ├── server/
│   │   ├── api/
│   │   │   ├── routers/        # 31 tRPC routers
│   │   │   ├── root.ts         # App router composition
│   │   │   └── trpc.ts         # Context, procedures, rate limiting
│   │   └── db/
│   │       ├── schema/         # 42 Drizzle schema files
│   │       └── migrations/
│   ├── lib/                    # tRPC client, cache, redis, cloudinary
│   ├── hooks/                  # useOptimisticRemove, useWilayah
│   └── auth.ts                 # NextAuth config
├── public/                     # sw.js, PWA icons, manifest
├── scratch/                    # Legacy reference code (excluded from lint/TS)
└── docs/                       # PERFORMANCE_ROADMAP.md
🚨 Performance Status
✅ Sudah Dioptimasi (Fase 0 - Quick Wins)
- Sidebar prefetch disabled (prefetch={false})
- Heavy libs lazy-loaded (PDF, Excel, QR, ZIP, scanner)
- Framer Motion removed dari shared shell
- Topbar polling reduced, refetchOnWindowFocus: false globally
- siswa.getLookup endpoint (kolom minimal)
- Dashboard cache differentiated by user role
- Service worker excludes /_next/* dan RSC payloads
⚠️ Performance Bottlenecks Identified
1. Monolithic Components (2000+ lines)
- absensi-page.tsx: 2,571 lines
- SiswaListView.tsx: 1,861 lines (no virtualization!)
- buku-nilai/page.tsx: 1,245 lines
2. No Table Virtualization
- SiswaListView renders ALL rows → scroll jank di mobile
- Attendance tables, grade tables juga no virtualization
3. eager imports di beberapa tempat
- jspdf, xlsx, jszip sudah dynamic import (good)
- Tapi recharts (~200KB) only di 1 file (good)
- framer-motion masih di 3 pages (minor issue)
4. React Query Cache
staleTime: 60s, gcTime: 10min, refetchOnWindowFocus: false
Good config, tapi export const dynamic = "force-dynamic" di dashboard layout disable RSC caching
5. No Bundle Analysis
- @next/bundle-analyzer belum di-setup (Fase 5)
🔐 Auth & Multi-Tenancy
Auth Flow
- Credentials provider (email/password)
- JWT strategy, 8-hour session
- bcrypt password hashing
- Rate limiting: 5 attempts/15 min per account (Redis-backed)
Tenant Isolation
- Row-level: sekolahId di 38+ tabel
- App-layer enforcement: getSekolahIdFilter(ctx) di setiap router
- Super-admin impersonation: Cookie-based (impersonated_sekolah_id)
Security Concerns
- ✅ bcrypt + rate limiting
- ✅ Input sanitization (HTML stripping)
- ✅ Edge middleware rate limiting
- ⚠️ No Row-Level Security (RLS) di Postgres (app-layer only)
- ⚠️ JWT role staleness (role changes require re-login)
- ⚠️ Impersonation cookie client-settable (tapi hanya super_admin)
🔍 Lint & Code Quality Status
Current Status
- TypeScript: ✅ Strict mode, 0 errors
- ESLint: ⚠️ 68 warnings, 0 errors (31 files)
- 64× @typescript-eslint/no-unused-vars (unused imports/variables)
- 4× react-hooks/exhaustive-deps (missing dependencies)
Top Offending Files
1. evaluasi/buku-nilai/page.tsx: 7 warnings
2. manajemen/id-card/page.tsx: 5 warnings
3. server/api/routers/jadwal.ts: 5 warnings
4. server/api/routers/pengumuman.ts: 5 warnings
5. server/api/routers/super-admin.ts: 5 warnings
Missing Tools
- ❌ Prettier (no formatting enforcement)
- ❌ Husky + lint-staged (no pre-commit hooks)
- ❌ CI lint gate (warnings don't block deploy)
scratch/ Directory
- Legacy reference code dari Google AI Studio prototype
- ~32K lines, excluded dari lint & TypeScript
- Bisa dihapus jika tidak dipakai lagi
