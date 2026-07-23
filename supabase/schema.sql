create extension if not exists pgcrypto;

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  currency text default 'USD',
  monthly_budget numeric(12,2) default 0
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Apple Cash',
  type text not null default 'wallet',
  starting_balance numeric(12,2) not null default 0,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense','income')),
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,

  amount numeric(12,2) not null check (amount >= 0),
  kind text not null check (kind in ('expense','income')),
  merchant text,
  category_id uuid references categories(id) on delete set null,
  occurred_at timestamptz not null default now(),
  note text,

  status text not null default 'confirmed' check (status in ('draft','confirmed')),
  source text not null default 'manual' check (source in ('manual','notification','import')),
  external_ref text,
  dedupe_hash text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists ux_transactions_user_external_ref
on transactions(user_id, external_ref)
where external_ref is not null;

create index if not exists ix_transactions_user_occurred_at
on transactions(user_id, occurred_at desc);

create table if not exists planned_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,

  title text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category_id uuid references categories(id) on delete set null,
  due_date date not null,
  recurrence text default 'none' check (recurrence in ('none','weekly','monthly','yearly')),
  status text not null default 'planned' check (status in ('planned','paid','skipped')),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender text,
  original_amount numeric(12,2) not null check (original_amount >= 0),
  remaining_balance numeric(12,2) not null check (remaining_balance >= 0),
  interest_rate numeric(5,2) not null default 0 check (interest_rate >= 0),
  monthly_payment numeric(12,2) not null default 0 check (monthly_payment >= 0),
  next_due_date date,
  status text not null default 'active' check (status in ('active','paid_off')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  frequency text not null default 'monthly'
    check (frequency in ('weekly','biweekly','monthly','yearly')),
  next_due_date date not null,
  category_id uuid references categories(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  filename text not null,
  imported_at timestamptz default now(),
  rows_total int not null default 0,
  rows_inserted int not null default 0,
  rows_duplicated int not null default 0
);

alter table profiles enable row level security;
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;
alter table planned_expenses enable row level security;
alter table loans enable row level security;
alter table recurring_payments enable row level security;
alter table imports enable row level security;

drop policy if exists "select own profiles" on profiles;
create policy "select own profiles"
on profiles
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own profiles" on profiles;
create policy "insert own profiles"
on profiles
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own profiles" on profiles;
create policy "update own profiles"
on profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own profiles" on profiles;
create policy "delete own profiles"
on profiles
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own accounts" on accounts;
create policy "select own accounts"
on accounts
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own accounts" on accounts;
create policy "insert own accounts"
on accounts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own accounts" on accounts;
create policy "update own accounts"
on accounts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own accounts" on accounts;
create policy "delete own accounts"
on accounts
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own categories" on categories;
create policy "select own categories"
on categories
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own categories" on categories;
create policy "insert own categories"
on categories
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own categories" on categories;
create policy "update own categories"
on categories
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own categories" on categories;
create policy "delete own categories"
on categories
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own transactions" on transactions;
create policy "select own transactions"
on transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own transactions" on transactions;
create policy "insert own transactions"
on transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own transactions" on transactions;
create policy "update own transactions"
on transactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own transactions" on transactions;
create policy "delete own transactions"
on transactions
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own planned_expenses" on planned_expenses;
create policy "select own planned_expenses"
on planned_expenses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own planned_expenses" on planned_expenses;
create policy "insert own planned_expenses"
on planned_expenses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own planned_expenses" on planned_expenses;
create policy "update own planned_expenses"
on planned_expenses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own planned_expenses" on planned_expenses;
create policy "delete own planned_expenses"
on planned_expenses
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own imports" on imports;
create policy "select own imports"
on imports
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own imports" on imports;
create policy "insert own imports"
on imports
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own imports" on imports;
create policy "update own imports"
on imports
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own imports" on imports;
create policy "delete own imports"
on imports
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own loans" on loans;
create policy "select own loans"
on loans for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own loans" on loans;
create policy "insert own loans"
on loans for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own loans" on loans;
create policy "update own loans"
on loans for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own loans" on loans;
create policy "delete own loans"
on loans for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own recurring_payments" on recurring_payments;
create policy "select own recurring_payments"
on recurring_payments for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own recurring_payments" on recurring_payments;
create policy "insert own recurring_payments"
on recurring_payments for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own recurring_payments" on recurring_payments;
create policy "update own recurring_payments"
on recurring_payments for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own recurring_payments" on recurring_payments;
create policy "delete own recurring_payments"
on recurring_payments for delete to authenticated
using (auth.uid() = user_id);
