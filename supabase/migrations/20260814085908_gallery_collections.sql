create table public.gallery_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text null check (description is null or char_length(description) between 1 and 280),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

create index gallery_collections_owner_created_at_idx
  on public.gallery_collections (owner_id, created_at desc);

create index gallery_collections_public_created_at_idx
  on public.gallery_collections (created_at desc)
  where visibility = 'public';

create table public.gallery_collection_items (
  collection_id uuid not null references public.gallery_collections(id) on delete cascade,
  post_id uuid not null references public.gallery_posts(id) on delete restrict,
  added_at timestamptz not null default now(),
  primary key (collection_id, post_id)
);

create index gallery_collection_items_post_id_idx
  on public.gallery_collection_items (post_id);

alter table public.gallery_collections enable row level security;
alter table public.gallery_collection_items enable row level security;

revoke all on table public.gallery_collections from anon, authenticated;
revoke all on table public.gallery_collection_items from anon, authenticated;
grant select on table public.gallery_collections to anon, authenticated;
grant insert, delete on table public.gallery_collections to authenticated;
grant select on table public.gallery_collection_items to anon, authenticated;
grant insert, delete on table public.gallery_collection_items to authenticated;

create policy "Public or owned gallery collections are visible"
on public.gallery_collections
for select
to anon, authenticated
using (visibility = 'public' or (select auth.uid()) = owner_id);

create policy "Users create their own gallery collections"
on public.gallery_collections
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users delete their own gallery collections"
on public.gallery_collections
for delete
to authenticated
using ((select auth.uid()) = owner_id);

create policy "Collection items follow collection visibility"
on public.gallery_collection_items
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.gallery_collections
    where gallery_collections.id = collection_id
      and (gallery_collections.visibility = 'public' or gallery_collections.owner_id = (select auth.uid()))
  )
);

create policy "Owners add published works to their collections"
on public.gallery_collection_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.gallery_collections
    where gallery_collections.id = collection_id
      and gallery_collections.owner_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.gallery_posts
    where gallery_posts.id = post_id
      and gallery_posts.status = 'published'
  )
);

create policy "Owners remove items from their collections"
on public.gallery_collection_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.gallery_collections
    where gallery_collections.id = collection_id
      and gallery_collections.owner_id = (select auth.uid())
  )
);

create function public.create_gallery_collection_with_item(
  title_input text,
  description_input text,
  visibility_input text,
  post_id_input uuid
)
returns public.gallery_collections
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  normalized_title text := btrim(coalesce(title_input, ''));
  normalized_description text := nullif(btrim(coalesce(description_input, '')), '');
  created_collection public.gallery_collections;
begin
  if char_length(normalized_title) not between 1 and 80 then
    raise exception 'GALLERY_COLLECTION_TITLE_INVALID' using errcode = '22023';
  end if;
  if normalized_description is not null and char_length(normalized_description) > 280 then
    raise exception 'GALLERY_COLLECTION_DESCRIPTION_INVALID' using errcode = '22023';
  end if;
  if visibility_input not in ('private', 'public') then
    raise exception 'GALLERY_COLLECTION_VISIBILITY_INVALID' using errcode = '22023';
  end if;

  insert into public.gallery_collections (owner_id, title, description, visibility)
  values ((select auth.uid()), normalized_title, normalized_description, visibility_input)
  returning * into created_collection;

  insert into public.gallery_collection_items (collection_id, post_id)
  values (created_collection.id, post_id_input);

  return created_collection;
end;
$$;

revoke all on function public.create_gallery_collection_with_item(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.create_gallery_collection_with_item(text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';
