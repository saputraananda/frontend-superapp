import { useState, useEffect } from "react";

export default function WeatherWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weatherData, setWeatherData] = useState([]);
  const [loading, setLoading] = useState(true);

  const locations = [
    { name: "Head Office", fullName: "Waschen Alora Indonesia", lat: -6.3982186, lon: 106.8968972, type: "office" },
    { name: "Raffles Hills", fullName: "Waschen Laundry Raffles Hills", lat: -6.3930451, lon: 106.8973061, type: "outlet" },
    { name: "Citra Gran", fullName: "Waschen Laundry Citra Gran", lat: -6.3910336, lon: 106.9174826, type: "outlet" },
    { name: "Legenda", fullName: "Waschen Laundry Legenda", lat: -6.3996643, lon: 106.9410997, type: "outlet" },
    { name: "Canadian", fullName: "Waschen Laundry Canadian", lat: -6.3706142, lon: 106.960565, type: "outlet" },
    { name: "Centra Eropa", fullName: "Waschen Laundry Centra Eropa", lat: -6.37013, lon: 106.9561867, type: "outlet" },
    { name: "IKM Pringgondani", fullName: "IKM Laundry", lat: -6.3847206, lon: 106.8992763, type: "factory" }
  ];

  useEffect(() => {
    const fetchWeatherForAllLocations = async () => {
      try {
        const promises = locations.map(async (location) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
          );
          const data = await response.json();
          return {
            ...location,
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code
          };
        });

        const results = await Promise.all(promises);
        setWeatherData(results);
      } catch (err) {
        console.error("Error loading weather:", err);
        setWeatherData(locations.map(loc => ({
          ...loc,
          temp: 30,
          humidity: 72,
          windSpeed: 8,
          weatherCode: 2
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherForAllLocations();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % locations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [locations.length]);

  const getWeatherDescription = (code) => {
    if (code <= 1) return "Cerah";
    if (code <= 3) return "Berawan";
    if (code <= 48) return "Berkabut";
    if (code <= 67) return "Hujan";
    if (code <= 77) return "Salju";
    return "Badai";
  };

  const getWeatherIcon = (code) => {
    if (code <= 1) return "☀️";
    if (code <= 3) return "⛅";
    if (code <= 48) return "🌫️";
    if (code <= 67) return "🌧️";
    return "⛈️";
  };

  const getTypeIcon = (type) => {
    if (type === "office") return "🏢";
    if (type === "factory") return "🏭";
    return "🏪";
  };

  const getTypeBadge = (type) => {
    if (type === "office") return { text: "Head Office", color: "bg-blue-500/20 text-blue-300 border-blue-400/30" };
    if (type === "factory") return { text: "Factory", color: "bg-orange-500/20 text-orange-300 border-orange-400/30" };
    return { text: "Outlet", color: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30" };
  };

  const nextLocation = () => {
    setCurrentIndex((prev) => (prev + 1) % locations.length);
  };

  const prevLocation = () => {
    setCurrentIndex((prev) => (prev - 1 + locations.length) % locations.length);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 shadow-sm p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  const currentWeather = weatherData[currentIndex];
  const typeBadge = getTypeBadge(currentWeather.type);

  return (
    <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600 shadow-sm overflow-hidden">
      {/* Header - Compact */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-600/50">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{getTypeIcon(currentWeather.type)}</span>
            <h3 className="text-xs font-bold text-white">{currentWeather.name}</h3>
          </div>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${typeBadge.color}`}>
            {typeBadge.text}
          </span>
        </div>
        <p className="text-[10px] text-slate-400 truncate">{currentWeather.fullName}</p>
      </div>

      {/* Weather Content - Compact */}
      <div className="px-4 py-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-start mb-0.5">
              <span className="text-3xl font-light">{currentWeather.temp}</span>
              <span className="text-lg">°C</span>
            </div>
            <p className="text-[10px] text-slate-300">
              {getWeatherDescription(currentWeather.weatherCode)}
            </p>
          </div>
          <div className="text-4xl">{getWeatherIcon(currentWeather.weatherCode)}</div>
        </div>

        {/* Weather Details */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-600/50 text-[10px]">
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.5 2a3.5 3.5 0 101.665 6.58L8.585 10l-1.42 1.42a3.5 3.5 0 101.414 1.414l8.128-8.127a1 1 0 00-1.414-1.414L7.165 11.42A3.5 3.5 0 105.5 2z" clipRule="evenodd" />
            </svg>
            <span className="text-slate-300">{currentWeather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="h-3 w-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="text-slate-300">{currentWeather.windSpeed} km/h</span>
          </div>
        </div>
      </div>

      {/* Navigation - Compact */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <button
            onClick={prevLocation}
            className="h-6 w-6 rounded-full bg-slate-600/50 hover:bg-slate-600 text-white transition flex items-center justify-center"
            aria-label="Previous location"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {locations.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-white w-3"
                    : "bg-slate-500 w-1 hover:bg-slate-400"
                }`}
                aria-label={`Go to location ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextLocation}
            className="h-6 w-6 rounded-full bg-slate-600/50 hover:bg-slate-600 text-white transition flex items-center justify-center"
            aria-label="Next location"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Location counter */}
        <p className="text-center text-[10px] text-slate-400">
          {currentIndex + 1} / {locations.length}
        </p>
      </div>
    </div>
  );
}