import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { StateMessage } from '@/components/ui/StateMessage';
import { RetroButton } from '@/components/ui/RetroButton';
import { APP_CONFIG } from '@/config/constants';
import { getCachedData, setCachedData, incrementRequestCount, getAppState, setAppState, CACHE_TTL } from '@/lib/storage';

interface WeatherAppProps {
  // Any props needed for the weather app
}

const APP_STATE_KEY = 'app:weather';
interface WeatherAppState {
  lastQuery: string;
}

export const WeatherApp: React.FC<WeatherAppProps> = () => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const isInitialLoad = useRef(true);

  // Load persisted state on mount
  useEffect(() => {
    let mounted = true;

    const loadState = async () => {
      try {
        const saved = await getAppState<WeatherAppState>(APP_STATE_KEY);
        if (mounted && saved && saved.lastQuery) {
          setQuery(saved.lastQuery);
          setSearchInput(saved.lastQuery);
        }
      } catch (error) {
        console.error('[WeatherApp] Failed to load state:', error);
      } finally {
        if (mounted) {
          isInitialLoad.current = false;
        }
      }
    };

    loadState();

    return () => {
      mounted = false;
    };
  }, []);

  // Save state when query changes
  useEffect(() => {
    if (isInitialLoad.current) return;

    const saveState = async () => {
      try {
        await setAppState<WeatherAppState>(APP_STATE_KEY, { lastQuery: query });
      } catch (error) {
        console.error('[WeatherApp] Failed to save state:', error);
      }
    };

    saveState();
  }, [query]);

  const fetchWeather = async (location: string) => {
    const cacheKey = `weather:${location || 'auto'}`;

    // Check cache first
    const cached = await getCachedData<string>(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit: weather:${location || 'auto'}`);
      return cached;
    }

    console.log(`[API:Weather] GET ${location || 'auto'}`);
    await incrementRequestCount('weather');

    // Using wttr.in with no format parameter to get the full ASCII art display
    // Adding parameters:
    // - q: quiet (no "Follow @igor_chubin" text)
    // - n: no terminal control characters
    const url = location
      ? `${APP_CONFIG.WEATHER_API_URL}/${encodeURIComponent(location)}?2dFq`
      : `${APP_CONFIG.WEATHER_API_URL}/?2dFq`;

    console.log('[API:Weather] Request:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather data not available (${response.status})`);
    }

    const weatherText = await response.text();

    // Store in cache
    await setCachedData(cacheKey, weatherText, CACHE_TTL.WEATHER);

    return weatherText;
  };

  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ['weather', query],
    queryFn: () => fetchWeather(query),
    staleTime: CACHE_TTL.WEATHER,
    retry: 1,
  });

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchInput.trim();
    if (trimmedQuery) {
      console.log('[App:Weather] Search:', trimmedQuery);
      setQuery(trimmedQuery);
    } else {
      console.warn('[Weather] Empty search query, fetching default location');
      setQuery('');
    }
  };

  return (
    <WindowLayout
      toolbar={
        <div className="p-1 border-b border-border flex items-center gap-0 select-none">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-0">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter location..."
              className="search-input text-xs flex-1 h-[18px] border-r-0 focus:outline-none"
            />
            <RetroButton
              type="submit"
              size="sm"
              className="h-[18px]"
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
        <div className="text-red-500 p-4 text-sm">
          <p>{error instanceof Error ? error.message : 'Failed to fetch weather data. Please try again.'}</p>
        </div>
      ) : (
        <div>
          <div
            className="text-xs"
            dangerouslySetInnerHTML={{ __html: weatherData || '' }}
          />
          <div className="mt-4 text-xs opacity-50 select-none">Powered by <a className="underline text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" href={APP_CONFIG.WEATHER_API_URL} target="_blank" rel="noopener noreferrer">wttr.in</a></div>
        </div>
      )}
    </WindowLayout>
  );
};

export default WeatherApp;