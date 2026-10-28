# Orbit Rides — independent frontend and feature audit

Date: 2026-10-28. Scope: all assigned customer browsing, shared components, public pages, AI API, layout/style/metadata files. This report is based on current source and static import analysis, not the earlier audit. No application changes, database operations, authentication attempts, network calls to the AI service, commits, or builds were performed by this audit worker. Source citations below are repository-relative paths and one-based line numbers. Live data, real viewport behavior, production deployment, and external service configuration remain unverified.

## Principal findings

### FE-01 — High: almost all normally priced vehicles bypass search filters

`app/(dashboard)/customer/cars/page.tsx:144` classifies every vehicle costing over 60 as featured, then excludes those cars from `regularCars` at line 145. The featured carousel receives that fleet at line 176; `CarFilters` receives only `regularCars` at line 188. Meanwhile `CarFilters.tsx:35` defines its budget tiers at ₹3,000, ₹8,000, and ₹15,000. A ₹3,500 sedan is therefore always in an unfiltered carousel and never in the searchable/filterable grid. With typical rental rates, the grid says there are no matches even though cars are visible above it. Sorting likewise affects only the leftover low-price cars.

Recommendation: filter one complete eligible inventory dataset, use an explicit editorial featured flag if needed, and keep highlighted cards consistent with the selected filters. Verify a fleet spanning every price band and each body/transmission type.

### FE-02 — High: browsing does not establish availability or service eligibility

`app/(dashboard)/customer/cars/page.tsx:99` queries all cars with non-null image arrays and `is_archived != true`. It does not filter by selected dates, bookings, status, delivery coverage, or location. Its empty state at line 155 nevertheless claims nothing matches the requested location/dates. Missing archive columns trigger a fallback query at line 109 that also discards archive filtering. Archived cars can still appear on the public landing page because `app/(app)/page.tsx:52` has no archive predicate. Non-null image arrays can still be empty, while both featured car renderers dereference `img_urls[0]` without a fallback.

Recommendation: use a server-side availability query with safe booking visibility, rental interval, operational status and service area predicates; fail closed on schema errors. Keep inventory eligibility separate from the later atomic reservation. Add an explicit empty state for genuinely unavailable stock and fallback images for empty arrays.

### FE-03 — High: map permission denial prevents the rental journey

`app/components/Map.tsx:49` renders no map until geolocation succeeds. The denial/error callback at line 57 only displays a toast; `currentPosition` stays null and line 87 keeps rendering `Loading map...`. Unsupported geolocation follows the same permanent loading path. `app/customer/FindCarForm.tsx:29` requires a location, so customers who decline browser location permission cannot search even if they know an address. The map click interface also offers no address/keyboard alternative. No location timeout is supplied.

Recommendation: default to the operating area, allow manual address/pin selection, make geolocation optional, and provide a retry/error state. Confirm delivery vs pickup requirements with the owner first.

### FE-04 — High: the AI proxy has an unrestricted external-cost boundary

`app/api/ai/trip-planner/route.ts:6` exposes POST without authentication, quota, input length/schema validation, or rate limiting. It sends a model request at line 80 with up to 4,000 response tokens. `request.json()` at line 11 and `.join()` on caller-controlled waypoints at line 19 are outside the try/catch beginning at line 79, so invalid JSON or a non-array waypoint value can become an uncontrolled server error. No timeout/abort control is supplied to fetch. The environment name is `GROK_API_KEY`, but the actual target is Groq (`api.groq.com`), not the similarly named service.

Recommendation: decide whether this feature belongs in the minimum useful product; if retained, authenticate, bound typed input and request sizes, establish per-user cost limits/rate limits, apply a timeout, and handle all parsing within a controlled error boundary. Do not infer that middleware protecting `/customer` also protects `/api/ai`.

### FE-05 — Medium: AI response data is neither validated nor grounded in routing data

