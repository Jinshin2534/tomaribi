// 適合度スコア。ハード制約を通った候補どうしを比べるためだけに使う。
//
// 各軸は 0..1 の素点（raw）を出し、条件依存の重み（weight）を掛けて points にする。
// 寄与（contributions）を残すのは、順位そのものより「なぜそこか」を出したいから。

import { travelMinutes, arrivalMargin } from './access.js';
import { minPricePerPerson } from './filter.js';

export const AXES = ['access', 'fire', 'facility', 'quiet', 'price', 'season'];

const AXIS_LABEL = {
  access: 'アクセス',
  fire: '焚き火',
  facility: '設備',
  quiet: '静けさ',
  price: '価格',
  season: '季節との相性',
};

const BASE_WEIGHTS = { access: 1.0, fire: 0.8, facility: 0.8, quiet: 0.7, price: 0.7, season: 0.5 };

export function weightsFor(criteria) {
  const c = criteria ?? {};
  const w = { ...BASE_WEIGHTS };

  if (c.hasCar === false) w.access = 1.6;
  if (c.fire === 'ground') w.fire = 1.4;
  else if (c.fire === 'stand') w.fire = 1.1;
  else if (c.fire === 'none') w.fire = 0.3;

  if (c.party === 'solo') { w.quiet = 1.2; w.facility = 0.5; }
  else if (c.party === 'family') { w.quiet = 0.4; w.facility = 1.3; }
  else if (c.party === 'group') { w.quiet = 0.3; w.facility = 1.0; }

  if (typeof c.budget === 'number') w.price = 1.2;
  if (c.tebura === true) w.facility = Math.max(w.facility, 1.2);
  if (typeof c.month === 'number') w.season = 0.8;

  return w;
}

/** 0..1 に収める。 */
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** 大きいほど悪い値を 0..1 の「良さ」に変換する。 */
function decay(value, best, worst) {
  if (value <= best) return 1;
  if (value >= worst) return 0;
  return 1 - (value - best) / (worst - best);
}

function accessRaw(site, c) {
  const hasCar = c.hasCar !== false;
  const minutes = travelMinutes(site, { hasCar });
  if (minutes === null) return 0;
  const base = hasCar ? decay(minutes, 30, 240) : decay(minutes, 45, 300);
  const margin = arrivalMargin(site, { hasCar, departHour: c.departHour ?? 9 });
  // 間に合わない・ぎりぎりは減点。余裕が3時間あれば満点扱い。
  const marginScore = margin === null ? 0 : clamp01((margin + 60) / 240);
  return clamp01(base * 0.65 + marginScore * 0.35);
}

function fireRaw(site) {
  let v = 0;
  if (site.fire.stand) v += 0.5;
  if (site.fire.ground) v += 0.3;
  if (site.fire.wood_sold) v += 0.2;
  return clamp01(v);
}

function facilityRaw(site) {
  const f = site.facilities;
  const keys = ['toilet', 'shower', 'rental', 'shop', 'power'];
  return keys.filter((k) => f[k]).length / keys.length;
}

/** 静けさ：小規模・団体不可・標高が高い・駅から遠いほど静か、という近似。 */
function quietRaw(site) {
  let v = 0.35;
  if (!site.allows.group) v += 0.3;
  if (site.transit === null) v += 0.15; // 公共交通で来にくい＝人が少ない
  v += clamp01(site.elevation / 800) * 0.25;
  if (site.area === '湾岸') v -= 0.2;
  return clamp01(v);
}

function priceRaw(site, c) {
  const per = minPricePerPerson(site, c.headcount ?? 1);
  const ceiling = typeof c.budget === 'number' ? c.budget : 8000;
  return clamp01(decay(per, 0, Math.max(ceiling, 1)));
}

/** 夏は標高が高いほど、冬は低いほど過ごしやすい、という近似。 */
function seasonRaw(site, c) {
  const month = c.month;
  if (typeof month !== 'number') return 0.5;
  const high = clamp01(site.elevation / 900);
  if (month >= 6 && month <= 9) return high;
  if (month === 12 || month <= 2) return 1 - high;
  return 0.5 + (high - 0.5) * 0.2;
}

const RAW = {
  access: accessRaw,
  fire: (site) => fireRaw(site),
  facility: (site) => facilityRaw(site),
  quiet: (site) => quietRaw(site),
  price: priceRaw,
  season: seasonRaw,
};

export function scoreSite(site, criteria) {
  const c = criteria ?? {};
  const weights = weightsFor(c);
  const contributions = AXES.map((axis) => {
    const raw = RAW[axis](site, c);
    const weight = weights[axis];
    return { axis, label: AXIS_LABEL[axis], raw, weight, points: raw * weight };
  });
  const total = contributions.reduce((a, co) => a + co.points, 0);
  return { total, contributions };
}

/** スコア降順。同点は id の辞書順で決めて、並びを決定論にする。 */
export function rankSites(sites, criteria) {
  return sites
    .map((site) => ({ site, ...scoreSite(site, criteria) }))
    .sort((a, b) => b.total - a.total || a.site.id.localeCompare(b.site.id))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
