"use client";

// ============================================================
// 555 Command Center — unified persisted data store
// All collections live here, backed by localStorage so data
// survives tab navigation and page reloads. One provider wraps
// the whole app (see app/layout.tsx).
// ============================================================

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type {
  Lead,
  SavedAudit,
  Client,
  Project,
  Task,
  Revenue,
  EmailLog,
  Subscription,
  Notification,
  AuditMetrics,
} from "./types";

const KEY = "555-cmd-store-v1";

interface StoreShape {
  leads: Lead[];
  audits: SavedAudit[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  revenue: Revenue[];
  subscriptions: Subscription[];
  emailLogs: EmailLog[];
  notifications: Notification[];
}

const EMPTY: StoreShape = {
  leads: [],
  audits: [],
  clients: [],
  projects: [],
  tasks: [],
  revenue: [],
  subscriptions: [],
  emailLogs: [],
  notifications: [],
};

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

interface DataContextValue extends StoreShape {
  hydrated: boolean;
  /** "local" = KV not configured (browser-only); "synced" = saved to cloud; "saving"; "offline" = save failed. */
  syncStatus: "loading" | "local" | "synced" | "saving" | "offline";

  // setters (functional updates supported)
  setLeads: (v: Lead[] | ((p: Lead[]) => Lead[])) => void;
  setAudits: (v: SavedAudit[] | ((p: SavedAudit[]) => SavedAudit[])) => void;
  setClients: (v: Client[] | ((p: Client[]) => Client[])) => void;
  setProjects: (v: Project[] | ((p: Project[]) => Project[])) => void;
  setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void;
  setRevenue: (v: Revenue[] | ((p: Revenue[]) => Revenue[])) => void;
  setNotifications: (v: Notification[] | ((p: Notification[]) => Notification[])) => void;
  setSubscriptions: (v: Subscription[] | ((p: Subscription[]) => Subscription[])) => void;
  setEmailLogs: (v: EmailLog[] | ((p: EmailLog[]) => EmailLog[])) => void;
  /** Log an email and auto-update the linked lead/client. */
  logEmail: (entry: Omit<EmailLog, "id" | "sentAt">) => void;

  // ---- notification helpers ----
  addNotification: (message: string, type?: Notification["type"], link?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  // ---- conversion actions ----
  /** Attach a fresh audit's metrics onto an existing lead and bump its status. */
  attachAuditToLead: (leadId: string, audit: AuditMetrics) => void;
  /** Create a new lead from a saved audit. Returns the new lead id. */
  leadFromAudit: (audit: SavedAudit) => string;
  /** Convert a lead into a client. Returns the new client id (or existing one). */
  convertLeadToClient: (leadId: string, value?: number) => string;
  /** Spin up a project for a client. Returns the new project id. */
  createProjectForClient: (
    clientId: string,
    opts?: { name?: string; tier?: string; value?: number; dueDate?: string }
  ) => string;
  /** One-shot: lead -> client -> project. Returns ids. */
  convertLeadToProject: (
    leadId: string,
    opts?: { name?: string; tier?: string; value?: number; dueDate?: string }
  ) => { clientId: string; projectId: string };
  /** Log a payment against a project. */
  addRevenueForProject: (
    projectId: string,
    amount: number,
    type: Revenue["type"],
    status?: Revenue["status"]
  ) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] =
    useState<DataContextValue["syncStatus"]>("loading");

  // tracks whether the cloud (Blob) is the source of truth
  const cloudEnabledRef = useRef(false);
  // debounce timer for cloud saves
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // skip the very first persist (right after we load) so we don't echo back
  const skipNextSaveRef = useRef(true);

