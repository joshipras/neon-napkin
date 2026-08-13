from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta

from yankees_ticket_watcher.arbitrage import ArbitrageDetector
from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.database import TicketDatabase
from yankees_ticket_watcher.matcher import TicketMatcher
from yankees_ticket_watcher.models import AlertType
from yankees_ticket_watcher.notifier import NotificationManager
from yankees_ticket_watcher.providers.base import ProviderError, TicketProvider

LOGGER = logging.getLogger(__name__)


class WatchScheduler:
    def __init__(
        self,
        settings: Settings,
        provider: TicketProvider,
        database: TicketDatabase,
        matcher: TicketMatcher,
        notifier: NotificationManager,
    ) -> None:
        self.settings = settings
        self.provider = provider
        self.database = database
        self.matcher = matcher
        self.notifier = notifier
        self.last_checked_by_game: dict[str, datetime] = {}
        self.arbitrage = ArbitrageDetector(settings)

    def run_once(self) -> int:
        now = datetime.now(self.settings.timezone)
        horizon = now + timedelta(days=14)
        games = [
            game
            for game in self.provider.get_yankees_home_games()
            if now < game.game_datetime <= horizon
        ]
        games = sorted(games, key=lambda game: game.game_datetime)[:50]
        checked_games = 0
        listings_fetched = 0
        section_matches = 0
        under_threshold = 0
        new_alerts = 0

        for game in games:
            if not self._is_due(game.game_id, game.game_datetime, now):
                continue
            self.database.upsert_game(game)
            checked_games += 1
            self.last_checked_by_game[game.game_id] = now
            try:
                listings = self.provider.get_listings(game)
            except ProviderError:
                LOGGER.exception("Provider error fetching listings for %s", game.game_id)
                continue
            listings_fetched += len(listings)
            enriched_listings = []
            for listing in listings:
                if listing.section == "EVENT":
                    enriched = listing
                    result_qualifies = enriched.effective_price <= self.settings.max_price
                    result_alert_type = AlertType.EVENT_LOW_PRICE if result_qualifies else None
                else:
                    result = self.matcher.evaluate(listing)
                    enriched = result.listing
                    result_qualifies = False if self.settings.arbitrage_enabled else result.qualifies
                    result_alert_type = None if self.settings.arbitrage_enabled else result.alert_type
                if enriched.section in self.settings.target_sections:
                    section_matches += 1
                if enriched.effective_price <= self.settings.max_price:
                    under_threshold += 1
                self.database.save_observation(enriched)
                enriched_listings.append(enriched)
                if result_qualifies:
                    if result_alert_type and self.database.should_alert(
                        enriched,
                        result_alert_type,
                        self.settings.realert_price_drop,
                    ):
                        self.notifier.send_alert(enriched, result_alert_type)
                        self.database.record_alert(enriched, result_alert_type)
                        new_alerts += 1

            if self.settings.arbitrage_enabled and any(listing.section != "EVENT" for listing in enriched_listings):
                open_inventory_count = self.database.count_open_inventory()
                opportunities = self.arbitrage.evaluate_event(
                    enriched_listings,
                    open_inventory_count=open_inventory_count,
                )
                for opportunity in opportunities:
                    self.database.save_opportunity_snapshot(opportunity)
                    should_notify_blocked = (
                        opportunity.purchase_blocked_by_inventory
                        and set(opportunity.rejection_reasons) == {"max_open_tickets_reached"}
                    )
                    if not opportunity.qualifies and not should_notify_blocked:
                        continue
                    if self.database.should_alert(
                        opportunity.listing,
                        AlertType.ARBITRAGE_OPPORTUNITY,
                        self.settings.realert_price_drop,
                    ):
                        self.notifier.send_opportunity(opportunity, self.settings)
                        self.database.record_alert(opportunity.listing, AlertType.ARBITRAGE_OPPORTUNITY)
                        new_alerts += 1

        LOGGER.info(
            "checked_games=%s listings_fetched=%s section_matches=%s under_threshold=%s new_alerts=%s",
            checked_games,
            listings_fetched,
            section_matches,
            under_threshold,
            new_alerts,
        )
        return new_alerts

    def run_forever(self) -> None:
        while True:
            self.run_once()
            time.sleep(self.settings.check_interval_minutes * 60)

    def _is_due(self, game_id: str, game_datetime: datetime, now: datetime) -> bool:
        last_checked = self.last_checked_by_game.get(game_id)
        if last_checked is None:
            return True
        return now - last_checked >= self._interval_for_game(game_datetime, now)

    def _interval_for_game(self, game_datetime: datetime, now: datetime) -> timedelta:
        hours = (game_datetime - now).total_seconds() / 3600
        if hours < 6:
            return timedelta(minutes=5)
        if hours <= 48:
            return timedelta(minutes=10)
        return timedelta(minutes=max(30, self.settings.check_interval_minutes))
