from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import tzinfo
from decimal import Decimal, InvalidOperation
from pathlib import Path

from yankees_ticket_watcher.timezone_utils import get_timezone


DEFAULT_TARGET_SECTIONS = {"317", "318", "319", "320", "321"}
DEFAULT_PREMIUM_SECTIONS = {
    "317": "Jim Beam Club area",
    "318": "Jim Beam Club area",
    "319": "Jim Beam Club area",
    "320": "Jim Beam Club area",
    "321": "Jim Beam Club area",
}
DEFAULT_LOUNGE_KEYWORDS = [
    "jim beam",
    "club access",
    "club level",
    "lounge access",
    "premium club",
    "club included",
]


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Settings:
    max_price: Decimal = Decimal("30.00")
    check_interval_minutes: int = 10
    target_sections: set[str] = field(default_factory=lambda: set(DEFAULT_TARGET_SECTIONS))
    premium_sections: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_PREMIUM_SECTIONS))
    lounge_keywords: list[str] = field(default_factory=lambda: list(DEFAULT_LOUNGE_KEYWORDS))
    require_confirmed_lounge: bool = False
    realert_price_drop: Decimal = Decimal("5.00")
    database_path: Path = Path("data/yankees_tickets.db")
    ticket_provider: str = "mock"
    alert_provider: str = "console"
    timezone: tzinfo = field(default_factory=lambda: get_timezone("America/New_York"))
    seatgeek_client_id: str | None = None
    seatgeek_client_secret: str | None = None
    stubhub_client_id: str | None = None
    stubhub_client_secret: str | None = None
    email_enabled: bool = False
    email_to: str | None = None
    email_from: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    whatsapp_enabled: bool = False
    whatsapp_access_token: str | None = None
    whatsapp_phone_number_id: str | None = None
    whatsapp_to: str | None = None
    whatsapp_template_name: str = "yankees_ticket_alert"
    whatsapp_template_language: str = "en_US"
    whatsapp_graph_api_version: str = "v23.0"
    pushover_enabled: bool = False
    pushover_app_token: str | None = None
    pushover_user_key: str | None = None
    pushover_device: str | None = None
    pushover_priority: int = 0


def load_settings(env_file: str | Path | None = ".env") -> Settings:
    values: dict[str, str] = {}
    if env_file is not None:
        values.update(_read_env_file(Path(env_file)))
    values.update(os.environ)

    settings = Settings(
        max_price=_decimal(values, "MAX_PRICE", Decimal("30.00")),
        check_interval_minutes=_int(values, "CHECK_INTERVAL_MINUTES", 10),
        target_sections=_csv_set(values.get("TARGET_SECTIONS"), DEFAULT_TARGET_SECTIONS),
        premium_sections=_section_map(values.get("PREMIUM_SECTIONS"), DEFAULT_PREMIUM_SECTIONS),
        lounge_keywords=_csv_list(values.get("LOUNGE_KEYWORDS"), DEFAULT_LOUNGE_KEYWORDS),
        require_confirmed_lounge=_bool(values, "REQUIRE_CONFIRMED_LOUNGE", False),
        realert_price_drop=_decimal(values, "REALERT_PRICE_DROP", Decimal("5.00")),
        database_path=Path(values.get("DATABASE_PATH", "data/yankees_tickets.db")),
        ticket_provider=values.get("TICKET_PROVIDER", values.get("PROVIDER", "mock")).strip().lower(),
        alert_provider=values.get("ALERT_PROVIDER", "console").strip().lower(),
        seatgeek_client_id=_optional(values.get("SEATGEEK_CLIENT_ID")),
        seatgeek_client_secret=_optional(values.get("SEATGEEK_CLIENT_SECRET")),
        stubhub_client_id=_optional(values.get("STUBHUB_CLIENT_ID")),
        stubhub_client_secret=_optional(values.get("STUBHUB_CLIENT_SECRET")),
        email_enabled=_bool(values, "EMAIL_ENABLED", False),
        email_to=_optional(values.get("EMAIL_TO")),
        email_from=_optional(values.get("EMAIL_FROM")),
        smtp_host=_optional(values.get("SMTP_HOST")),
        smtp_port=_int(values, "SMTP_PORT", 587),
        smtp_username=_optional(values.get("SMTP_USERNAME")),
        smtp_password=_optional(values.get("SMTP_PASSWORD")),
        smtp_use_tls=_bool(values, "SMTP_USE_TLS", True),
        whatsapp_enabled=_bool(values, "WHATSAPP_ENABLED", False),
        whatsapp_access_token=_optional(values.get("WHATSAPP_ACCESS_TOKEN")),
        whatsapp_phone_number_id=_optional(values.get("WHATSAPP_PHONE_NUMBER_ID")),
        whatsapp_to=_optional(values.get("WHATSAPP_TO")),
        whatsapp_template_name=values.get("WHATSAPP_TEMPLATE_NAME", "yankees_ticket_alert").strip(),
        whatsapp_template_language=values.get("WHATSAPP_TEMPLATE_LANGUAGE", "en_US").strip(),
        whatsapp_graph_api_version=values.get("WHATSAPP_GRAPH_API_VERSION", "v23.0").strip(),
        pushover_enabled=_bool(values, "PUSHOVER_ENABLED", False),
        pushover_app_token=_optional(values.get("PUSHOVER_APP_TOKEN")),
        pushover_user_key=_optional(values.get("PUSHOVER_USER_KEY")),
        pushover_device=_optional(values.get("PUSHOVER_DEVICE")),
        pushover_priority=_int(values, "PUSHOVER_PRIORITY", 0),
    )
    _validate(settings)
    return settings


