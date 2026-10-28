# Independent booking, checkout and admin audit

Date: 2026-10-28. Baseline: commit `877c140`, repository `D:\Orbit Rides\Orbit Rides`. This is an independent source/SQL review plus isolated local framework probes. No source changes, database calls or mutations, account creation, commits, payment requests, or shared build/test processes were performed. Source citations below are repository-relative, with verified one-based line numbers.

## Main conclusion

The core rental workflow is not reliable enough for real reservations. It is a client-controlled price and date payload passed through URLs, followed by a simulated payment state and a booking insert during receipt rendering. There is no atomic reservation, durable payment verification, safe idempotency, or valid receipt route. Admin CRUD has real database operations, but booking administration likely cannot load its intended profile join against the committed schema. The prior audit found many genuine problems, but missed two deterministic React failures, session expiry enforcement, the missing booking/profile relation, and loss of triggers in the reset migration.

## Critical findings

### BA-01: A receipt request creates a confirmed booking with client-controlled values

`app/(dashboard)/customer/booking/step3/page.tsx:34` checks only that `session_id` and three JSON parameters exist; `:36-55` parses the URL car and computes price from its `price_per_day`. `:47` immediately calls a write helper during Server Component rendering. `:195-208` inserts `status: 'confirmed'` with that price and checkout string. No payment_sessions lookup, user/session ownership check, expiry check, provider payment verification, or price lookup exists. Direct booking insertion is also allowed by the owner-only INSERT policy (`supabase/migrations/002_reset_and_rebuild_schema.sql:223`).

Consequences: an arbitrary non-empty checkout string can be recorded as confirmation; URL price can differ from inventory; rendering/retrying/prefetching the confirmation page may write; the displayed receipt is reconstructed from caller input instead of a persisted immutable snapshot. `payment_status` remains its database default `pending` (`002:203`) while UI says Confirmed (`step3/page.tsx:149-155`). No money moves.

Recommendation: explicit authenticated booking/checkout mutation, server-owned quote, selected vehicle fetched by ID, positive money and validated dates, one durable attempt ID, and a read-only receipt route by stable booking reference. Actual payment policy remains an owner decision.

### BA-02: Availability cannot see other customers and has no concurrency guard

`lib/util/availability.ts:13` uses the requesting session's Supabase client. Its booking SELECT at `:27-31` is filtered by owner RLS (`002:215-221`); ordinary customers cannot see each other's conflicts. It checks then inserts in separate requests (`step2/action.ts:16-24`, `step3/page.tsx:185-196`), with no database exclusion constraint or transaction (`002:191-210`). Two concurrent requests can both pass. Failed database requests also appear available because the error is discarded and null data is accepted (`availability.ts:27-34`). Invalid input/stored date strings are treated as available (`:17`, `:22-23`, `:39-45`).

This explains overlapping reservations, not literal overwriting of the same database row: the normal creation path uses INSERT, not UPDATE/upsert. There is no evidence from source alone of one customer's booking row being overwritten by another. Existing owner RLS does constrain cross-owner access if the committed policies are active.

Recommendation: typed timestamps/date ranges and database-enforced exclusion/locking; expose only availability, not other customers' booking data; fail closed on invalid dates/query errors; verify simultaneous multi-user requests. Decide hourly vs daily rental and turnaround before defining range boundaries.

### BA-03: Public payment sessions expose and allow mutation of all sessions

`supabase/migrations/003_payment_sessions.sql:27-32` uses `USING (true)` for SELECT and UPDATE. Despite comments saying UUID is the secret, the public database API may list IDs and booking_data, including user IDs and delivery details, and update any permitted columns. `app/api/payment/[session_id]/status/route.ts:38-87` has no authentication/provider verification and confirms whichever session ID is supplied. `app/payment/confirm/[session_id]/ConfirmPaymentClient.tsx:28-56` automatically POSTs on mounting: merely visiting the QR target confirms the simulation. It is not a genuine checkout button or payment processor.

Recommendation: eliminate public mutation policies; owner-scoped read access, server-owned session creation, and provider-signed webhooks or explicit audited manual confirmation after the owner chooses the payment model.

