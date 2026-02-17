-- Add optional image URL to posts
alter table public.posts
add column if not exists image_url text;

-- Create bucket for post images (public read)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Public can view post images" on storage.objects;
create policy "Public can view post images"
on storage.objects
for select
to public
using (bucket_id = 'post-images');

drop policy if exists "Authenticated can upload post images" on storage.objects;
create policy "Authenticated can upload post images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'post-images');

drop policy if exists "Users can update own post images" on storage.objects;
create policy "Users can update own post images"
on storage.objects
for update
to authenticated
using (bucket_id = 'post-images' and owner = auth.uid())
with check (bucket_id = 'post-images' and owner = auth.uid());

drop policy if exists "Users can delete own post images" on storage.objects;
create policy "Users can delete own post images"
on storage.objects
for delete
to authenticated
using (bucket_id = 'post-images' and owner = auth.uid());
