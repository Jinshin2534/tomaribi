import { describe, it, expect } from 'vitest';
import { normalizeElements, mergeWithKnown, haversineMeters, normalizeName, buildQuery } from './overpass.js';

const known = [{ id: 'hikawa', name: '氷川キャンプ場', lat: 35.809, lon: 139.0958 }];

describe('haversineMeters', () => {
  it('同じ点は 0m', () => {
    expect(haversineMeters(35.8, 139.1, 35.8, 139.1)).toBe(0);
  });
  it('緯度 0.001 度はおよそ 111m', () => {
    expect(haversineMeters(35.8, 139.1, 35.801, 139.1)).toBeGreaterThan(105);
    expect(haversineMeters(35.8, 139.1, 35.801, 139.1)).toBeLessThan(118);
  });
  it('東京駅から奥多摩駅はおよそ 55km', () => {
    const m = haversineMeters(35.6812, 139.7671, 35.8095, 139.0966);
    expect(m).toBeGreaterThan(50000);
    expect(m).toBeLessThan(70000);
  });
});

describe('normalizeName', () => {
  it('空白・記号・接尾辞を落として比べられる形にする', () => {
    expect(normalizeName('氷川キャンプ場')).toBe('氷川');
    expect(normalizeName('氷川キャンプ場 ')).toBe('氷川');
    expect(normalizeName('氷川キャンプ場（奥多摩町）')).toBe('氷川');
    expect(normalizeName('氷川　キャンプ場')).toBe('氷川');
    expect(normalizeName('氷川オートキャンプ場')).toBe('氷川');
  });
  it('空文字や未定義でも落ちない', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });
});

describe('normalizeElements', () => {
  it('node は lat/lon をそのまま使う', () => {
    const out = normalizeElements([{ type: 'node', id: 1, lat: 35.7, lon: 139.2, tags: { name: 'あるキャンプ場' } }]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'osm-node-1', name: 'あるキャンプ場', lat: 35.7, lon: 139.2, verified: false, source: 'OpenStreetMap' });
  });

  it('way / relation は center を使う', () => {
    const out = normalizeElements([
      { type: 'way', id: 2, center: { lat: 35.71, lon: 139.21 }, tags: { name: 'W' } },
      { type: 'relation', id: 3, center: { lat: 35.72, lon: 139.22 }, tags: { name: 'R' } },
    ]);
    expect(out.map((o) => o.id)).toEqual(['osm-way-2', 'osm-relation-3']);
    expect(out[0].lat).toBe(35.71);
  });

  it('名前が無いものは落とす', () => {
    expect(normalizeElements([{ type: 'node', id: 4, lat: 35.7, lon: 139.2, tags: {} }])).toEqual([]);
    expect(normalizeElements([{ type: 'node', id: 5, lat: 35.7, lon: 139.2 }])).toEqual([]);
  });

  it('座標が無いものは落とす', () => {
    expect(normalizeElements([{ type: 'way', id: 6, tags: { name: 'X' } }])).toEqual([]);
  });

  it('null や空でも落ちない', () => {
    expect(normalizeElements(null)).toEqual([]);
    expect(normalizeElements([])).toEqual([]);
  });

  it('同じ座標の重複要素は1つにまとめる', () => {
    const out = normalizeElements([
      { type: 'node', id: 7, lat: 35.7, lon: 139.2, tags: { name: '同じ場所' } },
      { type: 'way', id: 8, center: { lat: 35.7, lon: 139.2 }, tags: { name: '同じ場所' } },
    ]);
    expect(out).toHaveLength(1);
  });
});

describe('mergeWithKnown', () => {
  const osm = (name, lat, lon) => ({ id: `osm-node-${name}`, name, lat, lon, verified: false, source: 'OpenStreetMap' });

  it('収録済みから 401m 離れていれば残る', () => {
    // 緯度 0.0036 度 ≈ 400m
    const far = osm('別のキャンプ場', 35.809 + 0.0037, 139.0958);
    expect(mergeWithKnown([far], known)).toHaveLength(1);
  });

  it('収録済みから 399m 以内なら落ちる', () => {
    const near = osm('別のキャンプ場', 35.809 + 0.0035, 139.0958);
    expect(mergeWithKnown([near], known)).toEqual([]);
  });

  it('離れていても名前が一致すれば落ちる', () => {
    expect(mergeWithKnown([osm('氷川キャンプ場', 35.9, 139.5)], known)).toEqual([]);
    expect(mergeWithKnown([osm('氷川オートキャンプ場', 35.9, 139.5)], known)).toEqual([]);
  });

  it('収録済みが空なら全部残る', () => {
    expect(mergeWithKnown([osm('A', 35.7, 139.2), osm('B', 35.8, 139.3)], [])).toHaveLength(2);
  });

  it('null でも落ちない', () => {
    expect(mergeWithKnown(null, known)).toEqual([]);
    expect(mergeWithKnown([osm('A', 35.7, 139.2)], null)).toHaveLength(1);
  });
});

describe('buildQuery', () => {
  it('東京都を対象に camp_site を引くクエリを作る', () => {
    const q = buildQuery();
    expect(q).toContain('tourism');
    expect(q).toContain('camp_site');
    expect(q).toContain('out:json');
    expect(q).toContain('center');
  });
});
