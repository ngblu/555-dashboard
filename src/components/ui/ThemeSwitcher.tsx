"use client";

import { Palette } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";

const themes: { key: Theme; label: string; colors: string[] }[] = [
  { key: "dark", label: "Dark", colors: ["#06070B", "#00D4FF", "#E8302A"] },
  { key: "midnight", label: "Midnight", colors: ["#020418", "#4D8CFF", "#D4203A"] },
  { key: "cyber", label: "Cyber", colors: ["#000A08", "#00FF88", "#FFB800"] },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="glass rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-text-secondary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Theme
        </h3>
      </div>
      <div className="flex gap-2">
        {themes.map((t) => (
          <button
            key={t.key}
            onClick={() => setTheme(t.key)}
            className={`flex-1 p-2 rounded-lg border text-center transition-all ${
              theme === t.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-muted hover:border-border-bright hover:text-text-secondary"
            }`}
            title={t.label}
          >
            <div className="flex justify-center gap-0.5 mb-1.5">
              {t.colors.map((c, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full border border-white/10"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="text-[10px] font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
