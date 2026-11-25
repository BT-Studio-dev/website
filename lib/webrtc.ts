"use client";

/**
 * Minimal peer-to-peer mesh for BT Comms voice channels.
 *
 * The app has no signalling server of its own, so the existing Supabase
 * realtime channel doubles as one: every voice room is a broadcast topic where
 * peers announce themselves, exchange SDP offers/answers and trickle ICE
 * candidates. `voice_states` stays the source of truth for *who is in the
 * room*; this module only carries the media.
 *
 * Topology is a full mesh — fine for the handful of people a channel holds.
 * The peer whose id sorts lower always creates the offer, which removes the
 * glare case where both sides offer at once.
 */

export type PeerSignal =
  | { kind: "offer"; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; sdp: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit }
  | { kind: "bye" };

export type RemoteStreams = {
  /** Microphone (and any audio track) from the remote peer. */
  audio?: MediaStream;
  /** Camera or screen-share video from the remote peer. */
  video?: MediaStream;
};

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Browser chunks are cut at ~1 MB; SDP plus candidates fits comfortably. */
const MAX_SIGNAL_BYTES = 12_000;

export function rtcSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.RTCPeerConnection === "function" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

function peerConnection(): RTCPeerConnection {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

/**
 * One connection to a single remote peer.
 *
 * Tracks are added *before* the first offer so the initial SDP already
 * advertises a slot for the microphone, the camera and the screen. Adding a
 * track later (turning the camera on mid-call) renegotiates instead, which the
 * caller triggers explicitly with `replaceTrack`.
 */
export class PeerLink {
  readonly pc: RTCPeerConnection;
  private readonly sendSignal: (signal: PeerSignal) => void;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private micSender?: RTCRtpSender;
  private videoSender?: RTCRtpSender;

  onStreams: (streams: RemoteStreams) => void = () => undefined;
  onState: (state: RTCPeerConnectionState) => void = () => undefined;

  constructor(sendSignal: (signal: PeerSignal) => void) {
    this.sendSignal = sendSignal;
    this.pc = peerConnection();

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ kind: "candidate", candidate: event.candidate.toJSON() });
      }
    };

    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      const hasVideo = stream.getVideoTracks().length > 0;
      this.onStreams(hasVideo ? { video: stream } : { audio: stream });
    };

    this.pc.onconnectionstatechange = () => this.onState(this.pc.connectionState);
  }

  /** Track senders created up-front so replaceTrack never needs a renegotiation. */
  seed(micTrack: MediaStreamTrack | null, micStream: MediaStream | null, videoTrack: MediaStreamTrack | null, videoStream: MediaStream | null) {
    this.micSender = this.pc.addTransceiver(micTrack ?? "audio", {
      direction: "sendrecv",
      streams: micStream ? [micStream] : [],
    }).sender;
    this.videoSender = this.pc.addTransceiver(videoTrack ?? "video", {
      direction: "sendrecv",
      streams: videoStream ? [videoStream] : [],
    }).sender;
    if (!micTrack) void this.micSender.replaceTrack(null).catch(() => undefined);
    if (!videoTrack) void this.videoSender.replaceTrack(null).catch(() => undefined);
  }

  setMic(track: MediaStreamTrack | null) {
    void this.micSender?.replaceTrack(track).catch(() => undefined);
  }

  setVideo(track: MediaStreamTrack | null) {
    void this.videoSender?.replaceTrack(track).catch(() => undefined);
  }

  async offer() {
    const description = await this.pc.createOffer();
    await this.pc.setLocalDescription(description);
    this.sendSignal({ kind: "offer", sdp: description });
  }

  async accept(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.flushCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.sendSignal({ kind: "answer", sdp: answer });
  }

  async finish(sdp: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.flushCandidates();
  }

  async addCandidate(candidate: RTCIceCandidateInit) {
    if (!this.remoteDescSet) {
      this.pendingCandidates.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate).catch(() => undefined);
  }

  private async flushCandidates() {
    const queued = this.pendingCandidates;
    this.pendingCandidates = [];
    for (const candidate of queued) {
      await this.pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }

  close() {
    try {
      this.sendSignal({ kind: "bye" });
    } catch {
      /* the socket is already gone — nothing to announce */
    }
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
  }
}

export function signalFits(signal: PeerSignal): boolean {
  return JSON.stringify(signal).length <= MAX_SIGNAL_BYTES;
}

/* ------------------------------------------------------------------ */
/* Screen share                                                        */
/* ------------------------------------------------------------------ */

export type DisplayCapture = {
  stream: MediaStream;
  track: MediaStreamTrack;
  /** True when the user picked the tab/window running BT Comms itself. */
  selfMirror: boolean;
  label: string;
};

