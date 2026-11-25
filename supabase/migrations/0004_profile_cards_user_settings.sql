-- BT Comms — profile cards, user settings, blocked users
-- Applied to project oaajpuiahmmeghyzsrkw as migration `profile_cards_user_settings`.

/* ------------------------------------------------------------------ */
/* 1. Profile card columns                                             */
/* ------------------------------------------------------------------ */

alter table public.profiles
  add column if not exists banner_url text,
  add column if not exists theme_primary text,
  add column if not exists theme_secondary text,
  add column if not exists avatar_decoration text not null default 'none',
  add column if not exists profile_effect text not null default 'none',
  add column if not exists name_style text not null default 'default',
  add column if not exists nameplate text not null default 'none',
  add column if not exists pronouns text,
  add column if not exists server_tag text,
  add column if not exists connections jsonb not null default '[]'::jsonb,
  add column if not exists widgets jsonb not null default '[]'::jsonb,
  add column if not exists user_settings jsonb not null default '{}'::jsonb,
  add column if not exists bt_pro boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_pronouns_check,
  add constraint profiles_pronouns_check
    check (pronouns is null or char_length(pronouns) <= 40),
  drop constraint if exists profiles_banner_url_check,
  add constraint profiles_banner_url_check
    check (banner_url is null or char_length(banner_url) <= 2048),
  drop constraint if exists profiles_connections_check,
  add constraint profiles_connections_check
    check (jsonb_typeof(connections) = 'array'),
  drop constraint if exists profiles_widgets_check,
  add constraint profiles_widgets_check
    check (jsonb_typeof(widgets) = 'array'),
  drop constraint if exists profiles_user_settings_check,
  add constraint profiles_user_settings_check
    check (jsonb_typeof(user_settings) = 'object');

/* ------------------------------------------------------------------ */
/* 2. Blocked users                                                    */
/* ------------------------------------------------------------------ */

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocked_users_no_self check (blocker_id <> blocked_id)
);

create index if not exists blocked_users_blocked_idx on public.blocked_users (blocked_id);

alter table public.blocked_users enable row level security;

drop policy if exists "blockers read their blocks" on public.blocked_users;
create policy "blockers read their blocks" on public.blocked_users
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "users create their blocks" on public.blocked_users;
create policy "users create their blocks" on public.blocked_users
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "users remove their blocks" on public.blocked_users;
create policy "users remove their blocks" on public.blocked_users
  for delete to authenticated using (blocker_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'blocked_users'
  ) then
    alter publication supabase_realtime add table public.blocked_users;
  end if;
end $$;

/* ------------------------------------------------------------------ */
/* 3. Permission helpers                                               */
/* ------------------------------------------------------------------ */

create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.blocked_users b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
       or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

create or replace function public.is_friend(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a)
      )
  );
$$;

create or replace function public.shares_server(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.server_members ma
    join public.server_members mb on ma.server_id = mb.server_id
    where ma.user_id = p_a and mb.user_id = p_b
  );
$$;

create or replace function public.has_mutual_friend(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1
    from public.friendships fa
    join public.friendships fb
      on fb.status = 'accepted'
     and (
       (fb.requester_id = p_a and fb.addressee_id = fa.addressee_id)
       or (fb.addressee_id = p_a and fb.requester_id = fa.addressee_id)
     )
    where fa.status = 'accepted'
      and (
        (fa.requester_id = p_a and fa.addressee_id <> p_b)
        or (fa.addressee_id = p_a and fa.requester_id <> p_b)
      )
      and (fa.addressee_id = p_b or fa.requester_id = p_b)
  );
$$;

/**
 * Can `p_sender` open a DM with `p_recipient`?
 * Reads the recipient's `user_settings` JSON; falls back to the legacy
 * `profiles.dm_privacy` column, then to "everyone".
 */
