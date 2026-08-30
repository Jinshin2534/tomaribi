// 表示のための整形。判定には使わない。

export function formatYen(yen) {
  if (yen === 0) return '無料';
  return `${yen.toLocaleString('ja-JP')}円`;
}

const UNIT_LABEL = { per_person: '1人', per_site: '1サイト' };

export function formatPrice(price) {
  const unit = UNIT_LABEL[price.unit] ?? '';
  if (price.min === price.max) return `${unit} ${formatYen(price.min)}`.trim();
  return `${unit} ${price.min.toLocaleString('ja-JP')}〜${formatYen(price.max)}`.trim();
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}時間` : `${h}時間${m}分`;
}

export function formatDistance(km) {
  return `${km}km`;
}

export function formatSeason(season) {
  if (season === null || season === undefined) return '通年';
  return `${mmdd(season.open)}〜${mmdd(season.close)}`;
}

function mmdd(s) {
  const [mm, dd] = s.split('-');
  return `${Number(mm)}月${Number(dd)}日`;
}
