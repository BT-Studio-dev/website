-- ====================================================================
-- 0005 — Phase 4: group DMs, shareable server invites, timed presence,
--                per-account chat/voice preferences.
-- ====================================================================

/* ------------------------------------------------------------------ */
/* 1. Timed presence                                                  */
/* ------------------------------------------------------------------ */

alter table public.profiles
  add column if not exists status_expires_at timestamptz,
  add column if not exists icon_pack text default 'classic',
  add column if not exists chat_display jsonb not null default '{}'::jsonb,
  add column if not exists voice_settings jsonb not null default '{}'::jsonb;

-- `invisible` is a first-class presence now (rendered as offline to others).
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('online', 'idle', 'dnd', 'invisible', 'offline'));

/**
 * Timed status: a status chosen "for 15 minutes" stores the deadline next to
 * the value. Anything reading presence compares against now(), so a lapsed
 * timer reads as Online even before the sweeper runs.
 */
create or replace function public.effective_status(
  p_status text,
  p_expires_at timestamptz
) returns text
language sql
immutable
as $$
  select case
    when p_expires_at is not null and p_expires_at <= now()
      then 'online'
    else coalesce(p_status, 'offline')
  end;
$$;

/**
 * Sweeper: flip lapsed timers back to Online and clear the deadline.
 * Called opportunistically by the client (and safe to schedule via pg_cron).
 */
create or replace function public.expire_stale_statuses()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  touched integer;
begin
  update public.profiles
     set status = 'online',
         status_expires_at = null
   where status_expires_at is not null
     and status_expires_at <= now()
     and status in ('idle', 'dnd', 'invisible');
  get diagnostics touched = row_count;
  return touched;
end;
$$;

grant execute on function public.expire_stale_statuses() to authenticated;

/* ------------------------------------------------------------------ */
/* 2. Group DMs                                                       */
/* ------------------------------------------------------------------ */

