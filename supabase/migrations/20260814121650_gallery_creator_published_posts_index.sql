create index gallery_posts_published_owner_page_idx
  on public.gallery_posts (owner_id, published_at desc, id desc)
  where status = 'published';
