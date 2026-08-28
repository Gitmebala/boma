# Boma

A farm operations app for Kenyan smallholder farmers, built mobile-first with Expo (no Android Studio needed to develop). Broiler is the first fully-built farm type.

## Status: real backend, real app shell, broiler module functional

Nothing here is a mock. The Supabase project (`BOMA`, project ref `dansiwlyigvrivzfocls`, region `eu-west-2`) is live, schema-migrated, and RLS-secured. This app talks to it directly.

### What's working end to end
- **Onboarding**: language → phone number → SMS OTP → farm type (multi-select) → farm setup → lands in the app with a real `farms` row and `farm_members` ownership row created.
- **Home**: live dashboard pulling from the `flock_summary` view — birds on farm, revenue, profit, active flocks with real progress bars, and an alerts feed (vaccines due/overdue, high mortality, unaccounted birds, overdue debt) computed the same way the original Kuku Pro Max spreadsheet did.
- **Flocks**: list + detail with Overview / Growth / Vaccines / Costs tabs. Creating a flock auto-generates its code (`F001`, `F002`...) and its full vaccine schedule via database triggers — not app code, so it can't be skipped.
- **Log**: five quick-entry actions (Deaths, Feed, Weigh, Expense, Sale) as bottom sheets. Supplier and customer fields use `EntityAutocomplete` — type a name once, it's saved to the farm forever; every future entry is a two-letter search and a tap.
- **Money**: debt aging with real balances (a Postgres view, not client math), one-tap WhatsApp reminders, expense list, and a cash reconciliation screen.
- **More**: farm settings, a real Farm Team screen (invite a worker by phone — they're auto-linked to the membership the moment they sign up, via a database trigger), suppliers, feed stock, equipment with real depreciation math, receipts (list wired, upload UI not built yet), language, help, and an honest plan screen (Pro tier marked "coming soon" — not a fake paywall).

### What's real infrastructure but not yet wired into UI
- A private `receipts` Storage bucket with RLS policies scoped per farm — ready for photo upload, no upload UI yet.
- `farm_types` supports layers/dairy/goats_sheep/crops/fish as selections at signup — only broiler has real screens. The others show "Coming soon" honestly rather than fake data.

### What needs you, specifically
1. **SMS OTP provider** — Supabase phone auth needs a provider (Twilio, MessageBird, or similar) configured in the Supabase dashboard under Authentication → Phone Auth before `sendCode`/`verifyCode` will actually deliver SMS. Right now signup will fail at that step until this is set.
2. **M-Pesa** — nothing wired. The Plan screen says so honestly instead of pretending to charge anyone.
3. **App icons / splash assets** — using the scaffold's placeholders (`assets/images/*`), swap for real Boma branding when ready.
4. **EAS Build** — to get this onto a real Android phone (not just the web preview), you'll want `eas build -p android` once you're ready — needs an Expo account, no Android Studio required.

## Running it

```bash
cd boma-app
npm install
npx expo start
```

Scan the QR with Expo Go on Android, or press `w` for the web preview.

## Where things live
- `lib/supabase.ts` — client + every table's TypeScript type, mirroring the live schema exactly.
- `lib/theme.ts` — the calm-interface design tokens (colors, type scale, spacing, motion) — change these, the whole app follows.
- `lib/alerts.ts` — the alert-computation logic, a direct port of the original `refreshAlerts()` from Code.gs.
- `components/ui/` — every reusable primitive (Button, Card, EntityAutocomplete, Sheet, etc.) — built once, used everywhere, so the app reads as one system.
