-- BT Comms — a real start time for activity cards.
--
-- The profile panel's activity card showed "42:15 elapsed" next to a
-- "Playing a Game" section. Both numbers were invented: the client built the
-- card from a hardcoded placeholder, and there was nowhere in the schema to say
-- when an activity began.
--
-- `custom_status` alone cannot answer "how long has this been going?", so record
-- the moment the status last changed. Every write path for `custom_status`
-- already goes through one of the statements below, so a trigger keeps the
-- timestamp honest without trusting the client to send it.
--
-- Backward compatible: the column is nullable, so a client that has not reloaded
-- yet still reads and writes profiles normally.

alter table public.profiles
  add column if not exists custom_status_started_at timestamptz;

comment on column public.profiles.custom_status_started_at is
  'When custom_status was last set. Drives the elapsed clock on activity cards; null means unknown, and the client hides the clock rather than guessing.';

/* ------------------------------------------------------------------ */
/* 1. Stamp the start time whenever the status text changes            */
/*                                                                    */
/* Only a genuine change counts — leaving the status alone must not   */
/* restart the clock, otherwise any profile save would reset it.      */
/* Clearing the status clears the stamp with it.                      */
/* ------------------------------------------------------------------ */

create or replace function public.touch_custom_status_started_at()
returns trigger
language plpgsql
as $$
begin
  if new.custom_status is distinct from old.custom_status then
    if new.custom_status is null or btrim(new.custom_status) = '' then
      new.custom_status_started_at := null;
    else
      new.custom_status_started_at := now();
    end if;
  else
    -- Unchanged status: never let a write move the anchor.
    new.custom_status_started_at := old.custom_status_started_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_touch_custom_status_started_at on public.profiles;

create trigger profiles_touch_custom_status_started_at
  before update on public.profiles
  for each row
  execute function public.touch_custom_status_started_at();

/* An insert that already carries a status starts its clock now. */
create or replace function public.set_custom_status_started_at_on_insert()
returns trigger
language plpgsql
as $$
begin
  if new.custom_status is not null and btrim(new.custom_status) <> '' then
    new.custom_status_started_at := coalesce(new.custom_status_started_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_custom_status_started_at_on_insert on public.profiles;

create trigger profiles_set_custom_status_started_at_on_insert
  before insert on public.profiles
  for each row
  execute function public.set_custom_status_started_at_on_insert();

/* ------------------------------------------------------------------ */
/* 2. Backfill                                                        */
/*                                                                    */
/* Existing rows keep their status but have no known start time. We   */
/* deliberately leave the column null instead of backfilling `now()`, */
/* which would claim every current activity began at migration time. */
/* The client hides the elapsed clock when the value is null.         */
/* ------------------------------------------------------------------ */
