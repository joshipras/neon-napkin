from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from yankees_ticket_watcher.arbitrage import ArbitrageDetector, build_comparable_pool, percentile
from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import TicketListing
from yankees_ticket_watcher.timezone_utils import get_timezone


TZ = get_timezone("America/New_York")


def make_listing(
    listing_id: str,
    price: str,
    *,
    section: str = "319",
    row: str = "7",
    game_id: str = "game-1",
    quantity: int = 1,
) -> TicketListing:
    now = datetime.now(TZ)
    return TicketListing(
        provider="test",
        listing_id=listing_id,
        game_id=game_id,
        opponent="Red Sox",
        game_datetime=now + timedelta(hours=8),
        section=section,
        row=row,
        quantity=quantity,
        listed_price=Decimal(price),
        all_in_price=Decimal(price),
        premium_section=True,
        lounge_access_confirmed=False,
        lounge_name="Jim Beam Club area",
        listing_text=None,
        purchase_url=f"https://example.com/{listing_id}",
        observed_at=now,
    )


def inventory(target_price: str, comparable_prices: list[str]) -> tuple[TicketListing, list[TicketListing]]:
    target = make_listing("target", target_price)
    comparables = [
        make_listing(f"comp-{index}", price, row=str(4 + index))
        for index, price in enumerate(comparable_prices)
    ]
    return target, [target] + comparables


def test_obvious_anomaly_alerts() -> None:
    target, listings = inventory("29", ["65", "68", "70", "72", "75", "77"])

    result = ArbitrageDetector(Settings()).evaluate_listing(target, listings)

    assert result is not None
    assert result.qualifies is True
    assert result.score >= 90
    assert result.expected_profit >= Decimal("10")


def test_below_30_not_really_anomalous_does_not_alert() -> None:
    target, listings = inventory("29", ["31", "33", "34", "36", "38"])

    result = ArbitrageDetector(Settings()).evaluate_listing(target, listings)

    assert result is not None
    assert result.qualifies is False
    assert "discount_below_threshold" in result.rejection_reasons


def test_expensive_but_excellent_value_can_qualify() -> None:
    target, listings = inventory("75", ["125", "130", "135", "140", "145"])

    result = ArbitrageDetector(Settings()).evaluate_listing(target, listings)

    assert result is not None
    assert result.qualifies is True
    assert result.expected_profit > Decimal("10")
    assert result.expected_roi > Decimal("0.25")


def test_absurdly_expensive_neighbor_does_not_distort_median() -> None:
    values = [Decimal("55"), Decimal("58"), Decimal("61"), Decimal("63"), Decimal("500")]

    assert percentile(values, Decimal("0.50")) == Decimal("61")


def test_too_few_comparables_does_not_alert() -> None:
    target, listings = inventory("25", ["70", "75"])

    result = ArbitrageDetector(Settings()).evaluate_listing(target, listings)

    assert result is not None
    assert result.qualifies is False
    assert "too_few_comparables" in result.rejection_reasons


def test_profit_disappears_after_fees_does_not_alert() -> None:
    target, listings = inventory("50", ["58", "58", "58", "58", "58"])

    result = ArbitrageDetector(Settings(min_discount_to_median=Decimal("0.01"))).evaluate_listing(target, listings)

    assert result is not None
    assert result.qualifies is False
    assert "profit_below_threshold" in result.rejection_reasons


def test_expands_to_neighbor_sections_when_same_section_sample_is_small() -> None:
    target = make_listing("target", "29", section="319", row="7")
    same = [make_listing("same-1", "72", section="319", row="8")]
    neighbors = [
        make_listing("neighbor-1", "70", section="318", row="7"),
        make_listing("neighbor-2", "73", section="318", row="8"),
        make_listing("neighbor-3", "74", section="320", row="7"),
        make_listing("neighbor-4", "75", section="320", row="8"),
    ]

    pool = build_comparable_pool(target, [target] + same + neighbors, Settings())

    assert pool.pool_type == "same_and_neighbor_sections"
    assert len(pool.listings) == 5

