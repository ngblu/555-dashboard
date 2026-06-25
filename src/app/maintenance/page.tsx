"use client";

import { useState } from "react";
import { RefreshCw, ExternalLink, Loader2, CheckCircle2, Wrench } from "lucide-react";
import { useData } from "@/lib/store";
import Link from "next/link";

export default function MaintenancePage() {
  const { clients, revenue } = useData();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Active clients that might want maintenance
  const activeClients = clients.filter(
    (c) => c.status === "active" || c.status === "completed"
  );

  // Clients with maintenance revenue (paid this month)
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
  const maintenanceRevenue = revenue.filter(
    (r) =>
      r.type === "maintenance" &&
      r.status === "paid" &&
      r.date &&
      new Date(r.date).getMonth() === now.getMonth()
  );

  const generateSubscriptionLink = async (name: string, email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: name, clientEmail: email }),
      });
      const data = await res.json();
      if (data.url) {
        setCheckoutUrl(data.url);
        window.open(data.url, "_blank");
        flash("Subscription checkout opened — send this link to your client");
      } else {
        flash(data.error || "Failed to create subscription link");
      }
    } catch {
      flash("Failed to connect to Stripe");
    }
    setLoading(false);
  };

  const inputCls =
    "bg-surface-2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-accent/15 border border-accent/40 text-accent px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-slide-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-secondary" /> Maintenance
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Monthly maintenance subscriptions — $99/mo per client
        </p>
      </div>

      {/* Quick send */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">
          Send Maintenance Subscription Link
        </h2>
        <p className="text-text-muted text-xs">
          Creates a Stripe checkout page for $99/mo recurring. Share the link
          with your client — they enter their card once and get billed monthly.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            placeholder="Client business name"
            className={`${inputCls} flex-1`}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <input
            placeholder="Client email (optional)"
            type="email"
            className={`${inputCls} flex-1`}
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
          />
          <button
            onClick={() => generateSubscriptionLink(clientName, clientEmail)}
            disabled={loading || !clientName.trim()}
            className="bg-primary text-background px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Generate Link
          </button>
        </div>
        {checkoutUrl && (
          <div className="bg-surface-2 border border-border rounded-lg p-3 break-all">
            <p className="text-text-muted text-xs mb-1">Subscription link:</p>
            <code className="text-primary text-xs">{checkoutUrl}</code>
          </div>
        )}
      </div>

      {/* Active clients eligible for maintenance */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-4">
          Active Clients ({activeClients.length})
        </h2>
        {activeClients.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <Wrench className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted text-sm">
              No active clients yet. Complete a project to offer maintenance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeClients.map((c) => {
              const onMaintenance = maintenanceRevenue.some(
                (r) => r.clientName === c.business
              );
              return (
                <div
                  key={c.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-text-primary font-medium">
                      {c.business}
                    </h3>
                    {c.email && (
                      <p className="text-text-muted text-xs">{c.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {onMaintenance && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                        Active Sub
                      </span>
                    )}
                    <button
                      onClick={() =>
                        generateSubscriptionLink(c.business, c.email)
                      }
                      disabled={loading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Subscribe
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="bg-surface border border-border rounded-xl p-6 text-center">
        <p className="text-text-muted text-sm">
          Need clients to self-serve? Send them to{" "}
          <Link
            href="/maintenance"
            className="text-primary hover:underline"
          >
            your agency maintenance page
          </Link>{" "}
          where they can subscribe directly.
        </p>
      </div>
    </div>
  );
}
