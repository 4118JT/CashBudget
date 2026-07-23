-- Loans table
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

-- Loans table
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

alter table loans enable row level security;

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

-- Recurring payments table
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

alter table recurring_payments enable row level security;

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
