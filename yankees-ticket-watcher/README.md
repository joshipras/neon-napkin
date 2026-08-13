# Yankees Ticket Watcher

Yankees Ticket Watcher is a small Python 3.7+ tool that monitors resale tickets for New York Yankees home games at Yankee Stadium and alerts on cheap event-level prices or listing-level arbitrage opportunities when comparable-seat data is available.

The MVP is fully runnable with mock data. Live marketplace adapters are isolated behind provider interfaces so matching, storage, notifications, and scheduling do not depend on one marketplace.

## What It Watches

Default strict matching requires:

- effective price at or below `$30.00`
- section in `317,318,319,320,321`
- premium section assumption is true

There are two alert categories:

- `Confirmed Lounge Deal`: listing text explicitly mentions configured lounge or club keywords.
- `Premium Section Deal`: listing is in a configured premium section, but lounge access is not explicitly confirmed.

Sections `317-321` are configured as the initial Jim Beam Club area assumption. That is not treated as proof of lounge entitlement. The app only sets `lounge_access_confirmed=True` when listing text or metadata contains phrases such as `jim beam`, `club access`, `club level`, or `lounge access`.

## Architecture

- `config.py`: `.env` parsing, defaults, validation
- `models.py`: typed dataclasses for games, listings, match results, alert types
- `matcher.py`: section, price, premium, and lounge keyword logic
- `database.py`: SQLite persistence for games, observations, alerts, and future analytics
- `providers/`: provider interface plus mock, SeatGeek, and StubHub adapters
- `notifier.py`: console and email notification providers
- `scheduler.py`: one-shot and continuous checking with game-proximity intervals
- `cli.py`: `yankees-watch` commands

## Setup

```bash
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
yankees-watch check --provider mock
```

You should see at least one simulated Section 319 Jim Beam Club alert and one unconfirmed premium-section deal.

## CLI

```bash
yankees-watch check --provider mock
yankees-watch run --provider mock
yankees-watch games --provider mock
yankees-watch deals
yankees-watch history
yankees-watch test-alert
yankees-watch purchased <listing_id> --price 29
yankees-watch resale <ticket_id>
```

`check` runs one pass. `run` monitors continuously. `deals` and `history` read from SQLite.

## Arbitrage Mode

By default the watcher now evaluates listing-level inventory for relative mispricings instead of relying only on an absolute `$30` threshold. Event-level SeatGeek fallback alerts still work separately, but true section/row listings are scored by nearby comparable asking prices.

Core settings:

```env
ARBITRAGE_ENABLED=true
MAX_ROW_DISTANCE=5
MIN_COMPARABLE_LISTINGS=5
MIN_DISCOUNT_TO_MEDIAN=0.30
MIN_EXPECTED_PROFIT=10
MIN_EXPECTED_ROI=0.25
SELLER_FEE_RATE=0.10
ADDITIONAL_COST_BUFFER=2
MAX_PURCHASE_PRICE=75
MAX_OPEN_TICKETS=1
SECTION_NEIGHBORS=317=318;318=317|319;319=318|320;320=319|321;321=320
```

The detector uses current asking prices, not completed sales. Alerts say projected profit is based on asking prices and actual resale is not guaranteed.

Manual purchase workflow:

```bash
yankees-watch purchased <listing_id> --price 29
yankees-watch resale <ticket_id>
```

The app never automates SeatGeek checkout. The purchase provider is manual-only unless a future marketplace offers explicitly authorized transaction APIs.

For SeatGeek payload diagnostics:

```bash
SEATGEEK_CLIENT_ID=... yankees-watch check --provider seatgeek --debug-listings
```

This does not send alerts. It prints a sanitized recursive diagnostic report and writes sanitized raw payloads to `data/debug_seatgeek_listings.json`.

## Configuration

`.env` values:

```env
MAX_PRICE=30
CHECK_INTERVAL_MINUTES=10
TARGET_SECTIONS=317,318,319,320,321
PREMIUM_SECTIONS=317=Jim Beam Club area,318=Jim Beam Club area,319=Jim Beam Club area,320=Jim Beam Club area,321=Jim Beam Club area
LOUNGE_KEYWORDS=jim beam,club access,club level,lounge access,premium club,club included

REQUIRE_CONFIRMED_LOUNGE=false
REALERT_PRICE_DROP=5
DATABASE_PATH=data/yankees_tickets.db
TICKET_PROVIDER=seatgeek
ALERT_PROVIDER=console
```

If `all_in_price` is present, matching uses it. If not, matching uses `listed_price` and alerts clearly say fees are unknown.

## Mock Data

The mock provider includes:

- Section 319, `$27` all-in, confirmed Jim Beam Club
- Section 320, `$34` all-in, confirmed club, over threshold
- Section 318, `$22` listed price, no explicit lounge information
- Section 420B, `$18`, not premium
- Section 121, `$29`, not in configured target sections
- Section 317, `$41`, premium but over threshold

## Marketplace Providers

Use official/public APIs only. Do not scrape, bypass CAPTCHA, ignore rate limits, or work around anti-bot systems.

SeatGeek: the public Platform API documents event search and aggregate ticket stats at `https://seatgeek.github.io/`. It requires a developer `client_id`; the public docs do not expose buyer-facing, section-level resale listing inventory, so this adapter discovers Yankees home games but returns no listings until legitimate listing-level access is available.

StubHub: official docs at `https://developer.stubhub.com/docs/overview/introduction/` describe OAuth2 access through `api.stubhub.net`. This project includes a placeholder adapter that requires credentials and should be completed only with authorized API access and documented event/listing endpoints.

