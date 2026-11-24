import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { LoadFailure } from '@/components/ui/LoadFailure';
import { RetroButton } from '@/components/ui/RetroButton';
import { APP_CONFIG } from '@/config/constants';
import { CACHE_TTL } from '@/lib/storage';
import { cachedRequest } from '@/lib/cachedRequest';
import { usePersistedState } from '@/hooks/useStorage';
import { useTheme } from '@/hooks/useTheme';

const APP_STATE_KEY = 'app:weather';
interface WeatherAppState {
  lastQuery: string;
}

interface WeatherTextStyle {
  color?: string;
  bold?: boolean;
}

interface WeatherTextSegment extends WeatherTextStyle {
  text: string;
}

const ANSI_BASE_COLORS = [
  '#000000', '#cd3131', '#0dbc79', '#e5e510', '#2472c8', '#bc3fbc', '#11a8cd', '#e5e5e5',
  '#666666', '#f14c4c', '#23d18b', '#f5f543', '#3b8eea', '#d670d6', '#29b8db', '#ffffff',
];

const getAnsi256Color = (index: number) => {
  if (index < 16) return ANSI_BASE_COLORS[index];
  if (index >= 232) {
    const level = 8 + ((index - 232) * 10);
    return `rgb(${level}, ${level}, ${level})`;
  }
  const colorIndex = index - 16;
  const levels = [0, 95, 135, 175, 215, 255];
  const red = levels[Math.floor(colorIndex / 36)];
  const green = levels[Math.floor((colorIndex % 36) / 6)];
  const blue = levels[colorIndex % 6];
  return `rgb(${red}, ${green}, ${blue})`;
};

const parseWeatherAnsi = (text: string): WeatherTextSegment[] => {
  const pattern = new RegExp(`${String.fromCharCode(27)}\\[([0-9;]*)m`, 'g');
  const segments: WeatherTextSegment[] = [];
  let style: WeatherTextStyle = {};
  let textIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (value: string) => {
    if (value) segments.push({ text: value, ...style });
  };

  while ((match = pattern.exec(text)) !== null) {
    pushText(text.slice(textIndex, match.index));
    const codes = (match[1] || '0').split(';').map(Number);

    for (let index = 0; index < codes.length; index += 1) {
      const code = codes[index];
      if (code === 0) style = {};
      else if (code === 1) style = { ...style, bold: true };
      else if (code === 22) style = { ...style, bold: false };
      else if (code === 39) style = { ...style, color: undefined };
      else if (code >= 30 && code <= 37) style = { ...style, color: ANSI_BASE_COLORS[code - 30] };
      else if (code >= 90 && code <= 97) style = { ...style, color: ANSI_BASE_COLORS[code - 82] };
      else if (code === 38 && codes[index + 1] === 5 && Number.isFinite(codes[index + 2])) {
        style = { ...style, color: getAnsi256Color(codes[index + 2]) };
        index += 2;
      } else if (code === 38 && codes[index + 1] === 2 && codes.slice(index + 2, index + 5).every(Number.isFinite)) {
        style = { ...style, color: `rgb(${codes[index + 2]}, ${codes[index + 3]}, ${codes[index + 4]})` };
        index += 4;
      }
    }
    textIndex = pattern.lastIndex;
  }

  pushText(text.slice(textIndex));
  return segments;
};

