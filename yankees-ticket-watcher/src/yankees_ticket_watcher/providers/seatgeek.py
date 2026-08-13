from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import Game, TicketListing
from yankees_ticket_watcher.providers.base import MissingCredentialsError, ProviderError, RateLimitError, TicketProvider

LOGGER = logging.getLogger(__name__)


class SeatGeekProvider(TicketProvider):
    """SeatGeek event adapter.

    SeatGeek's public Platform API documents events and aggregate ticket stats,
    including stats.lowest_price. It does not expose buyer-facing section-level
    resale inventory in the public docs, so listings returned here are event-level
    lowest-price observations with unknown section and lounge details.
    """

    name = "seatgeek"
    base_url = "https://api.seatgeek.com/2"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=15)
        self._event_payload_by_id: dict[str, dict] = {}
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
            "listing_count.gt": "0",
            "lowest_price.lte": str(self.settings.max_price),
            "sort": "datetime_local.asc",
            "per_page": "50",
        }
        if self.settings.seatgeek_client_secret:
            params["client_secret"] = self.settings.seatgeek_client_secret
        payload = self._get("/events", params=params)
        games: list[Game] = []
        for event in payload.get("events", []):
            try:
                event_id = str(event["id"])
                self._event_payload_by_id[event_id] = event
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
                        game_id=event_id,
                        opponent=opponent,
                        game_datetime=game_dt,
                        event_url=event.get("url"),
                        price_filter_matched=True,
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                LOGGER.warning("Skipping malformed SeatGeek event: %s", exc)
        return games

    def get_listings(self, game: Game) -> list[TicketListing]:
        payload = self._event_payload_by_id.get(game.game_id, {})
        lowest_price, price_field = _lowest_price(payload)
        if lowest_price is None:
            payload = self._fetch_event_detail(game)
            lowest_price, price_field = _lowest_price(payload)

        purchase_url = payload.get("url") or game.event_url or ""
        stats = payload.get("stats") or {}
        listing_count = stats.get("listing_count")
        listing_count_text = f" listing_count={listing_count}." if listing_count is not None else ""
        if lowest_price is None:
            if game.price_filter_matched:
                return [self._filter_matched_listing(game, purchase_url)]
            LOGGER.info(
                "SeatGeek event %s has no usable lowest price. stats keys=%s.%s",
                game.game_id,
                sorted(stats.keys()),
                listing_count_text,
            )
            return []
        observed_at = datetime.now(self.settings.timezone)
        return [
            TicketListing(
                provider=self.name,
                listing_id=f"{game.game_id}-event-lowest-price",
                game_id=game.game_id,
                opponent=game.opponent,
                game_datetime=game.game_datetime,
                section="EVENT",
                row=None,
                quantity=None,
                listed_price=lowest_price,
                all_in_price=None,
                premium_section=False,
                lounge_access_confirmed=False,
                lounge_name=None,
                listing_text=(
                    f"SeatGeek event-level {price_field}. Public API does not provide "
                    "section, row, fees, or lounge access details for this observation."
                ),
                purchase_url=purchase_url,
                observed_at=observed_at,
            )
        ]

    def _filter_matched_listing(self, game: Game, purchase_url: str) -> TicketListing:
        observed_at = datetime.now(self.settings.timezone)
        return TicketListing(
            provider=self.name,
            listing_id=f"{game.game_id}-event-lowest-price-filter-match",
            game_id=game.game_id,
            opponent=game.opponent,
            game_datetime=game.game_datetime,
            section="EVENT",
            row=None,
            quantity=None,
            listed_price=self.settings.max_price,
            all_in_price=None,
            premium_section=False,
            lounge_access_confirmed=False,
            lounge_name=None,
            listing_text=(
                f"SeatGeek server-side lowest_price.lte={self.settings.max_price} filter matched this event, "
                "but the API response did not expose the exact lowest price. Public API does not provide "
                "section, row, fees, or lounge access details for this observation."
            ),
            purchase_url=purchase_url,
            observed_at=observed_at,
        )

    def _fetch_event_detail(self, game: Game) -> dict:
        params = {"client_id": self.settings.seatgeek_client_id}
        if self.settings.seatgeek_client_secret:
            params["client_secret"] = self.settings.seatgeek_client_secret
        return self._get(f"/events/{game.game_id}", params=params)

    def fetch_event_detail_for_debug(self, game: Game) -> dict:
        return self._fetch_event_detail(game)

    def raw_event_payload(self, game_id: str) -> dict:
        return self._event_payload_by_id.get(game_id, {})

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


def _money(value: object) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _lowest_price(event: dict) -> tuple[Decimal | None, str | None]:
    stats = event.get("stats") or {}
    for field_name in (
        "lowest_price",
        "lowest_sg_base_price",
        "lowest_sg_base_price_good_deals",
        "lowest_price_good_deals",
    ):
        value = _money(stats.get(field_name))
        if value is not None:
            return value, f"stats.{field_name}"
    return None, None
