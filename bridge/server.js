/**
 * 555 Voice Bridge — Local relay between dashboard browser and Hermes desktop session.
 *
 *  Dashboard (browser)          Bridge (localhost:5555)          Hermes (desktop session)
 *  ──────────────────          ──────────────────────          ─────────────────────────
 *  POST /api/query {text}  →   spawns hermes chat -q --resume →   processes, responds
 *  ←  {response, ttsUrl}   ←   captures stdout               ←   returns text
 *
 *  GET /api/tts?text=...   →   spawns Python edge-tts        →   generates mp3
 *  ←  audio/mpeg           ←   streams mp3 file              ←
 *
 *  POST /api/control {...} →   spawns Python control.py      →   executes desktop action
 *  ←  {success, ...}       ←   captures stdout               ←
 *
 *  GET /api/control/screenshot → spawns Python control.py  →   captures PNG screenshot
 *  ←  image/png            ←   streams PNG                   ←
 */

const http = require("http");
const https = require("https");
const { execFile, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// ── Config ──────────────────────────────────────────────────────
const PORT = 5555;
const HERMES_SESSION = "20260626_135517_7f41c7"; // current session — update if /new
const TTS_CACHE_DIR = path.join(require("os").homedir(), "AppData", "Local", "hermes", "audio_cache");
const BRIDGE_TTS_DIR = path.join(__dirname, "tts_cache");
const CONTROL_PY = path.join(__dirname, "control.py");

// Auth token — simple shared secret; set via env or default
const AUTH_TOKEN = process.env.BRIDGE_TOKEN || "555-remote-bridge";

// Hermes API for streaming
let HERMES_API_KEY = "";
try {
  HERMES_API_KEY = fs.readFileSync(path.join(__dirname, ".hermes_key"), "utf8").trim();
} catch {
  console.log("[Bridge] No .hermes_key found — voice streaming disabled");
}
const HERMES_API_URL = "http://127.0.0.1:8642/v1/chat/completions";

// ensure cache dirs exist
fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
fs.mkdirSync(BRIDGE_TTS_DIR, { recursive: true });

// ── CORS + JSON helpers ─────────────────────────────────────────
function corsHeaders(req) {
  const origin = req.headers.origin || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bridge-Token",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonReply(req, res, status, body, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...corsHeaders(req), ...extraHeaders };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({ text: data });
      }
    });
  });
}

// ── Auth check ──────────────────────────────────────────────────
function checkAuth(req, res) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "")
    || req.headers["x-bridge-token"]
    || "";
  if (token !== AUTH_TOKEN) {
    jsonReply(req, res, 401, { error: "Unauthorized - provide valid X-Bridge-Token or Authorization: Bearer token" });
    return false;
  }
  return true;
}

// ── Run Python control script ───────────────────────────────────
function runControl(args) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "python",
      [CONTROL_PY, ...args],
      {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024, // 10 MB for screenshots
      },
      (err, stdout, stderr) => {
        if (err && err.killed) {
          return reject(new Error("Control command timed out after 30s"));
        }
        if (err) {
          return reject(new Error(stderr || err.message));
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (e) {
          reject(new Error(`Failed to parse control output: ${stdout.slice(0, 200)}`));
        }
      }
    );
  });
}

