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
import { SOUNDBOARD, SOUND_GROUPS, clampVolume } from "./soundboard.ts";
import { looksLikeSelfCapture } from "./webrtc.ts";
import { scoreMatch } from "./search.ts";

/** The detector only reads `label`, so a stub is enough. */
const fakeTrack = (label) => ({ label });
import {
  ACCESSIBILITY_STORAGE_KEY,
  CHAT_FONT_SIZE_RANGE,
  DEFAULT_ACCESSIBILITY,
  TTS_RATE_RANGE,
  accessibilityFromSettings,
  formatClock,
  localeFor,
  normalizeAccessibility,
  normalizeTimeFormat,
  resolveHourCycle,
  saturationFilter,
  withAccessibility,
} from "./accessibility.ts";
import {
  KEYBIND_ACTIONS,
  KEYBIND_GROUPS,
  REGISTERED_SHORTCUTS,
  comboFromEvent,
  matchShortcut,
  prettyCombo,
} from "./keybinds.ts";
import { isStoredAttachmentUrl, stripStrayUrls } from "./attachments.ts";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
  attachmentPath,
  fileNameFromUrl,
  formatFileSize,
  isImageAttachment,
  isVideoAttachment,
  normalizeAttachments,
  validateAttachment,
} from "./attachments.ts";
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
  readableForeground,
  relativeLuminance,
} from "./themes.ts";
import { APPEARANCE_BOOT_SCRIPT, STORAGE_KEY } from "./theme-boot.ts";
import { activityFromStatus, activityLabel } from "./activity.ts";
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


/* ---- attachments: paths, limits, normalization ---- */

const pngFile = (over = {}) => ({ name: "Screenshot 2026.PNG", type: "image/png", size: 2048, ...over });

check("attachment paths are owner-scoped", attachmentPath("u1", "a.png").startsWith("u1/"), true);
check("attachment paths keep an extension", attachmentPath("u1", "clip.mov").endsWith(".mov"), true);
check(
  "attachment paths slugify the filename",
  attachmentPath("u1", "My Shot (final).png").split("/")[1].replace(/^[0-9a-f]{8}-/, ""),
  "my-shot-final.png",
);
check(
  "attachment paths never contain spaces or parens",
  /[\s()]/.test(attachmentPath("u1", "My Shot (final).png").split("/")[1]),
  false,
);
check("attachment paths are unique per upload", attachmentPath("u1", "a.png") === attachmentPath("u1", "a.png"), false);
check("the file limit matches the bucket", MAX_ATTACHMENT_BYTES, 26214400);
check("ten files per message", MAX_ATTACHMENTS_PER_MESSAGE, 10);
check("the accept list covers images, video, pdf and zip", ["image/*", "video/*", ".pdf", ".zip"].every((t) => ATTACHMENT_ACCEPT.includes(t)), true);

check("an 8 MB PNG is accepted", validateAttachment(pngFile()).ok, true);
check("an empty file is rejected", validateAttachment(pngFile({ size: 0 })).ok, false);
check("an oversize file is rejected", validateAttachment(pngFile({ size: MAX_ATTACHMENT_BYTES + 1 })).ok, false);
check("an executable is rejected", validateAttachment({ name: "setup.exe", type: "application/x-msdownload", size: 10 }).ok, false);

check("image detection", isImageAttachment({ url: "x.png", name: "x.png", type: "image/png", size: 1 }), true);
check("video detection", isVideoAttachment({ url: "x.mp4", name: "x.mp4", type: "video/mp4", size: 1 }), true);
check("pdf is neither image nor video", isImageAttachment({ url: "x.pdf", name: "x.pdf", type: "application/pdf", size: 1 }), false);
check("byte formatting", formatFileSize(2048), "2 KB");
check("byte formatting for MB", formatFileSize(5 * 1024 * 1024), "5 MB");
check("filename extracted from a public URL", fileNameFromUrl("https://x.supabase.co/storage/v1/object/public/chat-attachments/u1/ab12cd34-my-shot.png"), "my-shot.png");

const rawAttachments = [
  { url: "https://cdn/x.png", name: "x.png", type: "image/png", size: 10 },
  { url: "https://cdn/y.zip", name: "y.zip" },
  { name: "no-url.png", type: "image/png", size: 3 },
  null,
];
check("normalize drops entries without a url", normalizeAttachments(rawAttachments).length, 2);
check("normalize fills a missing name", normalizeAttachments(rawAttachments)[1].name, "y.zip");
check(
  "normalize is tolerant of junk",
  [normalizeAttachments(null), normalizeAttachments(undefined), normalizeAttachments("nope")].every((r) => Array.isArray(r) && r.length === 0),
  true,
);
check("normalize keeps a real attachment intact", normalizeAttachments(rawAttachments)[0].url, "https://cdn/x.png");


