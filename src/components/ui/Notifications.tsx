"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  CheckCheck,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useData } from "@/lib/store";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";

const iconMap: Record<Notification["type"], typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap: Record<Notification["type"], string> = {
  info: "text-primary border-primary/20 bg-primary/5",
  success: "text-accent border-accent/20 bg-accent/5",
  warning: "text-warning border-warning/20 bg-warning/5",
  error: "text-danger border-danger/20 bg-danger/5",
};

export default function NotificationsPanel() {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setNotifications,
  } = useData();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest("[data-notif-bell]")
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = (n: Notification) => {
    markNotificationRead(n.id);
    if (n.link) {
      router.push(n.link);
      setOpen(false);
    }
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <>
      {/* Bell icon in sidebar area - positioned via data attribute */}
      <button
        data-notif-bell
        onClick={() => setOpen(!open)}
        className="relative text-text-muted hover:text-text-primary transition-colors p-1"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)}>
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-14 right-4 w-80 max-h-[70vh] bg-surface-2 border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-in"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-[10px] text-text-muted">
                    ({unreadCount} new)
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-text-muted hover:text-text-primary p-1 rounded transition-colors"
                      title="Mark all read"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={clearAll}
                      className="text-text-muted hover:text-danger p-1 rounded transition-colors"
                      title="Clear all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications yet</p>
                  <p className="text-xs mt-1 opacity-60">
                    New activity will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => {
                    const Icon = iconMap[n.type];
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleClick(n)}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface ${
                          !n.read ? "bg-surface" : ""
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${colorMap[n.type]}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              !n.read ? "text-text-primary font-medium" : "text-text-secondary"
                            }`}
                          >
                            {n.message}
                          </p>
                          <p className="text-[10px] text-text-muted mt-1">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {n.link && (
                          <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0 mt-1" />
                        )}
                        {!n.read && (
                          <span className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
