import { describe, it, expect } from 'vitest';
import { reachableWithoutCar, accessBand, arrivalMargin, travelMinutes } from './access.js';

const withTransit = (minutes, last = '17:00') => ({
  car: { available: true, minutes: 90, distance_km: 60, parking_fee: 0 },
  transit: { from: '新宿', minutes, legs: ['a'], last_arrival: last },
});
const carOnly = (minutes) => ({
  car: { available: true, minutes, distance_km: 60, parking_fee: 0 },
  transit: null,
});

describe('reachableWithoutCar', () => {
  it('transit が null なら車なしでは行けない', () => {
    expect(reachableWithoutCar(carOnly(95))).toBe(false);
  });
  it('transit があれば行ける', () => {
    expect(reachableWithoutCar(withTransit(105))).toBe(true);
  });
});

describe('travelMinutes', () => {
  it('車ありなら車の所要', () => {
    expect(travelMinutes(withTransit(105), { hasCar: true })).toBe(90);
  });
  it('車なしなら公共交通の所要', () => {
    expect(travelMinutes(withTransit(105), { hasCar: false })).toBe(105);
  });
  it('車なしで公共交通が無ければ null', () => {
    expect(travelMinutes(carOnly(95), { hasCar: false })).toBe(null);
  });
});

describe('accessBand', () => {
  it('車: 60分ちょうどまでが near、120分ちょうどまでが mid', () => {
    expect(accessBand(carOnly(59), { hasCar: true })).toBe('near');
    expect(accessBand(carOnly(60), { hasCar: true })).toBe('near');
    expect(accessBand(carOnly(61), { hasCar: true })).toBe('mid');
    expect(accessBand(carOnly(120), { hasCar: true })).toBe('mid');
    expect(accessBand(carOnly(121), { hasCar: true })).toBe('far');
  });
  it('公共交通: 90分ちょうどまでが near、150分ちょうどまでが mid', () => {
    expect(accessBand(withTransit(90), { hasCar: false })).toBe('near');
    expect(accessBand(withTransit(91), { hasCar: false })).toBe('mid');
    expect(accessBand(withTransit(150), { hasCar: false })).toBe('mid');
    expect(accessBand(withTransit(151), { hasCar: false })).toBe('far');
  });
  it('島しょのような長時間は far', () => {
    expect(accessBand(withTransit(420), { hasCar: false })).toBe('far');
  });
  it('車なしで到達できないなら null', () => {
    expect(accessBand(carOnly(95), { hasCar: false })).toBe(null);
  });
});

describe('arrivalMargin', () => {
  it('9時発・所要105分なら 17:00 まで 6時間15分の余裕', () => {
    expect(arrivalMargin(withTransit(105, '17:00'), { hasCar: false, departHour: 9 })).toBe(375);
  });
  it('遅い出発では余裕が負になる', () => {
    expect(arrivalMargin(withTransit(105, '16:00'), { hasCar: false, departHour: 15 })).toBe(-45);
  });
  it('ちょうど間に合うと 0', () => {
    expect(arrivalMargin(withTransit(120, '17:00'), { hasCar: false, departHour: 15 })).toBe(0);
  });
  it('車ありは車の所要で測る', () => {
    expect(arrivalMargin(withTransit(105, '17:00'), { hasCar: true, departHour: 12 })).toBe(210);
  });
  it('車なしで到達できないなら null', () => {
    expect(arrivalMargin(carOnly(95), { hasCar: false, departHour: 9 })).toBe(null);
  });
});
