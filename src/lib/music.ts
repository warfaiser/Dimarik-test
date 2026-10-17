import { useEffect, useReducer } from "react";

/**
 * Фоновая музыка квиза — «Portals» из фильма «Мстители: Финал».
 *
 * Чтобы музыка заиграла, положи свой mp3-файл сюда:
 *   public/music/portals.mp3
 *
 * Движок сам найдёт файл, запустит трек после первого клика
 * пользователя (требование браузеров) и будет плавно менять
 * громкость на разных экранах. Если файла нет — сайт работает
 * без фоновой музыки, кнопка покажет подсказку.
 */

const SRC_CANDIDATES = [
  "music/Portals.mp3",
  "public/music/Portals.mp3",
  "music/portals.mp3",
  "public/music/portals.mp3",
];

class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  private fadeIv: number | null = null;
  private listeners = new Set<() => void>();
  private wantPlay = false;
  private src = SRC_CANDIDATES[0];

  available: boolean | null = null; // null — ещё не проверяли
  playing = false;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  async probe(): Promise<boolean> {
    if (this.available !== null) {
      if (this.wantPlay && this.available) this.play();
      return this.available;
    }
    let found = false;
    for (const candidate of SRC_CANDIDATES) {
      try {
        const res = await fetch(candidate, { method: "HEAD" });
        const type = res.headers.get("content-type") || "";
        if (res.ok && !type.includes("text/html")) {
          this.src = candidate;
          found = true;
          break;
        }
      } catch {
        // пробуем следующий вариант
      }
    }
    this.available = found;
    if (this.available) this.prepare();
    this.emit();
    if (this.wantPlay && this.available) this.play();
    return this.available;
  }

  private prepare() {
    if (this.audio) return;
    this.audio = new Audio(this.src);
    this.audio.loop = true;
    this.audio.volume = 0;
    this.audio.preload = "auto";
    this.audio.addEventListener("error", () => {
      this.available = false;
      this.playing = false;
      this.emit();
    });
  }

  /** Автозапуск на первом клике пользователя. */
  requestPlay() {
    this.wantPlay = true;
    this.play();
  }

  play() {
    if (this.available === null) return; // ждём probe
    if (!this.available || !this.audio) {
      this.playing = false;
      this.emit();
      return;
    }
    const p = this.audio.play();
    if (p) {
      p.then(() => {
        this.playing = true;
        this.emit();
      }).catch(() => {
        this.playing = false;
        this.emit();
      });
    }
  }

  pause() {
    this.wantPlay = false;
    this.audio?.pause();
    this.playing = false;
    this.emit();
  }

  toggle() {
    if (this.playing) this.pause();
    else {
      this.wantPlay = true;
      this.play();
    }
  }

  /** Плавное изменение громкости (0..1). */
  fadeTo(target: number, ms = 900) {
    const a = this.audio;
    if (!a || !this.playing) return;
    if (this.fadeIv) clearInterval(this.fadeIv);
    const start = a.volume;
    const t0 = performance.now();
    this.fadeIv = window.setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.min(1, Math.max(0, start + (target - start) * p));
      if (p >= 1 && this.fadeIv) {
        clearInterval(this.fadeIv);
        this.fadeIv = null;
      }
    }, 40);
  }
}

export const music = new MusicEngine();

export function useMusicState() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => music.subscribe(force), []);
  return { available: music.available, playing: music.playing };
}
