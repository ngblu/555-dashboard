import subprocess

with open(r"C:\Users\ngblu\555-dashboard\bridge\.hermes_key") as f:
    key = f.read().strip()

auth = "Bearer " + key

# Test with stream:false to see what the response looks like
result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'http://127.0.0.1:8642/v1/chat/completions',
    '-H', 'Content-Type: application/json',
    '-H', 'Authorization: *** + auth,
    '-d', '{"model":"hermes-agent","messages":[{"role":"user","content":"say hello in 2 words"}],"stream":false,"max_tokens":20}',
    '--max-time', '30'
], capture_output=True, timeout=35)

print("STDOUT:", result.stdout.decode('utf-8', errors='replace')[:500])
print("STDERR:", result.stderr.decode('utf-8', errors='replace')[:200])
print("RC:", result.returncode)
