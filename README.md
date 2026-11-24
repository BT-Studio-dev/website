# BT Comms

> A fast, dark-mode, Discord-style chat and voice workspace for **BT Studio** — live at **[btcomms.gg](https://btcomms.gg)**.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![stack](https://img.shields.io/badge/Supabase-auth%20%2B%20realtime-3ecf8e) ![stack](https://img.shields.io/badge/Vercel-deployed-black)

BT Comms gives a team a Discord-style **Home / Direct Messages** hub, friends and
activity, seven gradient themes, a full User Settings modal, and realtime text
and voice channels — without the weight of a full enterprise chat product.

---

## Feature tour

**Marketing site (`/`)** — hero, product mock, feature grid, and CTA. The CTA
adapts to whether you already have a session.

**Auth (`/login`, `/signup`)** — email + password via Supabase Auth. Signup
collects a unique `@username`, a display name, and an accent colour that
becomes your avatar tint everywhere.

**Home / DMs (`/channels/home`, `/channels/@me`, `/channels/@me/:dmId`)**

| Surface | What it does |
| --- | --- |
| **Server rail Home button** | Home icon with an unread badge sits above the server icons, separated by a divider; `+` and Explore live at the bottom |
| **Home sidebar** | “Find or start a conversation” search, Friends / Store / Discover tabs, Direct Messages list with avatars, status dots, custom status, unread badges, and the user panel |
| **Friends dashboard** | Online / All / Pending / Add Friend tabs with search; friend rows with avatar, custom status, Message + More actions (accept/decline/remove) |
| **Active Now** | Live activity cards (“playing”, “listening”, “editing”, “in voice”) for online friends |
| **DM thread** | Private 1:1 conversation with grouping, day dividers, optimistic sends, and realtime inserts |
| **User settings** | Full-screen modal (see below) |

**Workspace (`/channels/:serverId/:channelId`)**

| Surface | What it does |
| --- | --- |
| **Server rail** | Emoji server icons, active pill indicator, home button, add-server and explore buttons |
| **Channel sidebar** | Collapsible **Text** / **Voice** groups, occupant avatars under voice channels, admin-only “+ create” buttons, copy-invite on the header |
| **Message feed** | Day dividers, consecutive-message grouping (7 min window), inline markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, auto-links), optimistic sends, hover-delete, per-channel search, a `LIVE`/`SYNC` realtime badge |
| **Composer** | `Enter` sends, `Shift+Enter` newline, 4 000-char cap with counter, typing broadcast |
| **Member list** | Online/Offline grouping, owner → admin → member ordering, presence dots, accent-tinted avatars, copy-username, “in voice” badges |
| **User panel** | Avatar, status dot, display name, custom status, working Mute / Deafen toggles, gear → settings |
| **Voice** | Join/leave voice channels, persisted occupant list, muted state, “Voice connected” card |
| **Presence** | Status picker (online / idle / do not disturb / offline); auto-idles on tab blur, offline on unload |

### User Settings (`gear` in the user panel, `Esc` to close)

A full-screen modal with a live-filtering search over every section:

| Section | Contents |
| --- | --- |
| **My Account** | Sub-tabs for Account Info (masked email/phone with Reveal, username edit, email change), Password & Security (change password, MFA setup, logged-in devices with remote sign-out), Account Status, Family Center |
| **Data & Privacy** | Data export and deletion requests |
| **Messaging Permissions** | Who can DM you, message filter level, friend-request notifications |
| **Notifications** | DMs, server messages, friend requests |
| **BT Pro / Server Boost / Subscriptions / Gift Inventory / Billing** | Plan, boosts, invoices and gifts |
| **Appearance** | 7 gradient themes (Midnight, Amethyst, Aurora, Ember, Forest, Mono, Light), dark/light toggle, message density, accent + banner colour, reset |
| **Voice & Video** | Input/output device pickers, input/output volume sliders, real microphone test via `getUserMedia` + `AudioContext` |
| **Accessibility** | Reduced motion, reduced saturation, font scaling |
| **Authorized Apps** | Connected apps and sessions |
| **Edit Profiles** | Avatar upload (Supabase Storage `avatars`), display name, bio, custom status + emoji |

Every section persists to `profiles` (or `supabase.auth`) and updates live.

---

## Architecture

```
Browser ──► Next.js App Router (Vercel)
              │
              ├─ marketing + auth screens (React Server Components)
              ├─ proxy.ts  → cookie-based session gate (no network hop)
              │
              └─ client workspace ──► Supabase JS (browser)
                                        ├─ Postgres + RLS
                                        ├─ Auth (cookies via @supabase/ssr)
                                        └─ Realtime (postgres_changes + broadcast)
```

**All Supabase traffic happens in the browser.** That keeps the workspace
usable behind any proxy or CDN, gives Realtime for free (it is a websocket
managed by the client), and lets Postgres row-level security be the single
source of truth for authorisation. The Next.js server only renders shells and
handles the OAuth/email-confirmation callback.

### Realtime channels

