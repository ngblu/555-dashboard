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
  type ReactNode,
} from "react";
import type {
  Lead,
  SavedAudit,
  Client,
  Project,
  Task,
  Revenue,
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
}

const EMPTY: StoreShape = {
  leads: [],
  audits: [],
  clients: [],
  projects: [],
  tasks: [],
  revenue: [],
};

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

interface DataContextValue extends StoreShape {
  hydrated: boolean;

  // setters (functional updates supported)
  setLeads: (v: Lead[] | ((p: Lead[]) => Lead[])) => void;
  setAudits: (v: SavedAudit[] | ((p: SavedAudit[]) => SavedAudit[])) => void;
  setClients: (v: Client[] | ((p: Client[]) => Client[])) => void;
  setProjects: (v: Project[] | ((p: Project[]) => Project[])) => void;
  setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void;
  setRevenue: (v: Revenue[] | ((p: Revenue[]) => Revenue[])) => void;

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

  // hydrate from localStorage once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStore({ ...EMPTY, ...parsed });
      }
    } catch (e) {
      console.error("store hydrate failed", e);
    }
    setHydrated(true);
  }, []);

  // persist on every change (after hydration so we don't clobber with EMPTY)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) {
      console.error("store persist failed", e);
    }
  }, [store, hydrated]);

  // sync across tabs/windows
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
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
      const clientId = convertLeadToClient(leadId, opts?.value ?? 0);
      const projectId = createProjectForClient(clientId, opts);
      return { clientId, projectId };
    },
    [convertLeadToClient, createProjectForClient]
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
    setLeads,
    setAudits,
    setClients,
    setProjects,
    setTasks,
    setRevenue,
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
