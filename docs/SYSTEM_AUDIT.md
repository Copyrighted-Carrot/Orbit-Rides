# Orbit Rides — independent system audit

**Date:** 28 October 2026. **Baseline:** `877c140` (Initial commit). **Working branch:** `audit/repository-review`.

## Overall health

**Production readiness: 2/10, an engineering judgment rather than a measured score.** The application builds, has genuine Supabase authentication and fleet operations, and contains useful UI components. Its commercial workflow is unsafe: a receipt request creates a client-priced confirmed booking, payment is simulated, overlapping reservations are not prevented, and the supplied database policies permit privilege and business-data tampering. A polished page does not establish a usable rental service.

The most useful next milestone is one trustworthy rental journey: eligible inventory → server-priced reservation → honest payment/confirmation state → reloadable receipt/history → controlled admin fulfillment → cancellation/return history. Defer additional AI widgets and the full visual redesign until that contract is agreed and implemented.

This audit covers the repository, not every condition in the hosted service. No accounts were created, no bookings/payments were submitted, no database migrations ran, and no live vulnerability was exploited. Live schema/RLS/Storage grants, provider configuration, collaborator membership and authenticated end-to-end behavior remain unverified. Public inventory was observed through the local app's ordinary homepage query. Secret values were not copied into reports.

## Evidence and coverage

- Reviewed all authored application, library, SQL, configuration and documentation source in the baseline, divided into authentication/schema, booking/admin and frontend reviews. Coverage is indexed in [coverage](audit/coverage.md). Baseline has 164 tracked files; 133 are TS/TSX/JS/CSS/SQL/TOML source/config files. Lockfile entries and dependencies were inspected programmatically; third-party dependency source was not exhaustively read.
- Detailed findings and source line references: [authentication, schema and profile](audit/security-schema.md), [booking, checkout and admin](audit/booking-admin.md), [frontend and features](audit/frontend-features.md).
- [Previous audit](audit/previous-audit.md) is retained as historical reference, with vendor-specific handoff references removed. It is superseded where this audit disagrees.
- Assets were inventoried by size/use; SVG structure was inspected. Videos, every image, every keyboard interaction and all responsive states were not exhaustively visually checked. The external About link was identified in source but not followed.

## Architecture and current data flow

| Layer | Existing implementation | Practical implication |
|---|---|---|
| Frontend/server | Next.js 15.0.1 App Router, React 19 release candidate, TypeScript | Server Components, client widgets and Server Actions share one repository; no separate API service is needed just to fix this. |
| Auth | Supabase email/password and incomplete Google PKCE flow | Trusted roles belong in `user_roles`; middleware currently falls back to editable metadata. |
| Database | Supabase Postgres through anon key plus user session | RLS is a real database boundary, but supplied policies allow unsafe business mutations. |
| Storage | Browser FilePond uploads to Supabase | Actual bucket/object policies are absent from migrations. |
| Booking | Three pages carrying car/date/location JSON in URLs | User-controlled prices and mutable state; no durable quote/draft contract. |
| Checkout | `payment_sessions`, QR target, polling and Realtime | Confirmation simulation; no payment processor, settlement or refund ledger. |
| AI | Public POST proxy to Groq, plus rule-based/local widgets | External model cost is exposed; most widgets are not genuine AI services. |
| Maps | Leaflet/OpenStreetMap/geosearch/browser location | Location denial can block search; no dispatch/GPS tracking integration. |
| Operations | No app test suite, jobs, webhooks or CI workflow | Build quality checks exist but business invariants have no regression coverage. |

The 11 tables are `user_roles`, `user_profiles`, `car_types`, `cars`, `bookings`, `reviews`, `wishlists`, `recently_viewed`, `notifications`, `discount_codes`, and `payment_sessions`. They are described individually in the schema report. Bookings reference auth users and cars; user_profiles separately references auth users. There is no direct bookings/profile relationship for the admin query. Dates are text, and no reservation exclusion constraint, checkout uniqueness, immutable payment ledger or booking event history exists.

Required app settings are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; optional code paths use `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL`, and `GROK_API_KEY` (actually Groq). Supabase config contains optional tooling/provider placeholders, not additional mandatory app integrations. Exact deployed configuration remains unknown.

## Critical and high-priority issues

