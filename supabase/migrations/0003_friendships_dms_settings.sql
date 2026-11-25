-- BT Comms — friendships, direct messages, extended profile preferences
-- Applied to project oaajpuiahmmeghyzsrkw as migration `friendships_dms_settings`.

/* ------------------------------------------------------------------ */
/* 1. Extended profile preferences                                     */
/* ------------------------------------------------------------------ */

alter table public.profiles
  add column if not exists custom_status text,
  add column if not exists custom_status_emoji text,
  add column if not exists banner_color text,
  add column if not exists theme_id text not null default 'midnight',
  add column if not exists message_density text not null default 'cozy',
  add column if not exists reduce_motion boolean not null default false,
  add column if not exists reduced_saturation boolean not null default false,
  add column if not exists font_scale numeric not null default 1,
  add column if not exists dm_privacy text not null default 'friends',
  add column if not exists message_filter text not null default 'standard',
  add column if not exists notify_direct_messages boolean not null default true,
  add column if not exists notify_server_messages boolean not null default true,
  add column if not exists notify_friend_requests boolean not null default true,
  add column if not exists display_email text;

alter table public.profiles
  drop constraint if exists profiles_message_density_check,
  add constraint profiles_message_density_check
    check (message_density in ('compact', 'cozy', 'roomy')),
  drop constraint if exists profiles_font_scale_check,
  add constraint profiles_font_scale_check
    check (font_scale >= 0.8 and font_scale <= 1.4),
  drop constraint if exists profiles_dm_privacy_check,
  add constraint profiles_dm_privacy_check
    check (dm_privacy in ('everyone', 'friends', 'none')),
  drop constraint if exists profiles_message_filter_check,
  add constraint profiles_message_filter_check
    check (message_filter in ('standard', 'strict', 'off')),
  drop constraint if exists profiles_custom_status_check,
  add constraint profiles_custom_status_check
    check (custom_status is null or char_length(custom_status) <= 128);

/* ------------------------------------------------------------------ */
/* 2. Friendships                                                      */
/* ------------------------------------------------------------------ */

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- one row per pair, in either direction
create unique index if not exists friendships_pair_uidx
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

/* ------------------------------------------------------------------ */
/* 3. Direct messages                                                  */
/* ------------------------------------------------------------------ */

create table if not exists public.dm_channels (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  pair_key text not null unique,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint dm_channels_ordering check (user_a < user_b)
);

create index if not exists dm_channels_user_a_idx on public.dm_channels (user_a);
create index if not exists dm_channels_user_b_idx on public.dm_channels (user_b);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  dm_channel_id uuid not null references public.dm_channels (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  read_at timestamptz
);

create index if not exists direct_messages_channel_idx
  on public.direct_messages (dm_channel_id, created_at);

/* keep the channel's activity timestamp fresh for sidebar sorting */
create or replace function public.direct_messages_touch_channel()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.dm_channels
  set last_message_at = new.created_at
  where id = new.dm_channel_id;
  return new;
end;
$$;

drop trigger if exists direct_messages_touch_channel on public.direct_messages;
create trigger direct_messages_touch_channel
  after insert on public.direct_messages
  for each row execute function public.direct_messages_touch_channel();

/* ------------------------------------------------------------------ */
/* 4. Helper + RPCs                                                    */
/* ------------------------------------------------------------------ */

create or replace function public.is_dm_participant(p_channel uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.dm_channels c
    where c.id = p_channel and (c.user_a = auth.uid() or c.user_b = auth.uid())
  );
$$;

