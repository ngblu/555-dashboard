// ============================================================
// 555 Dashboard — Auth
// USERS stored in USERS_JSON env var. ZERO blob dependency.
// Add/remove users via Vercel dashboard → Environment Variables.
// ============================================================

import type { User, UserSession } from "./types";

// ---- JWT (unchanged) ----
let _jwtSecret: string | null = null;
function getJwtSecret(): string { if (_jwtSecret) return _jwtSecret; _jwtSecret = process.env.JWT_SECRET || ""; if (!_jwtSecret) throw new Error("JWT_SECRET env var required"); return _jwtSecret; }
const encoder = new TextEncoder(); const decoder = new TextDecoder();
function b64(buf: ArrayBuffer|Uint8Array): string { const a=buf instanceof Uint8Array?Array.from(buf):Array.from(new Uint8Array(buf)); return btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function b64d(s: string): Uint8Array { s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4)s+="="; return Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
async function getSK(): Promise<CryptoKey> { const h=await crypto.subtle.digest("SHA-256",encoder.encode(getJwtSecret())); return crypto.subtle.importKey("raw",h,{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]); }
export async function signToken(p:UserSession): Promise<string> { const n=Math.floor(Date.now()/1000); const f={...p,iat:n,exp:n+86400*7}; const hb=b64(encoder.encode(JSON.stringify({alg:"HS256",typ:"JWT"}))); const pb=b64(encoder.encode(JSON.stringify(f))); const k=await getSK(); return `${hb}.${pb}.${b64(await crypto.subtle.sign("HMAC",k,encoder.encode(`${hb}.${pb}`)))}`; }
export async function verifyToken(t:string): Promise<(UserSession&{iat:number;exp:number})|null> { try { const p=t.split("."); if(p.length!==3)return null; const k=await getSK(); if(!await crypto.subtle.verify("HMAC",k,b64d(p[2])as BufferSource,encoder.encode(`${p[0]}.${p[1]}`)))return null; const d=JSON.parse(decoder.decode(b64d(p[1]))); if(d.exp<Date.now()/1000)return null; return d; } catch { return null; } }

// ---- passwords ----
async function dk(pw:string,s:Uint8Array):Promise<CryptoKey>{return crypto.subtle.importKey("raw",encoder.encode(pw),"PBKDF2",false,["deriveBits"])}
export async function hashPassword(pw:string):Promise<string>{const s=crypto.getRandomValues(new Uint8Array(16));const k=await dk(pw,s);const b=await crypto.subtle.deriveBits({name:"PBKDF2",salt:s,iterations:100_000,hash:"SHA-256"},k,256);const h=(a:Uint8Array)=>Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");return`${h(s)}:${h(new Uint8Array(b))}`}
export async function verifyPassword(pw:string,st:string):Promise<boolean>{const[a,b]=st.split(":");if(!a||!b)return false;const s=new Uint8Array(a.match(/.{2}/g)!.map(x=>parseInt(x,16)));const k=await dk(pw,s);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:s,iterations:100_000,hash:"SHA-256"},k,256);return Array.from(new Uint8Array(bits)).map(x=>x.toString(16).padStart(2,"0")).join("")===b}

// ---- cookies ----
export function setAuthCookie(t:string):string{return`555-auth=${t}; HttpOnly; Path=/; Max-Age=${86400*7}; SameSite=Lax${process.env.NODE_ENV==="production"?"; Secure":""}`}
export function clearAuthCookie():string{return"555-auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"}

// =====================================================================
// USER STORAGE — USERS_JSON env var primary, blob as write-through cache
// =====================================================================

interface UsersFile { users: User[] }

function readEnvUsers(): User[] {
  try { return JSON.parse(process.env.USERS_JSON || "[]"); } catch { return []; }
}

function getBootstrapAdmin(): User | null {
  const email = process.env.ADMIN_EMAIL || "contact@555digital.dev";
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return { id:"usr_admin", email, name:"Noah", role:"admin", passwordHash:"__BOOTSTRAP__", active:true, createdAt:"2026-01-01T00:00:00.000Z" };
}

async function readBlobUsers(): Promise<User[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  // Retry up to 3 times with 1s delay for eventual consistency
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { list } = await import("@vercel/blob");
      const { blobs } = await list({ prefix: "555-data.json" });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].url + "?t=" + Date.now(), { cache: "no-store" });
        const data = await res.json();
        const users = (data._users || []) as User[];
        if (users.length > 0) return users;
      }
    } catch (e) { /* retry */ }
    if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
  }
  return [];
}

async function writeBlobUsers(users: User[]): Promise<void> {
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
    (existing as any)._users = users;
    await put("555-data.json", JSON.stringify(existing), { access:"public", contentType:"application/json", addRandomSuffix:false });
  } catch(e) { console.error("writeBlobUsers:", e); }
}

// ---- In-memory user cache (survives warm invocations, reset on cold start) ----
// All add/delete operations update this cache immediately so they're instantly
// visible in subsequent reads. Blob writes are best-effort background sync.
let _usersCache: User[] | null = null;

export async function loadUsers(): Promise<UsersFile> {
  // Return cached users if available (avoids blob consistency delays)
  if (_usersCache !== null) return { users: _usersCache };

  // Seed cache from env var + blob on first load (cold start)
  const envUsers = readEnvUsers();
  const blobUsers = await readBlobUsers();

  // Merge: env users take priority, blob users fill gaps
  const merged = new Map<string, User>();
  for (const u of blobUsers) merged.set(u.id, u);
  for (const u of envUsers) merged.set(u.id, u); // env overrides blob
  const all = Array.from(merged.values());

  if (all.length > 0) {
    _usersCache = all;
    return { users: all };
  }

  // Bootstrap admin as last resort
  const admin = getBootstrapAdmin();
  const result = admin ? [admin] : [];
  _usersCache = result;
  return { users: result };
}

// Force reload from env var + blob (called when USERS_JSON is updated externally)
export async function reloadUsersFromEnv(): Promise<UsersFile> {
  _usersCache = null;
  return loadUsers();
}

export async function saveUsers(d: UsersFile): Promise<void> {
  _usersCache = d.users;
  writeBlobUsers(d.users).catch(() => {});
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { users } = await loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUser(user: Omit<User,"id"|"createdAt">): Promise<User> {
  const { users } = await loadUsers();
  if (users.find(u => u.email.toLowerCase() === user.email.toLowerCase())) {
    throw new Error("User already exists");
  }
  const nu: User = {
    ...user,
    id: "usr_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString()
  };

  // Update in-memory cache IMMEDIATELY (before blob write)
  _usersCache = [...users, nu];

  // Best-effort background blob sync (fire-and-forget, don't block)
  writeBlobUsers(_usersCache).catch(() => {});

  return nu;
}

export async function deleteUser(id: string): Promise<void> {
  const { users } = await loadUsers();

  // Update in-memory cache IMMEDIATELY (before blob write)
  _usersCache = users.filter(u => u.id !== id);

  // Best-effort background blob sync (fire-and-forget, don't block)
  writeBlobUsers(_usersCache).catch(() => {});
}
