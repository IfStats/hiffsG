-- Run this once in your Supabase project's SQL editor
-- (Dashboard → SQL Editor → New query → paste → Run).

create table if not exists kv_store (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

alter table kv_store enable row level security;

-- Demo-grade policies: anyone with the public anon key can read and write.
-- Fine for an internal MVP / demo link. Do NOT use this for a public,
-- production ticketing site without adding real auth and tighter policies —
-- see the "Security note" in README.md.
create policy "public can read kv_store"
  on kv_store for select
  using (true);

create policy "public can insert kv_store"
  on kv_store for insert
  with check (true);

create policy "public can update kv_store"
  on kv_store for update
  using (true);

create policy "public can delete kv_store"
  on kv_store for delete
  using (true);
