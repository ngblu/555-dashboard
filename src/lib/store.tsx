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
  UserSession,
  SalesStage,
  Meeting,
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
  meetings: Meeting[];
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
  meetings: [],
};

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

interface DataContextValue extends StoreShape {
  hydrated: boolean;
  /** "local" = KV not configured (browser-only); "synced" = saved to cloud; "saving"; "offline" = save failed. */
  syncStatus: "loading" | "local" | "synced" | "saving" | "offline";

  // ---- auth ----
  user: UserSession | null;
  setUser: (u: UserSession | null) => void;
  loadingUser: boolean;

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
  setMeetings: (v: Meeting[] | ((p: Meeting[]) => Meeting[])) => void;
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

  toggleFavorite: (leadId: string) => void;
  // ---- sales pipeline (for salesman role) ----
  /** Move a lead to a new sales stage. */
  updateLeadStage: (leadId: string, stage: SalesStage) => void;
  /** Assign a lead to a salesman. */
  assignLead: (leadId: string, userId: string, area?: string) => void;
  /** Schedule a meeting for a lead. */
  addMeeting: (meeting: Omit<Meeting, "id" | "createdAt">) => Meeting;
  /** Update a meeting. */
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] =
    useState<DataContextValue["syncStatus"]>("loading");

  // ---- auth state ----
  const [user, setUserState] = useState<UserSession | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // tracks whether the cloud (Blob) is the source of truth
  const cloudEnabledRef = useRef(false);
  // debounce timer for cloud saves
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- fetch current user on mount ----
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) setUserState(data.user);
        }
      } catch {
        // not logged in — that's fine
      } finally {
        setLoadingUser(false);
      }
    })();
  }, []);

  const setUser = useCallback((u: UserSession | null) => {
    setUserState(u);
  }, []);
  // skip the very first persist (right after we load) so we don't echo back
  const skipNextSaveRef = useRef(true);

  // ---- initial load: localStorage first (instant), then server (authoritative) ----
  useEffect(() => {
    let cancelled = false;

    // 1. paint immediately from local cache
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setStore({ ...EMPTY, ...JSON.parse(raw) });
    } catch (e) {
      console.error("local cache read failed", e);
    }

    // 2. then reconcile with the server (KV or /tmp or Blob)
    (async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;

        if (json.data && (json.configured || json.source === "kv" || json.source === "tmp" || json.source === "blob")) {
          // server has authoritative data
          cloudEnabledRef.current = true;
          skipNextSaveRef.current = true;

          // If server data exists and is non-empty, use it
          const serverData = json.data as Record<string, unknown>;
          const hasData = Object.values(serverData).some(
            (v) => Array.isArray(v) && v.length > 0
          );

          if (hasData) {
            setStore({ ...EMPTY, ...serverData });
          } else {
            // Server is empty — seed it with our local data on next save
            // (the persist effect below will push local data up)
          }
          setSyncStatus("synced");
        } else {
          // No server backend available — stay browser-only
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
      let succeeded = false;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries && !succeeded) {
        try {
          const res = await fetch("/api/data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(store),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.saved) {
            setSyncStatus("synced");
            succeeded = true;
          } else if (retries < maxRetries) {
            // Wait before retry (exponential backoff: 1s, 2s)
            await new Promise((r) => setTimeout(r, (retries + 1) * 1000));
          } else {
            setSyncStatus("offline");
          }
        } catch {
          if (retries < maxRetries) {
            await new Promise((r) => setTimeout(r, (retries + 1) * 1000));
          } else {
            setSyncStatus("offline");
          }
        }
        retries++;
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
  const setMeetings = useCallback(sliceSetter("meetings"), []);

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

  // ---- leads favorites ----

  const toggleFavorite = useCallback((leadId: string) => {
    setStore((prev) => ({
      ...prev,
      leads: prev.leads.map((l) =>
        l.id === leadId ? { ...l, favorited: !l.favorited } : l
      ),
    }));
  }, []);

  // ---- sales pipeline ----

  const updateLeadStage = useCallback((leadId: string, stage: SalesStage) => {
    setStore((prev) => {
      const notifType: Notification["type"] =
        stage === "closed_won" ? "success" : stage === "closed_lost" ? "warning" : "info";
      return {
        ...prev,
        leads: prev.leads.map((l) =>
          l.id === leadId
            ? {
                ...l,
                salesStage: stage,
                stageUpdatedAt: new Date().toISOString(),
                ...(stage === "closed_won"
                  ? { status: "converted" as const }
                  : {}),
              }
            : l
        ),
        notifications: [
          {
            id: uid("n_"),
            message: `Lead "${prev.leads.find((l) => l.id === leadId)?.businessName || leadId}" moved to ${stage.replace(/_/g, " ")}`,
            type: notifType,
            read: false,
            createdAt: new Date().toISOString(),
            link: "/leads",
          },
          ...prev.notifications,
        ].slice(0, 100),
      };
    });
  }, []);

  const assignLead = useCallback(
    (leadId: string, userId: string, area?: string) => {
      setStore((prev) => ({
        ...prev,
        leads: prev.leads.map((l) =>
          l.id === leadId
            ? {
                ...l,
                assignedTo: userId,
                area: area || l.area,
                salesStage: (l.salesStage || "new") as SalesStage,
                stageUpdatedAt: new Date().toISOString(),
              }
            : l
        ),
      }));
    },
    []
  );

  // ---- meetings / calendar ----

  const addMeeting = useCallback(
    (meeting: Omit<Meeting, "id" | "createdAt">) => {
      const newMeeting: Meeting = {
        ...meeting,
        id: uid("m_"),
        createdAt: new Date().toISOString(),
      };
      setStore((prev) => {
        const notifType: Notification["type"] = "info";
        return {
          ...prev,
          meetings: [newMeeting, ...prev.meetings],
          notifications: [
            {
              id: uid("n_"),
              message: `Meeting scheduled: ${meeting.title} with ${meeting.leadName} on ${meeting.date}`,
              type: notifType,
              read: false,
              createdAt: new Date().toISOString(),
              link: "/calendar",
            },
            ...prev.notifications,
          ].slice(0, 100),
        };
      });
      return newMeeting;
    },
    []
  );

  const updateMeeting = useCallback(
    (id: string, updates: Partial<Meeting>) => {
      setStore((prev) => ({
        ...prev,
        meetings: prev.meetings.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }));
    },
    []
  );

  const value: DataContextValue = {
    ...store,
    hydrated,
    syncStatus,
    user,
    setUser,
    loadingUser,
    setLeads,
    setAudits,
    setClients,
    setProjects,
    setTasks,
    setRevenue,
    setSubscriptions,
    setEmailLogs,
    setMeetings,
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
    updateLeadStage,
    assignLead,
    toggleFavorite,
    addMeeting,
    updateMeeting,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within <DataProvider>");
  return ctx;
}