create table if not exists public.group_dms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text,
  icon_url text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.group_dm_members (
  group_id uuid not null references public.group_dms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.group_dms (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists group_dm_members_user_idx
  on public.group_dm_members (user_id);
create index if not exists group_messages_group_idx
  on public.group_messages (group_id, created_at desc);

/* Cap at 10 humans per group, matching the New Message modal. */
create or replace function public.enforce_group_size()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  member_count integer;
begin
  select count(*) into member_count
    from public.group_dm_members
   where group_id = new.group_id;
  if member_count >= 10 then
    raise exception 'Group messages are limited to 10 members.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_group_size on public.group_dm_members;
create trigger enforce_group_size
  before insert on public.group_dm_members
  for each row execute function public.enforce_group_size();

create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path to 'public'
stable
as $$
  select exists (
    select 1 from public.group_dm_members
     where group_id = p_group and user_id = p_user
  );
$$;

grant execute on function public.is_group_member(uuid, uuid) to authenticated;

/* Keep the ordering column fresh so the sidebar sorts by activity. */
create or replace function public.touch_group_dm()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.group_dms
     set last_message_at = new.created_at
   where id = new.group_id;
  return new;
end;
$$;

drop trigger if exists touch_group_dm on public.group_messages;
create trigger touch_group_dm
  after insert on public.group_messages
  for each row execute function public.touch_group_dm();

/* ------------------------------------------------------------------ */
/* 3. Shareable server invites                                        */
/* ------------------------------------------------------------------ */

create table if not exists public.server_invites (
  code text primary key,
  server_id uuid not null references public.servers (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0
);

create index if not exists server_invites_server_idx
  on public.server_invites (server_id);

/**
 * Redeem an invite. Accepts a bare code or a whole URL; returns the server so
 * the client can navigate straight there. Idempotent for existing members.
 */
create or replace function public.redeem_server_invite(p_code text)
returns table (server_id uuid, server_name text, already_member boolean)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  me uuid := auth.uid();
  cleaned text;
  invite public.server_invites;
  srv public.servers;
  is_member boolean;
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  cleaned := lower(trim(both '/' from p_code));
  cleaned := regexp_replace(cleaned, '^.*[?&]invite=', '');
  cleaned := regexp_replace(cleaned, '^.*/invite/', '');

  select * into invite from public.server_invites where code = cleaned;
  if invite.code is null then
    raise exception 'Invite code is invalid or expired.' using errcode = '22P02';
  end if;
  if invite.expires_at is not null and invite.expires_at <= now() then
    raise exception 'That invite has expired.' using errcode = '22P02';
  end if;
  if invite.max_uses is not null and invite.uses >= invite.max_uses then
    raise exception 'That invite has reached its use limit.' using errcode = '22P02';
  end if;

  select exists (
    select 1 from public.server_members
     where server_id = invite.server_id and user_id = me
  ) into is_member;

  if not is_member then
    insert into public.server_members (server_id, user_id)
    values (invite.server_id, me);
    update public.server_invites
       set uses = uses + 1
     where code = invite.code;
  end if;

  select * into srv from public.servers where id = invite.server_id;
  return query select srv.id, srv.name::text, is_member;
end;
$$;

grant execute on function public.redeem_server_invite(text) to authenticated;

/**
 * Creating a server also mints its first invite, so "Invite to Server"
 * always has a code to copy.
 */
create or replace function public.create_server_invite(p_server uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  me uuid := auth.uid();
  generated text;
begin
  if not exists (
    select 1 from public.server_members
     where server_id = p_server and user_id = me
       and role in ('owner', 'admin')
  ) then
    raise exception 'Only admins can create invites.' using errcode = '42501';
  end if;

  select code into generated
    from public.server_invites
   where server_id = p_server and (expires_at is null or expires_at > now())
   order by created_at asc
   limit 1;

  if generated is not null then
    return generated;
  end if;

  generated := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  insert into public.server_invites (code, server_id, created_by)
  values (generated, p_server, me);
  return generated;
end;
$$;

grant execute on function public.create_server_invite(uuid) to authenticated;

/* ------------------------------------------------------------------ */
/* 4. RLS                                                             */
/* ------------------------------------------------------------------ */

alter table public.group_dms enable row level security;
alter table public.group_dm_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.server_invites enable row level security;

drop policy if exists "group_dms readable by members" on public.group_dms;
create policy "group_dms readable by members"
  on public.group_dms for select
  using (public.is_group_member(id, auth.uid()));

drop policy if exists "group_dms insert by owner" on public.group_dms;
create policy "group_dms insert by owner"
  on public.group_dms for insert
  with check (owner_id = auth.uid());

drop policy if exists "group_dms update by owner" on public.group_dms;
create policy "group_dms update by owner"
  on public.group_dms for update
  using (owner_id = auth.uid());

drop policy if exists "group_dms delete by owner" on public.group_dms;
create policy "group_dms delete by owner"
  on public.group_dms for delete
  using (owner_id = auth.uid());

drop policy if exists "group members readable by members" on public.group_dm_members;
create policy "group members readable by members"
  on public.group_dm_members for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group members insert by member" on public.group_dm_members;
create policy "group members insert by member"
  on public.group_dm_members for insert
  with check (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group members delete self or owner" on public.group_dm_members;
create policy "group members delete self or owner"
  on public.group_dm_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_dms g
       where g.id = group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists "group messages readable by members" on public.group_messages;
create policy "group messages readable by members"
  on public.group_messages for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "group messages insert by members" on public.group_messages;
create policy "group messages insert by members"
  on public.group_messages for insert
  with check (author_id = auth.uid() and public.is_group_member(group_id, auth.uid()));

drop policy if exists "group messages delete own" on public.group_messages;
create policy "group messages delete own"
  on public.group_messages for delete
  using (author_id = auth.uid());

/* Invites are readable by anyone signed in (that's the point of a link). */
drop policy if exists "invites readable by authed" on public.server_invites;
create policy "invites readable by authed"
  on public.server_invites for select
  to authenticated
  using (true);

drop policy if exists "invites insert by admins" on public.server_invites;
create policy "invites insert by admins"
  on public.server_invites for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.server_members m
       where m.server_id = server_invites.server_id
         and m.user_id = auth.uid()
         and m.role in ('owner', 'admin')
    )
  );

/* ------------------------------------------------------------------ */
/* 5. Realtime                                                        */
/* ------------------------------------------------------------------ */

do $$
begin
  begin
    alter publication supabase_realtime add table public.group_dms;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.group_dm_members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.group_messages;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.server_members;
  exception when duplicate_object then null;
  end;
end $$;

/* ------------------------------------------------------------------ */
/* 6. Backfill: every existing server gets a long-lived invite         */
/* ------------------------------------------------------------------ */

insert into public.server_invites (code, server_id, created_by)
select s.invite_code, s.id, s.owner_id
  from public.servers s
 where s.invite_code is not null
on conflict (code) do nothing;
