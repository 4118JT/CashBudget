A polished personal finance tracker built with **Next.js 14**, **Supabase**, and **Tailwind CSS**.

## Features

- 🔐 Email/password authentication with auto-provisioned profile & account
- 📊 Summary cards — income, expenses, and net balance for the current month
- ➕ Add transactions with category, date, notes, and inline validation
- 🎯 Add savings goals with amount and due date
- 🔍 Filter by type / category / date range; sort by newest, oldest, or amount
- 📈 Analytics — 6-month monthly overview + spending by category (CSS bar charts)
- 🗑️ Delete transactions with confirmation toasts
- 📱 Responsive layout for mobile and desktop

## Apps

- `apps/web` — Next.js web app (Vercel-ready)
- `apps/mobile` — Expo React Native app _(separate setup)_

## Backend

- **Supabase** (Postgres + Row Level Security + Auth)
- Base schema: `supabase/schema.sql`
- Migration: `supabase/migrations/001_auto_profile_and_account.sql`

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
```
