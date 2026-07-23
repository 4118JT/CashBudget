A polished personal finance tracker built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

## Features

- 🔐 Email/password authentication with auto-provisioned profile & account
- 📊 Summary cards — income, expenses, and net balance for the current month
- ➕ Add transactions with category, date, notes, and inline validation
- 🎯 Add goals/subscriptions with amount, due date, and one-time/monthly/yearly recurrence
- 🔍 Filter by type / category / date range; sort by newest, oldest, or amount
- 📈 Analytics — 6-month monthly overview + spending by category (CSS bar charts)
- 🗑️ Delete individual transactions or bulk-delete visible filtered transactions
- 📱 Responsive layout for mobile and desktop

## Apps

- `apps/web` — Next.js web app (Vercel-ready)
- `apps/mobile` — Expo React Native app _(separate setup)_

## Backend

- **Supabase** (Postgres + Row Level Security + Auth)
- Base schema: `supabase/schema.sql`
- Migrations:
  - `supabase/migrations/001_auto_profile_and_account.sql`
  - `supabase/migrations/002_add_planned_expenses.sql`
  - `supabase/migrations/003_harden_rls_and_backfill_tables.sql`
  - `supabase/migrations/004_add_loans_and_recurring.sql`
  - `supabase/migrations/005_add_plaid_integration.sql`

---

## Setup

### 1. Prerequisites

- Node.js 20+
- npm 10+
- A [Supabase](https://supabase.com) project

### 2. Clone & install

```bash
git clone https://github.com/4118JT/CashBudget.git
cd CashBudget
npm install          # installs root workspace
cd apps/web
npm install          # installs web dependencies
```

### 3. Configure environment variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values are found in your Supabase project → **Settings → API**.

### 4. Apply the database schema

In the **Supabase SQL Editor**, run these in order:

1. `supabase/schema.sql` — creates all tables and RLS policies
2. `supabase/migrations/001_auto_profile_and_account.sql` — adds the trigger that auto-creates a profile and default account for every new sign-up, and back-fills existing users
3. `supabase/migrations/002_add_planned_expenses.sql` — adds the `planned_expenses` table and RLS policy for savings goals on existing projects
4. `supabase/migrations/003_harden_rls_and_backfill_tables.sql` — back-fills missing core tables and rebuilds per-operation RLS policies for authenticated users
5. `supabase/migrations/004_add_loans_and_recurring.sql` — adds the `loans` and `recurring_payments` tables with RLS policies
6. `supabase/migrations/005_add_plaid_integration.sql` — adds Plaid item/account mapping tables and extends transaction source values

### 5. Run locally

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com) and set the **Root Directory** to `apps/web`.
3. Add environment variables in Vercel's project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-detects Next.js.

---

## Environment variables reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key used by server routes |
| `PLAID_CLIENT_ID` | Plaid client ID |
| `PLAID_SECRET` | Plaid secret |
| `PLAID_ENV` | Plaid environment (`sandbox`, `development`, or `production`) |
| `PLAID_TOKEN_ENCRYPTION_KEYS` | Comma-separated key map (for example `v1:base64key`) |
| `PLAID_TOKEN_ENCRYPTION_CURRENT_VERSION` | Active encryption key version (for example `v1`) |
| `PLAID_WEBHOOK_URL` | Public webhook URL used for transaction update callbacks |
| `PLAID_WEBHOOK_SECRET` | Shared secret expected in `x-plaid-webhook-secret` webhook header |
| `EXPO_PUBLIC_SUPABASE_URL` | Same URL for the Expo mobile app |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same key for the Expo mobile app |

---

## Project structure

```
apps/
  web/
    app/
      components/       # React components (NavBar, SummaryCards, forms, etc.)
      globals.css        # Tailwind base styles
      layout.tsx         # Root layout
      page.tsx           # Main app page
    lib/
      supabase.ts        # Supabase client
    tailwind.config.js
    postcss.config.js
supabase/
  schema.sql             # Full database schema
  migrations/
    001_auto_profile_and_account.sql
    002_add_planned_expenses.sql
    003_harden_rls_and_backfill_tables.sql
    004_add_loans_and_recurring.sql
```