const toHex = (color: string) => {
  if (color.startsWith('#')) return color;
  const channels = color.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  return `#${channels.slice(0, 3).map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
};

const toLinear = (channel: number) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
const toSrgb = (channel: number) => (channel <= 0.0031308 ? channel * 12.92 : (1.055 * channel ** (1 / 2.4)) - 0.055);

// wttr.in paints for a black terminal: its yellows and light greens vanish on a
// light window. On light schemes, darken any colour brighter than 4.5:1 against
// white while keeping its hue (luminance 0.18 is that limit).
const MAX_LIGHT_SCHEME_LUMINANCE = 0.18;
const readableOnLight = (color: string) => {
  const hex = toHex(color);
  const linear = [1, 3, 5].map((offset) => toLinear(parseInt(hex.slice(offset, offset + 2), 16) / 255));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  if (luminance <= MAX_LIGHT_SCHEME_LUMINANCE) return color;
  const scale = MAX_LIGHT_SCHEME_LUMINANCE / luminance;
  const [red, green, blue] = linear.map((channel) => Math.round(toSrgb(channel * scale) * 255));
  return `rgb(${red}, ${green}, ${blue})`;
};

const DIRECTION_GLYPHS = /([↖↗↘↙↑↓←→])/g;
const DIRECTION_GLYPH_CHARACTERS = "↖↗↘↙↑↓←→";

/**
 * wttr.in ends with "Location: <full place name> [lat,long]", often wider than
 * the forecast. It wraps on its own line so it never sets the window's width.
 */
const splitLocation = (text: string): [string, string | null] => {
  const index = text.lastIndexOf('\nLocation:');
  if (index === -1) return [text, null];
  return [text.slice(0, index), text.slice(index + 1).trim()];
};

const WeatherText = ({ text }: { text: string }) => {
  const { colorScheme } = useTheme();
  const segments = useMemo(() => {
    const parsed = parseWeatherAnsi(text);
    return colorScheme === 'light'
      ? parsed.map((segment) => (segment.color ? { ...segment, color: readableOnLight(segment.color) } : segment))
      : parsed;
  }, [text, colorScheme]);

  return segments.map((segment, segmentIndex) => (
    <span
      key={segmentIndex}
      style={{ color: segment.color, fontWeight: segment.bold ? 700 : undefined }}
    >
      {segment.text.split(DIRECTION_GLYPHS).map((part, partIndex) => (
        part.length === 1 && DIRECTION_GLYPH_CHARACTERS.includes(part)
          ? <span key={partIndex} className="weather-direction">{part}</span>
          : part
      ))}
    </span>
  ));
};

const normalizeWeatherResponse = (responseText: string, contentType: string | null) => {
  const isHtml = contentType?.includes('text/html') || /^\s*<!doctype html/i.test(responseText);
  if (!isHtml) return responseText;

  const weatherDocument = new DOMParser().parseFromString(responseText, 'text/html');
  const terminalReport = weatherDocument.querySelector('.term-container')?.textContent;
  if (!terminalReport) {
    throw new Error('Weather service returned an unreadable response');
  }

  return terminalReport.replaceAll('\u00a0', ' ').trimEnd();
};

// wttr.in's full report is about 125 columns. Below this window width ask for
// the narrow report (noon and night only, about 64 columns) so the whole
// forecast fits without scrolling sideways.
const NARROW_WIDTH_PX = 600;
type WeatherFormat = 'full' | 'narrow';
const FORMAT_FLAGS: Record<WeatherFormat, string> = { full: '2dFqA', narrow: '2dFqAn' };
// The full report keeps its original cache key so saved entries still hit.
const FORMAT_CACHE_PREFIX: Record<WeatherFormat, string> = { full: 'weather:text-v4', narrow: 'weather:text-v4-narrow' };

/**
 * Which report fits the element's width. Only changes when the width crosses
 * the threshold, so resizing a window refetches at most once per crossing.
 * Null until the first measurement, so no request goes out for the wrong one.
 */
const useWeatherFormat = (ref: React.RefObject<HTMLElement | null>) => {
  const [format, setFormat] = useState<WeatherFormat | null>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = (width: number) => setFormat(width < NARROW_WIDTH_PX ? 'narrow' : 'full');
    update(element.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return format;
};

export const WeatherApp: React.FC = () => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const format = useWeatherFormat(toolbarRef);
  const [searchInput, setSearchInput] = useState<string>('');
  const [weatherState, setWeatherState, stateLoading] = usePersistedState<WeatherAppState>({
    key: APP_STATE_KEY,
    defaultValue: { lastQuery: '' },
    debounceMs: 150,
    normalize: (stored, fallback) => {
      if (!stored || typeof stored !== 'object') return fallback;
      const lastQuery = (stored as Partial<WeatherAppState>).lastQuery;
      return { lastQuery: typeof lastQuery === 'string' ? lastQuery : fallback.lastQuery };
    },
  });
  const query = weatherState.lastQuery;

  useEffect(() => {
    if (!stateLoading) setSearchInput(query);
  }, [query, stateLoading]);

  const fetchWeather = async (location: string, reportFormat: WeatherFormat) => {
    const cacheKey = `${FORMAT_CACHE_PREFIX[reportFormat]}:${location || 'auto'}`;
    const flags = FORMAT_FLAGS[reportFormat];
    return cachedRequest({
      cacheKey,
      ttlMs: CACHE_TTL.WEATHER,
      source: 'weather',
      debugLabel: `weather:${reportFormat}:${location || 'auto'}`,
      load: async () => {
        console.log(`[API:Weather] GET ${location || 'auto'} (${reportFormat})`);
        const url = location
          ? `${APP_CONFIG.WEATHER_API_URL}/${encodeURIComponent(location)}?${flags}`
          : `${APP_CONFIG.WEATHER_API_URL}/?${flags}`;
        console.log('[API:Weather] Request:', url);
        const response = await fetch(url, { headers: { Accept: 'text/plain' } });
        if (!response.ok) throw new Error(`Weather data not available (${response.status})`);
        const responseText = await response.text();
        return normalizeWeatherResponse(responseText, response.headers.get('content-type'));
      },
    });
  };

  const { data: weatherData, isLoading: isQueryLoading, error, refetch } = useQuery({
    queryKey: ['weather', 'text-v4', format, query],
    queryFn: () => fetchWeather(query, format ?? 'full'),
    staleTime: CACHE_TTL.WEATHER,
    enabled: format !== null,
    // Crossing the width threshold swaps reports for the same place: keep the
    // one on screen until the other arrives instead of flashing "Loading".
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[3] === query ? previous : undefined),
  });
  const isLoading = format === null || isQueryLoading;

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchInput.trim();
    if (trimmedQuery) {
      console.log('[App:Weather] Search:', trimmedQuery);
      setWeatherState({ lastQuery: trimmedQuery });
    } else {
      console.warn('[Weather] Empty search query, fetching default location');
      setWeatherState({ lastQuery: '' });
    }
  };

  const [forecastText, locationLine] = splitLocation(weatherData || '');

  return (
    <WindowLayout
      toolbar={
        <div ref={toolbarRef} className="app-toolbar-row">
          <form onSubmit={handleSearch} className="app-joined-control flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter location..."
              className="search-input text-xs flex-1 focus:outline-none"
            />
            <RetroButton
              type="submit"
              size="sm"
            >
              Search
            </RetroButton>
          </form>
        </div>
      }
      hasPadding={true}
    >
      {isLoading ? (
        <StateMessage>
          Loading weather data...
        </StateMessage>
      ) : error ? (
        <LoadFailure error={error} what="the weather" onRetry={() => void refetch()} />
      ) : (
        <div className="weather-output-layout">
          <pre className="weather-output"><WeatherText text={forecastText} /></pre>
          {locationLine && <p className="weather-location"><WeatherText text={locationLine} /></p>}
          <div className="weather-attribution select-none">Powered by <a href={APP_CONFIG.WEATHER_API_URL} target="_blank" rel="noopener noreferrer">wttr.in</a></div>
        </div>
      )}
    </WindowLayout>
  );
};

export default WeatherApp;
