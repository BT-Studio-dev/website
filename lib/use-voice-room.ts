"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  PeerLink,
  captureScreen,
  framesLookFrozen,
  rtcSupported,
  looksLikeSelfCapture,
  signalFits,
  type RemoteStreams,
} from "@/lib/webrtc";

/**
 * Wires a voice channel to a real peer connection mesh.
 *
 * Supabase realtime is the signalling bus: joining a room opens a broadcast
 * channel named after the voice channel id, announces presence so peers know
 * who to call, and exchanges offers/answers/ICE inside that topic.
 *
 * Everything degrades honestly. If the browser has no WebRTC, or getUserMedia
 * is denied, the room still works as a presence list and `error` explains what
 * is missing — the UI never pretends a call is happening.
 */

export type VoiceRoomState = {
  micTrack: MediaStreamTrack | null;
  micDenied: boolean;
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  /** user_id of whoever is sharing, as far as this client can tell. */
  screenOwnerId: string | null;
  screenHint: string | null;
  remoteVideo: { userId: string; stream: MediaStream } | null;
  peers: string[];
  error: string | null;
};

const EMPTY: VoiceRoomState = {
  micTrack: null,
  micDenied: false,
  cameraStream: null,
  screenStream: null,
  screenOwnerId: null,
  screenHint: null,
  remoteVideo: null,
  peers: [],
  error: null,
};