/**
 * Ask for a screen capture.
 *
 * `displaySurface: "window"` makes the browser default to a *window* tab in the
 * picker instead of jumping straight to the whole desktop, which is the cheapest
 * way to keep people from accidentally mirroring everything. We then inspect the
 * resulting track label to detect the "you picked your own tab" case.
 */
export async function captureScreen(): Promise<DisplayCapture> {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      // `displaySurface` is an advisory hint; Chrome honours it for the picker's
      // default selection and ignores it elsewhere.
      displaySurface: "window",
      frameRate: { ideal: 30, max: 30 },
      width: { ideal: 1920, max: 1920 },
      height: { ideal: 1080, max: 1080 },
    } as MediaTrackConstraints,
    audio: false,
    // Chrome-only: reduces the chance of capturing our own surface.
    ...({ selfBrowserSurface: "exclude", surfaceSwitching: "include" } as object),
  });

  const [track] = stream.getVideoTracks();
  if (!track) throw new Error("The browser returned no video track.");
  return { stream, track, selfMirror: looksLikeSelfCapture(track), label: track.label };
}

/** Words that appear in a *browser tab / window* capture label. */
const BROWSER_LABELS = ["tab", "chrome", "edge", "firefox", "safari", "brave", "opera", "chromium", "browser"];

/**
 * Best-effort detection of "the user is sharing the tab or window BT Comms is in".
 *
 * The web platform deliberately gives no API for "is this surface me?" — allowing
 * a page to identify its own capture would leak whether it is being recorded. So
 * we combine the three signals that are available:
 *
 *  1. The track label. Chrome labels tab captures with the tab title, and window
 *     captures with the window title, so a label containing our document title
 *     (or the product name) is the strongest hint.
 *  2. A browser-ish label with no `:window` marker means a *tab* was picked, and
 *     a tab can only be a browser tab — if the label then also lacks any other
 *     app name, the odds it is ours are high enough to warn.
 *  3. `framesLookFrozen` in the caller, which catches the recursion actually
 *     rendering even when the label says nothing useful.
 *
 * Callers treat this as advice: it shows a warning banner and blurs the local
 * preview. It never aborts a share the user asked for.
 */
export function looksLikeSelfCapture(track: MediaStreamTrack, title?: string): boolean {
  const label = track.label.toLowerCase();
  const pageTitle = (title ?? (typeof document !== "undefined" ? document.title : ""))
    .toLowerCase()
    .replace(/^\(\d+\)\s*/, "")
    .trim();

  if (pageTitle && pageTitle.length > 3 && label.includes(pageTitle)) return true;
  if (label.includes("bt comms") || label.includes("btcomms")) return true;

  // "Chrome Tab — BT Comms", "Firefox — Some page": a browser surface with no
  // other product name in it is most likely this app.
  const browserish = BROWSER_LABELS.some((needle) => label.includes(needle));
  if (browserish && !label.includes(":window") && !label.includes("music")) return true;

  return false;
}

/**
 * What the picker suggests first.
 *
 * `displaySurface: "window"` keeps the browser from defaulting to the whole
 * desktop, which is what produces the tunnel-of-mirrors when someone is
 * sharing their entire screen and looking at the call.
 */
export function displaySurfaceHint(): "window" | "browser" | "monitor" {
  return "window";
}

/**
 * Watch the first frames of a capture and report whether it looks like a
 * recursive mirror.
 *
 * A screen that contains itself collapses into a ring of nested copies, which
 * makes the sampled frames almost perfectly similar over time. A real app window
 * keeps changing. We compare two downscaled snapshots a moment apart; near-zero
 * difference while the tab is idle is only a hint, so this is used to *advise*,
 * never to block the share.
 */
export async function framesLookFrozen(stream: MediaStream, delayMs = 700): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch {
    return false;
  }

  const grab = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 18;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  };

  const first = grab();
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  const second = grab();
  video.pause();
  video.srcObject = null;

  if (!first || !second) return false;

  // A capture that is (almost) pure black carries no information either way:
  // the surface may simply not have painted its first frame yet, or the window
  // may be minimised. Treating that as "frozen" is what blurred a perfectly
  // good share into a black rectangle. Only call it frozen when there is
  // visible content that isn't changing.
  let luminance = 0;
  for (let i = 0; i < first.length; i += 4) {
    luminance += 0.2126 * first[i] + 0.7152 * first[i + 1] + 0.0722 * first[i + 2];
  }
  const meanLuminance = luminance / (first.length / 4);
  if (meanLuminance < 6) return false;

  let difference = 0;
  for (let i = 0; i < first.length; i += 4) {
    difference += Math.abs(first[i] - second[i]);
  }
  const average = difference / (first.length / 4);

  // Recursive mirroring shows up as *near*-zero drift. A busy window still
  // moves a little even when nothing is typed, so the bar stays low.
  return average < 0.15;
}
