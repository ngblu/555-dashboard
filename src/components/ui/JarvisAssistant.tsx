"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Loader2,
  ChevronDown,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useData } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceMessage {
  role: "user" | "assistant" | "system";
  text: string;
}

type AssistantState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "sleeping"
  | "wake-word-detected";

type ListeningMode = "push-to-talk" | "always-listening";

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const CONV_PREFIX = "jarvis-conv-";
const ACTIVE_PROJECT_KEY = "jarvis-active-project";
const LISTENING_MODE_KEY = "jarvis-listening-mode";

// ---------------------------------------------------------------------------
// Wake words (lowercase for comparison)
// ---------------------------------------------------------------------------

const WAKE_WORDS = ["hey 555", "jarvis", "hey jarvis"];

function loadConversation(projectId: string): VoiceMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONV_PREFIX + projectId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversation(projectId: string, messages: VoiceMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CONV_PREFIX + projectId, JSON.stringify(messages));
  } catch {
    // quota exceeded — silently ignore
  }
}

function loadListeningMode(): ListeningMode {
  if (typeof window === "undefined") return "push-to-talk";
  try {
    const raw = localStorage.getItem(LISTENING_MODE_KEY);
    return raw === "always-listening" ? "always-listening" : "push-to-talk";
  } catch {
    return "push-to-talk";
  }
}

function saveListeningMode(mode: ListeningMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LISTENING_MODE_KEY, mode);
  } catch {
    // silently ignore
  }
}

// ---------------------------------------------------------------------------
// Web Speech API helpers
// ---------------------------------------------------------------------------

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 1;
  u.volume = 1;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
}

/** Short rising chime using Web Audio API — fast and non-blocking */
function playChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.12);
    osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Web Audio not available — silently skip
  }
}

// ---------------------------------------------------------------------------
// API call — tries the local bridge (port 5555) first, then Hermes API (8642)
// ---------------------------------------------------------------------------

const BRIDGE_URL = "http://127.0.0.1:5555/api/query";
const BRIDGE_STREAM_URL = "http://127.0.0.1:5555/api/voice/stream";
const HERMES_API_URL = "http://127.0.0.1:8642/v1/chat/completions";
const API_KEY = process.env.NEXT_PUBLIC_HERMES_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Streaming helper — connects to bridge SSE, plays audio chunks as they arrive
// ---------------------------------------------------------------------------

interface StreamCallbacks {
  onStatus?: (state: string) => void;
  onText?: (chunk: string) => void;
  onAudio?: (base64: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (err: string) => void;
}

function streamFromBridge(
  history: VoiceMessage[],
  callbacks: StreamCallbacks
): { abort: () => void; audioQueue: HTMLAudioElement[] } {
  const audioQueue: HTMLAudioElement[] = [];
  let aborted = false;
  const controller = new AbortController();
  let fullText = "";

  // Audio queue player — plays chunks sequentially
  let isPlaying = false;
  function playNext() {
    if (isPlaying || audioQueue.length === 0) return;
    isPlaying = true;
    const audio = audioQueue.shift()!;
    audio.onended = () => {
      isPlaying = false;
      playNext();
    };
    audio.onerror = () => {
      isPlaying = false;
      playNext();
    };
    audio.play().catch(() => {
      isPlaying = false;
      playNext();
    });
  }
  function enqueueAudio(base64: string) {
    if (aborted) return;
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    audioQueue.push(audio);
    playNext();
  }

  const lastMsg = history[history.length - 1]?.text ?? "";

  fetch(BRIDGE_STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: lastMsg,
      messages: history.map((m) => ({
        role: m.role === "system" ? "assistant" : m.role,
        text: m.text,
      })),
    }),
    signal: controller.signal,
  }).then(async (res) => {
    if (!res.ok) {
      callbacks.onError?.(`Bridge returned ${res.status}`);
      return;
    }
    const reader = res.body?.getReader();
    if (!reader) { callbacks.onError?.("No response body"); return; }

    const decoder = new TextDecoder();
    let buffer = "";
    
    while (!aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events from buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      let currentEvent = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          const data = line.slice(6);
          switch (currentEvent) {
            case "status":
              try {
                const s = JSON.parse(data);
                callbacks.onStatus?.(s.state);
              } catch {}
              break;
            case "text":
              try {
                const t = JSON.parse(data);
                if (t.chunk) {
                  fullText += (fullText ? " " : "") + t.chunk;
                  callbacks.onText?.(t.chunk);
                }
                if (t.done) callbacks.onDone?.(fullText);
              } catch {}
              break;
            case "audio":
              enqueueAudio(data);
              break;
            case "done":
              try {
                const d = JSON.parse(data);
                fullText = d.fullText || fullText;
              } catch {}
              callbacks.onDone?.(fullText);
              break;
            case "error":
              try {
                const e = JSON.parse(data);
                callbacks.onError?.(e.message || data);
              } catch {
                callbacks.onError?.(data);
              }
              break;
          }
          currentEvent = "";
        }
      }
    }
    // If we got here from stream end without a done event
    if (fullText) callbacks.onDone?.(fullText);
  }).catch((err: any) => {
    if (err.name === "AbortError") return;
    callbacks.onError?.(err.message || "Stream failed");
  });

  return {
    abort: () => {
      aborted = true;
      controller.abort();
      // Stop all queued audio
      audioQueue.forEach((a) => {
        a.pause();
        a.src = "";
      });
      audioQueue.length = 0;
    },
    audioQueue,
  };
}

