"use client";

/**
 * Efek suara notifikasi — disintesis dengan Web Audio (tanpa file audio, ~0 KB).
 * Nada lembut ala marimba: sine + sedikit overtone, attack cepat, decay eksponensial.
 * Browser baru mengizinkan audio setelah interaksi pertama → `unlockSfx()` dipasang sekali di provider.
 */

export type Sfx = "chime" | "success" | "alert" | "soft";

const KEY = "relay-sfx";
let ctx: AudioContext | null = null;
const listeners = new Set<() => void>();

export function sfxEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setSfxEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  listeners.forEach((l) => l());
}
export const subscribeSfx = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

/** Pasang sekali: membuka kunci audio di gestur pertama (kebijakan autoplay browser). */
export function unlockSfx() {
  const unlock = () => {
    const a = audio();
    if (a && a.state === "suspended") a.resume().catch(() => {});
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

function note(a: AudioContext, out: AudioNode, freq: number, start: number, dur: number, gain: number) {
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  g.connect(out);
  // nada dasar + overtone oktaf (lebih "bening" dari sine murni)
  for (const [mult, level, type] of [
    [1, 1, "sine"],
    [2, 0.18, "sine"],
    [3, 0.05, "triangle"],
  ] as const) {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq * mult, start);
    og.gain.value = level;
    o.connect(og).connect(g);
    o.start(start);
    o.stop(start + dur + 0.02);
  }
}

const PATTERNS: Record<Sfx, { f: number; t: number; d: number; g?: number }[]> = {
  /** task baru / umum: dua nada naik */
  chime: [
    { f: 659.25, t: 0, d: 0.35 },
    { f: 987.77, t: 0.09, d: 0.55 },
  ],
  /** disetujui: arpeggio mayor */
  success: [
    { f: 523.25, t: 0, d: 0.3 },
    { f: 659.25, t: 0.07, d: 0.3 },
    { f: 783.99, t: 0.14, d: 0.3 },
    { f: 1046.5, t: 0.21, d: 0.6 },
  ],
  /** revisi / overdue / batal: dua nada turun, sedikit lebih tegas */
  alert: [
    { f: 880, t: 0, d: 0.28, g: 0.22 },
    { f: 622.25, t: 0.13, d: 0.5, g: 0.22 },
  ],
  /** info ringan */
  soft: [{ f: 1174.66, t: 0, d: 0.35, g: 0.12 }],
};

export function playSfx(kind: Sfx, force = false) {
  if (!force && !sfxEnabled()) return;
  const a = audio();
  if (!a) return;
  if (a.state === "suspended") a.resume().catch(() => {});
  const master = a.createGain();
  master.gain.value = 0.9;
  master.connect(a.destination);
  const t0 = a.currentTime + 0.01;
  for (const p of PATTERNS[kind]) note(a, master, p.f, t0 + p.t, p.d, p.g ?? 0.16);
}
