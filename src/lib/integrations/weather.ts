import { useRemote } from "../useRemote";

/** Taupō. Open-Meteo is free and needs no key. */
const URL_TAUPO =
  "https://api.open-meteo.com/v1/forecast?latitude=-38.69&longitude=176.07" +
  "&current=temperature_2m,weather_code,is_day,wind_speed_10m" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max" +
  "&timezone=Pacific%2FAuckland&forecast_days=3";

export interface Weather {
  temp: number;
  code: number;
  isDay: boolean;
  high: number;
  low: number;
  rainChance: number;
  uv: number;
  tomorrow: { code: number; high: number; low: number };
}

interface OpenMeteo {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  daily: {
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    uv_index_max?: (number | null)[];
  };
}

export function useWeather() {
  return useRemote<Weather>(
    "weather-taupo",
    async () => {
      const res = await fetch(URL_TAUPO);
      if (!res.ok) throw new Error(`Weather ${res.status}`);
      const j = (await res.json()) as OpenMeteo;
      return {
        temp: Math.round(j.current.temperature_2m),
        code: j.current.weather_code,
        isDay: j.current.is_day === 1,
        high: Math.round(j.daily.temperature_2m_max[0]),
        low: Math.round(j.daily.temperature_2m_min[0]),
        rainChance: j.daily.precipitation_probability_max[0] ?? 0,
        uv: j.daily.uv_index_max?.[0] ?? 0,
        tomorrow: {
          code: j.daily.weather_code[1],
          high: Math.round(j.daily.temperature_2m_max[1]),
          low: Math.round(j.daily.temperature_2m_min[1]),
        },
      };
    },
    { intervalMs: 20 * 60_000 },
  );
}

/** WMO weather code → a friendly word and a picture kids recognise. */
export function describeWeather(code: number, isDay = true): { label: string; emoji: string } {
  if (code === 0) return isDay ? { label: "Sunny", emoji: "☀️" } : { label: "Clear", emoji: "🌙" };
  if (code <= 2) return { label: "Some cloud", emoji: isDay ? "🌤️" : "☁️" };
  if (code === 3) return { label: "Cloudy", emoji: "☁️" };
  if (code === 45 || code === 48) return { label: "Foggy", emoji: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", emoji: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rainy", emoji: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", emoji: "🌨️" };
  if (code >= 80 && code <= 82) return { label: "Showers", emoji: "🌦️" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", emoji: "🌨️" };
  if (code >= 95) return { label: "Stormy", emoji: "⛈️" };
  return { label: "Mixed", emoji: "🌥️" };
}
