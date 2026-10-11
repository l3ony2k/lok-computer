import { describe, expect, test } from 'bun:test';
import {
  DEFAULT_ZONES,
  MAX_ZONES,
  dayRelation,
  formatDelta,
  formatUtcOffset,
  formatZoneDate,
  formatZoneTime,
  isSupportedZone,
  labelForZone,
  normalizeClockState,
  zoneLabel,
  zoneOffsetMinutes,
} from './time';

const SUMMER = new Date('2026-07-01T12:00:00.000Z');
const WINTER = new Date('2026-01-15T12:00:00.000Z');

describe('zoneLabel', () => {
  test('takes the city from the id and restores its spaces', () => {
    expect(zoneLabel('Asia/Hong_Kong')).toBe('Hong Kong');
    expect(zoneLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(zoneLabel('UTC')).toBe('UTC');
  });
});

describe('labelForZone', () => {
  test('prefers the curated default labels', () => {
    expect(labelForZone('Asia/Ho_Chi_Minh')).toBe('Hà Nội');
    expect(labelForZone('Europe/Kiev')).toBe('Kyiv');
    expect(labelForZone('Europe/Kyiv')).toBe('Kyiv');
    expect(labelForZone('Europe/Paris')).toBe('Paris');
  });
});

describe('isSupportedZone', () => {
  test('accepts what Intl can format and nothing else', () => {
    expect(isSupportedZone('Asia/Tokyo')).toBe(true);
    expect(isSupportedZone('UTC')).toBe(true);
    expect(isSupportedZone('Mars/Olympus_Mons')).toBe(false);
    expect(isSupportedZone('not a zone')).toBe(false);
    expect(isSupportedZone('')).toBe(false);
  });
});

describe('DEFAULT_ZONES', () => {
  test('lists the seven cities in order with their labels', () => {
    expect(DEFAULT_ZONES.map((zone) => zone.label)).toEqual([
      'Hong Kong', 'Tokyo', 'Hà Nội', 'Los Angeles', 'New York', 'London', 'Kyiv',
    ]);
    expect(['Europe/Kyiv', 'Europe/Kiev']).toContain(DEFAULT_ZONES[6].id);
    expect(DEFAULT_ZONES.every((zone) => isSupportedZone(zone.id))).toBe(true);
  });
});

describe('zoneOffsetMinutes', () => {
  test('reads fixed offsets, including half and quarter hours', () => {
    expect(zoneOffsetMinutes('Asia/Hong_Kong', SUMMER)).toBe(480);
    expect(zoneOffsetMinutes('Asia/Hong_Kong', WINTER)).toBe(480);
    expect(zoneOffsetMinutes('Asia/Kolkata', SUMMER)).toBe(330);
    expect(zoneOffsetMinutes('Asia/Kathmandu', SUMMER)).toBe(345);
    expect(zoneOffsetMinutes('UTC', SUMMER)).toBe(0);
  });

  test('follows daylight saving', () => {
    expect(zoneOffsetMinutes('Europe/London', SUMMER)).toBe(60);
    expect(zoneOffsetMinutes('Europe/London', WINTER)).toBe(0);
    expect(zoneOffsetMinutes('America/Los_Angeles', SUMMER)).toBe(-420);
    expect(zoneOffsetMinutes('America/Los_Angeles', WINTER)).toBe(-480);
    expect(zoneOffsetMinutes('America/St_Johns', SUMMER)).toBe(-150);
  });

  test('is unaffected by the wall clock crossing midnight or carrying milliseconds', () => {
    expect(zoneOffsetMinutes('Asia/Hong_Kong', new Date('2026-07-01T16:00:00.000Z'))).toBe(480);
    expect(zoneOffsetMinutes('Asia/Hong_Kong', new Date('2026-07-01T15:59:59.999Z'))).toBe(480);
    expect(zoneOffsetMinutes('America/Los_Angeles', new Date('2026-07-01T07:00:00.500Z'))).toBe(-420);
  });
});

describe('formatUtcOffset', () => {
  test('writes whole hours, minutes when needed, and a true minus sign', () => {
    expect(formatUtcOffset(480)).toBe('UTC+8');
    expect(formatUtcOffset(-300)).toBe('UTC−5');
    expect(formatUtcOffset(330)).toBe('UTC+5:30');
    expect(formatUtcOffset(-150)).toBe('UTC−2:30');
    expect(formatUtcOffset(0)).toBe('UTC');
  });
});

describe('formatDelta', () => {
  test('describes the distance from local time', () => {
    expect(formatDelta(420)).toBe('+7h');
    expect(formatDelta(-300)).toBe('−5h');
    expect(formatDelta(330)).toBe('+5h30');
    expect(formatDelta(-570)).toBe('−9h30');
    expect(formatDelta(0)).toBe('same');
  });
});

describe('dayRelation', () => {
  const evening = new Date('2026-07-01T20:00:00.000Z');

  test('spots a zone that has already turned the page', () => {
    expect(dayRelation('Asia/Tokyo', 'Europe/London', evening)).toBe('tomorrow');
    expect(dayRelation('Europe/London', 'Asia/Tokyo', evening)).toBe('yesterday');
  });

  test('treats the same calendar date as same, whatever the offset', () => {
    expect(dayRelation('Europe/Paris', 'Europe/London', evening)).toBe('same');
    expect(dayRelation('America/Los_Angeles', 'Europe/London', evening)).toBe('same');
  });
});

describe('formatZoneTime and formatZoneDate', () => {
  test('use a 24-hour clock with two digits everywhere', () => {
    expect(formatZoneTime('Asia/Hong_Kong', SUMMER)).toBe('20:00');
    expect(formatZoneTime('Asia/Hong_Kong', SUMMER, true)).toBe('20:00:00');
    expect(formatZoneTime('Asia/Hong_Kong', new Date('2026-07-01T16:05:09.000Z'))).toBe('00:05');
    expect(formatZoneTime('America/Los_Angeles', SUMMER, true)).toBe('05:00:00');
  });

  test('write the date as weekday, day, month', () => {
    expect(formatZoneDate('Asia/Hong_Kong', SUMMER)).toBe('Wed 1 Jul');
    expect(formatZoneDate('America/Los_Angeles', new Date('2026-10-11T03:00:00.000Z'))).toBe('Sat 10 Oct');
  });
});

describe('normalizeClockState', () => {
  const defaults = DEFAULT_ZONES.map((zone) => ({ ...zone }));

  test('falls back to the defaults for anything that is not a zone list', () => {
    expect(normalizeClockState(undefined)).toEqual({ zones: defaults });
    expect(normalizeClockState('Asia/Tokyo')).toEqual({ zones: defaults });
    expect(normalizeClockState({})).toEqual({ zones: defaults });
    expect(normalizeClockState({ zones: 'Asia/Tokyo' })).toEqual({ zones: defaults });
  });

  test('keeps supported zones in order and drops junk, duplicates and unknown ids', () => {
    expect(normalizeClockState({
      zones: [
        { id: 'Asia/Tokyo', label: 'Tokyo' },
        { id: 'Asia/Tokyo', label: 'Again' },
        { id: 'asia/tokyo' },
        { id: 'Mars/Base', label: 'Base' },
        'Europe/Paris',
        42,
        null,
        { label: 'No id' },
        { id: 'Asia/Hong_Kong', label: '   ' },
      ],
    })).toEqual({
      zones: [
        { id: 'Asia/Tokyo', label: 'Tokyo' },
        { id: 'Europe/Paris', label: 'Paris' },
        { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
      ],
    });
  });

  test('honours a stored label', () => {
    expect(normalizeClockState({ zones: [{ id: 'Europe/Paris', label: ' Home ' }] }))
      .toEqual({ zones: [{ id: 'Europe/Paris', label: 'Home' }] });
  });

  test('keeps an emptied list empty', () => {
    expect(normalizeClockState({ zones: [] })).toEqual({ zones: [] });
  });

  test('caps the list', () => {
    const many = Intl.supportedValuesOf('timeZone').slice(0, MAX_ZONES + 10);
    expect(normalizeClockState({ zones: many }).zones).toHaveLength(MAX_ZONES);
  });
});