The endpoint JSON-parses model output and returns it directly (`app/api/ai/trip-planner/route.ts:114`, `:120`). The client assigns it as `TripPlan` (`app/components/OrbitTripPlanner.tsx:141`) and unconditionally dereferences objects, arrays and numeric methods (`:278`, `:287`, `:355`, `:375`, `:466`). Valid JSON with missing keys or string-valued numbers crashes rendering. The client also sends body category as `fuelType` at line 128 and a hardcoded mileage of 15 at line 129. All route distances, weather, tolls, locations and costs are model estimates; there is no routing/weather/places data provider behind them, despite the phrase “real cost estimates” at line 157. Changing input after generating a plan can also mix current `tripDays` labels with an older plan.

Recommendation: validate output against a runtime schema, compute authoritative rental pricing on the server, pass real vehicle fuel/mileage fields, tie displayed results to the request snapshot, and clearly distinguish estimates from booking quotes. Geographical or weather accuracy was not independently validated in this audit.

### FE-06 — Medium: saved-car, recommendation, resume, and command links do not complete their promise

- `AiFleetAssistant.tsx:194` and the unused `VoiceBookingAssistant.tsx:83` link to step1 with only `carId`; current step1 requires serialized car/rental/location values.
- `PersonalizedHeader.tsx:62` uses the same incomplete resume link. The list query asks for pending bookings, but the current customer checkout path does not create a resumable pending reservation. No write to `recently_viewed` exists in application sources, despite the read at `cars/page.tsx:50`.
- `PersonalizedHeader.tsx:101` links to `/customer/cars/{id}`; no matching route exists.
- `CarComparator.tsx:150`, `WishlistDrawer.tsx:77` and `:101`, and unused `SmartCarRecommender.tsx:274` send users to `/customer`, dropping the chosen vehicle and rental state.
- `CommandPalette.tsx:45` navigates to `/customer/cars` with no search parameters; `cars/page.tsx:25` immediately redirects to the date/location form. Its BMW example searches four static navigation commands, not the fleet.

Recommendation: introduce a stable vehicle detail URL and an opaque draft/quote/reservation identifier; all entry points should converge on that same flow. Preserve rental dates and selected vehicle through navigation. Do not add more serialized car objects to URLs as a workaround.

### FE-07 — Medium: notification and wishlist state disagree with persisted records

`NavBar.tsx:65` always renders `NotificationCenter` without data. That component defaults to an empty array (`NotificationCenter.tsx:22`); mark-as-read functions only update React state (`:28`, `:33`). Its “all caught up” state is not evidence of no stored notifications. The app has no notification read/write request in these components.

`WishlistContext.tsx:23` and `:35` store complete car snapshots under a single browser-wide localStorage key, with no user partition, logout reset, schema validation, synchronization, or stale-inventory refresh. The customer profile independently counts the database `wishlists` table; therefore counts and saved cars can disagree. A different person logging in on the same browser inherits the same saved list. Rapid successive operations also use captured arrays rather than functional state updates.

Recommendation: choose persisted, per-user wishlist records or explicitly describe a guest-only local list; use vehicle IDs and reload canonical car data. Wire notifications from authorized database queries and persist read state, or hide the bell until that exists.

### FE-08 — Medium: shared profile navigation and missing name fallback break account UX

`UserProfile.tsx:27` assigns `display_name || full_name` with no fallback; an authenticated user with neither metadata property and no picture reaches `userName.substring(0, 1)` at line 72, which can throw because the state was assigned undefined. The auth subscription at line 29 is not unsubscribed, and later auth events update only the authenticated flag, leaving name/avatar stale. The sign-out error path at lines 45–48 leaves `isSigningOut` true, disabling retries. Profile/settings menu links at lines 80 and 86 always go to customer routes, including when the navbar is on admin screens. The global command palette likewise exposes customer commands regardless of role.

Recommendation: derive user presentation with safe fallbacks, subscribe/unsubscribe once, update the whole presentation state on auth changes, reset pending state in finally, and use role-aware account/navigation routes.

### FE-09 — Medium: landing content makes unsupported operational claims

`app/(app)/page.tsx:143`–152 hardcodes renter/fleet/satisfaction counts; lines 176–190 add a second set of member/fleet/trip/mileage counts. Lines 211–231 claim digital keys, white-glove delivery, inspections and instant support; lines 273–274 claim automated insurance verification, host payouts and identity screening. These have no corresponding implemented service flows in the source. Testimonials at lines 304–322 are literal named quotes, unrelated to database reviews. These should not be represented as verified customer or operational facts.

