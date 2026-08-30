import { describe, it, expect } from 'vitest';
import { buildChecklist } from './checklist.js';
import { CAMPSITES } from './data/campsites.js';

const site = (over) => ({
  fire: { stand: true, ground: false, wood_sold: true },
  facilities: { toilet: true, shower: true, rental: true, shop: true, power: false },
  ...over,
});

describe('buildChecklist', () => {
  it('項目の id が重複しない', () => {
    for (const s of CAMPSITES) {
      const items = buildChecklist(s, { month: 1, minTemp: -3 });
      expect(new Set(items.map((i) => i.id)).size, s.name).toBe(items.length);
    }
  });

  it('全項目にカテゴリと文言がある', () => {
    for (const i of buildChecklist(site(), { month: 8, minTemp: 20 })) {
      expect(i.category).toBeTruthy();
      expect(i.text).toBeTruthy();
    }
  });

  it('レンタルがある場所では寝袋に「レンタルあり」の注記が付く', () => {
    const withRental = buildChecklist(site(), { month: 8, minTemp: 15 }).find((i) => i.id === 'sleeping-bag');
    expect(withRental.note).toBe('レンタルあり');

    const noRental = buildChecklist(
      site({ facilities: { toilet: true, shower: true, rental: false, shop: true, power: false } }),
      { month: 8, minTemp: 15 },
    ).find((i) => i.id === 'sleeping-bag');
    expect(noRental.note).toBe(null);
  });

  it('氷点下では防寒の項目が増える', () => {
    const warm = buildChecklist(site(), { month: 8, minTemp: 18 });
    const cold = buildChecklist(site(), { month: 1, minTemp: -3 });
    expect(cold.length).toBeGreaterThan(warm.length);
    expect(cold.some((i) => i.id === 'hot-water-bottle')).toBe(true);
    expect(warm.some((i) => i.id === 'hot-water-bottle')).toBe(false);
  });

  it('薪の現地販売が無く焚き火ができるなら「薪を持参」が入る', () => {
    const noWood = site({ fire: { stand: true, ground: false, wood_sold: false } });
    expect(buildChecklist(noWood, { month: 5, minTemp: 10 }).some((i) => i.id === 'firewood')).toBe(true);
    expect(buildChecklist(site(), { month: 5, minTemp: 10 }).some((i) => i.id === 'firewood')).toBe(false);
  });

  it('焚き火ができないなら焚き火の道具は出ない', () => {
    const noFire = site({ fire: { stand: false, ground: false, wood_sold: false } });
    const items = buildChecklist(noFire, { month: 5, minTemp: 10 });
    expect(items.some((i) => i.id === 'fire-stand')).toBe(false);
    expect(items.some((i) => i.id === 'firewood')).toBe(false);
  });

  it('夏は虫よけ、電源が無ければモバイルバッテリーが入る', () => {
    const summer = buildChecklist(site(), { month: 7, minTemp: 22 });
    expect(summer.some((i) => i.id === 'insect')).toBe(true);
    expect(summer.some((i) => i.id === 'power-bank')).toBe(true);
  });

  it('気温が不明でも落ちず、季節だけで組み立てる', () => {
    const items = buildChecklist(site(), { month: 3, minTemp: null });
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.id === 'hot-water-bottle')).toBe(false);
  });

  it('落ちうる側：どの実データ・どの月でも項目が5件以上出る', () => {
    for (const s of CAMPSITES) {
      for (const month of [1, 4, 7, 10]) {
        expect(buildChecklist(s, { month, minTemp: null }).length, `${s.name}/${month}月`).toBeGreaterThanOrEqual(5);
      }
    }
  });
});
