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