Recommendation: replace with truthful capability statements and approved company content. Only display metrics derived from defined, auditable queries. Obtain owner decisions on operator vs marketplace before retaining “List Your Vehicle”/host-income funnels.

### FE-10 — Medium: currency, fuel and vehicle labels conflict

`app/(app)/HomePageFeaturedCarsCarousel.tsx:74` prefixes prices with `$`, while customer cards and booking screens use rupees. Line 96 maps fuel 1 to Electric and 2 to Hybrid, whereas `lib/types/fuelTypes.ts:2`–4 defines 1 Diesel, 2 Petrol, 3 Electric. `CarCard.tsx:97` always displays Automatic regardless of the vehicle's transmission, even though the filter reads the real field. `CarComparator.tsx:124` assumes MPG while the trip planner treats mileage as km/l; `TripCostCalculator.tsx:24`–35 combines dollar/gallon assumptions with rupee display and a flat 50 toll estimate. Comparator bars show a synthetic midpoint of 50 for missing metrics, suggesting a measured score despite “N/A”.

Recommendation: centralize typed currency, distance, fuel and consumption units; render actual vehicle specs and explicit unavailable states. Remove fabricated comparison scores.

### FE-11 — Medium: assets impose avoidable page and repository weight

Static measurements:

| Asset | Bytes | Evidence/use |
|---|---:|---|
| `public/Videos/FrontBG.mp4` | 74,360,951 | Hero source at `app/(app)/page.tsx:77` uses lowercase `/videos/`, which mismatches the tracked uppercase directory on case-sensitive hosts. |
| `public/Videos/CustomerLog.mp4` | 5,455,831 | Unreferenced legacy auth video; current auth layout uses auth-background.jpg. Archived outside the repo during cleanup. |
| `public/Videos/AdminLog.mp4` | 1,702,075 | Unreferenced legacy auth video; archived outside the repo during cleanup. |
| `public/images/logo-light.svg` | 3,580,775 | 5,352 SVG path elements / 58,022 lines; loaded as CSS background by `LogoLink.tsx:13`. |
| `public/images/logo-dark.svg` | 3,219,348 | 4,896 SVG path elements / 52,257 lines; `LogoLink.tsx:14`. |
| `public/images/New folder/logo-light.png` | 6,450,761 | No application reference found. |
| `public/images/New folder/logo-dark.png` | 2,375,875 | No application reference found. |

The hero already has `playsInline` at line 81; the earlier audit was mistaken about that attribute. It still lacks a poster, reduced-motion alternative, mobile source choice, and explicit preload strategy. Featured car images use eager loading and `unoptimized` (`HomePageFeaturedCarsCarousel.tsx:104`, `FeaturedCarCard.tsx:106`); regular cards also disable optimization (`CarCard.tsx:36`). Most fill images lack responsive `sizes`. Both landing and customer inventory queries load entire fleets; browsing additionally sends those complete rows to multiple client components. Profile, recent-history, pending-booking, inventory, and types reads are sequential in `cars/page.tsx`.

Recommendation: optimize/rework the heavy logos, choose an approved lightweight hero asset, correct path casing, lazy-load below-fold images, specify sizes, paginate inventory, and parallelize truly independent reads. Do not remove required source assets merely because they are large. The old SVGs in `New folder` are tiny different assets, not byte-for-byte duplicates of production logos.

### FE-12 — Medium: accessibility and narrow-viewport problems are visible in source

