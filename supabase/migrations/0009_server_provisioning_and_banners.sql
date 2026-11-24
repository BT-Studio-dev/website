-- BT Comms — Block 3: make server creation atomic and finish the storage layout.
--
-- Before this migration, creating a server was a four-step client dance:
--   insert servers → insert server_members → insert channels → mint invite.
-- Any step could fail silently (a dropped request, a stale RLS policy) and leave
-- an orphaned server with no owner row, no #general, and no way to invite
-- anybody. Doing it in one trigger makes the guarantee the product promises:
-- whoever inserts a server is its owner, its first member, and gets the default
-- #general text channel plus General Voice.
--
-- The client still performs the same inserts, so this stays backward compatible
-- (both are `on conflict do nothing`).

/* ------------------------------------------------------------------ */
/* 1. Provision a new server from the `servers` insert                 */
/* ------------------------------------------------------------------ */

create or replace function public.provision_new_server()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The creator is always the owner and the first member.
  insert into public.server_members (server_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (server_id, user_id) do update set role = 'owner';

  -- Default channels, unless the caller already created some in this txn.
  if not exists (select 1 from public.channels where server_id = new.id) then
    insert into public.channels (server_id, name, kind, topic, position)
    values
      (new.id, 'general', 'text', 'Welcome to ' || new.name || '.', 0),
      (new.id, 'General', 'voice', null, 1);
  end if;

  return new;
end;
$$;

drop trigger if exists on_server_created on public.servers;

create trigger on_server_created
  after insert on public.servers
  for each row execute function public.provision_new_server();

/* ------------------------------------------------------------------ */
/* 2. Storage: `banners`, `chat-attachments` + owner-scoped policies    */
/* ------------------------------------------------------------------ */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 8388608,
   array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('banners', 'banners', true, 8388608,
   array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('server-icons', 'server-icons', true, 4194304,
   array['image/png','image/jpeg','image/webp','image/gif','image/avif']),
  ('chat-attachments', 'chat-attachments', true, 26214400, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read for every bucket above (they are all `public = true`, but the
-- policy keeps `select` explicit for anon + authenticated roles).
drop policy if exists "bt storage public read" on storage.objects;
create policy "bt storage public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments'));

-- Writes are owner-scoped: the first path segment must be the caller's uid.
drop policy if exists "bt storage owner insert" on storage.objects;
create policy "bt storage owner insert" on storage.objects
  for insert to authenticated
  with check (
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
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'banners', 'server-icons', 'chat-attachments')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* ------------------------------------------------------------------ */
/* 3. Repair servers that were created before the trigger existed      */
/* ------------------------------------------------------------------ */

insert into public.server_members (server_id, user_id, role)
select s.id, s.owner_id, 'owner'
from public.servers s
where s.owner_id is not null
on conflict (server_id, user_id) do update set role = 'owner';

insert into public.channels (server_id, name, kind, topic, position)
select s.id, 'general', 'text', 'Welcome to ' || s.name || '.', 0
from public.servers s
where not exists (select 1 from public.channels c where c.server_id = s.id);

insert into public.channels (server_id, name, kind, topic, position)
select s.id, 'General', 'voice', null, 1
from public.servers s
where not exists (
  select 1 from public.channels c where c.server_id = s.id and c.kind = 'voice'
);

-- Note: dm_channels SELECT/INSERT policies already exist from 0003
-- ("participants read dm channels" / "caller creates dm channels") and are
-- correct — a participant is `auth.uid() in (user_a, user_b)`. The blank DM
-- view was a routing bug (a peer id used as a channel id), fixed in
-- components/comms-loader.tsx, not an RLS gap.
