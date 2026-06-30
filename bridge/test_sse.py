import subprocess, sys

# Read API key from file
with open(r"C:\Users\ngblu\555-dashboard\bridge\.hermes_key") as f:
    key = f.read().strip()

auth = "Bearer " + key

result = subprocess.run([
    'curl', '-s', '-N', '-X', 'POST',
    'http://127.0.0.1:8642/v1/chat/completions',
    '-H', 'Content-Type: application/json',
    '-H', 'Authorization: ' + auth,
    '-d', '{"model":"hermes-agent","messages":[{"role":"user","content":"hi"}],"stream":true,"max_tokens":5}',
    '--max-time', '10'
], capture_output=True, timeout=12)

raw = result.stdout
dn = b'\n\n'
print("Total bytes:", len(raw))
print("Has double-newline:", dn in raw)
print("Double-newline count:", raw.count(dn))
print("---TEXT---")
print(raw[:600].decode('utf-8', errors='replace'))