| Priority | Evidence IDs | Problem and impact | Required direction |
|---|---|---|---|
| Critical | OPS-01 | Pinned Next 15.0.1 is affected by published framework security advisories; dependency audit also flags Swiper and dev-tool tar as critical. | Upgrade to a currently patched, compatible dependency baseline; validate reachability and regressions. |
| Critical | AUTH-01 | SQL signup trigger trusts `raw_user_meta_data.role` and can provision admin from a direct signup. The app's disabled admin signup action does not protect this API path. | Trusted admin provisioning, unconditional customer default, inspect existing privileges. |
| Critical | DB-01, BA-04 | Customers can create/update their own booking price, vehicle, dates, status and payment fields directly. | Narrow authorized business operations and DB constraints; retain owner-scoped reads. |
| Critical | DB-02, BA-03 | Payment sessions have public SELECT/UPDATE policies. QR page auto-confirms a session on mount. | Owner-scoped reads and trusted, auditable confirmation; remove public mutation. |
| Critical | BA-01 | Receipt render inserts a confirmed booking using URL price and arbitrary session string. | Explicit transactional finalize, canonical prices and read-only receipt. |
| Critical | BA-02 | Availability sees only the caller's bookings and has a check-then-insert race; invalid dates/query failures allow availability. | Database-enforced overlap prevention and validated availability projection. |
| High | DB-03/04 | Migrations cannot bootstrap cleanly; reset drops business data and earlier triggers. | Backups, live schema reconciliation, disposable baseline, additive migrations. |
| High | AUTH-02/03/04 | PKCE callback drops code, role fallback fails open, redirects lose refreshed cookies. | Shared fail-closed guards, real callback and cookie propagation. |
| High | BA-05/06 | Normal location object crashes receipt rendering; inline click handler breaks cancellable history in a Server Component. | Small client interaction boundary and typed location display after persistence. |
| High | DB-06, BA-07 | Admin booking profile embed has no supplied FK/computed relation; errors become “No bookings.” | Explicit authorized query and distinct error state. |
| High | BA-08/09 | Receipt reload conflicts with itself, checkout ID is not unique, expiry timestamp is unenforced. | Idempotency, persisted expiry, recovery and stable booking references. |
| High | DB-05, BA-10 | Car hard delete cascades into rental history; media/database deletion is non-atomic. | Operational archive, history retention and controlled media cleanup. |
| High | FE-01/02/03 | Normal-price cars bypass filters; selected dates/status do not establish availability; geolocation denial blocks search. | One eligible inventory query and optional location assistance. |
| High | FE-04/05 | Public AI endpoint lacks input/output validation, quotas and timeout. | Decide whether to retain, then protect and bound the operation. |

Source IDs refer to the linked detailed reports. Findings about SQL become deployed vulnerabilities only if the relevant policies/functions/grants are active. Existing migrations are enough to block approving this repository for production, even without live exploitation.

### OPS-01 — dependency baseline

`npm audit --json` on the committed dependency graph returned **25 vulnerable package entries: 3 critical, 13 high, 5 moderate, 4 low**. These are package-level audit counts, not 25 independently verified reachable exploits. Critical entries: `next` (runtime), `swiper` (runtime), and `tar` (Supabase CLI development dependency). Direct high entries include `sharp`, `postcss`, and `supabase` CLI. Full version/severity summary is in [dependencies](audit/dependencies.md).

Next's official RSC advisory includes this App Router/15.x baseline and reports remote code execution in affected versions; its middleware advisory also covers 15.0.1, while noting Vercel protection for that specific middleware vulnerability. Hosting controls do not repair unsafe application RLS. Choose the current patched release at implementation time rather than applying only an old minimum fix. Sources: [Next RSC advisory](https://nextjs.org/blog/CVE-2025-66478), [Next middleware advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw). This audit did not run exploit probes or `npm audit fix`.

`clsx` is imported directly without being a direct dependency. Stripe and Turnstile have no app integration. React prerelease versions, an alpha Framer Motion and peer compatibility need deliberate stabilization. `npm ls --depth=0` succeeds in the existing installation; a fresh clean install has not been verified.

## Booking, checkout and tracking lifecycle

| Stage | What currently happens | Where the chain breaks |
|---|---|---|
| Search | Date/time/location collected, encoded into URL | No full server validation; location denial can prevent progress. |
| Inventory | Cars loaded; expensive cars split into carousel | No date availability/status enforcement; most cars escape filters. |
| Details | Full URL car object displays specs/price | Data is untrusted; availability calendar is always empty; some specs invented. |
| Checkout | Session row created, QR displayed, status polled/subscribed | No money moves, quote is client-derived, no inventory hold/idempotency. |
| QR target | Mount triggers POST confirmation | No payer authentication/provider proof; timestamp expiry not checked. |
| Finalize/receipt | GET render checks availability then inserts | No session verification; price tampering, race, React failure after possible insert. |
| Customer history | Select own bookings; cancellation form | Nonempty cancellable history can fail serialization; errors hidden. |
| Admin | Query booking/profile embed; update status | Schema relationship missing; unrestricted transitions, no audited history. |
| Fulfillment/return | Status field only | No handover/return event contract, historical timeline, GPS or dispatch system. |
| Cancellation | Mutates status | No enforced allowed state, reason/time, refund or availability reconciliation. |

