-- BT Comms — friend-request notes.
--
-- The "Personalize your request" field in the Add Friend panel has always been
-- collected and sent, but the `friendships` table had nowhere to keep it, so the
-- note was silently dropped (and the client's `.select()` with `note` failed
-- once it started asking for the column).
--
-- `send_friend_request` now takes the note and stores it; `respond_friend_request`
-- is untouched. Everything is backward compatible: the parameter is optional and
-- the client retries its RPC without it if this function has not been deployed.

alter table public.friendships
  add column if not exists note text;

alter table public.friendships
  drop constraint if exists friendships_note_length;

alter table public.friendships
  add constraint friendships_note_length
  check (note is null or char_length(note) <= 120);

-- Same body as 0003, plus `p_note`. Keep the old single-argument signature as a
-- wrapper so a client that has not reloaded yet keeps working.
create or replace function public.send_friend_request(p_username text, p_note text default null)
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
    clean_note text := nullif(btrim(left(coalesce(p_note, ''), 120)), '');
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
        -- Re-sending refreshes the note shown to the recipient.
        if clean_note is not null then
          update public.friendships set note = clean_note where id = existing.id;
        end if;
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

    insert into public.friendships (requester_id, addressee_id, status, note)
    values (me, target, 'pending', clean_note);

    return json_build_object('ok', true, 'status', 'pending', 'message', 'Friend request sent.');
  end;
$$;

grant execute on function public.send_friend_request(text, text) to authenticated;

/* Keep the legacy single-argument entry point working. */
create or replace function public.send_friend_request(p_username text)
returns json
language sql
security definer
set search_path to 'public'
as $$
  select public.send_friend_request(p_username, null::text);
$$;

grant execute on function public.send_friend_request(text) to authenticated;

/* ------------------------------------------------------------------ */
/* 2. Cancelling your own request actually cancels it                  */
/*                                                                    */
/* `respond_friend_request(id, false)` only deleted rows where         */
/* `addressee_id = me`, so the ✕ on a *sent* request reported success  */
/* and changed nothing — the row came straight back on the next load.  */
/* Declining an incoming request and withdrawing an outgoing one are   */
/* the same delete; both now report whether a row was actually touched.*/
/* ------------------------------------------------------------------ */

create or replace function public.respond_friend_request(p_id uuid, p_accept boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    me uuid := auth.uid();
    changed int := 0;
  begin
    if me is null then raise exception 'not authenticated'; end if;

    if p_accept then
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = p_id and addressee_id = me and status = 'pending';
      get diagnostics changed = row_count;
      if changed = 0 then
        return json_build_object('ok', false, 'error', 'That request is no longer pending.');
      end if;
      return json_build_object('ok', true, 'status', 'accepted');
    end if;

    delete from public.friendships
    where id = p_id and status = 'pending'
      and (addressee_id = me or requester_id = me);
    get diagnostics changed = row_count;
    if changed = 0 then
      return json_build_object('ok', false, 'error', 'That request no longer exists.');
    end if;
    return json_build_object('ok', true, 'status', 'declined');
  end;
$$;

grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
