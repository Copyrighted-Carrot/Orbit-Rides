# Orbit Rides — current project state

Last updated: **28 October 2026 (Asia/Calcutta)**. This file is the single current project-control record. Detailed evidence lives in [system audit](docs/SYSTEM_AUDIT.md), [roadmap](docs/ROADMAP.md), and [audit reports](docs/audit/coverage.md). The [previous audit](docs/audit/previous-audit.md) is historical reference and contains superseded conclusions.

## Non-negotiable owner rules

- Only **Copyrighted-Carrot <belindosamson@gmail.com>** may be Git author/committer. Never add an assistant contributor, collaborator, author, co-author trailer, bot account, service identity or GitHub Action. If attribution is unclear, stop the Git/GitHub operation and ask the owner.
- Audit → document → plan → discuss → implement → test → document → commit. No major implementation until the audit/roadmap is discussed.
- Preserve useful features; questionable feature deletion needs discussion. Ambiguous business logic is **NEEDS DECISION**.
- Never commit secrets or run destructive schema reset against valuable data. Maintain this state after meaningful changes and before handoff/context limits.

## Project overview and architecture

Orbit Rides is a car rental platform with customer search/details/checkout/history/profile and administrative fleet/dashboard/booking screens. It currently behaves as an incomplete demonstration around a real Supabase data layer. Engineering production-readiness assessment: 2/10.

Next.js 15.0.1 App Router / React 19 release candidate / TypeScript monolith. Server Components, Client Components and Server Actions use Supabase Auth/Postgres/Storage with anon key plus session cookies. Server middleware and RLS provide real but flawed access boundaries. Leaflet/OSM supplies map selection; FilePond uploads images; QR + polling/Realtime simulates payment; Groq supplies one real model endpoint. No real payment ledger/provider integration, webhooks, job runner, event timeline or live GPS tracking.

Major libraries: Tailwind 3 + DaisyUI 4, Framer Motion alpha, next-themes, React Select/Datepicker/Toastify/Icons/Spinners, Swiper, Leaflet/React Leaflet/geosearch, Supabase SSR/JS, QRCode, FilePond, Sharp. Stripe and Turnstile are installed but unused. clsx is imported directly through a transitive install and needs explicit declaration. Runtime tested here: Node 24.18.0/npm 11.16.0; clean install/support policy still pending.

## Repository map

Repository root: D:/Orbit Rides/Orbit Rides (the parent folder is not a Git repository).

- app/(app): public landing and featured fleet.
- app/customer: customer rental-search form.
- app/(dashboard)/customer: cars, booking steps 1–3, history, profile and settings.
- app/(dashboard)/admin: dashboard, fleet CRUD/archive/upload, booking status.
- app/auth and app/pages: Auth actions/routes and shared forms.
- app/payment and app/api/payment: QR confirmation simulation/status API.
- app/api/ai: Groq trip-planner proxy.
- app/components: shared UI and partially integrated/demo widgets.
- lib/supabase, lib/util, lib/types: session clients, availability/formatting, domain display types.
- supabase: config and three migrations; database.types.ts is inconsistent with supplied SQL.
- public: assets; used large hero and production logos remain.
- docs: independent audit, detailed findings, historical reference and roadmap.

## Environment requirements

Required app variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.
Optional application paths: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_OAUTH_REDIRECT_URL, GROK_API_KEY (calls Groq).
Supabase config has optional local/provider placeholders listed in docs/audit/security-schema.md. Do not infer hosted settings from local config. Secret values were not recorded in reports. Baseline local history tracks no .env files/private-key filenames; ignore rules now cover general env and common credential files. This is not proof all historical or deployed credentials are safe.

## Authentication and database

Email/password goes through Supabase; roles are stored in user_roles. Admin email signup action is already disabled, but migration 002's auth trigger trusts signup role metadata, permitting a direct-API escalation if deployed. Middleware falls back to editable metadata and can allow unknown roles. PKCE callback redirects without exchanging/preserving the code; redirects also lose refreshed cookies. Action-level role guards and account lifecycle states are incomplete.

Tables: user_roles, user_profiles, car_types, cars, bookings, reviews, wishlists, recently_viewed, notifications, discount_codes, payment_sessions.
Bookings reference auth.users/cars; profiles independently reference auth.users, with no supplied booking/profile relation. Text date ranges, unrestricted own-booking INSERT/UPDATE, nonunique checkout_id and no atomic overlap guard undermine correctness. Fleet/user cascades can destroy history. Payment sessions have public read/update policies. Migration 001 assumes base tables; 002 drops/rebuilds tables and loses several old triggers. Live schema/grants/Storage are unverified.

## Feature inventory