The source establishes **overlapping inserts**, not proof that one customer literally overwrites another customer's row. Diagnose actual historical incidents from backups/logs before claiming a proven overwrite root cause.

## Admin and customer findings

**Admin:** retain basic fleet create/edit/archive/unarchive and real count queries. Add runtime field validation and admin guards; remove schema-error retry that silently drops columns. Hard deletion is unsafe despite a working archive path. Image uploads need server/storage validation, rollback, intentional replace/append semantics and tested ownership. Lists need pagination/search/error states. “Revenue” is booked value rather than settled money; fleet count includes unavailable records; top-car aggregation merges same-model units. The chart is explicitly simulated, and its timeframe buttons do not change data.

**Customer:** retain email/password foundation, browse controls, image galleries, profile/settings structure and useful loading/error boundaries. Repair PKCE, missing-name crashes, stale profile data, logout failure, incomplete recovery/confirmation handling and metadata fallback. Filter eligibility, canonical vehicle details, date/time pairing, location fallback, booking links and receipt/history are core. Local wishlist state and DB counts disagree and are shared between browser users. Notifications have no persisted read path; recently viewed is never written; review widgets receive no reviews. Profile/booking “spent” totals include unpaid/cancelled bookings.

## Real, partial, simulated and dead features

The detailed reports contain a complete feature-by-feature disposition table, including KEEP, FIX, REBUILD, SIMPLIFY, REMOVE and INVESTIGATE. The key distinction is whether data is real, whether its interpretation is correct, and whether the full workflow exists.

| Classification | Features |
|---|---|
| REAL foundations | Supabase email authentication; database fleet operations including archive; basic image browsing; theme switching; static navigation. These still have specific faults. |
| PARTIALLY REAL | Inventory/filter controls; dashboard counts; profile/settings; upload; customer history/cancellation; local wishlist; Groq trip planning; comparison UI. |
| SIMULATED | QR payment/confirmation; revenue trend; local damage annotation demo; artificial-thinking keyword assistants; old template itinerary generator. |
| FAKE / HARDCODED | Landing statistics/testimonials and operational guarantees; universal spec/advantage claims; empty bookedDates; synthetic comparison/rating scores; unused recommender percentages/cost assumptions. |
| BROKEN / UNWIRED | OAuth callback; availability/atomic reservation; receipt/history; admin profile embed; resume and car-detail links; reviews input; recently-viewed writes; notification delivery/read state. |
| ABSENT | Real payment settlement/refunds, authoritative checkout history, booking event timeline, live tracking, host payouts, automated identity/insurance verification. |

Import analysis found four unreferenced shared components: `AiTripPlanner`, `SmartCarRecommender`, `TripCostCalculator`, and `VoiceBookingAssistant`. Additional unused candidates include `AssignRolePage`, `BookingCarCardCarousel`, `createCheckoutSession` and `getCarById`. **These remain in source pending product discussion.** Damage detector, comparison, fleet assistant and command palette are imported; they are not dead files simply because their features are questionable.

## Performance, accessibility, SEO and design

- Hero video is 74,360,951 bytes (70.92 MiB) and uses `/videos/FrontBG.mp4` against `public/Videos/`; it has `playsInline` but no poster, reduced-motion fallback or mobile source strategy. Local browser reported “Unable to play media”; path casing is a separate confirmed portability defect, not proof of the local playback cause.
- Production logos contain about 5,352/4,896 SVG paths and total 6.49 MiB. Preserve brand assets until replacement/optimization is validated. Unreferenced legacy assets were archived, not mistaken for required media.
- Build first-load JS is approximately 248 kB for `/`, 301 kB for `/customer`, and 192 kB for new-car creation. Inventory queries and client props load whole lists; many images bypass optimization and omit responsive sizes. Dashboard JS sums can be truncated by API row limits (local setting 1,000).
- Source inspection found unnamed icon buttons, non-keyboard color/annotation controls, dialogs without focus containment/restoration, ambiguous labels, multiple logo h1 elements, missing field-linked errors and fixed-size widgets. Browser AX confirms unnamed provider/password controls. Mobile login rendered at 390×844; this is not a complete accessibility or responsive certification.
- Metadata and Open Graph exist; absolute social URLs are fixed to an old deployment, private routes inherit indexable defaults, and no sitemap/robots implementation was found. About points to an external editor URL. Privacy copy claims Stripe usage although checkout is simulated; this is a factual discrepancy, not a legal compliance assessment.
- Current dark/emerald/gradient styling and marketing are inconsistent with trustworthy product behavior. New palette/tokens, typography, accessible controls and honest copy should follow core product decisions. No palette or redesign has been approved or implemented in this audit.

