// Open-Meteo から週間予報を取る。判定は lib/weather.js の純粋関数に任せる。

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export async function fetchDaily(lat, lon) {
  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&daily=temperature_2m_min,precipitation_probability_max,wind_speed_10m_max' +
    '&timezone=Asia%2FTokyo&forecast_days=7';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  if (!json || !json.daily) throw new Error('daily がない');
  return json.daily;
}
