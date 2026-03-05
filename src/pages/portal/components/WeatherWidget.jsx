import { useState, useEffect, useCallback } from "react";

// ── Konstanta di luar komponen agar tidak re-create tiap render ──
const LOCATIONS = [
  { name: "Head Office", fullName: "Waschen Alora Indonesia", lat: -6.3982186, lon: 106.8968972, type: "office" },
  { name: "Raffles Hills", fullName: "Waschen Laundry Raffles Hills", lat: -6.3930451, lon: 106.8973061, type: "outlet" },
  { name: "Citra Gran", fullName: "Waschen Laundry Citra Gran", lat: -6.3910336, lon: 106.9174826, type: "outlet" },
  { name: "Legenda", fullName: "Waschen Laundry Legenda", lat: -6.3996643, lon: 106.9410997, type: "outlet" },
  { name: "Canadian", fullName: "Waschen Laundry Canadian", lat: -6.3706142, lon: 106.960565, type: "outlet" },
  { name: "Centra Eropa", fullName: "Waschen Laundry Centra Eropa", lat: -6.37013, lon: 106.9561867, type: "outlet" },
  { name: "IKM Pringgondani", fullName: "IKM Laundry", lat: -6.3847206, lon: 106.8992763, type: "factory" },
];

// ── Fix: getTypeBadge ──────────────────────────────────────────────────────
const getTypeBadge = (type) => {
  switch (type) {
    case "office": return { text: "Head Office", color: "bg-blue-500/20 text-blue-200 border-blue-400/30" };
    case "factory": return { text: "Factory", color: "bg-orange-500/20 text-orange-200 border-orange-400/30" };
    default: return { text: "Outlet", color: "bg-green-500/20 text-green-200 border-green-400/30" };
  }
};

// ── Fix: getTypeIcon ───────────────────────────────────────────────────────
const getTypeIcon = (type) => {
  switch (type) {
    case "office": return "🏢";
    case "factory": return "🏭";
    default: return "🏪";
  }
};

// ── WMO Weather Code ───────────────────────────────────────────────────────
const getWeatherInfo = (code) => {
  if (code === 0) return { desc: "Cerah", icon: "☀️", bg: "from-sky-500 to-blue-600" };
  if (code === 1) return { desc: "Cerah Sebagian", icon: "🌤️", bg: "from-sky-500 to-blue-600" };
  if (code === 2) return { desc: "Berawan Sebagian", icon: "⛅", bg: "from-slate-500 to-slate-700" };
  if (code === 3) return { desc: "Mendung", icon: "☁️", bg: "from-slate-600 to-slate-800" };
  if (code >= 45 && code <= 48) return { desc: "Berkabut", icon: "🌫️", bg: "from-slate-500 to-slate-700" };
  if (code >= 51 && code <= 53) return { desc: "Gerimis Ringan", icon: "🌦️", bg: "from-slate-600 to-blue-800" };
  if (code >= 55 && code <= 57) return { desc: "Gerimis Lebat", icon: "🌧️", bg: "from-slate-700 to-blue-900" };
  if (code >= 61 && code <= 63) return { desc: "Hujan Ringan", icon: "🌧️", bg: "from-slate-700 to-blue-900" };
  if (code === 65) return { desc: "Hujan Lebat", icon: "🌧️", bg: "from-slate-800 to-blue-950" };
  if (code >= 66 && code <= 67) return { desc: "Hujan Es", icon: "🌨️", bg: "from-slate-700 to-indigo-900" };
  if (code >= 71 && code <= 75) return { desc: "Salju", icon: "❄️", bg: "from-slate-400 to-blue-300" };
  if (code === 77) return { desc: "Hujan Salju", icon: "🌨️", bg: "from-slate-400 to-blue-400" };
  if (code === 80) return { desc: "Gerimis Ringan", icon: "🌦️", bg: "from-slate-700 to-blue-900" };
  if (code === 81) return { desc: "Gerimis Sedang", icon: "🌧️", bg: "from-slate-800 to-blue-950" };
  if (code === 82) return { desc: "Gerimis Lebat", icon: "⛈️", bg: "from-slate-900 to-indigo-950" };
  if (code >= 85 && code <= 86) return { desc: "Gerimis Salju", icon: "🌨️", bg: "from-slate-500 to-blue-400" };
  if (code === 95) return { desc: "Badai Petir", icon: "⛈️", bg: "from-gray-900 to-slate-950" };
  if (code >= 96 && code <= 99) return { desc: "Badai + Hujan Es", icon: "🌩️", bg: "from-gray-900 to-slate-950" };
  return { desc: "Tidak Diketahui", icon: "🌡️", bg: "from-slate-600 to-slate-800" };
};