  // ---- initial load: localStorage first (instant), then KV (authoritative) ----
  useEffect(() => {
    let cancelled = false;

    // 1. paint immediately from local cache
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setStore({ ...EMPTY, ...JSON.parse(raw) });
    } catch (e) {
      console.error("local cache read failed", e);
    }

    // 2. then reconcile with the cloud
    (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;

        if (json.configured && json.data) {
          // cloud wins — it's shared across devices
          cloudEnabledRef.current = true;
          skipNextSaveRef.current = true;
          setStore({ ...EMPTY, ...json.data });
          setSyncStatus("synced");
        } else if (json.configured) {
          // KV is on but empty — we'll seed it on first save
          cloudEnabledRef.current = true;
          setSyncStatus("synced");
        } else {
          // KV not provisioned yet — stay browser-only
          cloudEnabledRef.current = false;
          setSyncStatus("local");
        }
      } catch {
        // network/API error — fall back to local-only
        cloudEnabledRef.current = false;
        setSyncStatus("offline");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- persist on every change ----
  useEffect(() => {
    if (!hydrated) return;

    // always keep the local cache fresh (instant + offline resilience)
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) {
      console.error("local cache write failed", e);
    }

    // the load() reconcile sets state once; don't bounce that back to the server
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (!cloudEnabledRef.current) return; // local-only mode

    // debounce cloud writes so rapid edits collapse into one request
    setSyncStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/data", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(store),
        });
        const json = await res.json().catch(() => ({}));
        setSyncStatus(res.ok && json.saved ? "synced" : "offline");
      } catch {
        setSyncStatus("offline");
      }
    }, 700);
  }, [store, hydrated]);

  // sync across tabs/windows on the same device (instant, no server round-trip)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          skipNextSaveRef.current = true;
          setStore({ ...EMPTY, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // generic slice setter factory
  function sliceSetter<K extends keyof StoreShape>(key: K) {
    return (v: StoreShape[K] | ((p: StoreShape[K]) => StoreShape[K])) =>
      setStore((prev) => ({
        ...prev,
        [key]: typeof v === "function" ? (v as (p: StoreShape[K]) => StoreShape[K])(prev[key]) : v,
      }));
  }

  const setLeads = useCallback(sliceSetter("leads"), []);
  const setAudits = useCallback(sliceSetter("audits"), []);
  const setClients = useCallback(sliceSetter("clients"), []);
  const setProjects = useCallback(sliceSetter("projects"), []);
  const setTasks = useCallback(sliceSetter("tasks"), []);
  const setRevenue = useCallback(sliceSetter("revenue"), []);
  const setNotifications = useCallback(sliceSetter("notifications"), []);
  const setSubscriptions = useCallback(sliceSetter("subscriptions"), []);
  const setEmailLogs = useCallback(sliceSetter("emailLogs"), []);

  const logEmail = useCallback((entry: Omit<EmailLog, "id" | "sentAt">) => {
    const log: EmailLog = {
      ...entry,
      id: uid("e_"),
      sentAt: new Date().toISOString(),
    };
    setStore((prev) => {
      const next = { ...prev, emailLogs: [log, ...prev.emailLogs].slice(0, 500) };
      if (entry.leadId) {
        next.leads = prev.leads.map((l) =>
          l.id === entry.leadId && (l.status === "found" || l.status === "audited")
            ? { ...l, status: "emailed" }
            : l
        );
      }
      // Add notification direct
      next.notifications = [{ id: uid("n_"), message: `Email sent: ${entry.subject}`, type: "info" as const, read: false, createdAt: new Date().toISOString(), link: "/emails" }, ...prev.notifications].slice(0, 100);
      return next;
    });
  }, []);

  // ---- notification helpers ----
  const addNotification = useCallback(
    (message: string, type: Notification["type"] = "info", link?: string) => {
      const notif: Notification = {
        id: uid("n_"),
        message,
        type,
        read: false,
        createdAt: new Date().toISOString(),
        link,
      };
      setStore((prev) => ({ ...prev, notifications: [notif, ...prev.notifications].slice(0, 100) }));
    },
    []
  );

  const markNotificationRead = useCallback((id: string) => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  // ---- conversion actions ----

  const attachAuditToLead = useCallback((leadId: string, audit: AuditMetrics) => {
    setStore((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        l.id === leadId
          ? {
              ...l,
              audit,
              issues: audit.issues?.length ? audit.issues.slice(0, 6) : l.issues,
              status: l.status === "found" ? "audited" : l.status,
            }
          : l
      ),
    }));
  }, []);

  const leadFromAudit = useCallback((audit: SavedAudit) => {
    const id = uid("l_");
    const newLead: Lead = {
      id,
      businessName: audit.businessName || audit.url || "Untitled",
      website: audit.url || "",
      industry: "",
      issues: audit.result?.issues?.slice(0, 6) ?? [],
      status: audit.result ? "audited" : "found",
      contactEmail: "",
      notes: audit.manualNotes || "",
      audit: audit.result,
      source: "manual",
      createdAt: new Date().toISOString(),
    };
    setStore((prev) => ({
      ...prev,
      leads: [newLead, ...prev.leads],
      // link the saved audit back to this lead
      audits: prev.audits.map((a) => (a.id === audit.id ? { ...a, leadId: id } : a)),
    }));
    return id;
  }, []);

  const convertLeadToClient = useCallback((leadId: string, value = 0) => {
    let resultId = "";
    setStore((prev) => {
      const lead = prev.leads.find((l) => l.id === leadId);
      if (!lead) return prev;
      // already converted? return existing
      if (lead.convertedClientId) {
        resultId = lead.convertedClientId;
        return prev;
      }
      const clientId = uid("c_");
      resultId = clientId;
      const newClient: Client = {
        id: clientId,
        name: "",
        business: lead.businessName,
        email: lead.contactEmail || "",
        phone: "",
        website: lead.website || "",
        status: "contacted",
        value,
        notes: lead.notes || "",
        createdAt: new Date().toISOString(),
        fromLeadId: lead.id,
      };
      return {
        ...prev,
        clients: [newClient, ...prev.clients],
        leads: prev.leads.map((l) =>
          l.id === leadId ? { ...l, status: "converted", convertedClientId: clientId } : l
        ),
      };
    });
    return resultId;
  }, []);

  const createProjectForClient = useCallback(
    (
      clientId: string,
      opts?: { name?: string; tier?: string; value?: number; dueDate?: string }
    ) => {
      const projectId = uid("p_");
      setStore((prev) => {
        const client = prev.clients.find((c) => c.id === clientId);
        const newProject: Project = {
          id: projectId,
          clientId,
          client: client?.business || "",
          name: opts?.name || `${client?.business || "New"} Website`,
          status: "not-started",
          tier: opts?.tier || "full",
          value: opts?.value ?? client?.value ?? 0,
          startDate: new Date().toISOString().split("T")[0],
          dueDate: opts?.dueDate || "",
          progress: 0,
        };
        return {
          ...prev,
          projects: [newProject, ...prev.projects],
          // promote client to active when work starts
          clients: prev.clients.map((c) =>
            c.id === clientId && (c.status === "lead" || c.status === "contacted" || c.status === "proposal")
              ? { ...c, status: "active" }
              : c
          ),
        };
      });
      return projectId;
    },
    []
  );

  const convertLeadToProject = useCallback(
    (
      leadId: string,
      opts?: { name?: string; tier?: string; value?: number; dueDate?: string }
    ) => {
      const projectId = uid("p_");
      const clientId = uid("c_");
      setStore((prev) => {
        const lead = prev.leads.find((l) => l.id === leadId);
        if (!lead) return prev;
        const value = opts?.value ?? 0;
        // Create client from lead
        const client: Client = {
          id: clientId,
          name: lead.businessName,
          business: lead.businessName,
          email: lead.contactEmail || "",
          phone: lead.phone || "",
          website: lead.website || "",
          value,
          notes: lead.notes || "",
          createdAt: new Date().toISOString(),
          fromLeadId: lead.id,
          status: "active",
        };
        // Create project
        const project: Project = {
          id: projectId,
          clientId,
          client: client.business,
          name: opts?.name || `${client.business} Website`,
          status: "not-started",
          tier: opts?.tier || "full",
          value,
          startDate: new Date().toISOString().split("T")[0],
          dueDate: opts?.dueDate || "",
          progress: 0,
        };
        return {
          ...prev,
          clients: [client, ...prev.clients],
          projects: [project, ...prev.projects],
          leads: prev.leads.map((l) =>
            l.id === leadId ? { ...l, status: "converted", convertedClientId: clientId } : l
          ),
        };
      });
      return { clientId, projectId };
    },
    []
  );

  const addRevenueForProject = useCallback(
    (
      projectId: string,
      amount: number,
      type: Revenue["type"],
      status: Revenue["status"] = "pending"
    ) => {
      setStore((prev) => {
        const project = prev.projects.find((p) => p.id === projectId);
        const entry: Revenue = {
          id: uid("r_"),
          projectId,
          clientName: project?.client || "",
          amount,
          type,
          date: new Date().toISOString().split("T")[0],
          status,
        };
        return { ...prev, revenue: [entry, ...prev.revenue] };
      });
    },
    []
  );

  const value: DataContextValue = {
    ...store,
    hydrated,
    syncStatus,
    setLeads,
    setAudits,
    setClients,
    setProjects,
    setTasks,
    setRevenue,
    setSubscriptions,
    setEmailLogs,
    logEmail,
    setNotifications,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    attachAuditToLead,
    leadFromAudit,
    convertLeadToClient,
    createProjectForClient,
    convertLeadToProject,
    addRevenueForProject,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
