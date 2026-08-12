from __future__ import annotations

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.providers.base import TicketProvider


def build_provider(name: str, settings: Settings) -> TicketProvider:
    normalized = name.strip().lower()
    if normalized == "mock":
        from yankees_ticket_watcher.providers.mock import MockProvider

        return MockProvider(settings.timezone)
    if normalized == "seatgeek":
        from yankees_ticket_watcher.providers.seatgeek import SeatGeekProvider

        return SeatGeekProvider(settings)
    if normalized == "stubhub":
        from yankees_ticket_watcher.providers.stubhub import StubHubProvider

        return StubHubProvider(settings)
    raise ValueError(f"Unknown provider: {name}")
