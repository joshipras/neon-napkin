from __future__ import annotations

from yankees_ticket_watcher.diagnostics import extract_searchable_listing_text, recursive_term_matches


def test_recursive_term_matches_reports_nested_paths() -> None:
    raw = {
        "inventory": [
            {
                "attributes": [
                    {"name": "Jim Beam Club Access"},
                    {"name": "Aisle seat"},
                ],
                "notes": "Includes access to Jim Beam Club",
            }
        ]
    }

    matches = recursive_term_matches(raw, ["jim beam", "club access"])

    assert ("$.inventory[0].attributes[0].name", "Jim Beam Club Access") in matches
    assert ("$.inventory[0].notes", "Includes access to Jim Beam Club") in matches


def test_extract_searchable_listing_text_collects_nested_metadata_but_ignores_urls_and_ids() -> None:
    raw = {
        "id": "abc123",
        "url": "https://example.com/jim-beam-url-noise",
        "attributes": [{"name": "Includes Jim Beam Club access"}],
        "section": "319",
    }

    text = extract_searchable_listing_text(raw)

    assert "includes jim beam club access" in text
    assert "jim beam url noise" not in text
    assert "abc123" not in text
