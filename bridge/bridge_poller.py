#!/usr/bin/env python3
"""555 Bridge Poller"""
import time, json, urllib.request, subprocess, sys, os

RELAY = "https://555-dashboard.vercel.app/api/bridge"
AUTH = "555-remote" + "-bridge"
DEVICE = os.environ.get("COMPUTERNAME", "unknown")

def api(op, data=None):
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {AUTH}"}
    body = json.dumps({"op": op, **(data or {})}).encode() if op else None
    req = urllib.request.Request(RELAY, data=body, headers=headers, method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())

def query_hermes(text):
    try:
        r = subprocess.run(["hermes", "chat", "-q", text, "-Q"],
            capture_output=True, text=True, timeout=90,
            env={**os.environ, "HERMES_NO_COLOR": "1"})
        lines_out = [l.strip() for l in r.stdout.split("\n") if l.strip()
                 and not l.startswith("session_id:")
                 and "Reasoning" not in l]
        return lines_out[-1] if lines_out else "(no response)"
    except subprocess.TimeoutExpired:
        return "(timed out)"
    except Exception as e:
        return f"(error: {e})"

print(f"Bridge Poller starting (device: {DEVICE})...", flush=True)
resp = api("register", {"deviceId": DEVICE})
print(f"  Registered: {resp.get('ok')}", flush=True)
print("Polling...", flush=True)
while True:
    try:
        resp = api("poll")
        for cmd in resp.get("commands", []):
            cid = cmd["id"]
            action = cmd["action"]
            text = cmd.get("params", {}).get("text", "")
            print(f"  [{cid}] {action}: {text[:60]}...", flush=True)
            if action == "query" and text:
                result = query_hermes(text)
                api("result", {"id": cid, "status": "ok", "data": result})
                print(f"    -> {result[:100]}", flush=True)
    except Exception as e:
        print(f"  Poll error: {e}", flush=True)
    time.sleep(2)