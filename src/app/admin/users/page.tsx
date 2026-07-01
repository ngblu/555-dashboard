"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  UserCheck,
  MapPin,
  Mail,
  X,
  Eye,
  EyeOff,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useData } from "@/lib/store";
import type { User, UserRole } from "@/lib/types";

interface SafeUser extends Omit<User, "passwordHash"> {}

export default function UsersPage() {
  const { user: currentUser, addNotification } = useData();
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("salesman");
  const [area, setArea] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadUsers() {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function refreshFromEnv() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?reload=true");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
        addNotification(`Loaded ${data.users.length} users from env`, "info");
      }
    } catch {
      addNotification("Refresh failed", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setRole("salesman");
    setArea("");
    setFormError("");
    setShowPw(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, role, area: area || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create user");
        setSubmitting(false);
        return;
      }

      setUsers((prev) => [...prev, data.user]);
      addNotification(`User ${data.user.name} created`, "success", "/admin/users");
      resetForm();
      setShowAdd(false);
    } catch {
      setFormError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Delete ${userName}? This cannot be undone.`)) return;

    setDeleting(userId);
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        addNotification(`User ${userName} removed`, "info", "/admin/users");
      } else {
        addNotification(data.error || "Delete failed", "error");
      }
    } catch {
      addNotification("Network error", "error");
    } finally {
      setDeleting(null);
    }
  }

  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {users.length} user{users.length !== 1 ? "s" : ""} · {adminCount} admin{adminCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshFromEnv}
            disabled={loading}
            className="flex items-center gap-2 bg-surface-2 hover:bg-surface-2/80 text-text-secondary hover:text-text-primary border border-border rounded-lg px-3 py-2.5 text-sm transition-colors disabled:opacity-50"
            title="Reload users from USERS_JSON env var"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Add user modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-1 border border-border rounded-xl w-full max-w-md p-6 m-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-text-primary">Add User</h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {formError && (
                <div className="bg-danger/10 border border-danger/20 text-danger text-sm rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rep@example.com"
                  required
                  className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="salesman">Salesman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Area {role === "admin" && "(optional)"}
                  </label>
                  <input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder={role === "salesman" ? "Cookeville, TN" : "All areas"}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-2/80 rounded-lg border border-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-surface-1 border border-border rounded-xl p-12 text-center">
          <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted font-medium">No users yet</p>
          <p className="text-text-muted text-sm mt-1">Add salesmen so they can access their pipeline</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="bg-surface-1 border border-border rounded-xl p-4 flex items-center gap-4"
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 border-2 border-border ${
                  u.role === "admin"
                    ? "bg-gradient-to-br from-primary to-secondary"
                    : u.role === "manager"
                      ? "bg-gradient-to-br from-accent to-warning"
                      : "bg-gradient-to-br from-secondary to-accent"
                }`}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary text-sm">{u.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      u.role === "admin"
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : u.role === "manager"
                          ? "bg-warning/15 text-warning border border-warning/20"
                          : "bg-secondary/15 text-secondary border border-secondary/20"
                    }`}
                  >
                    {u.role === "admin" ? (
                      <span className="flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        Admin
                      </span>
                    ) : u.role === "manager" ? (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5" />
                        Manager
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-2.5 h-2.5" />
                        Salesman
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {u.email}
                  </span>
                  {u.area && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {u.area}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(u.id, u.name)}
                disabled={deleting === u.id || (u.role === "admin" && adminCount <= 1)}
                className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title={
                  u.role === "admin" && adminCount <= 1
                    ? "Cannot delete the last admin"
                    : `Remove ${u.name}`
                }
              >
                {deleting === u.id ? (
                  <span className="w-4 h-4 border-2 border-danger/30 border-t-danger rounded-full animate-spin block" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Export: copy USERS_JSON to Vercel env vars to persist across deploys */}
      <div className="mt-8 bg-surface-1 border border-warning/20 rounded-xl p-4">
        <p className="text-sm font-medium text-warning mb-2">⚠️ Persist Users</p>
        <p className="text-xs text-text-muted mb-3">
          Users are stored in-memory and will reset on redeploy. Copy this JSON into the{" "}
          <code className="bg-surface-2 px-1 rounded">USERS_JSON</code> environment variable in Vercel to keep them permanently.
        </p>
        <div className="relative">
          <pre className="bg-surface-2 border border-border rounded-lg p-3 text-xs text-text-primary overflow-x-auto max-h-40 whitespace-pre-wrap">
            {JSON.stringify(users)}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(users));
              addNotification("Copied USERS_JSON to clipboard", "success");
            }}
            className="absolute top-2 right-2 text-xs bg-primary hover:bg-primary-hover text-white rounded px-2 py-1 transition-colors"
          >
            Copy
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          Go to Vercel → Settings → Environment Variables → add <code>USERS_JSON</code> → paste → Save → Redeploy
        </p>
      </div>
    </div>
  );
}
