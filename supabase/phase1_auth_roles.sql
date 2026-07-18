-- Phase 1: real authentication & roles (Attendee / Organizer / Admin).
-- Run this AFTER supabase/schema.sql, in the SQL editor.

-- ---------------------------------------------------------------------
-- 1. Profiles: one row per auth.users row, holding app-specific fields
--    Supabase Auth doesn't let us query auth.users from the client, so
--    we mirror what we need into a public table with RLS instead.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'attendee' check (role in ('attendee', 'organizer', 'admin')),
  organizer_approved boolean not null default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Helper functions (security definer = bypass RLS internally, used inside
-- other policies so we don't get infinite recursion checking profiles from
-- a profiles policy).
create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_approved_organizer() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'organizer' and organizer_approved = true);
$$;

create policy "read own profile" on profiles for select using (auth.uid() = id);
create policy "update own profile" on profiles for update using (auth.uid() = id);
create policy "admins read all profiles" on profiles for select using (is_admin());
create policy "admins update all profiles" on profiles for update using (is_admin());

-- Auto-create a profile row whenever someone signs up. display_name/role
-- come from the options.data passed to supabase.auth.signUp() on the client.
create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name, role, organizer_approved)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'attendee'),
    false
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 2. Ownership columns
-- ---------------------------------------------------------------------
alter table events add column if not exists organizer_id uuid references auth.users(id);
alter table submissions add column if not exists submitted_by uuid references auth.users(id);

-- ---------------------------------------------------------------------
-- 3. Replace the old wide-open policies with ownership-aware ones.
--    (Drop the permissive "public can ..." policies created in schema.sql.)
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  p text;
begin
  for t in select unnest(array['events','tickets','tasks','budget_items','vendors','timeline_items','submissions'])
  loop
    for p in select unnest(array['public select','public insert','public update','public delete'])
    loop
      execute format('drop policy if exists %I on %I;', p, t);
    end loop;
  end loop;
end $$;

-- events: browsing is public; only approved organizers/admins can create;
-- only the owning organizer or an admin can edit/delete.
create policy "events are publicly readable" on events for select using (true);
create policy "approved organizers can create events" on events for insert
  with check (is_admin() or is_approved_organizer());
create policy "owner or admin can update events" on events for update
  using (organizer_id = auth.uid() or is_admin());
create policy "owner or admin can delete events" on events for delete
  using (organizer_id = auth.uid() or is_admin());

-- tickets: guest checkout stays open (buying/reading tickets needs no
-- login yet — that's Phase 3). Only the event's owner/admin can check
-- someone in.
create policy "tickets are publicly readable" on tickets for select using (true);
create policy "anyone can purchase tickets" on tickets for insert with check (true);
create policy "owner or admin can update tickets" on tickets for update
  using (exists (select 1 from events e where e.id = tickets.event_id and (e.organizer_id = auth.uid() or is_admin())));

-- planner data (tasks/budget/vendors/timeline) is private to the event's
-- owner and admins — not public.
do $$
declare
  t text;
begin
  for t in select unnest(array['tasks','budget_items','vendors','timeline_items'])
  loop
    execute format($f$
      create policy "owner or admin full access" on %I for all
      using (exists (select 1 from events e where e.id = %I.event_id and (e.organizer_id = auth.uid() or is_admin())))
      with check (exists (select 1 from events e where e.id = %I.event_id and (e.organizer_id = auth.uid() or is_admin())));
    $f$, t, t, t);
  end loop;
end $$;

-- submissions: any signed-in user can submit; visible to the submitter,
-- approved organizers (who review them), and admins; only reviewers can
-- change status.
create policy "signed-in users can submit events" on submissions for insert
  with check (auth.uid() is not null);
create policy "submitter or reviewers can read submissions" on submissions for select
  using (submitted_by = auth.uid() or is_admin() or is_approved_organizer());
create policy "reviewers can update submissions" on submissions for update
  using (is_admin() or is_approved_organizer());
