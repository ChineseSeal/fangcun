create table public.seal_projects (
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id text not null check (char_length(project_id) between 1 and 128),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'id' = project_id
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create table public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload ->> 'version' = '1'
  ),
  updated_at timestamptz not null default now()
);

alter table public.seal_projects enable row level security;
alter table public.learning_progress enable row level security;

revoke all on table public.seal_projects from anon;
revoke all on table public.learning_progress from anon;
revoke all on table public.seal_projects from authenticated;
revoke all on table public.learning_progress from authenticated;
grant select, insert, update on table public.seal_projects to authenticated;
grant select, insert, update on table public.learning_progress to authenticated;

create policy "Users read their own seal projects"
on public.seal_projects
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own seal projects"
on public.seal_projects
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own seal projects"
on public.seal_projects
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users read their own learning progress"
on public.learning_progress
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users create their own learning progress"
on public.learning_progress
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users update their own learning progress"
on public.learning_progress
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
