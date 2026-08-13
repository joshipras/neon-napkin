from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from enum import Enum


class AlertType(str, Enum):
    CONFIRMED_LOUNGE_DEAL = "confirmed_lounge_deal"
    PREMIUM_SECTION_DEAL = "premium_section_deal"
    EVENT_LOW_PRICE = "event_low_price"
    ARBITRAGE_OPPORTUNITY = "arbitrage_opportunity"

    @property
    def title(self) -> str:
        if self is AlertType.CONFIRMED_LOUNGE_DEAL:
            return "Confirmed Lounge Deal"
        if self is AlertType.EVENT_LOW_PRICE:
            return "Event Low Price"
        if self is AlertType.ARBITRAGE_OPPORTUNITY:
            return "Arbitrage Opportunity"
        return "Premium Section Deal"


@dataclass(frozen=True)
class Game:
    provider: str
    game_id: str
    opponent: str
    game_datetime: datetime
    event_url: str | None = None
    price_filter_matched: bool = False


@dataclass(frozen=True)
class TicketListing:
    provider: str
    listing_id: str
    game_id: str
    opponent: str
    game_datetime: datetime
    section: str | None
    row: str | None
    quantity: int | None
    listed_price: Decimal
    all_in_price: Decimal | None
    premium_section: bool
    lounge_access_confirmed: bool
    lounge_name: str | None
    listing_text: str | None
    purchase_url: str
    observed_at: datetime
    lounge_access_detected: bool = False

    @property
    def effective_price(self) -> Decimal:
        return self.all_in_price if self.all_in_price is not None else self.listed_price

    @property
    def price_source(self) -> str:
        return "all_in" if self.all_in_price is not None else "listed"

    @property
    def fees_unknown(self) -> bool:
        return self.all_in_price is None

    @property
    def minutes_before_first_pitch(self) -> int:
        delta = self.game_datetime - self.observed_at
        return int(delta.total_seconds() // 60)


@dataclass(frozen=True)
class MatchResult:
    qualifies: bool
    alert_type: AlertType | None
    listing: TicketListing
    reasons: tuple[str, ...]
