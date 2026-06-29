#!/usr/bin/env python3
"""
555 Lead Scoring Engine — scores leads 0-100 based on qualification signals.
Reads /tmp/555-leads.json, appends score + classification, writes back.
Usage: python lead_scorer.py
"""

import json
import os
import sys

LEADS_FILE = "/tmp/555-leads.json"


def load_leads(filepath):
    """Read and parse the leads JSON file. Returns empty list on missing/invalid file."""
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found.")
        return None
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, list):
            print(f"Error: {filepath} does not contain a JSON array.")
            return None
        return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {filepath}: {e}")
        return None


def save_leads(filepath, leads):
    """Write the scored leads back to the JSON file."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(leads, f, indent=2, ensure_ascii=False)
        return True
    except IOError as e:
        print(f"Error writing {filepath}: {e}")
        return False


def score_lead(lead):
    """
    Score a single lead (0-100) based on qualification signals.

    Criteria:
      - has_website:    +20  (website field present and starts with http)
      - has_phone:      +15  (phone field present and non-empty)
      - has_audit:      +25  (audit field present with valid scores, no error)
      - low_performance: +30  (performance score < 50 — bad site = better prospect)
      - has_industry_match: +10  (industry field present and non-empty)
    """
    score = 0

    # has_website (+20)
    website = lead.get("website", "")
    if website and isinstance(website, str) and website.strip():
        score += 20

    # has_phone (+15)
    phone = lead.get("phone", "")
    if phone and isinstance(phone, str) and phone.strip():
        score += 15

    # has_audit (+25)
    audit = lead.get("audit")
    if isinstance(audit, dict) and "error" not in audit:
        score += 25

    # low_performance_score (+30 for bad sites = better prospects)
    if isinstance(audit, dict):
        perf = audit.get("performance")
        if isinstance(perf, (int, float)) and perf < 50:
            score += 30

    # has_industry_match (+10)
    industry = lead.get("industry", "")
    if industry and isinstance(industry, str) and industry.strip():
        score += 10

    return score


def classify(score):
    """Classify a score into hot / warm / cold."""
    if score >= 70:
        return "hot"
    if score >= 40:
        return "warm"
    return "cold"


def main():
    leads = load_leads(LEADS_FILE)
    if leads is None:
        sys.exit(1)

    if len(leads) == 0:
        print("No leads to score — /tmp/555-leads.json is an empty array.")
        return

    hot_count = 0
    warm_count = 0
    cold_count = 0

    for lead in leads:
        s = score_lead(lead)
        c = classify(s)
        lead["score"] = s
        lead["classification"] = c
        if c == "hot":
            hot_count += 1
        elif c == "warm":
            warm_count += 1
        else:
            cold_count += 1

    if not save_leads(LEADS_FILE, leads):
        sys.exit(1)

    # Print summary
    total = len(leads)
    hot_pct = round(hot_count / total * 100) if total else 0
    warm_pct = round(warm_count / total * 100) if total else 0
    cold_pct = round(cold_count / total * 100) if total else 0

    print("=" * 50)
    print("555 Lead Scoring Summary")
    print("=" * 50)
    print(f"Total leads scored: {total}")
    print(f"  Hot   (70-100): {hot_count:>4}  ({hot_pct}%)")
    print(f"  Warm  (40-69):  {warm_count:>4}  ({warm_pct}%)")
    print(f"  Cold  (<40):    {cold_count:>4}  ({cold_pct}%)")
    print("=" * 50)

    # Print top 5 hot leads
    hot_leads = [l for l in leads if l.get("classification") == "hot"]
    hot_leads.sort(key=lambda l: l.get("score", 0), reverse=True)
    if hot_leads:
        print("\nTop Hot Leads:")
        for i, lead in enumerate(hot_leads[:5], 1):
            name = lead.get("businessName", "Unknown")
            website = lead.get("website", "no website")[:50]
            score = lead.get("score", 0)
            print(f"  {i}. [{score}] {name} — {website}")
    else:
        print("\nNo hot leads found.")


if __name__ == "__main__":
    main()