## Email Alerts

```env
EMAIL_ENABLED=true
ALERT_PROVIDER=both
EMAIL_TO=you@example.com
EMAIL_FROM=watcher@example.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=watcher@example.com
SMTP_PASSWORD=...
SMTP_USE_TLS=true
```

Secrets are read from `.env` and are never logged.

## Pushover Alerts

Pushover is the simplest recommended notification path for scheduled checks. It uses an official HTTPS API with an app token and your user key; no OAuth, no approved message templates, and no WhatsApp Business setup.

Create a Pushover application in your Pushover dashboard, then set:

```env
ALERT_PROVIDER=pushover
PUSHOVER_ENABLED=true
PUSHOVER_APP_TOKEN=...
PUSHOVER_USER_KEY=...
PUSHOVER_DEVICE=
PUSHOVER_PRIORITY=0
```

`PUSHOVER_DEVICE` is optional. Leave it blank to send to all active devices on your Pushover account.

Test locally:

```bash
yankees-watch test-alert
```

## WhatsApp Alerts

WhatsApp is still supported, but Pushover is easier for this personal alert workflow. WhatsApp alerts use Meta's official WhatsApp Cloud API. For scheduled alerts that start a conversation, WhatsApp generally requires an approved message template and an opted-in recipient. The app sends a template message rather than trying to automate WhatsApp Web or bypass platform rules.

Example local config:

```env
ALERT_PROVIDER=whatsapp
WHATSAPP_ENABLED=true
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TO=15551234567
WHATSAPP_TEMPLATE_NAME=yankees_ticket_alert
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_GRAPH_API_VERSION=v23.0
```

Create a WhatsApp template named `yankees_ticket_alert` with 8 body variables in this order:

```text
Yankees ticket alert: {{1}}
{{2}}
{{3}}
{{4}}
{{5}}
{{6}}
Marketplace: {{7}}
Buy: {{8}}
```

The app fills those variables as:

- alert category
- matchup
- game time
- section and row
- price and fee status
- lounge/club status
- marketplace
- purchase URL

Test locally:

```bash
yankees-watch test-alert
```

## GitHub Actions

This repo includes a scheduled workflow at `.github/workflows/yankees-ticket-watch.yml`. Because this project lives inside the larger `neon-napkin` repo, the workflow is stored at the repo root and runs commands from `yankees-ticket-watcher/`.

The workflow runs every 5 minutes, which is the shortest supported GitHub Actions schedule interval, and can also be triggered manually with `workflow_dispatch`.

Add these GitHub repository secrets:

```text
PUSHOVER_APP_TOKEN
PUSHOVER_USER_KEY
```

Optional marketplace secrets:

```text
SEATGEEK_CLIENT_ID
SEATGEEK_CLIENT_SECRET
STUBHUB_CLIENT_ID
STUBHUB_CLIENT_SECRET
```

Useful GitHub repository variables:

```text
TICKET_PROVIDER=seatgeek
MAX_PRICE=30
TARGET_SECTIONS=317,318,319,320,321
REQUIRE_CONFIRMED_LOUNGE=false
REALERT_PRICE_DROP=5
PUSHOVER_DEVICE=
PUSHOVER_PRIORITY=0
```

The workflow restores and saves the SQLite `data/` directory with the GitHub Actions cache so duplicate-alert suppression can survive across scheduled runs. GitHub cache persistence is good enough for a personal MVP, but it is not a permanent database.

The workflow defaults to `TICKET_PROVIDER=seatgeek`. SeatGeek's public API can provide event-level price fields such as `stats.lowest_price`, but some events omit exact price stats while still matching SeatGeek's documented server-side `lowest_price.lte` filter. In that case, Pushover alerts say the event matched `<= $30` but the exact price is unknown. These alerts do not confirm section, row, fees, or lounge access.

## Scheduler

The scheduler skips games that have already started and uses timezone-aware datetimes in `America/New_York`.

Per-game check intervals:

- more than 48 hours away: every 30 minutes or your configured interval, whichever is larger
- 6 to 48 hours away: every 10 minutes
- less than 6 hours away: every 5 minutes

## SQLite Data

The database stores games, qualifying observations, and alerts. Observations include `minutes_before_first_pitch`, `effective_price`, and `price_source` so later analytics can answer questions about when premium ticket prices fall under the threshold.

The app avoids duplicate alerts for the same listing at the same price. It alerts again when a listing drops by `REALERT_PRICE_DROP`, default `$5.00`.

## Running Continuously

On a laptop or Raspberry Pi:

```bash
source .venv/bin/activate
yankees-watch run --provider mock
```

For a one-shot cron check every 10 minutes, see `deploy/yankees-watch.cron`.

## Docker

```bash
docker build -t yankees-ticket-watcher .
docker run --env-file .env -v "$PWD/data:/app/data" yankees-ticket-watcher
```

The core app is not tied to Docker and can also run on a cheap VPS, Railway, Render, Fly.io, or a GitHub Actions scheduled job.

## Known Limitations

- The mock provider is the only provider that currently returns section-level listings end to end.
- SeatGeek public docs expose events and aggregate stats, not the section-level resale listing feed this app needs.
- StubHub requires OAuth2 and authorized API access.
- Premium section mapping is a starting assumption, not proof of benefits.
- Always verify listing benefits before purchasing.

## Marketplace/API Restrictions

This project is intentionally conservative. Real providers should use official APIs, respect authentication, rate limits, terms, and robots/anti-bot protections, and gracefully handle downtime, missing data, malformed responses, and changed schemas.
