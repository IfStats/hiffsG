-- Adds public organizer-profile fields, and lets anyone read an approved
-- organizer's public profile (name/bio/website/logo/cover) — needed for
-- the public "hosted by" organizer page. Run after phase1_auth_roles.sql.

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists website text;
alter table profiles add column if not exists logo_url text;
alter table profiles add column if not exists cover_url text;

-- Approved organizers' profiles are publicly readable (this is in addition
-- to the existing "read own profile" / "admins read all" policies — RLS
-- policies are OR'd together, so this just adds one more case where a
-- read is allowed). Attendee/admin/unapproved-organizer rows are still
-- only visible to themselves or an admin, keeping emails etc. private.
create policy "public can read approved organizer profiles" on profiles for select
  using (role = 'organizer' and organizer_approved = true);
