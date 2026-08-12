from __future__ import annotations

from datetime import datetime, timedelta
from datetime import tzinfo
from decimal import Decimal

from yankees_ticket_watcher.models import Game, TicketListing
from yankees_ticket_watcher.providers.base import TicketProvider
from yankees_ticket_watcher.timezone_utils import get_timezone


class MockProvider(TicketProvider):
    name = "mock"

    def __init__(self, timezone: tzinfo | None = None) -> None:
        if timezone is None:
            timezone = get_timezone("America/New_York")
        self.timezone = timezone

    def get_yankees_home_games(self) -> list[Game]:
        now = datetime.now(self.timezone)
        return [
            Game(
                provider=self.name,
                game_id="mock-red-sox-1",
                opponent="Red Sox",
                game_datetime=(now + timedelta(hours=8)).replace(hour=19, minute=5, second=0, microsecond=0),
                event_url="https://example.com/yankees-red-sox",
            ),
            Game(
                provider=self.name,
                game_id="mock-orioles-1",
                opponent="Orioles",
                game_datetime=(now + timedelta(days=1)).replace(hour=13, minute=5, second=0, microsecond=0),
                event_url="https://example.com/yankees-orioles",
            ),
            Game(
                provider=self.name,
                game_id="mock-rays-1",
                opponent="Rays",
                game_datetime=(now + timedelta(days=7)).replace(hour=19, minute=5, second=0, microsecond=0),
                event_url="https://example.com/yankees-rays",
            ),
        ]

    def get_listings(self, game: Game) -> list[TicketListing]:
        observed_at = datetime.now(self.timezone)
        base = {
            "provider": self.name,
            "game_id": game.game_id,
            "opponent": game.opponent,
            "game_datetime": game.game_datetime,
            "observed_at": observed_at,
        }
        return [
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-319-confirmed",
                section="319",
                row="7",
                quantity=2,
                listed_price=Decimal("24.00"),
                all_in_price=Decimal("27.00"),
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Section 319, Row 7. Includes Jim Beam Club access.",
                purchase_url=f"https://example.com/buy/{game.game_id}/319-confirmed",
            ),
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-320-over",
                section="320",
                row="11",
                quantity=2,
                listed_price=Decimal("31.00"),
                all_in_price=Decimal("34.00"),
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Club level ticket with Jim Beam benefits.",
                purchase_url=f"https://example.com/buy/{game.game_id}/320-over",
            ),
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-318-unconfirmed",
                section="318",
                row="12",
                quantity=1,
                listed_price=Decimal("22.00"),
                all_in_price=None,
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Great view behind home plate. Premium seating.",
                purchase_url=f"https://example.com/buy/{game.game_id}/318-unconfirmed",
            ),
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-420b-cheap",
                section="420B",
                row="3",
                quantity=4,
                listed_price=Decimal("18.00"),
                all_in_price=Decimal("21.00"),
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Upper deck bargain.",
                purchase_url=f"https://example.com/buy/{game.game_id}/420b-cheap",
            ),
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-121-cheap",
                section="121",
                row="9",
                quantity=2,
                listed_price=Decimal("29.00"),
                all_in_price=Decimal("29.00"),
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Field level seat near home plate.",
                purchase_url=f"https://example.com/buy/{game.game_id}/121-cheap",
            ),
            TicketListing(
                **base,
                listing_id=f"{game.game_id}-317-over",
                section="317",
                row="5",
                quantity=2,
                listed_price=Decimal("41.00"),
                all_in_price=None,
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text="Jim Beam Club area listing.",
                purchase_url=f"https://example.com/buy/{game.game_id}/317-over",
            ),
        ]
