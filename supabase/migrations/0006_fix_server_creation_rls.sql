-- BT Comms — fix: creating a server failed with
--   "new row violates row-level security policy for table \"servers\""
--
-- `insert(...).select(...)` returns the inserted row, and PostgREST applies the
-- SELECT policy to that RETURNING clause. At that instant the creator has not
-- been added to `server_members` yet, so `is_server_member(id)` was false and
-- the whole insert was rolled back.
--
-- Owners must be able to read the servers they own regardless of membership,
-- which is also the correct semantic: you always see what you created.

drop policy if exists "members view their servers" on public.servers;

create policy "members view their servers" on public.servers
  for select to authenticated
  using (owner_id = auth.uid() or public.is_server_member(id));

-- Same gap at the membership level: `insert(...).select()` on server_members
-- evaluates the SELECT policy before the row it just wrote is considered
-- visible through `is_server_member`. Allow reading your own membership row.
drop policy if exists "members view membership of their servers" on public.server_members;

create policy "members view membership of their servers" on public.server_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_server_member(server_id));

-- Channels: the creator inserts channels immediately after minting the server,
-- before the membership row lands in some flows. Owners can always write.
drop policy if exists "admins create channels" on public.channels;

create policy "admins create channels" on public.channels
  for insert to authenticated with check (
    public.is_server_owner(server_id)
    or exists (select 1 from public.servers s where s.id = channels.server_id and s.owner_id = auth.uid())
    or exists (
      select 1 from public.server_members m
      where m.server_id = channels.server_id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
  );

drop policy if exists "members view channels" on public.channels;

create policy "members view channels" on public.channels
  for select to authenticated
  using (
    public.is_server_member(server_id)
    or exists (select 1 from public.servers s where s.id = channels.server_id and s.owner_id = auth.uid())
  );
