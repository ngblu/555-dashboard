"use client";

import { useEffect, useRef } from "react";

const POND_W = 160;
const POND_H = 100;
const SCALE = 3;

const koiSprite = [
  "  ████  ",
  " ███████ ",
  "█████████",
  " ███████ ",
  "  █████  ",
];

const pondColors = ["#0a1628", "#0d1f3c", "#081830", "#0c1a30", "#0a1830"];

export default function KoiPond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = POND_W;
    canvas.height = POND_H;

    const buf = document.createElement("canvas");
    buf.width = POND_W;
    buf.height = POND_H;
    const btx = buf.getContext("2d")!;

    let frame = 0;
    const koi1 = { x: 40, y: 45, r: 22, angle: 0, speed: 0.015, color: "#FF6B35" };
    const koi2 = { x: 100, y: 55, r: 18, angle: Math.PI, speed: -0.012, color: "#FFF" };

    const animate = () => {
      frame++;
      btx.clearRect(0, 0, POND_W, POND_H);

      // Pond base — pixel grid
      for (let y = 0; y < POND_H; y += 2) {
        for (let x = 0; x < POND_W; x += 2) {
          btx.fillStyle = pondColors[(x + y + frame) % pondColors.length];
          btx.fillRect(x, y, 2, 2);
        }
      }

      // Pond border
      btx.strokeStyle = "#1a3050";
      btx.lineWidth = 2;
      btx.strokeRect(1, 1, POND_W - 2, POND_H - 2);

      // Rocks at edges
      btx.fillStyle = "#1a2a3a";
      for (let i = 0; i < 6; i++) {
        const rx = i * 28 + 10;
        btx.fillRect(rx, 0, 8, 4);
        btx.fillRect(rx - 4, 2, 12, 3);
      }

      // Lily pads
      btx.fillStyle = "#1a4a2a";
      btx.beginPath();
      btx.arc(30, 70, 8, 0, Math.PI * 2);
      btx.fill();
      btx.beginPath();
      btx.arc(120, 30, 6, 0, Math.PI * 2);
      btx.fill();

      // Animate koi
      [koi1, koi2].forEach((k) => {
        k.angle += k.speed;
        const cx = POND_W / 2 + Math.cos(k.angle) * k.r;
        const cy = POND_H / 2 + Math.sin(k.angle) * k.r;

        // Draw pixel koi
        btx.fillStyle = k.color;
        const kx = Math.round(cx - 6);
        const ky = Math.round(cy - 3);

        // Body
        btx.fillRect(kx + 2, ky + 1, 9, 3);
        btx.fillRect(kx + 1, ky, 11, 5);
        // Tail
        btx.fillRect(kx, ky + 1, 3, 2);
        btx.fillRect(kx - 1, ky + 2, 2, 1);
        // Eye
        btx.fillStyle = "#000";
        btx.fillRect(kx + 10, ky + 1, 1, 1);
        // Fin
        if (k.color === "#FF6B35") {
          btx.fillStyle = "#FF0000";
          btx.fillRect(kx + 3, ky - 1, 2, 1);
        }
      });

      // Scale up pixel-perfect
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buf, 0, 0, POND_W * SCALE, POND_H * SCALE);

      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: POND_W * SCALE,
        height: POND_H * SCALE,
        borderRadius: 12,
        border: "1px solid rgba(0,212,255,0.15)",
        boxShadow: "0 0 30px rgba(0,212,255,0.05), inset 0 0 20px rgba(0,0,0,0.3)",
        imageRendering: "pixelated",
      }}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}
