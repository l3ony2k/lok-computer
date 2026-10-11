import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { swatchBeats } from '@/lib/internetTime';
import { scrollIntoViewWithin } from '@/lib/utils';
import {
  CLOCK_STATE_KEY,
  MAX_ZONES,
  dayRelation,
  defaultClockState,
  formatDelta,
  formatUtcOffset,
  formatZoneDate,
  formatZoneTime,
  labelForZone,
  localZoneId,
  normalizeClockState,
  supportedZones,
  zoneLabel,
  zoneOffsetMinutes,
  type ClockState,
  type ClockZone,
} from './time';
import './clock.css';

export interface ClockAppProps {
  onPropsChange?: (props: Record<string, unknown>) => void;
}

// Centibeats turn every 864 ms and seconds every 1000 ms; half a second keeps both honest.
const TICK_MS = 500;

const DEFAULT_STATE = defaultClockState();

interface ZoneGroup {
  area: string;
  zones: Array<{ id: string; name: string }>;
}

/** Groups "Area/City" ids by area so a 400-entry select stays scannable. */
const groupZones = (ids: string[]): ZoneGroup[] => {
  const groups = new Map<string, ZoneGroup['zones']>();
  for (const id of ids) {
    const slash = id.indexOf('/');
    const area = slash === -1 ? 'Other' : id.slice(0, slash);
    // "Argentina/San Juan" and "San Juan" both live under America.
    const name = (slash === -1 ? id : id.slice(slash + 1)).replace(/_/g, ' ');
    const list = groups.get(area);
    if (list) list.push({ id, name });
    else groups.set(area, [{ id, name }]);
  }
  return [...groups.entries()].map(([area, zones]) => ({ area, zones }));
};

const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
};

interface ZoneRowProps {
  zone: ClockZone;
  now: Date;
  localZone: string;
  localOffset: number;
  onRemove: (id: string) => void;
}

const ZoneRow: React.FC<ZoneRowProps> = ({ zone, now, localZone, localOffset, onRemove }) => {
  const delta = formatDelta(zoneOffsetMinutes(zone.id, now) - localOffset);
  const day = dayRelation(zone.id, localZone, now);
  return (
    <li className="clock-row" data-zone-id={zone.id}>
      <span className="clock-row-label" title={zone.id}>{zone.label}</span>
      <span className="clock-row-meta text-xs">
        {day !== 'same' && <span className="clock-row-day">{day}</span>}
        <span className="clock-row-delta">{delta}</span>
      </span>
      <time className="clock-row-time" dateTime={now.toISOString()}>{formatZoneTime(zone.id, now)}</time>
      <button
        type="button"
        className="clock-row-remove"
        aria-label={`Remove ${zone.label}`}
        title={`Remove ${zone.label}`}
        onClick={() => onRemove(zone.id)}
      >
        ×
      </button>
    </li>
  );
};

type PendingFocus = { scrollTo: string } | { focus: string | 'select' };

export const ClockApp: React.FC<ClockAppProps> = () => {
  const now = useNow(TICK_MS);
  const localZone = useMemo(localZoneId, []);
  const [state, setState] = usePersistedState<ClockState>({
    key: CLOCK_STATE_KEY,
    defaultValue: DEFAULT_STATE,
    normalize: normalizeClockState,
    debounceMs: 200,
  });
  const [pick, setPick] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const pending = useRef<PendingFocus | null>(null);

  const zoneGroups = useMemo(() => groupZones(supportedZones()), []);
  const zoneIds = useMemo(() => new Set(state.zones.map((zone) => zone.id)), [state.zones]);
  const localOffset = zoneOffsetMinutes(localZone, now);
  const isFull = state.zones.length >= MAX_ZONES;
  const canAdd = pick !== '' && !zoneIds.has(pick) && !isFull;

  const addZone = () => {
    if (!canAdd) return;
    const id = pick;
    pending.current = { scrollTo: id };
    setState((prev) => (
      prev.zones.some((zone) => zone.id === id) || prev.zones.length >= MAX_ZONES
        ? prev
        : { zones: [...prev.zones, { id, label: labelForZone(id) }] }
    ));
    setPick('');
  };

  const removeZone = (id: string) => {
    const index = state.zones.findIndex((zone) => zone.id === id);
    const neighbour = state.zones[index + 1] ?? state.zones[index - 1];
    pending.current = { focus: neighbour?.id ?? 'select' };
    setState((prev) => ({ zones: prev.zones.filter((zone) => zone.id !== id) }));
  };

  const resetZones = () => {
    pending.current = null;
    setState(defaultClockState());
  };

  // A new row scrolls into view inside the list only, and removing a row with
  // the keyboard hands focus to its neighbour instead of dropping it on the body.
  useEffect(() => {
    const action = pending.current;
    if (!action) return;
    pending.current = null;
    const list = listRef.current;
    if ('scrollTo' in action) {
      scrollIntoViewWithin(list?.querySelector<HTMLElement>(`[data-zone-id="${CSS.escape(action.scrollTo)}"]`));
      return;
    }
    if (action.focus === 'select') {
      selectRef.current?.focus({ preventScroll: true });
      return;
    }
    list?.querySelector<HTMLButtonElement>(`[data-zone-id="${CSS.escape(action.focus)}"] .clock-row-remove`)
      ?.focus({ preventScroll: true });
  }, [state.zones]);

  return (
    <WindowLayout
      className="clock-window"
      hasPadding={false}
      footer={
        <div className="app-footer-row clock-footer">
          <div className="clock-add">
            <select
              ref={selectRef}
              className="search-input clock-select"
              aria-label="Time zone to add"
              value={pick}
              disabled={isFull}
              onChange={(event) => setPick(event.target.value)}
            >
              <option value="">{isFull ? `Limit of ${MAX_ZONES} zones` : 'Choose a zone…'}</option>
              {zoneGroups.map((group) => (
                <optgroup key={group.area} label={group.area}>
                  {group.zones.map((zone) => (
                    <option key={zone.id} value={zone.id} disabled={zoneIds.has(zone.id)}>{zone.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <RetroButton size="sm" onClick={addZone} disabled={!canAdd}>Add</RetroButton>
          </div>
          <RetroButton size="sm" onClick={resetZones} title="Restore the default zones">Reset</RetroButton>
        </div>
      }
    >
      <div className="clock-body">
        <section className="clock-internet" aria-label="Internet time">
          <span className="clock-beats text-2xl">@{swatchBeats(now)}</span>
          <span className="clock-caption text-xs">Internet time · BMT</span>
        </section>

        <section className="clock-local" aria-label="Local time">
          <span className="clock-local-label" title={localZone}>{zoneLabel(localZone)}</span>
          <span className="clock-local-offset text-xs">{formatUtcOffset(localOffset)}</span>
          <time className="clock-local-time text-2xl" dateTime={now.toISOString()}>
            {formatZoneTime(localZone, now, true)}
          </time>
          <span className="clock-local-date text-xs">{formatZoneDate(localZone, now)}</span>
        </section>

        {state.zones.length > 0 ? (
          <ul ref={listRef} className="clock-list" aria-label="World clock">
            {state.zones.map((zone) => (
              <ZoneRow
                key={zone.id}
                zone={zone}
                now={now}
                localZone={localZone}
                localOffset={localOffset}
                onRemove={removeZone}
              />
            ))}
          </ul>
        ) : (
          <p className="clock-empty text-xs">No zones. Choose one below, or Reset for the defaults.</p>
        )}
      </div>
    </WindowLayout>
  );
};

export default ClockApp;
