# BT Comms

> A fast, dark-mode, Discord-style chat and voice workspace for **BT Studio** — live at **[btcomms.gg](https://btcomms.gg)**.

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/Tailwind-v4-38bdf8) ![stack](https://img.shields.io/badge/Supabase-auth%20%2B%20realtime-3ecf8e) ![stack](https://img.shields.io/badge/Vercel-deployed-black)

BT Comms gives a team a server rail, text and voice channels, a realtime message
feed, and a presence-aware member list — without the weight of a full
enterprise chat product.

---

## Feature tour

**Marketing site (`/`)** — hero, product mock, feature grid, and CTA. The CTA
adapts to whether you already have a session.

**Auth (`/login`, `/signup`)** — email + password via Supabase Auth. Signup
collects a unique `@username`, a display name, and an accent colour that
becomes your avatar tint everywhere.

**Workspace (`/channels/:serverId/:channelId`)**

| Surface | What it does |
| --- | --- |
| **Server rail** | Emoji server icons, active pill indicator, add-server and explore buttons |
| **Channel sidebar** | Collapsible **Text** / **Voice** groups, occupant avatars under voice channels, admin-only “+ create” buttons, copy-invite on the header |
| **Message feed** | Day dividers, consecutive-message grouping (7 min window), inline markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, auto-links), optimistic sends, hover-delete, per-channel search, a `LIVE`/`SYNC` realtime badge |
| **Composer** | `Enter` sends, `Shift+Enter` newline, 4 000-char cap with counter, typing broadcast |
| **Member list** | Online/Offline grouping, owner → admin → member ordering, presence dots, accent-tinted avatars, copy-username, “in voice” badges |
| **User panel** | Avatar, `@username`, mute/deafen toggles, settings, log out |
| **Voice** | Join/leave voice channels, persisted occupant list, muted state, “Voice connected” card |
| **Presence** | Status picker (online / idle / do not disturb / offline); auto-idles on tab blur, offline on unload |

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

### Database schema

```
profiles        id (auth.users) · username (unique) · display_name · avatar_url
                accent_color · status · bio · timestamps
servers         id · name · icon · description · invite_code (unique) · owner_id · is_default
channels        id · server_id → servers · name · kind (text|voice) · topic · position
server_members  (server_id, user_id) · role (owner|admin|member) · joined_at
messages        id · channel_id → channels · author_id → profiles · system_author
                content · created_at · edited_at
voice_states    (channel_id, user_id) · muted · joined_at
```

Every table has **row-level security** enabled:

- Profiles are readable by any signed-in user, writable only by their owner.
- Servers, channels, members, messages, and voice states are visible **only**
  to members of that server (helper functions `is_server_member`,
  `is_channel_member`, `is_server_owner` are `security definer` to avoid RLS
  recursion).
- Only the author (or server owner) can delete a message.
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

Apply the two migrations from this repo's history to a fresh project, or run
the SQL from `supabase/migrations/` in the Supabase SQL editor. They create the
schema, RLS policies, realtime publication, and seed the official server.

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
  auth/callback/ signout/      session endpoints
  globals.css                  Tailwind v4 theme + design tokens
components/
  comms-loader.tsx             client entry: probe → session → data
  comms-app.tsx                live workspace shell (Supabase-backed)
  message-feed.tsx             realtime feed + composer
  channel-sidebar.tsx          text/voice lists, voice occupants
  server-rail.tsx              server icons
  member-list.tsx              presence groups
  demo/                        offline demo mirror
lib/
  supabase/                    browser + server clients
  queries.ts                   typed data access
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
