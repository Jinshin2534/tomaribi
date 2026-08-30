import { describe, it, expect } from 'vitest';
import { nightVerdict, sleepingBagComfort, summarizeWeek, VERDICT_LABEL } from './weather.js';

const day = (over) => ({ date: '2026-09-05', minTemp: 12, precipProb: 10, windMax: 3, ...over });

describe('nightVerdict', () => {
  it('穏やかな夜は good', () => {
    expect(nightVerdict(day())).toBe('good');
  });

  it('最低気温の境界：5℃ちょうどは good、4.9℃は ok、0℃ちょうどは ok、-0.1℃は tough', () => {
    expect(nightVerdict(day({ minTemp: 5 }))).toBe('good');
    expect(nightVerdict(day({ minTemp: 4.9 }))).toBe('ok');
    expect(nightVerdict(day({ minTemp: 0 }))).toBe('ok');
    expect(nightVerdict(day({ minTemp: -0.1 }))).toBe('tough');
  });

  it('最低気温の境界：-5℃ちょうどは tough、-5.1℃は no', () => {
    expect(nightVerdict(day({ minTemp: -5 }))).toBe('tough');
    expect(nightVerdict(day({ minTemp: -5.1 }))).toBe('no');
  });

  it('降水確率の境界：39%は good、40%は tough、69%は tough、70%は no', () => {
    expect(nightVerdict(day({ precipProb: 39 }))).toBe('good');
    expect(nightVerdict(day({ precipProb: 40 }))).toBe('tough');
    expect(nightVerdict(day({ precipProb: 69 }))).toBe('tough');
    expect(nightVerdict(day({ precipProb: 70 }))).toBe('no');
  });

  it('風速の境界：6.9は good、7は tough、9.9は tough、10は no', () => {
    expect(nightVerdict(day({ windMax: 6.9 }))).toBe('good');
    expect(nightVerdict(day({ windMax: 7 }))).toBe('tough');
    expect(nightVerdict(day({ windMax: 9.9 }))).toBe('tough');
    expect(nightVerdict(day({ windMax: 10 }))).toBe('no');
  });

  it('条件が重なったら厳しい側が勝つ', () => {
    expect(nightVerdict(day({ minTemp: 20, precipProb: 80, windMax: 1 }))).toBe('no');
    expect(nightVerdict(day({ minTemp: -10, precipProb: 0, windMax: 0 }))).toBe('no');
    expect(nightVerdict(day({ minTemp: 3, precipProb: 50 }))).toBe('tough');
  });

  it('欠損を握りつぶさず unknown を返す', () => {
    expect(nightVerdict(day({ minTemp: null }))).toBe('unknown');
    expect(nightVerdict(day({ precipProb: undefined }))).toBe('unknown');
    expect(nightVerdict(day({ windMax: null }))).toBe('unknown');
    expect(nightVerdict(null)).toBe('unknown');
  });

  it('全ての判定に日本語ラベルがある', () => {
    for (const v of ['good', 'ok', 'tough', 'no', 'unknown']) {
      expect(VERDICT_LABEL[v]).toBeTruthy();
    }
  });
});

describe('sleepingBagComfort', () => {
  it('予報最低気温より 5℃ 低い寝袋を勧める', () => {
    expect(sleepingBagComfort(10)).toBe(5);
    expect(sleepingBagComfort(0)).toBe(-5);
    expect(sleepingBagComfort(-3)).toBe(-8);
  });
  it('欠損なら null', () => {
    expect(sleepingBagComfort(null)).toBe(null);
    expect(sleepingBagComfort(undefined)).toBe(null);
  });
});

describe('summarizeWeek', () => {
  const daily = {
    time: ['2026-09-05', '2026-09-06', '2026-09-07'],
    temperature_2m_min: [12, 2, -8],
    precipitation_probability_max: [10, 80, 0],
    wind_speed_10m_max: [3, 4, 2],
  };

  it('Open-Meteo の配列の束を日ごとに割る', () => {
    const week = summarizeWeek(daily);
    expect(week).toHaveLength(3);
    expect(week[0]).toMatchObject({ date: '2026-09-05', minTemp: 12, verdict: 'good' });
    expect(week[1]).toMatchObject({ date: '2026-09-06', verdict: 'no' });
    expect(week[2]).toMatchObject({ date: '2026-09-07', verdict: 'no' });
  });

  it('寝袋の目安が日ごとに付く', () => {
    expect(summarizeWeek(daily)[0].sleepingBag).toBe(7);
  });

  it('欠損した日は unknown になり、他の日は壊れない', () => {
    const week = summarizeWeek({ ...daily, temperature_2m_min: [12, null, -8] });
    expect(week[1].verdict).toBe('unknown');
    expect(week[0].verdict).toBe('good');
  });

  it('null や空でも落ちず空配列を返す', () => {
    expect(summarizeWeek(null)).toEqual([]);
    expect(summarizeWeek({})).toEqual([]);
    expect(summarizeWeek({ time: [] })).toEqual([]);
  });

  it('配列の長さが食い違っても time の長さに合わせる', () => {
    const week = summarizeWeek({ ...daily, wind_speed_10m_max: [3] });
    expect(week).toHaveLength(3);
    expect(week[1].verdict).toBe('unknown');
  });
});