// ── Hermes query via API (curl to Hermes Gateway — port 8642) ──
function queryHermes(textOrHistory) {
  return new Promise((resolve, reject) => {
    // Build messages array for API
    let messages = [];
    if (typeof textOrHistory === "string") {
      messages = [{ role: "user", content: textOrHistory }];
    } else if (Array.isArray(textOrHistory)) {
      messages = textOrHistory.map((m) => ({
        role: m.role === "system" ? "assistant" : m.role,
        content: m.text || m.content || ""
      }));
    } else {
      messages = [{ role: "user", content: String(textOrHistory) }];
    }
    // Prepend system prompt
    messages.unshift({
      role: "system",
      content: "You are JARVIS, a voice assistant for 555 Digital. Keep responses concise and conversational — under 3 sentences when possible. You're speaking aloud, so no markdown, no code blocks, no lists. Just natural speech."
    });

    const body = JSON.stringify({ model: "hermes-agent", messages, stream: false, max_tokens: 200 });
    const tmpFile = path.join(require("os").tmpdir(), "hq_" + Date.now() + ".json");
    fs.writeFileSync(tmpFile, body, "utf8");

    const curl = spawn("curl", [
      "-s", "-X", "POST",
      HERMES_API_URL,
      "-H", "Content-Type: application/json",
      "-H", "Authorization: Bearer " + HERMES_API_KEY,
      "-d", "@" + tmpFile,
      "--max-time", "60",
    ]);

    let stdout = "";
    let stderr = "";

    curl.stdout.on("data", (d) => { stdout += d.toString(); });
    curl.stderr.on("data", (d) => { stderr += d.toString(); });

    curl.on("close", (code) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      if (code !== 0) {
        return reject(new Error("Hermes API failed: " + (stderr || "code " + code)));
      }
      try {
        const json = JSON.parse(stdout.trim());
        const content = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || "";
        resolve(content || "(no response)");
      } catch (e) {
        reject(new Error("Failed to parse Hermes API response: " + stdout.slice(0, 100)));
      }
    });

    curl.on("error", (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      reject(new Error("Failed to reach Hermes API: " + err.message));
    });
  });
}

// ── TTS generation (via Python edge-tts) ────────────────────────
function generateTTS(text) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 8);
    const outFile = path.join(BRIDGE_TTS_DIR, `tts_${hash}.mp3`);

    // Return cached file if it exists
    if (fs.existsSync(outFile)) {
      return resolve(outFile);
    }

    // Use Python to generate TTS
    const python = spawn("python", [
      "-c",
      `
import asyncio, sys
async def main():
    import edge_tts
    text = sys.argv[1]
    out = sys.argv[2]
    communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
    await communicate.save(out)
asyncio.run(main())
      `,
      text,
      outFile,
    ]);

    let stderr = "";
    python.stderr.on("data", (d) => (stderr += d.toString()));

    python.on("close", (code) => {
      if (code !== 0 || !fs.existsSync(outFile)) {
        return reject(new Error(`TTS failed: ${stderr}`));
      }
      resolve(outFile);
    });
  });
}

// ── Lead Finder state (module-level so it survives across requests) ──
let _finderRunning = false;
let _finderLastOutput = "";
let _finderLastRun = 0;

