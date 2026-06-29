#!/usr/bin/env python3
"""
555 Lead Finder v3 - Page 2 Google results via DuckDuckGo.
Finds businesses that do not rank on page 1, audits websites,
and creates qualified leads with real PageSpeed scores.
"""

import json, os, sys, time, urllib.request, urllib.parse
from ddgs import DDGS

HERMES_API = "http://127.0.0.1:8642/v1/chat/completions"
DASHBOARD_API = "http://127.0.0.1:3000/api"

key_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".hermes_key")
try:
    with open(key_file) as f:
        hermes_key = f.read().strip()
except Exception as e:
    print(f"FATAL: Cannot read API key from {key_file}: {e}")
    sys.exit(1)

# Load targets from targets.json (editable by the dashboard UI).
# Falls back to hardcoded defaults if the file is missing or invalid.
TARGETS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "targets.json")
DEFAULT_TARGETS = [
    {"city": "Cookeville", "state": "TN", "industry": "Plumbing"},
    {"city": "Cookeville", "state": "TN", "industry": "HVAC"},
    {"city": "Cookeville", "state": "TN", "industry": "Landscaping"},
    {"city": "Cookeville", "state": "TN", "industry": "Roofing"},
    {"city": "Sparta", "state": "TN", "industry": "Plumbing"},
    {"city": "Crossville", "state": "TN", "industry": "HVAC"},
]

def _load_targets():
    if os.path.exists(TARGETS_FILE):
        try:
            with open(TARGETS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list) and len(data) > 0:
                return data
        except (json.JSONDecodeError, IOError):
            pass
    return DEFAULT_TARGETS

TARGETS = _load_targets()

PAGE1_SKIP = 10
PAGESPEED_KEY = os.environ.get("PAGESPEED_API_KEY", "")

SKIP_DOMAINS = [
    "yelp.com",
    "facebook.com",
    "yellowpages.com",
    "angi.com",
    "homeadvisor.com",
    "bbb.org",
    "mapquest.com",
    "maps.google",
    "linkedin.com",
    "instagram.com",
    "twitter.com",
    "nextdoor.com",
    "thumbtack.com",
    "superpages.com",
    "indeed.com",
    "careerbuilder",
    "glassdoor.com",
    "medium.com",
    "reddit.com",
    "pinterest.com",
    "tiktok.com",
    "snapchat.com",
    "wikipedia.org",
    "quora.com",
    "bazoomble.com",
    "alloftheweb.com",
    "careerjet.com",
]


def is_business_site(url):
    if not url or "http" not in url:
        return False
    low = url.lower()
    for skip in SKIP_DOMAINS:
        if skip in low:
            return False
    return True


def search_page2(industry, city, state):
    queries = [
        f"{industry} company {city} {state}",
        f"{industry} services {city} {state}",
    ]
    all_results = []
    seen = set()
    for query in queries:
        try:
            with DDGS() as ddgs:
                raw = list(ddgs.text(query, max_results=20))
                for r in raw[PAGE1_SKIP:]:
                    url = r.get("href", "")
                    title = r.get("title", "")
                    if not is_business_site(url):
                        continue
                    domain = url.split("/")[2] if "//" in url else url
                    if domain in seen:
                        continue
                    seen.add(domain)
                    all_results.append({
                        "name": title[:80].strip(),
                        "website": url,
                        "snippet": r.get("body", ""),
                    })
                    if len(all_results) >= 5:
                        break
            if len(all_results) >= 3:
                break
        except Exception as e:
            print(f"  Search error ({query}): {e}")
            time.sleep(2)
    return all_results[:5]


def run_audit(website_url):
    target = website_url.strip()
    if not target.startswith("http"):
        target = "https://" + target
    key_param = f"&key={PAGESPEED_KEY}" if PAGESPEED_KEY else ""
    api_url = (
        f"https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
        f"?url={urllib.parse.quote(target)}"
        f"&strategy=mobile"
        f"&category=PERFORMANCE&category=SEO"
        f"&category=ACCESSIBILITY&category=BEST_PRACTICES"
        f"{key_param}"
    )
    try:
        req = urllib.request.Request(api_url)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            lh = data.get("lighthouseResult", {})
            cats = lh.get("categories", {})
            audits = lh.get("audits", {})
            return {
                "performance": round((cats.get("performance", {}).get("score", 0)) * 100),
                "seo": round((cats.get("seo", {}).get("score", 0)) * 100),
                "accessibility": round((cats.get("accessibility", {}).get("score", 0)) * 100),
                "best_practices": round((cats.get("best-practices", {}).get("score", 0)) * 100),
                "fcp": audits.get("first-contentful-paint", {}).get("displayValue", "N/A"),
                "lcp": audits.get("largest-contentful-paint", {}).get("displayValue", "N/A"),
                "speed_index": audits.get("speed-index", {}).get("displayValue", "N/A"),
            }
    except Exception as e:
        err = str(e)
        if "429" in err:
            return {"error": "quota_exceeded"}
        if any(x in err for x in ("404", "DNS", "NameResolutionError", "getaddrinfo", "UnknownHost")):
            return {"error": "site_unreachable"}
        return {"error": err[:100]}


