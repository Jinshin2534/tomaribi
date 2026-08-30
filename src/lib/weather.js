// 週間予報から「その夜、泊まれるか」を判定する。
//
// 風速は Open-Meteo の wind_speed_10m_max（地上10mの日最大）。
// 当初 7m/s を「厳しい」にしていたが、実データで湾岸のキャンプ場が
// 常時「厳しい」になり判定が意味を失ったため、テント設営が実際に
// つらくなる 10m/s、危険側の 15m/s に引き上げた。
// fetch はここに書かない（純粋関数のまま素の node から呼べるようにする）。

export const VERDICT_LABEL = {
  good: '泊まりやすい',
  ok: '泊まれる（冷える）',
  tough: '厳しい',
  no: 'やめたほうがいい',
  unknown: '判断できない',
};

const RANK = { good: 0, ok: 1, tough: 2, no: 3 };
const worse = (a, b) => (RANK[b] > RANK[a] ? b : a);

const missing = (v) => v === null || v === undefined || Number.isNaN(v);

/** その日の夜の泊まりやすさ。厳しい側が常に勝つ。 */
export function nightVerdict(day) {
  if (!day) return 'unknown';
  const { minTemp, precipProb, windMax } = day;
  if (missing(minTemp) || missing(precipProb) || missing(windMax)) return 'unknown';

  let v = 'good';
  if (minTemp < -5) v = worse(v, 'no');
  else if (minTemp < 0) v = worse(v, 'tough');
  else if (minTemp < 5) v = worse(v, 'ok');

  if (precipProb >= 70) v = worse(v, 'no');
  else if (precipProb >= 40) v = worse(v, 'tough');

  if (windMax >= 15) v = worse(v, 'no');
  else if (windMax >= 10) v = worse(v, 'tough');

  return v;
}

/** 就寝時の体感は予報の最低気温より下がるので、5℃ 低い快適使用温度を目安にする。 */
export function sleepingBagComfort(minTemp) {
  if (missing(minTemp)) return null;
  return minTemp - 5;
}

/** Open-Meteo の daily（配列の束）を、日ごとのオブジェクトに割る。 */
export function summarizeWeek(daily) {
  if (!daily || !Array.isArray(daily.time)) return [];
  const at = (arr, i) => (Array.isArray(arr) && i < arr.length ? arr[i] : null);

  return daily.time.map((date, i) => {
    const d = {
      date,
      minTemp: at(daily.temperature_2m_min, i),
      precipProb: at(daily.precipitation_probability_max, i),
      windMax: at(daily.wind_speed_10m_max, i),
    };
    return { ...d, verdict: nightVerdict(d), sleepingBag: sleepingBagComfort(d.minTemp) };
  });
}