// ── Server ──────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }

  // ── Health check ────────────────────────────────────────────
  if (url.pathname === "/api/health") {
    return jsonReply(req, res, 200, {
      status: "ok",
      session: HERMES_SESSION,
      features: ["query", "tts", "control", "voice"],
    });
  }

  // ── Query Hermes ────────────────────────────────────────────
  if (url.pathname === "/api/query" && req.method === "POST") {
    const body = await readBody(req);
    const text = (body.text || '').trim();
    const messages = body.messages; // optional full conversation history

    if (!text && !messages) {
      return jsonReply(req, res, 400, { error: "Missing 'text' or 'messages' field" });
    }

    try {
      // Pass messages array if available, otherwise fall back to single text
      const input = messages && messages.length > 0 ? messages : text;
      const response = await queryHermes(input);
      // Pre-generate TTS and return the URL
      const ttsText = response.slice(0, 500);
      const ttsUrl = `http://localhost:${PORT}/api/tts?text=${encodeURIComponent(ttsText)}`;
      return jsonReply(req, res, 200, { response, ttsUrl, ttsText });
    } catch (err) {
      return jsonReply(req, res, 500, { error: err.message });
    }
  }

  // ── TTS audio (MP3) ──────────────────────────────────────────
  if (url.pathname === "/api/tts" && req.method === "GET") {
    const text = url.searchParams.get("text");
    if (!text) {
      return jsonReply(req, res, 400, { error: "Missing 'text' param" });
    }

    try {
      const filePath = await generateTTS(text);
      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-Length": stat.size,
        "Cache-Control": "public, max-age=86400",
        ...corsHeaders(req),
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      // Retry once
      try {
        const fp = await generateTTS(text);
        const stat = fs.statSync(fp);
        res.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-Length": stat.size,
          "Cache-Control": "public, max-age=86400",
          ...corsHeaders(req),
        });
        fs.createReadStream(fp).pipe(res);
      } catch {
        return jsonReply(req, res, 500, { error: "TTS generation failed" });
      }
    }
    return;
  }

  // ── TTS audio as base64 (for immediate playback, no extra roundtrip) ──
  if (url.pathname === "/api/tts/base64" && req.method === "POST") {
    const body = await readBody(req);
    const text = (body.text || "").trim();
    if (!text) {
      return jsonReply(req, res, 400, { error: "Missing 'text' field" });
    }

    try {
      const filePath = await generateTTS(text);
      const audioBase64 = fs.readFileSync(filePath).toString("base64");
      return jsonReply(req, res, 200, {
        audio: `data:audio/mp3;base64,${audioBase64}`,
        text,
      });
    } catch (err) {
      return jsonReply(req, res, 500, { error: "TTS base64 generation failed: " + err.message });
    }
  }

  // ── Control: screenshot (raw PNG) ───────────────────────────
  if (url.pathname === "/api/control/screenshot" && req.method === "GET") {
    try {
      const result = await runControl(["screenshot", "base64"]);
      if (result.error) {
        return jsonReply(req, res, 500, { error: result.error });
      }
      const imgBuf = Buffer.from(result.image, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": imgBuf.length,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        ...corsHeaders(req),
      });
      res.end(imgBuf);
    } catch (err) {
      return jsonReply(req, res, 500, { error: "Screenshot failed: " + err.message });
    }
    return;
  }

  // ── Control: action endpoint ────────────────────────────────
  if (url.pathname === "/api/control" && req.method === "POST") {
    if (!checkAuth(req, res)) return;

    const body = await readBody(req);
    const { action, ...params } = body;

    if (!action) {
      return jsonReply(req, res, 400, { error: "Missing 'action' field" });
    }

    try {
      let result;

      switch (action) {
        case "click":
          if (params.x == null || params.y == null) {
            return jsonReply(req, res, 400, { error: "Missing x,y coordinates" });
          }
          result = await runControl([
            "click",
            String(params.x),
            String(params.y),
            params.button || "left",
            String(params.count || 1),
          ]);
          break;

        case "type":
          if (!params.text) {
            return jsonReply(req, res, 400, { error: "Missing 'text' field" });
          }
          result = await runControl(["type", params.text]);
          break;

        case "key":
          if (!params.keys) {
            return jsonReply(req, res, 400, { error: "Missing 'keys' field (string like 'ctrl+c' or array)" });
          }
          const keysArg = Array.isArray(params.keys)
            ? JSON.stringify(params.keys)
            : params.keys;
          result = await runControl(["key", keysArg]);
          break;

        case "screenshot":
          result = await runControl(["screenshot", "base64"]);
          break;

        case "scroll":
          result = await runControl([
            "scroll",
            params.direction || "down",
            String(params.amount || 3),
          ]);
          break;

        case "open":
          if (!params.target) {
            return jsonReply(req, res, 400, { error: "Missing 'target' field" });
          }
          result = await runControl(["open", params.target]);
          break;

        case "system":
          if (!params.command) {
            return jsonReply(req, res, 400, { error: "Missing 'command' field" });
          }
          result = await runControl(["system", params.command]);
          break;

        case "screen_size":
          result = await runControl(["screen_size"]);
          break;

        default:
          return jsonReply(req, res, 400, { error: `Unknown action: ${action}` });
      }

      if (result.error) {
        return jsonReply(req, res, 500, result);
      }
      return jsonReply(req, res, 200, result);
    } catch (err) {
      return jsonReply(req, res, 500, { error: err.message });
    }
  }

  // ── Voice Streaming (SSE) — Hermes text streaming + edge-tts audio chunks ──
  if (url.pathname === "/api/voice/stream" && req.method === "POST") {
    const body = await readBody(req);
    const text = (body.text || "").trim();
    const messages = body.messages || [];

    if (!text && messages.length === 0) {
      return jsonReply(req, res, 400, { error: "Missing 'text' or 'messages'" });
    }
    if (!HERMES_API_KEY) {
      return jsonReply(req, res, 503, { error: "Hermes API key not configured" });
    }

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      ...corsHeaders(req),
    });

    const sendSSE = (event, data) => {
      if (res.writableEnded) return;
      if (typeof data === "string") {
        res.write(`event: ${event}\ndata: ${data}\n\n`);
      } else {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Build Hermes API messages from conversation history
    const apiMessages = messages.map((m) => ({
      role: m.role === "system" ? "assistant" : m.role,
      content: m.text || m.content || ""
    }));
    // If only text was provided (no messages), add it as a user message
    if (text && messages.length === 0) {
      apiMessages.push({ role: "user", content: text });
    }
    // Prepend system prompt for voice-friendly responses
    apiMessages.unshift({
      role: "system",
      content: "You are JARVIS, a voice assistant for 555 Digital. Keep responses concise and conversational — under 3 sentences when possible. You're speaking aloud, so no markdown, no code blocks, no lists. Just natural speech."
    });

    sendSSE("status", { state: "thinking" });

    let aborted = false;
    let textBuffer = "";
    let sentenceQueue = [];
    let ttsBusy = false;

    req.on("close", () => { aborted = true; });

    // Sentence boundary check
    const SENTENCE_END = /[.!?]\s+|\n|$/;
    function extractSentences() {
      const sentences = [];
      let match;
      while ((match = SENTENCE_END.exec(textBuffer)) !== null) {
        const end = match.index + match[0].length;
        const sentence = textBuffer.slice(0, end).trim();
        if (sentence.length > 2) {
          sentences.push(sentence);
        }
        textBuffer = textBuffer.slice(end);
      }
      // Also extract if buffer is long enough without punctuation
      if (textBuffer.length > 120 && sentences.length === 0) {
        const breakPt = textBuffer.lastIndexOf(" ", 100);
        if (breakPt > 20) {
          sentences.push(textBuffer.slice(0, breakPt).trim());
          textBuffer = textBuffer.slice(breakPt);
        }
      }
      return sentences;
    }

    // Generate TTS for a sentence and send as audio event
    async function speakSentence(sentence) {
      try {
        const filePath = await generateTTS(sentence);
        const audioBase64 = fs.readFileSync(filePath).toString("base64");
        if (!aborted && !res.writableEnded) {
          sendSSE("audio", audioBase64);
          sendSSE("text", { chunk: sentence, done: false });
        }
      } catch (err) {
        if (!aborted && !res.writableEnded) {
          sendSSE("text", { chunk: sentence, done: false });
        }
      }
    }

    // Process sentence queue
    async function processQueue() {
      if (ttsBusy) return;
      while (sentenceQueue.length > 0) {
        ttsBusy = true;
        const sentence = sentenceQueue.shift();
        await speakSentence(sentence);
        if (aborted || res.writableEnded) return;
      }
      ttsBusy = false;
    }

    try {
      // Use curl to call Hermes API (Node.js HTTP client hangs in this env)
      const body = JSON.stringify({
        model: "hermes-agent",
        messages: apiMessages,
        stream: true,
        max_tokens: 200,
      });

      console.log("[Voice] Calling Hermes API via curl...");
      // Write body to temp file to avoid JSON escaping issues
      const tmpFile = path.join(require("os").tmpdir(), "hermes_body_" + Date.now() + ".json");
      fs.writeFileSync(tmpFile, body, "utf8");
      
      const curl = spawn("curl", [
        "-s", "-N",
        "-X", "POST",
        HERMES_API_URL,
        "-H", "Content-Type: application/json",
        "-H", "Authorization: Bearer " + HERMES_API_KEY,
        "-d", "@" + tmpFile,
        "--max-time", "60",
      ]);

      let firstData = true;
      let leftover = "";

      curl.stdout.on("data", (chunk) => {
        if (aborted) { curl.kill(); return; }
        if (firstData) {
          console.log("[Voice] Got first data from Hermes");
          firstData = false;
        }
        const chunkStr = chunk.toString();
        leftover += chunkStr;
        
        // SSE: events are separated by double-newlines. Accumulate data lines until blank line.
        let blankIdx;
        while ((blankIdx = leftover.indexOf("\n\n")) !== -1) {
          const eventBlock = leftover.slice(0, blankIdx);
          leftover = leftover.slice(blankIdx + 2);
          
          // Collect all data: lines in this event block (strip "data: " prefix)
          const dataLines = [];
          for (const line of eventBlock.split("\n")) {
            if (line.startsWith("data: ")) {
              dataLines.push(line.slice(6));
            }
          }
          if (dataLines.length === 0) continue;
          
          const jsonStr = dataLines.join("\n");
          if (jsonStr === "[DONE]") continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) || "";
            if (delta) {
              textBuffer += delta;
              const newSentences = extractSentences();
              if (newSentences.length > 0) {
                sentenceQueue.push(...newSentences);
                processQueue();
              }
            }
          } catch (e) {
            console.log("[Voice] JSON parse error:", e.message);
          }
        }
      });

      curl.stderr.on("data", (d) => {
        console.log("[Voice] curl stderr:", d.toString().slice(0, 200));
      });

      curl.on("close", (code) => {
        console.log("[Voice] curl exited with code", code);
        // Clean up temp file
        try { fs.unlinkSync(tmpFile); } catch {}
        // Stream ended — speak remaining text
        const remaining = textBuffer.trim();
        if (remaining) {
          sentenceQueue.push(remaining);
        }
        // Wait for queue to drain
        const drainInterval = setInterval(async () => {
          if (ttsBusy) return;
          if (sentenceQueue.length > 0) {
            ttsBusy = true;
            while (sentenceQueue.length > 0) {
              const s = sentenceQueue.shift();
              await speakSentence(s);
              if (aborted || res.writableEnded) { clearInterval(drainInterval); return; }
            }
            ttsBusy = false;
            clearInterval(drainInterval);
            if (!aborted && !res.writableEnded) {
              sendSSE("done", { fullText: textBuffer });
              res.end();
            }
          } else if (!ttsBusy) {
            clearInterval(drainInterval);
            if (!aborted && !res.writableEnded) {
              sendSSE("done", { fullText: textBuffer });
              res.end();
            }
          }
        }, 50);
      });

      curl.on("error", (err) => {
        console.log("[Voice] curl error:", err.message);
        if (!aborted && !res.writableEnded) {
          sendSSE("error", { message: "Failed to reach Hermes API: " + err.message });
          res.end();
        }
      });

    } catch (err) {
      if (!res.writableEnded) {
        sendSSE("error", { message: err.message });
        res.end();
      }
    }
    return;
  }

  // ── Lead Finder: run automated lead discovery (async, responds immediately) ──
  if (url.pathname === "/api/lead-finder" && req.method === "POST") {
    if (!checkAuth(req, res)) return;

    if (_finderRunning) {
      return jsonReply(req, res, 200, { status: "already_running", started: _finderLastRun });
    }

    _finderRunning = true;
    _finderLastRun = Date.now();
    _finderLastOutput = "";

    // Detach the Python process — run in background, collect output for status poll
    const child = spawn("python", [path.join(__dirname, "lead_finder.py"), "run"], {
      cwd: __dirname,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    child.stdout.on("data", (d) => { _finderLastOutput += d.toString(); });
    child.stderr.on("data", (d) => { _finderLastOutput += d.toString(); });
    child.on("close", (code) => {
      _finderRunning = false;
      _finderLastOutput += `\n[DONE exit=${code}]`;
      // Push leads to Vercel for phone sync
      pushLeadsToVercel();
    });
    child.on("error", (err) => {
      _finderRunning = false;
      _finderLastOutput += `\n[ERROR: ${err.message}]`;
    });
    child.unref();

    return jsonReply(req, res, 200, { status: "started", started: _finderLastRun });
  }

  if (url.pathname === "/api/lead-finder/status" && req.method === "GET") {
    return jsonReply(req, res, 200, {
      running: _finderRunning,
      lastRun: _finderLastRun,
      output: _finderLastOutput.slice(-1000),
    });
  }

  // ── Lead Finder Targets: read ────────────────────────────────
  if (url.pathname === "/api/lead-finder/targets" && req.method === "GET") {
    if (!checkAuth(req, res)) return;

    const targetsPath = path.join(__dirname, "targets.json");
    try {
      if (fs.existsSync(targetsPath)) {
        const raw = fs.readFileSync(targetsPath, "utf8");
        const data = JSON.parse(raw);
        return jsonReply(req, res, 200, data);
      }
      return jsonReply(req, res, 200, []);
    } catch (err) {
      return jsonReply(req, res, 500, { error: "Failed to read targets: " + err.message });
    }
  }

  // ── Lead Finder Targets: write ───────────────────────────────
  if (url.pathname === "/api/lead-finder/targets" && req.method === "POST") {
    if (!checkAuth(req, res)) return;

    const body = await readBody(req);
    if (!body.targets || !Array.isArray(body.targets)) {
      return jsonReply(req, res, 400, { error: "Missing or invalid 'targets' array" });
    }

    const targetsPath = path.join(__dirname, "targets.json");
    try {
      fs.writeFileSync(targetsPath, JSON.stringify(body.targets, null, 2), "utf8");
      return jsonReply(req, res, 200, { ok: true });
    } catch (err) {
      return jsonReply(req, res, 500, { error: "Failed to save targets: " + err.message });
    }
  }

  // ── Lead Scorer: run ─────────────────────────────────────────
  if (url.pathname === "/api/lead-finder/score" && req.method === "POST") {
    if (!checkAuth(req, res)) return;

    const scorerPath = path.join(__dirname, "lead_scorer.py");
    return new Promise((resolve) => {
      const child = spawn("python", [scorerPath], {
        cwd: __dirname,
        timeout: 30000,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (d) => { stdout += d.toString(); });
      child.stderr.on("data", (d) => { stderr += d.toString(); });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(jsonReply(req, res, 200, {
            ok: true,
            output: stdout.trim(),
            exitCode: code,
          }));
        } else {
          resolve(jsonReply(req, res, 500, {
            error: "Scorer failed with exit code " + code,
            output: stdout.trim(),
            stderr: stderr.trim().slice(-500),
            exitCode: code,
          }));
        }
      });

      child.on("error", (err) => {
        resolve(jsonReply(req, res, 500, {
          error: "Failed to spawn scorer: " + err.message,
          output: stdout.trim(),
          stderr: stderr.trim().slice(-500),
        }));
      });
    });
  }

  // ── 404 ─────────────────────────────────────────────────────
  else {
    jsonReply(req, res, 404, { error: "Not found" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`🎤 555 Voice Bridge running on http://127.0.0.1:${PORT} (also http://localhost:${PORT})`);
  console.log(`   Session: ${HERMES_SESSION}`);
  console.log(`   Auth Token: ${AUTH_TOKEN}`);
  console.log(`   Endpoints:`);
  console.log(`     POST /api/query             — send text, get Hermes response`);
  console.log(`     GET  /api/tts               — get TTS audio for text`);
  console.log(`     GET  /api/health            — health check`);
  console.log(`     POST /api/control           — execute desktop action`);
  console.log(`     GET  /api/control/screenshot — capture screen PNG`);
});


