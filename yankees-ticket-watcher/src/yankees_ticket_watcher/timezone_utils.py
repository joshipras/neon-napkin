from __future__ import annotations

from datetime import datetime, timedelta, tzinfo

ZERO = timedelta(0)
HOUR = timedelta(hours=1)


class EasternTimeZone(tzinfo):
    """America/New_York fallback for Python versions without zoneinfo.

    This follows current US daylight saving rules, which have applied since
    2007: DST starts on the second Sunday in March and ends on the first Sunday
    in November.
    """

    standard_offset = timedelta(hours=-5)

    def utcoffset(self, dt: datetime | None) -> timedelta:
        return self.standard_offset + self.dst(dt)

    def dst(self, dt: datetime | None) -> timedelta:
        if dt is None:
            return ZERO
        naive = dt.replace(tzinfo=None)
        start, end = _dst_bounds(naive.year)
        if start <= naive < end:
            return HOUR
        return ZERO

    def tzname(self, dt: datetime | None) -> str:
        return "EDT" if self.dst(dt) else "EST"


def get_timezone(name: str = "America/New_York") -> tzinfo:
    try:
        from zoneinfo import ZoneInfo

        return ZoneInfo(name)
    except ImportError:
        pass

    try:
        from backports.zoneinfo import ZoneInfo

        return ZoneInfo(name)
    except ImportError:
        pass

    if name == "America/New_York":
        return EasternTimeZone()
    raise ValueError(f"Timezone {name!r} requires Python 3.9+ zoneinfo or backports.zoneinfo")


def _dst_bounds(year: int) -> tuple[datetime, datetime]:
    start = _first_sunday_on_or_after(datetime(year, 3, 8, 2))
    end = _first_sunday_on_or_after(datetime(year, 11, 1, 2))
    return start, end


def _first_sunday_on_or_after(value: datetime) -> datetime:
    days_to_go = 6 - value.weekday()
    if days_to_go:
        value += timedelta(days=days_to_go)
    return value

