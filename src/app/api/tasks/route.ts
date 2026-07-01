import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// In-memory task store (same as the client store, but API-accessible)
// Matches the Task type from types.ts: id, title, completed, priority, etc.

let _tasks: any[] | null = null;

async function loadTasks(): Promise<any[]> {
  if (_tasks !== null && _tasks.length > 0) return _tasks;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "555-data.json" });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
        const data = await res.json();
        _tasks = data._tasks || [];
        return _tasks!;
      }
    }
  } catch {}
  return [];
}

async function saveTasks(tasks: any[]): Promise<void> {
  _tasks = tasks;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    const { put, list } = await import("@vercel/blob");
    let existing: any = {};
    try {
      const { blobs } = await list({ prefix: "555-data.json" });
      if (blobs.length > 0) {
        const r = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
        existing = await r.json();
      }
    } catch {}
    (existing as any)._tasks = tasks;
    await put("555-data.json", JSON.stringify(existing), { access: "public", contentType: "application/json", addRandomSuffix: false });
  } catch (e) { console.error("saveTasks:", e); }
}

// GET /api/tasks — list tasks
export async function GET(request: NextRequest) {
  const token = request.cookies.get("555-auth")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tasks = await loadTasks();
  return NextResponse.json({ tasks });
}

// POST /api/tasks — create a task
export async function POST(request: NextRequest) {
  const token = request.cookies.get("555-auth")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, priority, taskType, dueDate } = await request.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const tasks = await loadTasks();
  const task = {
    id: "t_" + Date.now().toString(36),
    title,
    priority: priority || "medium",
    completed: false,
    createdAt: new Date().toISOString(),
    taskType: taskType || "manual",
    dueDate: dueDate || undefined,
    messages: [],
  };
  tasks.unshift(task);
  await saveTasks(tasks);

  return NextResponse.json({ success: true, task });
}

// PATCH /api/tasks — update a task (mark complete, update title, etc.)
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get("555-auth")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, completed, title, result, message } = await request.json();
  if (!id) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

  const tasks = await loadTasks();
  const idx = tasks.findIndex((t: any) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (completed !== undefined) tasks[idx].completed = completed;
  if (title !== undefined) tasks[idx].title = title;
  if (result !== undefined) tasks[idx].result = result;
  if (message) {
    tasks[idx].messages = tasks[idx].messages || [];
    tasks[idx].messages.push({
      id: "m_" + Date.now(),
      author: "ai",
      text: message,
      createdAt: new Date().toISOString(),
    });
  }

  await saveTasks(tasks);
  return NextResponse.json({ success: true, task: tasks[idx] });
}
