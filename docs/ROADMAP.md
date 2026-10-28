# Orbit Rides — implementation roadmap and Git strategy

Date: 28 October 2026. Status: proposed for owner discussion; audit and repository hygiene only have been performed. Evidence: [system audit](SYSTEM_AUDIT.md). Do not silently turn the choices below into requirements.

## First useful product milestone

A customer can find an eligible car, receive a trusted quote, submit one reservation, see an honest confirmation/payment state, reload the receipt and history, and follow the booking through staff-controlled fulfillment/cancellation/return. Two customers cannot reserve the same interval. A staff member can maintain fleet availability, manage allowed transitions and see an accurate record of what happened. Failed requests produce clear recoverable errors.

Retain the Next/Supabase foundation and useful components. Refactor the business-operation boundary and data constraints instead of replacing the whole application. Tracking should begin with an auditable lifecycle if that meets the owner's needs; GPS is a separate integration and decision.

## Owner decisions required before domain implementation

| Decision | Alternatives | Why it changes implementation |
|---|---|---|
| Operating model | Single fleet operator; multi-owner marketplace | Determines owner permissions, host onboarding, payouts and fleet tenancy. Current schema does not supply a working marketplace. |
| Payment/confirmation | Request-to-book/manual approval; pay at pickup; online provider/deposit | Determines checkout state, when inventory is held, expiry, settlement/refunds and customer wording. Never label simulation as payment. |
| Rental intervals | Whole days; exact pickup/return timestamps; turnaround buffer | Determines database exclusion boundaries, rates and availability. Specify business timezone. |
| Fulfillment | Fixed pickup hubs; delivery area/address/pin; both | Determines eligibility, location schema, fees and staff tasks. |
| Tracking | Booking timeline; dispatch/delivery progress; actual GPS | Determines actors/events and external telemetry requirements. |
| Cancellation/refunds | Cutoff, fees, approval, refund timing | Determines transition rules, ledger operations and retained history. |
| Admin provisioning | Owner-managed/invited staff | Public self-registration cannot grant admin. Define existing legitimate admins before cleanup. |
| Optional features | Reviews, discounts, wishlist, notifications, trip planner, inspections | Keep only those supporting a defined user need; agree removal of unused/demo features. |
| Brand | Audience, service area, honest claims, light/dark preference | Guides new palette, tokens, content and hero asset. No invented fleet/customer counts. |

## Phase 0 — repository and release baseline

**Problem:** unpatched framework/dependency graph, non-reproducible migrations, unknown live schema and inadequate test evidence.

**Work:** establish owner's GitHub access and sole-author identity; back up database/media; export public/Auth-adjacent functions, RLS, grants, indexes and Storage policies without secrets; reconcile migration history; create a disposable database. Stabilize supported Node/Next/React/dependencies and declare directly imported packages. Keep lockfile. Run security review of reachable dependencies; do not blindly apply major `audit fix` changes.

**Affected:** package manifests/lock, configuration, schema baseline/migrations, env example, test tooling. **Risks:** dependency API changes, schema drift, data loss from reset scripts. **Migration:** work from an exported baseline with additive changes and rollback; never replay 002 against valuable data.

**Exit:** clean install/build/type/lint in chosen runtime; fresh disposable database initializes; baseline snapshot/restore proven; critical applicable advisories addressed; no secrets committed.

## Phase 1 — trusted authentication and authorization

**Work:** customer-only default signup, controlled admin provisioning, role audit, fail-closed shared guards on actions/routes, safe PKCE callback and refresh-cookie redirects, correct login/logout/confirmation/recovery states. Remove password echo from action responses. Close public session mutation and unrestricted commercial booking writes in tandem with trusted replacement operations.

**Affected:** auth actions/callback/middleware, Supabase policies/functions, role-aware menus, account forms. **Risks:** locking out legitimate admins or breaking existing sessions; prepare an owner recovery path and migration validation first.

**Exit:** anonymous/customer A/customer B/admin matrix passes using direct API as well as UI. Unknown/missing roles fail closed; metadata edits cannot elevate privileges; other users' records remain private; OAuth and token refresh complete.

## Phase 2 — booking data and atomic reservation

**Work:** canonical vehicle ID and operational eligibility, typed intervals/locations, server-owned price breakdown/currency, database conflict prevention, unique attempt/checkout identifiers, explicit status transitions, immutable snapshots and append-only booking events. Separate operational maintenance blocks from date reservations. Prefer archive to hard delete.

**Affected:** cars/bookings schema/types, availability helper, shared domain actions, admin mutations. **Migration:** add new columns alongside legacy fields; parse/backfill valid dates and prices; quarantine ambiguous/overlapping records for owner review; add constraints only after reconciliation; cut reads/writes over; retire legacy fields later.

**Exit:** parallel conflicting requests yield one reservation; nonconflicting periods succeed; invalid/reversed inputs and query failures are rejected; retries return the same reservation; historical bookings survive archive/account-policy actions.

## Phase 3 — honest checkout and durable receipts

