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

console.log(failures === 0 ? "\nAll demo-store checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
