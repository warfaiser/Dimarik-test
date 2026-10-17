import type { LucideIcon } from "lucide-react";
import { Baby, Shield, Swords, Orbit, Crown } from "lucide-react";

export interface Rank {
  min: number;
  max: number;
  title: string;
  desc: string;
  icon: LucideIcon;
  gradient: string;
  glow: string;
  chip: string;
}

export const RANKS: Rank[] = [
  {
    min: 0,
    max: 7,
    title: "Смешарик вселенной Marvel",
    desc: "Ты знаешь, что существует Железный человек, а дальше начинается туман. Пересмотри Сагу Бесконечности — она ждёт тебя.",
    icon: Baby,
    gradient: "from-slate-400 to-slate-600",
    glow: "shadow-slate-500/30",
    chip: "bg-slate-500/15 text-slate-300 border-slate-400/20",
  },
  {
    min: 8,
    max: 14,
    title: "Стажёр Щ.И.Т.",
    desc: "Основы MCU знакомы, но Камни Бесконечности пока разбросаны по памяти.",
    icon: Shield,
    gradient: "from-sky-400 to-blue-600",
    glow: "shadow-sky-500/30",
    chip: "bg-sky-500/15 text-sky-300 border-sky-400/20",
  },
  {
    min: 15,
    max: 21,
    title: "Мститель",
    desc: "Ты уверенно ориентируешься в основных событиях Саги Бесконечности и не потеряешься даже во временной линии.",
    icon: Swords,
    gradient: "from-emerald-400 to-teal-600",
    glow: "shadow-emerald-500/30",
    chip: "bg-emerald-500/15 text-emerald-300 border-emerald-400/20",
  },
  {
    min: 22,
    max: 26,
    title: "Страж Мультивселенной",
    desc: "Очень серьёзный результат. Ты помнишь не только главные события, но и множество деталей.",
    icon: Orbit,
    gradient: "from-violet-400 to-fuchsia-600",
    glow: "shadow-violet-500/30",
    chip: "bg-violet-500/15 text-violet-300 border-violet-400/20",
  },
  {
    min: 27,
    max: 30,
    title: "Пейнкиллер",
    desc: "Теперь ты не просто смотришь Киновселенную Марвел — ты проводишь ей собеседование и достоин носить свою кепку. Большинство вопросов для тебя были слишком лёгкими.",
    icon: Crown,
    gradient: "from-amber-300 via-yellow-400 to-orange-500",
    glow: "shadow-amber-500/40",
    chip: "bg-amber-500/15 text-amber-300 border-amber-400/25",
  },
];
