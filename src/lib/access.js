// アクセスの判定。距離ではなく「行けるか」「間に合うか」を答える。

const BANDS = {
  car: { near: 60, mid: 120 },
  transit: { near: 90, mid: 150 },
};

export function reachableWithoutCar(site) {
  return site.transit !== null && site.transit !== undefined;
}

/** その手段での所要分。車なしで公共交通が無ければ null。 */
export function travelMinutes(site, { hasCar }) {
  if (hasCar) return site.car.available ? site.car.minutes : null;
  return reachableWithoutCar(site) ? site.transit.minutes : null;
}

export function accessBand(site, { hasCar }) {
  const minutes = travelMinutes(site, { hasCar });
  if (minutes === null) return null;
  const b = hasCar ? BANDS.car : BANDS.transit;
  if (minutes <= b.near) return 'near';
  if (minutes <= b.mid) return 'mid';
  return 'far';
}

/**
 * 出発時刻から出て、現地の最終到着時刻まで何分の余裕があるか。
 * 負なら間に合わない。到達手段が無ければ null。
 */
export function arrivalMargin(site, { hasCar, departHour }) {
  const minutes = travelMinutes(site, { hasCar });
  if (minutes === null) return null;
  const last = site.transit ? site.transit.last_arrival : '17:00';
  return toMinutes(last) - (departHour * 60 + minutes);
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
