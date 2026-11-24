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

**Themes** — a 2026 ambient system: three drifting light pools (default **Deep
Purple → Amber**) behind translucent glass sidebars, headers and input bars.
Ten presets — *Light, Cyber Dusk, Midnight Aurora, Deep Purple → Amber, Custom
Gradient, Aurora Teal, Amethyst Twilight, Crimson Sunset, Forest Night, Carbon
Mono* — plus a **Custom Gradient** two-tone picker.

Every theme is a set of **semantic surface tokens** on `<html>`:

| token | used for |
| --- | --- |
| `--bg-app-gradient` | the full-shell wash painted behind every pane |
| `--bg-sidebar` | server rail, sidebars, member list |
| `--bg-surface` | main chat / content pane |
| `--bg-elevated` | cards, modals, popovers, menus |
| `--bg-input` | inputs, composers, wells |
| `--border-subtle` | the one border colour everywhere |
| `--text-primary` / `--text-muted` | copy |

Selecting a theme only rewrites those variables, so the rail, both sidebars,
the chat pane, the member list, the DM profile card and the user control bar
re-tint at once. Ambient themes additionally raise `--glass-sidebar` /
`--glass-bar` so the gradient bleeds through the frosted panels.

The choice is stored twice: `localStorage` (`btcomms.appearance.v1`, replayed by
an inline script in `<head>` **before first paint**, so there is no flash) and
`profiles.appearance` (the full blob: gradient ends, icon pack, streamer flags,
density, motion, font scale).

**Auth (`/login`, `/signup`)** — email + password via Supabase Auth. Signup
collects a unique `@username`, a display name, and an accent colour that
becomes your avatar tint everywhere.

**Home / DMs (`/channels/home`, `/channels/@me`, `/channels/@me/:dmId`)**

| Surface | What it does |
| --- | --- |
| **Server rail Home button** | Home icon with an unread badge sits above the server icons, separated by a divider; `+` and Explore live at the bottom |
| **Home sidebar** | “Find or start a conversation” search, Friends / Store / Discover tabs, Direct Messages list with avatars, status dots, custom status, unread badges, and the user panel |
| **Friends dashboard** | Online / All / Pending / Add Friend tabs with search that never overflow or force horizontal scroll; friend rows with avatar, custom status, Message + More actions (accept/decline/remove). *Add Friend* adds an optional **Personalize your request** note (120-char counter, stored in `friendships.note`) and an **Other Places to Make Friends → Explore Discoverable Servers** card. The Pending tab shows Incoming and Sent separately, with a labelled **Accept** pill, a per-request cancel that really deletes the row, and the note you wrote echoed back on the Sent side |
| **Active Now** | Live activity cards (“playing”, “listening”, “editing”, “in voice”) for online friends |
| **DM thread** | Private 1:1 conversation with grouping, day dividers, a red **NEW** pill at the unread boundary, inline image previews, `@mention` highlights, optimistic sends, and realtime inserts |
| **DM profile panel** | Collapsible right-hand card: banner, avatar with presence dot, display name + `@handle`, status badges, **Member Since**, a **Playing / Current Activity** card with a live elapsed timer, and a full-width **View Full Profile** button |
| **Group DMs** | **New Message** with up to 10 members (live search, checkboxes, removable pills, auto group name), **Create Group Message**, Change Icon (upload or curated GIF grid), Edit Group rename, and a `Members—N` sidebar with owner badges |
| **Composer** | Floating pill with `+` attachments, `@` mention autocomplete (including built-in **`@game`** / **`@time`**), `/` slash commands, gift / GIF / sticker / emoji pickers |
| **User settings** | Full-screen modal (see below) |

**Workspace (`/channels/:serverId/:channelId`)**

