"use client";

import { useEffect, useRef } from "react";

// Floating koi fish + water ripple background
export default function KoiPond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0;
    const koi: { x: number; y: number; vx: number; vy: number; size: number; color: string; angle: number; tailPhase: number; speed: number }[] = [];
    const ripples: { x: number; y: number; r: number; opacity: number; speed: number }[] = [];
    const petals: { x: number; y: number; vy: number; vx: number; size: number; rotation: number; rotationSpeed: number; opacity: number }[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    resize();
    window.addEventListener("resize", resize);

    // Spawn koi
    const colors = ["#FF6B35", "#FFFDF7", "#FF2D2D", "#FFB347", "#F5F5DC"];
    for (let i = 0; i < 5; i++) {
      koi.push({
        x: Math.random() * w * 0.4 + w * 0.05,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2,
        size: 20 + Math.random() * 25,
        color: colors[i % colors.length],
        angle: Math.random() * Math.PI * 2,
        tailPhase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
      });
    }

    // Spawn initial ripples
    for (let i = 0; i < 8; i++) {
      ripples.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 10 + Math.random() * 40,
        opacity: 0.02 + Math.random() * 0.04,
        speed: 0.3 + Math.random() * 0.5,
      });
    }

    // Spawn cherry blossom petals
    for (let i = 0; i < 15; i++) {
      petals.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: 0.2 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.1 + Math.random() * 0.15,
      });
    }

    const drawKoi = (k: typeof koi[0]) => {
      ctx.save();
      ctx.translate(k.x, k.y);
      ctx.rotate(k.angle);

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, k.size * 0.7, k.size * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = k.color;
      ctx.globalAlpha = 0.07;
      ctx.fill();

      // Tail
      ctx.beginPath();
      const tailWag = Math.sin(k.tailPhase) * 8;
      ctx.moveTo(-k.size * 0.6, -tailWag);
      ctx.quadraticCurveTo(-k.size * 0.9, -tailWag * 2, -k.size * 0.8, tailWag * 0.5);
      ctx.quadraticCurveTo(-k.size * 0.6, tailWag, -k.size * 0.6, -tailWag);
      ctx.fill();

      // Head spot
      ctx.beginPath();
      ctx.arc(k.size * 0.4, 0, k.size * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = "#FF0000";
      ctx.globalAlpha = 0.03;
      ctx.fill();

      ctx.restore();
    };

    let frame = 0;
    const animate = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Water base
      ctx.fillStyle = "#06070B";
      ctx.fillRect(0, 0, w, h);

      // Subtle water gradient
      const waterGrad = ctx.createRadialGradient(w * 0.3, h * 0.5, 0, w * 0.3, h * 0.5, w * 0.6);
      waterGrad.addColorStop(0, "rgba(8, 20, 40, 0.4)");
      waterGrad.addColorStop(1, "rgba(6, 7, 11, 0)");
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, 0, w, h);

      // Animate ripples
      for (const r of ripples) {
        r.r += r.speed;
        r.opacity -= 0.0001;
        if (r.opacity <= 0 || r.r > 100) {
          r.x = Math.random() * w;
          r.y = Math.random() * h;
          r.r = 5 + Math.random() * 15;
          r.opacity = 0.02 + Math.random() * 0.04;
        }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 212, 255, ${r.opacity})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Animate koi
      for (const k of koi) {
        k.tailPhase += 0.08;
        // Swim around
        k.x += k.vx;
        k.y += k.vy;
        k.angle = Math.atan2(k.vy, k.vx) + Math.sin(frame * 0.02 + k.tailPhase) * 0.2;

        // Bounce off edges
        if (k.x < -30 || k.x > w + 30) k.vx *= -1;
        if (k.y < -30 || k.y > h + 30) k.vy *= -1;

        // Random direction change
        if (Math.random() < 0.005) {
          k.vx += (Math.random() - 0.5) * 0.15;
          k.vy += (Math.random() - 0.5) * 0.15;
          // Clamp speed
          const mag = Math.sqrt(k.vx * k.vx + k.vy * k.vy);
          if (mag > 0.5) { k.vx *= 0.5 / mag; k.vy *= 0.5 / mag; }
        }

        drawKoi(k);
      }

      // Animate cherry blossom petals
      for (const p of petals) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(frame * 0.01 + p.x * 0.01) * 0.1;
        p.rotation += p.rotationSpeed;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random() * w; }
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        // Simple petal shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 150, 180, ${p.opacity})`;
        ctx.fill();
        ctx.restore();
      }

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-20 pointer-events-none"
      aria-hidden="true"
    />
  );
}
