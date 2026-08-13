from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from decimal import Decimal

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.matcher import normalize_section
from yankees_ticket_watcher.models import TicketListing


@dataclass(frozen=True)
class ComparablePool:
    listings: list[TicketListing]
    pool_type: str
    same_section_count: int
    neighbor_section_count: int
    row_proximity_count: int


@dataclass(frozen=True)
class OpportunityScore:
    listing: TicketListing
    qualifies: bool
    score: int
    confidence: str
    rejection_reasons: tuple[str, ...]
    median_ask_price: Decimal
    p25_ask_price: Decimal
    p10_ask_price: Decimal
    minimum_comparable_ask_price: Decimal
    number_of_comparables: int
    comparison_pool: str
    discount_to_median: Decimal
    aggressive_resale_ask: Decimal
    base_resale_ask: Decimal
    conservative_resale_ask: Decimal
    expected_seller_fee: Decimal
    expected_payout: Decimal
    expected_profit: Decimal
    expected_roi: Decimal
    open_inventory_count: int
    purchase_blocked_by_inventory: bool
    comparable_snapshot: tuple[dict, ...]

    def snapshot_json(self) -> str:
        return json.dumps(_decimal_safe(asdict(self)), sort_keys=True)


class ArbitrageDetector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def evaluate_event(
        self,
        listings: list[TicketListing],
        *,
        open_inventory_count: int = 0,
    ) -> list[OpportunityScore]:
        real_listings = [
            listing for listing in listings
            if normalize_section(listing.section) != "EVENT"
        ]
        results: list[OpportunityScore] = []
        for listing in real_listings:
            result = self.evaluate_listing(listing, real_listings, open_inventory_count=open_inventory_count)
            if result is not None:
                results.append(result)
        return results

    def evaluate_listing(
        self,
        listing: TicketListing,
        listings: list[TicketListing],
        *,
        open_inventory_count: int = 0,
    ) -> OpportunityScore | None:
        if normalize_section(listing.section) == "EVENT":
            return None
        pool = build_comparable_pool(listing, listings, self.settings)
        if not pool.listings:
            return _insufficient_result(listing, pool, self.settings, open_inventory_count, ("no_comparables",))

        prices = sorted(comparable.effective_price for comparable in pool.listings)
        median = percentile(prices, Decimal("0.50"))
        p25 = percentile(prices, Decimal("0.25"))
        p10 = percentile(prices, Decimal("0.10"))
        minimum = min(prices)
        discount = Decimal("0") if median <= 0 else (Decimal("1") - (listing.effective_price / median))

        conservative_resale = money(p25 * self.settings.conservative_resale_multiplier)
        base_resale = money(median * self.settings.base_resale_multiplier)
        aggressive_resale = money(median * self.settings.aggressive_resale_multiplier)
        seller_fee = money(conservative_resale * self.settings.seller_fee_rate)
        payout = money(conservative_resale - seller_fee)
        profit = money(payout - listing.effective_price - self.settings.additional_cost_buffer)
        roi = Decimal("0") if listing.effective_price <= 0 else (profit / listing.effective_price)
        purchase_blocked = open_inventory_count >= self.settings.max_open_tickets
        score = compute_score(
            discount=discount,
            profit=profit,
            roi=roi,
            comparable_count=len(pool.listings),
            pool=pool,
            settings=self.settings,
        )
        reasons = rejection_reasons(
            listing=listing,
            pool=pool,
            discount=discount,
            profit=profit,
            roi=roi,
            score=score,
            purchase_blocked=purchase_blocked,
            settings=self.settings,
        )
        return OpportunityScore(
            listing=listing,
            qualifies=not reasons,
            score=score,
            confidence=confidence_for_score(score),
            rejection_reasons=tuple(reasons),
            median_ask_price=money(median),
            p25_ask_price=money(p25),
            p10_ask_price=money(p10),
            minimum_comparable_ask_price=money(minimum),
            number_of_comparables=len(pool.listings),
            comparison_pool=pool.pool_type,
            discount_to_median=decimal4(discount),
            aggressive_resale_ask=aggressive_resale,
            base_resale_ask=base_resale,
            conservative_resale_ask=conservative_resale,
            expected_seller_fee=seller_fee,
            expected_payout=payout,
            expected_profit=profit,
            expected_roi=decimal4(roi),
            open_inventory_count=open_inventory_count,
            purchase_blocked_by_inventory=purchase_blocked,
            comparable_snapshot=tuple(snapshot_listing(comparable) for comparable in pool.listings),
        )


