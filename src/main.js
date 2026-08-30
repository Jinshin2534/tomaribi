// 配線だけ。判定は src/lib、描画は src/ui。

import { CAMPSITES } from './lib/data/campsites.js';
import { filterSites, disqualify } from './lib/filter.js';
import { rankSites } from './lib/score.js';
import { summarizeWeek } from './lib/weather.js';
import { toggle as toggleFav, load as loadFav, save as saveFav } from './lib/favorites.js';
import { normalizeElements, mergeWithKnown, buildQuery } from './lib/overpass.js';
import { renderControls } from './ui/controls.js';
import { renderList } from './ui/list.js';
import { renderDetail } from './ui/detail.js';
import { renderCompare } from './ui/compare-view.js';
import { initMap, paintMap, focusOn } from './ui/map.js';
import { fetchDaily } from './ui/weather-fetch.js';

const store = (() => {
  try { return window.localStorage; } catch { return null; }
})();

const state = {
  criteria: {
    party: 'couple', hasCar: true, fire: 'stand', scenery: null,
    month: new Date().getMonth() + 1, departHour: 9, pet: false, tebura: false, budget: null,
  },
  ranked: [],
  osm: [],
  favorites: loadFav(store),
  compare: [],
  openId: null,
  weather: {}, // id -> 'loading' | 'error' | week[]
};

const app = document.getElementById('app');
app.innerHTML = `
  <header class="masthead">
    <h1><span class="flame">と</span>まり火</h1>
    <p>東京で泊まれる場所を、条件から探す</p>
  </header>
  <section class="controls" id="controls"></section>
  <nav class="tabs" id="tabs">
    <button class="chip" type="button" data-view="list" aria-pressed="true">一覧</button>
    <button class="chip" type="button" data-view="map" aria-pressed="false">地図</button>
  </nav>
  <main class="main" id="main" data-view="list">
    <div class="map-pane" id="map"></div>
    <div class="list-pane">
      <div class="toolbar">
        <button class="btn" id="more">もっと探す（OSM）</button>
        <button class="btn" id="show-compare" disabled>くらべる</button>
        <button class="btn" id="only-fav" aria-pressed="false">★だけ</button>
        <span class="note" id="toolbar-note"></span>
      </div>
      <div id="list"></div>
    </div>
  </main>
  <div id="overlay"></div>
`;

const controlsRoot = document.getElementById('controls');
const listRoot = document.getElementById('list');
const overlay = document.getElementById('overlay');
const noteEl = document.getElementById('toolbar-note');
const compareBtn = document.getElementById('show-compare');
const mainEl = document.getElementById('main');
const tabsEl = document.getElementById('tabs');

function setView(view) {
  mainEl.dataset.view = view;
  for (const b of tabsEl.querySelectorAll('[data-view]')) {
    b.setAttribute('aria-pressed', String(b.dataset.view === view));
  }
  // 隠れているあいだ地図は実寸を測れない。出したところで測り直すが、
  // 1回では Leaflet の内部状態が追いつかないので、描画後にもう一度叩く。
  const remeasure = () => window.dispatchEvent(new Event('resize'));
  remeasure();
  requestAnimationFrame(remeasure);
  setTimeout(remeasure, 250);
  return view;
}

tabsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-view]');
  if (btn) setView(btn.dataset.view);
});
const favBtn = document.getElementById('only-fav');
let onlyFav = false;
let compareOpen = false;

const CLOSED_SITES = CAMPSITES.filter((s) => s.closed);

const headcountFor = (party) => ({ solo: 1, couple: 2, family: 4, group: 6 }[party] ?? 2);
const fullCriteria = () => ({ ...state.criteria, headcount: headcountFor(state.criteria.party) });
const siteById = (id) => CAMPSITES.find((s) => s.id === id) ?? null;

function recompute() {
  const c = fullCriteria();
  let passed = filterSites(CAMPSITES, c);
  if (onlyFav) passed = passed.filter((s) => state.favorites.includes(s.id));
  state.ranked = rankSites(passed, c);
  return state.ranked;
}

