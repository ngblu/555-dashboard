export interface Client {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
  status: "lead" | "contacted" | "proposal" | "active" | "completed";
  value: number;
  notes: string;
  createdAt: string;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  status: "not-started" | "in-progress" | "review" | "completed";
  tier: "landing" | "full" | "custom";
  value: number;
  startDate: string;
  dueDate: string;
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  priority: "low" | "medium" | "high" | "urgent";
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  businessName: string;
  website: string;
  industry: string;
  issues: string[];
  status: "found" | "audited" | "emailed" | "replied" | "converted" | "dead";
  contactEmail?: string;
  notes: string;
  createdAt: string;
}

export interface Revenue {
  id: string;
  projectId: string;
  clientName: string;
  amount: number;
  type: "deposit" | "final" | "maintenance";
  date: string;
  status: "pending" | "paid";
}