def build_comparable_pool(target: TicketListing, listings: list[TicketListing], settings: Settings) -> ComparablePool:
    target_section = normalize_section(target.section)
    target_row = row_number(target.row)
    candidates = [
        listing for listing in listings
        if listing.listing_id != target.listing_id
        and listing.game_id == target.game_id
        and listing.effective_price > 0
        and quantity_compatible(target.quantity, listing.quantity)
    ]
    same_section = [
        listing for listing in candidates
        if normalize_section(listing.section) == target_section
    ]
    same_section_near_rows = [
        listing for listing in same_section
        if rows_compatible(target_row, row_number(listing.row), settings.max_row_distance)
    ]
    if len(same_section_near_rows) >= settings.min_comparable_listings:
        return ComparablePool(
            same_section_near_rows,
            "same_section_near_rows",
            len(same_section_near_rows),
            0,
            len(same_section_near_rows),
        )
    if len(same_section) >= settings.min_comparable_listings:
        return ComparablePool(same_section, "same_section_all_rows", len(same_section), 0, len(same_section_near_rows))

    neighbor_sections = set(settings.section_neighbors.get(target_section or "", []))
    neighbors = [
        listing for listing in candidates
        if normalize_section(listing.section) in neighbor_sections
    ]
    combined = same_section + neighbors
    return ComparablePool(
        combined,
        "same_and_neighbor_sections",
        len(same_section),
        len(neighbors),
        len(same_section_near_rows),
    )


def rejection_reasons(
    *,
    listing: TicketListing,
    pool: ComparablePool,
    discount: Decimal,
    profit: Decimal,
    roi: Decimal,
    score: int,
    purchase_blocked: bool,
    settings: Settings,
) -> list[str]:
    reasons: list[str] = []
    if len(pool.listings) < settings.min_comparable_listings:
        reasons.append("too_few_comparables")
    if listing.effective_price > settings.max_purchase_price:
        reasons.append("purchase_price_above_limit")
    if discount < settings.min_discount_to_median:
        reasons.append("discount_below_threshold")
    if profit < settings.min_expected_profit:
        reasons.append("profit_below_threshold")
    if roi < settings.min_expected_roi:
        reasons.append("roi_below_threshold")
    if purchase_blocked:
        reasons.append("max_open_tickets_reached")
    if score < settings.min_opportunity_score:
        reasons.append("score_below_threshold")
    return reasons


def compute_score(
    *,
    discount: Decimal,
    profit: Decimal,
    roi: Decimal,
    comparable_count: int,
    pool: ComparablePool,
    settings: Settings,
) -> int:
    discount_score = min(40, int((discount / Decimal("0.50")) * 40)) if discount > 0 else 0
    profit_score = min(25, int((profit / Decimal("30.00")) * 25)) if profit > 0 else 0
    roi_score = min(20, int((roi / Decimal("0.75")) * 20)) if roi > 0 else 0
    sample_score = min(10, int((Decimal(comparable_count) / Decimal(settings.min_comparable_listings * 2)) * 10))
    pool_score = 5 if pool.pool_type.startswith("same_section") else 2
    return max(0, min(100, discount_score + profit_score + roi_score + sample_score + pool_score))


def percentile(values: list[Decimal], q: Decimal) -> Decimal:
    if not values:
        raise ValueError("percentile requires at least one value")
    if len(values) == 1:
        return values[0]
    position = q * Decimal(len(values) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(values) - 1)
    fraction = position - Decimal(lower_index)
    return values[lower_index] + ((values[upper_index] - values[lower_index]) * fraction)


def row_number(row: str | None) -> int | None:
    if row is None:
        return None
    digits = "".join(character for character in row if character.isdigit())
    if not digits:
        return None
    return int(digits)


def rows_compatible(target_row: int | None, comparable_row: int | None, max_distance: int) -> bool:
    if target_row is None or comparable_row is None:
        return True
    return abs(target_row - comparable_row) <= max_distance


def quantity_compatible(target_quantity: int | None, comparable_quantity: int | None) -> bool:
    if target_quantity is None or comparable_quantity is None:
        return True
    return comparable_quantity >= target_quantity


def confidence_for_score(score: int) -> str:
    if score >= 90:
        return "HIGH"
    if score >= 75:
        return "MEDIUM"
    return "LOW"


def snapshot_listing(listing: TicketListing) -> dict:
    return {
        "listing_id": listing.listing_id,
        "section": listing.section,
        "row": listing.row,
        "quantity": listing.quantity,
        "price": str(money(listing.effective_price)),
    }


def money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def decimal4(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"))


def _insufficient_result(
    listing: TicketListing,
    pool: ComparablePool,
    settings: Settings,
    open_inventory_count: int,
    reasons: tuple[str, ...],
) -> OpportunityScore:
    zero = Decimal("0.00")
    return OpportunityScore(
        listing=listing,
        qualifies=False,
        score=0,
        confidence="LOW",
        rejection_reasons=reasons,
        median_ask_price=zero,
        p25_ask_price=zero,
        p10_ask_price=zero,
        minimum_comparable_ask_price=zero,
        number_of_comparables=0,
        comparison_pool=pool.pool_type,
        discount_to_median=Decimal("0.0000"),
        aggressive_resale_ask=zero,
        base_resale_ask=zero,
        conservative_resale_ask=zero,
        expected_seller_fee=zero,
        expected_payout=zero,
        expected_profit=zero,
        expected_roi=Decimal("0.0000"),
        open_inventory_count=open_inventory_count,
        purchase_blocked_by_inventory=open_inventory_count >= settings.max_open_tickets,
        comparable_snapshot=(),
    )


def _decimal_safe(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _decimal_safe(child) for key, child in value.items()}
    if isinstance(value, (list, tuple)):
        return [_decimal_safe(child) for child in value]
    return value