create or replace function public.ensure_dm_channel(p_other uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    me uuid := auth.uid();
    lo uuid;
    hi uuid;
    key text;
    existing uuid;
  begin
    if me is null then
      raise exception 'not authenticated';
    end if;
    if p_other = me then
      raise exception 'cannot DM yourself';
    end if;

    if me::text < p_other::text then lo := me; hi := p_other; else lo := p_other; hi := me; end if;
    key := lo::text || ':' || hi::text;

    select id into existing from public.dm_channels where pair_key = key;
    if existing is not null then
      return existing;
    end if;

    insert into public.dm_channels (user_a, user_b, pair_key)
    values (lo, hi, key)
    on conflict (pair_key) do nothing;

    select id into existing from public.dm_channels where pair_key = key;
    return existing;
  end;
$$;

create or replace function public.send_friend_request(p_username text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    me uuid := auth.uid();
    target uuid;
    existing public.friendships;
    reverse_row public.friendships;
  begin
    if me is null then
      raise exception 'not authenticated';
    end if;

    select id into target from public.profiles
    where lower(username) = lower(trim(leading '@' from p_username))
    limit 1;

    if target is null then
      return json_build_object('ok', false, 'error', 'No user found with that username.');
    end if;
    if target = me then
      return json_build_object('ok', false, 'error', 'You cannot add yourself.');
    end if;

    select * into existing from public.friendships
    where requester_id = me and addressee_id = target limit 1;

    if existing.id is not null then
      if existing.status = 'accepted' then
        return json_build_object('ok', true, 'status', 'accepted', 'message', 'Already friends.');
      elsif existing.status = 'blocked' then
        return json_build_object('ok', false, 'error', 'That request was blocked.');
      else
        return json_build_object('ok', true, 'status', 'pending', 'message', 'Request already pending.');
      end if;
    end if;

    select * into reverse_row from public.friendships
    where requester_id = target and addressee_id = me limit 1;

    if reverse_row.id is not null then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = reverse_row.id;
      return json_build_object('ok', true, 'status', 'accepted', 'message', 'Friend request accepted.');
    end if;

    insert into public.friendships (requester_id, addressee_id, status)
    values (me, target, 'pending');

    return json_build_object('ok', true, 'status', 'pending', 'message', 'Friend request sent.');
  end;
$$;

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
  declare me uuid := auth.uid();
  begin
    if me is null then raise exception 'not authenticated'; end if;

    if p_accept then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = p_id and addressee_id = me and status = 'pending';
      return json_build_object('ok', true, 'status', 'accepted');
    end if;

    delete from public.friendships
    where id = p_id and addressee_id = me and status = 'pending';
    return json_build_object('ok', true, 'status', 'declined');
  end;
$$;

create or replace function public.remove_friend(p_other uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
  declare me uuid := auth.uid();
  begin
    if me is null then raise exception 'not authenticated'; end if;
    delete from public.friendships
    where (requester_id = me and addressee_id = p_other)
       or (requester_id = p_other and addressee_id = me);
    return json_build_object('ok', true);
  end;
$$;

/* ------------------------------------------------------------------ */
/* 5. RLS                                                              */
/* ------------------------------------------------------------------ */

alter table public.friendships enable row level security;
alter table public.dm_channels enable row level security;
alter table public.direct_messages enable row level security;

create policy "participants read friendships" on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "caller creates own requests" on public.friendships
  for insert to authenticated
  with check (requester_id = auth.uid());
create policy "participants update friendships" on public.friendships
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "participants delete friendships" on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "participants read dm channels" on public.dm_channels
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());
create policy "caller creates dm channels" on public.dm_channels
  for insert to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

create policy "participants read dms" on public.direct_messages
  for select to authenticated
  using (public.is_dm_participant(dm_channel_id));
create policy "participants send dms" on public.direct_messages
  for insert to authenticated
  with check (public.is_dm_participant(dm_channel_id) and author_id = auth.uid());
create policy "authors edit dms" on public.direct_messages
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());
create policy "authors delete dms" on public.direct_messages
  for delete to authenticated
  using (author_id = auth.uid());

/* ------------------------------------------------------------------ */
/* 6. Realtime                                                         */
/* ------------------------------------------------------------------ */

alter publication supabase_realtime add table public.friendships;
alter publication supabase_realtime add table public.dm_channels;
alter publication supabase_realtime add table public.direct_messages;

/* ------------------------------------------------------------------ */
/* 7. Avatars bucket                                                   */
/* ------------------------------------------------------------------ */

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars are publicly readable" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "users upload their own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users replace their own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
