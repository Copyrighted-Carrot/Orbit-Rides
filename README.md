# Orbit Rides

Orbit Rides is a single-operator car rental portfolio application undergoing controlled reconstruction. It is **not ready for real reservations or payments**. The new payment model is a clearly labelled demo simulation.

Start with [project state](AGENT_STATE.md), the [system audit](docs/SYSTEM_AUDIT.md), and the [implementation roadmap](docs/ROADMAP.md). The audit documents which features work, which are simulated, and what must change before release.

## Stack

Next.js App Router, React, TypeScript, Supabase Auth/Postgres/Storage, Tailwind CSS/DaisyUI, Leaflet, FilePond, and Framer Motion. The checked-in checkout uses a QR simulation.

## Local development

1. Use Node 24.22.2 LTS and its bundled npm 11.19.1. With nvm, run `nvm install` and `nvm use` from the repository root.
2. Run `npm ci` to install the committed lockfile.
3. Supply a local `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for your development project. Optional settings include `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL`, and the server-only `GROK_API_KEY` for Groq.
4. Run `npm run lint`, `npm run typecheck`, and `npm run build`. Use `npm run dev` to start the development server.

The [clean database foundation](database/clean/README.md) is a separate, tested chain for an empty Supabase PostgreSQL 17 project. It includes authorized commands, row-level policies, reservation integrity, demo payment events and protected media validation. The legacy application is being integrated one feature chain at a time.

**Do not replay `supabase/migrations` against valuable data.** Its migration 001 assumes missing base tables and 002 drops/rebuilds tables. Those files are historical artifacts, not the deployed ledger or the clean reconstruction path. Do not run `db push` from this legacy configuration. The historical Rental project and its external recovery copies must remain untouched.

Build and lint success do not validate bookings, payments, permissions, or the hosted database. See the audit's explicit coverage and limitations.

## Account configuration

Set `NEXT_PUBLIC_SITE_URL` to the exact canonical application origin, including the local port. Add the matching callback URL to the isolated project's Supabase Auth redirect allowlist. Confirmation and recovery routes preserve session cookies and redirect to this configured origin. Mixing `localhost` and `127.0.0.1` loses host-scoped browser cookies.

Email/password signup creates customer accounts only. Roles come from `user_roles`; editable names come from `user_profiles`. Profile and password-change forms reject submissions from a different account than the one that opened the form. Google login is hidden by default; `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` requires a separately configured and verified provider.

Application HTTP clients refuse requests to the historical Rental project. Keep the usual local environment unchanged until an explicit environment cutover; use a separate source/build and process-level staging overrides for integration checks. Do not reuse production Auth identities or sessions.

Run `node --test tests/auth-contract.test.mjs` with the pinned Node version for archive protection, safe return paths, canonical origin and password-boundary checks. Hosted Auth/Storage tests are described in the clean database README. Browser checks must cover confirmation, recovery, stale forms and account switching in addition to login.

## Project ownership

Maintained by Belindo Samson S. (`belindosamson@gmail.com`). All project commits must use the owner's authorized identity. Do not add assistant identities, co-author trailers, bot contributors, or collaborators. Changes to application behavior follow audit → document → plan → discuss → implement → test → document → commit.

## License
[MIT](LICENSE).
