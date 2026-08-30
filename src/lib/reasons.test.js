import { describe, it, expect } from 'vitest';
import { reasonsFor, TEMPLATES } from './reasons.js';
import { AXES, scoreSite } from './score.js';
import { CAMPSITES } from './data/campsites.js';

const contrib = (axis, raw, weight = 1) => ({ axis, label: axis, raw, weight, points: raw * weight });

describe('テンプレの網羅', () => {
  it('全軸に加点テンプレと減点テンプレがある', () => {
    for (const axis of AXES) {
      expect(TEMPLATES, axis).toHaveProperty(axis);
      expect(typeof TEMPLATES[axis].plus, axis).toBe('function');
      expect(typeof TEMPLATES[axis].minus, axis).toBe('function');
    }
  });
  it('テンプレのキーが軸の集合とちょうど一致する（余りも欠けも無い）', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual([...AXES].sort());
  });
});

describe('季節の理由文は月で言い分けを変える', () => {
  const low = [contrib('season', 0.1)];
  const high = [contrib('season', 0.95)];
  it('夏の減点は「暑い」側を言う', () => {
    expect(reasonsFor(low, { month: 8 }).minus[0]).toContain('暑く');
  });
  it('冬の減点は「冷える」側を言う', () => {
    expect(reasonsFor(low, { month: 1 }).minus[0]).toContain('冷え込み');
  });
  it('夏の加点は「涼しい」側を言う', () => {
    expect(reasonsFor(high, { month: 7 }).plus[0]).toContain('涼しい');
  });
  it('月が無くても文になる', () => {
    expect(reasonsFor(low, {}).minus[0].length).toBeGreaterThan(0);
    expect(reasonsFor(high, {}).plus[0].length).toBeGreaterThan(0);
  });
});

describe('reasonsFor', () => {
  it('加点は最大3件に切る', () => {
    const cs = AXES.map((a) => contrib(a, 0.9));
    expect(reasonsFor(cs, {}).plus).toHaveLength(3);
  });

  it('減点は最大2件に切る', () => {
    const cs = AXES.map((a) => contrib(a, 0.05));
    expect(reasonsFor(cs, {}).minus).toHaveLength(2);
  });

  it('高い素点だけなら減点は空', () => {
    const cs = AXES.map((a) => contrib(a, 0.9));
    expect(reasonsFor(cs, {}).minus).toEqual([]);
  });

  it('低い素点だけなら加点は空', () => {
    const cs = AXES.map((a) => contrib(a, 0.05));
    expect(reasonsFor(cs, {}).plus).toEqual([]);
  });

  it('重みの大きい軸が先に出る', () => {
    const cs = [contrib('fire', 0.9, 0.5), contrib('access', 0.9, 1.6)];
    expect(reasonsFor(cs, {}).plus[0]).toBe(TEMPLATES.access.plus({}));
  });

  it('決定論：同じ入力で同じ文', () => {
    const cs = AXES.map((a, i) => contrib(a, 0.2 + i * 0.15));
    expect(reasonsFor(cs, {})).toEqual(reasonsFor(cs, {}));
  });

  it('文が空でなく、重複しない', () => {
    for (const s of CAMPSITES) {
      const { plus, minus } = reasonsFor(scoreSite(s, { hasCar: false }).contributions, { hasCar: false });
      for (const t of [...plus, ...minus]) expect(t.length, s.name).toBeGreaterThan(0);
      expect(new Set([...plus, ...minus]).size, s.name).toBe(plus.length + minus.length);
    }
  });

  it('落ちうる側：実データの全件で、理由が1つも出ない場所が無い', () => {
    for (const s of CAMPSITES) {
      const { plus, minus } = reasonsFor(scoreSite(s, {}).contributions, {});
      expect(plus.length + minus.length, `${s.name} に理由が無い`).toBeGreaterThan(0);
    }
  });
});
