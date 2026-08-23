create table public.achievements (
  code text primary key check (char_length(code) between 1 and 64),
  name_zh text not null check (char_length(name_zh) between 1 and 32),
  seal_text text not null check (char_length(seal_text) between 1 and 4),
  condition jsonb not null check (jsonb_typeof(condition) = 'object')
);

insert into public.achievements (code, name_zh, seal_text, condition) values
  ('chu_ke', '初刻', '初', '{"event":"seal_generated"}'),
  ('shi_zhu_bai', '识朱白', '朱白', '{"event":"quiz_completed","setSlug":"intro","minimumScore":4}'),
  ('tong_si_dai', '通四代', '通', '{"event":"style_collection_updated","minimumEraCount":4}'),
  ('ru_yin_pu', '入印谱', '谱', '{"event":"seal_book_created"}'),
  ('shang_shi', '上石', '石', '{"event":"carving_exported"}'),
  ('du_yin_ren', '读印人', '读', '{"event":"quiz_completed","minimumCompletedCount":10}'),
  ('cang_yin', '藏印', '藏', '{"event":"historic_seal_saved","minimumSavedCount":20}'),
  ('bian_kuan', '边款', '款', '{"event":"side_inscription_completed"}');

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null references public.achievements(code),
  earned_at timestamptz not null,
  primary key (user_id, achievement_code)
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;

revoke all on table public.achievements from anon, authenticated;
revoke all on table public.user_achievements from anon, authenticated;
grant select on table public.user_achievements to authenticated;

create policy "Users read their own achievements"
on public.user_achievements
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.merge_user_achievements(achievement_rows jsonb)
returns setof public.user_achievements
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if jsonb_typeof(achievement_rows) <> 'array' or jsonb_array_length(achievement_rows) > 64 then
    raise exception 'Achievement rows must be an array of at most 64 entries' using errcode = '22023';
  end if;

  return query
  insert into public.user_achievements (user_id, achievement_code, earned_at)
  select
    current_user_id,
    row ->> 'achievementCode',
    (row ->> 'earnedAt')::timestamptz
  from jsonb_array_elements(achievement_rows) as row
  where row ->> 'achievementCode' in ('chu_ke', 'shi_zhu_bai', 'shang_shi')
  on conflict (user_id, achievement_code) do update
  set earned_at = least(public.user_achievements.earned_at, excluded.earned_at)
  returning public.user_achievements.*;
end;
$$;

revoke all on function public.merge_user_achievements(jsonb) from public, anon;
grant execute on function public.merge_user_achievements(jsonb) to authenticated;
