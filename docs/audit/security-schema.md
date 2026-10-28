# Orbit Rides — independent authentication, schema and profile audit

Date: 2026-10-28. Repository: `D:/Orbit Rides/Orbit Rides`, baseline `877c140`. Static evidence below was independently checked against current files. No application code, migration, live database, auth account, secret, Git identity, commit or remote was changed. No vulnerability was exercised against a live service. Findings about deployed Supabase are conditional on the supplied schema matching deployment and the usual API table grants; grants and deployed policies were not available.

## Executive assessment

The code has the beginnings of a useful Supabase-backed application, but the security boundary is inconsistent. Email login authenticates with Supabase, admin login checks the role table, profile writes bind the current user's ID, and table RLS exists. These are useful foundations to retain. Nevertheless, migration 002 reintroduces metadata-based admin escalation, lets customers directly create and modify commercially sensitive booking fields, and migration 003 exposes payment-session rows to public reads and updates. The migration sequence is not a reproducible, safe schema history. Google OAuth lacks its PKCE completion step. These are release blockers, not cosmetic concerns.

## Corrections to the previous audit

1. **Admin email registration is already disabled in the server action.** `app/auth/signupActions.ts:20-28` returns an error and performs no signup. The admin signup pages remain visible and promise access, so the UX is broken, but the page itself does not successfully grant admin. The independent critical issue is direct Supabase Auth signup with attacker-controlled metadata when migration 002's trigger is deployed.
2. **Do not assert notification or updated-at triggers are active.** Migration 001 creates them; migration 002 drops their tables, losing those triggers, and does not reinstall them. The final checked-in SQL does not provide those behaviors. Existing hosted database state remains unknown.
3. **Do not describe all authorization as client-side UI checks.** The Next middleware runs on the server, and Supabase RLS is a real server/database boundary. The problem is unsafe policies, fallback to mutable metadata, incomplete action guards, and a missing trusted business-operation layer.
4. **Do not claim customers can rewrite another user's booking solely from the own-booking UPDATE policy.** PostgreSQL reuses `USING` as `WITH CHECK` when omitted for UPDATE, so ownership is still required before and after the write. Prices, car, dates, statuses and references remain unrestricted within their own row. This distinction does not reduce the commercial integrity problem. [PostgreSQL policy semantics](https://www.postgresql.org/docs/15/sql-createpolicy.html).
5. **No app rate limit/CAPTCHA does not establish no upstream rate limit.** Supabase Auth may enforce its own limits; production settings were not inspected. Local config enables TOTP enrollment/verification (`supabase/config.toml:173-180`), but the app has no MFA flow or required-admin-MFA check.
6. **Local Auth config is not proof of production settings.** Email confirmation and secure-password-change are disabled locally; production email/OAuth/rate-limit/SMTP settings are unknown.
7. **The database types are not demonstrated to be generated from the deployed schema.** They are demonstrably inconsistent with the supplied SQL. Calling them hand-written is an inference, not something the file explicitly proves.

## Critical findings

### AUTH-01 — signup metadata can grant an administrative database role

Evidence: `supabase/migrations/002_reset_and_rebuild_schema.sql:68-89` creates a SECURITY DEFINER auth-user trigger that inserts `admin` when `NEW.raw_user_meta_data->>'role' = 'admin'`. Its backfill at `:91-101` trusts the same metadata. Migration 001's safer new-user trigger at `:34-48` always chose customer, but 002 replaces it; 001's historical backfill at `:50-61` also trusts admin/both metadata.

Impact: a client using ordinary Auth signup can supply metadata that becomes a trusted `user_roles` row. All `public.is_admin()` policies then authorize administrative reads/writes, including other customers' profiles and bookings and fleet deletion. Disabling the app's signup action does not close direct Auth access.

Recommendation: an additive migration must make default signup unconditionally customer, establish owner-approved admin provisioning, and audit existing privileged rows against a trusted admin allowlist. Do not rerun metadata-based backfills or blindly demote legitimate admins. Verify deployed trigger, grants and policies first.

### DB-01 — customer booking writes bypass prices, payment and transitions

Evidence: `supabase/migrations/002_reset_and_rebuild_schema.sql:191-233`: INSERT checks only `auth.uid() = user_id`; UPDATE checks only row ownership; `total_price`, `payment_status`, `car_id`, `date_range`, `checkout_id`, `booking_ref` and status have no business-operation restrictions. The status CHECK only limits allowed strings, not transitions. `checkout_id` is not unique. Dates are TEXT.

