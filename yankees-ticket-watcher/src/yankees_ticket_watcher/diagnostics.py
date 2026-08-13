from __future__ import annotations

import json
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.providers import build_provider
from yankees_ticket_watcher.providers.seatgeek import SeatGeekProvider


LOUNGE_SEARCH_TERMS = [
    "lounge",
    "club",
    "jim beam",
    "jimbeam",
    "audi",
    "pepsi",
    "delta",
    "legends",
    "suite",
    "premium",
    "mvp",
    "field mvp",
    "club access",
    "club level",
    "hospitality",
    "amenity",
    "amenities",
    "benefit",
    "benefits",
]

SECRET_KEY_PARTS = ("token", "secret", "password", "authorization", "client_id", "client_secret", "api_key")
IGNORED_TEXT_KEY_PARTS = ("url", "uri", "href", "id", "slug")


def run_seatgeek_debug(settings: Settings, provider_name: str, output_path: Path) -> str:
    if provider_name != "seatgeek":
        raise ValueError("--debug-listings is currently implemented for --provider seatgeek only")

    provider = build_provider("seatgeek", settings)
    if not isinstance(provider, SeatGeekProvider):
        raise ValueError("Expected SeatGeekProvider")

    games = provider.get_yankees_home_games()
    raw_items = []
    reports = []
    for game in games:
        search_payload = provider.raw_event_payload(game.game_id)
        detail_payload = provider.fetch_event_detail_for_debug(game)
        combined = {
            "game": asdict(game),
            "search_event_payload": sanitize_json(search_payload),
            "detail_event_payload": sanitize_json(detail_payload),
        }
        raw_items.append(combined)
        reports.append(build_event_diagnostic(game.game_id, combined, settings))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(raw_items, indent=2, sort_keys=True, default=str))

    header = [
        "SEATGEEK RAW PAYLOAD DIAGNOSTIC",
        "",
        f"Games inspected: {len(games)}",
        f"Saved sanitized JSON: {output_path}",
        "",
    ]
    if not games:
        header.append("No SeatGeek events matched the current Yankees home-game query.")
    return "\n".join(header + reports + ["", "SANITIZED RAW JSON", json.dumps(raw_items, indent=2, sort_keys=True, default=str)])


def build_event_diagnostic(game_id: str, combined_payload: dict, settings: Settings) -> str:
    search_event = combined_payload.get("search_event_payload") or {}
    detail_event = combined_payload.get("detail_event_payload") or {}
    event = detail_event if detail_event else search_event
    title = event.get("title") or event.get("short_title") or combined_payload.get("game", {}).get("opponent")
    top_level_fields = sorted(str(key) for key in event.keys())
    section_matches = find_paths_for_values(event, settings.target_sections)
    lounge_matches = recursive_term_matches(combined_payload, LOUNGE_SEARCH_TERMS)

    lines = [
        "",
        "SEATGEEK LISTING DIAGNOSTIC",
        "",
        f"Event: {title or 'Unknown'}",
        f"Event ID: {game_id}",
        "",
        "Top-level fields:",
        json.dumps(top_level_fields, indent=2),
        "",
    ]

    if section_matches:
        lines.extend(["Configured target-section references:"])
        lines.extend(format_matches(section_matches))
    else:
        lines.extend(
            [
                "Configured target-section references:",
                "None found. The current SeatGeek endpoint did not expose listing-level section data.",
            ]
        )

    lines.append("")
    if lounge_matches:
        lines.append("Possible lounge-related fields:")
        lines.extend(format_matches(lounge_matches))
    else:
        lines.extend(
            [
                "Possible lounge-related fields:",
                "None found. The current SeatGeek payload did not expose club/lounge benefit text.",
            ]
        )

    existing_field_report = existing_fields_report(
        event,
        ["attributes", "notes", "disclosures", "tags", "features", "amenities", "ticket_type", "description"],
    )
    if existing_field_report:
        lines.extend(["", "Requested fields that actually exist:"])
        lines.extend(existing_field_report)

    return "\n".join(lines)


def recursive_term_matches(value: Any, terms: list[str], path: str = "$") -> list[tuple[str, str]]:
    matches = []
    lowered_terms = [term.lower() for term in terms]
    if isinstance(value, dict):
        for key, child in value.items():
            key_path = f"{path}.{key}"
            key_text = str(key).lower()
            if any(term in key_text for term in lowered_terms):
                matches.append((key_path, str(key)))
            matches.extend(recursive_term_matches(child, terms, key_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            matches.extend(recursive_term_matches(child, terms, f"{path}[{index}]"))
    elif isinstance(value, str):
        lowered = value.lower()
        if any(term in lowered for term in lowered_terms):
            matches.append((path, value))
    return matches


def find_paths_for_values(value: Any, needles: set[str], path: str = "$") -> list[tuple[str, str]]:
    matches = []
    normalized_needles = {needle.upper() for needle in needles}
    if isinstance(value, dict):
        for key, child in value.items():
            matches.extend(find_paths_for_values(child, normalized_needles, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            matches.extend(find_paths_for_values(child, normalized_needles, f"{path}[{index}]"))
    elif isinstance(value, str) and value.strip().upper() in normalized_needles:
        matches.append((path, value))
    return matches


def extract_searchable_listing_text(raw_listing: dict) -> str:
    strings = []
    for path, value in iter_meaningful_strings(raw_listing):
        if _is_ignored_text_path(path):
            continue
        strings.append(value)
    normalized = " ".join(strings).lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def iter_meaningful_strings(value: Any, path: str = "$") -> list[tuple[str, str]]:
    strings = []
    if isinstance(value, dict):
        for key, child in value.items():
            strings.extend(iter_meaningful_strings(child, f"{path}.{key}"))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            strings.extend(iter_meaningful_strings(child, f"{path}[{index}]"))
    elif isinstance(value, str) and value.strip():
        strings.append((path, value.strip()))
    return strings


def sanitize_json(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized = {}
        for key, child in value.items():
            if any(part in str(key).lower() for part in SECRET_KEY_PARTS):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = sanitize_json(child)
        return sanitized
    if isinstance(value, list):
        return [sanitize_json(item) for item in value]
    return value


def format_matches(matches: list[tuple[str, str]]) -> list[str]:
    lines = []
    for path, value in matches:
        lines.append(f"{path}")
        lines.append(f"    -> {value!r}")
    return lines


def existing_fields_report(event: dict, field_names: list[str]) -> list[str]:
    lines = []
    for field_name in field_names:
        if field_name in event:
            lines.append(f"{field_name}:")
            lines.append(json.dumps(event[field_name], indent=2, sort_keys=True, default=str))
    return lines


def _is_ignored_text_path(path: str) -> bool:
    lowered = path.lower()
    return any(part in lowered for part in IGNORED_TEXT_KEY_PARTS)

