from __future__ import annotations

import argparse
import logging
from datetime import datetime, timedelta
from decimal import Decimal

from yankees_ticket_watcher.config import ConfigError, Settings, load_settings
from yankees_ticket_watcher.database import TicketDatabase
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
    subparsers.add_parser("deals")
    history = subparsers.add_parser("history")
    history.add_argument("--limit", type=int, default=20)
    subparsers.add_parser("test-alert")
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
