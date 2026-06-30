"use client";

import { useState, useEffect } from "react";
import { Server, Cpu, Wifi, WifiOff } from "lucide-react";
import { useData } from "@/lib/store";

interface SystemInfo {
  bridge: "online" | "offline" | "checking";
  hermes: "online" | "offline" | "checking";
  cpu: number;
}

export default function SystemStatus() {
  const { syncStatus } = useData();
  const [info, setInfo] = useState<SystemInfo>({
    bridge: "checking",
    hermes: "checking",
    cpu: 0,
  });

  useEffect(() => {
    // Check bridge (port 5555)
    fetch("http://localhost:5555/api/health", { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .then((ok) => setInfo((p) => ({ ...p, bridge: ok ? "online" : "offline" })))
      .catch(() => setInfo((p) => ({ ...p, bridge: "offline" })));

    // Check Hermes API (port 8642)
    fetch("http://127.0.0.1:8642/v1/models", { signal: AbortSignal.timeout(3000) })
      .then((r) => r.ok)
      .then((ok) => setInfo((p) => ({ ...p, hermes: ok ? "online" : "offline" })))
      .catch(() => setInfo((p) => ({ ...p, hermes: "offline" })));

    // Simple CPU estimate using performance API
    const measureCpu = () => {
      const start = performance.now();
      let sum = 0;
      for (let i = 0; i < 5000000; i++) sum += Math.sqrt(i);
      const elapsed = performance.now() - start;
      // Rough estimate: lower ms = faster CPU
      const pct = Math.min(100, Math.max(0, Math.round(100 - elapsed * 0.5)));
      setInfo((p) => ({ ...p, cpu: pct }));
    };
    measureCpu();
  }, []);

  const statusDot = (state: string) => {
    if (state === "checking") return "bg-text-muted";
    return state === "online" ? "bg-accent" : "bg-danger";
  };

  return (
    <div className="glass rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Server className="w-4 h-4 text-text-secondary" />
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          System Status
        </h3>
      </div>
      <div className="space-y-2">
        {/* Bridge */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-secondary">Bridge</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot(info.bridge)}`} />
            <span className="text-text-muted capitalize">{info.bridge}</span>
          </div>
        </div>

        {/* Hermes */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-secondary">Hermes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot(info.hermes)}`} />
            <span className="text-text-muted capitalize">{info.hermes}</span>
          </div>
        </div>

        {/* Cloud Sync */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {syncStatus === "offline" ? (
              <WifiOff className="w-3.5 h-3.5 text-danger" />
            ) : (
              <Wifi className="w-3.5 h-3.5 text-text-muted" />
            )}
            <span className="text-text-secondary">Sync</span>
          </div>
          <span className="text-text-muted capitalize">{syncStatus}</span>
        </div>

        {/* CPU */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-text-secondary">CPU</span>
          </div>
          <span className="text-text-muted">{info.cpu}% idle</span>
        </div>
      </div>
    </div>
  );
}
