create table public.gallery_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null check (char_length(project_id) between 1 and 128),
  version_id text not null check (char_length(version_id) between 1 and 128),
  title text null check (title is null or char_length(title) between 1 and 80),
  dsl jsonb not null check (
    jsonb_typeof(dsl) = 'object'
    and jsonb_typeof(dsl -> 'meta') = 'object'
    and char_length(coalesce(dsl ->> 'text', '')) between 1 and 8
  ),
  engine_version text not null check (char_length(engine_version) between 1 and 80),
  glyph_asset_version text not null check (char_length(glyph_asset_version) between 1 and 80),
  remix_source_id uuid null references public.gallery_posts(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'removed')),
  review_reason text null check (review_reason is null or char_length(review_reason) between 1 and 500),
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, version_id),
  check (
    (remix_source_id is null and coalesce(dsl #>> '{meta,remixOf}', '') = '')
    or (remix_source_id is not null and dsl #>> '{meta,remixOf}' = concat('gallery:', remix_source_id::text))
  )
);

create index gallery_posts_published_created_at_idx
  on public.gallery_posts (published_at desc, created_at desc)
  where status = 'published';

create index gallery_posts_owner_created_at_idx
  on public.gallery_posts (owner_id, created_at desc);

create index gallery_posts_remix_source_id_idx
  on public.gallery_posts (remix_source_id)
  where remix_source_id is not null;

create table public.gallery_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gallery_posts(id) on delete restrict,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('copyright', 'impersonation', 'illegal', 'other')),
  detail text null check (detail is null or char_length(detail) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

alter table public.gallery_posts enable row level security;
alter table public.gallery_reports enable row level security;

revoke all on table public.gallery_posts from anon, authenticated;
revoke all on table public.gallery_reports from anon, authenticated;
grant select on table public.gallery_posts to anon, authenticated;
grant insert on table public.gallery_posts to authenticated;
grant insert on table public.gallery_reports to authenticated;

create policy "Published gallery posts are visible"
on public.gallery_posts
for select
to anon, authenticated
using (status = 'published' or (select auth.uid()) = owner_id);

create policy "Users submit their own gallery posts for review"
on public.gallery_posts
for insert
to authenticated
with check (
  (select auth.uid()) = owner_id
  and status = 'pending'
  and review_reason is null
  and published_at is null
);

create policy "Users report published gallery posts"
on public.gallery_reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and exists (
    select 1
    from public.gallery_posts
    where gallery_posts.id = post_id
      and gallery_posts.status = 'published'
  )
);
