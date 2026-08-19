create index gallery_posts_published_page_idx
  on public.gallery_posts (published_at desc, id desc)
  where status = 'published';
