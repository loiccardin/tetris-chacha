// Web Audio "8-bit" synth: Tetris theme A (Korobeiniki, trad. public domain)
// plus SFX for lock, line clears and game over.

type Note = [number, number]; // [frequency Hz, duration beats]

const REST = 0;

// Korobeiniki — two bars repeated. Key of A minor. 144 BPM.
// Durations: 1 = quarter, 0.5 = eighth, 0.25 = sixteenth
const MELODY: Note[] = [
  [659.25, 1], [493.88, 0.5], [523.25, 0.5],
  [587.33, 1], [523.25, 0.5], [493.88, 0.5],
  [440, 1], [440, 0.5], [523.25, 0.5],
  [659.25, 1], [587.33, 0.5], [523.25, 0.5],
  [493.88, 1.5], [523.25, 0.5],
  [587.33, 1], [659.25, 1],
  [523.25, 1], [440, 1],
  [440, 2],

  [587.33, 1.5], [698.46, 0.5],
  [880, 1], [783.99, 0.5], [698.46, 0.5],
  [659.25, 1.5], [523.25, 0.5],
  [659.25, 1], [587.33, 0.5], [523.25, 0.5],
  [493.88, 1], [493.88, 0.5], [523.25, 0.5],
  [587.33, 1], [659.25, 1],
  [523.25, 1], [440, 1],
  [440, 2],
];

const BPM = 132;
const SEC_PER_BEAT = 60 / BPM;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicStartTime = 0;
  private musicScheduledUntil = 0;
  private musicIndex = 0;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private _muted = false;
  private _musicOn = true;

  get muted() {
    return this._muted;
  }

  ensureCtx() {
    if (this.ctx) return;
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this._muted ? 0 : 0.35;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this._musicOn ? 0.12 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
  }

  async resume() {
    this.ensureCtx();
    if (this.ctx && this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {}
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  toggleMute() {
    this.setMuted(!this._muted);
    return this._muted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    destination: GainNode,
    when?: number,
  ) {
    if (!this.ctx) return;
    const start = when ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, start + duration);
    osc.connect(g);
    g.connect(destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  playLock() {
    if (!this.ctx || !this.sfxGain) return;
    this.playTone(110, 0.08, "square", 0.25, this.sfxGain);
  }

  playMove() {
    if (!this.ctx || !this.sfxGain) return;
    this.playTone(320, 0.025, "square", 0.1, this.sfxGain);
  }

  playRotate() {
    if (!this.ctx || !this.sfxGain) return;
    this.playTone(520, 0.04, "square", 0.12, this.sfxGain);
  }

  playClear(lineCount: number) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const notes =
      lineCount === 4
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
        : lineCount === 3
          ? [523.25, 659.25, 783.99, 987.77]
          : lineCount === 2
            ? [523.25, 659.25, 783.99]
            : [659.25, 880];
    notes.forEach((f, i) => {
      this.playTone(f, 0.1, "square", 0.2, this.sfxGain!, now + i * 0.06);
    });
  }

  playLevelUp() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playTone(f, 0.16, "square", 0.22, this.sfxGain!, now + i * 0.08);
    });
  }

  playGameOver() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [523.25, 440, 349.23, 261.63, 220, 174.61].forEach((f, i) => {
      this.playTone(f, 0.22, "triangle", 0.25, this.sfxGain!, now + i * 0.18);
    });
  }

  private scheduleAhead() {
    if (!this.ctx || !this.musicGain) return;
    const lookahead = 0.2;
    while (this.musicScheduledUntil < this.ctx.currentTime + lookahead) {
      const note = MELODY[this.musicIndex % MELODY.length];
      const [freq, beats] = note;
      const duration = beats * SEC_PER_BEAT;
      if (freq !== REST) {
        this.playTone(
          freq,
          duration * 0.92,
          "square",
          0.18,
          this.musicGain,
          this.musicScheduledUntil,
        );
      }
      this.musicScheduledUntil += duration;
      this.musicIndex += 1;
    }
  }

  startMusic() {
    this.ensureCtx();
    if (!this.ctx) return;
    this._musicOn = true;
    if (this.musicGain) this.musicGain.gain.value = 0.12;
    if (this.scheduler) return;
    this.musicStartTime = this.ctx.currentTime;
    this.musicScheduledUntil = this.ctx.currentTime + 0.05;
    this.musicIndex = 0;
    this.scheduleAhead();
    this.scheduler = setInterval(() => this.scheduleAhead(), 80);
  }

  stopMusic() {
    this._musicOn = false;
    if (this.musicGain) this.musicGain.gain.value = 0;
    if (this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
  }

  toggleMusic() {
    if (this._musicOn) this.stopMusic();
    else this.startMusic();
    return this._musicOn;
  }

  get musicOn() {
    return this._musicOn;
  }
}

let singleton: AudioEngine | null = null;
export function getAudio(): AudioEngine {
  if (!singleton) singleton = new AudioEngine();
  return singleton;
}
