/**
 * Звуковой движок квиза.
 *
 * Чтобы использовать свои звуки, положи файлы в папку public/sounds/:
 *   wrong-1.mp3, wrong-2.mp3, wrong-3.mp3     — неверные ответы («звук 1, 2, 3»), играют по очереди
 *   correct-1.mp3, correct-2.mp3, correct-3.mp3 — верные ответы («звук 4, 5, 6»), играют по очереди
 *
 * Если файл не найден — движок синтезирует звук через Web Audio API,
 * поэтому сайт озвучен даже без файлов.
 */

export type SoundKind = "correct" | "wrong";

export const SOUND_FILES: Record<SoundKind, string[]> = {
  wrong: ["sounds/wrong-1.mp3", "sounds/wrong-2.mp3", "sounds/wrong-3.mp3"],
  correct: ["sounds/correct-1.mp3", "sounds/correct-2.mp3", "sounds/correct-3.mp3"],
};

export const SOUND_LABELS: { url: string; label: string; kind: SoundKind }[] = [
  ...SOUND_FILES.wrong.map((url, i) => ({ url, label: `Звук ${i + 1} — неверный ответ`, kind: "wrong" as SoundKind })),
  ...SOUND_FILES.correct.map((url, i) => ({ url, label: `Звук ${i + 4} — верный ответ`, kind: "correct" as SoundKind })),
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private rotation: Record<SoundKind, number> = { correct: 0, wrong: 0 };
  private availability = new Map<string, boolean>();
  private probed = false;
  private _muted = false;

  get muted() {
    return this._muted;
  }

  setMuted(v: boolean) {
    this._muted = v;
  }

  private ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Проверяет, какие пользовательские файлы реально существуют. */
  async probe(): Promise<Map<string, boolean>> {
    if (this.probed) return this.availability;
    this.probed = true;
    const all = [...SOUND_FILES.wrong, ...SOUND_FILES.correct];
    await Promise.all(
      all.map(async (url) => {
        try {
          const res = await fetch(url, { method: "HEAD" });
          const type = res.headers.get("content-type") || "";
          this.availability.set(url, res.ok && !type.includes("text/html"));
        } catch {
          this.availability.set(url, false);
        }
      })
    );
    return this.availability;
  }

  isCustomAvailable(url: string) {
    return this.availability.get(url) === true;
  }

  /** Главный вход: верный / неверный ответ. Играет следующий звук пула по кругу. */
  play(kind: SoundKind) {
    if (this._muted) return;
    const i = this.rotation[kind];
    this.rotation[kind] = (i + 1) % 3;
    const url = SOUND_FILES[kind][i];

    if (this.availability.get(url) === true) {
      const audio = new Audio(url);
      audio.volume = 0.85;
      audio.onerror = () => {
        this.availability.set(url, false);
        this.synth(kind, i);
      };
      audio.play().catch(() => this.synth(kind, i));
    } else {
      // файла нет (или ещё не проверен) — пробуем проиграть, иначе синтез
      const audio = new Audio(url);
      audio.volume = 0.85;
      let fellBack = false;
      audio.onerror = () => {
        this.availability.set(url, false);
        if (!fellBack) {
          fellBack = true;
          this.synth(kind, i);
        }
      };
      audio.play().catch(() => {
        if (!fellBack) {
          fellBack = true;
          this.synth(kind, i);
        }
      });
    }
  }

  /** Короткий клик интерфейса. */
  playClick() {
    if (this._muted) return;
    try {
      const ctx = this.ensureCtx();
      this.tone(ctx, { f: 1400, t: ctx.currentTime, d: 0.05, type: "square", g: 0.035 });
    } catch {
      /* ignore */
    }
  }

  /** Тик последних секунд таймера. */
  playTick() {
    if (this._muted) return;
    try {
      const ctx = this.ensureCtx();
      this.tone(ctx, { f: 950, t: ctx.currentTime, d: 0.07, type: "sine", g: 0.06 });
    } catch {
      /* ignore */
    }
  }

  private tone(
    ctx: AudioContext,
    o: { f: number; t: number; d: number; type?: OscillatorType; g?: number; slide?: number }
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.f, o.t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, o.t + o.d);
    gain.gain.setValueAtTime(0.0001, o.t);
    gain.gain.exponentialRampToValueAtTime(o.g ?? 0.16, o.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, o.t + o.d);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(o.t);
    osc.stop(o.t + o.d + 0.05);
  }

  /** Три разных синтезированных варианта на каждый тип — одинаковое поведение «по кругу». */
  private synth(kind: SoundKind, i: number) {
    try {
      const ctx = this.ensureCtx();
      const t = ctx.currentTime;
      if (kind === "correct") {
        if (i === 0) {
          // восходящее мажорное арпеджио
          [523.25, 659.25, 783.99].forEach((f, k) =>
            this.tone(ctx, { f, t: t + k * 0.09, d: 0.22, type: "sine", g: 0.15 })
          );
          this.tone(ctx, { f: 1046.5, t: t + 0.27, d: 0.4, type: "triangle", g: 0.14 });
        } else if (i === 1) {
          // звонкий колокольчик
          this.tone(ctx, { f: 440, t, d: 0.14, type: "triangle", g: 0.16 });
          this.tone(ctx, { f: 880, t: t + 0.1, d: 0.34, type: "triangle", g: 0.14 });
          this.tone(ctx, { f: 1760, t: t + 0.22, d: 0.25, type: "sine", g: 0.06 });
        } else {
          // быстрый «левел-ап»
          this.tone(ctx, { f: 660, t, d: 0.08, type: "square", g: 0.07 });
          this.tone(ctx, { f: 660, t: t + 0.08, d: 0.08, type: "square", g: 0.07 });
          this.tone(ctx, { f: 990, t: t + 0.16, d: 0.3, type: "square", g: 0.08 });
          this.tone(ctx, { f: 1320, t: t + 0.16, d: 0.3, type: "sine", g: 0.05 });
        }
      } else {
        if (i === 0) {
          // низкий скользящий buzz
          this.tone(ctx, { f: 190, t, d: 0.42, type: "sawtooth", g: 0.13, slide: 88 });
          this.tone(ctx, { f: 95, t: t + 0.05, d: 0.36, type: "sawtooth", g: 0.1, slide: 70 });
        } else if (i === 1) {
          // двойной гудок ошибки
          this.tone(ctx, { f: 150, t, d: 0.13, type: "square", g: 0.1 });
          this.tone(ctx, { f: 150, t: t + 0.19, d: 0.22, type: "square", g: 0.1 });
        } else {
          // грустное нисходящее скольжение
          this.tone(ctx, { f: 330, t, d: 0.16, type: "triangle", g: 0.13 });
          this.tone(ctx, { f: 311, t: t + 0.14, d: 0.16, type: "triangle", g: 0.12 });
          this.tone(ctx, { f: 233, t: t + 0.28, d: 0.4, type: "triangle", g: 0.12, slide: 175 });
        }
      }
    } catch {
      /* ignore */
    }
  }
}

export const sound = new SoundEngine();