- `ColorSelect.tsx:45` uses `display:none` on every radio with no keyboard-operable replacement; color choices become pointer-only.
- `AiDamageDetector.tsx:128` uses a clickable div with a hidden input, no button semantics or keyboard handler. Damage-point placement is pointer-only.
- `PasswordTextBox.tsx:33`, `ProviderButton.tsx:8`, `WishlistDrawer.tsx:28`, fleet assistant close/send buttons, and several calendar/filters controls lack a stable accessible name.
- `WishlistDrawer`, `Car360Viewer` hotspot modal, `AiFleetAssistant`, and `CommandPalette` implement overlays with divs instead of an accessible dialog pattern. No focus trap/restore or modal semantics are implemented. The palette handles Escape; the others generally do not. Wishlist/hotspot overlay `z-50` is below navbar `z-[1100]`, so the navbar can remain interactive over the overlay.
- `NotificationCenter.tsx:52` is a 320px-wide dropdown (384px above sm) anchored inside navbar controls; `SidebarDrawer.tsx:13` is fixed at 320px. `AiFleetAssistant.tsx:120` is fixed at 620px tall with no viewport-height cap. Narrow split panes and short landscape screens need actual testing.
- `LogoLink.tsx:20` creates an h1 in every logo, including footer logos; page headings are therefore repeated. The logo md/lg classes `size-13`/`size-15` are not defined in the project's theme.
- `globals.css:7` removes input outlines and relies on border color. Many small gray-on-dark labels, fixed dark surfaces, continuous motion and decorative hover states need measured contrast, keyboard and reduced-motion checks.
- Form labels in trip planner, filters, damage form and pickup location/time often lack `htmlFor`/associated input IDs; errors/toasts are inconsistent and generally not tied to fields.

Recommendation: shared accessible dialogs/inputs/buttons, keyboard alternatives, visible focus, appropriately named controls, one page h1, live error/status announcements, reduced-motion behavior and viewport caps. These are source findings; this report does not claim a completed WCAG conformance or responsive screenshot audit.

### FE-13 — Medium: time-picker selection can become invalid after the date changes

`TimePicker.tsx:10` computes available times based on `pickupDate`, but the underlying select receives `defaultValue` at line 51 instead of a controlled value. Changing from a future day to today removes past choices from options without clearing the previously selected choice. If no times remain, line 45 still falls back to the first entry in the full timetable. The options use browser time with no explicit business timezone and do not update just because time passes. `DatePicker.tsx:27` permits an incomplete range (end null); the form requires a non-empty input, not a validated complete interval.

Recommendation: control and validate the date/time pair together, clear invalid choices, prevent submission without a complete interval, and perform the authoritative validation in the server with the agreed business timezone.

### FE-14 — Low/Medium: metadata and policy copy have drifted from actual behavior

Metadata is present, including Open Graph/Twitter (`app/layout.tsx:41`, `:55`). `metadataBase` honors an environment variable but absolute OG URLs still use a hardcoded Vercel hostname (`:44`, `:49`). Root robots settings allow indexing/following all pages (`:62`), with no private-screen exclusion found in assigned files. No sitemap/robots route is present in the source tree. The shared logo heading also undermines page-heading hierarchy.

`app/privacy-policy/page.tsx:22` and `:38` claim Stripe handles payments, although no active Stripe integration exists. It does not explain the external AI request containing cities/waypoints. It claims recurring security reviews without repository evidence. `Footer.tsx:19` links About us to a Canva edit URL instead of a public company page; that destination was not opened or checked. These are factual code/content discrepancies, not a legal-compliance assessment.

## Feature disposition inventory

