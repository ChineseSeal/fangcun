create table public.classroom_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  exercise_id text not null check (exercise_id in ('name-seal', 'red-white', 'reading-order')),
  join_code text not null default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8))
    check (join_code ~ '^[A-F0-9]{8}$'),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  unique (join_code)
);

create index classroom_collections_owner_created_at_idx
  on public.classroom_collections (owner_id, created_at desc);

create table public.classroom_submissions (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.classroom_collections(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null check (char_length(project_id) between 1 and 128),
  version_id text not null check (char_length(version_id) between 1 and 128),
  display_name text null check (display_name is null or char_length(display_name) between 1 and 40),
  dsl jsonb not null check (jsonb_typeof(dsl) = 'object'),
  engine_version text not null check (char_length(engine_version) between 1 and 80),
  glyph_asset_version text not null check (char_length(glyph_asset_version) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, student_id)
);

create index classroom_submissions_collection_updated_at_idx
  on public.classroom_submissions (collection_id, updated_at desc);

create index classroom_submissions_student_updated_at_idx
  on public.classroom_submissions (student_id, updated_at desc);

alter table public.classroom_collections enable row level security;
alter table public.classroom_submissions enable row level security;

revoke all on table public.classroom_collections from anon, authenticated;
revoke all on table public.classroom_submissions from anon, authenticated;
grant select, insert, delete on table public.classroom_collections to authenticated;
grant update (title, status) on table public.classroom_collections to authenticated;
grant select (
  id,
  collection_id,
  project_id,
  version_id,
  display_name,
  dsl,
  engine_version,
  glyph_asset_version,
  created_at,
  updated_at
) on table public.classroom_submissions to authenticated;

create policy "Teachers manage their classroom collections"
on public.classroom_collections
for all
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Teachers and submitters read classroom work"
on public.classroom_submissions
for select
to authenticated
using (
  student_id = (select auth.uid())
  or exists (
    select 1
    from public.classroom_collections
    where classroom_collections.id = collection_id
      and classroom_collections.owner_id = (select auth.uid())
  )
);

create function public.resolve_classroom_collection(join_code_input text)
returns table (
  id uuid,
  title text,
  exercise_id text,
  join_code text,
  status text,
  created_at timestamptz,
  is_owner boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(btrim(coalesce(join_code_input, '')));
begin
  if current_user_id is null then
    raise exception 'CLASSROOM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if normalized_code !~ '^[A-F0-9]{8}$' then
    raise exception 'CLASSROOM_CODE_INVALID' using errcode = '22023';
  end if;

  return query
  select
    classroom_collections.id,
    classroom_collections.title,
    classroom_collections.exercise_id,
    classroom_collections.join_code,
    classroom_collections.status,
    classroom_collections.created_at,
    classroom_collections.owner_id = current_user_id
  from public.classroom_collections
  where classroom_collections.join_code = normalized_code;
end;
$$;

create function public.submit_classroom_work(
  join_code_input text,
  project_id_input text,
  version_id_input text,
  display_name_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_code text := upper(btrim(coalesce(join_code_input, '')));
  normalized_project_id text := btrim(coalesce(project_id_input, ''));
  normalized_version_id text := btrim(coalesce(version_id_input, ''));
  normalized_display_name text := nullif(btrim(coalesce(display_name_input, '')), '');
  target_collection public.classroom_collections;
  project_payload jsonb;
  version_payload jsonb;
  submission_record public.classroom_submissions;
begin
  if current_user_id is null then
    raise exception 'CLASSROOM_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if normalized_code !~ '^[A-F0-9]{8}$' then
    raise exception 'CLASSROOM_CODE_INVALID' using errcode = '22023';
  end if;
  if char_length(normalized_project_id) not between 1 and 128
    or char_length(normalized_version_id) not between 1 and 128 then
    raise exception 'CLASSROOM_PROJECT_REFERENCE_INVALID' using errcode = '22023';
  end if;
  if normalized_display_name is not null and char_length(normalized_display_name) > 40 then
    raise exception 'CLASSROOM_DISPLAY_NAME_INVALID' using errcode = '22023';
  end if;

  select * into target_collection
  from public.classroom_collections
  where join_code = normalized_code;

  if target_collection.id is null then
    raise exception 'CLASSROOM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if target_collection.status <> 'open' then
    raise exception 'CLASSROOM_CLOSED' using errcode = '55000';
  end if;

  select projects.payload into project_payload
  from public.seal_projects
    as projects
  where projects.user_id = current_user_id
    and projects.project_id = normalized_project_id;

  if project_payload is null then
    raise exception 'CLASSROOM_PROJECT_NOT_SYNCED' using errcode = 'P0002';
  end if;

  select version_entry.value into version_payload
  from jsonb_array_elements(coalesce(project_payload -> 'versions', '[]'::jsonb)) as version_entry(value)
  where version_entry.value ->> 'id' = normalized_version_id
  limit 1;

  if version_payload is null
    or jsonb_typeof(version_payload -> 'dsl') <> 'object'
    or nullif(version_payload ->> 'engineVersion', '') is null
    or nullif(version_payload ->> 'assetVersion', '') is null then
    raise exception 'CLASSROOM_VERSION_NOT_SYNCED' using errcode = 'P0002';
  end if;

  insert into public.classroom_submissions (
    collection_id,
    student_id,
    project_id,
    version_id,
    display_name,
    dsl,
    engine_version,
    glyph_asset_version
  ) values (
    target_collection.id,
    current_user_id,
    normalized_project_id,
    normalized_version_id,
    normalized_display_name,
    version_payload -> 'dsl',
    version_payload ->> 'engineVersion',
    version_payload ->> 'assetVersion'
  )
  on conflict (collection_id, student_id) do update set
    project_id = excluded.project_id,
    version_id = excluded.version_id,
    display_name = excluded.display_name,
    dsl = excluded.dsl,
    engine_version = excluded.engine_version,
    glyph_asset_version = excluded.glyph_asset_version,
    updated_at = now()
  returning * into submission_record;

  return jsonb_build_object(
    'id', submission_record.id,
    'collection_id', submission_record.collection_id,
    'project_id', submission_record.project_id,
    'version_id', submission_record.version_id,
    'display_name', submission_record.display_name,
    'dsl', submission_record.dsl,
    'engine_version', submission_record.engine_version,
    'glyph_asset_version', submission_record.glyph_asset_version,
    'created_at', submission_record.created_at,
    'updated_at', submission_record.updated_at
  );
end;
$$;

revoke all on function public.resolve_classroom_collection(text) from public, anon, authenticated;
revoke all on function public.submit_classroom_work(text, text, text, text) from public, anon, authenticated;
grant execute on function public.resolve_classroom_collection(text) to authenticated;
grant execute on function public.submit_classroom_work(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
