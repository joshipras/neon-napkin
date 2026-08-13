#!/usr/bin/env python3
"""Fetch upcoming Yankees home games and SeatGeek event-level lowest prices.

Usage:
    SEATGEEK_CLIENT_ID=your_client_id python scripts/seatgeek_yankees_prices.py

Or:
    python scripts/seatgeek_yankees_prices.py --client-id your_client_id
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pandas as pd


API_BASE_URL = "https://api.seatgeek.com/2/events"
YANKEES_SLUG = "new-york-yankees"
YANKEE_STADIUM_NAME = "Yankee Stadium"


class SeatGeekAPIError(RuntimeError):
    """Raised when SeatGeek returns an unsuccessful or malformed response."""


def fetch_yankees_home_games(
    client_id: str,
    *,
    days_ahead: int = 365,
    per_page: int = 100,
    max_pages: int = 10,
    timeout_seconds: int = 20,
) -> pd.DataFrame:
    """Return upcoming Yankees home games with SeatGeek lowest prices.

    The returned DataFrame is sorted chronologically and includes:
    event_id, event_date, opponent, title, venue, lowest_price, listing_count, url
    """

    if not client_id:
        raise ValueError("SeatGeek client_id is required")

    now_utc = datetime.now(timezone.utc)
    end_utc = now_utc + timedelta(days=days_ahead)
    all_events: List[Dict[str, Any]] = []

    for page in range(1, max_pages + 1):
        params = build_query_params(
            client_id=client_id,
            start_utc=now_utc,
            end_utc=end_utc,
            page=page,
            per_page=per_page,
        )
        payload = get_json(API_BASE_URL, params=params, timeout_seconds=timeout_seconds)

        events = payload.get("events")
        if events is None:
            raise SeatGeekAPIError("SeatGeek response did not include an 'events' field")
        if not isinstance(events, list):
            raise SeatGeekAPIError("SeatGeek response field 'events' was not a list")

        all_events.extend(events)

        meta = payload.get("meta") or {}
        total = safe_int(meta.get("total"), default=len(all_events))
        returned_so_far = page * per_page
        if not events or returned_so_far >= total:
            break

    rows = [parse_event(event) for event in all_events]
    rows = [row for row in rows if row is not None]

    df = pd.DataFrame(rows)
    if df.empty:
        return pd.DataFrame(
            columns=[
                "event_id",
                "event_date",
                "opponent",
                "title",
                "venue",
                "lowest_price",
                "listing_count",
                "url",
            ]
        )

    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce")
    df = df.dropna(subset=["event_date"]).sort_values("event_date").reset_index(drop=True)
    return df


def build_query_params(
    *,
    client_id: str,
    start_utc: datetime,
    end_utc: datetime,
    page: int,
    per_page: int,
) -> Dict[str, str]:
    return {
        "client_id": client_id,
        "performers[home_team].slug": YANKEES_SLUG,
        "venue.name": YANKEE_STADIUM_NAME,
        "datetime_utc.gte": start_utc.strftime("%Y-%m-%dT%H:%M:%S"),
        "datetime_utc.lte": end_utc.strftime("%Y-%m-%dT%H:%M:%S"),
        "listing_count.gt": "0",
        "sort": "datetime_local.asc",
        "per_page": str(per_page),
        "page": str(page),
    }


def get_json(url: str, *, params: Dict[str, str], timeout_seconds: int) -> Dict[str, Any]:
    full_url = f"{url}?{urlencode(params)}"
    request = Request(full_url, headers={"Accept": "application/json", "User-Agent": "yankees-ticket-watcher/0.1"})

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            status = getattr(response, "status", 200)
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        message = exc.read().decode("utf-8", errors="replace")[:500]
        if exc.code == 429:
            retry_after = exc.headers.get("Retry-After")
            detail = f" Retry after {retry_after} seconds." if retry_after else ""
            raise SeatGeekAPIError(f"SeatGeek rate limit hit: HTTP 429.{detail}") from exc
        if exc.code in {401, 403}:
            raise SeatGeekAPIError("SeatGeek authentication failed. Check SEATGEEK_CLIENT_ID.") from exc
        raise SeatGeekAPIError(f"SeatGeek API error HTTP {exc.code}: {message}") from exc
    except URLError as exc:
        raise SeatGeekAPIError(f"Could not connect to SeatGeek: {exc.reason}") from exc
    except TimeoutError as exc:
        raise SeatGeekAPIError("Timed out connecting to SeatGeek") from exc

    if status == 429:
        raise SeatGeekAPIError("SeatGeek rate limit hit: HTTP 429")
    if status >= 400:
        raise SeatGeekAPIError(f"SeatGeek API error HTTP {status}: {body[:500]}")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise SeatGeekAPIError("SeatGeek returned invalid JSON") from exc

    if not isinstance(payload, dict):
        raise SeatGeekAPIError("SeatGeek returned JSON that was not an object")
    return payload


def parse_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    event_id = event.get("id")
    title = safe_str(event.get("title") or event.get("short_title"))
    event_date = safe_str(event.get("datetime_local") or event.get("datetime_utc"))
    venue = event.get("venue") or {}
    venue_name = safe_str(venue.get("name"))
    stats = event.get("stats") or {}

    if event_id is None or not event_date:
        print(f"Skipping event with missing id/date: {title or event!r}", file=sys.stderr)
        return None

    lowest_price = safe_decimal(stats.get("lowest_price"))
    listing_count = safe_int(stats.get("listing_count"))

    return {
        "event_id": event_id,
        "event_date": event_date,
        "opponent": opponent_from_event(event),
        "title": title,
        "venue": venue_name,
        "lowest_price": lowest_price,
        "listing_count": listing_count,
        "url": safe_str(event.get("url")),
    }


def opponent_from_event(event: Dict[str, Any]) -> str:
    performers = event.get("performers") or []
    if isinstance(performers, list):
        for performer in performers:
            if not isinstance(performer, dict):
                continue
            if performer.get("home_team") is True:
                continue
            if performer.get("slug") == YANKEES_SLUG:
                continue
            name = performer.get("short_name") or performer.get("name")
            if name:
                return str(name)

    title = safe_str(event.get("short_title") or event.get("title"))
    for fragment in ("New York Yankees", "Yankees"):
        title = title.replace(fragment, "")
    title = title.replace(" at ", "").replace(" vs. ", "").replace(" vs ", "").strip(" -")
    return title or "Opponent TBD"


def safe_decimal(value: Any) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return None


def safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_str(value: Any) -> str:
    return "" if value is None else str(value)


def main(argv: Optional[Iterable[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch upcoming Yankees home games from SeatGeek.")
    parser.add_argument("--client-id", default=os.getenv("SEATGEEK_CLIENT_ID"), help="SeatGeek API client ID.")
    parser.add_argument("--days-ahead", type=int, default=365, help="How many days ahead to search.")
    parser.add_argument("--csv", help="Optional path to write CSV output.")
    parser.add_argument("--retry", type=int, default=0, help="Number of retries for transient/rate-limit errors.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    attempts = args.retry + 1
    for attempt in range(1, attempts + 1):
        try:
            df = fetch_yankees_home_games(args.client_id, days_ahead=args.days_ahead)
            break
        except SeatGeekAPIError as exc:
            if attempt >= attempts:
                print(f"Error: {exc}", file=sys.stderr)
                return 1
            sleep_seconds = min(60, 2**attempt)
            print(f"Attempt {attempt} failed: {exc}. Retrying in {sleep_seconds}s...", file=sys.stderr)
            time.sleep(sleep_seconds)
    else:
        return 1

    if args.csv:
        df.to_csv(args.csv, index=False)

    if df.empty:
        print("No upcoming Yankees home games with listings found.")
    else:
        print(df.to_string(index=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

