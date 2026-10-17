import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Preloader from "./components/Preloader";
import StartScreen from "./components/StartScreen";
import QuizScreen from "./components/QuizScreen";
import ResultScreen from "./components/ResultScreen";
import MusicButton from "./components/MusicButton";
import { sound } from "./lib/sounds";
import { music, useMusicState } from "./lib/music";

type Screen = "start" | "quiz" | "result";

/** Громкость фоновой музыки на разных экранах. */
const MUSIC_VOLUME: Record<Screen, number> = {
  start: 0.38,
  quiz: 0.14,
  result: 0.55,
};

export default function App() {
  const [booted, setBooted] = useState(false);
  const [screen, setScreen] = useState<Screen>("start");
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [muted, setMuted] = useState(false);
  const { playing } = useMusicState();

  useEffect(() => {
    sound.setMuted(muted);
  }, [muted]);

  /* Автозапуск музыки на первом жесте пользователя (требование браузеров) */
  useEffect(() => {
    const kick = () => {
      void music.probe().then(() => music.requestPlay());
    };
    window.addEventListener("pointerdown", kick, { once: true });
    return () => window.removeEventListener("pointerdown", kick);
  }, []);

  /* Плавное изменение громкости при смене экрана */
  useEffect(() => {
    if (playing) music.fadeTo(MUSIC_VOLUME[screen], 1100);
  }, [screen, playing]);

  const toggleMute = () => setMuted((m) => !m);

  return (
    <div className="grain relative min-h-dvh bg-[#06060b] font-sans text-white antialiased">
      <AnimatePresence mode="wait">
        {!booted ? (
          <Preloader key="loader" onDone={() => setBooted(true)} />
        ) : screen === "start" ? (
          <StartScreen
            key="start"
            onStart={() => setScreen("quiz")}
            muted={muted}
            onToggleMute={toggleMute}
          />
        ) : screen === "quiz" ? (
          <QuizScreen
            key="quiz"
            muted={muted}
            onToggleMute={toggleMute}
            onFinish={(a) => {
              setAnswers(a);
              setScreen("result");
            }}
          />
        ) : (
          <ResultScreen
            key="result"
            answers={answers}
            onRestart={() => setScreen("quiz")}
            onHome={() => setScreen("start")}
          />
        )}
      </AnimatePresence>

      {booted && <MusicButton />}
    </div>
  );
}
