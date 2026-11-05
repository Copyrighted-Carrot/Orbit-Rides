# Orbit Rides

Orbit Rides is a car rental application with customer browsing and booking screens and an administrative fleet dashboard. It is undergoing a functional and security audit and is **not ready for real reservations or payments**.

Start with [project state](AGENT_STATE.md), the [system audit](docs/SYSTEM_AUDIT.md), and the [implementation roadmap](docs/ROADMAP.md). The audit documents which features work, which are simulated, and what must change before release.

## Stack

Next.js App Router, React, TypeScript, Supabase Auth/Postgres/Storage, Tailwind CSS/DaisyUI, Leaflet, FilePond, and Framer Motion. The checked-in checkout uses a QR simulation.

## Local development

1. Use Node 24.22.2 LTS and its bundled npm 11.19.1. With nvm, run `nvm install` and `nvm use` from the repository root.
2. Run `npm ci` to install the committed lockfile.
3. Supply a local `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for your development project. Optional settings include `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL`, and the server-only `GROK_API_KEY` for Groq.
4. Run `npm run lint`, `npm run typecheck`, and `npm run build`. Use `npm run dev` to start the development server.

**Do not replay the supplied migrations against valuable data.** Migration 001 assumes missing base tables; migration 002 drops and rebuilds tables. Back up and reconcile the actual schema before any migration. Storage bucket policies are not included.

Build and lint success do not validate bookings, payments, permissions, or the hosted database. See the audit's explicit coverage and limitations.

## Project ownership

Maintained by Belindo Samson S. (`belindosamson@gmail.com`). All project commits must use the owner's authorized identity. Do not add assistant identities, co-author trailers, bot contributors, or collaborators. Changes to application behavior follow audit → document → plan → discuss → implement → test → document → commit.

## License
[MIT](LICENSE).
