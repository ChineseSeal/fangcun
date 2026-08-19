create table public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  layout text not null check (layout in ('ceye', 'jingzhe', 'grid')),
  page_size text not null check (page_size in ('a4', 'a5')),
  per_page integer not null check (per_page in (1, 2, 4, 6, 9)),
  colophon text not null default '' check (char_length(colophon) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index albums_user_updated_at_idx
  on public.albums (user_id, updated_at desc);

create table public.album_items (
  album_id uuid not null references public.albums(id) on delete cascade,
  project_id text null check (project_id is null or char_length(project_id) between 1 and 128),
  version_id text null check (version_id is null or char_length(version_id) between 1 and 128),
  historic_seal_slug text null check (historic_seal_slug is null or historic_seal_slug in ('ying-qu', 'da-fu', 'xin-cheng-jia')),
  page integer not null check (page >= 1),
  slot integer not null check (slot between 1 and 9),
  caption text null check (caption is null or char_length(caption) between 1 and 80),
  primary key (album_id, page, slot),
  check (
    (project_id is not null and version_id is not null and historic_seal_slug is null)
    or (project_id is null and version_id is null and historic_seal_slug is not null)
  )
);

alter table public.albums enable row level security;
alter table public.album_items enable row level security;

revoke all on table public.albums from anon, authenticated;
revoke all on table public.album_items from anon, authenticated;
grant select, insert, update, delete on table public.albums to authenticated;
grant select, insert, delete on table public.album_items to authenticated;

create policy "Users read their own albums"
on public.albums
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own albums"
on public.albums
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own albums"
on public.albums
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users delete their own albums"
on public.albums
for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Album items follow their owner-only album"
on public.album_items
for select
to authenticated
using (
  exists (
    select 1
    from public.albums
    where albums.id = album_id
      and albums.user_id = (select auth.uid())
  )
);

create policy "Owners add only their current project snapshots or canonical teaching references"
on public.album_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.albums
    where albums.id = album_id
      and albums.user_id = (select auth.uid())
      and album_items.page = 1
      and album_items.slot <= albums.per_page
  )
  and (
    historic_seal_slug is not null
    or exists (
      select 1
      from public.seal_projects as projects
      where projects.user_id = (select auth.uid())
        and projects.project_id = album_items.project_id
        and exists (
          select 1
          from jsonb_array_elements(coalesce(projects.payload -> 'versions', '[]'::jsonb)) as version
          where version ->> 'id' = album_items.version_id
        )
    )
  )
);

create policy "Owners remove their own album items"
on public.album_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.albums
    where albums.id = album_id
      and albums.user_id = (select auth.uid())
  )
);

create function public.save_album(
  album_id_input uuid,
  title_input text,
  layout_input text,
  page_size_input text,
  per_page_input integer,
  colophon_input text,
  items_input jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_album_id uuid;
  normalized_title text := btrim(coalesce(title_input, ''));
  normalized_colophon text := btrim(coalesce(colophon_input, ''));
begin
  if (select auth.uid()) is null then
    raise exception 'ALBUM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if char_length(normalized_title) not between 1 and 40 then
    raise exception 'ALBUM_TITLE_INVALID' using errcode = '22023';
  end if;
  if layout_input not in ('ceye', 'jingzhe', 'grid') then
    raise exception 'ALBUM_LAYOUT_INVALID' using errcode = '22023';
  end if;
  if page_size_input not in ('a4', 'a5') then
    raise exception 'ALBUM_PAGE_SIZE_INVALID' using errcode = '22023';
  end if;
  if per_page_input not in (1, 2, 4, 6, 9) then
    raise exception 'ALBUM_PER_PAGE_INVALID' using errcode = '22023';
  end if;
  if char_length(normalized_colophon) > 120 then
    raise exception 'ALBUM_COLOPHON_INVALID' using errcode = '22023';
  end if;
  if items_input is null or jsonb_typeof(items_input) <> 'array' then
    raise exception 'ALBUM_ITEMS_INVALID' using errcode = '22023';
  end if;
  if jsonb_array_length(items_input) > per_page_input
    or exists (
      select 1
      from jsonb_array_elements(items_input) as item(value)
      where jsonb_typeof(item.value) <> 'object'
        or coalesce(item.value ->> 'page', '') <> '1'
        or coalesce(item.value ->> 'slot', '') !~ '^[1-9]$'
        or (item.value ->> 'slot')::integer > per_page_input
        or (item.value ->> 'caption') is not null and char_length(item.value ->> 'caption') not between 1 and 80
        or not (
          (
            nullif(btrim(item.value ->> 'project_id'), '') is not null
            and nullif(btrim(item.value ->> 'version_id'), '') is not null
            and nullif(btrim(item.value ->> 'historic_seal_slug'), '') is null
          )
          or (
            nullif(btrim(item.value ->> 'project_id'), '') is null
            and nullif(btrim(item.value ->> 'version_id'), '') is null
            and nullif(btrim(item.value ->> 'historic_seal_slug'), '') in ('ying-qu', 'da-fu', 'xin-cheng-jia')
          )
        )
    )
    or exists (
      select 1
      from jsonb_array_elements(items_input) as item(value)
      group by item.value ->> 'slot'
      having count(*) > 1
    ) then
    raise exception 'ALBUM_ITEMS_INVALID' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(items_input) as item(value)
    where nullif(btrim(item.value ->> 'project_id'), '') is not null
      and not exists (
        select 1
        from public.seal_projects as projects
        where projects.user_id = (select auth.uid())
          and projects.project_id = item.value ->> 'project_id'
          and exists (
            select 1
            from jsonb_array_elements(coalesce(projects.payload -> 'versions', '[]'::jsonb)) as version
            where version ->> 'id' = item.value ->> 'version_id'
          )
      )
  ) then
    raise exception 'ALBUM_PROJECT_SNAPSHOT_INVALID' using errcode = '42501';
  end if;

  if album_id_input is null then
    insert into public.albums (user_id, title, layout, page_size, per_page, colophon)
    values ((select auth.uid()), normalized_title, layout_input, page_size_input, per_page_input, normalized_colophon)
    returning id into saved_album_id;
  else
    update public.albums
    set title = normalized_title,
        layout = layout_input,
        page_size = page_size_input,
        per_page = per_page_input,
        colophon = normalized_colophon,
        updated_at = now()
    where id = album_id_input
      and user_id = (select auth.uid())
    returning id into saved_album_id;
    if saved_album_id is null then
      raise exception 'ALBUM_NOT_FOUND' using errcode = '42501';
    end if;
  end if;

  delete from public.album_items where album_id = saved_album_id;

  insert into public.album_items (album_id, project_id, version_id, historic_seal_slug, page, slot, caption)
  select
    saved_album_id,
    nullif(btrim(item.value ->> 'project_id'), ''),
    nullif(btrim(item.value ->> 'version_id'), ''),
    nullif(btrim(item.value ->> 'historic_seal_slug'), ''),
    1,
    (item.value ->> 'slot')::integer,
    nullif(btrim(item.value ->> 'caption'), '')
  from jsonb_array_elements(items_input) as item(value);

  return saved_album_id;
end;
$$;

revoke all on function public.save_album(uuid, text, text, text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_album(uuid, text, text, text, integer, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
