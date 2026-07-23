-- Adds real image upload for event thumbnails (Supabase Storage), instead
-- of pasting a URL. Run after phase1_auth_roles.sql (needs is_admin() /
-- is_approved_organizer()).

alter table events add column if not exists image_url text;

-- Fixes a gap from earlier: the submission form has collected category/city
-- since phase2_attendee_core.sql, but the submissions table never got those
-- columns — they were silently dropped on insert. Adding them now, plus the
-- new image_url.
alter table submissions add column if not exists category text;
alter table submissions add column if not exists city text;
alter table submissions add column if not exists image_url text;

-- Public bucket: anyone can view images (they're shown on public event
-- pages), but only approved organizers/admins can upload to it.
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

create policy "public can view event images" on storage.objects for select
  using (bucket_id = 'event-images');

create policy "organizers can upload event images" on storage.objects for insert
  with check (bucket_id = 'event-images' and (is_admin() or is_approved_organizer()));

create policy "organizers can replace their event images" on storage.objects for update
  using (bucket_id = 'event-images' and (is_admin() or is_approved_organizer()));

create policy "organizers can delete event images" on storage.objects for delete
  using (bucket_id = 'event-images' and (is_admin() or is_approved_organizer()));