// ======================================================================
// Vercel Relay — polls for remote commands so phone can control desktop
// ======================================================================
const RELAY_URL = "https://555-dashboard.vercel.app/api/bridge";
// using existing AUTH_TOKEN from top of file
const POLL_INTERVAL = 2000; // 2 seconds

let relayActive = false;

async function registerWithRelay() {
  try {
    // Use AbortController with timeout since Node.js fetch hangs in this env
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + AUTH_TOKEN },
      body: JSON.stringify({ op: "register", deviceId: "noah-desktop" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      console.log("[Relay] Registered with Vercel bridge relay");
      relayActive = true;
    } else {
      console.log("[Relay] Registration failed:", res.status);
    }
  } catch (e) {
    console.log("[Relay] Register error (expected if offline):", e.message);
  }
}

async function pollForCommands() {
  if (!relayActive) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + AUTH_TOKEN },
      body: JSON.stringify({ op: "poll" }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      if (res.status === 401) relayActive = false;
      return;
    }
    const data = await res.json();
    if (!data.commands || data.commands.length === 0) return;

    for (const cmd of data.commands) {
      console.log("[Relay] Got command:", cmd.action, cmd.id);
      let result;
      try {
        result = await executeControlCommand(cmd.action, cmd.params);
      } catch (e) {
        result = { status: "error", error: e.message };
      }
      await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + AUTH_TOKEN },
        body: JSON.stringify({ op: "result", id: cmd.id, ...result }),
      }).catch(() => {});
    }
  } catch (e) {
    // Network hiccup — retry next poll
  }
}

