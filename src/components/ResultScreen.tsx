import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Flame, Home, RotateCcw, Target, X, Sparkles } from "lucide-react";
import { LETTERS, QUESTIONS, rankFor } from "../data/questions";
import { RANKS } from "../data/ranks";
import { sound } from "../lib/sounds";
import Starfield from "./Starfield";
import Confetti from "./Confetti";

const EASE = [0.22, 1, 0.36, 1] as const;
const TOTAL = QUESTIONS.length;

function CountUp({ to, duration = 1.4 }: { to: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{v}</>;
}

export default function ResultScreen({
  answers,
  onRestart,
  onHome,
}: {
  answers: (number | null)[];
  onRestart: () => void;
  onHome: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const { score, wrongCount, bestStreak, wrongList, rank, rankIdx } = useMemo(() => {
    let sc = 0;
    let streak = 0;
    let best = 0;
    const wrong: { i: number; q: (typeof QUESTIONS)[number]; a: number | null }[] = [];
    QUESTIONS.forEach((q, i) => {
      const a = answers[i] ?? null;
      if (a === q.correct) {
        sc++;
        streak++;
        best = Math.max(best, streak);
      } else {
        streak = 0;
        wrong.push({ i, q, a });
      }
    });
    const ri = rankFor(sc);
    return { score: sc, wrongCount: TOTAL - sc, bestStreak: best, wrongList: wrong, rank: RANKS[ri], rankIdx: ri };
  }, [answers]);

  const accuracy = Math.round((score / TOTAL) * 100);
  const RankIcon = rank.icon;

  const R = 88;
  const C = 2 * Math.PI * R;

  const copyResult = () => {
    sound.playClick();
    void navigator.clipboard
      ?.writeText(`Мой результат в квизе Marvel: ${score}/30 — «${rank.title}». А ты сможешь лучше?`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative min-h-dvh overflow-hidden"
    >
      <img src="images/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.12]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06060b]/60 via-[#06060b]/85 to-[#06060b]" />
      <Starfield density={90} />
      <Confetti pieces={score >= 22 ? 190 : score >= 15 ? 120 : score >= 8 ? 70 : 35} />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-12 md:px-8 md:py-16">
        {/* header */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center text-[11px] font-semibold tracking-[0.5em] text-white/40 uppercase"
        >
          Тест пройден · твой результат
        </motion.p>

        {/* score ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.8, ease: EASE }}
          className="relative mx-auto mt-8 flex h-56 w-56 items-center justify-center"
        >
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
            <motion.circle
              cx="100"
              cy="100"
              r={R}
              fill="none"
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C * (1 - score / TOTAL) }}
              transition={{ duration: 1.6, delay: 0.3, ease: EASE }}
            />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#e62429" />
                <stop offset="55%" stopColor="#f6c555" />
                <stop offset="100%" stopColor="#fde68a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="text-center">
            <p className="font-display text-7xl leading-none text-white">
              <CountUp to={score} />
            </p>
            <p className="mt-1 text-sm font-semibold tracking-[0.3em] text-white/35 uppercase">из {TOTAL}</p>
          </div>
        </motion.div>

        {/* rank card */}
        <motion.div
          initial={{ opacity: 0, y: 34 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8, ease: EASE }}
          className="glass relative mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl p-7 text-center md:p-9"
        >
          <img
            src="images/artifact.jpg"
            alt=""
            className="pointer-events-none absolute -right-10 -bottom-16 w-64 opacity-25 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]"
          />
          <div
            className={`animate-floaty relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${rank.gradient} shadow-2xl ${rank.glow}`}
          >
            <RankIcon className="h-9 w-9 text-white" />
          </div>
          <p className="mt-6 text-[10px] font-bold tracking-[0.4em] text-white/40 uppercase">Твой ранг</p>
          <h2
            className={`font-display relative mt-2 bg-gradient-to-r bg-clip-text text-3xl tracking-wide text-transparent uppercase md:text-5xl ${rank.gradient}`}
          >
            {rank.title}
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/60 md:text-[15px]">
            {rank.desc}
          </p>
        </motion.div>

        {/* rank ladder */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.7, ease: EASE }}
          className="mx-auto mt-8 flex max-w-2xl flex-wrap items-stretch justify-center gap-2"
        >
          {RANKS.map((r, i) => {
            const Icon = r.icon;
            const active = i === rankIdx;
            return (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold transition-all duration-500 ${
                  active
                    ? `scale-110 border-transparent bg-gradient-to-r ${r.gradient} text-white shadow-lg ${r.glow}`
                    : "border-white/10 bg-white/[0.03] text-white/35"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {r.min}–{r.max}
              </div>
            );
          })}
        </motion.div>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.78, duration: 0.7, ease: EASE }}
          className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 md:grid-cols-4"
        >
          {[
            { icon: Check, label: "Верных", value: score, color: "text-emerald-400", bg: "bg-emerald-500/10 ring-emerald-400/20" },
            { icon: X, label: "Ошибок", value: wrongCount, color: "text-red-400", bg: "bg-red-500/10 ring-red-400/20" },
            { icon: Target, label: "Точность", value: `${accuracy}%`, color: "text-amber-300", bg: "bg-amber-400/10 ring-amber-300/20" },
            { icon: Flame, label: "Лучшая серия", value: bestStreak, color: "text-violet-300", bg: "bg-violet-500/10 ring-violet-400/20" },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="glass rounded-2xl p-4 text-center">
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${s.bg}`}>
                  <Icon className={`h-4.5 w-4.5 ${s.color}`} />
                </div>
                <p className="font-display mt-2.5 text-2xl text-white">{s.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold tracking-[0.2em] text-white/40 uppercase">{s.label}</p>
              </div>
            );
          })}
        </motion.div>

        {/* actions */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.7, ease: EASE }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            onClick={() => {
              sound.playClick();
              onRestart();
            }}
            className="btn-shine font-display inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-8 py-4 text-sm tracking-[0.2em] text-white uppercase shadow-[0_16px_45px_-12px_rgba(230,36,41,0.7)] transition-transform hover:scale-[1.04] active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            Ещё раз
          </button>
          <button
            onClick={copyResult}
            className="glass inline-flex items-center gap-2.5 rounded-2xl px-7 py-4 text-sm font-bold tracking-wider text-white/80 uppercase transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            {copied ? "Скопировано" : "Поделиться"}
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onHome();
            }}
            className="glass inline-flex items-center gap-2.5 rounded-2xl px-7 py-4 text-sm font-bold tracking-wider text-white/80 uppercase transition hover:bg-white/10 hover:text-white active:scale-95"
          >
            <Home className="h-4 w-4" />
            На главную
          </button>
        </motion.div>

        {/* mistakes breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.02, duration: 0.7, ease: EASE }}
          className="mx-auto mt-12 max-w-2xl"
        >
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <h3 className="font-display text-sm tracking-[0.3em] text-white/70 uppercase">
              {wrongList.length === 0 ? "Безупречная игра" : `Разбор ошибок · ${wrongList.length}`}
            </h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
          </div>

          {wrongList.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center text-sm text-white/60">
              Ни одной ошибки. Танос бы нервничал.
            </div>
          ) : (
            <div className="scroll-slim max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
              {wrongList.map(({ i, q, a }) => (
                <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold tracking-[0.25em] text-white/30 uppercase">
                    Вопрос {String(i + 1).padStart(2, "0")} · {q.tag}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-white/85">{q.q}</p>
                  <div className="mt-2.5 space-y-1 text-[13px]">
                    <p className="text-white/45">
                      Твой ответ:{" "}
                      <span className="font-semibold text-red-400">
                        {a === null ? "— время вышло —" : `${LETTERS[a]} · ${q.options[a]}`}
                      </span>
                    </p>
                    <p className="text-white/45">
                      Верно:{" "}
                      <span className="font-semibold text-emerald-300">
                        {LETTERS[q.correct]} · {q.options[q.correct]}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <p className="mt-12 pb-4 text-center text-[10px] tracking-[0.3em] text-white/20 uppercase">
          Marvel Quiz · Сага бесконечности ждёт повторного просмотра
        </p>
      </div>
    </motion.main>
  );
}
