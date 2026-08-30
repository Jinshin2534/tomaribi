// OpenStreetMap から拾ったキャンプ場を、地図に重ねられる形に正規化する。
// OSM 側は焚き火可否も料金も空欄だらけなので、これらは提案順位には混ぜず
// 「未確認ピン」として地図に置くだけにする。重複除去はそのための下ごしらえ。

const DUP_METERS = 400;

/** 東京都（島しょを含む）の camp_site を引く Overpass QL。 */
export function buildQuery() {
  return `[out:json][timeout:25];
area["name"="東京都"]["admin_level"="4"]->.tokyo;
(
  node["tourism"="camp_site"](area.tokyo);
  way["tourism"="camp_site"](area.tokyo);
  relation["tourism"="camp_site"](area.tokyo);
);
out center tags;`;
}

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

const SUFFIXES = ['オートキャンプ場', 'キャンプ場', 'キャンプ村', 'キャンプ', 'campsite', 'camp site', 'camp'];

/** 名前を比較できる形に落とす。空白・記号・括弧書き・「キャンプ場」等の接尾辞を除く。 */
export function normalizeName(name) {
  if (!name) return '';
  let s = String(name)
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[\s　]/g, '')
    .replace(/[・･,、。.]/g, '')
    .toLowerCase();
  for (const suf of SUFFIXES) {
    const t = suf.toLowerCase().replace(/\s/g, '');
    if (s.endsWith(t)) { s = s.slice(0, -t.length); break; }
  }
  return s;
}

export function normalizeElements(elements) {
  if (!Array.isArray(elements)) return [];
  const out = [];
  const seen = new Set();

  for (const el of elements) {
    const name = el?.tags?.name;
    if (!name) continue;
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;

    const key = `${normalizeName(name)}@${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: `osm-${el.type}-${el.id}`,
      name,
      lat,
      lon,
      website: el.tags.website ?? el.tags['contact:website'] ?? null,
      verified: false,
      source: 'OpenStreetMap',
    });
  }
  return out;
}

/** 収録済みと重なるものを落として、本当に新しいものだけ返す。 */
export function mergeWithKnown(osmSites, knownSites) {
  if (!Array.isArray(osmSites)) return [];
  const known = Array.isArray(knownSites) ? knownSites : [];
  const knownNames = new Set(known.map((s) => normalizeName(s.name)).filter(Boolean));

  return osmSites.filter((o) => {
    if (knownNames.has(normalizeName(o.name))) return false;
    return !known.some((k) => haversineMeters(o.lat, o.lon, k.lat, k.lon) < DUP_METERS);
  });
}
