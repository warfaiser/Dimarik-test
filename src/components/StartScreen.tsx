import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  ListChecks,
  MousePointerClick,
  Timer,
  Hourglass,
  Volume2,
  VolumeX,
  FileAudio,
  Headphones,
  Check,
  X,
  Flame,
  Gem,
  Info,
  Music,
} from "lucide-react";
import { RANKS } from "../data/ranks";
import { sound, SOUND_LABELS } from "../lib/sounds";
import { music, useMusicState } from "../lib/music";
import Starfield from "./Starfield";

type Tab = "rules" | "ranks" | "sound";

const TABS: { id: Tab; label: string; icon: typeof Info }[] = [
  { id: "rules", label: "Правила", icon: ListChecks },
  { id: "ranks", label: "Ранги", icon: Gem },
  { id: "sound", label: "Звук", icon: Headphones },
];

const RULES = [
  {
    icon: ListChecks,
    title: "30 вопросов",
    text: "По всей Саге Бесконечности — от «Железного человека» до «Финала». У каждого вопроса 4 варианта: А–Г.",
  },
  {
    icon: MousePointerClick,
    title: "Выбор ≠ ответ",
    text: "Сначала выбери вариант, затем нажми «Подтвердить ответ». Случайный клик ничего не решит.",
  },
  {
    icon: Timer,
    title: "Таймер",
    text: "Вопросы 1–15 — по 10 секунд. Вопросы 16–30 — уже по 15 секунд, но и сложнее.",
  },
  {
    icon: Hourglass,
    title: "Время вышло?",
    text: "Если вариант выбран — он засчитается автоматически. Если нет — ответ считается неверным.",
  },
  {
    icon: Volume2,
    title: "Звуки",
    text: "Верные и неверные ответы озвучиваются разными звуками — по три варианта, играют по очереди.",
  },
];

