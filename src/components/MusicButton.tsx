import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { music, useMusicState } from "../lib/music";

/** Плавающая кнопка фоновой музыки («Portals» — Мстители: Финал). */
export default function MusicButton() {
  const { available, playing } = useMusicState();
  const [hint, setHint] = useState(false);

  const onClick = () => {
    if (available === false) {
      setHint(true);
      window.setTimeout(() => setHint(false), 2800);
      return;
    }
    music.toggle();
  };

  return (
    <div className="fixed right-5 bottom-5 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {hint && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            className="glass rounded-xl border-amber-300/20 px-4 py-2.5 text-[11px] leading-relaxed text-amber-200"
          >
            Файл не найден. Добавь{" "}
            <span className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-amber-100">public/music/Portals.mp3</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        title={playing ? "Выключить музыку" : "Включить музыку — Portals («Мстители: Финал»)"}
        className={`group flex items-center gap-2.5 rounded-full border py-2.5 pr-4 pl-3.5 backdrop-blur-md transition-all duration-300 ${
          playing
            ? "border-amber-300/35 bg-amber-400/10 shadow-[0_8px_30px_-10px_rgba(246,197,85,0.55)]"
            : "border-white/12 bg-black/45 hover:border-white/25 hover:bg-white/10"
        }`}
      >
        <span className={`flex h-4 items-end gap-[2.5px] ${playing ? "eq-playing" : ""}`}>
          <span className="eq-bar h-full w-[3px] rounded-full bg-gradient-to-t from-red-400 to-amber-300" />
          <span className="eq-bar h-full w-[3px] rounded-full bg-gradient-to-t from-red-400 to-amber-300" />
          <span className="eq-bar h-full w-[3px] rounded-full bg-gradient-to-t from-red-400 to-amber-300" />
        </span>
        <span className="text-[10px] font-bold tracking-[0.22em] text-white/70 uppercase transition-colors group-hover:text-white">
          {playing ? "Portals" : available === false ? "Нет музыки" : "Музыка"}
        </span>
      </motion.button>
    </div>
  );
}