export function useVoiceRoom({
  supabase,
  channelId,
  selfId,
}: {
  supabase: SupabaseClient | null;
  /** The voice channel currently joined, or null when disconnected. */
  channelId: string | null;
  selfId: string;
}) {
  const [state, setState] = useState<VoiceRoomState>(EMPTY);

  const roomRef = useRef<RealtimeChannel | null>(null);
  const linksRef = useRef(new Map<string, PeerLink>());
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const selfRef = useRef(selfId);
  selfRef.current = selfId;

  /* ------------------------------- teardown ------------------------------ */

  const teardown = useCallback(() => {
    for (const link of linksRef.current.values()) link.close();
    linksRef.current.clear();

    for (const stream of [micStreamRef.current, camStreamRef.current, screenStreamRef.current]) {
      stream?.getTracks().forEach((track) => track.stop());
    }
    micStreamRef.current = null;
    camStreamRef.current = null;
    screenStreamRef.current = null;

    if (roomRef.current && supabase) {
      void supabase.removeChannel(roomRef.current);
      roomRef.current = null;
    }

    setState(EMPTY);
  }, [supabase]);

  /* ------------------------------ signalling ----------------------------- */

  const send = useCallback((peerId: string, signal: unknown) => {
    const room = roomRef.current;
    if (!room) return;
    if (!signalFits(signal as never)) return;
    void room.send({
      type: "broadcast",
      event: "signal",
      payload: { from: selfRef.current, to: peerId, signal },
    });
  }, []);

  const linkFor = useCallback(
    (peerId: string): PeerLink => {
      const existing = linksRef.current.get(peerId);
      if (existing) return existing;

      const link = new PeerLink((signal) => send(peerId, signal));
      link.seed(
        micStreamRef.current?.getAudioTracks()[0] ?? null,
        micStreamRef.current,
        camStreamRef.current?.getVideoTracks()[0] ?? screenStreamRef.current?.getVideoTracks()[0] ?? null,
        camStreamRef.current ?? screenStreamRef.current,
      );
      link.onStreams = (streams: RemoteStreams) => {
        const video = streams.video?.getVideoTracks()[0];
        if (video) {
          setState((prev) => ({
            ...prev,
            screenOwnerId: peerId,
            remoteVideo: { userId: peerId, stream: streams.video! },
          }));
        }
      };
      link.onState = (connection) => {
        if (connection === "failed" || connection === "closed") {
          linksRef.current.delete(peerId);
          setState((prev) => ({
            ...prev,
            peers: prev.peers.filter((id) => id !== peerId),
            remoteVideo: prev.remoteVideo?.userId === peerId ? null : prev.remoteVideo,
            screenOwnerId: prev.screenOwnerId === peerId ? null : prev.screenOwnerId,
          }));
        }
      };

      linksRef.current.set(peerId, link);
      return link;
    },
    [send],
  );

  /* ------------------------------- lifecycle ----------------------------- */

  useEffect(() => {
    if (!supabase || !channelId) {
      teardown();
      return;
    }

    let cancelled = false;
    const links = linksRef.current;

    (async () => {
      if (!rtcSupported()) {
        setState((prev) => ({
          ...prev,
          error: "This browser doesn't support WebRTC, so voice audio is unavailable.",
        }));
        return;
      }

      // 1. Microphone. A denial is recoverable: you can still listen and share.
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false,
        });
        if (cancelled) {
          mic.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = mic;
        setState((prev) => ({ ...prev, micTrack: mic.getAudioTracks()[0] ?? null }));
        // Peers created before the mic arrived (rare, but possible on a remount)
        // need the track swapped in; new links pick it up in `seed`.
        for (const link of linksRef.current.values()) {
          link.setMic(mic.getAudioTracks()[0] ?? null);
        }
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, micDenied: true }));
      }

      if (cancelled) return;

      // 2. Signalling room. `self: false` keeps our own broadcasts out of our
      //    own handler — critical, otherwise we would answer our own offers.
      const room = supabase.channel(`voice:${channelId}`, {
        config: { broadcast: { self: false } },
      });
      roomRef.current = room;

      room.on("broadcast", { event: "signal" }, ({ payload }) => {
        const { from, to, signal } = payload as {
          from: string;
          to: string;
          signal: { kind: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
        };
        if (to !== selfRef.current || from === selfRef.current) return;

        const link = linkFor(from);
        switch (signal.kind) {
          case "offer":
            if (signal.sdp) void link.accept(signal.sdp);
            break;
          case "answer":
            if (signal.sdp) void link.finish(signal.sdp);
            break;
          case "candidate":
            if (signal.candidate) void link.addCandidate(signal.candidate);
            break;
          case "bye":
            link.close();
            links.delete(from);
            setState((prev) => ({
              ...prev,
              peers: prev.peers.filter((id) => id !== from),
              remoteVideo: prev.remoteVideo?.userId === from ? null : prev.remoteVideo,
              screenOwnerId: prev.screenOwnerId === from ? null : prev.screenOwnerId,
            }));
            break;
          default:
            break;
        }
      });

      // 3. Presence tells us who is in the room without needing a roster query.
      room.on("presence", { event: "sync" }, () => {
        // Keys of presenceState() are per-connection refs, NOT user ids — the
        // identity lives in the tracked payload, so that is what we read.
        const otherIds = new Set<string>();
        for (const metas of Object.values(room.presenceState() ?? {})) {
          for (const meta of metas as { user_id?: string }[]) {
            const userId = meta.user_id;
            if (userId && userId !== selfRef.current) otherIds.add(userId);
          }
        }
        setState((prev) => ({ ...prev, peers: [...otherIds] }));

        // Lower id offers, higher id waits — no glare.
        for (const peerId of otherIds) {
          if (linksRef.current.has(peerId)) continue;
          if (selfRef.current < peerId) {
            const link = linkFor(peerId);
            void link.offer();
          }
        }
        for (const peerId of [...linksRef.current.keys()]) {
          if (!otherIds.has(peerId)) {
            linksRef.current.get(peerId)?.close();
            linksRef.current.delete(peerId);
          }
        }
      });

      room.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void room.track({ user_id: selfRef.current });
        }
      });
    })();

    return () => {
      cancelled = true;
      for (const link of links.values()) link.close();
      links.clear();
      for (const stream of [micStreamRef.current, camStreamRef.current, screenStreamRef.current]) {
        stream?.getTracks().forEach((track) => track.stop());
      }
      micStreamRef.current = null;
      camStreamRef.current = null;
      screenStreamRef.current = null;
      if (roomRef.current && supabase) {
        void supabase.removeChannel(roomRef.current);
        roomRef.current = null;
      }
      setState(EMPTY);
    };
    // `linkFor`/`send` are stable; re-running on channel change is the point.
  }, [supabase, channelId, linkFor, send, teardown]);

  /* -------------------------------- actions ------------------------------ */

  const startScreen = useCallback(async () => {
    try {
      const capture = await captureScreen();
      screenStreamRef.current = capture.stream;

      // Two independent hints that we're looking at ourselves: the label, and a
      // frozen first frame (a recursive mirror of an idle page barely changes).
      const labelSaysSelf = capture.selfMirror || looksLikeSelfCapture(capture.track);
      const frozen = labelSaysSelf ? false : await framesLookFrozen(capture.stream);
      const selfMirror = labelSaysSelf || frozen;

      setState((prev) => ({
        ...prev,
        screenStream: capture.stream,
        screenOwnerId: selfRef.current,
        screenHint: selfMirror
          ? "You are sharing this window/tab. Switch to an application window to avoid mirroring."
          : null,
      }));

      for (const link of linksRef.current.values()) link.setVideo(capture.track);

      // The user can stop from the browser's own share bar.
      capture.track.addEventListener("ended", () => {
        screenStreamRef.current = null;
        for (const link of linksRef.current.values()) link.setVideo(null);
        setState((prev) => ({
          ...prev,
          screenStream: null,
          screenOwnerId: prev.screenOwnerId === selfRef.current ? null : prev.screenOwnerId,
          screenHint: null,
        }));
      });

      return { ok: true as const, label: capture.label };
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Screen share was cancelled."
          : error instanceof Error
            ? error.message
            : "Couldn't start screen sharing.";
      return { ok: false as const, message };
    }
  }, []);

  const stopScreen = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    for (const link of linksRef.current.values()) link.setVideo(null);
    setState((prev) => ({
      ...prev,
      screenStream: null,
      screenOwnerId: prev.screenOwnerId === selfRef.current ? null : prev.screenOwnerId,
      screenHint: null,
    }));
  }, []);

  const toggleCamera = useCallback(async () => {
    if (camStreamRef.current) {
      camStreamRef.current.getTracks().forEach((track) => track.stop());
      camStreamRef.current = null;
      setState((prev) => ({ ...prev, cameraStream: null }));
      for (const link of linksRef.current.values()) link.setVideo(screenStreamRef.current?.getVideoTracks()[0] ?? null);
      return { ok: true as const, on: false };
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      camStreamRef.current = stream;
      setState((prev) => ({ ...prev, cameraStream: stream }));
      // A live screen share outranks the camera for the one video slot we keep.
      if (!screenStreamRef.current) {
        const track = stream.getVideoTracks()[0] ?? null;
        for (const link of linksRef.current.values()) link.setVideo(track);
      }
      return { ok: true as const, on: true };
    } catch {
      return { ok: false as const, message: "Camera access was blocked by the browser." };
    }
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    const track = micStreamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !muted;
  }, []);

  return { ...state, startScreen, stopScreen, toggleCamera, setMuted, teardown };
}
