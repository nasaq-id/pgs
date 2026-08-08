<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vercel Deployment (user's account)

User manages all deploys via **Vercel CLI** on this machine. Other agents "can't" do it — follow this workflow.

- CLI: `vercel` (v58+), logged in as `agds-alt`, team `agds-alts-projects` (teamId `team_NpSTRzucxjewUpftDhu59izn`). API token: `~/.local/share/com.vercel.cli/auth.json`.
- Projects: `pgs` (repo `nohypelabs/pgs`, prod alias **https://portalgunasekolah.vercel.app**; also `pgs-amber.vercel.app`), `wc-checks-v2` (prod https://ceklis01.vercel.app), `ai-lisency`, `maintenance-report`, `serat69`, dll.
- `pgs` is Git-connected: **push to `main` auto-deploys** (no manual deploy needed).
- Deploy manually when needed: `bash scripts/deploy.sh` (link + sync env dari `.env.local` + `vercel deploy --prod --yes`).
- Env vars: `vercel env add NAME production --force` (nilai lewat stdin). `CRON_SECRET`/`PAYMENT_WEBHOOK_SECRET` ada di `.env.local` (nilai asli, bukan placeholder).
- Alias: `vercel alias set <deploy-url> <domain>` (butuh `vercel domains inspect` dulu untuk cek akses).
- Promote preview → production: `vercel promote --yes <preview-url>` (re-build pakai env production).
- **Deployment Protection (SSO)**: kadang aktif (`ssoProtection: {"deploymentType":"all_except_custom_domains"}`) dan memblokir manifest/sw.js/PWA — matikan via REST API (bukan CLI): `curl -X PATCH "https://api.vercel.com/v9/projects/<name>?teamId=team_NpSTRzucxjewUpftDhu59izn" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"ssoProtection": null}'`.
- Cek deployment: `vercel ls <project>`; status via `curl -s -o /dev/null -w '%{http_code}' -L <url>` — hati-hati: 302 ke `vercel.com/sso-api` = SSO masih aktif (palsukan hasil 200 dengan `-L`).

