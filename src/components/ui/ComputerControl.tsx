"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor,
  MousePointer2,
  Keyboard,
  Image,
  ArrowUp,
  ArrowDown,
  Volume2,
  VolumeX,
  Lock,
  Moon,
  Globe,
  Copy,
  Clipboard,
  Maximize2,
  RefreshCw,
  Zap,
  Send,
  X,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
} from "lucide-react";

const BRIDGE_URL = "http://localhost:5555";
const RELAY_URL = "https://555-dashboard.vercel.app/api/bridge";
const BRIDGE_TOKEN = "555-control-secret";

// ── API helpers ─────────────────────────────────────────────────
async function callApi(endpoint: string, body?: Record<string, unknown>) {
  const authHeader = "Bearer " + BRIDGE_TOKEN;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Bridge-Token": BRIDGE_TOKEN,
    "Authorization": authHeader,
  };

  const res = await fetch(BRIDGE_URL + endpoint, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "HTTP " + res.status);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("image/png")) {
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  return res.json();
}

// ── Component ───────────────────────────────────────────────────
export default function ComputerControl() {
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenSize, setScreenSize] = useState({ width: 1920, height: 1080 });
  const [status, setStatus] = useState<"connecting" | "connected" | "error">("connecting");
  const [statusMsg, setStatusMsg] = useState("Connecting to bridge...");
  const [typeText, setTypeText] = useState("");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Health check / connect ──────────────────────────────────
  const checkConnection = useCallback(async () => {
    // Try local bridge first (works when on localhost:3000 dev server)
    try {
      const res = await fetch(BRIDGE_URL + "/api/health");
      if (res.ok) {
        const data = await res.json();
        setStatus("connected");
        setStatusMsg("Connected \u00b7 " + (data.session || "bridge").slice(0, 12));
        return true;
      }
    } catch {}
    // Fallback: check via Vercel relay (works on HTTPS/deployed dashboard)
    try {
      const res = await fetch(RELAY_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setStatus("connected");
          setStatusMsg("Connected \u00b7 " + (data.deviceId || "desktop"));
          return true;
        } else {
          setStatus("error");
          setStatusMsg("Bridge offline \u2014 start bridge/server.js");
          return false;
        }
      }
    } catch {}
    setStatus("error");
    setStatusMsg("Bridge unreachable \u2014 start bridge/server.js");
    return false;
  }, []);

  // ── Fetch screenshot ────────────────────────────────────────
  const fetchScreenshot = useCallback(async () => {
    try {
      const url = await callApi("/api/control/screenshot") as string;
      // Revoke old URL
      if (screenshot && screenshot.startsWith("blob:")) {
        URL.revokeObjectURL(screenshot);
      }
      setScreenshot(url);
      setStatus("connected");
    } catch (err: any) {
      setStatusMsg("Screenshot failed: " + err.message);
      if (status === "connected") setStatus("error");
    }
  }, [screenshot, status]);

  // ── Run action ──────────────────────────────────────────────
  const runAction = useCallback(async (action: string, params?: Record<string, unknown>) => {
    setActionFeedback(null);
    try {
      const result = await callApi("/api/control", { action, ...params });
      setActionFeedback(result.success ? "\u2713 " + action : "\u2717 " + result.error);
      // Refresh screenshot after action
      setTimeout(() => fetchScreenshot(), 300);
    } catch (err: any) {
      setActionFeedback("\u2717 " + err.message);
    }
  }, [fetchScreenshot]);

  // ── Click on screenshot ─────────────────────────────────────
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const scaleX = screenSize.width / rect.width;
    const scaleY = screenSize.height / rect.height;
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    runAction("click", { x, y, button: "left", count: 1 });
  }, [screenSize, runAction]);

  // ── Send typed text ─────────────────────────────────────────
  const handleType = useCallback(() => {
    if (!typeText.trim()) return;
    runAction("type", { text: typeText });
    setTypeText("");
  }, [typeText, runAction]);

  // ── Auto-refresh ────────────────────────────────────────────
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchScreenshot, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchScreenshot]);

  // ── Initial load ─────────────────────────────────────────────
  useEffect(() => {
    checkConnection().then((ok) => {
      if (ok) fetchScreenshot();
    });
  }, [checkConnection, fetchScreenshot]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (screenshot && screenshot.startsWith("blob:")) {
        URL.revokeObjectURL(screenshot);
      }
    };
  }, [screenshot]);

  // ── Quick action buttons ────────────────────────────────────
  const quickActions = [
    { label: "Refresh", icon: RefreshCw, action: () => fetchScreenshot(), danger: false },
    { label: "Lock PC", icon: Lock, action: () => runAction("system", { command: "lock" }), danger: false },
    { label: "Sleep", icon: Moon, action: () => runAction("system", { command: "sleep" }), danger: false },
    { label: "Vol Up", icon: Volume2, action: () => runAction("system", { command: "volume_up" }), danger: false },
    { label: "Vol Dn", icon: VolumeX, action: () => runAction("system", { command: "volume_down" }), danger: false },
    { label: "Desktop", icon: Maximize2, action: () => runAction("system", { command: "show_desktop" }), danger: false },
    { label: "Chrome", icon: Globe, action: () => runAction("open", { target: "https://google.com" }), danger: false },
  ];

  const keyShortcuts = [
    { label: "Ctrl+C", keys: ["ctrl","c"], icon: Copy },
    { label: "Ctrl+V", keys: ["ctrl","v"], icon: Clipboard },
    { label: "Ctrl+Z", keys: ["ctrl","z"], icon: X },
    { label: "Ctrl+A", keys: ["ctrl","a"], icon: Zap },
    { label: "Win+D", keys: ["win","d"], icon: Maximize2 },
    { label: "Win+E", keys: ["win","e"], icon: Globe },
    { label: "Alt+Tab", keys: ["alt","tab"], icon: RefreshCw },
  ];

  return (
    <div className="animate-slide-in space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Monitor className="w-6 h-6 text-primary" />
            Remote Control
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Control your desktop from the dashboard
          </p>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          status === "connected"
            ? "bg-accent/10 text-accent border border-accent/20"
            : status === "connecting"
            ? "bg-warning/10 text-warning border border-warning/20"
            : "bg-danger/10 text-danger border border-danger/20"
        }`}>
          {status === "connected" ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : status === "connecting" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          {statusMsg}
        </div>
      </div>

      {/* Action feedback toast */}
      {actionFeedback && (
        <div
          className={`px-4 py-2 rounded-lg text-sm animate-slide-in ${
            actionFeedback.startsWith("\u2713")
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}
        >
          {actionFeedback}
        </div>
      )}

      {/* Screenshot viewport */}
      <div
        ref={containerRef}
        className="relative bg-surface border border-border rounded-xl overflow-hidden shadow-2xl"
        style={{ minHeight: 300 }}
      >
        {screenshot ? (
          <img
            ref={imgRef}
            src={screenshot}
            alt="Desktop screenshot"
            onClick={handleImageClick}
            className="w-full cursor-crosshair hover:opacity-95 transition-opacity"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            {status === "connecting" ? (
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            ) : status === "error" ? (
              <AlertTriangle className="w-10 h-10 text-danger" />
            ) : (
              <Image className="w-10 h-10" />
            )}
            <span className="text-sm">{statusMsg}</span>
            {status !== "connecting" && (
              <button
                onClick={fetchScreenshot}
                className="px-4 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20 transition-colors"
              >
                Capture Screenshot
              </button>
            )}
          </div>
        )}

        {/* Click hint overlay */}
        {screenshot && (
          <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-text-muted flex items-center gap-1.5">
            <MousePointer2 className="w-3.5 h-3.5" />
            Click anywhere on the screen to click there
          </div>
        )}

        {/* Auto-refresh toggle */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-accent/20 text-accent border border-accent/30"
                : "bg-surface-2 text-text-muted border border-border hover:text-text-secondary"
            }`}
          >
            {autoRefresh ? "Auto 5s" : "Auto: Off"}
          </button>
        </div>
      </div>

      {/* Controls grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Type text ─────────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-primary" />
            Type Text
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={typeText}
              onChange={(e) => setTypeText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleType()}
              placeholder="Type something..."
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              onClick={handleType}
              disabled={!typeText.trim()}
              className="px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Quick actions ─────────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Zap className="w-4 h-4 text-warning" />
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  qa.danger
                    ? "bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20"
                    : "bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-border border border-border"
                }`}
              >
                <qa.icon className="w-3.5 h-3.5" />
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Keyboard shortcuts ────────────────────────────── */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-secondary" />
            Keyboard Shortcuts
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {keyShortcuts.map((ks) => (
              <button
                key={ks.label}
                onClick={() => runAction("key", { keys: ks.keys })}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-border border border-border transition-all font-mono"
              >
                <ks.icon className="w-3 h-3" />
                {ks.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll controls */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-primary" />
          Scroll
        </span>
        <button
          onClick={() => runAction("scroll", { direction: "up", amount: 5 })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-border border border-border transition-all"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          Up
        </button>
        <button
          onClick={() => runAction("scroll", { direction: "down", amount: 5 })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-border border border-border transition-all"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          Down
        </button>
        <span className="text-xs text-text-muted ml-auto">
          Click screenshot to click &middot; Type in the input to type remotely
        </span>
      </div>
    </div>
  );
}
