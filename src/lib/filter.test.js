import { describe, it, expect } from 'vitest';
import { disqualify, filterSites, DISQUALIFY_REASONS } from './filter.js';
import { CAMPSITES } from './data/campsites.js';

const base = {
  id: 'x', name: 'テスト場', area: '奥多摩', city: '', lat: 35.8, lon: 139.1, elevation: 300,
  price: { min: 2000, max: 2000, unit: 'per_person' },
  fire: { stand: true, ground: true, wood_sold: true },
  facilities: { toilet: true, shower: true, rental: true, shop: true, power: true },
  allows: { solo: true, pet: true, family: true, group: true },
  car: { available: true, distance_km: 60, minutes: 90, parking_fee: 0 },
  transit: { from: '新宿', minutes: 105, legs: ['a'], last_arrival: '17:00' },
  season: null,
  reservation: { required: false, url: null },
  closed: null, verified: true, source: 'https://example.com', note: 'n',
};
const site = (over) => ({ ...base, ...over });

describe('disqualify — 失格表の各行', () => {
  it('条件が空なら誰も落ちない', () => {
    expect(disqualify(site(), {})).toEqual([]);
  });

  it('休止中は必ず落ちる', () => {
    expect(disqualify(site({ closed: '工事中' }), {})).toContain(DISQUALIFY_REASONS.closed);
    expect(disqualify(site({ closed: null }), {})).not.toContain(DISQUALIFY_REASONS.closed);
  });

  it('車なしで公共交通が無ければ落ちる', () => {
    expect(disqualify(site({ transit: null }), { hasCar: false })).toContain(DISQUALIFY_REASONS.noTransit);
    expect(disqualify(site({ transit: null }), { hasCar: true })).not.toContain(DISQUALIFY_REASONS.noTransit);
    expect(disqualify(site(), { hasCar: false })).not.toContain(DISQUALIFY_REASONS.noTransit);
  });

  it('車ありで駐車できなければ落ちる', () => {
    const noCar = site({ car: { available: false, distance_km: 0, minutes: 0, parking_fee: 0 } });
    expect(disqualify(noCar, { hasCar: true })).toContain(DISQUALIFY_REASONS.noParking);
    expect(disqualify(noCar, { hasCar: false })).not.toContain(DISQUALIFY_REASONS.noParking);
  });

  it('ペット同伴なら pet 不可が落ちる', () => {
    expect(disqualify(site({ allows: { ...base.allows, pet: false } }), { pet: true })).toContain(DISQUALIFY_REASONS.noPet);
    expect(disqualify(site({ allows: { ...base.allows, pet: false } }), { pet: false })).not.toContain(DISQUALIFY_REASONS.noPet);
  });

  it('ソロなら solo 不可が落ちる', () => {
    expect(disqualify(site({ allows: { ...base.allows, solo: false } }), { party: 'solo' })).toContain(DISQUALIFY_REASONS.noSolo);
    expect(disqualify(site({ allows: { ...base.allows, solo: false } }), { party: 'family' })).not.toContain(DISQUALIFY_REASONS.noSolo);
  });

  it('直火希望なら ground 不可が落ちる', () => {
    expect(disqualify(site({ fire: { ...base.fire, ground: false } }), { fire: 'ground' })).toContain(DISQUALIFY_REASONS.noGroundFire);
    expect(disqualify(site({ fire: { ...base.fire, ground: false } }), { fire: 'stand' })).not.toContain(DISQUALIFY_REASONS.noGroundFire);
  });

  it('焚き火台希望なら stand 不可が落ちる', () => {
    const noFire = site({ fire: { stand: false, ground: false, wood_sold: false } });
    expect(disqualify(noFire, { fire: 'stand' })).toContain(DISQUALIFY_REASONS.noFire);
    expect(disqualify(noFire, { fire: 'none' })).not.toContain(DISQUALIFY_REASONS.noFire);
  });

  it('予算を超えたら落ちる（1人あたりに換算して比べる）', () => {
    const perSite = site({ price: { min: 12000, max: 12000, unit: 'per_site' } });
    expect(disqualify(perSite, { budget: 3000, headcount: 2 })).toContain(DISQUALIFY_REASONS.overBudget);
    expect(disqualify(perSite, { budget: 3000, headcount: 3 })).toContain(DISQUALIFY_REASONS.overBudget);
    expect(disqualify(perSite, { budget: 3000, headcount: 4 })).not.toContain(DISQUALIFY_REASONS.overBudget);
    expect(disqualify(perSite, { budget: 3000, headcount: 5 })).not.toContain(DISQUALIFY_REASONS.overBudget);
    expect(disqualify(site(), { budget: 2000 })).not.toContain(DISQUALIFY_REASONS.overBudget);
    expect(disqualify(site(), { budget: 1999 })).toContain(DISQUALIFY_REASONS.overBudget);
  });

  it('営業期間外の月は落ちる（年をまたぐ期間も扱う）', () => {
    const summer = site({ season: { open: '07-01', close: '09-30' } });
    expect(disqualify(summer, { month: 8 })).toEqual([]);
    expect(disqualify(summer, { month: 12 })).toContain(DISQUALIFY_REASONS.offSeason);
    expect(disqualify(summer, { month: 7 })).toEqual([]);
    expect(disqualify(summer, { month: 10 })).toContain(DISQUALIFY_REASONS.offSeason);

    const winterAcross = site({ season: { open: '11-01', close: '03-31' } });
    expect(disqualify(winterAcross, { month: 1 })).toEqual([]);
    expect(disqualify(winterAcross, { month: 12 })).toEqual([]);
    expect(disqualify(winterAcross, { month: 6 })).toContain(DISQUALIFY_REASONS.offSeason);

    expect(disqualify(site({ season: null }), { month: 1 })).toEqual([]);
  });

  it('手ぶら希望ならレンタル無しが落ちる', () => {
    const noRental = site({ facilities: { ...base.facilities, rental: false } });
    expect(disqualify(noRental, { tebura: true })).toContain(DISQUALIFY_REASONS.noRental);
    expect(disqualify(noRental, { tebura: false })).not.toContain(DISQUALIFY_REASONS.noRental);
  });

  it('複数該当なら理由が複数返る', () => {
    const bad = site({ transit: null, allows: { ...base.allows, pet: false } });
    const reasons = disqualify(bad, { hasCar: false, pet: true });
    expect(reasons).toHaveLength(2);
    expect(new Set(reasons).size).toBe(2);
  });
});

describe('filterSites', () => {
  it('通過したものだけ返す', () => {
    const sites = [site({ id: 'a' }), site({ id: 'b', transit: null })];
    expect(filterSites(sites, { hasCar: false }).map((s) => s.id)).toEqual(['a']);
  });

  it('実データで、車なし条件の結果に公共交通が無い場所が混ざらない', () => {
    for (const s of filterSites(CAMPSITES, { hasCar: false })) {
      expect(s.transit, s.name).not.toBeNull();
    }
  });

  it('実データで、休止中の場所は決して返らない', () => {
    for (const s of filterSites(CAMPSITES, {})) {
      expect(s.closed, s.name).toBeNull();
    }
  });

  it('実データに休止中が1件以上あり、それが確かに除かれている', () => {
    const closed = CAMPSITES.filter((s) => s.closed !== null);
    expect(closed.length).toBeGreaterThan(0);
    const ids = filterSites(CAMPSITES, {}).map((s) => s.id);
    for (const s of closed) expect(ids).not.toContain(s.id);
  });
});