### BA-04: Booking updates allow tampering and arbitrary state changes

`002:227-233` gives users UPDATE on their own rows, including prices, car/dates, payment/status fields. There is no column restriction or transition function. Customer cancellation action has no auth/ownership/status checks inside the action, ignores the result, and only revalidates its own page (`customer/bookings/page.tsx:28-35`). Admin updateStatus likewise has no getUser/role check at all and ignores errors (`admin/bookings/page.tsx:30-39`). Typescript `as` is not runtime validation. UI cancellation is only offered for pending/confirmed (`customer/bookings/page.tsx:135`), but the mutation does not enforce that condition. Neither records reason/cancelled_at or payment consequences.

Recommendation: restrict direct table writes and centralize allowed, authorized transitions in transactional functions or a server domain layer, with append-only actor/time/reason events. Cancellation/refund policy needs a business decision.

## High-priority broken flows

### BA-05: Normal receipt location is an invalid React child

Step1 expects `deliveryLocation: {lat,lng}` (`step1/BookingStep1PageContent.tsx:15`). Step3 JSON-parses that object and renders it directly in JSX (`step3/page.tsx:38`, `:118`). This throws React's object-child exception. The same value is passed through an inaccurately typed `string` helper and submitted to the SQL TEXT column (`step3/page.tsx:51`, `:178`, `:201`; `002:197`). Exact database coercion/rejection depends on live PostgREST; the React exception is independently reproduced. If insertion succeeds, the user may see failure after their booking already exists.

### BA-06: Customer bookings fails when a cancellable booking is displayed

`customer/bookings/page.tsx` is an async Server Component with no `use client`; it renders a normal button with inline `onClick` (`:141-143`) in the pending/confirmed branch. React Server Component serialization rejects event handlers. Empty-state screenshots do not expose this failure. Move the confirmation interaction into a small Client Component or use a properly designed form transition with progressive enhancement.

### BA-07: Admin booking/customer join is absent from committed schema

`admin/bookings/page.tsx:17-21` selects `user_profiles(display_name)` embedded in bookings. In `002:193-194` bookings references cars/auth.users, while `user_profiles.user_id` references auth.users at `:254`. There is no direct booking-profile FK, view, or computed relationship in migrations, and `database.types.ts:70-78` records only the cars relationship. Against this schema PostgREST cannot infer that embedding. The query's error is discarded (`admin/bookings/page.tsx:28`), so the expected visible symptom is misleading "No bookings found" (`:77-81`). Verify on a safe disposable baseline/live schema export before choosing an explicit relationship/view or separate profile query.

### BA-08: Idempotency is absent and receipt reload conflicts with itself

`checkout_id` is not unique (`002:195`); only `booking_ref` is unique (`:204`). Every receipt render creates a new ref (`step3/page.tsx:193`). Availability check precedes any attempt to retrieve a prior booking (`:185`), so a normal valid nonzero-length confirmed booking conflicts with itself on reload. The duplicate handler catches SQL unique error 23505 and looks up checkout_id (`:216-218`), although normal repeated checkout IDs do not raise that error. A random reference collision with no matching checkout can return an unpersisted new reference (`:221`). Same-day ranges have zero overlap length in the current predicate but bill for one day, making repeat insertion possible.

Recommendation: unique checkout-attempt linkage, fetch existing result first, atomic create, and read-only receipt rendering. Decide valid same-day handling.

### BA-09: Expiry and cancellation exist visually, not as enforced checkout lifecycle

SQL defines expires_at (`003:16`), but no application code reads it. API POST rejects only stored status values expired/cancelled (`api/payment/.../route.ts:65`), not expired timestamps. QR UI timer sets component state to expired (`step2/QRCheckoutContent.tsx:61-70`) without persisting it. Going back does not cancel a session (`:275-280`). Reload creates another session, and there is no uniqueness/idempotency token or inventory hold. Expired-by-time pending sessions can still be confirmed. The read-then-update is also not conditional on current status, so races with cancellation/expiry would remain.

### BA-10: Deleting fleet records destroys booking history and is non-atomic with media cleanup

