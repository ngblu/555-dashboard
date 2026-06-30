# 555 Client Engine — Automated Acquisition Pipeline

> **Goal:** Turn the lead finder into a fully automated client acquisition machine — from discovery to demo site to outreach to close, all from the dashboard.

**Architecture:** Three integrated systems: (1) Automated daily lead discovery + scoring, (2) One-click personalized demo site generation per lead, (3) Automated email outreach with tracking. All controllable from the dashboard.

**Tech Stack:** Next.js 16, Tailwind v4, Vercel deployments, Resend (email), existing bridge infrastructure

---

## Phase 1 — Pipeline Automation (Today)
Turn the manual lead finder into a scheduled, autonomous pipeline.

### Step 1: Lead Scoring Engine
- Score leads 0-100 based on: website quality (lower = better prospect), has website, has phone, industry match
- Hot/Warm/Cold classification
- Priority queue in dashboard — best leads at top

### Step 2: Scheduled Lead Finder
- Cron-style scheduler in bridge: run every 6 hours
- New leads auto-appear in dashboard
- Notification when high-score leads found

### Step 3: Auto-Pitch Generation
- For each new lead: auto-generate personalized pitch using audit data
- Store pitch with lead
- Ready-to-send state

### Step 4: Email Outreach (Resend)
- One-click "Send Pitch" per lead
- Track: sent, opened, clicked, replied
- Status pipeline: found → audited → pitched → opened → replied → converted

---

## Phase 2 — Demo Site Generator (Big Impact)
The deal-closer: generate a real, live demo site for any lead.

### Step 5: Site Template System
- Industry-specific templates (plumbing, HVAC, landscaping, roofing)
- Each template: hero, services, about, contact, emergency CTA
- Mobile-responsive, fast (target 95+ PageSpeed)

### Step 6: Personalization Engine
- Auto-fill: business name, phone, city, industry keywords
- Pull colors from their existing site or use industry defaults
- Generate placeholder content from business data

### Step 7: One-Click Deploy
- "Generate Demo Site" button on any lead
- Deploys to Vercel as subdomain: `{business-slug}.demo.555digital.dev`
- URL auto-attached to pitch email
- Live preview in dashboard

---

## Phase 3 — Pipeline Dashboard
Visibility into the entire sales funnel.

### Step 8: Pipeline View
- Kanban-style board: Found → Audited → Pitched → Opened → Replied → Converted
- Drag-and-drop leads between stages
- Revenue tracking per stage

### Step 9: Analytics
- Conversion rate per industry
- Average time from found → converted
- Revenue projections
- Email performance stats

---

**Files to create/modify:**
- `bridge/lead_scorer.py` — scoring algorithm
- `bridge/scheduler.py` — cron-style scheduler
- `bridge/demo_site_gen.py` — site generator
- `src/app/leads/page.tsx` — pipeline UI overhaul
- `src/app/api/leads/` — lead CRUD endpoints
- `src/components/leads/PipelineBoard.tsx` — kanban view
- `src/components/leads/LeadScoring.tsx` — scoring display