async function executeControlCommand(action, params) {
  const { execFile } = require("child_process");
  switch (action) {
    case "query":
      // Relay a Hermes query from remote
      const response = await queryHermes(params.text);
      // Generate TTS audio for the response
      let audioBase64 = null;
      try {
        const ttsPath = await generateTTS(response.slice(0, 500));
        audioBase64 = fs.readFileSync(ttsPath).toString("base64");
      } catch {
        // TTS failed — still send the text response
      }
      return { status: "ok", data: { response, audio: audioBase64 ? ("data:audio/mp3;base64," + audioBase64) : null } };
    case "screenshot":
      // Take screenshot via Python
      return new Promise((resolve) => {
        execFile("python", ["-c", 
          "import base64, sys; from PIL import ImageGrab; img = ImageGrab.grab(); img.save(sys.stdout.buffer, 'PNG')"
        ], { timeout: 10000, maxBuffer: 10 * 1024 * 1024, encoding: "buffer" }, (err, stdout) => {
          if (err) return resolve({ status: "error", error: err.message });
          resolve({ status: "ok", data: { screenshot: "data:image/png;base64," + stdout.toString("base64") } });
        });
      });
    case "run_lead_finder":
      return new Promise((resolve) => {
        const child = spawn("python", [path.join(__dirname, "lead_finder.py"), "run"], {
          timeout: 120000,
          cwd: __dirname,
        });
        let out = "";
        child.stdout.on("data", (d) => { out += d.toString(); });
        child.stderr.on("data", (d) => { out += d.toString(); });
        child.on("close", (code) => {
          resolve({ status: code === 0 ? "ok" : "error", data: { output: out.slice(-1000), exitCode: code } });
        });
      });
    default:
      return { status: "error", error: "Unknown action: " + action };
  }
}