`admin/cars/actions.ts:139-142` hard-deletes cars; `002:193` cascades bookings and `003:10` cascades payment sessions. Reviews and related car records also cascade. The action removes Storage objects before deleting the row (`actions.ts:117-137`); if deletion fails, a retained car can have missing images. Storage cleanup errors are logged but deletion proceeds, allowing orphan media in the opposite case. Archive/unarchive already exist and are wired (`CarCard.tsx:19-29`, `actions.ts:35-94`), contrary to any implication that archive functionality is entirely absent. Make archive the operational action; retain booking/pricing/vehicle snapshots and use controlled retention separately.

### BA-11: Customer status history and notifications are not operational tracking

There is no booking-events model, transition history, dispatch/delivery state, GPS integration, or customer timeline in assigned source. A single status column is changed in place. Important correction: notification and updated_at triggers exist in migration001 but migration002 drops their tables and does not recreate those triggers. `001:292-305`, `:336-339`, `:255-258` are removed by `002:15-24`. Therefore applying the committed sequence does not establish the notification behavior described by the prior audit. Admin/customer page revalidation is also limited to the initiating page; other open clients have no booking-status subscription.

## Admin and reporting issues

- **BA-12, high — action authorization is incomplete.** Car actions check only that a user exists (`admin/cars/actions.ts:10-14`, `:38-42`, `:69-73`, `:100-104`; `new-car/action.ts:9-11`), then trust RLS. updateCar forwards arbitrary `Partial<Car>` to UPDATE (`actions.ts:7-19`) with no runtime allowlist. Baseline car RLS requires admin, so do not misreport this as an independent universal car-edit bypass; it is defense-in-depth weakness compounded by the role escalation in auth.
- **BA-13, medium — success can mean zero changed rows.** Car actions inspect only error and do not request affected rows; nonexistent or filtered IDs can report success. Booking actions discard even error. Edit page ignores lookup error and redirects (`edit/[car_id]/page.tsx:16-17`); types failure becomes an empty list (`:21-22`). Customer bookings query errors become no bookings (`customer/bookings/page.tsx:19-26`, `:82`).
- **BA-14, high — new-car schema-drift retry silently drops data.** `new-car/action.ts:19` inserts a nonexistent name column; `:32-53` strips any reported missing field and retries. There is no server validation for positive price, valid fuel/seats/year, or nonempty trimmed manufacturer/model. Backend schema needs to be fixed and types generated; do not intentionally adapt mutations to arbitrary live drift.
- **BA-15, medium — optional fields are not truly optional or clearable.** Edit form renders shared TextBox for optional values (`EditCarPageContent.tsx:166-184`), but TextBox always applies required (`app/components/TextBox.tsx:17`). Expanding optional fields may prevent submitting unless all such fields are populated. Blank fields/empty features are never included in updates (`EditCarPageContent.tsx:55-93`), so existing values cannot be cleared. Mileage/fuel capacity are parsed as integers despite decimal SQL columns (`:76-80`; `002:157-158`).
- **BA-16, medium — image handling can orphan or replace media.** Uploads are sequential, client-side type restrictions only (`UploadNewCarImagesPageContent.tsx:28-40`, `:115-117`); no size/dimension check or server content validation is defined. On a later upload or row update failure, already uploaded images are not rolled back (`:42-53`, `:89-99`). Updating img_urls replaces rather than merges any existing URLs, so revisiting the route can orphan old images. Storage policies are external and remain unverified. The UI has useful type/max-count limits; the prior blanket "no type validation" was too broad—there is client-side image MIME filtering.
- **BA-17, medium — analytics are partly real, partly misleading.** Counts/last five are actual queries. Gross Revenue sums confirmed/active/completed total_price, not settled payments (`admin/(admin)/page.tsx:26-32`). Customer Amount Spent sums every status including cancelled (`customer/bookings/page.tsx:53`). Active Fleet counts all cars including archived/maintenance (`admin/(admin)/page.tsx:18-20`; `AdminAnalyticsCharts.tsx:104-113`). Cancellation rate uses the last five and is labelled Recent trend (`AdminAnalyticsCharts.tsx:125-127`), so it should not be reported as an undisclosed all-time calculation. Top vehicles groups by manufacturer/model, merging distinct inventory units (`admin/(admin)/page.tsx:62-66`) and includes cancelled bookings. Revenue trend is explicitly labelled simulated (`AdminAnalyticsCharts.tsx:138`); timeframe changes only its selected button, not the dataset (`:43-54`, `:143-154`).
- **BA-18, medium — list size and accuracy limits.** Fleet and booking lists have no pagination/search; admin booking filter works by status only. Dashboard loads multiple unpaginated booking projections and aggregates in application memory (`admin/(admin)/page.tsx:27-54`), with sequential queries. Supabase local config caps API rows at 1,000 (`supabase/config.toml:15`), so counts can disagree with truncated sums/rankings beyond that scale. Errors silently produce zeros. Use aggregate queries with defined time windows and pagination.
- **BA-19, medium — vehicle operational state is disconnected.** cars has status/is_available/is_archived (`002:161-165`), but the booking availability helper checks none of them. Step3 accepts a valid car ID even if archived, maintenance, or unavailable; database SELECT policy returns all cars (`002:172-174`). No lifecycle updates operational state. Model operational blocks separately from date reservations rather than maintaining redundant ambiguous booleans.
- **BA-20, medium — fuel default can crash admin cards.** SQL fuel defaults to 100 (`002:145`); UI array values are 1–3 (`lib/types/fuelTypes.ts`). Admin CarCard dereferences `fuelTypes[props.fuel - 1].label` unchecked (`CarCard.tsx:108`); legacy/default/invalid fuel values can crash a full list. Server action only converts to Number and has no range check.

