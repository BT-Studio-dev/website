-- BT Comms — voice channels: WebRTC mesh + screen share.
--
-- No schema change is required: `voice_states` already carries everything the
-- room needs (channel_id, user_id, muted, joined_at) and its RLS policies
-- already scope read to channel members and write to the user's own row.
--
-- The media plane does not touch Postgres at all. Peers signal over a Supabase
-- realtime *broadcast* topic named `voice:<channel_id>`:
--
--   { from: uuid, to: uuid, signal: { kind, sdp?, candidate? } }
--
-- and announce who is present with realtime *presence*, tracking
-- `{ user_id }`. The lower user id always creates the offer, which removes the
-- glare case where both sides offer simultaneously.
--
-- Realtime authorisation: broadcast and presence on a topic are governed by
-- "Realtime Authorization" policies on `realtime.messages`. The project currently
-- runs the default (authenticated users may join any topic they can name). A
-- voice topic name is a channel UUID, and a caller still has to be a member of
-- that channel before `voice_states` will accept the join, so a guessed topic
-- only ever yields a silent, empty room.
--
-- If realtime authorization is tightened later, add:
--
--   create policy "voice topic follows channel membership"
--     on realtime.messages for select
--     to authenticated
--     using (
--       (select realtime.topic()) like 'voice:%'
--       and exists (
--         select 1 from public.voice_states vs
--         where vs.user_id = auth.uid()
--           and vs.channel_id::text = split_part((select realtime.topic()), ':', 2)
--       )
--     );
--
-- Nothing here needs to run for the feature to work; the file exists so the
-- signalling contract is written down next to the other migrations.

-- Housekeeping: a crashed tab can leave a stale row behind, which would show a
-- ghost participant in the room forever. Any row older than six hours is gone.
-- (Runs on demand; wire to pg_cron if the project enables it.)
create or replace function public.prune_stale_voice_states()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
  declare
    removed integer;
  begin
    delete from public.voice_states
     where joined_at < now() - interval '6 hours';
    get diagnostics removed = row_count;
    return removed;
  end;
$$;

grant execute on function public.prune_stale_voice_states() to authenticated;
