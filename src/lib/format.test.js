import { describe, it, expect } from 'vitest';
import { formatPrice, formatMinutes, formatDistance, formatSeason, formatYen } from './format.js';

describe('formatYen', () => {
  it('3桁ごとに区切って円を付ける', () => {
    expect(formatYen(0)).toBe('無料');
    expect(formatYen(600)).toBe('600円');
    expect(formatYen(1200)).toBe('1,200円');
    expect(formatYen(30000)).toBe('30,000円');
  });
});

describe('formatPrice', () => {
  it('min と max が同じなら1つの額', () => {
    expect(formatPrice({ min: 2000, max: 2000, unit: 'per_person' })).toBe('1人 2,000円');
  });
  it('幅があるなら範囲で出す', () => {
    expect(formatPrice({ min: 4000, max: 6000, unit: 'per_site' })).toBe('1サイト 4,000〜6,000円');
  });
  it('単位で言い回しが変わる', () => {
    expect(formatPrice({ min: 600, max: 900, unit: 'per_person' })).toBe('1人 600〜900円');
  });
});

describe('formatMinutes', () => {
  it('60分未満は分だけ', () => {
    expect(formatMinutes(0)).toBe('0分');
    expect(formatMinutes(35)).toBe('35分');
    expect(formatMinutes(59)).toBe('59分');
  });
  it('ちょうど60分は「1時間」', () => {
    expect(formatMinutes(60)).toBe('1時間');
  });
  it('端数があれば時間と分', () => {
    expect(formatMinutes(105)).toBe('1時間45分');
    expect(formatMinutes(125)).toBe('2時間5分');
  });
  it('null は未定を表す', () => {
    expect(formatMinutes(null)).toBe('—');
  });
});

describe('formatDistance', () => {
  it('km を付ける', () => {
    expect(formatDistance(62)).toBe('62km');
    expect(formatDistance(0)).toBe('0km');
  });
});

describe('formatSeason', () => {
  it('null は通年', () => {
    expect(formatSeason(null)).toBe('通年');
  });
  it('MM-DD を日本語にする', () => {
    expect(formatSeason({ open: '04-01', close: '11-30' })).toBe('4月1日〜11月30日');
    expect(formatSeason({ open: '07-01', close: '09-30' })).toBe('7月1日〜9月30日');
  });
});