Impact: an authenticated customer can directly create their own confirmed/paid booking or rewrite commercial fields regardless of any frontend validations. They cannot gain ownership of another user's row from these own-row policies alone. No database exclusion/transaction guard prevents overlapping bookings.

Recommendation: revoke unrestricted client booking mutations; expose narrowly scoped, validated transactional functions/server operations. Resolve prices from inventory, enforce availability atomically, bind checkout/payment to the same user and booking, allow explicitly permitted transitions, and append immutable events. Preserve customer SELECT ownership policies.

### DB-02 — payment-session UUID is not an access control boundary

Evidence: `supabase/migrations/003_payment_sessions.sql:22-36`: public SELECT and UPDATE policies are `USING (true)`. Despite the comment saying access is by known UUID, the policies impose no ID filter. Realtime publication is enabled at `:39`.

Impact: with normal table grants, anonymous clients can enumerate sessions and alter status, amount, booking JSON, user/car association or expiration. No stolen UUID is required because the collection itself can be read. Actual grants and Realtime exposure require deployment verification.

Recommendation: remove public collection read/update permissions. Restrict user reads by ownership and move confirmation to a trusted payment process. If a cross-device capability flow is required, use a narrow endpoint with a separately protected token, explicit expiry, limited fields and idempotency; never a public table-update policy.

## High findings

### DB-03 — the migration chain cannot bootstrap cleanly and destroys data

Evidence: migration 001 first uses `ALTER TABLE public.cars` at `:66` and `public.bookings` at `:90` without creating their base tables. Migration 002 at `:15-24` drops ten public tables with CASCADE and recreates them. `supabase/config.toml:42-48` enables a missing `seed.sql`. Migration 003 unconditionally adds the table to `supabase_realtime` at `:39`, so manual replay is not fully idempotent.

Impact: a clean migration replay fails on missing base tables; running the reset script on an existing database deletes bookings, inventory, reviews, profiles and other business data. Preserving auth.users is insufficient to preserve the product. The scripts appear designed for manual SQL-editor use, not reliable incremental deployment.

Recommendation: back up and export deployed schema/RLS/functions/storage first. Reconcile migration history, establish a clean baseline for fresh databases, and use additive migrations with a tested data backfill for existing databases. Keep destructive resets confined to explicitly disposable development databases. Never test these migrations on production.

### DB-04 — reset loses timestamp, notification and retention behavior

Evidence: migration 001 creates recently-viewed cleanup (`:255-258`), cars/bookings/profile updated-at triggers (`:292-305`) and booking notification trigger (`:336-339`). Migration 002 drops all those tables (`:15-24`) and only recreates auth signup/profile triggers and booking-ref trigger (`:87`, `:246`, `:294`). No later migration restores the lost triggers.

Impact: after the supplied reset, updated_at stays at its insert value unless application code explicitly changes it; booking status changes do not enqueue notifications; recently-viewed retention has no trigger. Even migration 001's notification trigger runs only AFTER UPDATE, so an INSERT already confirmed would not produce its confirmation notification.

Recommendation: declare intended event behavior explicitly in the new schema. Install and test audit/timestamp/outbox mechanisms together with transitions; do not assume old functions still imply active triggers.

### AUTH-02 — OAuth's PKCE code is discarded before a session is established

Evidence: `app/pages/LoginPage.tsx:29-37` and `app/pages/SignupPage.tsx:13-21` redirect Google OAuth to `/auth/assign-user-role/{role}`. The route `app/auth/assign-user-role/[role]/page.tsx:16-20` immediately redirects to `/customer/`, preserving neither code nor session. No `exchangeCodeForSession` call exists in application source. Installed `@supabase/ssr/src/createBrowserClient.ts:149` defaults to PKCE and server client `:176` disables URL session detection. Middleware redirects an unauthenticated `/customer` request to login (`lib/supabase/middleware.ts:39-52`).

