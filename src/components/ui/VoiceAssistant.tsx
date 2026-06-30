"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, X, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceMessage {
  role: "user" | "assistant";
  text: string;
}

// ---------------------------------------------------------------------------
// Web Speech API helpers
// ---------------------------------------------------------------------------

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

// ---------------------------------------------------------------------------
// API call to the 555 Voice Bridge running on localhost:5555
// ---------------------------------------------------------------------------

const BRIDGE_URL = process.env.NEXT_PUBLIC_VOICE_BRIDGE_URL ?? "http://127.0.0.1:5555";
const RELAY_URL = "https://555-dashboard.vercel.app/api/bridge";

function isMixedContentBlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:";
}

async function sendToHermes(userMessage: string): Promise<{ text: string; audio: string | null }> {
  // ---- REMOTE MODE: Use Vercel relay when on HTTPS ----
  if (isMixedContentBlocked()) {
    try {
      const res = await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "send", action: "query", params: { text: userMessage } }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.commandId) {
          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            const pollRes = await fetch(`${RELAY_URL}?cmdId=${json.commandId}`);
            if (pollRes.ok) {
              const pollJson = await pollRes.json();
              if (pollJson.result) {
                const data = pollJson.result.data;
                const text = typeof data === "string" ? data : (data?.response ?? data ?? "(no response)");
                const audio = (data && typeof data === "object" && data.audio) ? data.audio : null;
                return { text, audio };
              }
            }
          }
          return { text: "Bridge didn't respond in time.", audio: null };
        }
      }
    } catch {
      // Fall through
    }
  }

  // ---- LOCAL MODE: Try bridge ----
  try {
    const res = await fetch(`${BRIDGE_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userMessage }),
    });

    if (!res.ok) throw new Error(`Bridge error: ${res.status}`);

    const json = await res.json();
    return { text: json.response ?? "(no response)", audio: json.ttsUrl ?? null };
  } catch {
    throw new Error("Can't reach Hermes. Is the voice bridge running on port 5555?");
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [conversation, setConversation] = useState<VoiceMessage[]>([]);

  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ---- auto-scroll when new messages arrive ----
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation]);

  // ---- speech recognition setup ----
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", text: "Speech recognition isn't available in this browser. Try Chrome." },
      ]);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;

      setListening(false);
      setConversation((prev) => [...prev, { role: "user", text: transcript }]);
      setThinking(true);

      try {
        const result = await sendToHermes(transcript);
        setConversation((prev) => [...prev, { role: "assistant", text: result.text }]);
        // Play TTS audio if available, otherwise use browser speech
        if (result.audio) {
          const audioEl = new Audio(result.audio);
          audioEl.play().catch(() => speak(result.text));
        } else {
          speak(result.text);
        }
      } catch (err: any) {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", text: "Couldn't reach Hermes. Is the voice bridge running on port 5555?" },
        ]);
      } finally {
        setThinking(false);
      }
    };

    rec.onerror = () => {
      setListening(false);
      setConversation((prev) => [
        ...prev,
        { role: "assistant", text: "Didn't catch that, try again." },
      ]);
    };

    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  // ---- manual text fallback ----
  const [textInput, setTextInput] = useState("");

  const submitText = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg) return;
    setTextInput("");
    setConversation((prev) => [...prev, { role: "user", text: msg }]);
    setThinking(true);
    try {
      const result = await sendToHermes(msg);
      setConversation((prev) => [...prev, { role: "assistant", text: result.text }]);
      if (result.audio) {
        const audioEl = new Audio(result.audio);
        audioEl.play().catch(() => speak(result.text));
      } else {
        speak(result.text);
      }
    } catch {
      setConversation((prev) => [
        ...prev,
        { role: "assistant", text: "Couldn't reach Hermes. Is the API server running?" },
      ]);
    } finally {
      setThinking(false);
    }
  }, [textInput]);

  // ---- keyboard submit ----
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  // ---- close on escape ----
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // ----
  return (
    <>
      {/* ---------- FAB ---------- */}
      <button
        data-voice-fab
        onClick={() => setOpen((p) => !p)}
        className={`
          fixed bottom-6 right-24 z-50 flex h-14 w-14 items-center justify-center
          rounded-full shadow-lg transition-all duration-300 hover:scale-110
          ${open ? "bg-surface-2 border border-border-bright" : "bg-primary text-background"}
        `}
        aria-label={open ? "Close voice assistant" : "Open voice assistant"}
      >
        {open ? <X size={22} /> : <Mic size={22} />}
      </button>

      {/* ---------- Panel ---------- */}
      {open && (
        <div className="fixed bottom-24 right-24 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-border bg-surface shadow-2xl animate-slide-in">
          {/* header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Voice Assistant</h2>
            <span className="text-[10px] text-text-muted">Hermes API</span>
          </div>

          {/* messages */}
          <div
            ref={scrollRef}
            className="flex max-h-64 flex-col gap-3 overflow-y-auto px-5 py-4 text-sm"
          >
            {conversation.length === 0 && (
              <p className="text-center text-text-muted text-xs">
                Tap the mic and speak, or type below.
              </p>
            )}

            {conversation.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary/15 text-text-primary"
                      : "bg-surface-2 text-text-secondary"
                  }`}
                >
                  {m.text}
                  {m.role === "assistant" && (
                    <button
                      onClick={() => speak(m.text)}
                      className="ml-2 inline align-middle text-text-muted hover:text-primary transition-colors"
                      title="Replay"
                    >
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex gap-2">
                <div className="rounded-xl bg-surface-2 px-4 py-2.5">
                  <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* input row */}
          <div className="flex items-end gap-2 border-t border-border px-4 py-3">
            {/* mic button */}
            <button
              onClick={listening ? stopListening : startListening}
              disabled={thinking}
              className={`
                flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                transition-all duration-200
                ${
                  listening
                    ? "bg-torii text-white animate-pulse"
                    : "bg-surface-2 text-text-secondary hover:text-primary"
                }
                disabled:opacity-40
              `}
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* text input */}
            <textarea
              ref={inputRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message..."
              rows={1}
              disabled={thinking}
              className="
                flex-1 resize-none rounded-xl border border-border bg-background
                px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted
                outline-none focus:border-primary transition-colors
                disabled:opacity-40
              "
            />

            {/* send */}
            {textInput.trim() && (
              <button
                onClick={submitText}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-background transition hover:opacity-85"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
