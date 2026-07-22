-- Phase 2: attendee core (search/filter, favorites, reviews, purchase history).
-- Run this after phase1_auth_roles.sql.

alter table events add column if not exists category text;
alter table events add column if not exists city text;

alter table tickets add column if not exists buyer_user_id uuid references auth.users(id);

create table if not exists favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, event_id)
);

create table if not exists reviews (
  id text primary key,
  event_id text not null references events(id) on delete cascade,
  user_id uuid references auth.users(id),
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create index if not exists favorites_user_id_idx on favorites(user_id);
create index if not exists reviews_event_id_idx on reviews(event_id);

alter table favorites enable row level security;
alter table reviews enable row level security;

-- favorites are private to the person who saved them
create policy "own favorites only" on favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- reviews are public to read, but only a signed-in user can write one,
-- and only as themselves
create policy "reviews are publicly readable" on reviews for select using (true);
create policy "signed-in users can post reviews" on reviews for insert
  with check (auth.uid() = user_id);
create policy "authors can update own reviews" on reviews for update
  using (auth.uid() = user_id);
create policy "authors can delete own reviews" on reviews for delete
  using (auth.uid() = user_id);
