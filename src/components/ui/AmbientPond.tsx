"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Perlin / simplex-like noise for smooth organic motion
// ---------------------------------------------------------------------------

// Simple 2D noise function (value noise with smooth interpolation)
// Used for koi movement and caustic patterns
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = noise2D(ix, iy, seed);
  const n10 = noise2D(ix + 1, iy, seed);
  const n01 = noise2D(ix, iy + 1, seed);
  const n11 = noise2D(ix + 1, iy + 1, seed);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;

  return nx0 + (nx1 - nx0) * sy;
}

function fbm(x: number, y: number, seed: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 1000);
    maxValue += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value / maxValue;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Koi {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  targetAngle: number;
  size: number;
  speed: number;
  color: string;
  accentColor: string;
  seed: number;
  phase: number;
  tailPhase: number;
  turnTimer: number;
}

interface Petal {
  x: number;
  y: number;
  angle: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  speed: number;
  driftAmp: number;
  driftFreq: number;
  phase: number;
  opacity: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KOI_COLORS = [
  { body: "#FF6B35", accent: "#FF4500" }, // orange koi
  { body: "#FFFFFF", accent: "#FFB6C1" }, // white koi
  { body: "#FFD700", accent: "#FFA500" }, // gold koi
  { body: "#FF4444", accent: "#CC0000" }, // red koi
  { body: "#FF8C00", accent: "#FF6347" }, // dark orange
];

const PETAL_COLORS = [
  "rgba(255, 183, 197, OPACITY)",
  "rgba(255, 218, 224, OPACITY)",
  "rgba(255, 192, 203, OPACITY)",
  "rgba(255, 228, 225, OPACITY)",
  "rgba(255, 182, 193, OPACITY)",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AmbientPond() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Resize
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * (window.devicePixelRatio > 1 ? 1 : 1); // keep native for perf
      canvas.height = height;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    // Capture narrowed context
    const context = ctx;

    // -----------------------------------------------------------------------
    // Initialize koi
    // -----------------------------------------------------------------------
    const koi: Koi[] = [];
    const numKoi = 5;
    for (let i = 0; i < numKoi; i++) {
      const color = KOI_COLORS[i % KOI_COLORS.length];
      const x = width * 0.2 + Math.random() * width * 0.6;
      const y = height * 0.2 + Math.random() * height * 0.6;
      koi.push({
        x,
        y,
        targetX: x,
        targetY: y,
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        size: 40 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.4,
        color: color.body,
        accentColor: color.accent,
        seed: Math.random() * 10000,
        phase: Math.random() * Math.PI * 2,
        tailPhase: 0,
        turnTimer: 0,
      });
    }

    // -----------------------------------------------------------------------
    // Initialize petals
    // -----------------------------------------------------------------------
    const petals: Petal[] = [];
    const numPetals = 20;
    for (let i = 0; i < numPetals; i++) {
      petals.push({
        x: Math.random() * width,
        y: Math.random() * height,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        size: 4 + Math.random() * 8,
        speed: 0.2 + Math.random() * 0.4,
        driftAmp: 20 + Math.random() * 40,
        driftFreq: 0.002 + Math.random() * 0.004,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.15 + Math.random() * 0.25,
        color: PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)],
      });
    }

    // -----------------------------------------------------------------------
    // Render helpers
    // -----------------------------------------------------------------------

    function drawKoi(k: Koi, t: number) {
      context.save();
      context.translate(k.x, k.y);
      context.rotate(k.angle);

      const s = k.size;
      const tailWag = Math.sin(t * 0.08 + k.phase) * 0.3;

      // Body shadow
      context.fillStyle = "rgba(0,0,0,0.08)";
      context.beginPath();
      context.ellipse(3, 3, s * 0.45, s * 0.18, 0, 0, Math.PI * 2);
      context.fill();

      // Body
      context.fillStyle = k.color;
      context.globalAlpha = 0.15;
      context.beginPath();
      context.ellipse(0, 0, s * 0.45, s * 0.18, 0, 0, Math.PI * 2);
      context.fill();

      // Dorsal highlight
      context.fillStyle = "rgba(255,255,255,0.1)";
      context.beginPath();
      context.ellipse(0, -s * 0.06, s * 0.35, s * 0.08, 0, 0, Math.PI * 2);
      context.fill();

      // Tail fin
      context.fillStyle = k.accentColor;
      context.globalAlpha = 0.12;
      context.beginPath();
      context.moveTo(-s * 0.4, 0);
      context.quadraticCurveTo(
        -s * 0.65,
        -s * 0.25 + tailWag * 10,
        -s * 0.5,
        -s * 0.35 + tailWag * 15
      );
      context.quadraticCurveTo(-s * 0.55, 0, -s * 0.5, s * 0.1 + tailWag * 5);
      context.quadraticCurveTo(
        -s * 0.65,
        s * 0.25 + tailWag * 10,
        -s * 0.4,
        0
      );
      context.fill();

      // Pectoral fins
      context.fillStyle = k.accentColor;
      context.globalAlpha = 0.08;
      const finFlap = Math.sin(t * 0.1 + k.phase + 1) * 0.4;
      // Top fin
      context.beginPath();
      context.moveTo(0, -s * 0.15);
      context.quadraticCurveTo(s * 0.05, -s * 0.35 + finFlap * 6, s * 0.15, -s * 0.15);
      context.fill();
      // Bottom fin
      context.beginPath();
      context.moveTo(0, s * 0.15);
      context.quadraticCurveTo(s * 0.05, s * 0.35 - finFlap * 6, s * 0.15, s * 0.15);
      context.fill();

      // Eye
      context.fillStyle = "rgba(0,0,0,0.15)";
      context.globalAlpha = 0.15;
      context.beginPath();
      context.arc(s * 0.3, -s * 0.04, s * 0.04, 0, Math.PI * 2);
      context.fill();

      // Eye highlight
      context.fillStyle = "rgba(255,255,255,0.2)";
      context.beginPath();
      context.arc(s * 0.32, -s * 0.06, s * 0.015, 0, Math.PI * 2);
      context.fill();

      context.restore();
    }

    function drawPetal(p: Petal, t: number) {
      context.save();
      context.translate(p.x, p.y);
      context.rotate(p.rotation);

      const c = p.color.replace("OPACITY", String(p.opacity));
      context.fillStyle = c;
      context.beginPath();
      // Simple petal shape
      const s = p.size;
      context.ellipse(0, 0, s * 0.5, s * 0.2, 0, 0, Math.PI * 2);
      context.fill();

      // Petal detail
      context.fillStyle = c.replace(String(p.opacity), String(p.opacity * 0.5));
      context.beginPath();
      context.ellipse(0, s * 0.05, s * 0.25, s * 0.1, 0, 0, Math.PI * 2);
      context.fill();

      context.restore();
    }

    function drawCaustics(t: number) {
      // Subtle caustic light patterns on the "pond floor"
      context.globalAlpha = 0.03;

      for (let i = 0; i < 8; i++) {
        const nx = fbm(i * 0.7 + t * 0.0005, i * 0.3, i * 137 + Math.sin(t * 0.0001) * 50, 3);
        const ny = fbm(i * 0.7 + t * 0.0005 + 100, i * 0.3 + 200, i * 137, 3);
        const x = nx * width;
        const y = ny * height;
        const r = 60 + fbm(i, t * 0.0003, i) * 120;

        const gradient = context.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, "rgba(0, 212, 255, 0.15)");
        gradient.addColorStop(0.5, "rgba(0, 212, 255, 0.05)");
        gradient.addColorStop(1, "rgba(0, 212, 255, 0)");

        context.fillStyle = gradient;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();
      }
    }

    // -----------------------------------------------------------------------
    // Animation loop
    // -----------------------------------------------------------------------
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50); // cap dt to avoid jumps
      lastTime = now;
      const t = now * 0.001;

      // Clear
      context.clearRect(0, 0, width, height);
      context.globalAlpha = 1;

      // Water base - deep dark gradient
      const waterGrad = context.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      waterGrad.addColorStop(0, "rgba(6, 7, 11, 0.92)");
      waterGrad.addColorStop(0.4, "rgba(8, 15, 30, 0.95)");
      waterGrad.addColorStop(0.7, "rgba(10, 20, 40, 0.96)");
      waterGrad.addColorStop(1, "rgba(6, 7, 11, 0.98)");
      context.fillStyle = waterGrad;
      context.fillRect(0, 0, width, height);

      // Subtle water depth variation
      context.globalAlpha = 0.02;
      for (let y = 0; y < height; y += 40) {
        const wave = Math.sin(y * 0.01 + t * 0.3) * 0.5 + 0.5;
        context.fillStyle = `rgba(0, 180, 220, ${wave * 0.05})`;
        context.fillRect(0, y, width, 40);
      }

      // Caustics
      drawCaustics(t);

      // Update and draw koi
      for (const k of koi) {
        k.tailPhase += dt * 0.001;

        // Noise-based movement for natural swimming
        const nx = fbm(k.seed + t * 0.3, 0, k.seed, 2);
        const ny = fbm(k.seed + t * 0.3 + 500, 0, k.seed, 2);
        const angleNoise = fbm(k.seed + t * 0.2 + 1000, 0, k.seed, 2);

        // Target position with gentle wandering
        // Map noise [-1,1] range to screen with padding
        const margin = k.size * 2;
        const rangeX = width - margin * 2;
        const rangeY = height - margin * 2;
        k.targetX = margin + ((nx + 1) / 2) * rangeX;
        k.targetY = margin + ((ny + 1) / 2) * rangeY;
        k.targetAngle = angleNoise * Math.PI * 2;

        // Smooth interpolation
        const lerpFactor = 0.005 * (dt / 16);
        k.x += (k.targetX - k.x) * lerpFactor;
        k.y += (k.targetY - k.y) * lerpFactor;

        // Smooth angle interpolation (handle wrap-around)
        let angleDiff = k.targetAngle - k.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        k.angle += angleDiff * lerpFactor * 2;

        // Draw koi
        drawKoi(k, t);
      }

      // Update and draw petals
      for (const p of petals) {
        // Gentle downward drift with horizontal sway
        p.phase += dt * p.driftFreq;
        p.x += Math.sin(p.phase) * p.driftAmp * 0.01;
        p.y += p.speed * (dt / 16);
        p.rotation += p.rotationSpeed * (dt / 16);

        // Wrap around
        if (p.y > height + p.size) {
          p.y = -p.size;
          p.x = Math.random() * width;
        }
        if (p.x > width + p.size) p.x = -p.size;
        if (p.x < -p.size) p.x = width + p.size;

        drawPetal(p, t);
      }

      // Subtle surface ripple overlay
      context.globalAlpha = 0.015;
      for (let i = 0; i < 5; i++) {
        const rx = (fbm(i * 1.3 + t * 0.0004, 0, i * 200) * 0.5 + 0.5) * width;
        const ry = (fbm(i * 1.3 + t * 0.0004 + 300, 0, i * 200) * 0.5 + 0.5) * height;
        const rr = 80 + fbm(i, t * 0.0002, i * 400) * 100;

        const rippleGrad = context.createRadialGradient(rx, ry, 0, rx, ry, rr);
        rippleGrad.addColorStop(0, "rgba(255, 255, 255, 0.06)");
        rippleGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

        context.fillStyle = rippleGrad;
        context.beginPath();
        context.arc(rx, ry, rr, 0, Math.PI * 2);
        context.fill();
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.6,
      }}
    />
  );
}
