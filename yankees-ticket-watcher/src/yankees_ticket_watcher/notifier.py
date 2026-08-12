from __future__ import annotations

import logging
import smtplib
from abc import ABC, abstractmethod
from email.message import EmailMessage

import httpx

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import AlertType, TicketListing

LOGGER = logging.getLogger(__name__)


class NotificationError(RuntimeError):
    pass


class NotificationProvider(ABC):
    @abstractmethod
    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        raise NotImplementedError


class ConsoleNotificationProvider(NotificationProvider):
    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        print(format_alert(listing, alert_type))


class EmailNotificationProvider(NotificationProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        if not self.settings.email_enabled:
            return
        message = EmailMessage()
        message["To"] = self.settings.email_to or ""
        message["From"] = self.settings.email_from or ""
        message["Subject"] = f"Yankees ticket deal: ${listing.effective_price} Section {listing.section}"
        message.set_content(format_alert(listing, alert_type))

        if not self.settings.smtp_host:
            raise ValueError("SMTP_HOST is required for email alerts")

        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port, timeout=20) as smtp:
            if self.settings.smtp_use_tls:
                smtp.starttls()
            if self.settings.smtp_username and self.settings.smtp_password:
                smtp.login(self.settings.smtp_username, self.settings.smtp_password)
            smtp.send_message(message)


class WhatsAppNotificationProvider(NotificationProvider):
    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=20)

    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        if not self.settings.whatsapp_enabled:
            return
        payload = build_whatsapp_template_payload(listing, alert_type, self.settings)
        response = self.client.post(
            self._messages_url(),
            headers={
                "Authorization": f"Bearer {self.settings.whatsapp_access_token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if response.status_code >= 400:
            raise NotificationError(f"WhatsApp API error {response.status_code}: {response.text[:300]}")

    def _messages_url(self) -> str:
        version = self.settings.whatsapp_graph_api_version.strip().lstrip("/")
        phone_number_id = self.settings.whatsapp_phone_number_id
        return f"https://graph.facebook.com/{version}/{phone_number_id}/messages"


class PushoverNotificationProvider(NotificationProvider):
    messages_url = "https://api.pushover.net/1/messages.json"

    def __init__(self, settings: Settings, client: httpx.Client | None = None) -> None:
        self.settings = settings
        self.client = client or httpx.Client(timeout=20)

    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        if not self.settings.pushover_enabled:
            return
        payload = build_pushover_payload(listing, alert_type, self.settings)
        response = self.client.post(self.messages_url, data=payload)
        if response.status_code >= 400:
            raise NotificationError(f"Pushover API error {response.status_code}: {response.text[:300]}")


class NotificationManager:
    def __init__(self, providers: list[NotificationProvider]) -> None:
        self.providers = providers

    def send_alert(self, listing: TicketListing, alert_type: AlertType) -> None:
        for provider in self.providers:
            try:
                provider.send_alert(listing, alert_type)
            except Exception:
                LOGGER.exception("Notification provider %s failed", provider.__class__.__name__)
                raise


def build_notifier(settings: Settings) -> NotificationManager:
    providers: list[NotificationProvider] = []
    if settings.alert_provider in {"console", "both", "all"}:
        providers.append(ConsoleNotificationProvider())
    if settings.email_enabled or settings.alert_provider in {"email", "both", "all"}:
        providers.append(EmailNotificationProvider(settings))
    if settings.whatsapp_enabled or settings.alert_provider in {"whatsapp", "both", "all"}:
        providers.append(WhatsAppNotificationProvider(settings))
    if settings.pushover_enabled or settings.alert_provider in {"pushover", "both", "all"}:
        providers.append(PushoverNotificationProvider(settings))
    if not providers:
        providers.append(ConsoleNotificationProvider())
    return NotificationManager(providers)


def build_pushover_payload(
    listing: TicketListing,
    alert_type: AlertType,
    settings: Settings,
) -> dict:
    payload = {
        "token": settings.pushover_app_token,
        "user": settings.pushover_user_key,
        "title": _pushover_title(listing, alert_type),
        "message": _pushover_message(listing, alert_type),
        "url": listing.purchase_url,
        "url_title": "Buy tickets",
        "priority": str(settings.pushover_priority),
    }
    if settings.pushover_device:
        payload["device"] = settings.pushover_device
    return payload


def build_whatsapp_template_payload(
    listing: TicketListing,
    alert_type: AlertType,
    settings: Settings,
) -> dict:
    return {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": settings.whatsapp_to,
        "type": "template",
        "template": {
            "name": settings.whatsapp_template_name,
            "language": {"code": settings.whatsapp_template_language},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        _text_param(alert_type.title),
                        _text_param(f"Yankees vs {listing.opponent}"),
                        _text_param(_format_game_time(listing)),
                        _text_param(f"Section {listing.section or 'Unknown'}, Row {listing.row or 'Unknown'}"),
                        _text_param(_format_whatsapp_price(listing)),
                        _text_param(_format_whatsapp_lounge_status(listing, alert_type)),
                        _text_param(listing.provider),
                        _text_param(listing.purchase_url),
                    ],
                }
            ],
        },
    }


