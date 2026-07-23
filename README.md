# CashBudget

Monorepo for CashBudget web + mobile personal spending tracker.

## Apps
- `apps/web` — Next.js web app
- `apps/mobile` — Expo React Native app

## Backend
- Supabase (Postgres + Auth)
- SQL schema at `supabase/schema.sql`

## Quick start

### 1) Prerequisites
- Node.js 20+
- npm 10+
- Expo Go app on your phone (for mobile testing)
- A Supabase project

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment
Copy `.env.example` to `.env` in:
- root (optional shared)
- `apps/web/.env.local`
- `apps/mobile/.env`

Set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### 4) Run database schema
In Supabase SQL editor, run `supabase/schema.sql`.

### 5) Run web app
```bash
npm run dev:web
```
Open http://localhost:3000

### 6) Run mobile app
```bash
npm run dev:mobile
```
Scan QR with Expo Go.

## MVP features included
- Email/password auth (web + mobile)
- Create transactions
- List recent transactions
- Planned spending CRUD (basic)
- Simple dashboard totals

## Next improvements
- CSV import + dedupe queue
- Recurring planned expenses
- Category insights charts
- Notifications/reminders