/* ---- blob/data URL hygiene (the "blob:https://…" message bug) ---- */

check(
  "a pasted blob URL is stripped from message text",
  stripStrayUrls("blob:bt-comms.vercel.app/42c144e0-964c-4ad2-9d4b-98d737732ca4"),
  "",
);
check(
  "a blob URL on its own line leaves the real message",
  stripStrayUrls("look blob:https://bt-comms.vercel.app/abc123 at this"),
  "look at this",
);
check("data: URLs are stripped too", stripStrayUrls("data:image/png;base64,AAAA"), "");
check("ordinary text survives untouched", stripStrayUrls("hello there"), "hello there");
check("stripStrayUrls is null-safe", stripStrayUrls(""), "");
check(
  "stored URLs are recognised",
  [
    isStoredAttachmentUrl("https://x.supabase.co/object/public/chat-attachments/a/b.png"),
    isStoredAttachmentUrl("blob:http://localhost:3000/abc"),
    isStoredAttachmentUrl("javascript:alert(1)"),
    isStoredAttachmentUrl(""),
  ],
  [true, true, false, false],
);
check(
  "an image can be detected from its name when the MIME is wrong",
  isImageAttachment({ url: "https://cdn/x", name: "shot.PNG", type: "application/octet-stream", size: 1 }),
  true,
);
check(
  "a pdf is never an image even with a misleading name",
  isImageAttachment({ url: "https://cdn/doc.png", name: "doc.png", type: "application/pdf", size: 1 }),
  false,
);

/* ---- accessibility defaults + normalisation ---- */

check("every accessibility key has a default", Object.keys(DEFAULT_ACCESSIBILITY).length, 22);
check("chat font defaults to 16px", DEFAULT_ACCESSIBILITY.chatFontSize, 16);
check("the font slider matches the spec", [CHAT_FONT_SIZE_RANGE.min, CHAT_FONT_SIZE_RANGE.max], [12, 24]);
check("the TTS slider matches the spec", [TTS_RATE_RANGE.min, TTS_RATE_RANGE.max], [0.5, 2]);

const junkA11y = normalizeAccessibility({
  chatFontSize: 999,
  groupSpacing: -4,
  saturation: "nope",
  uiDensity: "huge",
  chatDisplay: "ultra",
  stickerAnimations: "sometimes",
  ttsRate: 9,
});
check("an out-of-range font size clamps", junkA11y.chatFontSize, CHAT_FONT_SIZE_RANGE.max);
check("a negative group spacing clamps to 0", junkA11y.groupSpacing, 0);
check("an invalid density falls back", junkA11y.uiDensity, "default");
check("an invalid chat display falls back", junkA11y.chatDisplay, "default");
check("an invalid sticker mode falls back", junkA11y.stickerAnimations, "always");
check("an oversize TTS rate clamps", junkA11y.ttsRate, TTS_RATE_RANGE.max);
check("junk input never throws", normalizeAccessibility(null).chatFontSize, 16);
check("a partial blob fills every key", Object.keys(normalizeAccessibility({ highContrast: true })).length, Object.keys(DEFAULT_ACCESSIBILITY).length);
check("saturation percentage becomes a filter", saturationFilter(40), "saturate(0.4)");
check("saturation clamps above 100", saturationFilter(400), "saturate(1)");

check(
  "accessibility round-trips through user_settings",
  accessibilityFromSettings(withAccessibility({ notifyDesktop: true }, { chatFontSize: 18 }),).chatFontSize,
  18,
);
check(
  "writing accessibility keeps sibling settings",
  withAccessibility({ notifyDesktop: true }, {}) .notifyDesktop ?? null,
  true,
);
check("a missing blob returns defaults", accessibilityFromSettings(undefined).uiDensity, "default");
check("the accessibility cache key is stable", ACCESSIBILITY_STORAGE_KEY, "btcomms.accessibility.v1");

/* ---- language & time ---- */

