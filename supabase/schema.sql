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
alter table imports enable row level security;

create policy if not exists "profiles own rows"
on profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "accounts own rows"
on accounts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "categories own rows"
on categories for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "transactions own rows"
on transactions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "planned own rows"
on planned_expenses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "imports own rows"
on imports for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
