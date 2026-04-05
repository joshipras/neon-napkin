import snapshot from '../data/comediq_open_mics_snapshot.json';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const parseTimeLabel = (timeText) => {
  if (!timeText) {
    return null;
  }

  const trimmed = String(timeText).trim().toUpperCase();
  const match = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const suffix = match[3];

  if (suffix === 'PM' && hours !== 12) {
    hours += 12;
  }

  if (suffix === 'AM' && hours === 12) {
    hours = 0;
  }

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
};

const weekdayIndex = (dayLabel) =>
  DAY_LABELS.findIndex(
    (label) => label.toLowerCase() === String(dayLabel || '').trim().toLowerCase()
  );

const normalizedSnapshot = (snapshot?.mics || []).map((row) => {
  const startTimeParts = parseTimeLabel(row.start_time);
  const endTimeParts = parseTimeLabel(row.latest_end_time);

  return {
    id: row.unique_identifier,
    openMic: row.open_mic || 'Open Mic',
    day: row.day || 'TBD',
    dayIndex: weekdayIndex(row.day),
    startTime: row.start_time || 'TBD',
    latestEndTime: row.latest_end_time || '',
    startMinutes: startTimeParts?.totalMinutes ?? null,
    endMinutes: endTimeParts?.totalMinutes ?? null,
    venueName: row.venue_name || 'Unknown Club',
    borough: row.borough || '',
    neighborhood: row.neighborhood || '',
    location: row.location || '',
    venueType: row.venue_type || '',
    cost: row.cost || 'Free',
    stageTime: row.stage_time || '',
    signUpInstructions: row.sign_up_instructions || '',
    hosts: row.hosts_organizers || '',
    updates: row.changes_updates || '',
    otherRules: row.other_rules || '',
    signupEnabled: Boolean(row.signup_enabled),
    signupMethod: row.signup_method || '',
    signupUrl: row.signup_url || '',
    slotsEnabled: Boolean(row.slots_enabled),
    slotDurationMinutes: row.slot_duration_minutes || 0,
    pricePerSlot: row.price_per_slot || '',
    status: row.status || '',
    frequency: row.frequency_custom_text || row.frequency || '',
    lat: row.coordinates?.lat ?? null,
    lng: row.coordinates?.lng ?? null,
    snapshotDate: snapshot?.snapshotDate || '',
  };
});

export const OPEN_MIC_SNAPSHOT_DATE = snapshot?.snapshotDate || '';
export const OPEN_MIC_DAY_LABELS = DAY_LABELS;

export function getOpenMicSnapshot() {
  return normalizedSnapshot;
}

export async function fetchComediqOpenMics() {
  return normalizedSnapshot;
}

export const buildCalendarEvent = (mic) => {
  const now = new Date();
  const nextDate = new Date(now);
  const eventDayIndex = weekdayIndex(mic.day);
  let delta = 1;

  if (eventDayIndex >= 0) {
    delta = (eventDayIndex - now.getDay() + 7) % 7;
    if (
      delta === 0 &&
      typeof mic.startMinutes === 'number' &&
      mic.startMinutes <= now.getHours() * 60 + now.getMinutes()
    ) {
      delta = 7;
    }
  }

  nextDate.setDate(now.getDate() + delta);

  const startTime = parseTimeLabel(mic.startTime) || { hours: 19, minutes: 0 };
  const endTime =
    parseTimeLabel(mic.latestEndTime) || {
      hours: Math.min(startTime.hours + 1, 23),
      minutes: startTime.minutes,
    };

  const start = new Date(nextDate);
  start.setHours(startTime.hours, startTime.minutes, 0, 0);

  const end = new Date(nextDate);
  end.setHours(endTime.hours, endTime.minutes, 0, 0);

  return {
    title: `${mic.openMic || mic.venueName} at ${mic.venueName}`,
    start,
    end,
    description: [
      `Club: ${mic.venueName}`,
      `Mic: ${mic.openMic || 'Open Mic'}`,
      `Day: ${mic.day || 'TBD'}`,
      `Time: ${mic.startTime || 'TBD'}${mic.latestEndTime ? ` - ${mic.latestEndTime}` : ''}`,
      `Cost: ${mic.cost || 'TBD'}`,
      mic.stageTime ? `Stage time: ${mic.stageTime}` : '',
      mic.signUpInstructions ? `Signup: ${mic.signUpInstructions}` : '',
      mic.signupUrl ? `Signup URL: ${mic.signupUrl}` : '',
      mic.hosts ? `Hosts: ${mic.hosts}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    location: mic.location || mic.venueName,
  };
};

export const createCalendarDownloadUrl = (event) => {
  const formatIcsDate = (date) =>
    date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z$/, 'Z');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Comedy Writing//Open Mics//EN',
    'BEGIN:VEVENT',
    `UID:${event.title.replace(/\s+/g, '-')}-${event.start.getTime()}@comedywriting.app`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) {
    return '';
  }

  return URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
};
