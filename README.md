# Orbit Rides

Orbit Rides is a car rental application with customer browsing and booking screens and an administrative fleet dashboard. It is undergoing a functional and security audit and is **not ready for real reservations or payments**.

Start with [project state](AGENT_STATE.md), the [system audit](docs/SYSTEM_AUDIT.md), and the [implementation roadmap](docs/ROADMAP.md). The audit documents which features work, which are simulated, and what must change before release.

## Stack

Next.js App Router, React, TypeScript, Supabase Auth/Postgres/Storage, Tailwind CSS/DaisyUI, Leaflet, FilePond, and Framer Motion. The checked-in checkout is a QR confirmation simulation. Stripe and Turnstile packages are present but are not integrated into the application.

## Local development

The current baseline was checked with Node 24.18.0 and npm 11.16.0. This records the audit environment, not a supported runtime policy. Dependency upgrades and a reproducible installation baseline are pending.

1. Install dependencies using the committed lockfile. Resolve React prerelease/peer compatibility during stabilization; do not delete the lockfile to suppress errors.
2. Supply a local `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never commit secrets. Optional settings are `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL`, and `GROK_API_KEY` (the last currently calls Groq).
3. Run `npm run dev`. Validation commands are `npm run lint`, `npx tsc --noEmit --incremental false`, and `npm run build`.

**Do not replay the supplied migrations against valuable data.** Migration 001 assumes missing base tables; migration 002 drops and rebuilds tables. Back up and reconcile the actual schema before any migration. Storage bucket policies are not included.

Build and lint success do not validate bookings, payments, permissions, or the hosted database. See the audit's explicit coverage and limitations.

## Project ownership

Maintained by Belindo Samson S. (`belindosamson@gmail.com`). All project commits must use the owner's authorized identity. Do not add assistant identities, co-author trailers, bot contributors, or collaborators. Changes to application behavior follow audit → document → plan → discuss → implement → test → document → commit.

## License
[MIT](LICENSE).
