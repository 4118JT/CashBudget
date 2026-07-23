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

alter table planned_expenses enable row level security;

create policy if not exists "planned own rows"
on planned_expenses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
