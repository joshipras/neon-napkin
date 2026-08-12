from __future__ import annotations

from abc import ABC, abstractmethod

from yankees_ticket_watcher.models import Game, TicketListing


class ProviderError(RuntimeError):
    pass


class MissingCredentialsError(ProviderError):
    pass


class RateLimitError(ProviderError):
    pass


class TicketProvider(ABC):
    name: str

    @abstractmethod
    def get_yankees_home_games(self) -> list[Game]:
        raise NotImplementedError

    @abstractmethod
    def get_listings(self, game: Game) -> list[TicketListing]:
        raise NotImplementedError

