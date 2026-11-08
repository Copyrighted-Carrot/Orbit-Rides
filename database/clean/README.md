# Clean database foundation

This is the clean reconstruction chain for a disposable Supabase PostgreSQL 17 project. It does not upgrade the historical Rental schema. Never combine it with the legacy `supabase/migrations` directory or run the old reset migration against either project.

## Reproduce the schema

Use a fresh Supabase project with an empty application schema and no Auth users. Keep all connection secrets outside the repository. Apply the SQL files in `migrations` in filename order, each within its own database transaction. The first migration refuses a nonempty application/Auth baseline. Migration 002 uses a transaction-local extension search path; do not split its statements across transactions.

Supabase supplies Auth, Storage, their roles, and their managed objects. This chain adds only the application schema, Storage bucket policies and the required `btree_gist` extension. It does not import the archive, sessions, password hashes or production customer records. Changes are forward migrations; applied files are immutable.

Deploy `functions/validate-media/index.ts` as the `validate-media` Edge Function with JWT verification enabled. Its credentials come from Supabase's server environment. No service key belongs in a browser or repository. The function also verifies the caller through Auth and the trusted `user_roles` table.

Create fresh Auth accounts through the project's administrative Auth interface. New accounts always receive the customer role, regardless of signup metadata. Provision the intended operator's role through a trusted database-owner operation; there is no customer-facing role mutation. Account data lives in `user_profiles`.

## Domain contract

| Concern | Authoritative state and command boundary |
| --- | --- |
| Identity | Supabase Auth; trusted `user_roles`; editable `user_profiles` through `update_my_profile` |
| Discovery | `search_fleet` filters and paginates canonical vehicles; dated searches delegate to `available_vehicles(start,end)` using reservation/maintenance allocations |
| Quote | `create_quote(vehicle,start,end,request_id)`; server snapshots price, customer, vehicle, configured pickup location and hold duration |
| Checkout | `start_checkout(quote_id)` returns one stable booking; its payment session is owner-scoped |
| Demo payment | Explicit `approve_demo_payment(session_id)`; decline/abandon commands are separate; no money transferred |
| Confirmation | Customer-only `finalize_booking(session_id)` verifies the timely recorded payment event and returns the same booking on retry; admin visibility does not grant payment authority |
| Receipt/history | Read-only `booking_receipt`, owner/admin bookings and append-only `booking_events` |
| Cancellation | `request_cancellation`, followed by staff `decide_cancellation`; pre-pickup requests retain inventory until explicit acceptance |
| Fulfillment | `mark_ready`, `pick_up`, `return_vehicle`, `start_inspection`, `finish_inspection`, then explicit `complete_booking` |
| Notifications | Owner-scoped projection of canonical events; `mark_notification_read` does not change a booking |
| Customer records | Owner-scoped `set_wishlist`, `record_vehicle_view`, `my_vehicle_activity` and `my_activity_summary`; `submit_review` derives identity from a completed rental |
| Fleet | Admin commands create/edit/publish/archive; historical vehicle references are retained |

Client table writes are revoked. Mutation functions validate the authenticated owner or trusted operator role and use pinned search paths. The SECURITY DEFINER advisor notices on these intentional command boundaries require review, not blanket removal of authorization logic. Public availability and review summaries reveal no other customer's booking identity.

Amounts are INR minor units. Each started 24-hour period is billable, with a minimum of one. Rental intervals are timezone-aware instants. Quote lifetime, ten-minute hold lifetime, payment provider and two-hour turnaround are server configuration in `private.rental_settings`. UI date inputs must carry the selected operating timezone consistently.

Reservations and maintenance share one exclusion constraint. Vehicle locks serialize allocation changes. A reservation next week does not block today. Expired unpaid holds are ignored by discovery and retired by reservation commands; explicit `reconcile_checkout` records expiry for a displayed checkout. Reads never finalize or silently mutate bookings. No scheduler or reminders are claimed.

Successful demo approval is a simulation, not settlement. UI must say **Demo payment — no money will be transferred.** The payment provider registry and event boundary allow a future provider without client-controlled booking rules. Cancellation creates no refund. Profile summaries label only completed simulated value; no demo amount is revenue or cash collected.

Ready is booking-specific. Pickup records the handover and active events together and makes the vehicle operationally occupied. Return makes it unavailable for inspection. Failed inspection keeps the rental under inspection and the vehicle in maintenance. Passing inspection records clearance; a separate idempotent `complete_booking` command completes the rental and releases its allocation. Actual-return turnaround, other reservations and maintenance still constrain availability. Staff notes, outcome reasons and inspection photos remain staff-only. Late-return penalties, refunds, no-show rules and discount campaigns are not implemented.


