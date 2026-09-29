<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## OdontoERP decisions
- Roles live in `user_roles` + `has_role()`; permissions per module in `src/lib/permissions.ts` must mirror RLS policies — UI hiding is not security.
- Login goes through `loginWithLock` server fn (3 failures → 15 min lock in `login_attempts`, service-role only), then client `setSession`.
- App shell (sidebar + role route guard) lives in `src/routes/_authenticated/route.tsx`.
- Appointment conflict and working-hours rules are enforced by the `appointments_validate` trigger; the Agenda UI (`src/lib/schedule.ts`) mirrors them only for highlighting/suggestions. Why: UI checks can be bypassed.
- Clinical evolutions are immutable via the `evolutions_guard` trigger; chart access is `can_access_chart()` (admin, or dentist with an appointment for the patient). Finishing a visit goes through the `finalize_appointment` RPC so evolution, step completion and status change are atomic.
- Quote discounts >15% are enforced by the `quotes_guard` trigger (only admin or service role may insert); receptionists get admin authorization via the `createQuoteWithAdminAuth` server fn, which verifies the admin password and inserts with the service client. Why: UI-only checks can be bypassed.
- Payments are append-only (`payments_guard`); money moves only through `approve_quote`, `register_payment` and `refund_payment` (admin-only) RPCs, which keep `receivables.paid_amount`/status in sync. "Vencida" is derived at read time, never stored.
- Quote PDF and receipts are print routes using `PrintSheet` + `@media print` CSS, no PDF library.
- Stock balances change only via `stock_entry`/`stock_exit` RPCs (admin-checked, block use of expired lots); `stock_movements` is append-only (guard trigger). Restock alerts are derived from balance < minimum at read time, so they clear automatically.
- Reports (`relatorios.tsx`) aggregate in the browser under admin RLS; revenue per dentist = dentist of patient's last realized appointment up to payment date. Why: payments aren't linked to appointments.
