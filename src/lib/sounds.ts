"use client";

import { readPref } from "./hooks";

/** Per-device preference: which sound plays when a notification arrives. */
export const NOTIFY_SOUND_PREF = "notification-sound";

export type NotifySound = "chime" | "ding" | "pop" | "bell" | "none";

/** Each note: [frequency Hz, start offset s, duration s]. Synthesised, so there are no audio files to load. */
type Note = [number, number, number];
const SOUNDS: Record<Exclude<NotifySound, "none">, { label: string; wave: OscillatorType; gain: number; notes: Note[] }> = {
  chime: { label: "Chime", wave: "sine", gain: 0.22, notes: [[880, 0, 0.35], [1318.5, 0.12, 0.5]] },
  ding: { label: "Ding", wave: "triangle", gain: 0.25, notes: [[1568, 0, 0.6]] },
  pop: { label: "Pop", wave: "sine", gain: 0.3, notes: [[620, 0, 0.09], [930, 0.07, 0.12]] },
  bell: { label: "Bell", wave: "sine", gain: 0.18, notes: [[659.3, 0, 0.7], [987.8, 0, 0.7], [1318.5, 0.18, 0.8]] },
};

export const SOUND_OPTIONS: { value: NotifySound; label: string }[] = [
  ...(Object.keys(SOUNDS) as (keyof typeof SOUNDS)[]).map((value) => ({ value, label: SOUNDS[value].label })),
  { value: "none", label: "Off" },
];

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Browsers only allow sound after the person has interacted with the page.
 * Call once on mount: the first click or key press unlocks audio for the rest of the session.
 * Returns a cleanup that removes the listeners.
 */
export function unlockAudioOnGesture() {
  const stop = () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  const unlock = () => {
    audio();
    stop();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
  return stop;
}

export function playSound(sound: NotifySound) {
  if (sound === "none") return;
  const spec = SOUNDS[sound] ?? SOUNDS.chime;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + 0.01;
  for (const [freq, at, dur] of spec.notes) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = spec.wave;
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, t0 + at);
    env.gain.exponentialRampToValueAtTime(spec.gain, t0 + at + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(env).connect(ac.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.05);
  }
}

/** Play the sound this device picked for notifications. */
export function playNotificationSound() {
  playSound(readPref<NotifySound>(NOTIFY_SOUND_PREF, "chime"));
}
