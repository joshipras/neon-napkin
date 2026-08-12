from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta
from decimal import Decimal

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.database import TicketDatabase
from yankees_ticket_watcher.matcher import TicketMatcher
from yankees_ticket_watcher.models import AlertType, Game, TicketListing
from yankees_ticket_watcher.timezone_utils import get_timezone


TZ = get_timezone("America/New_York")


def make_listing(price: str = "29.00") -> TicketListing:
    now = datetime.now(TZ)
    return TicketListing(
        provider="mock",
        listing_id="same-listing",
        game_id="game-1",
        opponent="Red Sox",
        game_datetime=now + timedelta(hours=4),
        section="319",
        row="7",
        quantity=2,
        listed_price=Decimal(price),
        all_in_price=Decimal(price),
        premium_section=True,
        lounge_access_confirmed=True,
        lounge_name="Jim Beam Club area",
        listing_text="Includes Jim Beam Club access",
        purchase_url="https://example.com/ticket",
        observed_at=now,
    )


def test_observations_store_history_fields(tmp_path) -> None:
    db = TicketDatabase(tmp_path / "tickets.db")
    db.initialize()
    game = Game("mock", "game-1", "Red Sox", datetime.now(TZ) + timedelta(hours=4), "https://example.com")
    listing = make_listing()

    db.upsert_game(game)
    db.save_observation(listing)
    rows = db.list_recent_observations()
    db.close()

    assert rows[0]["provider"] == "mock"
    assert rows[0]["effective_price"] == "29.00"
    assert rows[0]["price_source"] == "all_in"
    assert rows[0]["minutes_before_first_pitch"] > 0


def test_same_listing_same_price_alerts_once(tmp_path) -> None:
    db = TicketDatabase(tmp_path / "tickets.db")
    db.initialize()
    listing = make_listing("29.00")

    assert db.should_alert(listing, AlertType.CONFIRMED_LOUNGE_DEAL, Decimal("5.00")) is True
    db.record_alert(listing, AlertType.CONFIRMED_LOUNGE_DEAL)
    assert db.should_alert(listing, AlertType.CONFIRMED_LOUNGE_DEAL, Decimal("5.00")) is False
    db.close()


def test_same_listing_material_price_drop_alerts_again(tmp_path) -> None:
    db = TicketDatabase(tmp_path / "tickets.db")
    db.initialize()
    first = make_listing("29.00")
    dropped = replace(first, listed_price=Decimal("23.00"), all_in_price=Decimal("23.00"))

    db.record_alert(first, AlertType.CONFIRMED_LOUNGE_DEAL)

    assert db.should_alert(dropped, AlertType.CONFIRMED_LOUNGE_DEAL, Decimal("5.00")) is True
    db.close()


def test_current_deals_uses_latest_observation(tmp_path) -> None:
    settings = Settings(database_path=tmp_path / "tickets.db")
    matcher = TicketMatcher(settings)
    db = TicketDatabase(settings.database_path)
    db.initialize()
    listing = matcher.evaluate(make_listing("29.00")).listing

    db.save_observation(listing)
    rows = db.list_current_deals(Decimal("30.00"), {"317", "318", "319", "320", "321"})
    db.close()

    assert len(rows) == 1
    assert rows[0]["section"] == "319"
