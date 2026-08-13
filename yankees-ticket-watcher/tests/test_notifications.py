from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta
from decimal import Decimal

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import AlertType, TicketListing
from yankees_ticket_watcher.notifier import build_pushover_payload, build_whatsapp_template_payload, format_alert
from yankees_ticket_watcher.timezone_utils import get_timezone


TZ = get_timezone("America/New_York")


def make_listing(all_in: Decimal | None = Decimal("27.00")) -> TicketListing:
    now = datetime.now(TZ)
    return TicketListing(
        provider="SeatGeek",
        listing_id="abc",
        game_id="game",
        opponent="Red Sox",
        game_datetime=now + timedelta(hours=2),
        section="319",
        row="7",
        quantity=2,
        listed_price=Decimal("24.00"),
        all_in_price=all_in,
        premium_section=True,
        lounge_access_confirmed=True,
        lounge_name="Jim Beam Club area",
        listing_text="Includes Jim Beam Club access",
        purchase_url="https://example.com/ticket",
        observed_at=now,
    )


def test_confirmed_alert_text() -> None:
    text = format_alert(make_listing(), AlertType.CONFIRMED_LOUNGE_DEAL)

    assert "FIRE YANKEES TICKET DEAL" in text
    assert "$27.00 ALL-IN" in text
    assert "CLUB ACCESS CONFIRMED BY LISTING" in text


def test_fees_unknown_is_clear() -> None:
    text = format_alert(make_listing(all_in=None), AlertType.CONFIRMED_LOUNGE_DEAL)

    assert "$24.00 LISTED PRICE - FEES UNKNOWN" in text


def test_unconfirmed_alert_text() -> None:
    listing = replace(make_listing(), lounge_access_confirmed=False, listing_text="Premium seating")

    text = format_alert(listing, AlertType.PREMIUM_SECTION_DEAL)

    assert "YANKEES PREMIUM SEAT DEAL" in text
    assert "CLUB ACCESS NOT CONFIRMED IN SEATGEEK DATA" in text
    assert "Check benefits before buying." in text


def test_whatsapp_template_payload_uses_configured_template() -> None:
    settings = Settings(
        whatsapp_enabled=True,
        whatsapp_access_token="token",
        whatsapp_phone_number_id="12345",
        whatsapp_to="15551234567",
        whatsapp_template_name="yankees_ticket_alert",
        whatsapp_template_language="en_US",
    )

    payload = build_whatsapp_template_payload(make_listing(), AlertType.CONFIRMED_LOUNGE_DEAL, settings)

    assert payload["messaging_product"] == "whatsapp"
    assert payload["to"] == "15551234567"
    assert payload["type"] == "template"
    assert payload["template"]["name"] == "yankees_ticket_alert"
    assert payload["template"]["language"]["code"] == "en_US"
    parameters = payload["template"]["components"][0]["parameters"]
    assert parameters[0] == {"type": "text", "text": "Confirmed Lounge Deal"}
    assert parameters[4]["text"] == "$27.00 all-in"
    assert parameters[7]["text"] == "https://example.com/ticket"


def test_pushover_payload_uses_token_user_and_purchase_url() -> None:
    settings = Settings(
        pushover_enabled=True,
        pushover_app_token="app-token",
        pushover_user_key="user-key",
        pushover_device="iphone",
        pushover_priority=1,
    )

    payload = build_pushover_payload(make_listing(), AlertType.CONFIRMED_LOUNGE_DEAL, settings)

    assert payload["token"] == "app-token"
    assert payload["user"] == "user-key"
    assert payload["device"] == "iphone"
    assert payload["priority"] == "1"
    assert payload["url"] == "https://example.com/ticket"
    assert payload["url_title"] == "Buy tickets"
    assert payload["title"] == "Yankees club deal: $27.00 Sec 319"
    assert "Confirmed Lounge Deal" in payload["message"]
    assert "Yankees vs Red Sox" in payload["message"]
    assert len(payload["message"]) <= 1024
