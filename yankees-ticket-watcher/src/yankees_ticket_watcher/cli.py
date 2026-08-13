from __future__ import annotations

import argparse
import logging
from datetime import datetime, timedelta
from decimal import Decimal

from yankees_ticket_watcher.arbitrage import ArbitrageDetector
from yankees_ticket_watcher.config import ConfigError, Settings, load_settings
from yankees_ticket_watcher.database import TicketDatabase
from yankees_ticket_watcher.diagnostics import run_seatgeek_debug
from yankees_ticket_watcher.matcher import TicketMatcher
from yankees_ticket_watcher.models import AlertType, TicketListing
from yankees_ticket_watcher.notifier import build_notifier
from yankees_ticket_watcher.providers import build_provider
from yankees_ticket_watcher.providers.base import ProviderError
from yankees_ticket_watcher.scheduler import WatchScheduler


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(level=getattr(logging, args.log_level), format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        settings = load_settings(args.env_file)
    except ConfigError as exc:
        parser.error(str(exc))
        return 2

    provider_name = getattr(args, "provider", None) or settings.ticket_provider
    db = TicketDatabase(settings.database_path)
    db.initialize()
    try:
        if args.command == "check":
            if args.debug_listings:
                output_path = settings.database_path.parent / "debug_seatgeek_listings.json"
                print(run_seatgeek_debug(settings, provider_name, output_path))
                return 0
            scheduler = _build_scheduler(settings, provider_name, db)
            alerts = scheduler.run_once()
            print(f"Check complete. New alerts: {alerts}")
            return 0
        if args.command == "run":
            scheduler = _build_scheduler(settings, provider_name, db)
            print(f"Watching Yankees tickets with provider={provider_name}. Press Ctrl+C to stop.")
            scheduler.run_forever()
            return 0
        if args.command == "games":
            provider = build_provider(provider_name, settings)
            games = provider.get_yankees_home_games()
            for game in games:
                db.upsert_game(game)
                print(f"{game.game_datetime:%a %b %-d %-I:%M %p %Z} | Yankees vs {game.opponent} | {game.provider}:{game.game_id}")
            if not games:
                print("No upcoming games found.")
            return 0
        if args.command == "deals":
            _print_rows(db.list_current_deals(settings.max_price, settings.target_sections), mode="deals")
            return 0
        if args.command == "history":
            _print_rows(db.list_recent_observations(args.limit), mode="history")
            return 0
        if args.command == "test-alert":
            notifier = build_notifier(settings)
            listing = _test_listing(settings)
            notifier.send_alert(listing, AlertType.CONFIRMED_LOUNGE_DEAL)
            return 0
        if args.command == "purchased":
            ticket_id = db.mark_purchased(args.listing_id, Decimal(args.price), args.marketplace)
            print(f"Marked purchased: {ticket_id}")
            return 0
        if args.command == "resale":
            _print_resale_recommendation(db, settings, args.ticket_id)
            return 0
    except ProviderError as exc:
        print(f"Provider error: {exc}")
        return 1
    finally:
        db.close()
    parser.error("Unknown command")
    return 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="yankees-watch", description="Watch Yankees premium ticket resale deals.")
    parser.add_argument("--env-file", default=".env", help="Path to .env file.")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ("check", "run", "games"):
        sub = subparsers.add_parser(command)
        sub.add_argument("--provider", choices=["mock", "seatgeek", "stubhub"], help="Ticket provider to use.")
        if command == "check":
            sub.add_argument(
                "--debug-listings",
                action="store_true",
                help="Print and save sanitized raw SeatGeek payload diagnostics without sending alerts.",
            )
    subparsers.add_parser("deals")
    history = subparsers.add_parser("history")
    history.add_argument("--limit", type=int, default=20)
    subparsers.add_parser("test-alert")
    purchased = subparsers.add_parser("purchased")
    purchased.add_argument("listing_id")
    purchased.add_argument("--price", required=True)
    purchased.add_argument("--marketplace", default="SeatGeek")
    resale = subparsers.add_parser("resale")
    resale.add_argument("ticket_id")
    return parser


def _build_scheduler(settings: Settings, provider_name: str, db: TicketDatabase) -> WatchScheduler:
    provider = build_provider(provider_name, settings)
    matcher = TicketMatcher(settings)
    notifier = build_notifier(settings)
    return WatchScheduler(settings, provider, db, matcher, notifier)