- KEEP + FIX: email authentication foundation, fleet create/edit/archive, galleries, useful filters/forms, profile/settings, real count queries and loading/error shells.
- REBUILD business boundary: reservation/availability, server pricing, checkout, receipt/history, status transitions, payment confirmation and lifecycle tracking.
- PARTIALLY REAL: browse, uploads, profile totals, cancellation, wishlist, trip planning, comparison and admin reporting.
- SIMULATED: QR payment, revenue trend, local damage demo, keyword assistants.
- FAKE/HARDCODED: landing metrics/testimonials/operational guarantees, empty booked-date calendar, generic specifications, synthetic scores and old cost/recommendation assumptions.
- BROKEN/UNWIRED: PKCE, admin customer embed, receipt location rendering, cancellable-history event handler, resume/detail links, reviews input, recently-viewed writes, notification reads.
- ABSENT: real payments/refunds, checkout ledger, event timeline, GPS/dispatch, host payouts and automated identity/insurance verification.
- REMOVE candidates requiring discussion: four unreferenced shared components (AiTripPlanner, SmartCarRecommender, TripCostCalculator, VoiceBookingAssistant), unused role/checkout/car-carousel helpers and optional demo widgets/dependencies. They remain in source.

Full feature dispositions and every discovered finding are in docs/audit/security-schema.md (AUTH/DB/PROFILE IDs), booking-admin.md (BA IDs), frontend-features.md (FE IDs), and SYSTEM_AUDIT.md (OPS-01). These registers are part of this state record; do not substitute the older audit's bug list.

## Main broken flows, security and data-integrity issues

1. Direct signup metadata → trusted admin role (AUTH-01).
2. Client table writes → forged own-booking price/status/payment/date/car data (DB-01).
3. Public payment-session table → enumeration and arbitrary updates (DB-02).
4. URL JSON → receipt GET → confirmed booking insert without payment/price verification (BA-01).
5. Availability checks see only caller's records; separate check/insert races; invalid/query-error cases fail open (BA-02).
6. Location object → invalid React child after possible insert; cancellable history → illegal Server Component onClick (BA-05/06).
7. Admin bookings → unsupported profile embed → swallowed error/empty list (BA-07).
8. Receipt retry/refresh → self-conflict or duplicate; no checkout uniqueness/expiry enforcement (BA-08/09).
9. Delete fleet → cascade history loss; media deletion can partially fail (BA-10).
10. No state machine/event history/payment ledger; paid/revenue claims are not settlement (BA-11/17).
11. Normal-price vehicles bypass filters; date/status eligibility absent; location denial stalls search (FE-01/02/03).
12. Unauthenticated/unbounded model proxy and unvalidated output (FE-04/05).
13. Next 15.0.1 and other dependencies have current critical/high advisories (OPS-01).

No literal cross-user overwrite was demonstrated: source creates overlapping INSERTs. Correct own-row RLS still constrains ownership, while commercial fields remain unsafe. Deployment-specific exploitability has not been tested.

## Technical debt and UI/UX

Schema drift is hidden by retries removing missing columns; types disagree with SQL. Errors often become zero/empty/success states. Price/date logic is duplicated. Wishlist local storage differs from DB counts. Lists lack pagination and aggregates can hit row caps. Uploaded media lacks a complete cleanup/validation contract. Some user data is read from stale auth metadata instead of profile rows.

Current brand uses repeated luxury claims/emerald/glass/gradient treatments. Used hero is 70.92 MiB with path-case mismatch and no poster; logos total 6.49 MiB. Input labels, named buttons, dialog focus, keyboard controls, contrast/motion and responsive widgets require work. Source-specific details and SEO/content inconsistencies are in FE-11–14. No new palette or design system was selected.

## Decisions made and rejected

Made: independent evidence review; preserve historical audit with corrections; retain Next/Supabase foundation pending discussion; short-lived topic branches; neutral project state; archive only proven unreferenced legacy assets; no feature deletion or functional rewrite this pass; owner-only attribution.

Rejected for current work: big-bang rewrite, assuming UI/build proves a workflow, treating simulated payment as settlement, executing reset SQL on real data, adding bots/Actions/contributors, claiming live policies match migrations, publishing under an unverified identity.

NEEDS DECISION: single operator vs marketplace; request/manual/pay-at-pickup/online provider/deposit; daily/hourly periods/timezone/buffer; pickup/delivery/service area; timeline vs GPS; cancellation/refund/retention rules; admin provisioning; optional reviews/discounts/wishlist/AI/inspections; brand direction. Alternatives and phase dependencies: docs/ROADMAP.md.

## Work completed and files changed

