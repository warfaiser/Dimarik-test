import { motion } from "framer-motion";
import { Timer, Zap } from "lucide-react";
import Starfield from "./Starfield";

export default function PhaseSplash({ phase }: { phase: 1 | 2 }) {
  const isTwo = phase === 2;
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#06060b]"
      exit={{ opacity: 0, scale: 1.15, filter: "blur(14px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`absolute inset-0 ${
          isTwo
            ? "bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.16),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(230,36,41,0.14),transparent_55%)]"
            : "bg-[radial-gradient(ellipse_at_center,rgba(246,197,85,0.12),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(230,36,41,0.16),transparent_55%)]"
        }`}
      />
      <Starfield density={90} />
      <div className="halftone absolute inset-x-0 bottom-0 h-40 opacity-40 [mask-image:linear-gradient(to_top,black,transparent)]" />

      {/* giant outline number */}
      <motion.span
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-stroke font-display pointer-events-none absolute text-[42vw] leading-none select-none md:text-[24rem]"
      >
        0{phase}
      </motion.span>

      <div className="relative z-10 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className={`mx-auto mb-6 h-[2px] w-24 ${
              isTwo ? "bg-gradient-to-r from-transparent via-violet-400 to-transparent" : "bg-gradient-to-r from-transparent via-amber-300 to-transparent"
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
          />
          <p className="font-display text-xs tracking-[0.55em] text-white/45 uppercase md:text-sm">
            {isTwo ? "Вопросы 16 — 30" : "Вопросы 1 — 15"}
          </p>
          <h2 className="font-display mt-3 text-5xl tracking-wide text-white uppercase md:text-7xl">
            Фаза{" "}
            <span
              className={`bg-gradient-to-r bg-clip-text text-transparent ${
                isTwo ? "from-violet-300 via-fuchsia-400 to-red-400" : "from-amber-200 via-yellow-300 to-red-400"
              }`}
            >
              {isTwo ? "два" : "один"}
            </span>
          </h2>

          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold tracking-widest text-white/75 uppercase">
              <Timer className="h-3.5 w-3.5 text-amber-300" />
              {isTwo ? "15 секунд на ответ" : "10 секунд на ответ"}
            </span>
            {isTwo && (
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold tracking-widest text-violet-200 uppercase">
                <Zap className="h-3.5 w-3.5" />
                Сложнее
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