| Feature | Current classification | Recommended disposition | Detail |
|---|---|---|---|
| Public landing and fleet showcase | PARTIALLY REAL | FIX | Real fleet query, unsupported claims, wrong currency/fuel mapping, expensive assets. |
| Customer search inputs | PARTIALLY REAL | FIX | Real date/time/pin UI; geolocation dead end and no server search eligibility. |
| Fleet browse/filter/sort | BROKEN for normal-price filtering; otherwise PARTIALLY REAL | REBUILD query boundary; KEEP filter controls | Featured split makes filters miss normal fleet; no interval availability. |
| Carousel/gallery | REAL image browsing with FAKE/HARDCODED hotspots | SIMPLIFY | `Car360Viewer` labels itself Vehicle Gallery; it is not a functioning 360-degree model, but does not currently advertise one in its visible heading. |
| Availability calendar | FAKE/HARDCODED | REBUILD | Caller passes `bookedDates={[]}` at `BookingCarDetails.tsx:124`. Selected date is local-only and does not update rental inputs; carries day number across month switches; past days enabled. |
| Saved wishlist | PARTIALLY REAL | FIX/SIMPLIFY | Works locally; account/database/booking-link integration missing. |
| Notifications | BROKEN/unwired | FIX or hide until implemented | Bell always empty; read markers not persisted. |
| Recently viewed | BROKEN | FIX or remove | Database read exists, no writes; nonexistent detail URL. |
| Resume booking | BROKEN | REBUILD | No durable draft tied to current workflow; incomplete link. |
| Fleet comparison | PARTIALLY REAL | SIMPLIFY | Real vehicle fields but arbitrary scales and CTA drops selected vehicle. |
| Orbit Trip Planner | PARTIALLY REAL | INVESTIGATE | Real Groq call, no protected quota/output schema/grounding; wrong fuel/mileage and unpersisted output. |
| AI fleet assistant | SIMULATED/rule-based | REMOVE or rename/simplify after decision | Keyword matching plus 800ms artificial thinking at `AiFleetAssistant.tsx:41`; actual fleet inputs but broken reserve link. |
| Review summary | BROKEN/unwired, rule-based | INVESTIGATE | Caller supplies no reviews (`BookingCarDetails.tsx:247`), so always empty. Keyword summary is not generative AI and invents assertions from single keywords. |
| Damage inspection | SIMULATED/local demo | REMOVE from browse or REBUILD for real handover | Clearly says Manual Annotation Mode and DEMO (`AiDamageDetector.tsx:108`, `:111`); no booking identity, saved images, database records, export or history; arbitrary health score. |
| Admin statistics UI | PARTIALLY REAL | FIX | Receives database-derived aggregates, but uses “revenue” for booked values and last-five cancellation sample. |
| Admin revenue trend | SIMULATED | REMOVE/REBUILD | Hardcoded Mar–Aug proportions at `AdminAnalyticsCharts.tsx:47`; timeframe buttons change only visual selection. It is explicitly labeled simulated. |
| Command palette | REAL navigation only | SIMPLIFY/INVESTIGATE | Four static destinations, mislabeled search expectations, role-unaware, browse redirect. |
| Theme switching | REAL but incomplete visual coverage | KEEP/FIX | Uses next-themes; many new dark surfaces ignore chosen theme. |
| Old smart recommender | FAKE/HARDCODED and unused | REMOVE candidate | Artificial 75–99% scores, terrain unused by matching, constraints narrow, no imports. |
| Old trip-cost calculator | FAKE/HARDCODED and unused | REMOVE candidate | US cities/MPG/$3.50 assumptions rendered in rupees, fixed toll. |
| Old AI trip planner | SIMULATED and unused | REMOVE candidate | Keyword category templates; traveler/budget values do not influence itinerary. |
| Old VoiceBookingAssistant/QuickBook | Rule-based and unused | REMOVE candidate | Not voice in its current visible UI; substring matcher with broken link and empty type fallback matching any query. |
| Basic loading/error pages | REAL | KEEP/FIX | Present, but inconsistent, generic, no real error-reporting service or field-level recovery. |
| Privacy/About pages | PARTIALLY REAL/stale | FIX | Third-party and operational claims inconsistent with implementation. |

No application feature was deleted. These dispositions require product decisions under the user's audit-before-implementation rule.

## Dead-source and dependency evidence

TypeScript AST import/export/dynamic-import scan across all `app` and `lib` TS/JS files found exactly four shared components with no incoming module references:

- `app/components/AiTripPlanner.tsx`
- `app/components/SmartCarRecommender.tsx`
- `app/components/TripCostCalculator.tsx`
- `app/components/VoiceBookingAssistant.tsx`

This is stronger than a filename guess but does not inspect external consumers. All other shared components have application import references. In particular, `AiDamageDetector`, `CarComparator`, `AiFleetAssistant`, and `CommandPalette` are currently rendered and cannot be treated as unused. `AiReviewSummarizer` is rendered but receives no reviews. Stripe and Turnstile are not imported by app/lib source. `clsx` is directly imported by Select, TimePicker, and ThemeSwitcher but is not declared as a direct package dependency; it currently relies on the installed transitive dependency tree.

