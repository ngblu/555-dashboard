import type { Client, Project, Task, Lead, Revenue } from "./types";

export const sampleClients: Client[] = [
  {
    id: "c1", name: "Marcus Taylor", business: "GreenEdge Landscaping",
    email: "marcus@greenedge.com", phone: "(555) 123-4567",
    website: "greenedgelandscaping.com", status: "active", value: 2500,
    notes: "Started with full website tier. Wants blog added later.",
    createdAt: "2025-06-01",
  },
  {
    id: "c2", name: "DeShawn Kelly", business: "Prestige Auto Detail",
    email: "deshawn@prestigedetail.com", phone: "(555) 234-5678",
    website: "", status: "proposal", value: 1000,
    notes: "Running off Facebook only. Needs everything from scratch.",
    createdAt: "2025-06-10",
  },
  {
    id: "c3", name: "Rick Sandoval", business: "ClearView Window Washing",
    email: "rick@clearviewwindows.com", phone: "(555) 345-6789",
    website: "clearviewwindows.godaddysites.com", status: "completed", value: 2500,
    notes: "GoDaddy site from 2016. Full rebuild done. Now on maintenance.",
    createdAt: "2025-05-15",
  },
];

export const sampleProjects: Project[] = [
  {
    id: "p1", clientId: "c1", name: "GreenEdge Full Website",
    status: "in-progress", tier: "full", value: 2500,
    startDate: "2025-06-05", dueDate: "2025-06-26", progress: 65,
  },
  {
    id: "p2", clientId: "c2", name: "Prestige Landing Page",
    status: "not-started", tier: "landing", value: 1000,
    startDate: "", dueDate: "", progress: 0,
  },
  {
    id: "p3", clientId: "c3", name: "ClearView Full Rebuild",
    status: "completed", tier: "full", value: 2500,
    startDate: "2025-05-20", dueDate: "2025-06-10", progress: 100,
  },
];

export const sampleTasks: Task[] = [
  { id: "t1", title: "Finish GreenEdge homepage hero section", projectId: "p1", priority: "high", completed: false, dueDate: "2025-06-20", createdAt: "2025-06-15" },
  { id: "t2", title: "Send Prestige proposal PDF", projectId: "p2", priority: "urgent", completed: false, dueDate: "2025-06-18", createdAt: "2025-06-16" },
  { id: "t3", title: "Set up ClearView monthly maintenance", projectId: "p3", priority: "medium", completed: false, createdAt: "2025-06-12" },
  { id: "t4", title: "Cold email 10 new landscaping businesses", priority: "medium", completed: false, createdAt: "2025-06-16" },
  { id: "t5", title: "Update 555 Digital portfolio with ClearView case study", priority: "low", completed: false, createdAt: "2025-06-14" },
];

export const sampleLeads: Lead[] = [
  { id: "l1", businessName: "Summit Lawn & Garden", website: "summitlawn.wixsite.com/home", industry: "Landscaping", issues: ["Free Wix site", "No mobile version", "Loads in 12s"], status: "audited", contactEmail: "info@summitlawn.com", notes: "Terrible site. Easy sell.", createdAt: "2025-06-14" },
  { id: "l2", businessName: "Premier Pressure Washing", website: "facebook.com/premierpw", industry: "Pressure Washing", issues: ["No website", "Facebook only", "No Google presence"], status: "emailed", contactEmail: "luis@premierpw.com", notes: "Sent audit email 6/15. Waiting for reply.", createdAt: "2025-06-13" },
  { id: "l3", businessName: "Spotless Cleaning Co.", website: "spotlesscleaning.wordpress.com", industry: "Cleaning", issues: ["WordPress.com free tier", "Broken contact form", "Stock photos"], status: "found", notes: "Found on Google Maps. 4.8 stars but garbage website.", createdAt: "2025-06-16" },
];

export const sampleRevenue: Revenue[] = [
  { id: "r1", projectId: "p3", clientName: "ClearView Window Washing", amount: 1250, type: "deposit", date: "2025-05-20", status: "paid" },
  { id: "r2", projectId: "p3", clientName: "ClearView Window Washing", amount: 1250, type: "final", date: "2025-06-10", status: "paid" },
  { id: "r3", projectId: "p1", clientName: "GreenEdge Landscaping", amount: 1250, type: "deposit", date: "2025-06-05", status: "paid" },
  { id: "r4", projectId: "p1", clientName: "GreenEdge Landscaping", amount: 1250, type: "final", date: "2025-06-26", status: "pending" },
];
