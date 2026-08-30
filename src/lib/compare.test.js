import { describe, it, expect } from 'vitest';
import { compareRows, COMPARE_LABELS } from './compare.js';
import { CAMPSITES } from './data/campsites.js';

const base = {
  id: 'a', name: 'A', area: '奥多摩', elevation: 300,
  price: { min: 2000, max: 2000, unit: 'per_person' },
  fire: { stand: true, ground: false, wood_sold: true },
  facilities: { toilet: true, shower: true, rental: true, shop: false, power: false },
  allows: { solo: true, pet: false, family: true, group: true },
  car: { available: true, distance_km: 60, minutes: 90, parking_fee: 1000 },
  transit: { from: '新宿', minutes: 105, legs: ['a'], last_arrival: '17:00' },
  season: null,
  reservation: { required: false, url: null },
};
const site = (over) => ({ ...base, ...over });

describe('compareRows', () => {
  it('行数が固定で、ラベルが既定の並びと一致する', () => {
    const rows = compareRows(site(), site({ id: 'b' }));
    expect(rows.map((r) => r.label)).toEqual(COMPARE_LABELS);
  });

  it('全く同じ2件はすべて引き分け', () => {
    for (const r of compareRows(site(), site({ id: 'b' }))) {
      expect(r.winner, r.label).toBe(null);
    }
  });

  it('安いほうが価格で勝つ', () => {
    const rows = compareRows(site(), site({ id: 'b', price: { min: 500, max: 500, unit: 'per_person' } }));
    expect(rows.find((r) => r.label === '料金').winner).toBe('b');
  });

  it('公共交通が無い側はアクセスで負ける', () => {
    const rows = compareRows(site(), site({ id: 'b', transit: null }));
    expect(rows.find((r) => r.label === '電車・バス').winner).toBe('a');
  });

  it('直火できる側が焚き火で勝つ', () => {
    const rows = compareRows(site(), site({ id: 'b', fire: { stand: true, ground: true, wood_sold: true } }));
    expect(rows.find((r) => r.label === '焚き火').winner).toBe('b');
  });

  it('設備が多い側が勝つ', () => {
    const rows = compareRows(
      site(),
      site({ id: 'b', facilities: { toilet: true, shower: true, rental: true, shop: true, power: true } }),
    );
    expect(rows.find((r) => r.label === '設備').winner).toBe('b');
  });

  it('予約不要のほうが勝つ（思い立って行ける）', () => {
    const rows = compareRows(site(), site({ id: 'b', reservation: { required: true, url: 'https://x' } }));
    expect(rows.find((r) => r.label === '予約').winner).toBe('a');
  });

  it('通年営業のほうが営業期間で勝つ', () => {
    const rows = compareRows(site(), site({ id: 'b', season: { open: '07-01', close: '09-30' } }));
    expect(rows.find((r) => r.label === '営業期間').winner).toBe('a');
  });

  it('標高は勝ち負けを付けない（好みなので）', () => {
    const rows = compareRows(site(), site({ id: 'b', elevation: 900 }));
    expect(rows.find((r) => r.label === '標高').winner).toBe(null);
  });

  it('全ての行が両側の表示文字列を持つ', () => {
    for (const r of compareRows(CAMPSITES[0], CAMPSITES[1])) {
      expect(typeof r.a, r.label).toBe('string');
      expect(typeof r.b, r.label).toBe('string');
      expect(r.a.length + r.b.length).toBeGreaterThan(0);
    }
  });

  it('落ちうる側：実データの総当たりで、全行引き分けの組は無い', () => {
    for (let i = 0; i < CAMPSITES.length; i++) {
      for (let j = i + 1; j < CAMPSITES.length; j++) {
        const rows = compareRows(CAMPSITES[i], CAMPSITES[j]);
        const decided = rows.filter((r) => r.winner !== null).length;
        expect(decided, `${CAMPSITES[i].name} vs ${CAMPSITES[j].name}`).toBeGreaterThan(0);
      }
    }
  });
});
