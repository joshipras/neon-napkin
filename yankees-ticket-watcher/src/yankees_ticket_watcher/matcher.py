from __future__ import annotations

from dataclasses import replace

from yankees_ticket_watcher.config import Settings
from yankees_ticket_watcher.models import AlertType, MatchResult, TicketListing


class TicketMatcher:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def evaluate(self, listing: TicketListing) -> MatchResult:
        enriched = self.enrich_listing(listing)
        reasons: list[str] = []

        section = normalize_section(enriched.section)
        if enriched.effective_price > self.settings.max_price:
            reasons.append("price_above_threshold")
        if section not in self.settings.target_sections:
            reasons.append("section_not_targeted")
        if not enriched.premium_section:
            reasons.append("not_premium_section")
        if self.settings.require_confirmed_lounge and not enriched.lounge_access_confirmed:
            reasons.append("lounge_not_confirmed")

        qualifies = not reasons
        alert_type: AlertType | None = None
        if qualifies:
            alert_type = (
                AlertType.CONFIRMED_LOUNGE_DEAL
                if enriched.lounge_access_confirmed
                else AlertType.PREMIUM_SECTION_DEAL
            )
        return MatchResult(qualifies=qualifies, alert_type=alert_type, listing=enriched, reasons=tuple(reasons))

    def enrich_listing(self, listing: TicketListing) -> TicketListing:
        section = normalize_section(listing.section)
        lounge_name = listing.lounge_name
        premium_section = listing.premium_section
        if section and section in self.settings.premium_sections:
            premium_section = True
            lounge_name = lounge_name or self.settings.premium_sections[section]

        lounge_access_detected = listing.lounge_access_detected or contains_lounge_keyword(
            listing.listing_text,
            self.settings.lounge_keywords,
        )
        lounge_access_confirmed = listing.lounge_access_confirmed or contains_lounge_keyword(
            listing.listing_text,
            self.settings.confirmed_lounge_keywords,
        )
        if lounge_access_confirmed and not lounge_name:
            lounge_name = _keyword_lounge_name(listing.listing_text) or "Premium lounge or club"

        return replace(
            listing,
            section=section,
            premium_section=premium_section,
            lounge_access_detected=lounge_access_detected,
            lounge_access_confirmed=lounge_access_confirmed,
            lounge_name=lounge_name,
        )


def normalize_section(section: str | None) -> str | None:
    if section is None:
        return None
    return section.strip().upper() or None


def contains_lounge_keyword(text: str | None, keywords: list[str]) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def _keyword_lounge_name(text: str | None) -> str | None:
    if text and "jim beam" in text.lower():
        return "Jim Beam Club area"
    return None