export default function WeatherWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [weatherData, setWeatherData] = useState([]);
  // Fix: hapus 'loading' state jika tidak dipakai di JSX,
  // atau pakai untuk tampilkan skeleton
  const [loading, setLoading] = useState(true);

  // Fix: LOCATIONS di luar komponen → useEffect tidak perlu dependency 'locations'
  useEffect(() => {
    const fetchWeatherForAllLocations = async () => {
      try {
        const promises = LOCATIONS.map(async (location) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`
          );
          const data = await response.json();
          return {
            ...location,
            temp: Math.round(data.current.temperature_2m),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code,
          };
        });

        const results = await Promise.all(promises);
        setWeatherData(results);
      } catch (err) {
        console.error("Error loading weather:", err);
        setWeatherData(LOCATIONS.map((loc) => ({
          ...loc,
          temp: 30, humidity: 72, windSpeed: 8, weatherCode: 2,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherForAllLocations();
  }, []); // ← kosong karena LOCATIONS sudah konstan di luar

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LOCATIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fix: prevLocation & nextLocation
  const prevLocation = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + LOCATIONS.length) % LOCATIONS.length);
  }, []);

  const nextLocation = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % LOCATIONS.length);
  }, []);

  // Loading state — Fix: sekarang 'loading' benar-benar dipakai
  if (loading || weatherData.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl border border-white/10 shadow-sm h-48 animate-pulse flex items-center justify-center">
        <span className="text-white/40 text-xs">Memuat cuaca...</span>
      </div>
    );
  }

  const currentWeather = weatherData[currentIndex];
  const weatherInfo = getWeatherInfo(currentWeather?.weatherCode ?? 0);
  const typeBadge = getTypeBadge(currentWeather.type);

  return (
    <div className={`bg-gradient-to-br ${weatherInfo.bg} rounded-xl border border-white/10 shadow-sm overflow-hidden transition-all duration-700`}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{getTypeIcon(currentWeather.type)}</span>
            <h3 className="text-xs font-bold text-white">{currentWeather.name}</h3>
          </div>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${typeBadge.color}`}>
            {typeBadge.text}
          </span>
        </div>
        <p className="text-[10px] text-white/60 truncate">{currentWeather.fullName}</p>
      </div>

      {/* Weather Content */}
      <div className="px-4 py-3 text-white">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-start mb-0.5">
              <span className="text-3xl font-light">{currentWeather.temp}</span>
              <span className="text-lg">°C</span>
            </div>
            <p className="text-[10px] text-white/70">{weatherInfo.desc}</p>
          </div>
          <div className={`text-4xl ${currentWeather.weatherCode >= 51 ? "animate-bounce" : ""}`}>
            {weatherInfo.icon}
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
          <div className="flex items-center gap-1">
            <span className="text-white/60">💧</span>
            <span className="text-white/80">{currentWeather.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-white/60">💨</span>
            <span className="text-white/80">{currentWeather.windSpeed} km/h</span>
          </div>
          <div className="text-white/40">WMO {currentWeather.weatherCode}</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <button
            onClick={prevLocation}
            className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center"
            aria-label="Previous location"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-1">
            {LOCATIONS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-1 rounded-full transition-all ${index === currentIndex ? "bg-white w-3" : "bg-white/30 w-1 hover:bg-white/50"
                  }`}
                aria-label={`Go to location ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextLocation}
            className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center"
            aria-label="Next location"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="text-center text-[10px] text-white/40">
          {currentIndex + 1} / {LOCATIONS.length}
        </p>
      </div>
    </div>
  );
}