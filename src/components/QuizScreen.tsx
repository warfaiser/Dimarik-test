import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ShieldCheck, Volume2, VolumeX, X, Hourglass, Timer } from "lucide-react";
import { LETTERS, QUESTIONS } from "../data/questions";
import { sound } from "../lib/sounds";
import Starfield from "./Starfield";
import PhaseSplash from "./PhaseSplash";

type Stage = "splash" | "answering" | "revealed";

const TOTAL = QUESTIONS.length;
const EASE = [0.22, 1, 0.36, 1] as const;

function TimerRing({ frac, seconds, danger }: { frac: number; seconds: number; danger: boolean }) {
  const R = 23;
  const C = 2 * Math.PI * R;
  return (
    <div className={`relative h-16 w-16 shrink-0 ${danger ? "animate-pulse-ring rounded-full" : ""}`}>
      <svg viewBox="0 0 56 56" className="h-full w-full -rotate-90">
        <circle cx="28" cy="28" r={R} fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={R}
          fill="none"
          stroke={danger ? "#f87171" : "#f6c555"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.max(0, frac))}
          style={{ transition: "stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-display text-lg leading-none ${danger ? "text-red-400" : "text-white"}`}>
          {seconds}
        </span>
        <span className="text-[8px] font-bold tracking-widest text-white/35 uppercase">сек</span>
      </div>
    </div>
  );
}

export default function QuizScreen({
  onFinish,
  muted,
  onToggleMute,
}: {
  onFinish: (answers: (number | null)[]) => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [qIdx, setQIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("splash");
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null | undefined)[]>(Array(TOTAL).fill(undefined));
  const [timeLeft, setTimeLeft] = useState(10);
  const [reveal, setReveal] = useState<{ correct: boolean; timedOut: boolean } | null>(null);

  const stageRef = useRef(stage);
  const selectedRef = useRef(selected);
  const answersRef = useRef(answers);
  const qIdxRef = useRef(qIdx);
  stageRef.current = stage;
  selectedRef.current = selected;
  answersRef.current = answers;
  qIdxRef.current = qIdx;

  const pendingTimers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    pendingTimers.current.push(id);
  }, []);
  useEffect(() => () => pendingTimers.current.forEach(clearTimeout), []);

  const durationFor = (i: number) => (i < 15 ? 10 : 15);

  /* ---------- flow ---------- */
  const evaluate = useCallback(
    (pick: number | null, timedOut: boolean) => {
      if (stageRef.current !== "answering") return;
      const q = QUESTIONS[qIdxRef.current];
      const isCorrect = pick !== null && pick === q.correct;

      setAnswers((prev) => {
        const nextArr = [...prev];
        nextArr[qIdxRef.current] = pick;
        answersRef.current = nextArr;
        return nextArr;
      });
      setReveal({ correct: isCorrect, timedOut: timedOut && pick === null });
      sound.play(isCorrect ? "correct" : "wrong");
      setStage("revealed");

      later(() => {
        const next = qIdxRef.current + 1;
        if (next >= TOTAL) {
          onFinish(answersRef.current.map((a) => (a === undefined ? null : a)) as (number | null)[]);
          return;
        }
        setQIdx(next);
        setSelected(null);
        setReveal(null);
        if (next === 15) {
          setStage("splash");
        } else {
          setTimeLeft(durationFor(next));
          setStage("answering");
        }
      }, 2500);
    },
    [later, onFinish]
  );
  const evaluateRef = useRef(evaluate);
  evaluateRef.current = evaluate;

  /* splash → answering */
  useEffect(() => {
    if (stage !== "splash") return;
    const id = window.setTimeout(() => {
      setTimeLeft(durationFor(qIdxRef.current));
      setStage("answering");
    }, 2800);
    return () => clearTimeout(id);
  }, [stage]);

  /* countdown */
  useEffect(() => {
    if (stage !== "answering") return;
    let lastWhole = Math.ceil(durationFor(qIdx));
    const iv = window.setInterval(() => {
      const current = timeRef.current - 0.05;
      timeRef.current = Math.max(0, current);
      setTimeLeft(timeRef.current);
      const whole = Math.ceil(timeRef.current);
      if (whole !== lastWhole) {
        lastWhole = whole;
        if (whole <= 3 && whole > 0) sound.playTick();
      }
      if (current <= 0) {
        window.clearInterval(iv);
        evaluateRef.current(selectedRef.current, true);
      }
    }, 50);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, qIdx]);

  const timeRef = useRef(10);
  timeRef.current = timeLeft;

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (stageRef.current !== "answering") return;
      const k = e.key.toLowerCase();
      const map: Record<string, number> = {
        "1": 0,
        "2": 1,
        "3": 2,
        "4": 3,
        а: 0,
        б: 1,
        в: 2,
        г: 3,
        a: 0,
        b: 1,
        c: 2,
        d: 3,
      };
      if (k in map) {
        e.preventDefault();
        sound.playClick();
        setSelected(map[k]);
      } else if (k === "enter" && selectedRef.current !== null) {
        e.preventDefault();
        evaluateRef.current(selectedRef.current, false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------- render ---------- */
  const q = QUESTIONS[qIdx];
  const phase = qIdx < 15 ? 1 : 2;
  const duration = durationFor(qIdx);
  const danger = stage === "answering" && timeLeft <= 3.05;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative min-h-dvh overflow-hidden"
    >
      {/* background */}
      <img src="images/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-[0.10]" />
      <div
        className={`absolute inset-0 transition-colors duration-1000 ${
          phase === 1
            ? "bg-[radial-gradient(ellipse_at_top,rgba(246,197,85,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(230,36,41,0.10),transparent_55%)]"
            : "bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(230,36,41,0.12),transparent_55%)]"
        }`}
      />
      <Starfield density={70} />
      <div className="halftone absolute inset-x-0 bottom-0 h-44 opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pt-5 pb-10 md:px-6">
        {/* header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-700">
              <span className="font-display text-lg text-white">M</span>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.22em] uppercase ${
                phase === 1
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-300"
                  : "border-violet-400/30 bg-violet-400/10 text-violet-300"
              }`}
            >
              Фаза {phase}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMute}
              className="glass flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition hover:text-white"
              aria-label="Звук"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <TimerRing frac={timeLeft / duration} seconds={Math.max(0, Math.ceil(timeLeft))} danger={danger} />
          </div>
        </header>

        {/* segments */}
        <div className="mt-5 flex gap-[3px]">
          {QUESTIONS.map((qq, i) => {
            const a = answers[i];
            let cls = "bg-white/10";
            if (stage === "splash" && i === qIdx) cls = "bg-white/60 animate-flicker";
            else if (i === qIdx) cls = "bg-white/70 animate-flicker";
            else if (a !== undefined) cls = a === qq.correct ? "bg-emerald-400/80" : "bg-red-500/70";
            return <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${cls}`} />;
          })}
        </div>

        {/* question */}
        <div className="mt-2 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={qIdx}
              initial={{ opacity: 0, x: 70, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -70, filter: "blur(6px)" }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="font-display text-sm tracking-[0.3em] text-white/40 uppercase">
                  Вопрос {String(qIdx + 1).padStart(2, "0")} <span className="text-white/20">/ {TOTAL}</span>
                </span>
                <span className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white/60 uppercase">
                  {q.tag}
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-white/35 uppercase">
                  <Timer className="h-3 w-3" />
                  {duration} сек
                </span>
              </div>

              <h2 className="font-display mt-4 text-xl leading-snug text-white md:text-[1.85rem] md:leading-[1.3]">
                {q.q}
              </h2>

              {/* answers */}
              <div className="mt-7 space-y-3">
                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrectAnswer = i === q.correct;
                  const revealed = stage === "revealed";
                  const showCorrect = revealed && isCorrectAnswer;
                  const showWrong = revealed && isSelected && !isCorrectAnswer;

                  let cls =
                    "border-white/10 bg-white/[0.03] hover:border-amber-300/40 hover:bg-white/[0.06] hover:translate-x-1.5";
                  if (!revealed && isSelected)
                    cls = "border-amber-300/70 bg-amber-300/[0.08] shadow-[0_0_35px_-12px_rgba(246,197,85,0.55)]";
                  if (showCorrect)
                    cls = "border-emerald-400/70 bg-emerald-500/12 shadow-[0_0_35px_-12px_rgba(52,211,153,0.5)]";
                  if (showWrong) cls = `border-red-500/70 bg-red-500/12 animate-shake`;
                  if (revealed && !showCorrect && !showWrong) cls = "border-white/8 bg-white/[0.02] opacity-35";

                  let badge = "bg-white/8 text-white/60";
                  if (!revealed && isSelected) badge = "bg-amber-300/20 text-amber-300 ring-1 ring-amber-300/40";
                  if (showCorrect) badge = "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40";
                  if (showWrong) badge = "bg-red-500/20 text-red-400 ring-1 ring-red-500/40";

                  return (
                    <button
                      key={i}
                      disabled={revealed}
                      onClick={() => {
                        sound.playClick();
                        setSelected(i);
                      }}
                      className={`group relative flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-300 md:px-5 ${cls}`}
                    >
                      <span
                        className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm transition-colors ${badge}`}
                      >
                        {LETTERS[i]}
                      </span>
                      <span className="flex-1 text-sm leading-snug font-medium text-white/85 md:text-[15px]">
                        {opt}
                      </span>
                      {showCorrect && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                          <Check className="h-5 w-5 text-emerald-400" />
                        </motion.span>
                      )}
                      {showWrong && (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}>
                          <X className="h-5 w-5 text-red-400" />
                        </motion.span>
                      )}
                      {!revealed && isSelected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_10px_2px_rgba(246,197,85,0.6)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* footer: confirm / reveal feedback */}
        <div className="mt-8 flex min-h-[92px] flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {stage === "answering" ? (
              <motion.div
                key={`confirm-${qIdx}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="flex w-full flex-col items-center"
              >
                <button
                  onClick={() => selected !== null && evaluate(selected, false)}
                  disabled={selected === null}
                  className={`font-display btn-shine inline-flex items-center gap-2.5 rounded-2xl px-9 py-4 text-sm tracking-[0.2em] uppercase transition-all duration-300 ${
                    selected !== null
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_16px_45px_-12px_rgba(230,36,41,0.7)] hover:scale-[1.04] active:scale-95"
                      : "cursor-not-allowed border border-white/12 bg-white/[0.04] text-white/30"
                  }`}
                >
                  <ShieldCheck className="h-4.5 w-4.5" />
                  Подтвердить ответ
                </button>
                <p className="mt-3 text-[10px] tracking-[0.26em] text-white/30 uppercase">
                  {selected === null ? "Сначала выбери вариант А–Г" : `Выбран вариант ${LETTERS[selected]} — проверь и подтверждай`}
                </p>
              </motion.div>
            ) : (
              reveal && (
                <motion.div
                  key={`reveal-${qIdx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex w-full flex-col items-center"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`animate-pop-badge font-display inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-lg tracking-wider uppercase ${
                        reveal.correct
                          ? "border-emerald-300/40 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_10px_35px_-8px_rgba(16,185,129,0.7)]"
                          : "border-red-400/40 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_10px_35px_-8px_rgba(230,36,41,0.7)]"
                      }`}
                    >
                      {reveal.correct ? <Check className="h-5 w-5" /> : reveal.timedOut ? <Hourglass className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      {reveal.correct ? "Верно!" : reveal.timedOut ? "Время вышло!" : "Мимо!"}
                    </span>
                  </div>
                  {!reveal.correct && (
                    <p className="mt-3 max-w-md text-center text-xs leading-relaxed text-white/55">
                      Правильный ответ:{" "}
                      <span className="font-bold text-emerald-300">
                        {LETTERS[q.correct]} — {q.options[q.correct]}
                      </span>
                    </p>
                  )}
                  <div className="mt-4 h-[3px] w-52 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${reveal.correct ? "bg-emerald-400" : "bg-red-400"}`}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2.5, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* phase splash overlay */}
      <AnimatePresence>{stage === "splash" && <PhaseSplash key="splash" phase={phase} />}</AnimatePresence>
    </motion.main>
  );
}
