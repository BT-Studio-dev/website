-- BT Comms — row-level security, realtime publication, seed data
alter table public.profiles enable row level security;
alter table public.servers enable row level security;
alter table public.channels enable row level security;
alter table public.server_members enable row level security;
alter table public.messages enable row level security;
alter table public.voice_states enable row level security;

-- PROFILES
create policy "profiles are viewable by authenticated users" on public.profiles
  for select to authenticated using (true);
create policy "users insert their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- SERVERS
create policy "members view their servers" on public.servers
  for select to authenticated using (public.is_server_member(id));
create policy "authenticated users create servers" on public.servers
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update their servers" on public.servers
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete their servers" on public.servers
  for delete to authenticated using (owner_id = auth.uid());

-- SERVER MEMBERS
create policy "authenticated users can join by invite" on public.server_members
  for insert to authenticated with check (user_id = auth.uid());
create policy "members view membership of their servers" on public.server_members
  for select to authenticated using (public.is_server_member(server_id));
create policy "users update own membership" on public.server_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users leave servers" on public.server_members
  for delete to authenticated using (user_id = auth.uid());

-- CHANNELS
create policy "members view channels" on public.channels
  for select to authenticated using (public.is_server_member(server_id));
create policy "admins create channels" on public.channels
  for insert to authenticated with check (
    public.is_server_owner(server_id) or exists (
      select 1 from public.server_members m
      where m.server_id = channels.server_id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
  );
create policy "admins update channels" on public.channels
  for update to authenticated using (
    public.is_server_owner(server_id) or exists (
      select 1 from public.server_members m
      where m.server_id = channels.server_id and m.user_id = auth.uid() and m.role in ('owner','admin')
    )
  );
create policy "admins delete channels" on public.channels
  for delete to authenticated using (public.is_server_owner(server_id));

-- MESSAGES
create policy "members read messages" on public.messages
  for select to authenticated using (public.is_channel_member(channel_id));
create policy "members send messages" on public.messages
  for insert to authenticated with check (public.is_channel_member(channel_id) and author_id = auth.uid());
create policy "authors edit messages" on public.messages
  for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors or owners delete messages" on public.messages
  for delete to authenticated using (author_id = auth.uid() or public.is_channel_owner(channel_id));

-- VOICE STATES
create policy "members read voice states" on public.voice_states
  for select to authenticated using (public.is_channel_member(channel_id));
create policy "users join voice" on public.voice_states
  for insert to authenticated with check (user_id = auth.uid() and public.is_channel_member(channel_id));
create policy "users update own voice state" on public.voice_states
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users leave voice" on public.voice_states
  for delete to authenticated using (user_id = auth.uid());

-- GRANTS
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant select on public.servers, public.channels, public.messages, public.profiles,
  public.server_members, public.voice_states to anon;

-- REALTIME
alter table public.messages replica identity full;
alter table public.voice_states replica identity full;
alter table public.server_members replica identity full;
alter table public.profiles replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'voice_states') then
    alter publication supabase_realtime add table public.voice_states;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'server_members') then
    alter publication supabase_realtime add table public.server_members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- SEED: official BT Comms server
insert into public.servers (id, name, icon, description, invite_code, is_default)
values ('00000000-0000-4000-8000-000000000001', 'BT Comms', '⚡',
  'The official BT Comms community — announcements, dev talk, and voice hangs.',
  'bt-comms', true)
on conflict (id) do nothing;

insert into public.channels (id, server_id, name, kind, topic, position) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'welcome', 'text', 'Start here — say hi and grab a role.', 0),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'announcements', 'text', 'Product updates and release notes.', 1),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001', 'general', 'text', 'Anything and everything BT Comms.', 2),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001', 'development', 'text', 'Build logs, bugs, and PR reviews.', 3),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001', 'design', 'text', 'Pixel pushes and UI feedback.', 4),
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'General Voice', 'voice', 'Drop-in voice hangout.', 5),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'Focus Room', 'voice', 'Silent co-working session.', 6)
on conflict (id) do nothing;

insert into public.messages (id, channel_id, system_author, content, created_at) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'BT Comms', 'Welcome to **BT Comms** — a tiny, fast place to talk with your team. Create an account, pick a server, and start typing.', now() - interval '71 hours'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'BT Comms', 'Realtime messages run over Supabase. Open a second tab and watch it fly. 🚀', now() - interval '70 hours'),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000102', 'BT Comms', 'v1.0 is live: server sidebar, channel lists, live message feed, and a member list with presence.', now() - interval '52 hours'),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000103', 'BT Comms', 'Morning everyone ☀️ What are you shipping today?', now() - interval '26 hours'),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000104', 'BT Comms', 'Reminder: realtime channels are subscribed with `postgres_changes`, so no polling is needed.', now() - interval '9 hours'),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000105', 'BT Comms', 'New dark palette landed — blurple #5865f2 on near-black #0b0d12. Thoughts?', now() - interval '3 hours')
on conflict (id) do nothing;

-- Read-only discovery view for the "explore servers" screen
create or replace view public.public_servers
with (security_invoker = true) as
  select id, name, icon, description, invite_code, is_default, created_at
  from public.servers
  where is_default = true;

grant select on public.public_servers to anon, authenticated;
