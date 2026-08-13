from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.matcher import TicketMatcher
from yankees_ticket_watcher.models import AlertType, TicketListing
from yankees_ticket_watcher.timezone_utils import get_timezone


TZ = get_timezone("America/New_York")


def listing(
    *,
    section: str = "319",
    listed_price: str = "29.00",
    all_in_price: str | None = "29.00",
    text: str = "Includes Jim Beam Club access",
) -> TicketListing:
    now = datetime.now(TZ)
    return TicketListing(
        provider="mock",
        listing_id="listing-1",
        game_id="game-1",
        opponent="Red Sox",
        game_datetime=now + timedelta(hours=6),
        section=section,
        row="7",
        quantity=2,
        listed_price=Decimal(listed_price),
        all_in_price=Decimal(all_in_price) if all_in_price is not None else None,
        premium_section=False,
        lounge_access_confirmed=False,
        lounge_name=None,
        listing_text=text,
        purchase_url="https://example.com/ticket",
        observed_at=now,
    )


@pytest.mark.parametrize(
    ("price", "qualifies"),
    [
        ("29.99", True),
        ("30.00", True),
        ("30.01", False),
    ],
)
def test_price_threshold(price: str, qualifies: bool) -> None:
    result = TicketMatcher(Settings()).evaluate(listing(all_in_price=price))

    assert result.qualifies is qualifies


@pytest.mark.parametrize(
    ("section", "qualifies"),
    [
        ("319", True),
        ("320", True),
        ("420B", False),
    ],
)
def test_target_sections(section: str, qualifies: bool) -> None:
    result = TicketMatcher(Settings()).evaluate(listing(section=section))

    assert result.qualifies is qualifies


def test_lounge_keyword_confirms_access() -> None:
    result = TicketMatcher(Settings()).evaluate(listing(text="Includes Jim Beam Club access"))

    assert result.listing.lounge_access_detected is True
    assert result.listing.lounge_access_confirmed is True
    assert result.alert_type == AlertType.CONFIRMED_LOUNGE_DEAL


def test_jim_beam_club_detected_without_confirmation_language() -> None:
    result = TicketMatcher(Settings()).evaluate(listing(text="Jim Beam Club"))

    assert result.qualifies is True
    assert result.listing.lounge_access_detected is True
    assert result.listing.lounge_access_confirmed is False
    assert result.alert_type == AlertType.PREMIUM_SECTION_DEAL


def test_premium_seating_alone_does_not_confirm_lounge() -> None:
    result = TicketMatcher(Settings()).evaluate(listing(text="Premium seating"))

    assert result.qualifies is True
    assert result.listing.premium_section is True
    assert result.listing.lounge_access_detected is False
    assert result.listing.lounge_access_confirmed is False
    assert result.alert_type == AlertType.PREMIUM_SECTION_DEAL


def test_can_require_confirmed_lounge() -> None:
    settings = Settings(require_confirmed_lounge=True)
    result = TicketMatcher(settings).evaluate(listing(text="Premium seating"))

    assert result.qualifies is False
    assert "lounge_not_confirmed" in result.reasons


def test_all_in_price_takes_precedence() -> None:
    result = TicketMatcher(Settings()).evaluate(
        listing(listed_price="20.00", all_in_price="31.00", text="Includes club access")
    )

    assert result.listing.effective_price == Decimal("31.00")
    assert result.listing.price_source == "all_in"
    assert result.qualifies is False


def test_listed_price_used_when_fees_unknown() -> None:
    result = TicketMatcher(Settings()).evaluate(
        listing(listed_price="29.00", all_in_price=None, text="Includes club access")
    )

    assert result.listing.effective_price == Decimal("29.00")
    assert result.listing.price_source == "listed"
    assert result.listing.fees_unknown is True
    assert result.qualifies is True