check("English US is the default locale", localeFor("en-US"), "en-US");
check("an unknown language falls back to US English", localeFor("xx-YY"), "en-US");
check("time format normalisation keeps valid values", normalizeTimeFormat("24h"), "24h");
check("time format normalisation rejects junk", normalizeTimeFormat("half"), "auto");
check("auto follows the device's 24-hour preference", resolveHourCycle("auto", "h23"), "h23");
check("auto falls back to 12-hour", resolveHourCycle("auto", undefined), "h12");
check("an explicit 12-hour wins over the device", resolveHourCycle("12h", "h23"), "h12");
check("a 12-hour clock renders AM/PM", /AM|PM/.test(formatClock("2026-01-02T16:32:00Z", "en-US", "12h")), true);
check("a 24-hour clock has no AM/PM", /AM|PM/.test(formatClock("2026-01-02T16:32:00Z", "en-US", "24h")), false);
check("an invalid date renders empty", formatClock("not-a-date", "en-US", "auto"), "");

/* ---- keybinds ---- */

check("the keybind catalogue covers seven groups", KEYBIND_GROUPS.length, 7);
check(
  "every reference row for Navigation is present",
  KEYBIND_GROUPS.find((g) => g.title === "Navigation").entries.length,
  9,
);
check(
  "QuickSwitcher is documented as CTRL K",
  KEYBIND_GROUPS.flatMap((g) => g.entries).find((e) => e.id === "quickswitcher").combos[0].join(" "),
  "CTRL K",
);
check(
  "Search is documented as CTRL F",
  KEYBIND_GROUPS.flatMap((g) => g.entries).find((e) => e.id === "search").combos[0].join(" "),
  "CTRL F",
);
check("every implemented action is in the reference list", [...REGISTERED_SHORTCUTS].every((id) => KEYBIND_GROUPS.flatMap((g) => g.entries).some((e) => e.id === id)), true);
check(
  "every implemented action has a handler table entry",
  [...REGISTERED_SHORTCUTS].every((id) => KEYBIND_ACTIONS.some((a) => a.id === id)),
  true,
);
check(
  "combo strings include modifiers in canonical order",
  comboFromEvent({ key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }),
  "CTRL SHIFT K",
);
check(
  "Command is treated as Ctrl on macOS",
  comboFromEvent({ key: "k", ctrlKey: false, metaKey: true, altKey: false, shiftKey: false }),
  "CTRL K",
);
check(
  "a bare modifier press yields no combo",
  comboFromEvent({ key: "Shift", ctrlKey: false, metaKey: false, altKey: true, shiftKey: true }),
  null,
);
check(
  "escape normalises to ESC",
  comboFromEvent({ key: "Escape", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }),
  "ESC",
);
check(
  "matchShortcut accepts the declared combo",
  matchShortcut({ key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, ["CTRL", "K"]),
  true,
);
check(
  "matchShortcut rejects a near miss",
  matchShortcut({ key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true }, ["CTRL", "K"]),
  false,
);
check("prettyCombo title-cases the keys", prettyCombo(["CTRL", "SHIFT", "K"]), "Ctrl + Shift + K");

check("initials pill for one word", initialsFor("Design"), "DES");
check("initials pill for multiple words", initialsFor("Design Guild"), "DG");
check("initials pill capped at three", initialsFor("Alpha Beta Gamma Delta"), "ABG");

/* --------------------------- voice room + soundboard --------------------------- */

check("soundboard catalogue non-empty", SOUNDBOARD.length > 0, true);
check(
  "every soundboard entry has a unique id",
  new Set(SOUNDBOARD.map((sound) => sound.id)).size,
  SOUNDBOARD.length,
);
check(
  "every soundboard entry belongs to a rendered group",
  SOUNDBOARD.every((sound) => SOUND_GROUPS.includes(sound.group)),
  true,
);
check(
  "premium sounds are a strict subset",
  SOUNDBOARD.some((s) => s.premium) && !SOUNDBOARD.every((s) => s.premium),
  true,
);
check(
  "soundboard volume clamps to 0-100",
  [clampVolume(-20), clampVolume(65), clampVolume(400)].join(","),
  "0,65,100",
);

check("self-capture: our own title is detected", looksLikeSelfCapture(fakeTrack("BT Comms | Friends")), true);
check("self-capture: the product name is detected", looksLikeSelfCapture(fakeTrack("Chrome Tab — btcomms.gg")), true);
check(
  "self-capture: an unrelated app window is not flagged",
  looksLikeSelfCapture(fakeTrack("Figma — Design System")),
  false,
);
check(
  "self-capture: an unrelated browser window is not flagged",
  looksLikeSelfCapture(fakeTrack("ChatGPT - Google Chrome:Window")),
  false,
);

/* ------------------------------- global search -------------------------------- */

check("search: exact match scores highest", scoreMatch("design", "design") > scoreMatch("design guild", "design"), true);
check("search: prefix beats mid-word", scoreMatch("general", "gen") > scoreMatch("non-general", "gen"), true);
check("search: word start is found", scoreMatch("Design Guild", "guild") > 0, true);
check("search: case insensitive", scoreMatch("General", "GENERAL") > 0, true);
check("search: no match is negative", scoreMatch("general", "zzz"), -1);
check("search: empty query matches everything", scoreMatch("anything", "   "), 0);

/* ------------------------------ contrast tokens ------------------------------- */

/** WCAG contrast ratio between two hex colours. */
function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

check("luminance: black is 0", relativeLuminance("#000000"), 0);
check("luminance: white is 1", Math.round(relativeLuminance("#ffffff") * 100) / 100, 1);
check("luminance: shorthand expands", relativeLuminance("#fff"), relativeLuminance("#ffffff"));
check("luminance: unparseable is null", relativeLuminance("oklch(0.6 0.2 30)"), null);

check("readable ink on a light accent is dark", readableForeground("#e2e4e9"), "#0a0a0c");
check("readable ink on a dark accent is white", readableForeground("#5865f2"), "#ffffff");

// Every shipped accent must clear 4.5:1 against the foreground we pair with it.
const accentContrast = THEMES.map((theme) => {
  const accent = theme.vars["--c-accent"];
  return { id: theme.id, ratio: contrast(accent, readableForeground(accent)) };
});
check(
  "every theme's accent clears 4.5:1 with its paired foreground",
  accentContrast.filter((entry) => (entry.ratio ?? 0) < 4.5).map((entry) => entry.id).join(","),
  "",
);

// The boot script must agree with applyAppearance, or the first paint is wrong.
check(
  "boot script derives the accent ink too",
  APPEARANCE_BOOT_SCRIPT.includes("--c-on-accent") && APPEARANCE_BOOT_SCRIPT.includes("0.179"),
  true,
);

/* ------------------------------ activity parsing ---------------------------- */

check("playing status becomes a game", activityFromStatus("Playing BT Comms Arena")?.activity.title, "BT Comms Arena");
check("playing status kind is game", activityFromStatus("Playing BT Comms Arena")?.activity.kind, "game");
check("playing label", activityFromStatus("Playing BT Comms Arena")?.label, "Playing a Game");
check("colon form parses", activityFromStatus("Playing: Arena")?.activity.title, "Arena");
check("listening status is music", activityFromStatus("Listening to Lo-fi Beats")?.activity.kind, "music");
check("spotify prefix parses", activityFromStatus("Spotify · playlist")?.activity.kind, "music");
check("editing status is code", activityFromStatus("Editing bt-comms/app")?.activity.kind, "code");
check("watching status is custom", activityFromStatus("Watching a film")?.activity.kind, "custom");
// A bare "Playing" is a status, not an activity — no card should appear.
check("bare keyword yields nothing", activityFromStatus("Playing"), null);
check("plain status yields no activity", activityFromStatus("Working from home"), null);
check("empty status yields nothing", activityFromStatus(""), null);
check("null status yields nothing", activityFromStatus(null), null);
check("activity labels cover every kind", ["game", "music", "code", "voice", "custom"].map(activityLabel).join("|"),
  "Playing a Game|Listening to Spotify|Editing Code|In Voice|Watching Something");

/* --------------------- no fabricated production activity -------------------- */

import { readFileSync } from "node:fs";
const commsSrc = readFileSync(new URL("./../components/comms-app.tsx", import.meta.url), "utf8");

// Regression guard. Production used to hand the first three online friends a
// hardcoded activity by list position, so real profiles showed "Playing a Game
// — Ranked · 2 of 5" that the user never set.
check(
  "production does not fabricate activities by list position",
  /titles\[index % titles\.length\]/.test(commsSrc),
  false,
);
check(
  "production derives activities from custom_status",
  /activities[\s\S]{0,400}activityFromStatus\(friend\.profile\.custom_status\)/.test(commsSrc),
  true,
);
check(
  "production reads the real status start time",
  commsSrc.includes("custom_status_started_at"),
  true,
);
// The elapsed clock must never be seeded from a made-up offset again.
check(
  "no fabricated 42-minute activity anchor",
  /Date\.now\(\) - 42 \* 60 \* 1000/.test(commsSrc),
  false,
);

check("accounts list has one active account", demoStore.accounts.filter((a) => a.active).length, 1);

console.log(failures === 0 ? "\nAll demo-store checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