The comparator's interpolated Tailwind `md:grid-cols-${n}` at line 84 is fragile, but md:grid-cols-2 and md:grid-cols-3 also occur statically elsewhere. The earlier audit's categorical statement that this layout is broken due to purging is not established. Use explicit class mappings to remove coupling; inspect generated CSS before claiming a present rendering failure.

## Journey map and recommended implementation order

1. Landing → login: real navigation, but inventory/marketing claims lack factual support and mobile asset budgets are poor.
2. Customer form → inventory: date/location/time encoded into URL; pin permission failure blocks search; inventory ignores those criteria.
3. Inventory → details: primary cards pass serialized car data; secondary entry points drop needed state. Use IDs with canonical server loading.
4. Details → quote/checkout: make one validated durable rental draft/quote after the security/data-integrity work; use the booking audit for authoritative mutation findings.
5. Confirmation → customer history → admin visibility: use persisted booking/event records and stable URLs. Wire notification and resumability only after those records exist.
6. Handover/return: decide whether manual damage reports are a genuine requirement. If yes, tie photos and immutable inspection records to the booking, authorized staff/customer actor and timestamps; the present demo does none of this.
7. Product simplification: remove or rename unwired and simulated helpers after owner decisions; keep ordinary inventory filtering, photo galleries and clear booking actions.
8. Redesign: establish honest content, token palette, accessible shared primitives and responsive layouts only after the core journey contract is settled. Do not carry arbitrary luxury claims, fixed dark cards or synthetic metrics into the new design.

## Coverage and limitations

Read all 56 assigned text files (including small wrappers/error/loading files), with visual-style attributes separately searched for breakpoint, size, stacking, focus and accessibility concerns. Full-source data flow was inspected; no screenshots or assistive technology sessions were performed. Asset sizes and SVG path counts were measured; images/video frames were not visually assessed. External Canva, provider, map-tile and deployed URLs were not fetched. No secrets were read. Import reachability used local TypeScript parsing and made no source edits. No tests/builds were run by this worker to avoid conflicting with the parent audit process.

Assigned coverage:

- All 33 files in `app/components/`: AdminAnalyticsCharts, AiDamageDetector, AiFleetAssistant, AiReviewSummarizer, AiTripPlanner, AvailabilityCalendar, Car360Viewer, CarComparator, ColorSelect, CommandPalette, DatePicker, Footer, FormSubmitButton, LogoLink, Map, NavBar, NavBarItems, NotificationCenter, OrbitTripPlanner, PasswordTextBox, PersonalizedHeader, ProviderButton, Select, SidebarDrawer, SmartCarRecommender, TextBox, ThemeSwitcher, TimePicker, TripCostCalculator, UserProfile, VoiceBookingAssistant, WishlistContext, WishlistDrawer.
- All 4 files in `app/(app)/`: page, HomePageFeaturedCarsCarousel, loading, error.
- Both files in `app/customer/`: page, FindCarForm.
- All 6 files in `app/(dashboard)/customer/cars/`: page, CarCard, CarFilters, FeaturedCarCard, loading, error.
- `app/api/ai/trip-planner/route.ts`, `app/privacy-policy/page.tsx`.
- `app/layout.tsx`, `app/globals.css`, `app/icons.tsx`, `app/global-error.tsx`, `app/loading.tsx`, `app/not-found.tsx`, `app/ToastContainer.tsx`, `app/(dashboard)/customer/layout.tsx`, `tailwind.config.ts`.
- Additional cross-checks: canonical fuel types, browser Supabase client, all app/lib import references, widget call sites, public asset inventory, SVG structure counts.

The known coverage count is 56: 33 + 4 + 2 + 6 + 2 + 9. Before release, complete actual customer/admin flows with disposable local data, permission-denial cases, keyboard-only interaction, 320/375/768/1280-width and short-height layouts, slow-network/image failure cases, and signed-out/wrong-role routes. Do not claim those runtime checks have passed based on this report.
