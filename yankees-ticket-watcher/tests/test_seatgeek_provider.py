from __future__ import annotations

from decimal import Decimal

import httpx

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import AlertType
from yankees_ticket_watcher.notifier import format_alert
from yankees_ticket_watcher.providers.seatgeek import SeatGeekProvider


class FakeSeatGeekClient:
    def get(self, url, params):
        if url.endswith("/events"):
            return httpx.Response(
                200,
                json={
                    "events": [
                        {
                            "id": 123,
                            "title": "Boston Red Sox at New York Yankees",
                            "datetime_local": "2026-09-01T19:05:00",
                            "url": "https://seatgeek.example/events/123",
                            "venue": {"name": "Yankee Stadium"},
                            "performers": [
                                {"slug": "boston-red-sox", "short_name": "Red Sox"},
                                {"slug": "new-york-yankees", "short_name": "Yankees", "home_team": True},
                            ],
                        }
                    ],
                    "meta": {"total": 1},
                },
            )
        if url.endswith("/events/123"):
            return httpx.Response(
                200,
                json={
                    "id": 123,
                    "url": "https://seatgeek.example/events/123",
                    "stats": {"lowest_price": 28},
                },
            )
        raise AssertionError("Unexpected URL: {0}".format(url))


class SearchStatsOnlyClient:
    def get(self, url, params):
        if url.endswith("/events"):
            return httpx.Response(
                200,
                json={
                    "events": [
                        {
                            "id": 456,
                            "title": "Toronto Blue Jays at New York Yankees",
                            "datetime_local": "2026-09-02T19:05:00",
                            "url": "https://seatgeek.example/events/456",
                            "venue": {"name": "Yankee Stadium"},
                            "stats": {"lowest_sg_base_price": 26, "listing_count": 42},
                            "performers": [
                                {"slug": "toronto-blue-jays", "short_name": "Blue Jays"},
                                {"slug": "new-york-yankees", "short_name": "Yankees", "home_team": True},
                            ],
                        }
                    ],
                    "meta": {"total": 1},
                },
            )
        raise AssertionError("Detail endpoint should not be called when search stats include a price")


def test_seatgeek_provider_maps_event_lowest_price_to_event_listing() -> None:
    settings = Settings(seatgeek_client_id="client-id")
    provider = SeatGeekProvider(settings, client=FakeSeatGeekClient())

    game = provider.get_yankees_home_games()[0]
    listing = provider.get_listings(game)[0]

    assert game.opponent == "Boston Red Sox"
    assert listing.listing_id == "123-event-lowest-price"
    assert listing.section == "EVENT"
    assert listing.listed_price == Decimal("28.00")
    assert listing.all_in_price is None
    assert listing.premium_section is False
    assert listing.lounge_access_confirmed is False


def test_event_low_price_alert_copy_is_clear() -> None:
    settings = Settings(seatgeek_client_id="client-id")
    provider = SeatGeekProvider(settings, client=FakeSeatGeekClient())
    game = provider.get_yankees_home_games()[0]
    listing = provider.get_listings(game)[0]

    text = format_alert(listing, AlertType.EVENT_LOW_PRICE)

    assert "YANKEES EVENT LOW PRICE" in text
    assert "SeatGeek event-level lowest price" in text
    assert "Section, row, fees, and lounge access are unknown." in text


def test_seatgeek_provider_uses_search_response_price_stats_first() -> None:
    settings = Settings(seatgeek_client_id="client-id")
    provider = SeatGeekProvider(settings, client=SearchStatsOnlyClient())

    game = provider.get_yankees_home_games()[0]
    listing = provider.get_listings(game)[0]

    assert game.opponent == "Toronto Blue Jays"
    assert listing.listed_price == Decimal("26.00")
    assert "stats.lowest_sg_base_price" in (listing.listing_text or "")
