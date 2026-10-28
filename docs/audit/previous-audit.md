# Previous audit — historical reference

> HISTORICAL REFERENCE ONLY. Superseded by ../../AGENT_STATE.md and ../SYSTEM_AUDIT.md. Original findings may be incorrect; consult the independent audit corrections.
> Last updated: 2026-10-27 — Session 1 (static audit only, NO code changed).
> Owner / ONLY allowed contributor identity: belindosamson@gmail.com (git author seen: "Copyrighted-Carrot").
> **NEVER add any other contributor, co-author, bot, GitHub Action identity or service account. If Git/GitHub behaviour is unclear, STOP and ask the owner.**

---------------------------------------------------------------------
## 0. Session log / audit coverage (be honest about what is known)

Session 1 method: read-only static inspection via a local Filesystem tool. **No build, no test run, no git command, no live database/Supabase access, no browser.** Therefore every finding is from reading code/SQL, not from observed behaviour. Items marked (UNVERIFIED) need runtime confirmation.

READ in full: middleware.ts; lib/supabase/*; supabase/migrations/001-003 + config.toml; database.types.ts; auth actions (login/signup/assign-role); booking step1/2/3 (pages, actions, content); payment confirm page + API status route; AI trip-planner route; customer bookings page; admin dashboard, bookings, cars pages/actions/new/edit/upload; customer settings; home page; root layout (partial); tailwind config; NavBar, NavBarItems, UserProfile, WishlistContext, CommandPalette, NotificationCenter, PersonalizedHeader, AvailabilityCalendar, Car360Viewer, AiReviewSummarizer, AiDamageDetector, AiFleetAssistant, OrbitTripPlanner, CarComparator, VoiceBookingAssistant, BookingCarDetails, CarFilters, CarCard, FeaturedCarCard, Map, DatePicker, TimePicker, LoginPage, SignupWithEmailPage; lib/util/availability.ts, util.ts, types.
NOT READ (still to audit): `.env.local` (deliberately not opened: secrets); SmartCarRecommender, TripCostCalculator, AiTripPlanner, HomePageFeaturedCarsCarousel, BookingMap, Footer, privacy-policy, icons, globals.css, error/loading/not-found files, remaining small form components, admin layout visuals, public/ images; package-lock; node_modules; .next; git objects/history beyond log. **Supabase Storage policies and the live DB schema are NOT in the repo** — live schema may differ from migrations (see Data Integrity DI-12).

---------------------------------------------------------------------
## 1. Project Overview
Orbit Rides: car-rental web platform with a customer side (browse, book, "checkout", bookings, profile/settings) and an admin side (dashboard, fleet CRUD, booking status). Marketed as ultra-luxury supercar rental. Currency INR (₹). Pricing is per-day. Delivery location is chosen on a map (Leaflet). Repo origin: https://github.com/Projects-013/Orbit-Rides.git, branch `main`, one commit ("Initial commit", 877c140) — i.e. NO real history exists.

## 2. Architecture
- Next.js 15 App Router (React 19, TS) full-stack monolith. Server Actions for mutations; Supabase (Postgres + Auth + Storage) accessed with the **anon key + user cookie session** (`@supabase/ssr`); authorization relies almost entirely on Postgres RLS.
- No separate backend service, no ORM, no background jobs/cron, no webhooks, no email, no real payment provider.
- Route-protection middleware (`middleware.ts` + `lib/supabase/middleware.ts`) gates `/admin/*` and `/customer/*` by role read from `user_roles` (fallback `user_metadata.role`).
- One API route set: `app/api/payment/[session_id]/status`, `app/api/ai/trip-planner` (LLM proxy).

## 3. Repository Structure (project root = `D:\Orbit Rides\Orbit Rides`)
- `app/(app)/page.tsx` — public landing page. `app/customer/page.tsx` + `FindCarForm.tsx` — customer home/search (note: lives outside the `(dashboard)` group but same URL tree).
- `app/(dashboard)/customer/{cars,booking/step1|2|3,bookings,profile,settings}` — customer features.
- `app/(dashboard)/admin/{(admin)/page.tsx dashboard,bookings,cars,cars/new-car,cars/edit/[car_id],cars/new-car/upload_images/[car_id]}` — admin features.
- `app/auth/*` — login/signup actions, forms, `assign-user-role/[role]` (OAuth landing; effectively dead logic).
- `app/payment/confirm/[session_id]` — simulated "scan QR" confirmation page.
- `app/api/*` — see Architecture. `app/components/*` — ~50 shared components (several dead/fake). `app/pages/*` — Login/Signup page components.
- `lib/supabase/*` clients, `lib/util/{availability,util}.ts`, `lib/types/*`.
- `supabase/migrations/001-003*.sql`, `supabase/config.toml`. `database.types.ts` — HAND-WRITTEN, not generated.
- `public/Videos/FrontBG.mp4` (≈74 MB), `AdminLog.mp4` (≈1.7 MB), `public/images/*`.

## 4. Technology Stack
Next.js 15, React 19, TypeScript, Tailwind CSS + DaisyUI, Supabase (@supabase/ssr, supabase-js), react-leaflet/Leaflet (OSM tiles), react-datepicker, react-select, react-toastify, react-icons (fa6), react-spinners, recharts-style charts (custom bars in AdminAnalyticsCharts — verify), Stripe + Turnstile packages listed in package.json but **UNUSED** (verify with dependency audit), LLM via Groq-compatible endpoint (env named GROK_API_KEY — name mismatch). Hosting target presumably Vercel (UNVERIFIED).

## 5. Environment Requirements (names only; values never recorded)
Derived from code (not from .env.local): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_OAUTH_REDIRECT_URL` (optional), `NEXT_PUBLIC_SITE_URL` (UNVERIFIED), `GROK_API_KEY` (LLM key; actually Groq), possibly Turnstile/Stripe keys (unused). `.env.local` exists and `.gitignore` contains `.env*.local`. **ACTION: owner must run `git ls-files | findstr env` and `git log --all -- .env.local` to confirm secrets never entered the single commit; if they did, ROTATE all keys.**

## 6. Authentication Architecture (current)
- Supabase Auth (email+password, Google OAuth). Roles live in `public.user_roles` (one role per user: customer|admin). Trigger `handle_new_user` (migration 002) creates the role row from `raw_user_meta_data->>'role'`.
- Server actions `loginCustomer/loginAdmin/signupCustomerWithEmail/signupAdminWithEmail`. Admin signup page exists and is open to anyone.
- Middleware redirects by role. Role checks inside server actions/pages are mostly ABSENT; RLS is the only backstop.
- No CAPTCHA, no rate limiting, no email-verification enforcement (config.toml local), no MFA, no password policy beyond Supabase default.

## 7. Database Architecture (from migrations; live DB unverified)
Tables: `user_roles`, `user_profiles`, `car_types`, `cars`, `bookings`, `reviews`, `wishlists`, `recently_viewed`, `notifications`, `discount_codes`, `payment_sessions`. Triggers for updated_at, booking ref, notification on booking events, role creation. RLS enabled on all with the defects in §14/§17.
Relationships: bookings.car_id→cars (ON DELETE CASCADE ← dangerous); reviews→bookings/cars; wishlists/recently_viewed→cars. `bookings.date_range` is a TEXT like "Jul 28, 2026 - Jul 30, 2026" (no date type, no exclusion constraint). No tables for: payments/transactions, booking events/audit trail, tracking, vehicle blocks/maintenance windows, locations, refunds.

## 8. Feature Inventory & status
Legend: REAL / PARTIALLY REAL / SIMULATED / FAKE-HARDCODED / BROKEN ; disposition KEEP/FIX/REBUILD/SIMPLIFY/REMOVE/INVESTIGATE.

| Feature | Status | Disposition | Notes |
|---|---|---|---|
| Customer email signup/login | REAL | FIX | no captcha/rate-limit; password echoed in action state |
| Google OAuth | PARTIALLY REAL | FIX | admin OAuth silently yields customer role |
| Admin signup | BROKEN (insecure) | REBUILD | anyone can become admin, see SEC-1 |
| Role-based routing (middleware) | REAL | KEEP+HARDEN | UI-level only |
| Car browse/filter | PARTIALLY REAL | FIX | ignores dates/availability/status; hardcoded filters |
| Car details | PARTIALLY REAL | FIX | fake spec tabs, fake "Advantage" copy |
| Availability calendar | FAKE-HARDCODED | REBUILD | `bookedDates={[]}` always |
| Availability check | BROKEN | REBUILD | cannot see other users' bookings (RLS) — DI-1 |
| Booking step1 (details) | PARTIALLY REAL | REBUILD | whole car JSON in URL |
| Payment/QR step2 | SIMULATED | REBUILD | no money moves, no auth on confirm |
| Booking creation (step3) | BROKEN | REBUILD | write-on-GET, no payment verification |
| Receipt/confirmation | PARTIALLY REAL | REBUILD | hardcoded "Confirmed"; cannot be reloaded |
| Customer bookings list | PARTIALLY REAL | FIX | cancel works only via RLS; no state machine |
| Cancellation | PARTIALLY REAL | REBUILD | no refund, no reason, no timestamp, any status |
| Tracking | DOES NOT EXIST | NEEDS DECISION | only a status column |
| Admin dashboard stats | PARTIALLY REAL | REBUILD | derived from bookings but "revenue" = booked value |
| Admin analytics chart | SIMULATED | REMOVE/REBUILD | labelled "Simulated"; timeframe toggle inert |
| Admin bookings status control | PARTIALLY REAL | REBUILD | no transition rules, no admin check, no vehicle sync |
| Admin car CRUD | PARTIALLY REAL | FIX | hard delete cascades bookings; arbitrary fields |
| Car image upload | PARTIALLY REAL | FIX | client-side, storage policy not in repo |
| Customer settings/profile | PARTIALLY REAL | FIX | |
| Notifications (bell) | FAKE | REBUILD | component gets no data; DB rows never read |
| Wishlist | PARTIALLY REAL | SIMPLIFY | localStorage only; DB table unused |
| Recently viewed | BROKEN | INVESTIGATE | read, never written; links to nonexistent route |
| Reviews/ratings | BROKEN | INVESTIGATE | no write UI; read paths pass nothing |
| AI trip planner | PARTIALLY REAL | INVESTIGATE | real LLM call, unauthenticated, claims "real cost estimates" |
| "AI" fleet assistant | FAKE | REMOVE/REBUILD | regex + setTimeout "thinking"; broken booking link |
| AI damage detector | SIMULATED | REMOVE | manual annotation, not persisted, not tied to bookings |
| AI review summarizer | FAKE | REMOVE | keyword matching, no reviews passed |
| Car360Viewer | FAKE | SIMPLIFY | image carousel with decorative hotspots, generic text |
| Car comparator | PARTIALLY REAL | SIMPLIFY | dynamic Tailwind class bug; CTA goes to /customer |
| Command palette | REAL | INVESTIGATE | low value; luxury copy |
| QuickBook/Voice assistant | FAKE/DEAD | REMOVE | substring search; broken link |
| Discount codes | DEAD | NEEDS DECISION | table exists, never applied |
| Landing page stats/testimonials | FAKE-HARDCODED | REMOVE | all invented |

## 9. Known Bugs (confirmed by reading code)
B-1 Step3 receipt reload redirects away: re-render finds the user's own just-created booking as a "conflict".
B-2 `AiFleetAssistant` and `QuickBookAssistant` link to `/customer/booking/step1?carId=…` — step1 requires JSON car/rentDate/deliveryLocation params and redirects to /customer when missing. PersonalizedHeader "Resume" has the same dead link (and `pendingBooking` can never exist because bookings are never created as 'pending').
B-3 `RecentlyViewed` cards link to `/customer/cars/{id}` — no such route found in the tree (verify).
B-4 Admin/customer shared NavBar & UserProfile menus link admins to `/customer/profile`, `/customer/settings`, wishlist and notifications → middleware bounces admins.
B-5 Hero video src `/videos/FrontBG.mp4` but folder is `public/Videos/` — works on Windows, **404 on case-sensitive hosts (Linux/Vercel)**. 74 MB, no poster, no mobile handling (check: no `playsInline`/poster seen).
B-6 Dynamic Tailwind classes (`md:grid-cols-${n}`, `text-${color}-content`) are purged → broken layouts.
B-7 `addNewCar` inserts a `name` column not in migrations and uses a retry loop that strips "missing column" errors — masks schema drift and silently drops fields; insert omits most spec fields.
B-8 CarCard hardcodes "Automatic"; BookingCarDetails invents Technology/Safety specs ("Rear/Surround Cameras", "ABS/EBD", "Unlimited Wi-Fi") for every car.
B-9 Fuel capacity labelled "Gallons"/"L/gal" inconsistently; mileage "MPG" vs "kmpl" (Indian market).
B-10 `UserProfile` sign-out error path leaves `isSigningOut` true.
B-11 Delivery location is `{lat,lng}` object passed through URL JSON and written to `bookings.pickup_location` (TEXT) and rendered in JSX — likely breaks or stores "[object Object]" (UNVERIFIED, needs runtime test).
B-12 Map blocks on browser geolocation permission before rendering ("Loading map…" forever if denied); zoom 19.
B-13 `dropoff_time` is stored equal to pickup time formatted — there is no real drop-off time.

## 10. Known Technical Debt
- Hand-written `database.types.ts` that disagrees with SQL (owner_id/user_id nullability; no `name`).
- Migrations are not a reproducible history: 001 presumes pre-existing tables; 002 DROPS and rebuilds; live schema unknowable from repo. No seed data file, no tests, no CI, no lint gate evidence.
- Duplicate logic: price calculation in step1/step2/step3 each; date parsing in 3 places; Wishlist in localStorage + DB; two "customer home" pages; two login/signup page layers.
- Dead/abandoned components (see §8, §20). Unused dependencies (Stripe, Turnstile – verify).
- Business rules encoded in UI copy (cancellation, "all-inclusive", delivery) with no backend counterpart.
- Inconsistent error handling: some actions return `{error}`, some throw, some `redirect` with query message, several swallow errors (`console.error` then continue), admin status action returns nothing on RLS failure.
- Large "glass/emerald/slate" visual style duplicated inline in components rather than tokens.

## 11. Fake / Simulated Functionality (complete list so far)
SIMULATED: Stripe-like payment session + QR "scan" page (button/POST confirms); admin "Revenue Trend (Simulated)" chart; AI damage detector; "AI" fleet assistant (regex); AI review summarizer (keywords); QuickBook "voice" assistant.
FAKE/HARDCODED: landing stats (6,000+ renters, 1,000+ supercars, 99.8%, 6,500+, 1,200+, 12,000+, 10M miles, "Since 2026"); testimonials ("Jane Doe/John Smith"); host-network/payout/identity-screening claims; availability calendar; spec tabs; "Orbit Rides Advantage" comparison; "100% instant confirmation"/"Real-time" claims; `price_per_day >= 60` hardcoded home filter; notification bell (no data); 4-score rating meters all equal to the average; "Luxury Member Concierge"; personal email/username used as form placeholders.
PARTIALLY REAL: AI trip planner (real model, unverified numbers); admin dashboard counts.

## 12. Broken Flows
F-1 Booking: details → QR confirm → step3. Payment never verified; booking inserted on page GET; price from URL; availability blind to other users; refresh = redirect-with-error or duplicate risk.
F-2 Cancel: customer can cancel any own booking in any state; no payment/vehicle/notification consequences designed.
F-3 Admin status change: arbitrary transitions; customer sees nothing (no notification read path, no tracking); vehicle availability not updated.
F-4 "Resume booking", assistant/QuickBook "Book now": dead.
F-5 Admin signup / admin Google OAuth: misleading and insecure.
F-6 Reviews: no way to create a review; summary widgets show empty states always.
F-7 Notifications: DB triggers insert rows; nothing reads them.
F-8 Delete car: wipes booking history.

## 13. Security Issues (SEC) — document only; none exploited
SEC-1 **CRITICAL – admin privilege escalation.** `handle_new_user` trusts `raw_user_meta_data->>'role'`; Supabase `signUp` lets any client set arbitrary user metadata with the public anon key → anyone can self-register as `admin` regardless of UI. (Verify trigger body in live DB.)
SEC-2 **CRITICAL – customers can rewrite their own bookings.** RLS "Users can update own bookings" has no column/state restriction → a customer with the public anon key can set `status`, `payment_status`, `total_price`, `cancelled_at`, even `car_id`/`date_range` directly.
SEC-3 **CRITICAL – payment_sessions RLS** `USING (true)` for public SELECT/UPDATE → anyone can list sessions (leaks user_id, booking_data) and confirm/modify any session or amount.
SEC-4 **CRITICAL – price/booking tampering.** Step1/2/3 trust car object, price and dates from URL params; step3 doesn't check the session was confirmed or belongs to the user, so `/customer/booking/step3?...&session_id=anything` creates a "confirmed" booking free.
SEC-5 **HIGH – no authorization checks in server actions** (admin car/booking actions only check "a user exists"); relies on RLS which is itself too loose (SEC-2) — a customer can invoke admin `updateStatus` on their own booking.
SEC-6 **HIGH – unauthenticated LLM endpoint** `/api/ai/trip-planner`: cost/abuse, prompt injection, no rate limit, no input caps.
SEC-7 HIGH – no rate limiting/captcha on auth (Turnstile package present but unused).
SEC-8 MEDIUM – `Math.random` booking refs; predictable/enumerable.
SEC-9 MEDIUM – discount_codes publicly readable (code enumeration).
SEC-10 MEDIUM – storage bucket policies not in repo; client-side uploads; no size/type validation; Math.random filenames.
SEC-11 MEDIUM – login action returns submitted password inside action state.
SEC-12 LOW – personal email/handle in public placeholders; middleware falls back to client-writable `user_metadata.role`.
SEC-13 UNVERIFIED – CORS/headers/CSP not configured (next.config.mjs minimal); Supabase email confirmation config in production unknown.

## 14. Data Integrity Issues (DI)
DI-1 **Root cause of "booking overwrite":** `checkCarAvailability` runs with the customer's session; RLS lets a customer SELECT only their OWN bookings, so overlapping bookings by OTHER users are invisible → double-booking is the default behaviour.
DI-2 No DB-level guard: `date_range` is text; no `daterange` + EXCLUDE constraint; no unique/transactional reservation. TOCTOU race even if DI-1 were fixed.
DI-3 Availability parser fails OPEN (invalid date → "available"); uses locale `new Date()` parsing; same-day turnaround policy undefined.
DI-4 `checkout_id` NOT NULL but not UNIQUE; idempotency branch only catches `booking_ref` collisions → duplicates possible.
DI-5 `payment_status` never set to `paid`; no payments table; admin "revenue" sums `total_price` of confirmed bookings = booked value, not collected money.
DI-6 No state machine: any status→any status by customer or admin; no timestamps for transitions; no automatic activation/completion; `cars.status` never changed by bookings.
DI-7 No audit/event history; cannot reconstruct what happened to a booking; booking rows mutated in place.
DI-8 `ON DELETE CASCADE` from cars→bookings (and hard delete in admin) destroys history; `is_archived` exists but isn't used for delete.
DI-9 Price stored as client-computed total; no price breakdown/tax/currency columns; discount code never applied or counted (`current_uses` race even if applied).
DI-10 Customer/admin views derive from different queries and no notifications → state mismatch.
DI-11 Admin dashboard loads whole bookings table into memory (scaling); "cancellation rate" computed from last 5 only.
DI-12 Schema drift risk: live DB created before migrations; `name` column handling in addNewCar; hand-written types.
DI-13 Time handling: dates stored as text, no timezone (IST assumption), pickup_time stored as int + formatted string duplicate.

## 15. UI/UX Issues
Template-like "ultra-luxury" copy and fabricated metrics; glassmorphism/gradient emerald-on-slate everywhere; emoji in UI copy; inconsistent components between landing and dashboards; luxury framing mismatches INR/Indian market and real inventory; admin and customer share nav; no skeleton/empty/error states in many lists (partial); video 74 MB without poster/fallback; accessibility not yet audited (clickable divs/buttons without labels, low-contrast slate-500 on slate-950, no focus management in modals); SEO: metadata present on auth pages, landing/Open Graph unverified.

## 16. Redesign Decisions
NONE MADE YET. Owner requirements: completely new visual identity; no luxury-template look; new palette converted to design tokens; honest content (no invented stats); video only if justified by performance (else poster/static/short optimised loop); responsive down to narrow/split-screen. Proposed (not approved): token layer via CSS variables + Tailwind theme, light/dark both supported, WCAG AA contrast, remove blur/gradient glow effects.

## 17. NEEDS DECISION (owner must choose; do not invent)
ND-1 Business model: single-operator fleet vs multi-owner marketplace (`owner_id`, "List your vehicle", host/payout claims, who may be an admin).
ND-2 Payments: real provider (Razorpay/Stripe/other), pay-on-pickup, deposit, or "request to book" with manual confirmation.
ND-3 Booking granularity: whole-day vs hourly; same-day turnaround/buffer; time zone.
ND-4 Tracking meaning: booking lifecycle timeline only, or vehicle GPS/delivery tracking?
ND-5 Cancellation/refund policy and cut-off times.
ND-6 Delivery vs showroom pickup; is location a typed address, pin, or fixed hubs?
ND-7 Admin onboarding: invite-only? How are admins created?
ND-8 Reviews: keep? only after completed bookings?
ND-9 AI features: keep any? (trip planner is the only real one)
ND-10 Discount codes: keep or remove.
ND-11 Brand name/positioning and target market for the redesign (luxury vs accessible).

## 18. Redesign/Code Decisions Made
None beyond: workflow AUDIT → DOCUMENT → PLAN → DISCUSS → IMPLEMENT → TEST → DOCUMENT → COMMIT; no big-bang rewrite; refactor before rebuild; contributor-identity rule above.

## 19. Decisions Rejected
None yet. (Suggested for discussion: client-side-only auth; rewriting repo from scratch; keeping fake stats.)

## 20. Dead / Bloat candidates (INVESTIGATE before delete)
Unverified-unused: SmartCarRecommender, TripCostCalculator, AiTripPlanner (replaced by OrbitTripPlanner per comments), QuickBook/VoiceBookingAssistant, AiReviewSummarizer (renders but empty), AiDamageDetector, Car360Viewer hotspots, CommandPalette, unused deps Stripe/Turnstile, stale `.next`/tsbuildinfo, `app/pages` duplication.

## 21. Work Completed
- Session 1: this audit file created. Nothing else modified.

## 22. Work In Progress
- None. (Audit is complete for the files listed in §0; remaining unread files listed there.)

## 23. Pending Work
See ROADMAP in the audit report (Phases 0-12) — to be copied here once the owner approves; summary: P0 stabilise repo (verify secrets, baseline branch, generate types, reproducible schema) → P1 close SEC-1..5 → P2 data model (daterange + exclusion constraint, transactions, state machine, event log, payments table, soft delete) → P3 booking engine → P4 checkout → P5 tracking/timeline → P6 admin → P7 customer → P8 remove fake features → P9 redesign → P10 perf/security → P11 tests → P12 hardening.

## 24. Files Changed

## 25. Git Branches
Only `main` (local), tracking `origin/main`. Single commit 877c140 "Initial commit" authored by Copyrighted-Carrot <belindosamson@gmail.com>. No other branches. Recommended strategy is in the audit report; nothing created yet. Agent limitation in Session 1: cannot run git.

## 26. Commits
None by agents.

## 27. Testing Status
No tests exist in the repo. Nothing run. Everything is static-analysis only.

## 28. Known Regressions
None (no changes made).

## 29. Next Recommended Actions
1. Owner: confirm secrets not in git history (`git log --all --stat -- .env.local`), rotate keys if so; confirm live Supabase schema + RLS + trigger body + storage policies (export with `supabase db dump --schema public` or provide screenshots/SQL).
2. Owner: answer ND-1…ND-11 (at minimum ND-1, ND-2, ND-3, ND-4).
3. Owner: provide GitHub access plan (do not add any other identity).
4. Agent: complete audit of unread files (§0), then create branch `audit/baseline`-style docs branch (see report) and commit this file with a clear message.
5. Agent: Phase 1 security hotfix design (SEC-1..4) for discussion BEFORE coding.

## Maintenance rules
Update this file after every milestone and BEFORE context/usage runs low, before switching agents/accounts/branches. Mark unfinished operations explicitly. If code contradicts this file, fix this file. Never record secrets.
