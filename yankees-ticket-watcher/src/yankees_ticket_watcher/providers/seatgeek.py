from __future__ import annotations

import logging
from datetime import datetime, timedelta

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import Game, TicketListing
from yankees_ticket_watcher.providers.base import MissingCredentialsError, ProviderError, RateLimitError, TicketProvider

LOGGER = logging.getLogger(__name__)


class SeatGeekProvider(TicketProvider):
    """SeatGeek event adapter.

    SeatGeek's public Platform API documents events and aggregate ticket stats, but
    not buyer-facing section-level resale inventory. This provider can discover
    Yankees home games and returns no listings until a legitimate listing-level
    API is configured.
    """

    name = "seatgeek"
    base_url = "https://api.seatgeek.com/2"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=15)
        if not settings.seatgeek_client_id:
            raise MissingCredentialsError("SEATGEEK_CLIENT_ID is required for SeatGeek API access")

    def get_yankees_home_games(self) -> list[Game]:
        now = datetime.now(self.settings.timezone)
        until = now + timedelta(days=14)
        params = {
            "client_id": self.settings.seatgeek_client_id,
            "performers[home_team].slug": "new-york-yankees",
            "venue.name": "Yankee Stadium",
            "datetime_local.gte": now.strftime("%Y-%m-%dT%H:%M:%S"),
            "datetime_local.lte": until.strftime("%Y-%m-%dT%H:%M:%S"),
            "sort": "datetime_local.asc",
            "per_page": "50",
        }
        if self.settings.seatgeek_client_secret:
            params["client_secret"] = self.settings.seatgeek_client_secret
        payload = self._get("/events", params=params)
        games: list[Game] = []
        for event in payload.get("events", []):
            try:
                venue = event.get("venue") or {}
                if venue.get("name") != "Yankee Stadium":
                    continue
                game_dt = datetime.fromisoformat(event["datetime_local"]).replace(tzinfo=self.settings.timezone)
                if game_dt <= now:
                    continue
                opponent = _opponent_from_event(event)
                games.append(
                    Game(
                        provider=self.name,
                        game_id=str(event["id"]),
                        opponent=opponent,
                        game_datetime=game_dt,
                        event_url=event.get("url"),
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                LOGGER.warning("Skipping malformed SeatGeek event: %s", exc)
        return games

    def get_listings(self, game: Game) -> list[TicketListing]:
        LOGGER.info(
            "SeatGeek public Platform API does not expose section-level buyer listings for event %s; no listings returned",
            game.game_id,
        )
        return []

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.TransportError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    def _get(self, path: str, params: dict[str, str]) -> dict:
        response = self.client.get(f"{self.base_url}{path}", params=params)
        if response.status_code == 429:
            raise RateLimitError("SeatGeek API rate limit reached")
        if response.status_code >= 400:
            raise ProviderError(f"SeatGeek API error {response.status_code}: {response.text[:200]}")
        return response.json()


def _opponent_from_event(event: dict) -> str:
    for performer in event.get("performers", []):
        if performer.get("home_team"):
            continue
        if performer.get("type") == "mlb":
            return performer.get("short_name") or performer.get("name") or "Opponent TBD"
    title = event.get("short_title") or event.get("title") or "Yankees game"
    return title.replace("New York Yankees", "").replace("Yankees", "").replace(" at ", "").strip(" -") or "Opponent TBD"
