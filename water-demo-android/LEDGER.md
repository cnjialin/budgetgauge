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