Impact: the ordinary OAuth callback chain drops `?code=` and cannot complete sign-in through this route; external provider configuration still needs runtime verification. This is more severe than merely an admin/customer redirect mismatch. The required exchange behavior is documented by [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

Recommendation: implement one dedicated callback that exchanges the code into session cookies, handles provider errors, then reads the trusted DB role and redirects to an allowlisted path. Add email-confirmation and password-recovery flows where the chosen Auth settings require them.

### AUTH-03 — role routing fails open to mutable/unknown metadata values

Evidence: `lib/supabase/middleware.ts:63-70` falls back to user metadata on absent role data/errors. Access checks at `:74` and `:82` only reject literal customer/admin respectively; a metadata role such as historical `both` or another string satisfies neither exclusion. The retained but unimported `app/auth/assign-user-role/[role]/AssignRolePage.tsx:19-57` still contains mutable role/both logic.

Impact: when the role row is missing/inaccessible or its lookup fails, browser-editable metadata can grant access to dashboard routes. A trusted RLS policy still protects database operations when correctly configured; this is not proof of bypassing correct RLS. Unrecognized roles should not be allowed through either protected route.

Recommendation: a shared `requireUser` / `requireAdmin` boundary should query trusted roles, validate the allowed role set, and fail closed. Remove metadata role fallback and retire the unused assignment component after import verification. Keep routing and authorization separate and test both.

### DB-05 — hard deletion cascades away rental history

Evidence: `supabase/migrations/002_reset_and_rebuild_schema.sql:193-194` cascades both car and auth-user deletion into bookings; `:309-311` clears review booking references and cascades car/user deletion; `003_payment_sessions.sql:9-10` cascades sessions as well. `cars.is_archived` exists at `002:162` but the schema does not protect history from hard delete.

Impact: history, commercial records and event reconstruction can disappear with a fleet/account deletion. Referential integrity is structurally satisfied while business auditability is destroyed.

Recommendation: fleet soft deletion plus restricted deletion of referenced vehicles; preserve immutable commercial snapshots and separate account erasure/anonymization decisions from destructive relational cascades. Define retention with the owner before schema migration.

### DB-06 — admin booking customer join has no declared relationship

Evidence: `app/(dashboard)/admin/bookings/page.tsx:15-28` embeds `user_profiles(display_name)` in a bookings query. Supplied SQL only relates `bookings.user_id` to `auth.users` (`002:194`), and `user_profiles.user_id` also to `auth.users` (`002:254`). No direct public FK, computed relationship or view exists. Types list only the car relation for bookings (`database.types.ts:70-78`). Query errors are discarded at page `:28`, then rendered as “No bookings found” at `:77-81`.

Impact: against the supplied schema, PostgREST cannot infer the requested direct booking/profile relationship and the admin screen can hide all bookings as an empty state. Hosted schema might contain an undocumented relation; verify the actual API response before changing production.

Recommendation: create an intentional query/view/RPC or fetch profiles by the returned user IDs with authorization. Distinguish unavailable/error from empty. Generate types from the reconciled database.

## Medium findings

### AUTH-04 — redirect responses discard refreshed cookies

Evidence: `lib/supabase/middleware.ts:19-27` writes updated auth cookies to `supabaseResponse`, while all redirects at `:46`, `:51`, `:78`, `:86`, `:94`, `:102`, `:110` construct a different `NextResponse.redirect` without copying them.

Impact: on requests that refresh a session and then redirect, the browser may retain stale refresh/access cookies, causing intermittent auth failures. Runtime timing needs a refresh-boundary test.

Recommendation: carry cookie changes into redirect responses and test expired-token requests across protected/auth routes.

### AUTH-05 — passwords are serialized back into action state

Evidence: `app/auth/loginActions.ts:29-40,55-60`, `app/auth/signupActions.ts:25-27,34,52-62`; both forms bind `state.data.password` (`app/pages/LoginPage.tsx:60-61`, `SignupWithEmailPage.tsx:47-48`).

Impact: failed actions return sensitive submitted passwords in response/state beyond the required Auth request. No third-party leak is proven; this is unnecessary secret handling and makes accidental logging/inspection exposure easier.

Recommendation: return only safe non-secret form fields and a structured error code. Never persist or return the password.

### AUTH-06 — account lifecycle and error handling are incomplete

Evidence: signup redirects straight to `/customer/` on a no-error response (`signupActions.ts:47`), without checking whether a session exists or confirmation email is required. No recovery, password-reset, verifyOtp or email callback handler exists. Admin signup pages still promise administrator access (`app/auth/(forms)/admin/signup/page.tsx:5`, signup-with-email `:5`) while the action refuses it. Form actions trust cast FormData without runtime parsing/length limits; errors are surfaced as raw backend messages. `UserProfile.tsx:42-48` leaves signout busy forever after error.

Recommendation: define and test confirmation/recovery/onboarding/logout states, render honest admin sign-in UI, validate inputs on the server, and provide consistent user-safe errors. Preserve authentication through Supabase rather than replacing it blindly.

### DB-07 — schema allows invalid physical/commercial data

Evidence: `002:139-168` lacks constraints on positive price, fuel range, seats, year or capacities; `:191-211` lacks date order, pickup-time range, positive total or lifecycle/payment consistency; `:391-400` removes migration 001's `discount_percent > 0 AND <=100` constraint and has no validity interval or nonnegative usage bounds. `payment_sessions.amount` has no nonnegative constraint (`003:13`).

Recommendation: establish owner-approved units/time semantics, profile validation and DB CHECK constraints; add date/time types and atomic availability constraints. Test legacy records before validating constraints. Do not infer hourly/day/buffer rules from the current UI alone.

### DB-08 — reviews can reference unrelated bookings and public identifiers

Evidence: `002:307-329` makes booking_id nullable and checks only `review.user_id = auth.uid()` for INSERT/UPDATE. It does not verify booking ownership, matching car, completion, or uniqueness per booking. SELECT is public for the entire row, including user_id/booking_id.

Impact: direct authenticated API access can fabricate a review for any car or attach a review to another booking. Public queries expose stable internal identifiers whether the UI has a review form or not.

Recommendation: if reviews are retained, restrict creation to the booking's customer after completion, constrain car/booking agreement and duplicates, and expose a limited public projection with approved display fields.

### DB-09 — public fleet policy ignores availability/archive status

Evidence: policy named “Anyone can view active cars” uses `true` (`002:172-174`). It exposes all columns, including owner_id and archived/maintenance inventory, under normal table grants.

Recommendation: define intentional public inventory visibility and a limited projection, while admin views retain complete records. Do not rely on frontend filters as a privacy/access control boundary.

### DB-10 — missing indexes and unbounded totals undermine scaling/accuracy

Evidence: no explicit bookings user/car/date/status/created indexes in supplied migrations; primary key and unique booking_ref alone do not match main query filters. `profile/page.tsx:28-55` makes separate sequential queries, fetches all total_price rows, and sums in JS. Local API max_rows is 1000 (`supabase/config.toml:16`), so “total” can be truncated at that cap if production uses the same setting. Only payment-session status/user explicit indexes exist (`003:42-43`).

Recommendation: indexes based on real query plans, server-side aggregate totals with intentional status/payment filters, and pagination. Verify production API limits and datasets before estimating impact.

### PROFILE-01 — “Total Spent” and wishlist counts do not represent the user's activity

Evidence: `profile/page.tsx:28-34,113-114` sums every booking price including cancelled/pending/unpaid rows, and counts DB wishlists at `:51-55`; UI wishlist writes only localStorage (`app/components/WishlistContext.tsx:21-37`). No payment aggregate is used.

Impact: a successful profile page reports booked value as paid spend and typically a zero/different saved-car count. Read errors at `:21-55` silently become zero/empty results.

Recommendation: derive spending from the eventual payment ledger or label it honestly, choose one wishlist persistence model, and handle query failures independently of empty states.

### PROFILE-02 — profile changes and identity display diverge

Evidence: settings writes `user_profiles` (`settings/actions.ts:15-23`), but navbar `UserProfile.tsx:24-27` reads only auth metadata. It calls `userName.substring` at `:72` although metadata can lack both names. Subscription at `:29-32` is never unsubscribed and updates only authentication, not name/avatar.

Impact: display-name edits do not appear consistently; an account without names can crash the profile control; remounts accumulate subscriptions.

Recommendation: one profile source/fallback, schema validation for metadata, safe empty-name rendering, lifecycle-managed subscriptions, and explicit refresh after updates.

### PROFILE-03 — profile form has no server validation and inaccessible labels

Evidence: `settings/actions.ts:5-23` relies on TypeScript types only, accepting arbitrary string lengths/phone/license values; license expiry validity is left to DB DATE parsing. Form labels at `SettingsPageContent.tsx:57,73,89,104` have no htmlFor and inputs have no matching IDs. Server settings/profile loads ignore query errors.

Recommendation: runtime validation with field errors linked to input IDs, intentional required/optional fields, validation of dates and phone formats, and explicit loading/error/empty states. Never treat a stored license string as verified eligibility.

### DB-11 — types and security hardening do not track supplied SQL

Evidence: `database.types.ts:106,135` makes cars.owner_id required/non-null while SQL `002:149` is nullable with SET NULL; payment_sessions types `:260-267` require user/car/created/expires values which SQL `003:9-16` allows null. `Functions` is empty (`:442-444`) despite SQL is_admin. Most SECURITY DEFINER trigger functions lack a fixed search_path, whereas is_admin explicitly sets one (`002:51`). Storage has only generic size/config settings (`config.toml:76-89`), no tracked bucket or object RLS migrations.

Recommendation: generate types after schema reconciliation; use a fixed search_path and qualified identifiers for privileged functions, explicit execution/table grants, and tracked Storage bucket/policy definitions. No search-path exploit or upload access bypass is proven without actual grants/storage configuration.

## Database inventory and relationships

| Table | Purpose and relationships | Current disposition |
|---|---|---|
| user_roles | One role per auth user; auth-user cascade | KEEP, fix provisioning and trusted lookup |
| user_profiles | One profile per auth user; includes phone/license data | KEEP, validate and minimize exposure |
| car_types | Shared type lookup; seeds mix fuel types and body classes | SIMPLIFY; separate fuel/body taxonomies |
| cars | Fleet, type FK, optional auth owner, specs and three availability fields | FIX; owner model NEEDS DECISION |
| bookings | Customer and car FK; text dates, mutable commercial fields | REBUILD write boundary and constraints; retain valid data |
| reviews | Customer/car and nullable booking FK | INVESTIGATE; enforce verified rental provenance if kept |
| wishlists | Unique customer/car pair | SIMPLIFY; reconcile DB with localStorage |
| recently_viewed | Repeated customer/car views | INVESTIGATE; no active retention after reset |
| notifications | User messages/read flag/link | FIX/REBUILD producer and consumer; row UPDATE allows more than read flag |
| discount_codes | Seeded ORBIT10/WELCOME20; not a pricing integration | NEEDS DECISION; validate/redesign if kept |
| payment_sessions | Publicly mutable checkout JSON and amount, expiry field | REBUILD checkout contract; not a payment ledger |

Missing domain entities: append-only booking events, immutable priced checkout/order lines, payments/provider events/refunds, vehicle block periods, verified driver/eligibility status and fulfillment/tracking events. Which are required depends on owner choices; do not add all blindly.

## Environment and configuration inventory (names only)

App client/server/middleware require `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. OAuth components optionally use `NEXT_PUBLIC_OAUTH_REDIRECT_URL` as a **base path**, appending `/admin` or `/customer`; set and validate its semantics when replacing callbacks. Other application env names are covered by the root audit. Local Supabase config also references `OPENAI_API_KEY`, `SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN`, `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET`, `S3_HOST`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`; these are optional tooling/provider placeholders rather than all mandatory app variables. SMTP examples are commented out. No secret file values were read.

## Coverage

Read in full: all 11 files under `app/auth/**`; all 4 files under `app/pages/**`; root `middleware.ts`; all 3 `lib/supabase/**` clients/middleware; all 3 migrations plus Supabase config and ignore file; `database.types.ts`; all 3 `lib/types/**`; all 3 customer profile files and all 5 customer settings files. Cross-checked in full: admin bookings page, UserProfile, WishlistContext and next.config. Queried whole application for OAuth exchange, password recovery, role component imports and profile writes. Inspected installed SSR defaults for PKCE behavior. No authored source in the assigned scope was intentionally skipped. node_modules was not comprehensively audited.

Not verified: live DB/schema/RLS/grants/Storage, existing data and privileges, hosted Auth/provider settings, deployed OAuth redirects, actual Supabase response errors, runtime sessions/cookie rotation, account UI behavior, live abuse limits, license workflow, production migration replay. Root agent owns build/lint/runtime work; this report did not run parallel builds or tests.

## Safe implementation order and acceptance checks

1. Export deployed schema/policies/functions/storage and make backups; test fresh bootstrap on a disposable local database. Reconcile migration history rather than applying 002 to production.
2. Close role escalation and unrestricted payment/booking writes with additive changes. Test anonymous, customer A, customer B and admin through direct API and app actions; negative assertions matter.
3. Fix PKCE callback, fail-closed role lookup and cookie propagation. Test fresh email signup with confirmations on/off as configured, login on both screens, logout failures, OAuth callback errors, expired token refresh, missing role and unknown metadata role.
4. Add validated booking operations/constraints/events; run concurrent overlapping creates and idempotent retry checks with two customers. Snapshot business fields and protect history against car deletion.
5. Repair admin/profile queries and errors; test actual DB relationship resolution, zero/one/many records, over-1000 record totals, cancelled/unpaid spend and wishlist/profile consistency.
6. Decide account/driver requirements, admin provisioning, single-operator versus marketplace, payment/booking time/cancellation semantics before product implementation. Design only the necessary feature set.
