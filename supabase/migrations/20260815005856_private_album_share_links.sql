-- A share is an explicit, revocable publication of a frozen owner project
-- snapshot. The source album itself stays private and continues to contain
-- only references; historic teaching references are deliberately excluded.
create table public.album_share_links (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null unique references public.albums(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 40),
  layout text not null check (layout in ('ceye', 'jingzhe', 'grid')),
  page_size text not null check (page_size in ('a4', 'a5')),
  per_page integer not null check (per_page in (1, 2, 4, 6, 9)),
  page_count integer not null check (page_count between 1 and 24),
  colophon text not null default '' check (char_length(colophon) <= 120),
  created_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  revoked_at timestamptz null
);

create index album_share_links_active_token_idx
  on public.album_share_links (token)
  where revoked_at is null;

create table public.album_share_items (
  share_link_id uuid not null references public.album_share_links(id) on delete cascade,
  page integer not null check (page between 1 and 24),
  slot integer not null check (slot between 1 and 9),
  caption text null check (caption is null or char_length(caption) between 1 and 80),
  dsl jsonb not null check (jsonb_typeof(dsl) = 'object'),
  primary key (share_link_id, page, slot)
);

alter table public.album_share_links enable row level security;
alter table public.album_share_items enable row level security;

revoke all on table public.album_share_links from anon, authenticated;
revoke all on table public.album_share_items from anon, authenticated;
grant select, insert, update, delete on table public.album_share_links to authenticated;
grant select, insert, update, delete on table public.album_share_items to authenticated;
-- The service-role client is server-only and is used exclusively by the public
-- BFF resolver, which selects a token-scoped, sanitized response.
grant select on table public.album_share_links to service_role;
grant select on table public.album_share_items to service_role;

create policy "Owners read their private album share links"
on public.album_share_links
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners create their private album share links"
on public.album_share_links
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Owners update their private album share links"
on public.album_share_links
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Owners delete their private album share links"
on public.album_share_links
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners read their private album share snapshots"
on public.album_share_items
for select
to authenticated
using (
  exists (
    select 1
    from public.album_share_links as links
    where links.id = share_link_id
      and links.user_id = (select auth.uid())
  )
);

create policy "Owners add bounded private album share snapshots"
on public.album_share_items
for insert
to authenticated
with check (
  jsonb_typeof(dsl) = 'object'
  and exists (
    select 1
    from public.album_share_links as links
    where links.id = share_link_id
      and links.user_id = (select auth.uid())
      and album_share_items.page <= links.page_count
      and album_share_items.slot <= links.per_page
  )
);

create policy "Owners update bounded private album share snapshots"
on public.album_share_items
for update
to authenticated
using (
  exists (
    select 1
    from public.album_share_links as links
    where links.id = share_link_id
      and links.user_id = (select auth.uid())
  )
)
with check (
  jsonb_typeof(dsl) = 'object'
  and exists (
    select 1
    from public.album_share_links as links
    where links.id = share_link_id
      and links.user_id = (select auth.uid())
      and album_share_items.page <= links.page_count
      and album_share_items.slot <= links.per_page
  )
);

create policy "Owners delete their private album share snapshots"
on public.album_share_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.album_share_links as links
    where links.id = share_link_id
      and links.user_id = (select auth.uid())
  )
);

create function public.create_album_share(album_id_input uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  source_album public.albums%rowtype;
  saved_share_id uuid;
  saved_token uuid;
  source_item_count integer;
begin
  if (select auth.uid()) is null then
    raise exception 'ALBUM_SHARE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select *
  into source_album
  from public.albums
  where id = album_id_input
    and user_id = (select auth.uid())
  for update;

  if source_album.id is null then
    raise exception 'ALBUM_SHARE_ALBUM_NOT_FOUND' using errcode = '42501';
  end if;

  select count(*)
  into source_item_count
  from public.album_items
  where album_id = source_album.id;

  if source_item_count = 0 then
    raise exception 'ALBUM_SHARE_EMPTY' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.album_items
    where album_id = source_album.id
      and historic_seal_slug is not null
  ) then
    raise exception 'ALBUM_SHARE_HISTORIC_REFERENCE_UNSUPPORTED' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.album_items as items
    left join lateral (
      select version.value as payload
      from public.seal_projects as projects
      cross join lateral jsonb_array_elements(coalesce(projects.payload -> 'versions', '[]'::jsonb)) as version(value)
      where projects.user_id = (select auth.uid())
        and projects.project_id = items.project_id
        and version.value ->> 'id' = items.version_id
      limit 1
    ) as snapshot on true
    where items.album_id = source_album.id
      and (
        snapshot.payload is null
        or jsonb_typeof(snapshot.payload -> 'dsl') <> 'object'
      )
  ) then
    raise exception 'ALBUM_SHARE_PROJECT_SNAPSHOT_INVALID' using errcode = '42501';
  end if;

  insert into public.album_share_links (
    album_id,
    user_id,
    title,
    layout,
    page_size,
    per_page,
    page_count,
    colophon,
    token,
    refreshed_at,
    revoked_at
  )
  values (
    source_album.id,
    (select auth.uid()),
    source_album.title,
    source_album.layout,
    source_album.page_size,
    source_album.per_page,
    source_album.page_count,
    source_album.colophon,
    gen_random_uuid(),
    now(),
    null
  )
  on conflict (album_id) do update
  set title = excluded.title,
      layout = excluded.layout,
      page_size = excluded.page_size,
      per_page = excluded.per_page,
      page_count = excluded.page_count,
      colophon = excluded.colophon,
      token = gen_random_uuid(),
      refreshed_at = now(),
      revoked_at = null
  returning id, token into saved_share_id, saved_token;

  delete from public.album_share_items
  where share_link_id = saved_share_id;

  insert into public.album_share_items (share_link_id, page, slot, caption, dsl)
  select
    saved_share_id,
    items.page,
    items.slot,
    items.caption,
    snapshot.payload -> 'dsl'
  from public.album_items as items
  cross join lateral (
    select version.value as payload
    from public.seal_projects as projects
    cross join lateral jsonb_array_elements(coalesce(projects.payload -> 'versions', '[]'::jsonb)) as version(value)
    where projects.user_id = (select auth.uid())
      and projects.project_id = items.project_id
      and version.value ->> 'id' = items.version_id
    limit 1
  ) as snapshot
  where items.album_id = source_album.id
  order by items.page, items.slot;

  return saved_token;
end;
$$;

create function public.revoke_album_share(album_id_input uuid)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  revoked_share_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'ALBUM_SHARE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.album_share_links
  set revoked_at = now()
  where album_id = album_id_input
    and user_id = (select auth.uid())
    and revoked_at is null
  returning id into revoked_share_id;

  if revoked_share_id is null then
    return false;
  end if;

  delete from public.album_share_items
  where share_link_id = revoked_share_id;

  return true;
end;
$$;

revoke all on function public.create_album_share(uuid) from public, anon, authenticated;
revoke all on function public.revoke_album_share(uuid) from public, anon, authenticated;
grant execute on function public.create_album_share(uuid) to authenticated;
grant execute on function public.revoke_album_share(uuid) to authenticated;

notify pgrst, 'reload schema';