| Channel | Kind | Purpose |
| --- | --- | --- |
| `messages:<channelId>` | `postgres_changes` | INSERT / UPDATE / DELETE on `messages` for the open channel |
| `typing:<channelId>` | `broadcast` | Ephemeral “is typing…” signal (no DB writes) |
| `server:<serverId>` | `postgres_changes` | `server_members`, `profiles` (presence/name), `voice_states` |
| `social` | `postgres_changes` | `friendships`, `dm_channels`, `profiles` (presence/name) |
| `dm:<dmChannelId>` | `postgres_changes` | `direct_messages` INSERT for the open conversation |

### Database schema

```
profiles        id (auth.users) · username (unique) · display_name · avatar_url
                accent_color · status · bio · custom_status · custom_status_emoji
                banner_color · theme_id · message_density · reduce_motion
                reduced_saturation · font_scale · dm_privacy · message_filter
                notify_* · display_email · timestamps
servers         id · name · icon · description · invite_code (unique) · owner_id · is_default
channels        id · server_id → servers · name · kind (text|voice) · topic · position
server_members  (server_id, user_id) · role (owner|admin|member) · joined_at
messages        id · channel_id → channels · author_id → profiles · system_author
                content · created_at · edited_at
voice_states    (channel_id, user_id) · muted · joined_at
friendships     id · requester_id · addressee_id · status (pending|accepted|blocked)
                created_at · responded_at
dm_channels     id · user_a < user_b · pair_key (unique) · created_at · last_message_at
direct_messages id · dm_channel_id → dm_channels · author_id · content
                created_at · edited_at · read_at
```

RPCs (all `security definer`): `ensure_dm_channel`, `send_friend_request`,
`respond_friend_request`, `remove_friend`, plus the `is_dm_participant` helper
used by the DM policies.

Every table has **row-level security** enabled:

- Profiles are readable by any signed-in user, writable only by their owner.
- Servers, channels, members, messages, and voice states are visible **only**
  to members of that server (helper functions `is_server_member`,
  `is_channel_member`, `is_server_owner` are `security definer` to avoid RLS
  recursion).
- Only the author (or server owner) can delete a message.
- Friendships and DM channels are visible only to the two people involved; DMs
  are readable/sendable only by participants, and only the author can edit or
  delete one.
- Only owners/admins can create channels.

A `handle_new_user()` trigger on `auth.users` creates the profile, guarantees a
unique username, and auto-joins the new member to the seeded **BT Comms**
server (`invite_code: bt-comms`).

---

## Local development

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase project
npm run dev                    # http://localhost:3000
```

### Environment variables

| Key | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `publishable` / `anon` key |

Both are safe to expose to the browser; RLS is what protects the data.

### Database setup

Apply the migrations in `supabase/migrations/` in order to a fresh project (or
paste them into the Supabase SQL editor). They create the schema, RLS policies,
realtime publication, the friends/DM tables, and seed the official server.

Then in Supabase → Authentication → URL Configuration:

```
Site URL:            https://btcomms.gg
Redirect URLs:       https://btcomms.gg/auth/callback
                     http://localhost:3000/auth/callback
```

---

## Deployment (Vercel)

The Vercel project `bt-comms` is already linked to this repository with the
Supabase env vars set for production, preview, and development.

```bash
vercel --prod          # or: push to main and let the Git integration build
```

Add `btcomms.gg` under **Project → Settings → Domains** and point DNS at
Vercel. Then add the domain to Supabase's redirect allow-list (above).

---

## Demo mode

If the browser cannot reach Supabase — offline preview, firewalled sandbox, or
a missing env var — BT Comms boots an in-memory replica of the workspace and
shows a **Demo mode** banner. Every channel, member, and message is real data
from `lib/demo.ts`; sends, channel creation, voice joins, and status changes all
work but are not persisted.

Force it any time:

```
https://btcomms.gg/channels?demo=1
```

The demo mirrors phase 2 too — Home, friends, DMs, Active Now and the settings
modal (Appearance + Edit Profiles are fully live against local state).

Run the demo-store logic tests:

```bash
node --experimental-strip-types lib/demo.test.mjs
```

---

## Project layout

```
app/
  page.tsx                     marketing site
  login/ signup/               auth screens
  channels/                    workspace routes (server + channel)
  channels/home/               Home / DMs (@me rewritten here)
  auth/callback/ signout/      session endpoints
  globals.css                  Tailwind v4 theme + design tokens
components/
  comms-loader.tsx             client entry: probe → session → data
  comms-app.tsx                live workspace shell (Supabase-backed)
  home-sidebar.tsx             "Find or start a conversation" + DM list
  friends-view.tsx             friend tabs, requests, Active Now panel
  dm-view.tsx                  private 1:1 thread
  settings/                    User Settings modal + panels
  server-rail.tsx              server icons + Home button
  message-feed.tsx             realtime feed + composer
  channel-sidebar.tsx          text/voice lists, voice occupants
  member-list.tsx              presence groups
  demo/                        offline demo mirror
lib/
  supabase/                    browser + server clients
  appearance.tsx               gradient themes + density/motion context
  queries.ts                   typed data access
  social.ts                    friends, DMs, profile/auth mutations
  demo.ts                      in-memory demo store
  format.ts                    timestamps, markdown tokenizer
proxy.ts                       cookie-based session gate
```

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npx tsc --noEmit` | Type-check |

---

© BT Studio · [btcomms.gg](https://btcomms.gg)
