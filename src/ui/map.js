// Leaflet の地図。絞り込みの結果とピンを同期させる。
// CDN から ESM で読むのでベア指定子は解決済みのURLを使う。

const CSS_URL = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
const JS_URL = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm';

let L = null;
let map = null;
let layer = null;
let lastKey = null;
let lastPoints = [];
let userMoved = false;

const FIT_OPTS = { padding: [28, 28], maxZoom: 11 };

function color(kind) {
  return { top: '#e8703a', normal: '#7ba05b', osm: '#8a8078' }[kind];
}

function marker(site, kind, onPick) {
  const m = L.circleMarker([site.lat, site.lon], {
    radius: kind === 'top' ? 8 : 6,
    color: color(kind),
    weight: 2,
    fillColor: color(kind),
    fillOpacity: kind === 'osm' ? 0.25 : 0.65,
  });
  const label = kind === 'osm' ? `${site.name}<br><small>OSM・未確認</small>` : site.name;
  m.bindTooltip(label, { direction: 'top' });
  if (kind !== 'osm') m.on('click', () => onPick(site.id));
  return m;
}

export async function initMap(el) {
  if (map) return map;
  if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_URL;
    document.head.appendChild(link);
  }
  L = (await import(/* @vite-ignore */ JS_URL)).default;
  map = L.map(el, { zoomControl: true }).setView([35.55, 139.3], 8);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);
  layer = L.layerGroup().addTo(map);

  // 親の高さが後から決まる配置なので、描画後にサイズを取り直す。
  // このとき表示範囲も合わせ直さないと、小さいまま計算した範囲が残って
  // ピンが画面の外に行ってしまう。ただし利用者が動かしたあとは奪わない。
  map.on('dragstart', () => { userMoved = true; });
  const resize = () => {
    map.invalidateSize();
    if (!userMoved && lastPoints.length > 0) map.fitBounds(lastPoints, FIT_OPTS);
  };
  for (const ms of [0, 150, 500, 1200]) setTimeout(resize, ms);
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver === 'function') new ResizeObserver(resize).observe(el);

  return map;
}

/**
 * ranked は絞り込み済みの並び。osm は未確認ピン。
 * ピンの顔ぶれが変わったときだけ表示範囲を合わせ直す
 * （毎回合わせると、利用者が動かした地図を奪ってしまう）。
 */
export function paintMap(ranked, osmSites, onPick) {
  if (!map || !layer) return 0;
  layer.clearLayers();

  const points = [];
  ranked.forEach((r, i) => {
    marker(r.site, i < 3 ? 'top' : 'normal', onPick).addTo(layer);
    points.push([r.site.lat, r.site.lon]);
  });
  for (const o of osmSites) {
    marker(o, 'osm', onPick).addTo(layer);
    points.push([o.lat, o.lon]);
  }

  lastPoints = points;
  const key = [...ranked.map((r) => r.site.id), ...osmSites.map((o) => o.id)].join('|');
  if (key !== lastKey && points.length > 0) {
    lastKey = key;
    userMoved = false;
    map.fitBounds(points, FIT_OPTS);
  }
  return points.length;
}

export function focusOn(site) {
  if (!map) return;
  userMoved = true; // 明示的に寄せたので、以後は自動で戻さない
  map.setView([site.lat, site.lon], 12);
}
