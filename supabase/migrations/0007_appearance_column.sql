-- BT Comms — persist the whole appearance object, not just the theme id.
--
-- Before this, only theme_id / density / motion / saturation / font scale were
-- stored on `profiles`, so the custom gradient, icon pack, streamer-mode flags
-- and DM search scope silently reset on reload (and on a new device).
--
-- `appearance` is a JSONB blob holding the full `Appearance` shape. It is
-- written debounced from the client and read back on the server render, which
-- lets the first paint use the right theme (no flash).

alter table public.profiles
  add column if not exists appearance jsonb;

comment on column public.profiles.appearance is
  'Full appearance prefs (theme_id, gradient_from, gradient_to, density, motion, font_scale, icon_pack, streamer flags). Mirrors localStorage btcomms.appearance.v1.';

-- One-time backfill so existing rows carry their current values forward.
update public.profiles
set appearance = jsonb_strip_nulls(
  jsonb_build_object(
    'theme_id', theme_id,
    'message_density', message_density,
    'reduce_motion', reduce_motion,
    'reduced_saturation', reduced_saturation,
    'font_scale', font_scale
  )
)
where appearance is null
  and (theme_id is not null or message_density is not null);
