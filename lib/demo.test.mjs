// Quick logic test for the demo store, run with:
//   node --experimental-strip-types lib/demo.test.mjs
import { demoStore } from "./demo.ts";
import {
  DECORATIONS,
  NAME_STYLES,
  PROFILE_EFFECTS,
  NAMEPLATES,
  connectionMeta,
  searchGames,
  coverGradient,
} from "./profile-cosmetics.ts";
import { durationToExpiry, effectiveStatus, publicStatus, statusCaption } from "./presence.ts";
import { STATUS_DURATIONS } from "./types.ts";
import { autoGroupName } from "./groups.ts";
import { initialsFor } from "./naming.ts";
import { SERVER_TEMPLATES, SERVER_INTENTS, INVITE_EXAMPLES } from "./server-templates.ts";
import {
  applyEmoticons,
  applyShortcodes,
  tokenizeMentions,
  activeMentionQuery,
  activeSlashQuery,
  BUILTIN_MENTIONS,
  SLASH_COMMANDS,
} from "./chat-features.ts";
import { ICON_PACKS } from "./icon-packs.ts";
import {
  THEMES,
  DEFAULT_APPEARANCE,
  themeById,
  SURFACE_TOKENS,
  ambientThemeIds,
} from "./themes.ts";
import { APPEARANCE_BOOT_SCRIPT, STORAGE_KEY } from "./theme-boot.ts";
import { extractMedia } from "./chat-features.ts";

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok ? "" : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`);
}

const server = demoStore.servers[0];
const channels = demoStore.channelsOf(server.id);
const general = channels.find((c) => c.name === "general");
const before = demoStore.messagesOf(general.id).length;

check("two servers", demoStore.servers.map((s) => s.name), ["BT Comms", "Design Guild"]);
check("text + voice channels", channels.filter((c) => c.kind === "text").length >= 3 && channels.some((c) => c.kind === "voice"), true);
check("members seeded", demoStore.membersOf(server.id).length, 5);

const created = demoStore.addMessage(general.id, "hello");
check("message added", demoStore.messagesOf(general.id).length, before + 1);
demoStore.deleteMessage(created.id);
check("message deleted", demoStore.messagesOf(general.id).length, before);

check("new channel ok", demoStore.addChannel(server.id, "qa", "text", "test").ok, true);
check("duplicate channel rejected", demoStore.addChannel(server.id, "qa", "text", null).ok, false);

const made = demoStore.addServer("My Guild", "🚀");
check("server has default channels", demoStore.channelsOf(made.id).length, 2);
check("server has owner member", demoStore.membersOf(made.id).length, 1);

check("join by valid code", demoStore.joinByCode("bt-comms").ok, true);
check("join by invalid code", demoStore.joinByCode("nope").ok, false);

const voiceChannel = channels.find((c) => c.kind === "voice");
const voiceBefore = demoStore.voice.length;
demoStore.joinVoice(voiceChannel.id);
check("joined voice", demoStore.voice.some((v) => v.channel_id === voiceChannel.id), true);
demoStore.leaveVoice();
check("left voice", demoStore.voice.length, voiceBefore);

demoStore.updateProfile({ display_name: "Ada L.", status: "idle" });
check("profile updated", [demoStore.profile.display_name, demoStore.profile.status], ["Ada L.", "idle"]);

/* ------------------------- profile card cosmetics ------------------------ */
check("decorations include none + aurora", DECORATIONS.slice(0, 2).map((d) => d.id), ["none", "aurora"]);
check("every decoration has a unique id", new Set(DECORATIONS.map((d) => d.id)).size, DECORATIONS.length);
check("profile effects are pro-gated", PROFILE_EFFECTS.filter((e) => e.pro).length, PROFILE_EFFECTS.length - 1);
check("nameplates offer a none option", NAMEPLATES[0].id, "none");
check("name styles include neon", NAME_STYLES.some((s) => s.id === "neon"), true);

check("connection meta resolves kind", connectionMeta("twitch").label, "Twitch");
check("unknown connection falls back", connectionMeta("nope").kind, "roblox");
check("connection meta builds urls", connectionMeta("github").urlPrefix + "ada", "https://github.com/ada");

check("game search filters", searchGames("hades").map((g) => g.name), ["Hades II"]);
check("empty search returns suggestions", searchGames("").length, 8);
check("cover gradient is deterministic", coverGradient("Celeste"), coverGradient("Celeste"));
check("cover gradient varies by name", coverGradient("Celeste") === coverGradient("Minecraft"), false);

demoStore.updateProfile({
  avatar_decoration: "ember",
  profile_effect: "confetti",
  name_style: "gradient",
  nameplate: "neon",
  connections: [{ id: "c9", kind: "tiktok", handle: "ada", url: "https://tiktok.com/@ada" }],
  widgets: [{ id: "w9", kind: "want", game: { id: "g-x", name: "Silksong", cover: null } }],
});
check(
  "cosmetics persist on the demo profile",
  [
    demoStore.profile.avatar_decoration,
    demoStore.profile.profile_effect,
    demoStore.profile.name_style,
    demoStore.profile.nameplate,
    demoStore.profile.connections.length,
    demoStore.profile.widgets[0].kind,
  ],
  ["ember", "confetti", "gradient", "neon", 1, "want"],
);

demoStore.updateProfile({ user_settings: { ...demoStore.profile.user_settings, spamFilter: "all" } });
check("user settings merge into the blob", demoStore.profile.user_settings.spamFilter, "all");
check("untouched settings survive", demoStore.profile.user_settings.notifyDesktop, true);

/* ------------------------------------------------------------------ */
/* Phase 4: timed presence                                            */
/* ------------------------------------------------------------------ */

check("status durations cover the six presets", STATUS_DURATIONS.map((d) => d.id), [
  "15m",
  "1h",
  "8h",
  "24h",
  "3d",
  "forever",
]);

const in15 = durationToExpiry("15m", new Date("2026-01-01T00:00:00Z"));
check("15m expiry is 15 minutes out", in15, "2026-01-01T00:15:00.000Z");
check("forever has no expiry", durationToExpiry("forever"), null);

check(
  "expired timer reads as online",
  effectiveStatus("dnd", new Date(Date.now() - 1000).toISOString()),
  "online",
);
check(
  "live timer keeps its value",
  effectiveStatus("idle", new Date(Date.now() + 60_000).toISOString()),
  "idle",
);
check("invisible reads as offline to others", publicStatus("invisible"), "offline");
check(
  "status caption counts down",
  statusCaption("idle", new Date(Date.now() + 30 * 60_000).toISOString()),
  "30 min left",
);

demoStore.setStatus("dnd", 60 * 60_000);
check("demo setStatus persists the status", demoStore.profile.status, "dnd");
check(
  "demo setStatus stores an expiry",
  typeof demoStore.profile.status_expires_at,
  "string",
);

/* ------------------------------------------------------------------ */
/* Phase 4: group DMs                                                 */
/* ------------------------------------------------------------------ */

const group = demoStore.createGroup(
  [demoStore.profile.id === "demo-user-ada" ? "demo-user-sol" : "demo-user-sol", "demo-user-mira"],
  null,
);
check("group creation succeeds", group.ok, true);
check("group keeps owner + 2 members", group.group.members.length, 3);
check(
  "auto group name lists the other members",
  autoGroupName(group.group.members, "demo-user-ada"),
  "Sol Kim, Mira Okafor",
);

demoStore.addGroupMessage(group.group.id, "hello group");
check("group message lands in the store", demoStore.groupMessagesOf(group.group.id).length, 1);
check(
  "group last_message mirrors the send",
  demoStore.groups.find((g) => g.id === group.group.id)?.last_message?.content,
  "hello group",
);

demoStore.updateGroup(group.group.id, { icon_url: "data:image/svg+xml;utf8,x", name: "Design Crew" });
const updatedGroup = demoStore.groups.find((g) => g.id === group.group.id);
check("group rename persists", updatedGroup?.name, "Design Crew");
check("group icon persists", updatedGroup?.icon_url, "data:image/svg+xml;utf8,x");

demoStore.addGroupMembers(group.group.id, ["demo-user-dev"]);
check(
  "members can be added to a group",
  demoStore.groups.find((g) => g.id === group.group.id)?.members.length,
  4,
);

/* ------------------------------------------------------------------ */
/* Phase 4: server invites                                            */
/* ------------------------------------------------------------------ */

const invite = demoStore.inviteFor(demoStore.servers[1].id);
check("invites are reusable per server", demoStore.inviteFor(demoStore.servers[1].id).code, invite.code);

const redeemed = demoStore.redeemInvite(invite.code);
check("a valid code joins the server", redeemed.ok, true);
check("a second redeem reports alreadyMember", redeemed.ok && redeemed.alreadyMember, true);

const badRedeem = demoStore.redeemInvite("nope-not-real");
check("an invalid code fails cleanly", badRedeem.ok, false);

const urlRedeem = demoStore.redeemInvite(`https://btcomms.gg/invite/${invite.code}`);
check("full invite URLs are parsed", urlRedeem.ok, true);

