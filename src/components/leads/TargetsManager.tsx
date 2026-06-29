"use client";

import { useState, useEffect } from "react";
import { MapPin, Plus, X, Save, Building2, Wrench } from "lucide-react";

type Target = { city: string; state: string; industry: string };

const INDUSTRIES = ["Plumbing", "HVAC", "Landscaping", "Roofing", "Electrical", "Painting", "Cleaning", "Pest Control", "Concrete", "Fencing", "Tree Service", "General Contracting", "Auto Repair"];

export default function TargetsManager() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newTarget, setNewTarget] = useState<Target>({ city: "", state: "", industry: "Plumbing" });

  useEffect(() => {
    fetch("http://localhost:5555/api/lead-finder/targets")
      .then((r) => r.json())
      .then((data) => setTargets(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addTarget = () => {
    if (!newTarget.city.trim() || !newTarget.state.trim()) return;
    setTargets((prev) => [...prev, { ...newTarget }]);
    setNewTarget({ city: "", state: "", industry: newTarget.industry });
  };

  const removeTarget = (idx: number) => {
    setTargets((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveTargets = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("http://localhost:5555/api/lead-finder/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer 555-remote-bridge" },
        body: JSON.stringify({ targets }),
      });
      if (res.ok) {
        setMsg("Saved! Changes take effect on next run.");
      } else {
        setMsg("Save failed. Is the bridge running?");
      }
    } catch {
      setMsg("Cannot reach bridge. Start it first.");
    }
    setSaving(false);
  };

  const inputCls = "bg-surface-2 border border-border rounded px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none";

  return (
    <div className="bg-surface border border-border rounded-xl p-3 sm:p-4 space-y-3 animate-slide-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Target Locations
        </h3>
        <button
          onClick={saveTargets}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-background rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-3 h-3" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Current targets */}
      <div className="flex flex-wrap gap-1.5">
        {loading ? (
          <span className="text-xs text-text-muted">Loading...</span>
        ) : targets.length === 0 ? (
          <span className="text-xs text-text-muted">No targets set. Add locations below.</span>
        ) : (
          targets.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs bg-primary/10 text-primary border border-primary/20"
            >
              <span className="font-medium">{t.city}, {t.state}</span>
              <span className="text-text-muted">·</span>
              <span>{t.industry}</span>
              <button
                onClick={() => removeTarget(i)}
                className="text-text-muted hover:text-danger ml-0.5"
                aria-label={`Remove ${t.city}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Add new target */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          placeholder="City"
          className={`${inputCls} w-24 sm:w-28`}
          value={newTarget.city}
          onChange={(e) => setNewTarget({ ...newTarget, city: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && addTarget()}
        />
        <input
          placeholder="State (e.g. TN)"
          className={`${inputCls} w-20 sm:w-24`}
          value={newTarget.state}
          onChange={(e) => setNewTarget({ ...newTarget, state: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && addTarget()}
        />
        <select
          className={`${inputCls} w-28 sm:w-32`}
          value={newTarget.industry}
          onChange={(e) => setNewTarget({ ...newTarget, industry: e.target.value })}
        >
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        <button
          onClick={addTarget}
          disabled={!newTarget.city.trim() || !newTarget.state.trim()}
          className="flex items-center gap-1 px-3 py-1.5 bg-accent/15 text-accent border border-accent/30 rounded-lg text-xs font-medium hover:bg-accent/25 transition-colors disabled:opacity-30"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {msg && (
        <div className={`text-xs px-2 py-1 rounded ${
          msg.includes("Saved") ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
        }`}>
          {msg}
        </div>
      )}
    </div>
  );
}
