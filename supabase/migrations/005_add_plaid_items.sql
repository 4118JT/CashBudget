create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  institution_name text,
  institution_id text,
  access_token_encrypted text not null,
  sync_cursor text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, item_id)
);

-- Tokens are server-only: no authenticated-user policies are created for this table.
alter table plaid_items enable row level security;

create unique index if not exists ux_accounts_user_name on accounts(user_id, name);

-- PostgREST upserts require a named unique constraint (not a partial unique index).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_user_external_ref_key'
      and conrelid = 'transactions'::regclass
  ) then
    alter table transactions add constraint transactions_user_external_ref_key unique (user_id, external_ref);
  end if;
end $$;
