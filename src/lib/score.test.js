import { describe, it, expect } from 'vitest';
import { scoreSite, rankSites, weightsFor, AXES } from './score.js';
import { CAMPSITES } from './data/campsites.js';
import { filterSites } from './filter.js';

const CRITERIA_SAMPLES = [
  {},
  { hasCar: true, party: 'family', month: 8 },
  { hasCar: false, party: 'solo', fire: 'ground', month: 5 },
  { hasCar: false, party: 'couple', tebura: true, month: 11 },
  { hasCar: true, party: 'solo', fire: 'stand', budget: 3000, headcount: 1, month: 1 },
  { hasCar: true, party: 'family', tebura: true, departHour: 15, month: 7 },
];

describe('weightsFor', () => {
  it('全軸に重みがある', () => {
    for (const c of CRITERIA_SAMPLES) {
      const w = weightsFor(c);
      for (const axis of AXES) expect(w, JSON.stringify(c)).toHaveProperty(axis);
    }
  });
  it('重みはすべて正', () => {
    for (const c of CRITERIA_SAMPLES) {
      for (const axis of AXES) expect(weightsFor(c)[axis], axis).toBeGreaterThan(0);
    }
  });
  it('車なしのほうがアクセスの重みが大きい', () => {
    expect(weightsFor({ hasCar: false }).access).toBeGreaterThan(weightsFor({ hasCar: true }).access);
  });
  it('ソロのほうが静けさの重みが大きい', () => {
    expect(weightsFor({ party: 'solo' }).quiet).toBeGreaterThan(weightsFor({ party: 'family' }).quiet);
  });
  it('家族のほうが設備の重みが大きい', () => {
    expect(weightsFor({ party: 'family' }).facility).toBeGreaterThan(weightsFor({ party: 'solo' }).facility);
  });
  it('予算を指定すると価格の重みが大きい', () => {
    expect(weightsFor({ budget: 2000 }).price).toBeGreaterThan(weightsFor({}).price);
  });
});

describe('scoreSite', () => {
  it('全キャンプ場×全条件で、素点が 0..1 に収まる', () => {
    for (const c of CRITERIA_SAMPLES) {
      for (const s of CAMPSITES) {
        for (const co of scoreSite(s, c).contributions) {
          expect(co.raw, `${s.name}/${co.axis}`).toBeGreaterThanOrEqual(0);
          expect(co.raw, `${s.name}/${co.axis}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('寄与に全軸がちょうど1回ずつ現れる', () => {
    for (const s of CAMPSITES) {
      const axes = scoreSite(s, {}).contributions.map((c) => c.axis);
      expect([...axes].sort()).toEqual([...AXES].sort());
    }
  });

  it('total が寄与の points の和と一致する', () => {
    for (const c of CRITERIA_SAMPLES) {
      for (const s of CAMPSITES) {
        const { total, contributions } = scoreSite(s, c);
        const sum = contributions.reduce((a, co) => a + co.points, 0);
        expect(total, s.name).toBeCloseTo(sum, 9);
      }
    }
  });

  it('寄与に人間向けのラベルが付いている', () => {
    for (const co of scoreSite(CAMPSITES[0], {}).contributions) {
      expect(typeof co.label).toBe('string');
      expect(co.label.length).toBeGreaterThan(0);
    }
  });

  it('直火が使える場所は、焚き火希望のとき焚き火軸の素点が高い', () => {
    const ground = CAMPSITES.find((s) => s.fire.ground);
    const noFire = CAMPSITES.find((s) => !s.fire.stand);
    const axisOf = (s, c) => scoreSite(s, c).contributions.find((x) => x.axis === 'fire').raw;
    expect(axisOf(ground, { fire: 'ground' })).toBeGreaterThan(axisOf(noFire, { fire: 'ground' }));
  });

  it('同じ場所でも、車の有無でアクセス軸の素点が変わりうる', () => {
    const s = CAMPSITES.find((x) => x.transit && x.transit.minutes > x.car.minutes);
    const raw = (hasCar) => scoreSite(s, { hasCar }).contributions.find((x) => x.axis === 'access').raw;
    expect(raw(true)).not.toBe(raw(false));
  });

  it('決定論：同じ入力なら同じ結果', () => {
    const a = scoreSite(CAMPSITES[0], CRITERIA_SAMPLES[2]);
    const b = scoreSite(CAMPSITES[0], CRITERIA_SAMPLES[2]);
    expect(a).toEqual(b);
  });
});

describe('rankSites', () => {
  it('スコアの降順に並ぶ', () => {
    const ranked = rankSites(CAMPSITES, {});
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].total).toBeGreaterThanOrEqual(ranked[i].total);
    }
  });

  it('順位が 1 から連番で付く', () => {
    const ranked = rankSites(CAMPSITES, {});
    expect(ranked.map((r) => r.rank)).toEqual(ranked.map((_, i) => i + 1));
  });

  it('落ちうる側：全員が同点になる条件が無い', () => {
    for (const c of CRITERIA_SAMPLES) {
      const totals = rankSites(filterSites(CAMPSITES, c), c).map((r) => r.total);
      if (totals.length < 2) continue;
      expect(new Set(totals.map((t) => t.toFixed(6))).size, JSON.stringify(c)).toBeGreaterThan(1);
    }
  });

  it('落ちうる側：どの条件でもスコアの幅が 0.05 以上ある（並べる意味がある）', () => {
    for (const c of CRITERIA_SAMPLES) {
      const totals = rankSites(filterSites(CAMPSITES, c), c).map((r) => r.total);
      if (totals.length < 3) continue;
      expect(Math.max(...totals) - Math.min(...totals), JSON.stringify(c)).toBeGreaterThan(0.05);
    }
  });
});
