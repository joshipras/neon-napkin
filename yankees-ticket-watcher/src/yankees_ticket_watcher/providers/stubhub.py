from __future__ import annotations

import logging

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import Game, TicketListing
from yankees_ticket_watcher.providers.base import MissingCredentialsError, TicketProvider

LOGGER = logging.getLogger(__name__)


class StubHubProvider(TicketProvider):
    """StubHub adapter placeholder for official OAuth-backed API access."""

    name = "stubhub"

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        if not settings.stubhub_client_id or not settings.stubhub_client_secret:
            raise MissingCredentialsError("STUBHUB_CLIENT_ID and STUBHUB_CLIENT_SECRET are required")

    def get_yankees_home_games(self) -> list[Game]:
        LOGGER.warning(
            "StubHub OAuth credentials are configured, but event/listing retrieval needs app-specific API access mapping"
        )
        return []

    def get_listings(self, game: Game) -> list[TicketListing]:
        LOGGER.warning("StubHub listing retrieval is not enabled for event %s", game.game_id)
        return []

