# Water UI ledger

The preview reuses the existing `money` table and the login adapter's authenticated
Supabase client. It reads the current local calendar month, paginated in groups
of 500, filtering by `type = expense` and the authenticated `user_id`.

Confirming a record synchronously persists it in an account-specific local outbox,
updates spending, and starts the drop animation. Upload starts after 750 ms and
never keeps the recording screen open. Failed uploads stay in the outbox and retry
after 30 seconds, on reconnect, on returning to the app, or on reopening it.
Timers only run while the WebView is running; this is not an Android background
service. The login page shows synchronization status and a refresh button.

The cache key includes both the project URL and user ID. Guest records remain in
`water-demo-records` and are not automatically uploaded or added to cloud totals.
Clearing app data removes unsynchronized records. Local storage failures keep the
editor open with an error instead of playing a successful-save animation.

Schema inspected on 2026-09-26: `id` is a bigint identity BY DEFAULT primary key;
`time` is unique. New records receive a persisted, random negative safe-integer ID,
separate from the server's positive sequence. Retrying checks that ID and owner
before inserting, and handles duplicate-key responses without overwriting rows.
The chosen consumption second is retained, with random microseconds to avoid the
existing unique-time constraint. Existing data and schema are unchanged.

The existing database RLS policy `all for authenticated` uses `USING (true)`.
Client-side user filters are not a security boundary; the existing policy does
not provide per-account row isolation. Database policy changes were not included
in this UI integration.

Validation: `test-ledger.cjs` uses mocked HTTP endpoints with the real Supabase SDK
and browser UI to exercise pagination, immediate animation, persistent pending
records, response-loss deduplication, reload, read failure and guest separation.
Existing login, record and water-animation tests cover regressions. Production
schema/security were inspected read-only; no synthetic expense was inserted into
the user's live ledger.

## Local-first updates and deletes (2026-10-09)

Updates and deletes now persist in the same account outbox as new records before
acknowledging the editor. The UI overlays pending operations on the server cache;
deletes are tombstones until acknowledged, so cloud refreshes cannot resurrect
them. Cached changes survive reload and cloud failures. Requests run sequentially
and acknowledge a unique operation ID; newer edits remain pending when an older
request completes. Consecutive undispatched updates may be merged. Save payloads
stay immutable for safe lost-response retry. Delete retry accepts an absent row.
An update of an absent/inaccessible cloud row remains pending with an error.

No server schema or version-based conflict detection was added. Across devices,
the last successful update wins. Synchronization requires the app to be running;
local cached data remains usable while connectivity fails. The cache still only
fetches the current month for the water gauge and history list, and local storage
is not an independent backup.

## Historical monthly statistics (2026-10-09)

The statistics page opens on the current local calendar month. Swipe up for an
older month and down for a newer one, stopping at the current month and earliest
expense month. Empty intervening months remain visible. The sunburst stays at
the screen center; horizontal swipes return home. Bottom guidance stays hidden.

On first app startup for an account without a complete statistics snapshot,
all expense records are fetched in pages of 500, ordered by time and ID and
filtered by the authenticated account. The shared monthly-stats.js aggregator
applies the latest durable local outbox and builds every month's three-level
category tree using integer cents. Only summaries are persisted; raw historical
records are discarded. No database schema was changed.

The complete snapshot is isolated by project/account and calendar timezone in
water-month-stats:v1:* with a :synced completion marker. There is no time-based
expiry or historical polling. Opening/swiping the statistics page never sends a
cloud request, and subsequent app startups reuse the completed snapshot. The
existing login-page refresh-consumption button refreshes both the current ledger
and every month's classification snapshot. Failed refreshes preserve the prior
snapshot. If initial loading fails, the user can retry with that same button;
there is no automatic historical retry timer. Guest summaries use local records.

Historical changes from other devices and locally edited historical records
are reflected by the next explicit refresh. Pending saves, edits and deletes
are included even if uploads fail. Current-month totals continue to use the
existing local-first ledger. Historical synchronization never replaces that
ledger or changes the water amount. Previous-account responses are ignored.

Validation: scripts/test-monthly-stats.mjs checks calendar boundaries, nested
category totals and persistent account isolation. test-month-stats.cjs uses
mocked authenticated requests to verify preload before visiting statistics,
pagination, local-only touch swipes, manual refresh, offline restart, and
pending cross-month edits. Existing ledger and browsing tests cover regressions.
