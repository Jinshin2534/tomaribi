// ハード制約。ここで落ちたものはスコアで拾い直さない。
// 「行けない・泊まれない・条件を満たさない」場所を提案順位に混ぜないことが役目。

export const DISQUALIFY_REASONS = {
  closed: '現在休止中',
  noTransit: '車なしでは行けない',
  noParking: '車で入れない',
  noPet: 'ペット不可',
  noSolo: 'ソロ不可',
  noGroundFire: '直火できない',
  noFire: '焚き火できない',
  overBudget: '予算オーバー',
  offSeason: '営業期間外',
  noRental: 'レンタルなし',
};

/** 1人あたりに換算した最低料金。per_site は人数で割る。 */
export function minPricePerPerson(site, headcount = 1) {
  if (site.price.unit === 'per_site') {
    return Math.ceil(site.price.min / Math.max(1, headcount));
  }
  return site.price.min;
}

/** 月が営業期間に入っているか。open > close の期間は年をまたぐものとして扱う。 */
export function inSeason(season, month) {
  if (!season) return true;
  const open = Number(season.open.slice(0, 2));
  const close = Number(season.close.slice(0, 2));
  if (open <= close) return month >= open && month <= close;
  return month >= open || month <= close;
}

/** 失格理由の配列を返す。空配列なら通過。 */
export function disqualify(site, criteria) {
  const r = [];
  const c = criteria ?? {};

  if (site.closed) r.push(DISQUALIFY_REASONS.closed);
  if (c.hasCar === false && site.transit === null) r.push(DISQUALIFY_REASONS.noTransit);
  if (c.hasCar === true && !site.car.available) r.push(DISQUALIFY_REASONS.noParking);
  if (c.pet === true && !site.allows.pet) r.push(DISQUALIFY_REASONS.noPet);
  if (c.party === 'solo' && !site.allows.solo) r.push(DISQUALIFY_REASONS.noSolo);
  if (c.fire === 'ground' && !site.fire.ground) r.push(DISQUALIFY_REASONS.noGroundFire);
  if ((c.fire === 'stand' || c.fire === 'ground') && !site.fire.stand) r.push(DISQUALIFY_REASONS.noFire);
  if (typeof c.budget === 'number' && minPricePerPerson(site, c.headcount) > c.budget) {
    r.push(DISQUALIFY_REASONS.overBudget);
  }
  if (typeof c.month === 'number' && !inSeason(site.season, c.month)) r.push(DISQUALIFY_REASONS.offSeason);
  if (c.tebura === true && !site.facilities.rental) r.push(DISQUALIFY_REASONS.noRental);

  return r;
}

export function filterSites(sites, criteria) {
  return sites.filter((s) => disqualify(s, criteria).length === 0);
}
