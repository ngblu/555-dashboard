"use client";

import { useState } from "react";
import { Crosshair, Plus, Globe, Mail, X } from "lucide-react";

const statusFlow = ["found", "audited", "emailed", "replied", "converted", "dead"] as const;
type Status = typeof statusFlow[number];

const statusColors: Record<Status, string> = {
  found: "bg-text-muted/20 text-text-secondary",
  audited: "bg-warning/20 text-warning",
  emailed: "bg-primary/20 text-primary",
  replied: "bg-secondary/20 text-secondary",
  converted: "bg-accent/20 text-accent",
  dead: "bg-danger/20 text-danger",
};

interface Lead {
  id: string;
  businessName: string;
  website: string;
  industry: string;
  issues: string[];
  status: Status;
  contactEmail: string;
  notes: string;
}

const initialLeads: Lead[] = [
  { id: "l1", businessName: "Summit Lawn & Garden", website: "summitlawn.wixsite.com/home", industry: "Landscaping", issues: ["Free Wix site", "No mobile version", "12s load time"], status: "audited", contactEmail: "info@summitlawn.com", notes: "Terrible site. Easy sell." },
  { id: "l2", businessName: "Premier Pressure Washing", website: "facebook.com/premierpw", industry: "Pressure Washing", issues: ["No website", "Facebook only"], status: "emailed", contactEmail: "luis@premierpw.com", notes: "Sent audit email 6/15. Waiting." },
  { id: "l3", businessName: "Spotless Cleaning Co.", website: "spotlesscleaning.wordpress.com", industry: "Cleaning", issues: ["Free WordPress", "Broken form", "Stock photos"], status: "found", contactEmail: "", notes: "4.8 stars on Google Maps but garbage website." },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [showAdd, setShowAdd] = useState(false);
  const [newLead, setNewLead] = useState({ businessName: "", website: "", industry: "", contactEmail: "", notes: "" });

  const addLead = () => {
    if (!newLead.businessName) return;
    setLeads([...leads, { ...newLead, id: "l" + Date.now(), issues: [], status: "found" }]);
    setNewLead({ businessName: "", website: "", industry: "", contactEmail: "", notes: "" });
    setShowAdd(false);
  };

  const cycleStatus = (id: string) => {
    setLeads(leads.map(l => {
      if (l.id !== id) return l;
      const idx = statusFlow.indexOf(l.status);
      const next = statusFlow[(idx + 1) % statusFlow.length];
      return { ...l, status: next };
    }));
  };

  const removeLead = (id: string) => setLeads(leads.filter(l => l.id !== id));

  const inputCls = "w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:border-primary focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="w-6 h-6 text-warning" /> Lead Pipeline
          </h1>
          <p className="text-text-muted text-sm mt-1">{leads.length} prospects tracked</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {showAdd && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4 animate-slide-in">
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="Business Name *" className={inputCls} value={newLead.businessName} onChange={e => setNewLead({...newLead, businessName: e.target.value})} />
            <input placeholder="Website URL" className={inputCls} value={newLead.website} onChange={e => setNewLead({...newLead, website: e.target.value})} />
            <input placeholder="Industry" className={inputCls} value={newLead.industry} onChange={e => setNewLead({...newLead, industry: e.target.value})} />
            <input placeholder="Contact Email" className={inputCls} value={newLead.contactEmail} onChange={e => setNewLead({...newLead, contactEmail: e.target.value})} />
          </div>
          <input placeholder="Notes" className={inputCls} value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
          <button onClick={addLead} className="bg-primary text-background px-6 py-2 rounded-lg text-sm font-semibold hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all">Save Lead</button>
        </div>
      )}

      <div className="space-y-3">
        {leads.map(lead => (
          <div key={lead.id} className="bg-surface border border-border rounded-xl p-5 hover:border-border-bright transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-text-primary font-semibold">{lead.businessName}</h3>
                  <span className="text-text-muted text-xs bg-surface-2 px-2 py-0.5 rounded-full">{lead.industry}</span>
                  <button onClick={() => cycleStatus(lead.id)} className={`text-xs px-2.5 py-0.5 rounded-full font-medium cursor-pointer ${statusColors[lead.status]}`}>
                    {lead.status}
                  </button>
                </div>
                <div className="flex items-center gap-4 text-text-muted text-xs">
                  {lead.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {lead.website}</span>}
                  {lead.contactEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.contactEmail}</span>}
                </div>
                {lead.notes && <p className="text-text-secondary text-sm mt-2">{lead.notes}</p>}
                {lead.issues.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {lead.issues.map(issue => (
                      <span key={issue} className="text-[10px] bg-danger/10 text-danger px-2 py-0.5 rounded-full">{issue}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => removeLead(lead.id)} className="text-text-muted hover:text-danger p-1 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