- Read full pasted brief and existing project state; independently audited all authored source/configuration with detailed coverage.
- Ran lint, type check, production build, dependency audit and isolated runtime probes; performed limited local public browser checks.
- Created docs/SYSTEM_AUDIT.md, docs/ROADMAP.md and docs/audit/ evidence, coverage, dependency and cleanup records.
- Replaced stale AGENT_STATE with this current record; added AGENTS.md working rules; rewrote misleading README; expanded .gitignore.
- Preserved previous audit under docs/audit/previous-audit.md and removed provider-specific references/scaffold.
- Archived six unused legacy assets (15,986,583 bytes, 15.25 MiB) outside Git at D:/Orbit Rides/cleanup-backup-2026-10-28, with checksums/manifest. Four old logo exports and two old auth videos; current auth uses a static image. Used hero/logos retained.
- No application TS/TSX/SQL or dependency versions changed. No production data/auth/payment operation performed.

## Git branches, commits and publication

Baseline: 877c140, Initial commit, main and locally cached origin/main. Its author AND committer are Copyrighted-Carrot <belindosamson@gmail.com>. No existing other local contributor identity was found. Git read operations required an exact command-scoped safe.directory due to Windows account ownership; no global trust exception was added.

Current branch: audit/repository-review. Audit/cleanup checkpoint: 4591c0d, Document independent system audit and archive unused assets. Author and committer are Copyrighted-Carrot <belindosamson@gmail.com>; independent final review found no attribution or scope issues. No application-fix branches created.

GitHub connection is now confirmed: authenticated login Copyrighted-Carrot, email belindosamson@gmail.com. However, Projects-013/Orbit-Rides returns 404 for repository/branch reads and is absent from accessible/installed repository lists. The connection has no installation listed for Projects-013. This may be missing repository/organization access or a stale remote URL; do not infer that the repository was deleted. Local Git still has no credential for this remote. Owner was asked to enable this repository for the connection or provide its current URL. Hosted HEAD/settings/collaborators remain unverified. Fetch/reconcile before any future push. No push, PR, collaborator change, bot or history rewrite has occurred.

## Testing status and limitations

PASS: npm run lint; tsc --noEmit --incremental false; npm run build (25 static-generation tasks); npm ls --depth=0.
Dependency audit: 25 vulnerable package entries (3 critical, 13 high, 5 moderate, 4 low), not individually demonstrated exploits.
Actual availability helper with in-memory query stub rejects a visible normal overlap but allows malformed/reversed dates, failed DB reads, malformed stored dates and same-day matching ranges.
Isolated React/Next probes reproduce object-child and Server Component inline-handler errors.
Local browser: public login renders at narrow/standard widths; homepage loads public fleet; hero reports playback failure. No login/signup/booking/payment submitted.

NOT VERIFIED: fresh install; disposable migration replay; deployed RLS/grants/triggers/Storage/Auth settings; real accounts/sessions; complete customer/admin journey; two-user races; payment/refund/webhook; print preview; full accessibility/device/contrast/load testing. Generated build output and dependency files remain ignored.

Final hygiene checks: git diff --check passes; all local document links resolve; six backup hashes match; application/schema/package diffs are empty; no provider-specific references or co-author trailers remain in the repository worktree. A bounded common-key-pattern scan of baseline tracked text returned no matches, not a comprehensive secret audit. The portable audit probe (node docs/audit/availability-probe.cjs) reproduces recorded availability results without database/network access. The local preview server was stopped after the browser checks.

Known regressions: no application behavior was changed; no runtime regression observed from documentation/unused-asset cleanup. Full authenticated behavior remains untested. Existing serious defects remain unfixed intentionally pending the audit discussion.

## Work in progress, pending work and next actions

Current milestone: audit/roadmap and local cleanup complete, with final documentation/hygiene verification. GitHub account connection is verified; cleanup/publication is blocked specifically on access to the target repository (or confirmation of its new URL), not completed remotely. No unfinished database or application mutation is in progress.

Next:
1. Discuss core operating/payment/time/fulfillment/tracking decisions and audit priorities.
2. Enable Projects-013/Orbit-Rides for the GitHub connection or confirm the current repository URL. Then verify remote branch/collaborator state, fetch/reconcile and publish the reviewed cleanup branch with owner-only attribution. Do not change origin or create a replacement repository based on a guess.
3. Obtain read-only Supabase schema/RLS/grants/Storage export and database/media backup; prepare isolated test data.
4. Phase 0 dependency/schema stabilization and phase 1 security boundaries; then atomic booking, checkout, timeline/admin/customer, simplification, redesign and hardening per roadmap.
5. Update this state with each approved change and real test result; preserve unresolved limitations rather than declaring all flows verified.