The singleton pickup location is public read-only and editable through the admin-only `configure_pickup_location` command. New quotes require a configured location and snapshot its name, city and address; edits do not rewrite earlier quotes. The explicit portfolio seed uses **Orbit Rides — Coimbatore, Tamil Nadu, India**, with **Demo pickup location** as its virtual-location label; no street address is invented. This is a simulation, not a claim that a rental office exists. Earlier synthetic quotes retain their original lack of a location snapshot.

Search accepts paired future timestamps, optional type/text/maximum daily rate and bounded pagination (up to 24 records per page). All filters apply before the count and pagination. Missing/archived UUIDs do not load a vehicle. Customer links carry scalar filters and a canonical UUID, never serialized vehicle or price objects. A query failure must show an error with retry, not an empty inventory result.

## Media lifecycle

1. An operator prepares a media association for a gallery slot or inspection.
2. Upload to its exact private bucket/path; no overwriting existing objects.
3. Call `validate-media` with `{ media_id, inspection }`. It downloads the canonical object, checks content/MIME/size, fully decodes a still JPEG/PNG/WebP, and records SHA-256 plus dimensions through a server-only RPC.
4. Publish gallery media or attach inspection evidence. Direct publication without decoded validation fails.
5. Gallery replacement retires the previous association. `retire_vehicle_media` removes an image from discovery without destroying its retained version. Republishing a retained validated version restores it.
6. Failed uploads are marked discarded, removed through Storage, then completed with `finish_discarded_upload`. Retry is safe. Upload and cleanup lock the same association, preventing late orphan inserts.

Limits: 8 MiB, 10,000 pixels per dimension and 20 million total pixels. Animated images are rejected. Storage and database operations remain separate; a failed upload is never represented as a published gallery image. Attached inspection evidence cannot be removed through fleet cleanup. The decoder uses ImageScript 3.13.1 under its MIT license option; upstream retains its third-party notices.

## Synthetic examples and checks

`seeds/001_catalogue.sql` contains eleven illustrative fleet units, without invented specs, customer PII or inherited image links. Run it in a transaction with `SET LOCAL orbit.demo_seed='enabled'`. It preserves existing matching fleet codes.

The lifecycle seed requires these fresh synthetic accounts: `operator@orbit-demo.example.invalid` (admin), `customer-a@orbit-demo.example.invalid` and `customer-b@orbit-demo.example.invalid`. Never reuse a production password or identity. `002_lifecycle.sql` owns its transaction: set the same flag immediately after its `BEGIN`. It runs real domain commands with a transaction-only fixture clock and restores the real clock before commit.

Examples cover completed, active, upcoming, cancelled and pending demo bookings, planned maintenance and a failed inspection. Reruns preserve references/history. A ten-minute checkout expires normally; `003_refresh_demo_checkout.sql` explicitly creates a fresh example while retaining expired attempts. It is not a production job.

SQL tests `account-bootstrap.sql`, `fleet-discovery.sql`, `checkout-integrity.sql`, `cancellation-circle.sql`, `fulfillment-circle.sql`, `domain-regression.sql`, `customer-records.sql` and `saved-activity-reviews.sql` run as database owner in isolated staging and roll back. The lifecycle seed is a prerequisite for customer-records tests. The older customer-records test refuses a project containing non-fixture Auth users; do not remove that safeguard or delete real accounts to run it. The saved-activity/reviews test selects the three named synthetic accounts and creates its own disposable vehicles/completed rentals through domain commands. Cancellation/fulfillment tests cover authorized transitions, duplicate commands, event evidence, inventory reconciliation, staff privacy and completed demo value. `media-concurrency.mjs` exercises real competing transactions against a localhost PostgreSQL 17 fixture only; it requires PGHOST, PGPORT, PGUSER, PGDATABASE, PGPASSFILE and optionally PSQL_PATH.

HTTP tests `auth-api.mjs`, `checkout-api.mjs`, `checkout-circle-api.mjs` and `media-api.mjs` receive JSON on stdin from an external secret store:

```json
{"project":"STAGING_REFERENCE","key":"PUBLISHABLE_KEY","accounts":[{"id":"FRESH_UUID","email":"SYNTHETIC_EMAIL","password":"FRESH_PASSWORD","role":"customer","display_name":"Demo Customer"}]}
```

The current harness explicitly guards the approved staging reference and requires one admin plus two customers. Tokens/passwords must never be logged or passed in command arguments. `checkout-circle-api.mjs` tests the checkout milestone without fulfillment or cancellation commands: forged inputs, owner boundaries, duplicate approval/finalization, event/notification consistency and simultaneous competing holds. It leaves synthetic confirmed history on an unpublished fixture vehicle. Checkout/media tests leave completed or cancelled synthetic history and archive their dedicated media fixtures. They test actual Auth, REST and Storage; native database tests do not replace hosted API checks.