/* ------------------------------------------------------------------ */
/* Phase 4: chat features                                             */
/* ------------------------------------------------------------------ */

check("emoticons convert to emoji", applyEmoticons("hello :)"), "hello 🙂");
check("shortcodes resolve", applyShortcodes("ship it :rocket:"), "ship it 🚀");
check(
  "unknown shortcodes are left alone",
  applyShortcodes(":not_a_real_code:"),
  ":not_a_real_code:",
);

const mentionTokens = tokenizeMentions("hi @game and @time");
check(
  "built-in mention tags tokenize",
  mentionTokens.filter((t) => t.type === "mention").map((t) => t.value),
  ["game", "time"],
);

check("mention autocomplete detects the query", activeMentionQuery("hey @so", 7), "so");
check("slash autocomplete detects the query", activeSlashQuery("/sh", 3), "sh");
check("built-in mentions include @game and @time", BUILTIN_MENTIONS.map((m) => m.id), ["game", "time"]);
check("slash command list is populated", SLASH_COMMANDS.length >= 8, true);

const media = extractMedia("look ![cat](https://x.test/a.png) and https://y.test/b.jpg");
check("inline images are extracted", media.images.length, 2);
check("the text keeps the surrounding copy", media.text.trim(), "look  and");

/* ------------------------------------------------------------------ */
/* Phase 4: appearance, icons, server creation                        */
/* ------------------------------------------------------------------ */

