import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { APP_CONFIG } from '@/config/constants';

interface WeatherAppProps {
  // Any props needed for the weather app
}

export const WeatherApp: React.FC<WeatherAppProps> = () => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [query, setQuery] = useState<string>('');

  const fetchWeather = async (location: string) => {
    console.info(`[Weather] Fetching weather data${location ? ` for location: ${location}` : ' for current location'}`);

    // Using wttr.in with no format parameter to get the full ASCII art display
    // Adding parameters:
    // - q: quiet (no "Follow @igor_chubin" text)
    // - n: no terminal control characters
    const url = location
      ? `${APP_CONFIG.WEATHER_API_URL}/${encodeURIComponent(location)}?2dFq`
      : `${APP_CONFIG.WEATHER_API_URL}/?2dFq`;

    console.log('[Weather] Requesting data from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather data not available (${response.status})`);
    }

    return response.text();
  };

  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ['weather', query],
    queryFn: () => fetchWeather(query),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 1,
  });

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchInput.trim();
    if (trimmedQuery) {
      console.log('[Weather] User searched for location:', trimmedQuery);
      setQuery(trimmedQuery);
    } else {
      console.warn('[Weather] Empty search query, fetching default location');
      setQuery('');
    }
  };

  return (
    <WindowLayout
      toolbar={
        <div className="p-1 border-b flex items-center gap-0 select-none">
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
        <div className="flex justify-center items-center h-full">
          <p>Loading weather data...</p>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4">
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