Validate the Edge Function separately from Next.js:

```sh
deno check --no-lock --node-modules-dir=none database/clean/functions/validate-media/index.ts
```

This foundation does not make the legacy application screens compatible with the new schema. Integrate each complete UI/API/data chain separately; a passing database test is not completion of its customer/admin feature.

## Integrated checkout

New quotes are immutable, including the virtual Coimbatore pickup and configured hold duration. Older synthetic quotes remain readable; request a fresh quote to start checkout if the duration snapshot is absent. A successful approval must be recorded before the hold deadline. It moves the existing reservation to `awaiting_confirmation` and retains its allocation while the customer explicitly confirms; a later confirmation retry does not create another booking or payment. No refund or settlement is implied.

`/customer/checkout/[booking_id]` resumes the durable reservation. Its QR opens `/customer/payment/[session_id]`; this GET is read-only and requires the owning customer. Only the explicit approval action records the demo payment. Polling reads persisted state; it never approves or confirms. Expired pending sessions are reconciled through an explicit command, while discovery and new reservation commands already exclude/retire stale unpaid holds.

Customer receipt/history, admin booking views and checkout use one shared canonical read model. Bounded version checks discard results assembled across a concurrent payment/lifecycle transition. Customer timelines read append-only booking events. The notification center persists read state and links to those same bookings. Admin viewing does not grant permission to approve a customer's payment.

The old automatic QR approval endpoint and render-time booking creation are removed. Legacy routes redirect to canonical records or history; URL prices and serialized vehicle objects cannot create a reservation. The broader rehabilitation remains distinct from checkout completion.

## Cancellation and operations

Customer booking details accept a reasoned cancellation request only while confirmed or ready. A pending request blocks pickup but retains the reservation. Admin acceptance or rejection records one canonical outcome event and notification in the same transaction. Equivalent pending requests and identical decision retries reuse the saved result; conflicting decisions fail. Accepted cancellation preserves successful demo payment history without creating a refund.

Admin booking details expose commands for the current stage, bounded inspection/media reads, private handover records, inspection clearance and explicit completion. Server actions verify the current account and trusted admin role; database commands recheck authorization and state under vehicle/booking locks. Customer and admin timelines read the same event records, including previous/new state and booking reference for newly recorded events. Earlier events are not assigned invented transition snapshots.

Successful operational and cancellation submissions load the canonical booking page. Failed submissions retain their entered details; interrupted responses provide a saved-booking reload path before retry. The browser never optimistically assigns a lifecycle state.

Pickup records condition, mileage, fuel/charge, damage and staff notes. Return cannot reduce mileage. Inspection media uses its own private bucket and retained associations; gallery cleanup cannot delete attached evidence. Interrupted uploads remain visible for validation retry or explicit cleanup. Query failures surface as errors with a reload path, never as fabricated empty inspection history.

## Saved activity, reviews and comparison

Wishlist and recently viewed records contain only account/vehicle associations and timestamps. The browser's obsolete shared local-storage wishlist is discarded, never imported into an account. Add/remove commands are idempotent. Viewing an actual detail page sends an authenticated command after mount; GET rendering and link prefetch do not record a view. Repeated views update one row, and only the most recent twenty vehicles are retained.

`my_vehicle_activity` reads at most twelve canonical vehicle associations per page for the authenticated customer. Archived/unpublished associations remain identifiable but expose no gallery path or new-booking link. An archived saved vehicle can still be removed. Fleet archival does not delete bookings, reviews or recently viewed associations.

Only the owner of a completed booking can submit its one review. The command takes a booking reference, rating and comment, derives customer/vehicle from the booking, and serializes concurrent submissions on that booking. An identical retry returns success; a conflicting submission fails without changing the saved review. No general table writes, review editing or moderation authority are granted. Public review projections contain rating, comment and creation time without private customer/booking identifiers. Archived reviews remain visible to staff and customers with a completed rental of that vehicle.

Customer activity/profile, completed booking details and admin booking details read the same stored reviews. Vehicle review lists and totals use one SQL snapshot; bounded batch summaries supply browse/comparison ratings. Comparison shows only current manufacturer, model, type, rate, operational condition, stored review aggregates and authoritative dated availability. It accepts two or three canonical vehicle IDs and rejects unavailable selections; no synthetic score or cost estimate is displayed.

Failed submissions retain review input and offer a canonical reload path. Interrupted responses may be retried safely; successful submissions reload persisted state. Activity/review query failures produce errors rather than fabricated empty records. These feature checks do not resolve the separate Supabase leaked-password-protection advisory.