## Medium and low priorities

**Medium:** unified error contracts, server input validation, DB domain checks, API pagination/aggregation/indexes, profile/wishlist consistency, safe review provenance, permission-scoped storage, upload rollback, stateful notifications, rate/cost controls, account recovery, unit consistency and accessible controls.

**Low after core correctness:** remove artificial delays and unnecessary animation, simplify global navigation helpers, optimize logo/media variants, clean content/metadata, explicit Tailwind class maps, theme consistency and print styling. Dynamic classes are fragile but should not be called broken solely from source; comparator's classes also occur elsewhere.

## Corrections to the earlier audit

1. Admin email signup is disabled in its server action; direct metadata-trigger escalation remains critical.
2. Middleware and RLS are real server/database controls, not merely client UI.
3. Owner UPDATE policies constrain ownership; they do not independently allow another user's row to be stolen. Own commercial fields are unsafe.
4. Reset migration removes old notification, timestamp and recently-viewed triggers; function text alone does not mean a trigger is active.
5. Google PKCE failure is broader than an admin redirect mismatch.
6. Archive/unarchive work; the dangerous hard-delete alternative remains.
7. Hero has `playsInline`; damage tool says manual demo; gallery is visibly labeled a gallery; trend is labeled simulated. Labels do not make them complete product workflows.
8. Uploads have client MIME filtering/max-three restrictions; server/storage enforcement is unknown.
9. Supabase upstream rate limits/MFA capabilities cannot be inferred absent just because the app lacks flows.
10. Previous exact claims about overwritten rows, universally purged dynamic classes, hand-written types and local production settings were too strong. Types are demonstrably inconsistent; authorship/generation provenance is not proven.

## Validation results and limits

| Check | Result |
|---|---|
| `npm run lint` | PASS, no warnings/errors. |
| TypeScript `--noEmit --incremental false` | PASS. |
| `npm run build` | PASS, all 25 static-generation tasks completed. Dynamic authenticated data paths are not exercised. |
| `npm ls --depth=0` | PASS for existing installation. |
| `npm audit --json` | 25 vulnerable package entries; no upgrades applied. |
| Actual availability helper, in-memory Supabase stub | Normal visible overlap rejected; malformed/reversed dates, DB read failure, invalid stored dates, identical same-day ranges accepted. [Results](audit/availability-results.json). |
| Isolated installed React/Next probes | Object location rendering and Server Component inline handler both throw expected runtime errors. [Details](audit/booking-admin.md#isolated-validation-performed). |
| Local production browser | Login renders at standard/narrow width; homepage renders database-backed fleet and unsupported marketing; hero media fails playback. No auth form submitted. |
| Git hygiene | Baseline local history has one owner-authored commit; `.env*`, dependencies, build output and tsbuildinfo are not tracked. Filename history check found no env/private-key file commits. This is not a comprehensive secret-security guarantee. |
| GitHub | Origin recorded; noninteractive remote access fails for missing credentials. Hosted HEAD, contributors/collaborators/settings are not verified. |

The availability probe can be repeated with `node docs/audit/availability-probe.cjs`; it transpiles the real helper in memory and substitutes database responses, with no network or database mutation. It records existing unsafe behavior rather than certifying production correctness. Final cleanup checks passed: whitespace diff, relative document links and all six archive hashes. Application/schema/package diffs are empty. A bounded common-key-pattern scan of baseline tracked text returned no matches; this is not an exhaustive secret audit. The local preview server was stopped.

Not run: fresh `npm ci`, disposable SQL bootstrap, hosted schema export, authenticated customer/admin end-to-end checks, two-user/concurrent booking tests, real payment/webhook tests, Storage policy tests, complete browser/device/keyboard/contrast matrix, print preview and production load tests. These are explicit acceptance gates in [roadmap](ROADMAP.md), not claimed successes.

## Repository cleanup and next action

Only documentation, ignore rules and unused asset hygiene were changed. No application TS/TSX/SQL/package dependency changes were made. [Cleanup manifest](audit/cleanup.md) lists exactly what was removed and how to recover it. Provider-specific empty handoff material was removed; substantive previous audit content remains as neutral historical reference. Existing owner copyright and OpenStreetMap attribution were preserved.

Next: agree the small set of operating/payment/time/tracking decisions in [roadmap](ROADMAP.md), obtain a read-only deployed schema export and isolated test database, then implement the release blockers on a new short-lived branch. GitHub publication requires access through the owner's account; no collaborator or assistant identity should be added.