def _print_rows(rows: list, mode: str) -> None:
    if not rows:
        print("No rows found.")
        return
    for row in rows:
        fees = "all-in" if row["price_source"] == "all_in" else "listed, fees unknown"
        print(
            f"${row['effective_price']} ({fees}) | Section {row['section']} Row {row['row'] or 'Unknown'} | "
            f"Yankees vs {row['opponent']} | {row['provider']}:{row['listing_id']}"
        )
        if mode == "history":
            print(f"  observed={row['observed_at']} minutes_before_first_pitch={row['minutes_before_first_pitch']}")


def _test_listing(settings: Settings) -> TicketListing:
    now = datetime.now(settings.timezone)
    return TicketListing(
        provider="test",
        listing_id="test-alert",
        game_id="test-game",
        opponent="Red Sox",
        game_datetime=(now + timedelta(hours=3)).replace(minute=5, second=0, microsecond=0),
        section="319",
        row="7",
        quantity=2,
        listed_price=Decimal("24.00"),
        all_in_price=Decimal("27.00"),
        premium_section=True,
        lounge_access_confirmed=True,
        lounge_name="Jim Beam Club area",
        listing_text="Includes Jim Beam Club access",
        purchase_url="https://example.com/test-ticket",
        observed_at=now,
    )


def _print_resale_recommendation(db: TicketDatabase, settings: Settings, ticket_id: str) -> None:
    ticket = db.get_inventory_ticket(ticket_id)
    if ticket is None:
        print(f"No inventory ticket found for {ticket_id}")
        return
    observations = [_row_to_listing(row) for row in db.latest_observations_for_game(ticket["event_id"])]
    target = TicketListing(
        provider=ticket["provider"],
        listing_id=ticket["listing_id"],
        game_id=ticket["event_id"],
        opponent="Purchased ticket",
        game_datetime=datetime.now(settings.timezone) + timedelta(hours=1),
        section=ticket["section"],
        row=ticket["row"],
        quantity=1,
        listed_price=Decimal(str(ticket["purchase_price"])),
        all_in_price=Decimal(str(ticket["purchase_price"])),
        premium_section=bool(ticket["section"] in settings.premium_sections),
        lounge_access_confirmed=False,
        lounge_name=settings.premium_sections.get(ticket["section"]),
        listing_text=None,
        purchase_url=ticket["purchase_url"] or "",
        observed_at=datetime.now(settings.timezone),
    )
    result = ArbitrageDetector(settings).evaluate_listing(target, observations, open_inventory_count=db.count_open_inventory())
    if result is None or result.number_of_comparables == 0:
        print("Not enough comparable observations for a resale recommendation yet.")
        return
    print(f"Ticket: {ticket_id}")
    print(f"Purchase: ${ticket['purchase_price']}")
    print(f"Current comparable median ask: ${result.median_ask_price}")
    print(f"Current comparable p25 ask: ${result.p25_ask_price}")
    print(f"Cheapest comparable ask: ${result.minimum_comparable_ask_price}")
    print(f"Recommended listing ask: ${result.conservative_resale_ask}")
    print(f"Expected payout after seller fee: ${result.expected_payout}")
    print(f"Projected profit based on asking prices: ${result.expected_profit}")
    print("Actual resale is not guaranteed.")


def _row_to_listing(row) -> TicketListing:
    return TicketListing(
        provider=row["provider"],
        listing_id=row["listing_id"],
        game_id=row["game_id"],
        opponent=row["opponent"],
        game_datetime=datetime.fromisoformat(row["game_datetime"]),
        section=row["section"],
        row=row["row"],
        quantity=row["quantity"],
        listed_price=Decimal(str(row["listed_price"])),
        all_in_price=Decimal(str(row["all_in_price"])) if row["all_in_price"] is not None else None,
        premium_section=bool(row["premium_section"]),
        lounge_access_confirmed=bool(row["lounge_access_confirmed"]),
        lounge_name=row["lounge_name"],
        listing_text=row["listing_text"],
        purchase_url=row["purchase_url"],
        observed_at=datetime.fromisoformat(row["observed_at"]),
        lounge_access_detected=bool(row["lounge_access_detected"]),
    )
