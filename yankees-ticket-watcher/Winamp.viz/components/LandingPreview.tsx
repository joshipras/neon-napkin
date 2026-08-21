"use client";

import { useEffect, useRef } from "react";

export default function LandingPreview() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const bars = new Array(44).fill(0).map((_, index) => ({
      phase: index * 0.44,
      height: 0.2 + ((index * 13) % 70) / 100
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const render = () => {
      frame += 0.018;
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";

      const barWidth = width / bars.length;
      for (let i = 0; i < bars.length; i += 1) {
        const wobble = Math.sin(frame * (1.2 + (i % 5) * 0.13) + bars[i].phase);
        const pulse = Math.max(0, Math.sin(frame * 3.1 + i * 0.72));
        const h = height * (0.08 + bars[i].height * 0.22 + wobble * 0.04 + pulse * 0.18);
        const x = i * barWidth;
        const y = height - h - 22;
        const grad = ctx.createLinearGradient(0, y, 0, height);
        grad.addColorStop(0, i % 5 === 0 ? "#ff30c2" : "#ffffff");
        grad.addColorStop(0.34, "#ffb000");
        grad.addColorStop(0.67, "#39ff14");
        grad.addColorStop(1, "#0078ff");
        ctx.fillStyle = grad;
        ctx.shadowColor = i % 5 === 0 ? "#ff30c2" : "#39ff14";
        ctx.shadowBlur = 20;
        ctx.fillRect(x + barWidth * 0.16, y, barWidth * 0.52, h);

        ctx.fillStyle = "rgba(255,255,255,0.72)";
        ctx.shadowBlur = 8;
        ctx.fillRect(x + barWidth * 0.16, y - 28 - (i % 4) * 10, barWidth * 0.52, 10);
      }

      for (let i = 0; i < 18; i += 1) {
        const radius = (i + 1) * 42 + Math.sin(frame * 3 + i) * 10;
        ctx.strokeStyle = `rgba(${i % 2 ? "37,247,255" : "255,48,194"},${0.13 - i * 0.004})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(width * 0.5, height * 0.5, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      raf = requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-55" aria-hidden />;
}