def _read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    loaded: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        loaded[key.strip()] = value.strip().strip('"').strip("'")
    return loaded


def _optional(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _decimal(values: dict[str, str], key: str, default: Decimal) -> Decimal:
    raw = values.get(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        return Decimal(raw).quantize(Decimal("0.01"))
    except InvalidOperation as exc:
        raise ConfigError(f"{key} must be a decimal amount") from exc


def _int(values: dict[str, str], key: str, default: int) -> int:
    raw = values.get(key)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise ConfigError(f"{key} must be an integer") from exc


def _bool(values: dict[str, str], key: str, default: bool) -> bool:
    raw = values.get(key)
    if raw is None or raw.strip() == "":
        return default
    normalized = raw.strip().lower()
    if normalized in {"1", "true", "yes", "y", "on"}:
        return True
    if normalized in {"0", "false", "no", "n", "off"}:
        return False
    raise ConfigError(f"{key} must be true or false")


def _csv_set(raw: str | None, default: set[str]) -> set[str]:
    if raw is None or raw.strip() == "":
        return set(default)
    return {_normalize_section(part) for part in raw.split(",") if part.strip()}


def _csv_list(raw: str | None, default: list[str]) -> list[str]:
    if raw is None or raw.strip() == "":
        return list(default)
    return [part.strip().lower() for part in raw.split(",") if part.strip()]


def _section_map(raw: str | None, default: dict[str, str]) -> dict[str, str]:
    if raw is None or raw.strip() == "":
        return dict(default)
    parsed: dict[str, str] = {}
    for part in raw.split(","):
        item = part.strip()
        if not item:
            continue
        if "=" not in item:
            raise ConfigError("PREMIUM_SECTIONS entries must look like 319=Jim Beam Club area")
        section, lounge_name = item.split("=", 1)
        parsed[_normalize_section(section)] = lounge_name.strip()
    return parsed


def _normalize_section(section: str) -> str:
    return section.strip().upper()


def _validate(settings: Settings) -> None:
    if settings.max_price <= 0:
        raise ConfigError("MAX_PRICE must be greater than zero")
    if settings.check_interval_minutes <= 0:
        raise ConfigError("CHECK_INTERVAL_MINUTES must be greater than zero")
    if settings.realert_price_drop <= 0:
        raise ConfigError("REALERT_PRICE_DROP must be greater than zero")
    if not settings.target_sections:
        raise ConfigError("TARGET_SECTIONS must contain at least one section")
    if settings.email_enabled:
        missing = [
            name
            for name, value in {
                "EMAIL_TO": settings.email_to,
                "EMAIL_FROM": settings.email_from,
                "SMTP_HOST": settings.smtp_host,
            }.items()
            if not value
        ]
        if missing:
            raise ConfigError(f"Email is enabled, but missing: {', '.join(missing)}")
    if settings.whatsapp_enabled or settings.alert_provider in {"whatsapp", "both", "all"}:
        missing = [
            name
            for name, value in {
                "WHATSAPP_ACCESS_TOKEN": settings.whatsapp_access_token,
                "WHATSAPP_PHONE_NUMBER_ID": settings.whatsapp_phone_number_id,
                "WHATSAPP_TO": settings.whatsapp_to,
                "WHATSAPP_TEMPLATE_NAME": settings.whatsapp_template_name,
                "WHATSAPP_TEMPLATE_LANGUAGE": settings.whatsapp_template_language,
                "WHATSAPP_GRAPH_API_VERSION": settings.whatsapp_graph_api_version,
            }.items()
            if not value
        ]
        if missing:
            raise ConfigError(f"WhatsApp is enabled, but missing: {', '.join(missing)}")
    if settings.pushover_enabled or settings.alert_provider in {"pushover", "both", "all"}:
        missing = [
            name
            for name, value in {
                "PUSHOVER_APP_TOKEN": settings.pushover_app_token,
                "PUSHOVER_USER_KEY": settings.pushover_user_key,
            }.items()
            if not value
        ]
        if missing:
            raise ConfigError(f"Pushover is enabled, but missing: {', '.join(missing)}")
        if settings.pushover_priority < -2 or settings.pushover_priority > 2:
            raise ConfigError("PUSHOVER_PRIORITY must be between -2 and 2")
