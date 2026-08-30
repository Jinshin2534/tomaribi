// 2か所の比較表。「どっちがいいか」ではなく「どこが違うか」を並べる。
// 標高のように好みが割れるものには勝ち負けを付けない。

import { formatPrice, formatMinutes, formatDistance, formatSeason, formatYen } from './format.js';
import { minPricePerPerson } from './filter.js';

export const COMPARE_LABELS = ['料金', '電車・バス', '車', '駐車料金', '焚き火', '設備', '標高', '営業期間', 'ペット', 'ソロ'];

const cmp = (av, bv, higherWins = true) => {
  if (av === bv) return null;
  const aWins = higherWins ? av > bv : av < bv;
  return aWins ? 'a' : 'b';
};

const fireScore = (s) => (s.fire.stand ? 2 : 0) + (s.fire.ground ? 2 : 0) + (s.fire.wood_sold ? 1 : 0);
const facilityScore = (s) => ['toilet', 'shower', 'rental', 'shop', 'power'].filter((k) => s.facilities[k]).length;

const fireText = (s) => {
  if (!s.fire.stand) return '不可';
  const parts = [s.fire.ground ? '直火OK' : '焚き火台'];
  if (s.fire.wood_sold) parts.push('薪あり');
  return parts.join('・');
};
const facilityText = (s) => {
  const names = { toilet: 'トイレ', shower: 'シャワー', rental: 'レンタル', shop: '売店', power: '電源' };
  const has = Object.keys(names).filter((k) => s.facilities[k]).map((k) => names[k]);
  return has.length ? has.join('・') : 'なし';
};
const transitText = (s) => (s.transit ? `${formatMinutes(s.transit.minutes)}（${s.transit.from}から）` : '行けない');
const carText = (s) => (s.car.available ? `${formatMinutes(s.car.minutes)} / ${formatDistance(s.car.distance_km)}` : '入れない');
const yesNo = (v) => (v ? '可' : '不可');

export function compareRows(a, b) {
  const transitMin = (s) => (s.transit ? s.transit.minutes : Infinity);
  const carMin = (s) => (s.car.available ? s.car.minutes : Infinity);
  const seasonScore = (s) => (s.season === null ? 1 : 0);

  return [
    { label: '料金', a: formatPrice(a.price), b: formatPrice(b.price), winner: cmp(minPricePerPerson(a, 1), minPricePerPerson(b, 1), false) },
    { label: '電車・バス', a: transitText(a), b: transitText(b), winner: cmp(transitMin(a), transitMin(b), false) },
    { label: '車', a: carText(a), b: carText(b), winner: cmp(carMin(a), carMin(b), false) },
    { label: '駐車料金', a: a.car.available ? formatYen(a.car.parking_fee) : '—', b: b.car.available ? formatYen(b.car.parking_fee) : '—', winner: cmp(a.car.parking_fee, b.car.parking_fee, false) },
    { label: '焚き火', a: fireText(a), b: fireText(b), winner: cmp(fireScore(a), fireScore(b)) },
    { label: '設備', a: facilityText(a), b: facilityText(b), winner: cmp(facilityScore(a), facilityScore(b)) },
    { label: '標高', a: `${a.elevation}m`, b: `${b.elevation}m`, winner: null },
    { label: '営業期間', a: formatSeason(a.season), b: formatSeason(b.season), winner: cmp(seasonScore(a), seasonScore(b)) },
    { label: 'ペット', a: yesNo(a.allows.pet), b: yesNo(b.allows.pet), winner: cmp(a.allows.pet ? 1 : 0, b.allows.pet ? 1 : 0) },
    { label: 'ソロ', a: yesNo(a.allows.solo), b: yesNo(b.allows.solo), winner: cmp(a.allows.solo ? 1 : 0, b.allows.solo ? 1 : 0) },
  ];
}