// ---------------------------------------------------------------------------
// Check if we're on a remote (Vercel) deployment — streaming only works local
// ---------------------------------------------------------------------------

function isMixedContentBlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

async function sendToHermes(
  history: VoiceMessage[],
): Promise<{ text: string; audio: string | null; ttsUrl: string | null }> {
  const lastMsg = history[history.length - 1]?.text ?? "";

  // ---- REMOTE MODE: Use Vercel relay when on HTTPS or not localhost ----
  if (isMixedContentBlocked() || window.location.hostname !== "localhost") {
    const relayUrl = "https://555-dashboard.vercel.app/api/bridge";
    try {
      const res = await fetch(relayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "send", action: "query", params: { text: lastMsg } }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.commandId) {
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await fetch(`${relayUrl}?cmdId=${json.commandId}`, { signal: AbortSignal.timeout(5000) });
            if (pollRes.ok) {
              const pollJson = await pollRes.json();
              if (pollJson.result) {
                const data = pollJson.result.data;
                const text = typeof data === "string" ? data : (data?.response ?? data ?? "(no response)");
                const audio = (data && typeof data === "object" && data.audio) ? data.audio : null;
                return { text, audio, ttsUrl: null };
              }
            }
          }
          return { text: "Bridge didn't respond in time. Is the desktop bridge running?", audio: null, ttsUrl: null };
        }
      }
    } catch {
      // Fall through to local attempts
    }
  }

  // ---- LOCAL MODE: Try bridge first (port 5555) with full message history ----
  try {
    const res = await fetch(BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: lastMsg,
        messages: history.map((m) => ({
          role: m.role === "system" ? "assistant" : m.role,
          text: m.text,
        })),
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.response) {
        // Fetch TTS via dashboard proxy (same-origin, works on both localhost and Vercel)
        let audio: string | null = null;
        if (json.ttsText) {
          try {
            const ttsProxyUrl = `/api/tts?text=${encodeURIComponent(json.ttsText)}`;
            const ttsRes = await fetch(ttsProxyUrl, { signal: AbortSignal.timeout(15000) });
            if (ttsRes.ok) {
              const blob = await ttsRes.blob();
              audio = URL.createObjectURL(blob);
            }
          } catch {
            // Proxy failed — try direct bridge URL as fallback
            if (json.ttsUrl) {
              try {
                const ttsRes = await fetch(json.ttsUrl, { signal: AbortSignal.timeout(10000) });
                if (ttsRes.ok) {
                  const blob = await ttsRes.blob();
                  audio = URL.createObjectURL(blob);
                }
              } catch { /* both failed, fall back to browser speech */ }
            }
          }
        }
        return { text: json.response, audio, ttsUrl: json.ttsUrl || null };
      }
    }
  } catch { /* bridge not available */ }

  // ---- Try Hermes API directly (port 8642) ----
  const messages = history.map((m) => ({
    role: m.role === "system" ? "assistant" : m.role,
    content: m.text,
  }));
  const payload = { model: "hermes-agent", messages, stream: false };

  try {
    const res = await fetch(HERMES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) throw new Error("Hermes API error: " + res.status);
    const json = await res.json();
    return { text: json.choices?.[0]?.message?.content ?? "(no response)", audio: null, ttsUrl: null };
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      throw new Error("Request timed out, is the Hermes gateway running?");
    }
    if (err instanceof TypeError || (err.message && err.message.includes("Failed to fetch"))) {
      if (isMixedContentBlocked()) {
        throw new Error("Using Vercel relay. Make sure the desktop bridge is running.");
      }
      throw new Error("Can't reach local Hermes. Run the bridge or start the Hermes gateway.");
    }
    throw err;
  }
}
// ---------------------------------------------------------------------------
// Holographic Ring — SVG-based animated orb
// ---------------------------------------------------------------------------