create or replace function public.can_dm_from(p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
  declare
    settings jsonb;
    privacy text;
    allow_server_members boolean;
  begin
    if p_sender is null or p_recipient is null then
      return false;
    end if;
    if p_sender = p_recipient then
      return true;
    end if;
    if public.is_blocked_between(p_sender, p_recipient) then
      return false;
    end if;

    select coalesce(user_settings, '{}'::jsonb), dm_privacy
      into settings, privacy
      from public.profiles where id = p_recipient;

    privacy := coalesce(settings ->> 'dmPrivacy', privacy, 'everyone');
    allow_server_members := coalesce((settings ->> 'dmAllowServerMembers')::boolean, true);

    if privacy = 'none' then
      return false;
    end if;

    if public.is_friend(p_sender, p_recipient) then
      return true;
    end if;

    if privacy = 'friends' then
      return false;
    end if;

    -- privacy = 'everyone'
    return allow_server_members and public.shares_server(p_sender, p_recipient);
  end;
$$;

/** Can `p_sender` send a friend request to `p_recipient`? */
create or replace function public.can_friend_request_from(p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
  declare
    settings jsonb;
    policy text;
    allow boolean;
  begin
    if p_sender is null or p_recipient is null then
      return false;
    end if;
    if p_sender = p_recipient then
      return false;
    end if;
    if public.is_blocked_between(p_sender, p_recipient) then
      return false;
    end if;

    select coalesce(user_settings, '{}'::jsonb) into settings
      from public.profiles where id = p_recipient;

    allow := coalesce((settings ->> 'friendRequestsEnabled')::boolean, true);
    policy := coalesce(settings ->> 'friendRequestsFrom', 'everyone');

    if not allow then
      return false;
    end if;

    return case policy
      when 'nobody' then false
      when 'server_members' then public.shares_server(p_sender, p_recipient)
      when 'friends_of_friends' then public.has_mutual_friend(p_sender, p_recipient)
      else true
    end;
  end;
$$;

/* ------------------------------------------------------------------ */
/* 4. Enforcement triggers                                             */
/* ------------------------------------------------------------------ */

create or replace function public.enforce_friend_request_permissions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.status = 'pending' and not public.can_friend_request_from(new.requester_id, new.addressee_id) then
    raise exception 'This person is not accepting friend requests right now.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_friend_request_permissions on public.friendships;
create trigger enforce_friend_request_permissions
  before insert on public.friendships
  for each row execute function public.enforce_friend_request_permissions();

create or replace function public.enforce_dm_permissions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    recipient uuid;
  begin
    select case when c.user_a = new.author_id then c.user_b else c.user_a end
      into recipient
      from public.dm_channels c
      where c.id = new.dm_channel_id;

    if recipient is null then
      return new;
    end if;

    if not public.can_dm_from(new.author_id, recipient) then
      raise exception 'This person is not accepting direct messages from you.'
        using errcode = '42501';
    end if;
    return new;
  end;
$$;

drop trigger if exists enforce_dm_permissions on public.direct_messages;
create trigger enforce_dm_permissions
  before insert on public.direct_messages
  for each row execute function public.enforce_dm_permissions();

/* Opening a brand-new conversation is gated the same way. */
create or replace function public.enforce_dm_channel_permissions()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    sender uuid := auth.uid();
    recipient uuid;
  begin
    if sender is null then
      return new;
    end if;
    recipient := case when new.user_a = sender then new.user_b else new.user_a end;
    if not public.can_dm_from(sender, recipient) then
      raise exception 'This person is not accepting direct messages from you.'
        using errcode = '42501';
    end if;
    return new;
  end;
$$;

drop trigger if exists enforce_dm_channel_permissions on public.dm_channels;
create trigger enforce_dm_channel_permissions
  before insert on public.dm_channels
  for each row execute function public.enforce_dm_channel_permissions();

/* ------------------------------------------------------------------ */
/* 5. Server-tag + widget defaults for seeded accounts                 */
/* ------------------------------------------------------------------ */

update public.profiles
  set pronouns = coalesce(pronouns, null),
      server_tag = coalesce(server_tag, 'BT')
  where server_tag is null;
