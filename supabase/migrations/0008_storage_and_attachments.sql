-- BT Comms — storage buckets, storage RLS, and message attachments
--
-- Before this migration the project had a single public `avatars` bucket and
-- *zero* policies on storage.objects, so every `upload()` from the browser was
-- rejected ("Avatar upload failed", new row violates RLS). Chat had no way to
-- carry files at all.
--
-- This migration:
--   1. ensures the four public buckets exist,
--   2. installs storage RLS that scopes writes to the uploader's own folder,
--   3. adds `attachments` (JSONB) to messages, direct_messages and group_messages.

/* ------------------------------------------------------------------ */
/* Buckets                                                             */
/* ------------------------------------------------------------------ */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 8388608,
    array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('banners', 'banners', true, 8388608,
    array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('server-icons', 'server-icons', true, 4194304,
    array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']),
  ('chat-attachments', 'chat-attachments', true, 26214400,
    array['image/png','image/jpeg','image/webp','image/gif','image/avif',
          'video/mp4','video/webm','video/quicktime',
          'application/pdf','application/zip','application/x-zip-compressed',
          'text/plain','text/markdown','application/json'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/* ------------------------------------------------------------------ */
/* storage.objects policies                                            */
/*                                                                     */
/* Convention: the first path segment is the owner's user id, e.g.     */
/*   avatars/<uid>/avatar-1719.png                                     */
/*   chat-attachments/<uid>/<uuid>-shot.png                            */
/* so `(storage.foldername(name))[1] = auth.uid()::text` scopes writes. */
/* ------------------------------------------------------------------ */

drop policy if exists "bt storage public read" on storage.objects;
create policy "bt storage public read" on storage.objects
  for select using (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
  );

drop policy if exists "bt storage owner insert" on storage.objects;
create policy "bt storage owner insert" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bt storage owner update" on storage.objects;
create policy "bt storage owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "bt storage owner delete" on storage.objects;
create policy "bt storage owner delete" on storage.objects
  for delete to authenticated using (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.direct_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.group_messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- Guard shape: always an array of {url,name,type,size} objects.
create or replace function public.sanitize_attachments(input jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'url', item->>'url',
          'name', coalesce(item->>'name', 'attachment'),
          'type', coalesce(item->>'type', 'application/octet-stream'),
          'size', coalesce((item->>'size')::bigint, 0)
        )
      )
      from jsonb_array_elements(
        case when jsonb_typeof(input) = 'array' then input else '[]'::jsonb end
      ) as item
      where item->>'url' is not null
    ),
    '[]'::jsonb
  );
$$;

-- A message may carry files with no caption, so content can be empty when
-- attachments are present. Relax the not-blank checks accordingly.
do $$
begin
  alter table public.messages
    drop constraint if exists messages_content_check;
  alter table public.messages
    add constraint messages_content_check
    check (char_length(content) <= 4000 and (btrim(content) <> '' or attachments <> '[]'::jsonb));
exception when others then
  raise notice 'messages_content_check skipped: %', sqlerrm;
end $$;

do $$
begin
  alter table public.direct_messages
    drop constraint if exists direct_messages_content_check;
  alter table public.direct_messages
    add constraint direct_messages_content_check
    check (char_length(content) <= 4000 and (btrim(content) <> '' or attachments <> '[]'::jsonb));
exception when others then
  raise notice 'direct_messages_content_check skipped: %', sqlerrm;
end $$;

-- Keep the array shape honest on every write.
create or replace function public.enforce_attachment_shape()
returns trigger
language plpgsql
as $$
begin
  new.attachments := public.sanitize_attachments(new.attachments);
  return new;
end;
$$;

drop trigger if exists messages_attachments_shape on public.messages;
create trigger messages_attachments_shape
  before insert or update on public.messages
  for each row execute function public.enforce_attachment_shape();

drop trigger if exists direct_messages_attachments_shape on public.direct_messages;
create trigger direct_messages_attachments_shape
  before insert or update on public.direct_messages
  for each row execute function public.enforce_attachment_shape();

drop trigger if exists group_messages_attachments_shape on public.group_messages;
create trigger group_messages_attachments_shape
  before insert or update on public.group_messages
  for each row execute function public.enforce_attachment_shape();