## Customer details and UI findings

- `BookingCarDetails.tsx:124` always passes `bookedDates={[]}`; there is no availability query.
- Gallery All/Exterior/Interior/Engine buttons only change selected-category styling (`:26`, `:39-49`); displayed images are never filtered. This is another fake control beyond the prior audit.
- `BookingCarDetails.tsx:195-205` invents universal connectivity/safety specifications. `:230-240` claims guaranteed exact model, delivery/pickup, Wi-Fi, and negative competitor behavior without corresponding operational evidence. `BookingStep1PageContent.tsx:83-85` labels insurance/24-hour support included, with no priced contract evidence.
- Reviews always receive default average/count because the caller at `BookingStep1PageContent.tsx:49` passes only car; AiReviewSummarizer receives no review data (`BookingCarDetails.tsx:247`). If average is later supplied, all category meters reuse the same score (`:273-276`).
- Lightbox (`BookingCarDetails.tsx:283-299`) lacks dialog semantics, focus containment, Escape handler, and a named close control; thumbnail names are generic. Spec tabs lack tab semantics. Full responsive/contrast verification requires browser checks; do not claim tested.
- Receipt Print Invoice uses window.print, not a persisted invoice/PDF (`DownloadButton.tsx:6`). Printed styles hide the rest of the page but child text remains explicit white on a white receipt background unless overridden (`step3/page.tsx:60-80`, `:95-118`), a likely readability issue needing print preview verification.
- Raw JSON in query strings can be malformed, double decoded, oversized or contain URL delimiters. Step1/3 decodeURIComponent an already parsed param (`step1/page.tsx:24`, `step3/page.tsx:36`); QR redirect concatenates unencoded params (`QRCheckoutContent.tsx:126`). No schema validation, bounded input, or safe error recovery exists. Delivery coordinates are needlessly exposed in URLs/history.
- QR dimensions hardcode 256px plus 48px padding inside additional responsive paddings (`QRCheckoutContent.tsx:164-174`), creating a likely narrow-screen overflow case. It needs measured viewport tests.
- Async payment initialization is not caught; action parse/network failures may leave the loader forever (`QRCheckoutContent.tsx:41-108`). Polling exceptions are silently ignored (`:102-104`). Async unmount while session initialization is pending can install timers/subscription after cleanup; dev strict effect mounting can create duplicate attempts. Redirect timeout also is not cleared (`:125-127`).
- New-car type loading throws from an async effect without handling or resetting loading (`NewCarPageContent.tsx:24-41`). Submission has no try/finally (`:44-58`), so unexpected failures may leave pending state locked.
- Dynamic Tailwind token construction in dashboard cards (`admin/(admin)/page.tsx:143-155`) is not reliably discoverable by Tailwind; actual missing classes depend on whether the same complete tokens occur elsewhere. This is a risk, not proof every constructed class is missing.