const defaultTheme = themeById(DEFAULT_APPEARANCE.theme_id);
check("the default theme is the ambient gradient", defaultTheme.id, "ambient");
check("ambient theme defines three light pools", defaultTheme.ambient?.length, 3);
check("theme fallback still resolves", themeById("does-not-exist").id, "ambient");
check(
  "every theme declares an ambient palette",
  THEMES.every((t) => Array.isArray(t.ambient) && t.ambient.length === 3),
  true,
);
check(
  "the required theme ids exist",
  ["light", "charcoal", "midnight", "custom", "ambient"].every((id) => THEMES.some((t) => t.id === id)),
  true,
);

check("icon packs include limited-time promos", ICON_PACKS.filter((p) => p.promo).length, 2);
check("icon packs are unique", new Set(ICON_PACKS.map((p) => p.id)).size, ICON_PACKS.length);

check("six server templates ship", SERVER_TEMPLATES.length, 6);
check(
  "every template seeds a text and a voice channel",
  SERVER_TEMPLATES.every(
    (t) => t.channels.some((c) => c.kind === "text") && t.channels.some((c) => c.kind === "voice"),
  ),
  true,
);
check("two creation intents exist", SERVER_INTENTS.map((i) => i.id), ["friends", "community"]);
check("invite examples are shown", INVITE_EXAMPLES.length, 2);

/* ---- theme engine: semantic tokens, ambient shells, boot script ---- */

check(
  "every theme defines the semantic surface tokens",
  THEMES.every((t) => SURFACE_TOKENS.every((token) => typeof t.vars[token] === "string" && t.vars[token])),
  true,
);
check(
  "surface tokens cover the documented set",
  [...SURFACE_TOKENS],
  ["--bg-sidebar", "--bg-surface", "--bg-elevated", "--bg-input", "--border-subtle", "--text-primary", "--text-muted"],
);
check(
  "the 2026 gradient shells are flagged as ambient",
  ["ambient", "custom", "amethyst", "aurora", "ember", "forest"].every((id) => ambientThemeIds().includes(id)),
  true,
);
check("flat themes are not ambient shells", ["light", "charcoal", "midnight", "mono"].filter((id) => ambientThemeIds().includes(id)), []);
check("light theme resolves a light palette", themeById("light").dark, false);
check(
  "every theme names itself",
  THEMES.every((t) => typeof t.name === "string" && t.name.length > 0),
  true,
);
check("theme names are unique", new Set(THEMES.map((t) => t.name)).size, THEMES.length);
check("the renamed 2026 themes are present", ["Deep Purple → Amber", "Cyber Dusk", "Midnight Aurora", "Crimson Sunset"].every((n) => THEMES.some((t) => t.name === n)), true);
check("the appearance cache key is stable", STORAGE_KEY, "btcomms.appearance.v1");
check("the boot script reads the cache key", APPEARANCE_BOOT_SCRIPT.includes("btcomms.appearance.v1"), true);
check("the boot script sets the ambient flag", APPEARANCE_BOOT_SCRIPT.includes("data.ambient") || APPEARANCE_BOOT_SCRIPT.includes('dataset.ambient'), true);
check("the boot script paints the app gradient", APPEARANCE_BOOT_SCRIPT.includes("--bg-app-gradient"), true);
check("the boot script carries every theme", THEMES.every((t) => APPEARANCE_BOOT_SCRIPT.includes(`"${t.id}"`)), true);

check("initials pill for one word", initialsFor("Design"), "DES");
check("initials pill for multiple words", initialsFor("Design Guild"), "DG");
check("initials pill capped at three", initialsFor("Alpha Beta Gamma Delta"), "ABG");

check("accounts list has one active account", demoStore.accounts.filter((a) => a.active).length, 1);

console.log(failures === 0 ? "\nAll demo-store checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
