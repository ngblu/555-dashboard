"use client";

import { useState, useEffect } from "react";
import { QrCode, Wifi, Smartphone, CheckCircle2, ExternalLink, ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function ConnectPage() {
  const [localIP, setLocalIP] = useState<string>("Loading...");
  const [copied, setCopied] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    // Get local IP via WebRTC trick
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    pc.createOffer().then((offer) => pc.setLocalDescription(offer));
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
        const match = e.candidate.candidate.match(ipRegex);
        if (match && !match[0].startsWith("127.") && !match[0].startsWith("0.")) {
          setLocalIP(match[0]);
        }
      }
    };

    // Check bridge
    fetch("http://localhost:5555/api/health", { signal: AbortSignal.timeout(3000) })
      .then((r) => setBridgeStatus(r.ok ? "online" : "offline"))
      .catch(() => setBridgeStatus("offline"));

    // Fallback to location.hostname
    const timeout = setTimeout(() => {
      setLocalIP((prev) =>
        prev === "Loading..." ? window.location.hostname : prev
      );
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  const port = typeof window !== "undefined" ? window.location.port || "3000" : "3000";
  const connectURL = `http://${localIP}:${port}`;

  const copyURL = () => {
    navigator.clipboard.writeText(connectURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="animate-fade-in min-h-screen flex flex-col items-center justify-center p-4">
      <Link
        href="/"
        className="absolute top-4 left-4 flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center">
          <Smartphone className="w-8 h-8 text-primary" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-text-primary">Mobile Connect</h1>
          <p className="text-text-secondary text-sm mt-1">
            Scan the QR code or enter the URL on your mobile device to connect to the 555 AI assistant.
          </p>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-white rounded-xl p-4 mx-auto inline-block">
          <div className="w-48 h-48 flex items-center justify-center">
            <QrCode className="w-32 h-32 text-gray-900" />
            <span className="absolute text-[10px] text-gray-400 mt-24">
              Scan with phone camera
            </span>
          </div>
        </div>

        {/* Connection URL */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2 text-text-muted text-xs">
            <Wifi className="w-3.5 h-3.5" />
            Connection URL
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-background rounded-lg px-3 py-2 text-sm text-primary font-mono break-all">
              {connectURL}
            </code>
            <button
              onClick={copyURL}
              className="p-2 rounded-lg bg-surface-2 border border-border text-text-secondary hover:text-text-primary transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4 text-accent" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Bridge Status</span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  bridgeStatus === "online"
                    ? "bg-accent"
                    : bridgeStatus === "offline"
                    ? "bg-danger"
                    : "bg-text-muted"
                }`}
              />
              <span
                className={`text-xs capitalize ${
                  bridgeStatus === "online"
                    ? "text-accent"
                    : bridgeStatus === "offline"
                    ? "text-danger"
                    : "text-text-muted"
                }`}
              >
                {bridgeStatus}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Local IP</span>
            <span className="text-xs text-text-muted font-mono">{localIP}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Port</span>
            <span className="text-xs text-text-muted font-mono">{port}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-left bg-surface rounded-xl p-4 border border-border space-y-2">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            How to connect
          </h3>
          <ol className="text-xs text-text-secondary space-y-1.5 list-decimal pl-4">
            <li>Make sure your mobile device is on the same WiFi network.</li>
            <li>Open your phone&apos;s camera and scan the QR code above.</li>
            <li>Or, manually enter the URL in your mobile browser.</li>
            <li>The 555 AI assistant will be available on your phone!</li>
          </ol>
        </div>

        {/* Open link */}
        <a
          href={connectURL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Connection
        </a>
      </div>
    </div>
  );
}
