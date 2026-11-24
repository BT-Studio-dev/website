-- BT Comms — core schema
create extension if not exists pgcrypto;

-- ============ PROFILES ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{2,24}$'),
  display_name text not null default 'New Member',
  avatar_url text,
  accent_color text not null default '#5865f2',
  status text not null default 'online' check (status in ('online','idle','dnd','offline')),
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============ SERVERS ============
create table if not exists public.servers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  icon text not null default '⚡',
  description text,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  owner_id uuid references auth.users(id) on delete set null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ CHANNELS ============
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  server_id uuid not null references public.servers(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  kind text not null default 'text' check (kind in ('text','voice')),
  topic text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (server_id, name, kind)
);
create index if not exists channels_server_idx on public.channels (server_id, position);

-- ============ SERVER MEMBERS ============
create table if not exists public.server_members (
  server_id uuid not null references public.servers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (server_id, user_id)
);
create index if not exists server_members_user_idx on public.server_members (user_id);

-- ============ MESSAGES ============
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  system_author text,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint messages_have_author check (author_id is not null or system_author is not null)
);
create index if not exists messages_channel_created_idx on public.messages (channel_id, created_at desc);

-- ============ VOICE STATE ============
create table if not exists public.voice_states (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- ============ HELPERS (security definer to avoid RLS recursion) ============
create or replace function public.is_server_member(p_server uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.server_members m
    where m.server_id = p_server and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_server_owner(p_server uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.servers s
    where s.id = p_server and s.owner_id = auth.uid()
  );
$$;

create or replace function public.is_channel_member(p_channel uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.channels c
    join public.server_members m on m.server_id = c.server_id
    where c.id = p_channel and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_channel_owner(p_channel uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.channels c
    join public.servers s on s.id = c.server_id
    where c.id = p_channel and s.owner_id = auth.uid()
  );
$$;

-- ============ NEW USER TRIGGER ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
  default_server uuid;
begin
  base_username := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'user'), '@', 1), 'user'),
    '[^a-z0-9_.]', '', 'g'));
  if base_username is null or char_length(base_username) < 2 then
    base_username := 'member';
  end if;
  base_username := left(base_username, 20);
  final_username := base_username;
  while exists (select 1 from public.profiles p where p.username = final_username) loop
    suffix := suffix + 1;
    final_username := left(base_username, 18) || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, accent_color, bio)
  values (
    new.id,
    final_username,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), initcap(base_username)),
    coalesce(nullif(new.raw_user_meta_data->>'accent_color', ''), '#5865f2'),
    'New to BT Comms 👋'
  );

  select id into default_server from public.servers where is_default order by created_at limit 1;
  if default_server is not null then
    insert into public.server_members (server_id, user_id, role)
    values (default_server, new.id, 'member')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();