**Work:** one persisted draft/quote/reservation ID across every entry point; explicit finalization rather than render-time mutation. Implement the chosen payment model with expiration, ownership, idempotency and reconciliation. For online payments, provider-authenticated webhook events—not browser clicks—establish paid state. Provide read-only confirmation URLs and failure/retry recovery.

**Affected:** booking step pages/actions, payment API/UI/session schema, provider adapter only if chosen. **Risks:** mismatched quote/payment totals, duplicate finalization, abandoned holds. Preserve old records and validate migration mapping rather than deleting history.

**Exit:** forged price/session/user/status rejected; expired/cancelled sessions cannot confirm; repeated refresh/finalize/webhook never duplicates a booking or charge; receipt reload and customer history work after a confirmed booking. Fix object-child and Server Component event-handler defects in this milestone.

## Phase 4 — fulfillment, admin and customer synchronization

**Work:** staff-controlled transitions with actor/time/reason, customer timeline, correct booking/profile query, safe cancel/complete flows, meaningful payment reporting, inventory/media management. Implement notification producer/read/acknowledgement only if retained; preserve events regardless of notification delivery. Pagination/search/filter/error states must use real data.

**Affected:** admin dashboard/bookings/cars, customer history/profile, event/notification read models and Storage policies. **Risks:** stale clients and reporting semantics; define whether values mean booked, collected or refunded.

**Exit:** staff changes appear in authorized customer views; invalid transitions rejected; list errors cannot masquerade as emptiness; totals agree with canonical ledger/records including more than the API row cap; media failure is recoverable.

## Phase 5 — customer discovery and product simplification

**Work:** one filterable eligible inventory dataset; date/time validation; manual location fallback; stable vehicle detail and saved/resume links; consistent currency/specs; per-user wishlist if chosen. Remove approved unreferenced/demo features and unused dependencies. Replace fabricated claims/metrics and stale privacy copy with verified operational content.

**Exit:** full search-to-receipt journey works for ordinary vehicle prices and permission-denied geolocation; zero/one/many/image-error states work; remaining controls have a defined backend/local purpose; no dead navigation promises remain.

## Phase 6 — new visual identity and accessible responsive UI

**Work:** approve brand direction; define semantic color/spacing/type tokens; rebuild shared controls, layouts, dialogs and feedback around the verified workflow. Choose an optimized hero still/clip with poster/fallback if useful. Optimize heavy logos/assets. Remove arbitrary luxury metrics/gradient/glass repetition. Preserve owner brand/legal attribution.

**Exit:** actual device/viewport checks at 320, 390, 768 and 1280 widths plus short/split-screen; keyboard/focus/dialog/error behavior; contrast and reduced motion; image/video failure and slow network; readable print receipt. Confirm metadata, private-page indexing and social cards.

## Phase 7 — production hardening and release

**Work:** indexing/query plans, payload limits, server aggregates, monitoring/error correlation, backups/restore, deployment env verification, abuse/cost limits, security headers where appropriate, media policy tests and regression suite. Validate actual provider settings, redirects, database policies and operational procedures.

**Exit:** end-to-end customer/admin suite and adversarial ownership/concurrency/idempotency cases pass on production-like isolated data; no applicable critical dependency issues; rollback and restore work; owner accepts remaining business/design decisions. Testing starts in phases 0–1 and continues throughout—it is not deferred to this phase.

## Git strategy

- `main` remains the deployable baseline. A solo project does not currently need a permanent `develop` branch.
- Current `audit/repository-review` contains only documentation/ignore changes and unused asset removals. Review it independently of application fixes.
- Create one short-lived topic branch per coherent phase/change: examples `fix/security-boundaries`, `refactor/booking-integrity`, `feature/checkout-lifecycle`, `feature/booking-timeline`, `fix/customer-discovery`, `ui/brand-system`. These are suggestions; do not precreate every branch.
- Commit only reviewed logical changes with precise messages, such as “Document system audit and archive unused assets.” Use only `Copyrighted-Carrot <belindosamson@gmail.com>` for author **and committer**. No assistant/co-author trailers, collaborators, bot identities or Actions are to be added.
- Check author/committer and commit message before publishing. Use owner-owned pull requests if desired; merge attribution must preserve the owner identity. Do not force-push or remove old history as routine cleanup.
- Removing tracked assets from a new commit removes them from the current tree, not from historical Git objects. History rewriting is a separate disruptive operation and has not been requested or performed.
- Owner confirmed the corrected destination `Copyrighted-Carrot/Orbit-Rides`. The initially empty public repository was initialized with the cleaned snapshot on main and audit/repository-review using an atomic push of existing owner-authored history. Both refs and author/committer attribution were verified. Local origin is updated. Future implementation should use reviewed topic branches/PRs; do not overwrite unexpected remote work.

## Immediate next actions

1. Review this audit and decide operating model, payment path, rental time/turnaround, delivery and tracking scope.
2. Review the published cleanup/audit snapshot in the owner repository; start the next approved change from its main branch with owner-only attribution.
3. Export live Supabase schema/policies/grants/Storage config and create isolated test data for phases 0–1.
4. Implement the smallest security/booking foundation increment; update project state and attach real regression evidence before moving to redesign.
