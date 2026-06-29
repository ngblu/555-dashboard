#!/usr/bin/env python3
"""
555 Lead Scheduler — runs the lead finder on a schedule.
Called by the bridge every N seconds to check if it's time to run.
Stores last run time in a state file to avoid duplicate runs.
"""
import json, os, sys, time, subprocess

STATE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".scheduler_state.json")
LEAD_FINDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lead_finder.py")
SCORER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lead_scorer.py")

# Default: run every 6 hours between 6am and 10pm
INTERVAL_SECONDS = 6 * 3600  # 6 hours
ACTIVE_HOURS = (6, 22)  # 6am to 10pm


def load_state():
    try:
        if os.path.exists(STATE_FILE):
            with open(STATE_FILE) as f:
                return json.load(f)
    except:
        pass
    return {"last_run": 0, "total_runs": 0, "total_leads": 0}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)


def should_run(state):
    now = time.time()
    elapsed = now - state.get("last_run", 0)
    if elapsed < INTERVAL_SECONDS:
        return False
    
    # Check active hours
    hour = int(time.strftime("%H", time.localtime()))
    if hour < ACTIVE_HOURS[0] or hour >= ACTIVE_HOURS[1]:
        return False
    
    return True


def run_lead_finder():
    print("[Scheduler] Running lead finder...")
    try:
        result = subprocess.run(
            [sys.executable, LEAD_FINDER, "run"],
            capture_output=True, text=True, timeout=300,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        output = result.stdout + result.stderr
        # Count leads created
        lead_count = output.count("LEAD:")
        print(f"[Scheduler] Lead finder complete. Leads found: {lead_count}")
        return lead_count, output[-300:]
    except subprocess.TimeoutExpired:
        print("[Scheduler] Lead finder timed out after 5 minutes")
        return 0, "timeout"
    except Exception as e:
        print(f"[Scheduler] Lead finder error: {e}")
        return 0, str(e)


def run_scorer():
    print("[Scheduler] Running lead scorer...")
    try:
        result = subprocess.run(
            [sys.executable, SCORER],
            capture_output=True, text=True, timeout=30,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        print(result.stdout.strip()[-200:])
    except Exception as e:
        print(f"[Scheduler] Scorer error: {e}")


if __name__ == "__main__":
    state = load_state()
    
    if not should_run(state):
        # Silent exit — not time yet
        sys.exit(0)
    
    print(f"[Scheduler] Triggered (last run: {time.strftime('%Y-%m-%d %H:%M', time.localtime(state['last_run']))})")
    
    lead_count, _ = run_lead_finder()
    run_scorer()
    
    state["last_run"] = time.time()
    state["total_runs"] = state.get("total_runs", 0) + 1
    state["total_leads"] = state.get("total_leads", 0) + lead_count
    save_state(state)
    
    print(f"[Scheduler] Done. Total runs: {state['total_runs']}, Total leads: {state['total_leads']}")
