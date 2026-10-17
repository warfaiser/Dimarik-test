import { useEffect } from "react";
import { motion } from "framer-motion";

export default function Preloader({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1900);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#06060b]"
      exit={{ opacity: 0, scale: 1.08, filter: "blur(8px)" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* arc reactor */}
      <div className="relative h-36 w-36">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div
          className="animate-spin-slow absolute inset-0 rounded-full border-2 border-transparent border-t-sky-400/80 border-r-sky-400/30"
        />
        <div
          className="animate-spin-slower absolute inset-3 rounded-full border border-dashed border-white/20"
        />
        <div className="absolute inset-6 rounded-full border border-sky-300/20 bg-sky-400/5" />
        <motion.div
          className="absolute inset-[34%] rounded-full bg-sky-300 shadow-[0_0_40px_8px_rgba(56,189,248,0.55)]"
          animate={{ scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-10 text-center"
      >
        <p className="font-display text-sm tracking-[0.5em] text-white/85 uppercase">Marvel Quiz</p>
        <p className="mt-2 text-[11px] tracking-[0.3em] text-white/35 uppercase">Загружаем мультивселенную…</p>
      </motion.div>

      <div className="mt-6 h-[3px] w-44 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-400 to-sky-400"
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 1.55, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>
    </motion.div>
  );
}
