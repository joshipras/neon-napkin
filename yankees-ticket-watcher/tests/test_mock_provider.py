from __future__ import annotations

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.matcher import TicketMatcher
from yankees_ticket_watcher.models import AlertType
from yankees_ticket_watcher.providers.mock import MockProvider


def test_mock_provider_has_games_and_rule_coverage() -> None:
    provider = MockProvider()
    games = provider.get_yankees_home_games()
    listings = provider.get_listings(games[0])

    sections = {listing.section for listing in listings}
    assert {"319", "320", "318", "420B", "121", "317"}.issubset(sections)


def test_mock_provider_produces_confirmed_and_unconfirmed_deals() -> None:
    settings = Settings()
    matcher = TicketMatcher(settings)
    provider = MockProvider(settings.timezone)
    game = provider.get_yankees_home_games()[0]
    results = [matcher.evaluate(listing) for listing in provider.get_listings(game)]
    alert_types = {result.alert_type for result in results if result.qualifies}

    assert AlertType.CONFIRMED_LOUNGE_DEAL in alert_types
    assert AlertType.PREMIUM_SECTION_DEAL in alert_types

