from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class PurchaseResult:
    listing_id: str
    max_all_in_price: Decimal
    purchase_url: str | None
    instructions: str
    purchased: bool = False


class PurchaseProvider(ABC):
    @abstractmethod
    def purchase(self, listing_id: str, max_all_in_price: Decimal) -> PurchaseResult:
        raise NotImplementedError


class ManualPurchaseProvider(PurchaseProvider):
    def __init__(self, purchase_url_by_listing_id: dict[str, str] | None = None) -> None:
        self.purchase_url_by_listing_id = purchase_url_by_listing_id or {}

    def purchase(self, listing_id: str, max_all_in_price: Decimal) -> PurchaseResult:
        purchase_url = self.purchase_url_by_listing_id.get(listing_id)
        return PurchaseResult(
            listing_id=listing_id,
            max_all_in_price=max_all_in_price,
            purchase_url=purchase_url,
            instructions="Manual purchase only. Review SeatGeek listing details and complete checkout yourself.",
            purchased=False,
        )

