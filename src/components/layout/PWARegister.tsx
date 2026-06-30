"use client";

import { useEffect, useState } from "react";

export default function PWARegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setRegistration(reg);

          // Listen for updates
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch(() => {
          // Service worker registration failed — non-critical
        });

      // Also check for updates on page load
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().catch(() => {});
      });
    }

    // Listen for PWA install prompt
    let deferredPrompt: any = null;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] glass-strong rounded-xl px-4 py-3 border border-primary/30 shadow-lg animate-slide-in flex items-center gap-3">
          <span className="text-sm text-text-primary">Update available</span>
          <button
            onClick={handleUpdate}
            className="px-3 py-1 bg-primary text-background text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}
    </>
  );
}
