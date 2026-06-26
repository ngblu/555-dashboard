"use client";

/**
 * SakuraPetals — CSS-only cherry blossom petals drifting across the viewport.
 * Renders a few fixed-position petals that fall and sway gently.
 * Pure decorative, no canvas needed.
 */

const PETALS = [
  { left: "3%",  delay: "0s",  duration: "10s", drift: "35px",  spin: "200deg", sway: "3.2s", size: "14px" },
  { left: "18%", delay: "2.5s", duration: "12s", drift: "-45px", spin: "260deg", sway: "3.8s", size: "11px" },
  { left: "31%", delay: "5s",  duration: "9s",  drift: "28px",  spin: "160deg", sway: "2.9s", size: "13px" },
  { left: "47%", delay: "1s",  duration: "11s", drift: "-55px", spin: "310deg", sway: "3.5s", size: "10px" },
  { left: "62%", delay: "7s",  duration: "13s", drift: "40px",  spin: "220deg", sway: "4.1s", size: "12px" },
  { left: "78%", delay: "3s",  duration: "10s", drift: "-30px", spin: "280deg", sway: "3.0s", size: "15px" },
  { left: "90%", delay: "6s",  duration: "14s", drift: "50px",  spin: "180deg", sway: "3.7s", size: "10px" },
  { left: "55%", delay: "8s",  duration: "8s",  drift: "-60px", spin: "340deg", sway: "2.6s", size: "11px" },
];

export default function SakuraPetals() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden"
      aria-hidden="true"
    >
      {PETALS.map((p, i) => (
        <div
          key={i}
          className="sakura-petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            "--sakura-duration": p.duration,
            "--sakura-delay": p.delay,
            "--sakura-drift": p.drift,
            "--sakura-spin": p.spin,
            "--sakura-sway": p.sway,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
