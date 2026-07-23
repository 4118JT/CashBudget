create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null,
  institution_id text,
  institution_name text,
  access_token_ciphertext text not null,
  access_token_iv text not null,
  access_token_tag text not null,
  encryption_key_version text not null,
  sync_cursor text,
  item_status text not null default 'active' check (item_status in ('active', 'error', 'revoked')),
  last_error_code text,
  last_error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plaid_item_id)
);

create index if not exists ix_plaid_items_user on plaid_items(user_id);

create table if not exists plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plaid_item_id text not null,
  plaid_account_id text not null,
  app_account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  official_name text,
  mask text,
  account_type text,
  account_subtype text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, plaid_account_id),
  foreign key (user_id, plaid_item_id)
    references plaid_items(user_id, plaid_item_id)
    on delete cascade
);

create index if not exists ix_plaid_accounts_user on plaid_accounts(user_id);
create index if not exists ix_plaid_accounts_app_account on plaid_accounts(app_account_id);

alter table plaid_items enable row level security;
alter table plaid_accounts enable row level security;

drop policy if exists "select own plaid_items" on plaid_items;
create policy "select own plaid_items"
on plaid_items for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own plaid_items" on plaid_items;
create policy "insert own plaid_items"
on plaid_items for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own plaid_items" on plaid_items;
create policy "update own plaid_items"
on plaid_items for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own plaid_items" on plaid_items;
create policy "delete own plaid_items"
on plaid_items for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "select own plaid_accounts" on plaid_accounts;
create policy "select own plaid_accounts"
on plaid_accounts for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "insert own plaid_accounts" on plaid_accounts;
create policy "insert own plaid_accounts"
on plaid_accounts for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "update own plaid_accounts" on plaid_accounts;
create policy "update own plaid_accounts"
on plaid_accounts for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "delete own plaid_accounts" on plaid_accounts;
create policy "delete own plaid_accounts"
on plaid_accounts for delete to authenticated
using (auth.uid() = user_id);

drop index if exists ux_transactions_user_external_ref;
create unique index if not exists ux_transactions_user_external_ref
on transactions(user_id, external_ref);

alter table transactions drop constraint if exists transactions_source_check;
alter table transactions
  add constraint transactions_source_check
  check (source in ('manual', 'notification', 'import', 'plaid'));
