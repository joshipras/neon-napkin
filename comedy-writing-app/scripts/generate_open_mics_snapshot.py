#!/usr/bin/env python3
import json
import time
from pathlib import Path
from urllib.parse import urlencode

import requests


SUPABASE_URL = "https://cotfweyhlglpjmgqxwqx.supabase.co/rest/v1/open_mics_historical"
SUPABASE_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvdGZ3ZXlobGdscGptZ3F4d3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NDU0OTEsImV4cCI6MjA2NDIyMTQ5MX0."
    "cgAtNE4qE4dgeHUu_Q1yQEJBimQlDoy8yDDC_if8GuY"
)
SELECT_FIELDS = ",".join(
    [
        "unique_identifier",
        "open_mic",
        "day",
        "start_time",
        "latest_end_time",
        "venue_name",
        "borough",
        "neighborhood",
        "location",
        "venue_type",
        "cost",
        "stage_time",
        "sign_up_instructions",
        "hosts_organizers",
        "changes_updates",
        "last_verified",
        "other_rules",
        "active",
        "city",
        "signup_enabled",
        "status",
        "verification_count",
        "frequency",
        "signup_method",
        "signup_url",
        "slots_enabled",
        "slot_duration_minutes",
        "price_per_slot",
        "frequency_custom_text",
    ]
)
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = REPO_ROOT / "src" / "data" / "comediq_open_mics_snapshot.json"
SEED_PATH = REPO_ROOT / "src" / "data" / "open_mics.json"
CACHE_PATH = REPO_ROOT / "tmp" / "comediq_geocode_cache.json"


def normalize_key(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else " " for ch in (value or "")).strip()


def load_seed_coordinates():
    if not SEED_PATH.exists():
        return {}

    rows = json.loads(SEED_PATH.read_text())
    coords = {}
    for row in rows:
        if not row.get("coordinates"):
            continue
        if row["coordinates"].get("lat") is None or row["coordinates"].get("lng") is None:
            continue
        coords[normalize_key(row.get("venueName", ""))] = row["coordinates"]
        coords[normalize_key(row.get("venueAddress", ""))] = row["coordinates"]
    return coords


def load_cache():
    if not CACHE_PATH.exists():
        return {}
    return json.loads(CACHE_PATH.read_text())


def save_cache(cache):
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, indent=2))


def fetch_rows():
    params = {
        "select": SELECT_FIELDS,
        "active": "eq.true",
        "city": "eq.New York",
        "order": "day.asc,start_time.asc",
        "limit": "286",
    }
    response = requests.get(f"{SUPABASE_URL}?{urlencode(params)}", headers=HEADERS, timeout=60)
    response.raise_for_status()
    return response.json()


def geocode_address(address):
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={
            "format": "jsonv2",
            "limit": 1,
            "countrycodes": "us",
            "q": address,
        },
        headers={
            "User-Agent": "ComedyWritingApp/1.0 (manual monthly snapshot refresh)",
            "Accept": "application/json",
        },
        timeout=60,
    )
    response.raise_for_status()
    results = response.json()
    match = results[0] if results else None
    if not match:
        return None
    return {
        "lat": float(match["lat"]),
        "lng": float(match["lon"]),
    }


def main():
    rows = fetch_rows()
    seed_coords = load_seed_coordinates()
    cache = load_cache()
    snapshot_date = time.strftime("%Y-%m-%d")

    for row in rows:
        address_key = normalize_key(row.get("location", ""))
        venue_key = normalize_key(row.get("venue_name", ""))

        coords = None
        if address_key in seed_coords:
            coords = seed_coords[address_key]
        elif venue_key in seed_coords:
            coords = seed_coords[venue_key]
        elif address_key in cache:
            coords = cache[address_key]
        elif row.get("location"):
            try:
                coords = geocode_address(row["location"])
                if coords:
                    cache[address_key] = coords
                time.sleep(0.2)
            except Exception:
                coords = None

        row["coordinates"] = coords

    save_cache(cache)

    payload = {
        "snapshotDate": snapshot_date,
        "source": "Comediq public listings",
        "count": len(rows),
        "mics": rows,
    }

    OUTPUT_PATH.write_text(json.dumps(payload, indent=2))
    print(f"Wrote {OUTPUT_PATH} with {len(rows)} mics for {snapshot_date}")


if __name__ == "__main__":
    main()
