alter table public.gallery_reports
  add column status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  add column reviewer_id uuid null references auth.users(id) on delete restrict,
  add column reviewer_note text null check (reviewer_note is null or char_length(reviewer_note) between 1 and 500),
  add column reviewed_at timestamptz null;

create index gallery_reports_open_created_at_idx
  on public.gallery_reports (created_at asc)
  where status = 'open';

create table public.gallery_appeals (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gallery_posts(id) on delete restrict,
  appellant_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewer_id uuid null references auth.users(id) on delete restrict,
  reviewer_note text null check (reviewer_note is null or char_length(reviewer_note) between 1 and 500),
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (post_id, appellant_id)
);

create index gallery_appeals_pending_created_at_idx
  on public.gallery_appeals (created_at asc)
  where status = 'pending';

create table public.gallery_review_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.gallery_posts(id) on delete restrict,
  subject_type text not null check (subject_type in ('post', 'report', 'appeal')),
  subject_id uuid not null,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  from_status text null,
  to_status text not null,
  note text null check (note is null or char_length(note) between 1 and 500),
  created_at timestamptz not null default now()
);

create index gallery_review_events_post_created_at_idx
  on public.gallery_review_events (post_id, created_at desc);

alter table public.gallery_appeals enable row level security;
alter table public.gallery_review_events enable row level security;

revoke all on table public.gallery_appeals from anon, authenticated;
revoke all on table public.gallery_review_events from anon, authenticated;
grant select, insert on table public.gallery_appeals to authenticated;

drop policy "Users report published gallery posts" on public.gallery_reports;

create policy "Users report published gallery posts"
on public.gallery_reports
for insert
to authenticated
with check (
  (select auth.uid()) = reporter_id
  and status = 'open'
  and reviewer_id is null
  and reviewer_note is null
  and reviewed_at is null
  and exists (
    select 1
    from public.gallery_posts
    where gallery_posts.id = post_id
      and gallery_posts.status = 'published'
  )
);

create policy "Authors view their own gallery appeals"
on public.gallery_appeals
for select
to authenticated
using ((select auth.uid()) = appellant_id);

create policy "Authors appeal their rejected or removed work"
on public.gallery_appeals
for insert
to authenticated
with check (
  (select auth.uid()) = appellant_id
  and status = 'pending'
  and reviewer_id is null
  and reviewer_note is null
  and reviewed_at is null
  and exists (
    select 1
    from public.gallery_posts
    where gallery_posts.id = post_id
      and gallery_posts.owner_id = (select auth.uid())
      and gallery_posts.status in ('rejected', 'removed')
  )
);

create function public.apply_gallery_review(
  subject_type_input text,
  subject_id_input uuid,
  next_status_input text,
  reviewer_id_input uuid,
  reviewer_note_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  previous_status text;
  post_id_value uuid;
  normalized_note text := nullif(btrim(coalesce(reviewer_note_input, '')), '');
begin
  if subject_type_input not in ('post', 'report', 'appeal') then
    raise exception 'REVIEW_SUBJECT_INVALID' using errcode = '22023';
  end if;
  if next_status_input not in ('published', 'rejected', 'removed', 'resolved', 'dismissed', 'accepted') then
    raise exception 'REVIEW_STATUS_INVALID' using errcode = '22023';
  end if;
  if normalized_note is not null and char_length(normalized_note) > 500 then
    raise exception 'REVIEW_NOTE_TOO_LONG' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = reviewer_id_input) then
    raise exception 'REVIEWER_NOT_FOUND' using errcode = '23503';
  end if;

  if subject_type_input = 'post' then
    select status into previous_status from public.gallery_posts where id = subject_id_input for update;
    if previous_status is null then
      raise exception 'REVIEW_POST_NOT_FOUND' using errcode = 'P0002';
    end if;
    if not (
      (previous_status = 'pending' and next_status_input in ('published', 'rejected'))
      or (previous_status = 'published' and next_status_input = 'removed')
      or (previous_status in ('rejected', 'removed') and next_status_input = 'published')
    ) then
      raise exception 'REVIEW_TRANSITION_INVALID' using errcode = 'P0001';
    end if;
    if next_status_input in ('rejected', 'removed') and (normalized_note is null or char_length(normalized_note) < 5) then
      raise exception 'REVIEW_REASON_REQUIRED' using errcode = '22023';
    end if;
    update public.gallery_posts
    set status = next_status_input,
        review_reason = case when next_status_input = 'published' then null else normalized_note end,
        published_at = case when next_status_input = 'published' then now() else published_at end,
        updated_at = now()
    where id = subject_id_input
    returning id into post_id_value;
  elsif subject_type_input = 'report' then
    select post_id, status into post_id_value, previous_status from public.gallery_reports where id = subject_id_input for update;
    if previous_status is null then
      raise exception 'REVIEW_REPORT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if previous_status <> 'open' or next_status_input not in ('resolved', 'dismissed') then
      raise exception 'REVIEW_TRANSITION_INVALID' using errcode = 'P0001';
    end if;
    update public.gallery_reports
    set status = next_status_input,
        reviewer_id = reviewer_id_input,
        reviewer_note = normalized_note,
        reviewed_at = now()
    where id = subject_id_input;
  else
    select post_id, status into post_id_value, previous_status from public.gallery_appeals where id = subject_id_input for update;
    if previous_status is null then
      raise exception 'REVIEW_APPEAL_NOT_FOUND' using errcode = 'P0002';
    end if;
    if previous_status <> 'pending' or next_status_input not in ('accepted', 'rejected') then
      raise exception 'REVIEW_TRANSITION_INVALID' using errcode = 'P0001';
    end if;
    update public.gallery_appeals
    set status = next_status_input,
        reviewer_id = reviewer_id_input,
        reviewer_note = normalized_note,
        reviewed_at = now()
    where id = subject_id_input;
  end if;

  insert into public.gallery_review_events (
    post_id,
    subject_type,
    subject_id,
    reviewer_id,
    from_status,
    to_status,
    note
  ) values (
    post_id_value,
    subject_type_input,
    subject_id_input,
    reviewer_id_input,
    previous_status,
    next_status_input,
    normalized_note
  );

  return jsonb_build_object(
    'subjectType', subject_type_input,
    'subjectId', subject_id_input,
    'fromStatus', previous_status,
    'toStatus', next_status_input,
    'postId', post_id_value
  );
end;
$$;

revoke all on function public.apply_gallery_review(text, uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_gallery_review(text, uuid, text, uuid, text) to service_role;
