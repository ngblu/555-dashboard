// ============================================================
// 555 Command Center — unified data types
// ============================================================

export interface AuditMetrics {
  url: string;
  fetchedAt: string;
  strategy: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: string;
  lcp: string;
  cls: string;
  tbt: string;
  speedIndex: string;
  ttfb: string;
  mobileFriendly: boolean;
  issues: string[];
  opportunities: string[];
}

export type LeadStatus =
  | "found"
  | "audited"
  | "emailed"
  | "replied"
  | "converted"
  | "dead";

export interface Lead {
  id: string;
  businessName: string;
  website: string;
  industry: string;
  issues: string[];
  status: LeadStatus;
  contactEmail: string;
  notes: string;
  audit?: AuditMetrics | null;
  source?: "manual" | "website";
  createdAt: string;
  // set once converted so we don't double-convert
  convertedClientId?: string;
}

export interface SavedAudit {
  id: string;
  url: string;
  businessName: string;
  googleInfo: string;
  manualNotes: string;
  result: AuditMetrics | null;
  createdAt: string;
  // link back to the lead this audit came from / created
  leadId?: string;
}

export type ClientStatus =
  | "lead"
  | "contacted"
  | "proposal"
  | "active"
  | "completed";

export interface Client {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  website: string;
  status: ClientStatus;
  value: number;
  notes: string;
  createdAt: string;
  // provenance
  fromLeadId?: string;
}

export type ProjectStatus =
  | "not-started"
  | "in-progress"
  | "review"
  | "completed";

export interface Project {
  id: string;
  clientId: string;
  client: string; // denormalized business name for display
  name: string;
  status: ProjectStatus;
  tier: "landing" | "full" | "custom" | string;
  value: number;
  startDate: string;
  dueDate: string;
  progress: number;
}

export type Priority = "low" | "medium" | "high" | "urgent";

export type TaskType = "manual" | "ai_build" | "ai_audit" | "ai_email" | "ai_research";

export interface TaskMessage {
  id: string;
  author: "user" | "ai";
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  projectId?: string;
  priority: Priority;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
  taskType: TaskType;
  messages: TaskMessage[];
  aiContext?: string;  // extra context for AI tasks
  result?: string;     // link or summary of what was built
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

export interface Subscription {
  id: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  plan: string;
  amount: number;
  interval: "monthly" | "quarterly" | "annual";
  status: "active" | "paused" | "cancelled";
  startDate: string;
  nextPayment: string;
}

export interface EmailLog {
  id: string;
  leadId?: string;
  clientId?: string;
  to: string;
  subject: string;
  status: "sent" | "opened" | "replied" | "bounced";
  sentAt: string;
  openedAt?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  link?: string;
}
