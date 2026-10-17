import { useEffect, useRef } from "react";

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rot: number;
  vr: number;
  shape: number;
  life: number;
}

export default function Confetti({ pieces = 140, palette }: { pieces?: number; palette?: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const colors = palette ?? ["#e62429", "#f6c555", "#ffffff", "#38bdf8", "#a78bfa"];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;

    const parts: Piece[] = Array.from({ length: pieces }, () => {
      const edge = Math.random();
      return {
        x: edge < 0.5 ? Math.random() * canvas.width * 0.25 : canvas.width * (0.75 + Math.random() * 0.25),
        y: canvas.height * (0.55 + Math.random() * 0.4),
        vx: (edge < 0.5 ? 1 : -1) * (Math.random() * 9 + 4) * dpr,
        vy: -(Math.random() * 14 + 9) * dpr,
        size: (Math.random() * 7 + 4) * dpr * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.floor(Math.random() * 3),
        life: 1,
      };
    });

    let raf = 0;
    const gravity = 0.32 * dpr;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of parts) {
        p.vy += gravity;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life = Math.max(0, 1 - elapsed / 3400);
        if (p.y < canvas.height + 40 && p.life > 0) alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size / 2);
          ctx.lineTo(p.size / 2, p.size / 2);
          ctx.lineTo(-p.size / 2, p.size / 2);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [pieces, palette]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