def format_alert(listing: TicketListing, alert_type: AlertType) -> str:
    heading = (
        "FIRE YANKEES TICKET DEAL"
        if alert_type == AlertType.CONFIRMED_LOUNGE_DEAL
        else "YANKEES PREMIUM SEAT DEAL"
    )
    price_label = "ALL-IN" if listing.all_in_price is not None else "LISTED PRICE - FEES UNKNOWN"
    lounge_lines = _lounge_lines(listing, alert_type)
    return "\n".join(
        [
            heading,
            alert_type.title,
            "",
            f"Yankees vs {listing.opponent}",
            _format_game_time(listing),
            "",
            f"Section {listing.section or 'Unknown'}",
            f"Row {listing.row or 'Unknown'}",
            "",
            f"${listing.effective_price} {price_label}",
            "",
            "Behind home plate target section",
            *lounge_lines,
            "",
            f"Marketplace: {listing.provider}",
            "",
            "BUY:",
            listing.purchase_url,
            "",
            f"Observed: {listing.observed_at.astimezone().strftime('%-I:%M %p %Z')}",
        ]
    )


def _lounge_lines(listing: TicketListing, alert_type: AlertType) -> list[str]:
    if alert_type == AlertType.CONFIRMED_LOUNGE_DEAL:
        return [
            listing.lounge_name or "Premium lounge or club",
            "Lounge access explicitly mentioned",
        ]
    return [
        listing.lounge_name or "Premium section",
        "Lounge access NOT explicitly confirmed",
        "Verify the ticket benefits before purchasing.",
    ]


def _format_game_time(listing: TicketListing) -> str:
    return listing.game_datetime.strftime("%a, %b %-d at %-I:%M %p %Z")


def _format_whatsapp_price(listing: TicketListing) -> str:
    label = "all-in" if listing.all_in_price is not None else "listed, fees unknown"
    return f"${listing.effective_price} {label}"


def _format_whatsapp_lounge_status(listing: TicketListing, alert_type: AlertType) -> str:
    if alert_type == AlertType.CONFIRMED_LOUNGE_DEAL:
        return f"{listing.lounge_name or 'Premium lounge or club'} explicitly mentioned"
    return "Premium section; lounge access not explicitly confirmed"


def _text_param(value: str) -> dict:
    return {"type": "text", "text": value}


def _pushover_title(listing: TicketListing, alert_type: AlertType) -> str:
    prefix = "Yankees lounge deal" if alert_type == AlertType.CONFIRMED_LOUNGE_DEAL else "Yankees premium deal"
    return f"{prefix}: ${listing.effective_price} Sec {listing.section or 'Unknown'}"


def _pushover_message(listing: TicketListing, alert_type: AlertType) -> str:
    price = _format_whatsapp_price(listing)
    lounge = _format_whatsapp_lounge_status(listing, alert_type)
    return "\n".join(
        [
            alert_type.title,
            f"Yankees vs {listing.opponent}",
            _format_game_time(listing),
            f"Section {listing.section or 'Unknown'}, Row {listing.row or 'Unknown'}",
            price,
            lounge,
            f"Marketplace: {listing.provider}",
            "Verify ticket benefits before purchasing.",
        ]
    )[:1024]
