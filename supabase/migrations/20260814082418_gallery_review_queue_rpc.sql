create function public.get_gallery_review_dashboard(queue_limit integer default 50)
returns jsonb
language sql
security definer
set search_path = public, auth, pg_temp
as $$
  with limits as (
    select least(greatest(coalesce(queue_limit, 50), 1), 100) as value
  )
  select jsonb_build_object(
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', posts.id,
        'owner_id', posts.owner_id,
        'title', posts.title,
        'text', posts.dsl ->> 'text',
        'status', posts.status,
        'review_reason', posts.review_reason,
        'published_at', posts.published_at,
        'created_at', posts.created_at
      ) order by posts.created_at asc)
      from (
        select gallery_posts.*
        from public.gallery_posts
        where status in ('pending', 'published')
        order by created_at asc
        limit (select value from limits)
      ) as posts
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', reports.id,
        'post_id', reports.post_id,
        'reporter_id', reports.reporter_id,
        'reason', reports.reason,
        'detail', reports.detail,
        'created_at', reports.created_at
      ) order by reports.created_at asc)
      from (
        select gallery_reports.*
        from public.gallery_reports
        where status = 'open'
        order by created_at asc
        limit (select value from limits)
      ) as reports
    ), '[]'::jsonb),
    'appeals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', appeals.id,
        'post_id', appeals.post_id,
        'appellant_id', appeals.appellant_id,
        'reason', appeals.reason,
        'created_at', appeals.created_at
      ) order by appeals.created_at asc)
      from (
        select gallery_appeals.*
        from public.gallery_appeals
        where status = 'pending'
        order by created_at asc
        limit (select value from limits)
      ) as appeals
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_gallery_review_dashboard(integer) from public, anon, authenticated;
grant execute on function public.get_gallery_review_dashboard(integer) to service_role;
