// Quick logic test for the demo store, run with:
//   node --experimental-strip-types lib/demo.test.mjs
import { demoStore } from "./demo.ts";

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

console.log(failures === 0 ? "\nAll demo-store checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