def hermes_enrich(biz, industry, city, state):
    name = biz.get("name", "").split("|")[0].split("-")[0].strip()
    website = biz.get("website", "")
    prompt = (
        f"Find the business phone number for {name} in {city}, {state}. "
        f"Their website is {website}. "
        f"Also write ONE sentence about why their website might be losing customers "
        f"(for a {industry} business). "
        "Return ONLY JSON: {{\"phone\":\"...\",\"reason\":\"...\"}}"
    )
    body = json.dumps({
        "model": "hermes-agent",
        "messages": [
            {"role": "system", "content": "Find business contact info. Return ONLY JSON. Be factual."},
            {"role": "user", "content": prompt}
        ],
        "stream": False,
        "max_tokens": 200
    }).encode()
    req = urllib.request.Request(HERMES_API, data=body, headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer " + hermes_key
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read())
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
    except Exception as e:
        print(f"  Hermes enrich error: {e}")
    return {}


def create_lead(biz, audit, enrich, industry, city, state):
    has_audit = "error" not in audit
    lead = {
        "businessName": biz.get("name", "Unknown")[:100],
        "website": biz.get("website", ""),
        "industry": industry,
        "contactEmail": enrich.get("email", ""),
        "phone": enrich.get("phone", ""),
        "notes": (
            f"PAGE 2 GOOGLE - {city}, {state}. "
            f"Perf {audit.get('performance','?')}/100, "
            f"SEO {audit.get('seo','?')}/100. "
            f"{enrich.get('reason','')}"
        ),
        "source": "page2_audit",
        "audit": audit if has_audit else None,
    }
    try:
        body = json.dumps(lead).encode()
        req = urllib.request.Request(
            f"{DASHBOARD_API}/submit-lead",
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            return result.get("lead", {}).get("id")
    except Exception as e:
        print(f"  Lead create error: {e}")
        return None


def domain_short(url):
    if not url:
        return "no site"
    d = url.replace("https://", "").replace("http://", "").replace("www.", "")
    return d.split("/")[0][:45]


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "run":
        print("=" * 60)
        print("555 Lead Finder v3 - Page 2 Audits")
        print("=" * 60)
        total = 0
        for target in TARGETS:
            city = target["city"]
            state = target["state"]
            industry = target["industry"]
            print("")
            print(f"-- [{industry}] Page 2 Google, {city} {state} --")
            businesses = search_page2(industry, city, state)
            print(f"  {len(businesses)} businesses found on page 2")
            for i, biz in enumerate(businesses):
                w = biz.get("website", "")
                print(f"  [{i+1}] {biz['name'][:55]}")
                print(f"       {domain_short(w)}")
                if not w:
                    print("       SKIP: no website")
                    continue
                print("       Auditing...")
                audit = run_audit(w)
                if audit.get("error") == "site_unreachable":
                    print("       SKIP: site unreachable")
                    continue
                if "error" in audit:
                    print(f"       Audit issue: {audit['error']}")
                else:
                    p = audit["performance"]
                    s = audit["seo"]
                    print(f"       Score: Perf {p}/100, SEO {s}/100")
                print("       Enriching...")
                enrich = hermes_enrich(biz, industry, city, state)
                if enrich.get("phone"):
                    print(f"       Phone: {enrich['phone']}")
                if enrich.get("reason"):
                    print(f"       Angle: {enrich['reason'][:80]}")
                lid = create_lead(biz, audit, enrich, industry, city, state)
                if lid:
                    total += 1
                    print(f"       LEAD: {lid}")
                time.sleep(3)
        print("")
        print("=" * 60)
        print(f"COMPLETE: {total} leads created from page 2 Google results")
        print("=" * 60)
