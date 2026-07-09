-- Run this in your Supabase project's SQL editor.
-- This replaces the earlier kv_store (JSON-blob) approach with real,
-- queryable tables — one per entity, linked by foreign keys.

create table if not exists events (
  id text primary key,
  name text not null,
  description text,
  date date not null,
  time text,
  location text not null,
  price numeric not null default 0,
  capacity integer not null default 1,
  created_at timestamptz default now()
);

create table if not exists tickets (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  buyer_name text not null,
  buyer_email text not null,
  qty integer not null default 1,
  code text not null unique,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  purchased_at timestamptz default now()
);

create table if not exists tasks (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  text text not null,
  due date,
  done boolean not null default false
);

create table if not exists budget_items (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  category text,
  item text not null,
  est numeric not null default 0,
  actual numeric not null default 0,
  paid boolean not null default false
);

create table if not exists vendors (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  name text not null,
  category text,
  contact text,
  cost numeric not null default 0,
  status text not null default 'Contacted'
);

create table if not exists timeline_items (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  time text not null,
  activity text not null,
  owner text
);

-- Submissions are NOT linked to events by FK — a submission becomes a real
-- event only once approved (a new row is created in `events` at that point).
create table if not exists submissions (
  id text primary key,
  vendor_name text not null,
  vendor_email text not null,
  name text not null,
  description text,
  date date not null,
  time text,
  location text not null,
  price numeric not null default 0,
  capacity integer not null default 1,
  status text not null default 'pending',
  submitted_at timestamptz default now()
);

create index if not exists tickets_event_id_idx on tickets(event_id);
create index if not exists tasks_event_id_idx on tasks(event_id);
create index if not exists budget_items_event_id_idx on budget_items(event_id);
create index if not exists vendors_event_id_idx on vendors(event_id);
create index if not exists timeline_items_event_id_idx on timeline_items(event_id);

alter table events enable row level security;
alter table tickets enable row level security;
alter table tasks enable row level security;
alter table budget_items enable row level security;
alter table vendors enable row level security;
alter table timeline_items enable row level security;
alter table submissions enable row level security;

-- Demo-grade policies: anyone with the public anon key can read/write
-- everything. Fine for an internal tool or trusted small group — NOT
-- appropriate for a public site handling real transactions without adding
-- real auth (Supabase Auth) and scoping these policies per user/role.
do $$
declare
  t text;
begin
  for t in select unnest(array['events','tickets','tasks','budget_items','vendors','timeline_items','submissions'])
  loop
    execute format('create policy "public select" on %I for select using (true);', t);
    execute format('create policy "public insert" on %I for insert with check (true);', t);
    execute format('create policy "public update" on %I for update using (true);', t);
    execute format('create policy "public delete" on %I for delete using (true);', t);
  end loop;
end $$;

-- Optional: once you've confirmed the app works against the new tables and
-- have migrated/re-entered any data you cared about, you can drop the old
-- blob table from the earlier setup:
-- drop table if exists kv_store;