function render() {
  renderControls(controlsRoot, state.criteria, setCriteria);
  renderList(listRoot, state.ranked, state.criteria, CAMPSITES.length, CLOSED_SITES);
  paintMap(state.ranked, state.osm, openDetail);
  compareBtn.disabled = state.compare.length !== 2;
  favBtn.setAttribute('aria-pressed', String(onlyFav));
  noteEl.textContent = [
    state.favorites.length ? `★ ${state.favorites.length}` : '',
    state.osm.length ? `OSM ${state.osm.length} 件を地図に追加` : '',
  ].filter(Boolean).join('　');

  if (compareOpen) renderCompare(overlay, siteById(state.compare[0]), siteById(state.compare[1]));
  else if (state.openId) {
    renderDetail(overlay, {
      site: siteById(state.openId),
      criteria: state.criteria,
      week: state.weather[state.openId] ?? null,
      favorite: state.favorites.includes(state.openId),
      compareCount: state.compare.length,
    });
  } else overlay.innerHTML = '';
}

function setCriteria(patch) {
  state.criteria = { ...state.criteria, ...patch };
  recompute();
  render();
}

async function loadWeather(id) {
  const site = siteById(id);
  if (!site || state.weather[id]) return;
  state.weather[id] = 'loading';
  render();
  try {
    state.weather[id] = summarizeWeek(await fetchDaily(site.lat, site.lon));
  } catch {
    state.weather[id] = 'error';
  }
  render();
}

function openDetail(id) {
  state.openId = id;
  compareOpen = false;
  render();
  // render の中で地図を描き直すので、寄せるのはそのあと
  const site = siteById(id);
  if (site) focusOn(site);
  loadWeather(id);
}

function closeOverlay() {
  state.openId = null;
  compareOpen = false;
  render();
}

listRoot.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openDetail(card.dataset.id);
});

overlay.addEventListener('click', (e) => {
  if (e.target.dataset.close) { closeOverlay(); return; }
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'fav') {
    state.favorites = toggleFav(state.favorites, state.openId);
    saveFav(store, state.favorites);
    render();
  } else if (act === 'compare') {
    const next = state.compare.includes(state.openId)
      ? state.compare.filter((x) => x !== state.openId)
      : [...state.compare, state.openId].slice(-2);
    state.compare = next;
    render();
  } else if (act === 'clear-compare') {
    state.compare = [];
    compareOpen = false;
    render();
  }
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlay(); });

compareBtn.addEventListener('click', () => { compareOpen = true; state.openId = null; render(); });
favBtn.addEventListener('click', () => { onlyFav = !onlyFav; recompute(); render(); });

async function loadOverpass() {
  const btn = document.getElementById('more');
  btn.disabled = true;
  btn.textContent = '探しています…';
  try {
    // 直叩きは本番オリジンから遮断されるので、必ず同一オリジンの /api/overpass を通す
    const res = await fetch('/api/overpass', { method: 'POST', body: buildQuery() });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    state.osm = mergeWithKnown(normalizeElements(json.elements), CAMPSITES);
    btn.textContent = `もっと探す（${state.osm.length} 件追加）`;
  } catch {
    btn.textContent = 'OSM を取得できませんでした';
  } finally {
    btn.disabled = false;
    render();
  }
}
document.getElementById('more').addEventListener('click', loadOverpass);

recompute();
render();
initMap(document.getElementById('map')).then(() => render()).catch(() => {
  document.getElementById('map').innerHTML = '<p style="padding:20px;color:#a89c92">地図を読み込めませんでした（一覧と提案はそのまま使えます）</p>';
});

// ヘッドレスからも全経路を通せるようにする
window.__app = {
  state,
  sites: CAMPSITES,
  setCriteria,
  openDetail,
  closeOverlay,
  getResults: () => state.ranked.map((r) => ({ rank: r.rank, id: r.site.id, name: r.site.name, total: r.total })),
  why: (id) => ({ disqualified: disqualify(siteById(id), fullCriteria()), entry: state.ranked.find((r) => r.site.id === id) ?? null }),
  feedWeather: (id, daily) => { state.weather[id] = summarizeWeek(daily); render(); },
  feedOsm: (elements) => { state.osm = mergeWithKnown(normalizeElements(elements), CAMPSITES); render(); },
  setCompare: (ids) => { state.compare = ids.slice(0, 2); render(); },
  openCompare: () => { compareOpen = true; state.openId = null; render(); },
  toggleOnlyFav: () => { onlyFav = !onlyFav; recompute(); render(); return onlyFav; },
  setView,
  favorite: (id) => { state.favorites = toggleFav(state.favorites, id); saveFav(store, state.favorites); render(); return state.favorites; },
  pinCount: () => state.ranked.length + state.osm.length,
};
