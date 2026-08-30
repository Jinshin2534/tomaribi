import { describe, it, expect } from 'vitest';
import { CAMPSITES, AREAS } from './campsites.js';

const MMDD = /^\d{2}-\d{2}$/;
const HHMM = /^\d{2}:\d{2}$/;

describe('キャンプ場データ', () => {
  it('1件以上ある', () => {
    expect(CAMPSITES.length).toBeGreaterThan(0);
  });

  it('id が一意', () => {
    const ids = CAMPSITES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id が kebab-case', () => {
    for (const s of CAMPSITES) {
      expect(s.id, s.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('必須キーが揃っている', () => {
    for (const s of CAMPSITES) {
      for (const key of [
        'id', 'name', 'area', 'city', 'lat', 'lon', 'elevation',
        'price', 'fire', 'facilities', 'allows', 'car', 'transit',
        'season', 'reservation', 'closed', 'verified', 'source', 'note',
      ]) {
        expect(s, `${s.name} に ${key} が無い`).toHaveProperty(key);
      }
    }
  });

  it('area が既定の一覧に含まれる', () => {
    for (const s of CAMPSITES) {
      expect(AREAS, s.name).toContain(s.area);
    }
  });

  it('緯度経度が東京都の範囲に収まる（島しょを含む）', () => {
    for (const s of CAMPSITES) {
      expect(s.lat, s.name).toBeGreaterThan(24);
      expect(s.lat, s.name).toBeLessThan(36);
      expect(s.lon, s.name).toBeGreaterThan(138);
      expect(s.lon, s.name).toBeLessThan(154);
    }
  });

  it('標高が 0 以上', () => {
    for (const s of CAMPSITES) {
      expect(s.elevation, s.name).toBeGreaterThanOrEqual(0);
    }
  });

  it('料金は min <= max で unit が既定の2種', () => {
    for (const s of CAMPSITES) {
      expect(s.price.min, s.name).toBeLessThanOrEqual(s.price.max);
      expect(s.price.min, s.name).toBeGreaterThanOrEqual(0);
      expect(['per_person', 'per_site'], s.name).toContain(s.price.unit);
    }
  });

  it('真偽値であるべき欄がすべて真偽値', () => {
    for (const s of CAMPSITES) {
      for (const k of ['stand', 'ground', 'wood_sold']) expect(typeof s.fire[k], `${s.name}.fire.${k}`).toBe('boolean');
      for (const k of ['toilet', 'shower', 'rental', 'shop', 'power']) expect(typeof s.facilities[k], `${s.name}.facilities.${k}`).toBe('boolean');
      for (const k of ['solo', 'pet', 'family', 'group']) expect(typeof s.allows[k], `${s.name}.allows.${k}`).toBe('boolean');
      expect(typeof s.car.available, s.name).toBe('boolean');
      expect(typeof s.reservation.required, s.name).toBe('boolean');
      expect(typeof s.verified, s.name).toBe('boolean');
    }
  });

  it('直火可なら焚き火台も可（直火だけ可はデータの取り違え）', () => {
    for (const s of CAMPSITES) {
      if (s.fire.ground) expect(s.fire.stand, s.name).toBe(true);
    }
  });

  it('transit が非 null なら legs が1つ以上・所要が正・最終到着が HH:MM', () => {
    for (const s of CAMPSITES) {
      if (s.transit === null) continue;
      expect(s.transit.legs.length, s.name).toBeGreaterThan(0);
      expect(s.transit.minutes, s.name).toBeGreaterThan(0);
      expect(s.transit.last_arrival, s.name).toMatch(HHMM);
      expect(s.transit.from, s.name).toBeTruthy();
    }
  });

  it('車で行けるなら所要と距離が正', () => {
    for (const s of CAMPSITES) {
      if (!s.car.available) continue;
      expect(s.car.minutes, s.name).toBeGreaterThan(0);
      expect(s.car.distance_km, s.name).toBeGreaterThan(0);
      expect(s.car.parking_fee, s.name).toBeGreaterThanOrEqual(0);
    }
  });

  it('車でも公共交通でも行けない場所は無い', () => {
    for (const s of CAMPSITES) {
      expect(s.car.available || s.transit !== null, `${s.name} はどうやっても行けない`).toBe(true);
    }
  });

  it('season は null か MM-DD の組', () => {
    for (const s of CAMPSITES) {
      if (s.season === null) continue;
      expect(s.season.open, s.name).toMatch(MMDD);
      expect(s.season.close, s.name).toMatch(MMDD);
    }
  });

  it('裏取り済みなら source が http で始まる', () => {
    for (const s of CAMPSITES) {
      if (!s.verified) continue;
      expect(s.source, s.name).toMatch(/^https?:\/\//);
    }
  });

  it('予約必須なら予約先の URL がある', () => {
    for (const s of CAMPSITES) {
      if (!s.reservation.required) continue;
      expect(s.reservation.url, s.name).toMatch(/^https?:\/\//);
    }
  });

  it('closed は null か理由の文字列（空文字を許さない）', () => {
    for (const s of CAMPSITES) {
      if (s.closed === null) continue;
      expect(typeof s.closed, s.name).toBe('string');
      expect(s.closed.length, s.name).toBeGreaterThan(0);
    }
  });

  it('note が空でない', () => {
    for (const s of CAMPSITES) {
      expect(s.note.length, s.name).toBeGreaterThan(0);
    }
  });
});