## Feature classification and disposition

| Feature | Classification | Disposition |
|---|---|---|
| Car creation/edit/archive/unarchive | PARTIALLY REAL | FIX validation, authorization and schema |
| Car hard delete | REAL operation, unsafe retention | REPLACE with archive; discuss retention |
| Car image upload | PARTIALLY REAL | FIX storage policy, validation, rollback |
| Admin counts/recent bookings | PARTIALLY REAL | KEEP queries, fix aggregation/error handling |
| Revenue trend/timeframe | SIMULATED | REMOVE or rebuild from real settlements |
| Admin booking table | BROKEN against committed relationship schema | FIX explicit profile relation |
| Admin status changes | PARTIALLY REAL | REBUILD transition/permission/history layer |
| Booking details/price | PARTIALLY REAL, untrusted | REBUILD server quote flow |
| Availability/calendar | BROKEN / FAKE-HARDCODED | REBUILD atomic reservations |
| QR payment | SIMULATED | REPLACE after payment decision |
| Receipt creation/reload | BROKEN | REBUILD durable read-only receipt |
| Customer bookings/cancel | BROKEN normal cancellable-list rendering; partial mutation | FIX rendering + REBUILD transition |
| Tracking/refunds/checkout reconciliation | ABSENT | Define and implement after core model |
| Gallery category filters/spec claims | FAKE-HARDCODED | SIMPLIFY to true data |
| Reviews in booking details | Empty/disconnected | INVESTIGATE requirements before removal |
| Step1 createCheckoutSession action | Unreferenced simulation export | REMOVE candidate after owner review |
| BookingCarCardCarousel, getCarById | No references found beyond definitions | REMOVE candidates after owner review |

## Corrections to earlier audit

1. Code shows overlapping INSERTs, not proved cross-user row overwrites.
2. Archive/unarchive are implemented and wired; hard delete is the dangerous alternate action.
3. QR target confirms automatically on page mount. There is no actual financial verification.
4. Payment session expiry is not enforced despite expires_at and a countdown.
5. Notification/update timestamps are not supported by the final committed migration sequence because reset drops their triggers without recreating them.
6. Upload component does have client-side image MIME filtering and max-three-file restrictions; server/storage enforcement remains unknown.
7. Existing cancellation UI restricts its button to pending/confirmed, but action/DB do not enforce those state limits.
8. Cancellation metric is last-five data and explicitly labelled Recent trend. Revenue chart is explicitly labelled Simulated; it is still unsuitable as business reporting.
9. React receipt-object and Server Component handler errors and admin profile relationship failure were missing from the previous report.

## Isolated validation performed

- Used installed React's renderToStaticMarkup with a paragraph containing the normal `{lat,lng}` object. Result: `Objects are not valid as a React child (found: object with keys {lat, lng})`.
- Used installed Next's bundled react-server-dom-webpack renderToPipeableStream under node `--conditions=react-server` with the same inline button-handler pattern. Result: `Event handlers cannot be passed to Client Component props`.
- Transpiled the actual `lib/util/util.ts` in memory using installed TypeScript, then called getDaysCountFromDateRange. Invalid input, reversed dates, and same-day range each return 1 billable day.
- Searched all app/lib files for checkout_id/payment_status/expires_at and unused exports. No application code reads expires_at or writes payment_status. No imports of createCheckoutSession, BookingCarCardCarousel, or getCarById were found.
- These are bounded local reproductions and static searches, not authenticated end-to-end validation. No claim about the live schema or current customer records is made.

## Suggested safe migration and validation order

