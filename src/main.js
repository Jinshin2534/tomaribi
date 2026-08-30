// 配線だけ。判定は src/lib、描画は src/ui。

import { CAMPSITES } from './lib/data/campsites.js';
import { filterSites, disqualify } from './lib/filter.js';
import { rankSites } from './lib/score.js';
import { renderControls } from './ui/controls.js';
import { renderList } from './ui/list.js';

const state = {
  criteria: { party: 'couple', hasCar: true, fire: 'stand', scenery: null, month: new Date().getMonth() + 1, departHour: 9 },
  ranked: [],
};

const app = document.getElementById('app');
app.innerHTML = `
  <header class="masthead">
    <h1><span class="flame">と</span>まり火</h1>
    <p>東京で泊まれる場所を、条件から探す</p>
  </header>
  <section class="controls" id="controls"></section>
  <main class="main">
    <div class="map-pane" id="map"></div>
    <div class="list-pane" id="list"></div>
  </main>
`;

const controlsRoot = document.getElementById('controls');
const listRoot = document.getElementById('list');

function headcountFor(party) {
  return { solo: 1, couple: 2, family: 4, group: 6 }[party] ?? 2;
}

function recompute() {
  const c = { ...state.criteria, headcount: headcountFor(state.criteria.party) };
  const passed = filterSites(CAMPSITES, c);
  state.ranked = rankSites(passed, c);
  return state.ranked;
}

function render() {
  renderControls(controlsRoot, state.criteria, setCriteria);
  renderList(listRoot, state.ranked, state.criteria, CAMPSITES.length);
}

function setCriteria(patch) {
  state.criteria = { ...state.criteria, ...patch };
  recompute();
  render();
}

recompute();
render();

// ヘッドレスからも全経路を通せるようにする（Phase 7 の検証はこれ無しでは成立しない）
window.__app = {
  state,
  sites: CAMPSITES,
  setCriteria,
  getResults: () => state.ranked.map((r) => ({ rank: r.rank, id: r.site.id, name: r.site.name, total: r.total })),
  why: (id) => {
    const c = { ...state.criteria, headcount: headcountFor(state.criteria.party) };
    const site = CAMPSITES.find((s) => s.id === id);
    return { disqualified: disqualify(site, c), entry: state.ranked.find((r) => r.site.id === id) ?? null };
  },
};
