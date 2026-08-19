create table public.gallery_creator_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text null check (bio is null or char_length(bio) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gallery_creator_profiles enable row level security;

revoke all on table public.gallery_creator_profiles from anon, authenticated;
grant select on table public.gallery_creator_profiles to anon, authenticated;
grant insert, update, delete on table public.gallery_creator_profiles to authenticated;

create policy "Public creator profiles are visible"
on public.gallery_creator_profiles
for select
to anon, authenticated
using (true);

create policy "Creators create their own public profile"
on public.gallery_creator_profiles
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Creators update their own public profile"
on public.gallery_creator_profiles
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Creators remove their own public profile"
on public.gallery_creator_profiles
for delete
to authenticated
using ((select auth.uid()) = owner_id);