// Start relay polling
registerWithRelay();
setInterval(() => {
  registerWithRelay(); // re-register if connection lost
  pollForCommands();
}, POLL_INTERVAL);

// ── Scheduler: check every 3 minutes if lead finder should run ────────
function checkScheduler() {
  const child = spawn("python", [path.join(__dirname, "scheduler.py")], {
    cwd: __dirname,
    stdio: "pipe",
  });
  let out = "";
  child.stdout.on("data", (d) => { out += d.toString(); });
  child.on("close", (code) => {
    if (out.trim() && code === 0) {
      console.log("[Scheduler]", out.trim().split("\n").pop());
    }
  });
}
setInterval(checkScheduler, 180000); // every 3 minutes
checkScheduler(); // run once at startup

console.log("[Relay] Polling Vercel at", RELAY_URL);

// ── Push leads to Vercel relay for phone sync ────────────────────────
function pushLeadsToVercel() {
  try {
    const leadFile = "/tmp/555-leads.json";
    if (!fs.existsSync(leadFile)) return;
    const leads = JSON.parse(fs.readFileSync(leadFile, "utf8"));
    if (!leads || leads.length === 0) return;

    const body = JSON.stringify({ op: "push_leads", leads });
    const url = new URL(RELAY_URL);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + AUTH_TOKEN,
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode === 200) {
        console.log("[Relay] Pushed " + leads.length + " leads to Vercel for phone sync");
      }
    });
    req.on("error", (e) => console.log("[Relay] Push leads error:", e.message));
    req.on("timeout", () => { req.destroy(); });
    req.write(body);
    req.end();
  } catch (e) {
    console.log("[Relay] Push leads error:", e.message);
  }
}
