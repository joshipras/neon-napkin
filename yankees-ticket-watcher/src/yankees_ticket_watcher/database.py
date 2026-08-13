from __future__ import annotations

import sqlite3
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from yankees_ticket_watcher.arbitrage import OpportunityScore
from yankees_ticket_watcher.models import AlertType, Game, TicketListing


class TicketDatabase:
    def __init__(self, path: Path | str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path)
        self.connection.row_factory = sqlite3.Row

    def close(self) -> None:
        self.connection.close()

    def initialize(self) -> None:
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS games (
                game_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                opponent TEXT NOT NULL,
                game_datetime TEXT NOT NULL,
                event_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (provider, game_id)
            );

            CREATE TABLE IF NOT EXISTS ticket_observations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                listing_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                opponent TEXT NOT NULL,
                game_datetime TEXT NOT NULL,
                section TEXT,
                row TEXT,
                quantity INTEGER,
                listed_price TEXT NOT NULL,
                all_in_price TEXT,
                effective_price TEXT NOT NULL,
                price_source TEXT NOT NULL,
                premium_section INTEGER NOT NULL,
                lounge_access_detected INTEGER NOT NULL DEFAULT 0,
                lounge_access_confirmed INTEGER NOT NULL,
                lounge_name TEXT,
                listing_text TEXT,
                observed_at TEXT NOT NULL,
                minutes_before_first_pitch INTEGER NOT NULL,
                purchase_url TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_observations_listing
                ON ticket_observations(provider, listing_id, observed_at);
            CREATE INDEX IF NOT EXISTS idx_observations_game
                ON ticket_observations(provider, game_id, section, effective_price);
            CREATE INDEX IF NOT EXISTS idx_observations_minutes
                ON ticket_observations(game_id, minutes_before_first_pitch);

            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                listing_id TEXT NOT NULL,
                first_alerted_at TEXT NOT NULL,
                last_alerted_at TEXT NOT NULL,
                price_at_alert TEXT NOT NULL,
                alert_type TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_alerts_listing
                ON alerts(provider, listing_id, last_alerted_at);

            CREATE TABLE IF NOT EXISTS inventory (
                ticket_id TEXT PRIMARY KEY,
                listing_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                section TEXT,
                row TEXT,
                purchase_price TEXT NOT NULL,
                purchase_datetime TEXT NOT NULL,
                purchase_marketplace TEXT NOT NULL,
                status TEXT NOT NULL,
                purchase_url TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_inventory_status
                ON inventory(status, event_id, section);

            CREATE TABLE IF NOT EXISTS opportunity_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                provider TEXT NOT NULL,
                listing_id TEXT NOT NULL,
                game_id TEXT NOT NULL,
                observed_at TEXT NOT NULL,
                score INTEGER NOT NULL,
                confidence TEXT NOT NULL,
                qualifies INTEGER NOT NULL,
                expected_profit TEXT NOT NULL,
                expected_roi TEXT NOT NULL,
                discount_to_median TEXT NOT NULL,
                comparison_pool TEXT NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_opportunity_snapshots_listing
                ON opportunity_snapshots(provider, listing_id, observed_at);
            """
        )
        self._add_column_if_missing("ticket_observations", "lounge_access_detected", "INTEGER NOT NULL DEFAULT 0")
        self.connection.commit()

    def upsert_game(self, game: Game) -> None:
        now = _now_iso()
        self.connection.execute(
            """
            INSERT INTO games (game_id, provider, opponent, game_datetime, event_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(provider, game_id) DO UPDATE SET
                opponent = excluded.opponent,
                game_datetime = excluded.game_datetime,
                event_url = excluded.event_url,
                updated_at = excluded.updated_at
            """,
            (game.game_id, game.provider, game.opponent, _dt(game.game_datetime), game.event_url, now, now),
        )
        self.connection.commit()

    def save_observation(self, listing: TicketListing) -> int:
        now = _now_iso()
        cursor = self.connection.execute(
            """
            INSERT INTO ticket_observations (
                provider, listing_id, game_id, opponent, game_datetime, section, row, quantity,
                listed_price, all_in_price, effective_price, price_source, premium_section,
                lounge_access_detected, lounge_access_confirmed, lounge_name, listing_text, observed_at,
                minutes_before_first_pitch, purchase_url, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                listing.provider,
                listing.listing_id,
                listing.game_id,
                listing.opponent,
                _dt(listing.game_datetime),
                listing.section,
                listing.row,
                listing.quantity,
                _money(listing.listed_price),
                _money_or_none(listing.all_in_price),
                _money(listing.effective_price),
                listing.price_source,
                int(listing.premium_section),
                int(listing.lounge_access_detected),
                int(listing.lounge_access_confirmed),
                listing.lounge_name,
                listing.listing_text,
                _dt(listing.observed_at),
                listing.minutes_before_first_pitch,
                listing.purchase_url,
                now,
            ),
        )
        self.connection.commit()
        return int(cursor.lastrowid)

    def _add_column_if_missing(self, table: str, column: str, definition: str) -> None:
        columns = {
            str(row["name"])
            for row in self.connection.execute(f"PRAGMA table_info({table})").fetchall()
        }
        if column not in columns:
            self.connection.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    def save_opportunity_snapshot(self, opportunity: OpportunityScore) -> int:
        listing = opportunity.listing
        now = _now_iso()
        cursor = self.connection.execute(
            """
            INSERT INTO opportunity_snapshots (
                provider, listing_id, game_id, observed_at, score, confidence, qualifies,
                expected_profit, expected_roi, discount_to_median, comparison_pool, snapshot_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                listing.provider,
                listing.listing_id,
                listing.game_id,
                _dt(listing.observed_at),
                opportunity.score,
                opportunity.confidence,
                int(opportunity.qualifies),
                _money(opportunity.expected_profit),
                str(opportunity.expected_roi),
                str(opportunity.discount_to_median),
                opportunity.comparison_pool,
                opportunity.snapshot_json(),
                now,
            ),
        )
        self.connection.commit()
        return int(cursor.lastrowid)

    def count_open_inventory(self) -> int:
        row = self.connection.execute(
            """
            SELECT COUNT(*) AS count
            FROM inventory
            WHERE status IN ('PURCHASED', 'LISTED', 'WATCHING')
            """
        ).fetchone()
        return int(row["count"]) if row else 0

    def mark_purchased(self, listing_id: str, purchase_price: Decimal, marketplace: str = "SeatGeek") -> str:
        latest = self.connection.execute(
            """
            SELECT * FROM ticket_observations
            WHERE listing_id = ?
            ORDER BY observed_at DESC, id DESC
            LIMIT 1
            """,
            (listing_id,),
        ).fetchone()
        if latest is None:
            raise ValueError(f"No observed listing found for listing_id={listing_id}")
        now = _now_iso()
        ticket_id = f"{latest['provider']}:{listing_id}"
        self.connection.execute(
            """
            INSERT INTO inventory (
                ticket_id, listing_id, event_id, provider, section, row, purchase_price,
                purchase_datetime, purchase_marketplace, status, purchase_url, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ticket_id) DO UPDATE SET
                purchase_price = excluded.purchase_price,
                purchase_datetime = excluded.purchase_datetime,
                purchase_marketplace = excluded.purchase_marketplace,
                status = excluded.status,
                updated_at = excluded.updated_at
            """,
            (
                ticket_id,
                listing_id,
                latest["game_id"],
                latest["provider"],
                latest["section"],
                latest["row"],
                _money(purchase_price),
                now,
                marketplace,
                "PURCHASED",
                latest["purchase_url"],
                now,
                now,
            ),
        )
        self.connection.commit()
        return ticket_id

    def get_inventory_ticket(self, ticket_id: str) -> sqlite3.Row | None:
        return self.connection.execute(
            "SELECT * FROM inventory WHERE ticket_id = ?",
            (ticket_id,),
        ).fetchone()

    def latest_observations_for_game(self, game_id: str) -> list[sqlite3.Row]:
        return list(
            self.connection.execute(
                """
                SELECT t.*
                FROM ticket_observations t
                JOIN (
                    SELECT provider, listing_id, MAX(observed_at) AS observed_at
                    FROM ticket_observations
                    WHERE game_id = ?
                    GROUP BY provider, listing_id
                ) latest
                  ON latest.provider = t.provider
                 AND latest.listing_id = t.listing_id
                 AND latest.observed_at = t.observed_at
                WHERE t.game_id = ?
                """,
                (game_id, game_id),
            ).fetchall()
        )

    def should_alert(self, listing: TicketListing, alert_type: AlertType, realert_price_drop: Decimal) -> bool:
        last = self.get_last_alert(listing.provider, listing.listing_id)
        if last is None:
            return True
        last_price = Decimal(str(last["price_at_alert"]))
        if alert_type == AlertType.CONFIRMED_LOUNGE_DEAL and last["alert_type"] != alert_type.value:
            return True
        return listing.effective_price <= last_price - realert_price_drop

    def record_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        last = self.get_last_alert(listing.provider, listing.listing_id)
        now = _dt(listing.observed_at)
        first_alerted_at = str(last["first_alerted_at"]) if last else now
        self.connection.execute(
            """
            INSERT INTO alerts (
                provider, listing_id, first_alerted_at, last_alerted_at, price_at_alert, alert_type
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                listing.provider,
                listing.listing_id,
                first_alerted_at,
                now,
                _money(listing.effective_price),
                alert_type.value,
            ),
        )
        self.connection.commit()

    def get_last_alert(self, provider: str, listing_id: str) -> sqlite3.Row | None:
        return self.connection.execute(
            """
            SELECT * FROM alerts
            WHERE provider = ? AND listing_id = ?
            ORDER BY last_alerted_at DESC, id DESC
            LIMIT 1
            """,
            (provider, listing_id),
        ).fetchone()

    def list_games(self) -> list[sqlite3.Row]:
        return list(
            self.connection.execute(
                "SELECT * FROM games ORDER BY game_datetime ASC"
            ).fetchall()
        )

    def list_recent_observations(self, limit: int = 20) -> list[sqlite3.Row]:
        return list(
            self.connection.execute(
                """
                SELECT * FROM ticket_observations
                ORDER BY observed_at DESC, id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        )

    def list_current_deals(
        self,
        max_price: Decimal,
        target_sections: set[str] | None = None,
        limit: int = 20,
    ) -> list[sqlite3.Row]:
        section_filter = ""
        params: list[object] = [_money(max_price)]
        if target_sections:
            placeholders = ",".join("?" for _ in target_sections)
            section_filter = f"AND t.section IN ({placeholders})"
            params.extend(sorted(target_sections))
        params.append(limit)
        return list(
            self.connection.execute(
                f"""
                SELECT t.*
                FROM ticket_observations t
                JOIN (
                    SELECT provider, listing_id, MAX(observed_at) AS observed_at
                    FROM ticket_observations
                    GROUP BY provider, listing_id
                ) latest
                  ON latest.provider = t.provider
                 AND latest.listing_id = t.listing_id
                 AND latest.observed_at = t.observed_at
                WHERE CAST(t.effective_price AS NUMERIC) <= CAST(? AS NUMERIC)
                  AND t.premium_section = 1
                  {section_filter}
                ORDER BY CAST(t.effective_price AS NUMERIC) ASC, t.observed_at DESC
                LIMIT ?
                """,
                params,
            ).fetchall()
        )


def _dt(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("datetime values must be timezone-aware")
    return value.isoformat()


def _now_iso() -> str:
    return datetime.now().astimezone().isoformat()


def _money(value: Decimal) -> str:
    return str(value.quantize(Decimal("0.01")))


def _money_or_none(value: Decimal | None) -> str | None:
    return None if value is None else _money(value)


def row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}
