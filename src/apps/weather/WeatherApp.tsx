import React, { useState, useEffect } from 'react';

interface WeatherAppProps {
  // Any props needed for the weather app
}

export const WeatherApp: React.FC<WeatherAppProps> = () => {
  const [searchInput, setSearchInput] = useState<string>('');
  const [weatherData, setWeatherData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch weather data from wttr.in
  const fetchWeather = async (query: string = '') => {
    setLoading(true);
    setError(null);
    
    try {
      // Using wttr.in with no format parameter to get the full ASCII art display
      // Adding parameters:
      // - q: quiet (no "Follow @igor_chubin" text)
      // - n: no terminal control characters
      const url = query 
        ? `https://wttr.in/${encodeURIComponent(query)}?2dFq` 
        : 'https://wttr.in/?2dFq';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather data not available (${response.status})`);
      }
      
      const data = await response.text();
      setWeatherData(data);
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError('Failed to fetch weather data. Please try again.');
      setWeatherData(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(searchInput.trim());
  };

  // Load weather on initial render
  useEffect(() => {
    fetchWeather();
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar area */}
      <div className="p-1 border-b flex items-center gap-0">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-0">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Enter location..."
            className="search-input text-xs flex-1 h-[18px] border-r-0 focus:outline-none"
          />
          <button type="submit" className="retro-button text-xs px-1 h-[18px]">
            Search
          </button>
        </form>
      </div>
      
      {/* Content area */}
      <div className="window-content-area overflow-auto flex-1 p-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <p>Loading weather data...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">
            <p>{error}</p>
          </div>
        ) : (
            <div>
              <div 
                className="text-xs"
                dangerouslySetInnerHTML={{ __html: weatherData || '' }}
              />
              <div className="mt-4 text-xs">Powered by <a className="underline text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300" href="https://wttr.in/" target="_blank" rel="noopener noreferrer">wttr.in</a></div>
            </div>
        )}
      </div>
    </div>
  );
};

export default WeatherApp; 