1. Export live schema/RLS/Storage policy and backups before any migration. Establish a reproducible disposable database; do not run reset SQL against valuable data.
2. Contain public payment mutation and self-service role escalation together; close direct unrestricted booking writes. Auth team owns role/RLS design.
3. Agree rental time bounds, operating model, payment confirmation, cancellation/refunds, and delivery requirements. Use these to define a state machine and source of truth.
4. Add typed periods, positive/finite amount checks, stable booking/checkout identity, immutable snapshots and append-only events alongside existing fields. Parse and flag legacy invalid/overlapping records for manual resolution before enforcing constraints.
5. Add transactional reservation/finalization and unique attempt/provider IDs; prevent overlap at database level. Keep customer-readable availability aggregate separate from private bookings.
6. Migrate three-step URL flow to server-owned draft/quote ID, read-only receipt, proper payment reconciliation and reload recovery. Fix deterministic React issues and profile relation.
7. Make archive the normal fleet removal; add safe media lifecycle; replace misleading analytics/fake controls with true data or remove with owner approval.
8. Verify two-customer concurrent attempts, repeated finalize/webhook, expired/cancelled sessions, forged price/status/ownership, database errors, rollback after partial media upload, receipt reload, normal non-empty booking screens, status propagation, historical retention, mobile QR/print layouts. Tests should be regression tests for these failure cases, not implementation mirrors.

## Coverage

Read all 40 assigned source files in full:

```text
app/(dashboard)/customer/booking/step1/action.ts
app/(dashboard)/customer/booking/step1/BookingCarCardCarousel.tsx
app/(dashboard)/customer/booking/step1/BookingCarDetails.tsx
app/(dashboard)/customer/booking/step1/BookingMap.tsx
app/(dashboard)/customer/booking/step1/BookingStep1PageContent.tsx
app/(dashboard)/customer/booking/step1/page.tsx
app/(dashboard)/customer/booking/step2/action.ts
app/(dashboard)/customer/booking/step2/page.tsx
app/(dashboard)/customer/booking/step2/QRCheckoutContent.tsx
app/(dashboard)/customer/booking/step3/DownloadButton.tsx
app/(dashboard)/customer/booking/step3/error.tsx
app/(dashboard)/customer/booking/step3/page.tsx
app/(dashboard)/customer/bookings/page.tsx
app/payment/layout.tsx
app/payment/confirm/[session_id]/ConfirmPaymentClient.tsx
app/payment/confirm/[session_id]/page.tsx
app/api/payment/[session_id]/status/route.ts
lib/util/availability.ts
lib/util/util.ts
app/(dashboard)/admin/layout.tsx
app/(dashboard)/admin/(admin)/loading.tsx
app/(dashboard)/admin/(admin)/page.tsx
app/(dashboard)/admin/bookings/loading.tsx
app/(dashboard)/admin/bookings/page.tsx
app/(dashboard)/admin/cars/actions.ts
app/(dashboard)/admin/cars/CarCard.tsx
app/(dashboard)/admin/cars/loading.tsx
app/(dashboard)/admin/cars/page.tsx
app/(dashboard)/admin/cars/edit/[car_id]/EditCarPageContent.tsx
app/(dashboard)/admin/cars/edit/[car_id]/error.tsx
app/(dashboard)/admin/cars/edit/[car_id]/loading.tsx
app/(dashboard)/admin/cars/edit/[car_id]/page.tsx
app/(dashboard)/admin/cars/new-car/action.ts
app/(dashboard)/admin/cars/new-car/error.tsx
app/(dashboard)/admin/cars/new-car/loading.tsx
app/(dashboard)/admin/cars/new-car/NewCarPageContent.tsx
app/(dashboard)/admin/cars/new-car/page.tsx
app/(dashboard)/admin/cars/new-car/skeleton.tsx
app/(dashboard)/admin/cars/new-car/upload_images/[car_id]/page.tsx
app/(dashboard)/admin/cars/new-car/upload_images/[car_id]/UploadNewCarImagesPageContent.tsx
```

Additional full reads: AdminAnalyticsCharts.tsx, TextBox.tsx, Select.tsx, fuelTypes.ts, migration003. Focused reads/searches: migration001/002, config.toml, database.types.ts, FindCarForm.tsx. Live database, authenticated browser journeys, media policy enforcement, print preview, and responsive/keyboard testing remain unverified.
