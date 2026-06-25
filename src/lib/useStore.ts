"use client";

import { useState, useEffect, useCallback } from "react";

export interface Lead {
  id: string;
  businessName: string;
  name: string;
  email: string;
  website: string;
  budget: string;
  message: string;
  status: string;
  audit: { performance: number; seo: number; fcp: string; lcp: string; speedIndex: string } | null;
  createdAt: string;
  source?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  website: string;
  status: string;
  projectValue: number;
  signupDate: string;
  leadId?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  progress: number;
  value: number;
  paid: number;
  dueDate: string;
  leadId?: string;
  clientId?: string;
  stripePaymentId?: string;
}

export interface Audit {
  id: string;
  businessName: string;
  url: string;
  performance: number;
  seo: number;
  strategy: string;
  fetchedAt: string;
  googleInfo?: string;
  notes?: string;
}

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  plan: string;
  amount: number;
  interval: string;
  status: string;
  startDate: string;
  nextPayment: string;
  stripeSubId?: string;
}

export interface Payment {
  id: string;
  projectId: string;
  clientName: string;
  amount: number;
  status: string;
  date: string;
  stripePaymentId?: string;
}

interface StoreData {
  leads: Lead[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  audits: Audit[];
  subscriptions: Subscription[];
  payments: Payment[];
}

const EMPTY: StoreData = {
  leads: [], clients: [], projects: [], tasks: [], audits: [], subscriptions: [], payments: []
};

function loadLocal(): StoreData {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem("555-store");
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function saveLocal(data: StoreData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("555-store", JSON.stringify(data));
  } catch {}
}

let globalData: StoreData | null = null;
let fetchPromise: Promise<void> | null = null;

export function useStore() {
  const [data, setData] = useState<StoreData>(() => globalData || loadLocal());
  const [synced, setSynced] = useState(false);

  // Fetch from cloud on mount
  useEffect(() => {
    if (fetchPromise) return;
    fetchPromise = fetch("/api/data")
      .then(r => r.json())
      .then(cloud => {
        const local = loadLocal();
        // Merge: cloud wins for existing items, local for any newer items
        const merged = { ...EMPTY };
        for (const key of Object.keys(EMPTY) as (keyof StoreData)[]) {
          const cloudItems = cloud[key] || [];
          const localItems = local[key] || [];
          const cloudIds = new Set(cloudItems.map((i: { id: string }) => i.id));
          merged[key] = [...cloudItems, ...localItems.filter((i: { id: string }) => !cloudIds.has(i.id))];
        }
        globalData = merged;
        saveLocal(merged);
        setData({ ...merged });
        setSynced(true);
      })
      .catch(() => {
        setData(loadLocal());
        setSynced(true);
      });
  }, []);

  const sync = useCallback(async (newData: StoreData) => {
    globalData = newData;
    const clone: StoreData = JSON.parse(JSON.stringify(newData));
    setData(clone);
    saveLocal(newData);
    try {
      await fetch("/api/data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newData),
      });
    } catch {}
  }, []);

  const addLeads = useCallback((items: Lead[]) => {
    const newData = { ...(globalData || data), leads: [...items, ...(globalData || data).leads.filter(l => !items.find(i => i.id === l.id))] };
    sync(newData);
  }, [data, sync]);

  const addAudit = useCallback((item: Audit) => {
    const d = globalData || data;
    sync({ ...d, audits: [item, ...d.audits.filter(a => a.url !== item.url)] });
  }, [data, sync]);

  const convertLeadToClient = useCallback((lead: Lead) => {
    const d = globalData || data;
    const client: Client = {
      id: "c" + Date.now(),
      name: lead.businessName || lead.name,
      email: lead.email,
      phone: "",
      website: lead.website,
      status: "active",
      projectValue: 0,
      signupDate: new Date().toISOString(),
      leadId: lead.id,
    };
    sync({ ...d, clients: [client, ...d.clients], leads: d.leads.filter(l => l.id !== lead.id) });
    return client;
  }, [data, sync]);

  const convertLeadToProject = useCallback((lead: Lead) => {
    const d = globalData || data;
    const project: Project = {
      id: "p" + Date.now(),
      name: lead.businessName || lead.website || "New Project",
      client: lead.name,
      status: "planning",
      progress: 0,
      value: 0,
      paid: 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      leadId: lead.id,
    };
    sync({ ...d, projects: [project, ...d.projects], leads: d.leads.filter(l => l.id !== lead.id) });
    return project;
  }, [data, sync]);

  const convertProjectToClient = useCallback((project: Project) => {
    const d = globalData || data;
    const client: Client = {
      id: "c" + Date.now(),
      name: project.client || project.name,
      email: "",
      phone: "",
      website: "",
      status: "active",
      projectValue: project.value,
      signupDate: new Date().toISOString(),
      projectId: project.id,
    };
    sync({ ...d, clients: [client, ...d.clients] });
    return client;
  }, [data, sync]);

  const updateItem = useCallback(<K extends keyof StoreData>(key: K, id: string, updates: Partial<StoreData[K][number]>) => {
    const d = globalData || data;
    const arr = d[key] as unknown[];
    const idx = arr.findIndex((i: unknown) => (i as { id: string }).id === id);
    if (idx === -1) return;
    const updated = [...arr] as Record<string, unknown>[];
    updated[idx] = { ...updated[idx], ...(updates as Record<string, unknown>) };
    sync({ ...d, [key]: updated } as StoreData);
  }, [data, sync]);

  const removeItem = useCallback(<K extends keyof StoreData>(key: K, id: string) => {
    const d = globalData || data;
    sync({ ...d, [key]: (d[key] as unknown[]).filter((i: unknown) => (i as { id: string }).id !== id) } as StoreData);
  }, [data, sync]);

  return {
    ...data,
    synced,
    addLeads,
    addAudit,
    convertLeadToClient,
    convertLeadToProject,
    convertProjectToClient,
    updateItem,
    removeItem,
    sync: (d: StoreData) => sync(d),
  };
}