export default function StartScreen({
  onStart,
  muted,
  onToggleMute,
}: {
  onStart: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [tab, setTab] = useState<Tab>("rules");
  const [files, setFiles] = useState<{ url: string; label: string; ok: boolean }[] | null>(null);
  const { available: musicAvailable } = useMusicState();

  useEffect(() => {
    sound.probe().then((map) => {
      setFiles(SOUND_LABELS.map((s) => ({ url: s.url, label: s.label, ok: map.get(s.url) === true })));
    });
    void music.probe();
  }, []);

  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
      transition={{ duration: 0.6, ease }}
      className="relative min-h-dvh overflow-hidden"
    >
      {/* background */}
      <img
        src="images/hero-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#06060b] via-[#06060b]/82 to-[#06060b]/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06060b] via-transparent to-[#06060b]/70" />
      <Starfield density={110} />
      <div className="halftone absolute inset-x-0 bottom-0 h-56 opacity-50 [mask-image:linear-gradient(to_top,black,transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 md:px-10">
        {/* top bar */}
        <header className="flex items-center justify-between py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/50">
              <span className="font-display text-lg text-white">M</span>
            </div>
            <div className="leading-none">
              <p className="font-display text-[13px] tracking-[0.28em] text-white/90 uppercase">Marvel&nbsp;Quiz</p>
              <p className="mt-1 text-[10px] tracking-[0.24em] text-white/35 uppercase">Сага бесконечности</p>
            </div>
          </div>
          <button
            onClick={onToggleMute}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:text-white"
            aria-label="Звук"
          >
            {muted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
          </button>
        </header>

        {/* hero + tabs */}
        <div className="grid flex-1 items-center gap-10 pb-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease }}
              className="inline-flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.28em] text-red-300 uppercase"
            >
              <Flame className="h-3.5 w-3.5" />
              Киновселенная Marvel · 30 вопросов
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 34 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease }}
              className="font-display mt-6 text-[13vw] leading-[0.98] tracking-wide text-white uppercase sm:text-6xl lg:text-[4.6rem]"
            >
              Насколько
              <br />
              ты знаешь
              <br />
              <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
                вселенную
              </span>
              <span className="text-white/25">?</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.7, ease }}
              className="mt-6 max-w-md text-[15px] leading-relaxed text-white/55"
            >
              Две фазы, таймер на каждый вопрос, кнопка подтверждения против случайных кликов и пять рангов — от
              Смешарика до Пейнкиллера. Мстители собираются. Ты с нами?
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.7, ease }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <button
                onClick={() => {
                  sound.playClick();
                  onStart();
                }}
                className="btn-shine group relative inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 font-display text-sm tracking-[0.22em] text-white uppercase shadow-[0_18px_50px_-12px_rgba(230,36,41,0.65)] transition-transform duration-300 hover:scale-[1.04] active:scale-95"
              >
                <Play className="h-4 w-4 fill-current transition-transform duration-300 group-hover:translate-x-0.5" />
                Начать тест
              </button>
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-white/40 uppercase">
                <Timer className="h-4 w-4 text-amber-300" />
                10–15 сек / вопрос
              </div>
            </motion.div>
          </div>

          {/* right: tabs */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.8, ease }}
            className="glass w-full rounded-3xl p-5 shadow-2xl shadow-black/40 md:p-6"
          >
            {/* tab header */}
            <div className="relative flex gap-1 rounded-2xl border border-white/8 bg-black/30 p-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      sound.playClick();
                    }}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold tracking-wide transition-colors duration-300 ${
                      active ? "text-white" : "text-white/45 hover:text-white/75"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/14 to-white/6 ring-1 ring-white/15"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon className="relative z-10 h-4 w-4" />
                    <span className="relative z-10 hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* tab body */}
            <div className="scroll-slim mt-4 h-[380px] overflow-y-auto pr-1 md:h-[420px]">
              <AnimatePresence mode="wait">
                {tab === "rules" && (
                  <motion.div
                    key="rules"
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -22 }}
                    transition={{ duration: 0.35, ease }}
                    className="space-y-2.5"
                  >
                    {RULES.map((r, i) => {
                      const Icon = r.icon;
                      return (
                        <div
                          key={i}
                          className="flex gap-4 rounded-2xl border border-white/7 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300 ring-1 ring-amber-300/20">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{r.title}</p>
                            <p className="mt-1 text-[13px] leading-relaxed text-white/50">{r.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {tab === "ranks" && (
                  <motion.div
                    key="ranks"
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -22 }}
                    transition={{ duration: 0.35, ease }}
                    className="space-y-2.5"
                  >
                    {RANKS.map((r, i) => {
                      const Icon = r.icon;
                      return (
                        <div
                          key={i}
                          className="group relative flex items-start gap-4 overflow-hidden rounded-2xl border border-white/7 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05]"
                        >
                          <div
                            className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${r.gradient} opacity-70`}
                          />
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${r.gradient} text-white shadow-lg ${r.glow}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-sm tracking-wide text-white">{r.title}</p>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${r.chip}`}
                              >
                                {r.min}–{r.max}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-white/50">{r.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}

                {tab === "sound" && (
                  <motion.div
                    key="sound"
                    initial={{ opacity: 0, x: 22 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -22 }}
                    transition={{ duration: 0.35, ease }}
                    className="space-y-2.5"
                  >
                    <div className="rounded-2xl border border-sky-400/15 bg-sky-500/[0.06] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-sky-200">
                        <Headphones className="h-4 w-4" /> Свои звуки
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                        Положи mp3 в папку <span className="font-mono text-white/75">public/sounds/</span> — сайт
                        подхватит их автоматически. Если файла нет, играет встроенный синтезатор.
                      </p>
                    </div>

                    {files?.map((f) => (
                      <div
                        key={f.url}
                        className="flex items-center gap-3 rounded-xl border border-white/7 bg-white/[0.03] px-4 py-3"
                      >
                        <FileAudio className="h-4 w-4 shrink-0 text-white/40" />
                        <span className="min-w-0 flex-1 truncate text-xs text-white/70">
                          <span className="font-mono text-white/90">{f.url.split("/").pop()}</span>
                          <span className="text-white/35"> · {f.label}</span>
                        </span>
                        {f.ok ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <Check className="h-3 w-3" /> найден
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            <X className="h-3 w-3" /> синтез
                          </span>
                        )}
                      </div>
                    ))}

                    {/* фоновая музыка */}
                    <div className="flex items-center gap-3 rounded-xl border border-white/7 bg-white/[0.03] px-4 py-3">
                      <Music className="h-4 w-4 shrink-0 text-white/40" />
                      <span className="min-w-0 flex-1 truncate text-xs text-white/70">
                        <span className="font-mono text-white/90">music/portals.mp3</span>
                        <span className="text-white/35"> · Фоновая музыка — Portals («Мстители: Финал»)</span>
                      </span>
                      {musicAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <Check className="h-3 w-3" /> найден
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/45">
                          <Hourglass className="h-3 w-3" /> ждёт файл
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-white/35">
                      Положи mp3 в <span className="font-mono text-white/60">public/music/</span> — трек заиграет сам
                      после первого клика: на старте атмосферно, в квизе фоном, на результатах — торжественно.
                      Кнопка с эквалайзером — в правом нижнем углу.
                    </p>

                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => sound.play("correct")}
                        className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 py-3 text-xs font-bold tracking-wider text-emerald-300 uppercase transition hover:bg-emerald-500/20 active:scale-95"
                      >
                        Тест верного
                      </button>
                      <button
                        onClick={() => sound.play("wrong")}
                        className="rounded-xl border border-red-400/25 bg-red-500/10 py-3 text-xs font-bold tracking-wider text-red-300 uppercase transition hover:bg-red-500/20 active:scale-95"
                      >
                        Тест неверного
                      </button>
                    </div>
                    <p className="text-center text-[11px] text-white/30">
                      Каждый тест играет следующий звук из тройки — как и в игре
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="pb-6 text-center text-[10px] tracking-[0.3em] text-white/25 uppercase"
        >
          Клавиши 1–4 — выбор · Enter — подтверждение
        </motion.p>
      </div>
    </motion.main>
  );
}
