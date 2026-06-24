"use client";

import { useState } from "react";
import { Users, Plus, Mail, Phone, Globe, X } from "lucide-react";

type Status = "lead" | "contacted" | "proposal" | "active" | "completed";

const statusColors: Record<Status, string> = {
  lead: "bg-text-muted/20 text-text-secondary",
  contacted: "bg-primary/20 text-primary",
  proposal: "bg-warning/20 text-warning",
  active: "bg-accent/20 text-accent",
  completed: "bg-secondary/20 text-secondary",
};

interface Client {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  status: Status;
  value: number;
  notes: string;
}

const initialClients: Client[] = [];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", business: "", email: "", phone: "", value: "", notes: "" });

  const addClient = () => {
    if (!form.name || !form.business) return;
    setClients([...clients, { ...form, id: "c" + Date.now(), status: "lead", value: Number(form.value) || 0 }]);
    setForm({ name: "", business: "", email: "", phone: "", value: "", notes: "" });
    setShowAdd(false);
  };

  const statusFlow: Status[] = ["lead", "contacted", "proposal", "active", "completed"];
  const cycleStatus = (id: string) => {
    setClients(clients.map(c => {
      if (c.id !== id) return c;
      const idx = statusFlow.indexOf(c.status);
      return { ...c, status: statusFlow[(idx + 1) % statusFlow.length] };
    }));
  };

  const inputCls = "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-primary focus:outline-none";

  const totalValue = clients.filter(c => c.status === "active" || c.status === "completed").reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-primary" /> Clients</h1>
          <p className="text-text-muted text-sm mt-1">{clients.length} total — ${totalValue.toLocaleString()} in value</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {showAdd && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-slide-in">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Contact Name *" className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input placeholder="Business Name *" className={inputCls} value={form.business} onChange={e => setForm({...form, business: e.target.value})} />
            <input placeholder="Email" className={inputCls} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input placeholder="Phone" className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input placeholder="Project Value ($)" className={inputCls} value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
            <input placeholder="Notes" className={inputCls} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <button onClick={addClient} className="bg-primary text-background px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all">Save Client</button>
        </div>
      )}

      <div className="space-y-3">
        {clients.map(c => (
          <div key={c.id} className="bg-surface border border-border rounded-xl p-5 hover:border-border-bright transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-text-primary font-semibold">{c.business}</h3>
                  <button onClick={() => cycleStatus(c.id)} className={`text-xs px-2.5 py-0.5 rounded-full font-medium cursor-pointer ${statusColors[c.status]}`}>{c.status}</button>
                  <span className="text-accent text-sm font-bold">${c.value.toLocaleString()}</span>
                </div>
                <p className="text-text-secondary text-sm">{c.name}</p>
                <div className="flex items-center gap-4 mt-2 text-text-muted text-xs">
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                  {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                </div>
                {c.notes && <p className="text-text-muted text-xs mt-2">{c.notes}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