| Surface | What it does |
| --- | --- |
| **Server rail** | Emoji server icons with **initials pills** when no icon is set, active pill indicator, home button, add-server, join-server, discover, and **Download Apps** |
| **Channel sidebar** | Glass surface, collapsible groups with per-category `+` quick-create, occupant avatars under voice channels, admin-only create buttons, and a **Get Started** onboarding banner in new servers |
| **Server header dropdown** | Server Boost, Invite to Server / App Directory, **Show All Channels** + **Hide Muted Channels** checkboxes, Notification & Privacy settings, Edit Per-server Profile, Leave Server (soft red), Copy Server Info → submenu. Owners/admins additionally get Server Settings, Insights, Create Channel / Category / Event, Security Actions, Report Raid |
| **Message feed** | Day dividers, consecutive-message grouping (7 min window), inline markdown (`**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, auto-links), optimistic sends, hover-delete, per-channel search, a `LIVE`/`SYNC` realtime badge |
| **Composer** | Same floating pill as DMs (attachments, mentions, slash commands, emoji/GIF/sticker), `Enter` or `→` at end-of-line sends, `Shift+Enter` newline, typing broadcast |
| **Member list** | Online/Offline grouping, owner → admin → member ordering, presence dots, accent-tinted avatars, copy-username, “in voice” badges |
| **User panel** | Glass bar; avatar opens the **profile quick-action popover** (mini card, status row with a nested **timed status** flyout — 15 min → Forever —, **10,130 Orbs**, Switch Accounts, Copy User ID), and the mic / headphone chevrons open **device pickers** with input & output volume sliders and a Voice Settings link. Also hosts the Manage Accounts modal |
| **Voice** | Join/leave voice channels, persisted occupant list, muted state, “Voice connected” card |
| **Presence** | Status picker (online / idle / do not disturb / offline); auto-idles on tab blur, offline on unload |

### Attachments (channels, DMs and group DMs)

Uploads run through one pipeline in `lib/attachments.ts` and one bucket,
`chat-attachments` (public, 25 MB per file, 10 files per message).

| Path | What happens |
| --- | --- |
| `+` → **Upload a File** | Opens a multi-select picker (`image/*,video/*,.pdf,.zip,.txt,.md,.json`) |
| `+` → **Create Thread** / **Use Apps** | Threads and the app directory are staged — both say so inline rather than failing silently |
| Drag onto the feed | Full-pane overlay reads **Upload to #general / @ada**; the drop is routed into the open composer |
| `Ctrl+V` | Pasted images become pending attachments |
| Pending tray | Removable thumbnail cards with `×`, per-file upload shimmers, and inline error text for oversize or unsupported files |
| Sent message | `AttachmentGrid` renders rounded image tiles (shimmer while loading), hover filename + size, video previews, and file chips |
| Click a tile | Portal lightbox with `Esc` to close, `←`/`→` to step through, download button and dot pagination |

Paths are `<userId>/<8-hex>-<slug>`; the storage policy
`(storage.foldername(name))[1] = auth.uid()` is what makes an upload legal, so
every writer must keep that first segment. `attachments` is a jsonb array of
`{ url, name, type, size }` on `messages`, `direct_messages` and
`group_messages`, guarded by `sanitize_attachments` / `enforce_attachment_shape`
triggers; blank text is allowed when attachments exist.

### Server creation & discovery

`+` on the rail opens **Create Your Server** (Create My Own, plus Gaming,
Friends, Study Group, School Club, Local Community, Artists & Creators
templates that pre-seed text/voice channels, and a *Have an invite already?*
footer). Creation is two steps — **Tell Us More About Your Server** (friends vs
club, with a skip link) then **Customize Your Server** (dashed upload picker,
`Server Name *` prefilled `[Username]'s server`, guidelines notice). The new
server opens on a **Welcome to [Server]** onboarding screen with six action
cards, and the creator gets a crown owner badge.

**Join a Server** accepts a bare `hTKzmak` or a full
`https://btcomms.gg/invite-code`, with sample pills and a Server Discovery
banner. Codes live in `server_invites` and redeem through
`redeem_server_invite()` so membership lands in realtime.

### User Settings (`gear` in the user panel, `Esc` to close)

A full-screen modal with a live-filtering search over every section:

| Section | Contents |
| --- | --- |
| **My Account** | Sub-tabs for Account Info (masked email/phone with Reveal, username edit, email change), Password & Security (change password, MFA setup, logged-in devices with remote sign-out), Account Status, Family Center |
| **Data & Privacy** | Data export and deletion requests |
| **Messaging Permissions** | Who can DM you, message filter level, friend-request notifications |
| **Notifications** | DMs, server messages, friend requests |
| **BT Pro / Server Boost / Subscriptions / Gift Inventory / Billing** | Plan, boosts, invoices and gifts |
| **Appearance** | Theme tiles (Light, Cyber Dusk, Midnight Aurora, **Deep Purple → Amber**, Custom Gradient, Aurora, Amethyst, Crimson Sunset, Forest, Mono), two-tone ambient gradient presets + custom picker, base mode, message density, accent + banner colour, **App Icons** grid with limited-time promos, the chat-display switch set (*Show images, videos, and lolcats*, *Show embeds and link previews*, *Show emoji reactions*, *Open threads in split view*, *Preview emoji, mentions, and markdown*, *Automatically convert emoticons to emoji*, *Show send message button*), DM search scope, and **Streamer Mode** with its sub-toggles |
| **Voice & Video** | Input/output/camera pickers, input, output and **soundboard** volume sliders, **Mic Test** with an animated level meter (real `getUserMedia` + `AnalyserNode`, synthetic fallback when permission is denied), Input Profiles (Voice Isolation / Studio / Custom), **Noise Suppression (Krisp)**, Echo Cancellation, Automatic Gain, Push to Talk + shortcut, camera selector with **Test Video** preview, *Show Stream Previews*, call sounds with **Preview Sound** toggles (Deafen/Undeafen/Mute/Unmute/Camera), and Entrance Sound server selector + custom file |
| **Accessibility** | Live preview card (sample messages, timestamps, reactions, interactive **Example Button**), text readability (12→24px chat size, underline links, display name styles), visual density (Compact/Default/Spacious UI density, Default/Compact chat display, 0→24px group spacing), colour & contrast (0→100% saturation, apply to custom colours, high contrast, sync contrast, role colours, official messages, on/off indicators), reduced motion (toggle, OS sync, 3→20s notification duration, GIF-on-focus, animated emoji, sticker animation policy), audio & screen reader (0.5→2.0x TTS with a real `speechSynthesis` preview, image descriptions, legacy chat input) |
| **Keybinds** | Custom-keybinds banner linking the desktop app, full reference catalogue (General, Messages, Navigation, Drag & Drop, Chat, Voice and Video, Miscellaneous) with every documented combo, live search, and an **Active** / **Desktop only** chip per row — `Ctrl + /` opens a cheat sheet anywhere |
| **Language & Time** | Ten-locale language dropdown driving `Intl` dates and numbers, Auto / 12-hour / 24-hour time format, and a live preview of message timestamps, the call timer and Member Since |
| **Authorized Apps** | Connected apps and sessions |
| **Edit Profiles** | Opens the full profile studio (below) |

Every section persists to `profiles` (or `supabase.auth`) and updates live.
Accessibility and Language & Time are written in two layers: a
`localStorage` cache (`btcomms.accessibility.v1`, `btcomms.language.v1`) so the
choice paints before the network responds, and
`profiles.user_settings.accessibility` / `language` / `timeFormat` so a second
device inherits it. `applyAppearance()` turns each preference into a CSS
variable or `data-*` attribute on `<html>`, which is why ticking "Enable High
Contrast Mode" repaints instantly.

### Keyboard shortcuts

`useGlobalKeybinds` installs a single document listener (never one per
component) and consults `lib/keybinds.ts`, so the settings page and the runtime
share one table:

| Shortcut | Action |
| --- | --- |
| `Ctrl + K` | QuickSwitcher (DM finder) |
| `Ctrl + F` | Focus the open channel's search field |
| `Ctrl + /` | Keyboard shortcut cheat sheet |
| `Ctrl + Shift + N` | Create a server |
| `Ctrl + Shift + T` | Create a private group |
| `Ctrl + Shift + U` | Upload a file |
| `Ctrl + Shift + L` | Copy channel link |
| `Ctrl + Shift + M` / `D` | Toggle mute / deafen |
| `Ctrl + Alt + ↑` / `Alt + ↑` | Previous server / next channel |
| `Esc` | Focus the message composer (clears the autocomplete first) |

Typing in a field is never hijacked: only actions flagged in `INPUT_SAFE`
(pickers, upload, search, navigation) fire while a textarea has focus, and
`⌘` is treated as `Ctrl` on macOS.

### Profile studio (`Edit Profiles`, or click any avatar)

A three-column live editor — every change renders immediately in the centre
card, and nothing is written until **Save Changes** appears in the bottom bar.

| Column | Contents |
| --- | --- |
| **Left — customization** | Profile switcher (**Main Profile** vs per-server overrides), nameplate picker, avatar upload/URL, six animated **avatar decorations**, solid **banner colour**, five **profile effects**, seven **display-name styles** (neon, gradient, sunset, outline, editorial, terminal), and a **Preview BT Pro** toggle that unlocks the two-tone profile theme, banner image/GIF upload and animated avatars |
| **Centre — live preview** | Banner, decorated avatar with presence dot, floating **custom status speech bubble**, display name with the chosen style/nameplate, `@username`, **pronouns**, **server tag** badge, platform badges, Message / Add Friend actions, bio, **member since**, **connections** (Roblox, TikTok, Twitch, YouTube, GitHub, Spotify, Steam) and the game widgets |
| **Right — widgets** | **Board / Activity / Wishlist** tabs with **+ Add Widget**: Favorite Game, Games I Like and Want to Play, each searchable against a game catalogue or extended with a custom title |

### Data & Privacy / Messaging Permissions / Notifications

All three sections persist into `profiles.user_settings` (JSONB) the moment a
toggle or radio changes.

- **Data & Privacy** — data-usage toggles, **Request Data** (downloads a JSON
  archive of your profile, messages, DMs, friends and blocks), profile-share
  scope radio group and an "share when I update" toggle.
- **Messaging Permissions** — sensitive-media dropdowns for friend DMs, stranger
  DMs and server channels; spam-filter radio group; DM and friend-request
  toggles; **Allow Friend Requests From** (everyone / friend of friends /
  server members / nobody); and a searchable **blocked accounts** list with
  working Unblock buttons backed by the `blocked_users` table.
- **Notifications** — activity alerts, a reactions dropdown, per-sound toggles
  with **Preview Sound** buttons (clean Web Audio chimes, no audio assets), a
  master disable, unread badge, five email categories plus **Unsubscribe from
  all**, and an expandable **Advanced** panel with `/tts` playback and speed.

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
| `social` | `postgres_changes` | `blocked_users` (alongside friendships and dm_channels) |

### Storage buckets

| Bucket | Public | Limit | Written by |
| --- | --- | --- | --- |
| `avatars` | yes | 8 MB | `uploadAvatar` → `profiles.avatar_url` |
| `banners` | yes | 8 MB | `uploadBanner` → `profiles.banner_url` |
| `server-icons` | yes | 4 MB | server icon picker |
| `chat-attachments` | yes | 25 MB | `uploadAttachments` → `attachments` jsonb |

Every write is owner-scoped by the first path segment
(`(storage.foldername(name))[1] = auth.uid()`), so uploads are
`<your-uid>/…`; reads are open because the surfaces are public CDN URLs.
Uploads surface the real Postgres/Storage message (bucket missing, RLS
rejection, size limit) instead of a generic "upload failed".

### Database schema

```
profiles        id (auth.users) · username (unique) · display_name · avatar_url
                accent_color · status · bio · custom_status · custom_status_emoji
                banner_color · theme_id · message_density · reduce_motion
                reduced_saturation · font_scale · appearance (JSONB)
                dm_privacy · message_filter
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
blocked_users   (blocker_id, blocked_id) · created_at
group_dms       id · owner_id · name · icon_url · created_at · last_message_at
group_dm_members (group_id, user_id) · joined_at · last_read_at
group_messages  id · group_id → group_dms · author_id · content · created_at
server_invites  code (pk) · server_id → servers · created_by · expires_at
                max_uses · uses
```

Timed presence adds `status_expires_at` to `profiles`; a lapsed timer reads as
Online through `effective_status()`, and `expire_stale_statuses()` sweeps the
row. Group messages are capped at 10 members by a trigger on
`group_dm_members`, and RLS is scoped through `is_group_member()`.

Profile-card columns on `profiles`: `banner_url`, `theme_primary`,
`theme_secondary`, `avatar_decoration`, `profile_effect`, `name_style`,
`nameplate`, `pronouns`, `server_tag`, `connections` (JSONB), `widgets` (JSONB),
`user_settings` (JSONB), `appearance` (JSONB), `bt_pro`.

`profiles.appearance` holds the full theme object
(`theme_id`, `gradient_from`/`gradient_to`, `message_density`, `reduce_motion`,
`reduced_saturation`, `font_scale`, `icon_pack`, streamer flags). It mirrors the
`localStorage` cache key `btcomms.appearance.v1` so the pre-paint script and the
database never disagree.

RPCs (all `security definer`): `redeem_server_invite`, `create_server_invite`,
`ensure_dm_channel`, `send_friend_request`,
`respond_friend_request`, `remove_friend`, plus the `is_dm_participant`,
`is_blocked_between`, `is_friend`, `shares_server`, `has_mutual_friend`,
`can_dm_from` and `can_friend_request_from` helpers.

**Permissions are enforced in Postgres, not the browser.** Triggers on
`friendships`, `dm_channels` and `direct_messages` evaluate the recipient's
`user_settings` and reject sends or requests that fall outside their privacy
scope (SQLSTATE `42501`).

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
- Only owners/admins can create channels. Owners can always read back the
  `servers` / `channels` rows they just inserted, which is what makes
  `insert(...).select()` work during server creation (migration `0006`).

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
realtime publication, the friends/DM tables, the four storage buckets with
owner-scoped policies (`0008`), atomic server provisioning via the
`on_server_created` trigger (`0009`), and seed the official server.

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
node --experimental-strip-types lib/demo.test.mjs   # 89 checks
```

---

## Project layout

```
app/
  page.tsx                     marketing site
  login/ signup/               auth screens
  channels/                    workspace routes (server + channel)
  channels/home/               Home / DMs (@me rewritten here
                               by next.config.ts rewrites)
  auth/callback/ signout/      session endpoints
  globals.css                  Tailwind v4 theme + design tokens
components/
  comms-loader.tsx             client entry: probe → session → data
  comms-app.tsx                live workspace shell (Supabase-backed)
  home-sidebar.tsx             "Find or start a conversation" + DM list
  friends-view.tsx             friend tabs, requests, Active Now panel
  dm-view.tsx                  private 1:1 + group thread
  dm-profile-panel.tsx         right-hand recipient card
  chat-composer.tsx            floating pill composer (attachments, /, @)
  user-menu.tsx                avatar quick-action + timed status
  user-panel.tsx               voice device popovers, mute/deafen
  server-menu.tsx              server header dropdown
  server-modals.tsx            create / wizard / join / onboarding
  group-dm-modals.tsx          New Message + Change Icon
  manage-accounts.tsx          account switcher
  ui/popover.tsx               shared menu surface + submenus
  loading-screen.tsx           rotating tips + timeout fallback
  profile/                     profile card, Edit Profile studio, widgets
  settings/                    User Settings modal + panels
  server-rail.tsx              server icons + Home button
  message-feed.tsx             realtime feed + composer
  channel-sidebar.tsx          text/voice lists, voice occupants
  member-list.tsx              presence groups
  demo/                        offline demo mirror
lib/
  supabase/                    browser + server clients
  appearance.tsx               appearance context (applies CSS variables)
  theme-boot.ts                storage key + pre-paint theme replay script
  themes.ts                    theme data + ambient gradient palettes
  presence.ts                  timed status helpers
  groups.ts                    group DM data access
  chat-features.ts             mentions, slash commands, emoji, media
  naming.ts                    initials pills + auto group names
  server-templates.ts          creation templates + intents
  icon-packs.ts                app icon packs (incl. limited promos)
  queries.ts                   typed data access
  social.ts                    friends, DMs, profile/auth mutations
  profile-cosmetics.ts         decorations, effects, name styles, games
  sounds.ts                    Web Audio notification chimes
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
