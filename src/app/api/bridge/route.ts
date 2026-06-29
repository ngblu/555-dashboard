/**
 * Bridge Relay — all operations via POST with { op: "..." } field
 *   register  — bridge registers
 *   poll      — bridge polls for commands  
 *   result    — bridge posts results
 *   send      — dashboard sends command
 * GET returns connection status
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

declare global {
  var __bridgeState: {
    connected: boolean; deviceId: string; registeredAt: number; lastPoll: number;
    pendingCommands: Array<{ id: string; action: string; params: Record<string,any>; createdAt: number }>;
    results: Array<{ id: string; status: string; data?: any; error?: string }>;
    leads: Array<Record<string, unknown>>;
  } | null;
}

function getState() {
  if (!globalThis.__bridgeState) {
    globalThis.__bridgeState = { connected: false, deviceId: "", registeredAt: 0, lastPoll: 0, pendingCommands: [], results: [], leads: [] };
  }
  return globalThis.__bridgeState;
}

const AUTH = (process.env as any).BRIDGE_AUTH_TOKEN || "555-remote-bridge";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function j(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...cors() } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function GET(req: Request) {
  const s = getState();
  const url = new URL(req.url);
  const cmdId = url.searchParams.get("cmdId");
  
  // Lookup specific command result
  if (cmdId) {
    const result = s.results.find((r) => r.id === cmdId);
    return j({ result: result || null });
  }
  
  const ok = s.lastPoll > Date.now() - 30000;
  return j({ connected: ok, deviceId: ok ? s.deviceId : null, pendingCount: s.pendingCommands.length });
}

export async function POST(req: Request) {
  const s = getState();
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  const body = await req.json().catch(() => ({}));
  const op = body.op || "";

  if (op === "register") {
    if (auth !== AUTH) return j({ error: "Unauthorized" }, 401);
    s.deviceId = body.deviceId || "desktop";
    s.connected = true;
    s.registeredAt = Date.now();
    s.lastPoll = Date.now();
    return j({ ok: true, deviceId: s.deviceId });
  }

  if (op === "poll") {
    if (auth !== AUTH) return j({ error: "Unauthorized" }, 401);
    s.lastPoll = Date.now();
    s.connected = true;
    const cmds = s.pendingCommands.splice(0, 5);
    return j({ commands: cmds, timestamp: Date.now() });
  }

  if (op === "result") {
    if (auth !== AUTH) return j({ error: "Unauthorized" }, 401);
    s.results.push({ id: body.id, status: body.status || "ok", data: body.data, error: body.error });
    if (s.results.length > 100) s.results = s.results.slice(-100);
    return j({ ok: true });
  }

  if (op === "send") {
    if (!body.action) return j({ error: "Missing action" }, 400);
    const cmd = { id: "cmd_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8), action: body.action, params: body.params || {}, createdAt: Date.now() };
    s.pendingCommands.push(cmd);
    return j({ ok: true, commandId: cmd.id, bridgeConnected: s.connected });
  }

  // Phone sync: push leads from desktop bridge
  if (op === "push_leads") {
    if (auth !== AUTH) return j({ error: "Unauthorized" }, 401);
    const newLeads = body.leads || [];
    // Merge: update existing by id, add new ones
    const existingIds = new Set(s.leads.map((l) => l.id));
    for (const lead of newLeads) {
      if (existingIds.has(lead.id)) {
        const idx = s.leads.findIndex((l) => l.id === lead.id);
        if (idx >= 0) s.leads[idx] = lead;
      } else {
        s.leads.unshift(lead);
        existingIds.add(lead.id);
      }
    }
    // Trim to 200
    if (s.leads.length > 200) s.leads = s.leads.slice(0, 200);
    return j({ ok: true, count: s.leads.length });
  }

  // Phone sync: get leads
  if (op === "get_leads") {
    return j({ leads: s.leads });
  }

  return j({ error: "Unknown op: " + op }, 400);
}
