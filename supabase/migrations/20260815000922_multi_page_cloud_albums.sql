alter table public.albums
  add column page_count integer not null default 1 check (page_count between 1 and 24);

alter table public.album_items
  add constraint album_items_page_ceiling_check check (page between 1 and 24);

create unique index album_items_unique_source_per_page_idx
  on public.album_items (
    album_id,
    page,
    coalesce(historic_seal_slug, 'project:' || project_id || ':' || version_id)
  );

drop policy "Owners add only their current project snapshots or canonical teaching references" on public.album_items;

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
      and album_items.page <= albums.page_count
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

create function public.save_album(
  album_id_input uuid,
  title_input text,
  layout_input text,
  page_size_input text,
  per_page_input integer,
  page_count_input integer,
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
  if page_count_input not between 1 and 24 then
    raise exception 'ALBUM_PAGE_COUNT_INVALID' using errcode = '22023';
  end if;
  if char_length(normalized_colophon) > 120 then
    raise exception 'ALBUM_COLOPHON_INVALID' using errcode = '22023';
  end if;
  if items_input is null or jsonb_typeof(items_input) <> 'array' then
    raise exception 'ALBUM_ITEMS_INVALID' using errcode = '22023';
  end if;
  if jsonb_array_length(items_input) > per_page_input * page_count_input
    or exists (
      select 1
      from jsonb_array_elements(items_input) as item(value)
      where jsonb_typeof(item.value) <> 'object'
        or coalesce(item.value ->> 'page', '') !~ '^(?:[1-9]|1[0-9]|2[0-4])$'
        or case
          when coalesce(item.value ->> 'page', '') ~ '^(?:[1-9]|1[0-9]|2[0-4])$'
          then (item.value ->> 'page')::integer > page_count_input
          else true
        end
        or coalesce(item.value ->> 'slot', '') !~ '^[1-9]$'
        or case
          when coalesce(item.value ->> 'slot', '') ~ '^[1-9]$'
          then (item.value ->> 'slot')::integer > per_page_input
          else true
        end
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
      group by item.value ->> 'page', item.value ->> 'slot'
      having count(*) > 1
    )
    or exists (
      select 1
      from jsonb_array_elements(items_input) as item(value)
      group by
        item.value ->> 'page',
        coalesce(
          'historic:' || nullif(btrim(item.value ->> 'historic_seal_slug'), ''),
          'project:' || nullif(btrim(item.value ->> 'project_id'), '') || ':' || nullif(btrim(item.value ->> 'version_id'), '')
        )
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
    insert into public.albums (user_id, title, layout, page_size, per_page, page_count, colophon)
    values ((select auth.uid()), normalized_title, layout_input, page_size_input, per_page_input, page_count_input, normalized_colophon)
    returning id into saved_album_id;
  else
    update public.albums
    set title = normalized_title,
        layout = layout_input,
        page_size = page_size_input,
        per_page = per_page_input,
        page_count = page_count_input,
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
    (item.value ->> 'page')::integer,
    (item.value ->> 'slot')::integer,
    nullif(btrim(item.value ->> 'caption'), '')
  from jsonb_array_elements(items_input) as item(value);

  return saved_album_id;
end;
$$;

revoke all on function public.save_album(uuid, text, text, text, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_album(uuid, text, text, text, integer, integer, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