function HoloRing({ state }: { state: AssistantState }) {
  const isSleeping = state === "sleeping";
  const isWakeDetected = state === "wake-word-detected";

  const spinDuration = isSleeping
    ? 18
    : state === "thinking"
      ? 2
      : state === "speaking"
        ? 4
        : isWakeDetected
          ? 6
          : 12;

  const pulseScale = isSleeping
    ? 1.02
    : state === "speaking"
      ? 1.08
      : state === "listening" || isWakeDetected
        ? 1.05
        : 1;

  const outerRingOpacity = isSleeping ? 0.25 : 1;
  const midRingOpacity = isSleeping ? 0.15 : 1;
  const innerRingOpacity = isSleeping ? 0.3 : 1;

  const glowColor =
    isWakeDetected
      ? "rgba(0,255,170,0.6)"
      : state === "listening"
        ? "rgba(232,48,42,0.5)"
        : "rgba(0,212,255,0.4)";

  const glowLow =
    isSleeping
      ? ["0 0 8px rgba(0,212,255,0.04)", "0 0 16px rgba(0,212,255,0.02)", "0 0 8px rgba(0,212,255,0.04)"]
      : isWakeDetected
        ? ["0 0 30px rgba(0,255,170,0.3)", "0 0 55px rgba(0,255,170,0.15)", "0 0 30px rgba(0,255,170,0.3)"]
        : [
            "0 0 20px rgba(0,212,255,0.15), 0 0 60px rgba(0,212,255,0.05)",
            "0 0 35px rgba(0,212,255,0.25), 0 0 80px rgba(0,212,255,0.10)",
            "0 0 20px rgba(0,212,255,0.15), 0 0 60px rgba(0,212,255,0.05)",
          ];

  const dotColor =
    isWakeDetected
      ? "rgba(0,255,170,1)"
      : state === "listening"
        ? "#E8302A"
        : "#00D4FF";

  const dotGlow =
    isSleeping
      ? ["0 0 3px #00D4FF", "0 0 6px #00D4FF", "0 0 3px #00D4FF"]
      : isWakeDetected
        ? ["0 0 10px #00FFAA", "0 0 30px #00FFAA", "0 0 10px #00FFAA"]
        : state === "thinking"
          ? ["0 0 8px #00D4FF", "0 0 24px #00D4FF", "0 0 8px #00D4FF"]
          : state === "speaking"
            ? ["0 0 10px #00D4FF", "0 0 30px #00D4FF", "0 0 10px #00D4FF"]
            : state === "listening"
              ? ["0 0 6px #E8302A", "0 0 18px #E8302A", "0 0 6px #E8302A"]
              : ["0 0 4px #00D4FF", "0 0 12px #00D4FF", "0 0 4px #00D4FF"];

  return (
    <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        animate={{
          boxShadow: glowLow,
          scale: [1, pulseScale, 1],
        }}
        transition={{
          duration: isSleeping ? 3.5 : state === "speaking" ? 1.2 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Spinning outer ring */}
      <motion.svg
        width="150"
        height="150"
        viewBox="0 0 150 150"
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{
          duration: spinDuration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <circle
          cx="75"
          cy="75"
          r="68"
          fill="none"
          stroke={glowColor}
          strokeWidth="1.5"
          strokeDasharray="60 20 80 30 50 40"
          strokeLinecap="round"
          style={{ opacity: outerRingOpacity }}
        />
      </motion.svg>

      {/* Counter-rotating middle ring */}
      <motion.svg
        width="130"
        height="130"
        viewBox="0 0 130 130"
        className="absolute"
        animate={{ rotate: -360 }}
        transition={{
          duration: spinDuration * 1.3,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <circle
          cx="65"
          cy="65"
          r="58"
          fill="none"
          stroke={glowColor}
          strokeWidth="1"
          strokeDasharray="40 30 70 25"
          strokeLinecap="round"
          style={{ opacity: midRingOpacity }}
        />
      </motion.svg>

      {/* Inner ring */}
      <motion.svg
        width="110"
        height="110"
        viewBox="0 0 110 110"
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{
          duration: spinDuration * 0.7,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <circle
          cx="55"
          cy="55"
          r="48"
          fill="none"
          stroke={glowColor}
          strokeWidth="2"
          strokeDasharray="30 50 90 40"
          strokeLinecap="round"
          style={{ opacity: innerRingOpacity }}
        />
      </motion.svg>

      {/* Center dot / core */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 12, height: 12, backgroundColor: dotColor }}
        animate={{
          boxShadow: dotGlow,
          scale: state === "thinking" ? [1, 1.3, 1] : isSleeping ? [1, 1.08, 1] : [1, 1.15, 1],
        }}
        transition={{
          duration: isSleeping ? 2.5 : state === "thinking" ? 0.8 : 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Thinking / speaking: rotating geometric shapes */}
      {(state === "thinking" || state === "speaking") && (
        <>
          <motion.div
            className="absolute rounded-sm border border-primary/30"
            style={{ width: 24, height: 24 }}
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute rounded-sm border border-primary/20"
            style={{ width: 18, height: 18 }}
            animate={{ rotate: -360, scale: [1, 1.15, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        </>
      )}

      {/* Wake-word-detected: bright ring flash */}
      {isWakeDetected && (
        <motion.div
          className="absolute rounded-full border-2"
          style={{ width: 80, height: 80, borderColor: "rgba(0,255,170,0.6)" }}
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scanline overlay
// ---------------------------------------------------------------------------

function Scanline() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
      <div
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        style={{
          animation: "scanline 3s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Equalizer bars — shown when listening / speaking
// ---------------------------------------------------------------------------

function EqualizerBars({ active, count = 7 }: { active: boolean; count?: number }) {
  return (
    <div className="flex items-end gap-[3px] h-12">
      {Array.from({ length: count }).map((_, i) => {
        const baseDelay = i * 0.12;
        const heights = active
          ? [0.4, 0.8, 0.55, 0.95, 0.6, 0.75, 0.5]
          : [0.2, 0.35, 0.25, 0.4, 0.28, 0.32, 0.22];
        return (
          <motion.div
            key={i}
            className="w-[4px] rounded-full"
            style={{
              background:
                active && i % 2 === 0
                  ? "linear-gradient(to top, #E8302A, #FF6B6B)"
                  : "linear-gradient(to top, #00D4FF, rgba(0,212,255,0.3))",
            }}
            animate={{
              height: active ? ["30%", `${heights[i] * 100}%`, "30%"] : `${heights[i] * 48}px`,
              opacity: active ? [0.4, 1, 0.4] : 0.5,
            }}
            transition={{
              duration: active ? 0.55 : 2,
              delay: baseDelay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subtle breathing indicator for always-listening sleeping state
// ---------------------------------------------------------------------------

function SleepingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: "rgba(0,212,255,0.5)" }}
        animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[11px] font-mono text-primary/40 tracking-widest uppercase">
        LISTENING
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Particle burst for state transitions
// ---------------------------------------------------------------------------

function ParticleBurst({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const radius = 50 + Math.random() * 15;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full bg-primary/60"
                style={{ width: 3, height: 3, top: "50%", left: "50%" }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos(angle) * radius,
                  y: Math.sin(angle) * radius,
                  opacity: 0,
                  scale: 1,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Recording indicator — pulsing red dot
// ---------------------------------------------------------------------------

function RecordingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-2.5 h-2.5 rounded-full bg-torii"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[11px] font-mono text-torii tracking-widest uppercase">
        RECORDING
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wake-word detected indicator
// ---------------------------------------------------------------------------

function WakeDetectedIndicator() {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: "#00FFAA" }}
        animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.3, 1] }}
        transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[11px] font-mono text-[#00FFAA] tracking-widest uppercase">
        COMMAND MODE
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function JarvisAssistant() {
  const { clients, projects } = useData();

  // ---- state ----
  const [open, setOpen] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const [conversation, setConversation] = useState<VoiceMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [listeningMode, setListeningMode] = useState<ListeningMode>(loadListeningMode);

  // Active project ID for scoping conversations
  const [activeProjectId, setActiveProjectId] = useState<string>("__global__");
  const activeProjectLabel = useMemo(() => {
    if (activeProjectId === "__global__") return "555 Dashboard (Global)";
    const proj = projects.find((p) => p.id === activeProjectId);
    return proj ? `${proj.client}, ${proj.name}` : "555 Dashboard (Global)";
  }, [activeProjectId, projects]);

  // ---- refs ----
  const wakeWordRecognitionRef = useRef<any>(null);
  const commandRecognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Tracks whether we should keep the wake-word loop alive
  const shouldKeepListeningRef = useRef(false);
  // Tracks whether we're currently in the command phase (to avoid double-processing)
  const isInCommandPhaseRef = useRef(false);
  // Refs to break circular dependencies between hooks
  const listeningModeRef = useRef<ListeningMode>(listeningMode);
  listeningModeRef.current = listeningMode;
  const returnToSleepingRef = useRef<() => void>(() => {});
  const startCommandListeningRef = useRef<() => void>(() => {});

  // ---- load conversation when project changes ----
  useEffect(() => {
    setConversation(loadConversation(activeProjectId));
  }, [activeProjectId]);

  // ---- save conversation on change ----
  useEffect(() => {
    if (conversation.length > 0) {
      saveConversation(activeProjectId, conversation);
    }
  }, [conversation, activeProjectId]);

  // ---- auto-scroll ----
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversation]);

  // ---- close on Escape ----
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ---- helpers ----
  const addMessage = useCallback((msg: VoiceMessage) => {
    setConversation((prev) => [...prev, msg]);
  }, []);

  /** Stop any active recognition (wake-word or command) */
  const stopAllRecognition = useCallback(() => {
    try {
      wakeWordRecognitionRef.current?.stop();
    } catch {}
    try {
      commandRecognitionRef.current?.stop();
    } catch {}
    wakeWordRecognitionRef.current = null;
    commandRecognitionRef.current = null;
  }, []);

  /** Stop wake-word listening and clean up */
  const stopWakeWordListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    try {
      wakeWordRecognitionRef.current?.stop();
    } catch {}
    wakeWordRecognitionRef.current = null;
  }, []);

  /** Transition back to wake-word listening after a command cycle completes */
  const returnToSleeping = useCallback(() => {
    isInCommandPhaseRef.current = false;
    // Abort any active streaming connection
    if (streamAbortRef.current) {
      streamAbortRef.current();
      streamAbortRef.current = null;
    }
    // Stop any active TTS playback when transitioning
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (listeningModeRef.current === "always-listening") {
      setAssistantState("sleeping");
      // Small delay before restarting to avoid picking up residual audio
      setTimeout(() => {
        startWakeWordListening();
      }, 300);
    } else {
      setAssistantState("idle");
    }
  }, []);
  // Update the ref whenever returnToSleeping is recreated
  returnToSleepingRef.current = returnToSleeping;

  // ---- Interruption: stop current TTS, abort streaming, start listening ----
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSpeaking = useCallback(() => {
    // Abort streaming SSE connection
    if (streamAbortRef.current) {
      streamAbortRef.current();
      streamAbortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  // ---- query Hermes (streaming voice mode when local, fallback to batch when remote) ----
  const streamAbortRef = useRef<(() => void) | null>(null);
  const accumulatedTextRef = useRef("");

  const queryHermes = useCallback(
    async (userText: string) => {
      const currentHistory = loadConversation(activeProjectId);
      const updatedHistory: VoiceMessage[] = [
        ...currentHistory,
        { role: "user", text: userText },
      ];
      addMessage({ role: "user", text: userText });
      accumulatedTextRef.current = "";

      // ---- LOCALHOST: Sentence-by-sentence TTS playback (fast, reliable) ----
      const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
      if (isLocal) {
        setAssistantState("thinking");

        try {
          const result = await sendToHermes(updatedHistory);
          const fullText = result.text || "";
          accumulatedTextRef.current = fullText;
          addMessage({ role: "assistant", text: fullText });
          setAssistantState("speaking");

          if (!fullText) {
            returnToSleepingRef.current();
            return;
          }

          // Split into sentences for sequential TTS playback
          const sentences = fullText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);
          if (sentences.length === 0) sentences.push(fullText);

          const audioQueue: HTMLAudioElement[] = [];
          let isPlaying = false;
          let aborted = false;

          const playNext = () => {
            if (isPlaying || audioQueue.length === 0) return;
            isPlaying = true;
            const audio = audioQueue.shift()!;
            audio.onended = () => { isPlaying = false; playNext(); };
            audio.onerror = () => { isPlaying = false; playNext(); };
            audio.play().catch(() => { isPlaying = false; playNext(); });
          };

          const enqueue = (audio: HTMLAudioElement) => {
            if (aborted) return;
            audioQueue.push(audio);
            playNext();
          };

          streamAbortRef.current = () => {
            aborted = true;
            audioQueue.forEach((a) => { a.pause(); a.src = ""; });
            audioQueue.length = 0;
          };

          // Fetch TTS for each sentence and play in order
          for (const sentence of sentences) {
            if (aborted) break;
            try {
              const ttsUrl = `/api/tts?text=${encodeURIComponent(sentence)}`;
              const ttsRes = await fetch(ttsUrl, { signal: AbortSignal.timeout(15000) });
              if (ttsRes.ok) {
                const blob = await ttsRes.blob();
                const audio = new Audio(URL.createObjectURL(blob));
                enqueue(audio);
              }
            } catch {
              // TTS failed for this sentence — speak it with browser TTS
              if (!aborted) speak(sentence);
            }
          }

          // When playback finishes, return to sleeping
          const checkDone = setInterval(() => {
            if (audioQueue.length === 0 && !isPlaying) {
              clearInterval(checkDone);
              setAssistantState("idle");
              returnToSleepingRef.current();
            }
          }, 300);

        } catch (err: any) {
          addMessage({ role: "system", text: `⚠ ${err.message || "Failed to reach Hermes."}` });
          returnToSleepingRef.current();
        }
        return;
      }

      // ---- REMOTE (Vercel): Fall back to batch query ----
      setAssistantState("thinking");

      try {
        const result = await sendToHermes(updatedHistory);
        addMessage({ role: "assistant", text: result.text });
        setAssistantState("speaking");

        const playBridgeAudio = (src: string) => {
          const audio = new Audio(src);
          audioRef.current = audio;
          audio.onended = () => {
            audioRef.current = null;
            returnToSleepingRef.current();
          };
          audio.onerror = () => {
            audioRef.current = null;
            speak(result.text, () => returnToSleepingRef.current());
          };
          audio.play().catch(() => {
            audioRef.current = null;
            speak(result.text, () => returnToSleepingRef.current());
          });
        };

        if (result.audio) {
          playBridgeAudio(result.audio);
        } else if (result.ttsUrl) {
          playBridgeAudio(result.ttsUrl);
        } else {
          speak(result.text, () => returnToSleepingRef.current());
        }
      } catch (err: any) {
        addMessage({
          role: "system",
          text: `⚠ ${err.message || "Failed to reach Hermes."}`,
        });
        returnToSleepingRef.current();
      }
    },
    [activeProjectId, addMessage],
  );

  // ---- startCommandListening (defined after queryHermes) ----
  /** Start listening for a voice command (after wake-word detection) */
  const startCommandListening = useCallback(() => {
    if (!SpeechRecognition) return;
    isInCommandPhaseRef.current = true;

    // Stop wake-word recognition
    try {
      wakeWordRecognitionRef.current?.stop();
    } catch {}
    wakeWordRecognitionRef.current = null;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) {
        returnToSleepingRef.current();
        return;
      }
      setAssistantState("idle"); // briefly idle before processing
      await queryHermes(transcript);
    };

    rec.onerror = (event: any) => {
      const errMap: Record<string, string> = {
        "not-allowed": "Mic permission blocked. Check the lock/camera icon in your address bar.",
        "no-speech": "No speech detected. Try speaking louder or check your mic.",
        "audio-capture": "Couldn't access the microphone. Is another app using it?",
        network: "Network error, speech recognition needs internet (Chrome sends audio to Google).",
        aborted: "Listening aborted.",
        "language-not-supported": "English (US) not supported for speech recognition.",
        "service-not-allowed": "Speech service blocked. Check your browser settings.",
      };
      const reason = errMap[event.error] ?? `Speech recognition error: ${event.error}`;
      addMessage({ role: "system", text: reason });
      returnToSleepingRef.current();
    };

    rec.onend = () => {
      // If we got here without a result (no speech), return to sleeping
      if (isInCommandPhaseRef.current) {
        returnToSleepingRef.current();
      }
    };

    commandRecognitionRef.current = rec;
    setAssistantState("listening");
    try {
      rec.start();
    } catch (e) {
      returnToSleepingRef.current();
    }
  }, [addMessage, queryHermes]);
  // Update ref
  startCommandListeningRef.current = startCommandListening;

  // ---- wake-word listening (always-listening mode) ----
  const startWakeWordListening = useCallback(() => {
    if (!SpeechRecognition) return;
    if (isInCommandPhaseRef.current) return; // Don't restart if we're in command phase

    // Stop any existing instance first
    try {
      wakeWordRecognitionRef.current?.stop();
    } catch {}

    shouldKeepListeningRef.current = true;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event: any) => {
      // Check all results (including non-final) for wake words
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript: string = event.results[i][0].transcript.toLowerCase().trim();
        const found = WAKE_WORDS.some((ww) => transcript.includes(ww));
        if (found) {
          // Wake word detected!
          try {
            rec.stop();
          } catch {}
          wakeWordRecognitionRef.current = null;
          playChime();
          setAssistantState("wake-word-detected");
          // Brief pause then start command listening
          setTimeout(() => {
            startCommandListeningRef.current();
          }, 600);
          return;
        }
      }
    };

    rec.onerror = (event: any) => {
      // Don't log aborted — it's usually intentional
      if (event.error === "aborted" || event.error === "no-speech") {
        // Just restart if we should still be listening
        if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
          setTimeout(() => {
            if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
              startWakeWordListening();
            }
          }, 500);
        }
        return;
      }

      // For real errors, log and retry after delay
      const errMap: Record<string, string> = {
        "not-allowed": "Mic permission blocked. Check the lock/camera icon in your address bar.",
        "audio-capture": "Couldn't access the microphone. Is another app using it?",
        network: "Network error, speech recognition needs internet (Chrome sends audio to Google).",
        "language-not-supported": "English (US) not supported for speech recognition.",
        "service-not-allowed": "Speech service blocked. Check your browser settings.",
      };
      const reason = errMap[event.error] ?? `Speech recognition error: ${event.error}`;
      console.warn("[JARVIS wake-word]", reason);

      // Retry after 2 seconds
      if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
        setTimeout(() => {
          if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
            startWakeWordListening();
          }
        }, 2000);
      }
    };

    rec.onend = () => {
      // Auto-restart if we should still be listening and aren't in command phase
      if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
        setTimeout(() => {
          if (shouldKeepListeningRef.current && !isInCommandPhaseRef.current) {
            startWakeWordListening();
          }
        }, 300);
      }
    };

    wakeWordRecognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      // Already started — ignore
    }
  }, []);

  // ---- Start/stop wake-word listening when mode changes ----
  useEffect(() => {
    if (listeningMode === "always-listening") {
      // Request mic permission first
      const requestMicAndStart = async () => {
        if (!SpeechRecognition) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch (permErr: any) {
          const msg =
            permErr.name === "NotAllowedError"
              ? "Microphone access denied. Allow mic permission in your browser, then try again."
              : permErr.name === "NotFoundError"
                ? "No microphone found. Plug one in and try again."
                : `Microphone error: ${permErr.message}`;
          addMessage({ role: "system", text: msg });
          return;
        }
        setAssistantState("sleeping");
        startWakeWordListening();
      };
      requestMicAndStart();
    } else {
      // Switched to push-to-talk — stop wake-word listening
      stopWakeWordListening();
      isInCommandPhaseRef.current = false;
      if (assistantState === "sleeping" || assistantState === "wake-word-detected") {
        setAssistantState("idle");
      }
    }

    return () => {
      stopWakeWordListening();
    };
    // We only want this to run on mount and when listeningMode changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listeningMode]);

  // ---- Save listening mode preference ----
  const toggleListeningMode = useCallback(() => {
    setListeningMode((prev) => {
      const next: ListeningMode = prev === "push-to-talk" ? "always-listening" : "push-to-talk";
      saveListeningMode(next);
      return next;
    });
  }, []);

  // ---- speech recognition (push-to-talk mode) ----
  const startListening = useCallback(async () => {
    if (!SpeechRecognition) {
      addMessage({
        role: "system",
        text: "Speech recognition isn't available in this browser. Try Chrome or Edge.",
      });
      return;
    }

    // If in always-listening mode, stop wake-word and start command listening directly
    if (listeningModeRef.current === "always-listening") {
      stopWakeWordListening();
      // Brief pause then start command listening
      setTimeout(() => {
        startCommandListeningRef.current();
      }, 200);
      return;
    }

    // -- Push-to-talk: Request microphone permission first --
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch (permErr: any) {
      const msg =
        permErr.name === "NotAllowedError"
          ? "Microphone access denied. Allow mic permission in your browser, then try again."
          : permErr.name === "NotFoundError"
            ? "No microphone found. Plug one in and try again."
            : `Microphone error: ${permErr.message}`;
      addMessage({ role: "system", text: msg });
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) {
        setAssistantState("idle");
        return;
      }
      setAssistantState("idle");
      await queryHermes(transcript);
    };

    rec.onerror = (event: any) => {
      const errMap: Record<string, string> = {
        "not-allowed": "Mic permission blocked. Check the lock/camera icon in your address bar.",
        "no-speech": "No speech detected. Try speaking louder or check your mic.",
        "audio-capture": "Couldn't access the microphone. Is another app using it?",
        network: "Network error, speech recognition needs internet (Chrome sends audio to Google).",
        aborted: "Listening aborted.",
        "language-not-supported": "English (US) not supported for speech recognition.",
        "service-not-allowed": "Speech service blocked. Check your browser settings.",
      };
      const reason = errMap[event.error] ?? `Speech recognition error: ${event.error}`;
      addMessage({ role: "system", text: reason });
      setAssistantState("idle");
    };

    rec.onend = () => {
      if (assistantState === "listening") {
        setAssistantState("idle");
      }
    };

    commandRecognitionRef.current = rec;
    rec.start();
    setAssistantState("listening");
  }, [addMessage, queryHermes, assistantState, stopWakeWordListening]);

  const stopListening = useCallback(() => {
    commandRecognitionRef.current?.stop();
    returnToSleepingRef.current();
  }, []);

  // ---- text input ----
  const submitText = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg) return;
    setTextInput("");
    await queryHermes(msg);
  }, [textInput, queryHermes]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  // ---- clear conversation ----
  const clearConversation = useCallback(() => {
    setConversation([]);
    saveConversation(activeProjectId, []);
    stopSpeaking();
    if (listeningModeRef.current !== "always-listening") {
      setAssistantState("idle");
    }
  }, [activeProjectId, stopSpeaking]);

  // ---- build project options from clients -----
  const projectOptions = useMemo(() => {
    const opts: { id: string; label: string }[] = [
      { id: "__global__", label: "555 Dashboard (Global)" },
    ];
    for (const p of projects) {
      opts.push({
        id: p.id,
        label: `${p.client}, ${p.name}`,
      });
    }
    return opts;
  }, [projects]);

  // ---- panel animation variants ----
  const panelVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 20, scale: 0.95 },
  };

  // ---- derived state for UI ----
  const isAlwaysOn = listeningMode === "always-listening";
  const isSleeping = assistantState === "sleeping";
  const fabSparkles = assistantState === "sleeping" || assistantState === "wake-word-detected";

  // ----
  return (
    <>
      {/* ---------- FAB ---------- */}
      <motion.button
        data-jarvis-fab
        onClick={() => setOpen((p) => !p)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`
          fixed bottom-4 right-4 sm:bottom-6 sm:right-24 z-50 flex h-14 w-14 items-center justify-center
          rounded-full shadow-lg transition-all duration-300
          ${
            open
              ? "bg-surface border-2 border-primary/30 shadow-primary/10"
              : "bg-gradient-to-br from-primary to-cyan-400 text-background shadow-primary/25 hover:shadow-primary/40"
          }
        `}
        aria-label={open ? "Close JARVIS" : "JARVIS voice assistant"}
      >
        {open ? (
          <X size={22} />
        ) : (
          <motion.div
            animate={
              fabSparkles
                ? { scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }
                : { scale: 1, opacity: 1 }
            }
            transition={{
              duration: isSleeping ? 3 : 1.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Sparkles size={22} />
          </motion.div>
        )}
      </motion.button>

      {/* ---------- Panel ---------- */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="
              fixed bottom-20 right-0 sm:bottom-24 sm:right-24 z-50 flex w-full sm:w-[420px] max-w-[100vw] sm:max-w-[calc(100vw-3rem)]
              max-h-[80vh] flex-col rounded-2xl overflow-hidden
              border border-primary/20 shadow-2xl shadow-black/60
            "
            style={{
              background:
                "linear-gradient(135deg, rgba(12,13,20,0.92), rgba(6,7,11,0.95))",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              boxShadow:
                "0 0 30px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Scanline overlay */}
            <Scanline />

            {/* ---------- Header ---------- */}
            <div className="relative flex items-center justify-between px-5 py-3 border-b border-primary/10 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-primary" />
                <span className="text-xs font-semibold tracking-widest uppercase text-primary font-mono">
                  J.A.R.V.I.S.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Listening mode toggle */}
                <button
                  onClick={toggleListeningMode}
                  className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider
                    text-text-muted hover:text-primary transition-colors cursor-pointer"
                  title={
                    isAlwaysOn
                      ? "Switch to push-to-talk mode"
                      : "Switch to always-listening mode"
                  }
                >
                  {isAlwaysOn ? (
                    <>
                      <span className="text-primary/60">ALWAYS ON</span>
                      <ToggleRight size={15} className="text-primary" />
                    </>
                  ) : (
                    <>
                      <span className="text-text-muted/40">PUSH-TO-TALK</span>
                      <ToggleLeft size={15} className="text-text-muted/30" />
                    </>
                  )}
                </button>

                {/* Mode indicator dot when always-listening and sleeping */}
                {isAlwaysOn && isSleeping && (
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(0,212,255,0.5)" }}
                    animate={{ opacity: [0.2, 0.7, 0.2] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Project selector */}
                <div className="relative">
                  <select
                    value={activeProjectId}
                    onChange={(e) => {
                      setActiveProjectId(e.target.value);
                      if (listeningMode === "push-to-talk") {
                        setAssistantState("idle");
                      }
                    }}
                    className="
                      appearance-none bg-surface-2 border border-border-bright
                      text-text-secondary text-[11px] font-mono rounded-lg
                      pl-3 pr-8 py-1.5 focus:outline-none focus:border-primary/40
                      cursor-pointer hover:border-primary/30 transition-colors
                      max-w-[180px] truncate
                    "
                    title={activeProjectLabel}
                  >
                    {projectOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={10}
                    className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted"
                  />
                </div>
              </div>
            </div>

            {/* ---------- Holographic Visualization Area ---------- */}
            <div className="relative flex flex-col items-center justify-center py-5 shrink-0">
              {/* State label */}
              <motion.div
                className="font-mono text-[10px] tracking-[0.3em] uppercase mb-3"
                animate={{
                  color:
                    assistantState === "sleeping"
                      ? "rgba(0,212,255,0.4)"
                      : assistantState === "wake-word-detected"
                        ? "#00FFAA"
                        : assistantState === "listening"
                          ? "#E8302A"
                          : assistantState === "speaking"
                            ? "#00D4FF"
                            : assistantState === "thinking"
                              ? "#FFB800"
                              : "#5C5C78",
                }}
                transition={{ duration: 0.3 }}
              >
                {assistantState === "sleeping"
                  ? "◈ Always Listening"
                  : assistantState === "wake-word-detected"
                    ? "◆ Wake Detected"
                    : assistantState === "listening"
                      ? "● Listening"
                      : assistantState === "thinking"
                        ? "◈ Processing"
                        : assistantState === "speaking"
                          ? "◆ Responding"
                          : "◇ Standby"}
              </motion.div>

              {/* Holographic ring */}
              <div className="relative flex items-center justify-center">
                <ParticleBurst
                  show={
                    assistantState === "listening" ||
                    assistantState === "wake-word-detected"
                  }
                />
                <HoloRing state={assistantState} />
              </div>

              {/* Equalizer / recording indicator */}
              <div className="mt-3">
                {assistantState === "sleeping" ? (
                  <SleepingIndicator />
                ) : assistantState === "wake-word-detected" ? (
                  <WakeDetectedIndicator />
                ) : assistantState === "listening" ? (
                  <RecordingIndicator />
                ) : (
                  <EqualizerBars active={assistantState === "speaking"} />
                )}
              </div>

              {/* Active project display */}
              <div className="mt-2 font-mono text-[10px] text-text-muted tracking-wider">
                {activeProjectLabel}
              </div>
            </div>

            {/* ---------- Transcript Log ---------- */}
            <div
              ref={scrollRef}
              className="relative flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-3 border-t border-primary/5"
              style={{ maxHeight: 220 }}
            >
              {conversation.length === 0 && (
                <p className="text-center text-text-muted text-[11px] font-mono py-3">
                  {isAlwaysOn
                    ? 'Say "Hey 555" or "Jarvis" to wake me.'
                    : "Tap the mic and speak, or type below."}
                  <br />
                  <span className="text-primary/40">
                    , JARVIS online, awaiting input,
                  </span>
                </p>
              )}

              <AnimatePresence initial={false}>
                {conversation.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.role === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-primary/10 text-text-primary border border-primary/20"
                          : m.role === "system"
                            ? "bg-warning/10 text-warning border border-warning/20 text-[11px] font-mono"
                            : "bg-surface-2 text-text-secondary border border-border"
                      }`}
                      style={
                        m.role === "assistant"
                          ? {
                              background:
                                "linear-gradient(135deg, rgba(18,19,28,0.8), rgba(12,13,20,0.9))",
                              borderColor: "rgba(0,212,255,0.12)",
                            }
                          : undefined
                      }
                    >
                      {m.text}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => {
                            setAssistantState("speaking");
                            speak(m.text, () => {
                              returnToSleepingRef.current();
                            });
                          }}
                          className="ml-2 inline align-middle text-text-muted hover:text-primary transition-colors"
                          title="Replay"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Thinking indicator */}
              {assistantState === "thinking" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div className="rounded-xl bg-surface-2 border border-primary/20 px-4 py-2.5 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span className="font-mono text-[10px] text-text-muted tracking-wider">
                      ANALYZING...
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* ---------- Input Area ---------- */}
            <div className="relative flex items-end gap-2 border-t border-primary/10 px-4 py-3 shrink-0">
              {/* Mic button — supports interruption while speaking */}
              <motion.button
                onClick={
                  assistantState === "speaking"
                    ? () => {
                        // INTERRUPT: stop TTS and immediately start listening
                        stopSpeaking();
                        setAssistantState("idle");
                        if (listeningModeRef.current === "always-listening") {
                          stopWakeWordListening();
                          setTimeout(() => startCommandListeningRef.current(), 200);
                        } else {
                          setTimeout(() => startListening(), 150);
                        }
                      }
                    : assistantState === "listening"
                      ? stopListening
                      : assistantState === "sleeping" || assistantState === "wake-word-detected"
                        ? () => {
                            stopWakeWordListening();
                            setTimeout(() => startCommandListeningRef.current(), 200);
                          }
                        : startListening
                }
                disabled={assistantState === "thinking"}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
                className={`
                  flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                  transition-all duration-200
                  ${
                    assistantState === "speaking"
                      ? "bg-torii/20 border border-torii text-torii animate-pulse cursor-pointer"
                      : assistantState === "listening"
                        ? "bg-torii/20 border border-torii text-torii"
                        : assistantState === "sleeping"
                          ? "bg-primary/10 border border-primary/30 text-primary/60 hover:text-primary"
                          : assistantState === "wake-word-detected"
                            ? "bg-[#00FFAA]/10 border border-[#00FFAA]/40 text-[#00FFAA]"
                            : "bg-surface-2 border border-border-bright text-text-secondary hover:text-primary hover:border-primary/30"
                  }
                  disabled:opacity-30 disabled:cursor-not-allowed
                `}
                aria-label={
                  assistantState === "speaking"
                    ? "Interrupt and start listening"
                    : assistantState === "listening"
                      ? "Stop listening"
                      : assistantState === "sleeping"
                        ? "Wake JARVIS manually"
                        : "Start listening"
                }
              >
                {assistantState === "speaking" ? (
                  <MicOff size={16} />
                ) : assistantState === "listening" ? (
                  <MicOff size={16} />
                ) : (
                  <Mic size={16} />
                )}
              </motion.button>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={
                  isAlwaysOn
                    ? 'Say "Hey 555" or type here...'
                    : "Speak or type your command..."
                }
                rows={1}
                disabled={
                  assistantState === "thinking" ||
                  assistantState === "listening"
                }
                className="
                  flex-1 resize-none rounded-xl border border-primary/10 bg-background/60
                  px-3.5 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted
                  outline-none focus:border-primary/40 transition-all
                  font-mono disabled:opacity-30 backdrop-blur-sm
                "
                style={{
                  background: "rgba(6,7,11,0.6)",
                }}
              />

              {/* Send button */}
              {textInput.trim() && (
                <motion.button
                  onClick={submitText}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.93 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/90 text-background hover:bg-primary transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </motion.button>
              )}

              {/* Clear button */}
              {conversation.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-danger transition-colors ml-0.5"
                  title="Clear conversation"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
