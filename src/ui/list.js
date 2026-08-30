// 提案カードの一覧。順位と理由を出すのが役目。

import { reasonsFor } from '../lib/reasons.js';
import { formatPrice, formatMinutes } from '../lib/format.js';
import { accessBand } from '../lib/access.js';

const BAND_TEXT = { near: '近い', mid: 'そこそこ', far: '遠い' };

function badges(site, criteria) {
  const out = [];
  if (site.transit) out.push(['on', '車なしOK']);
  if (site.fire.ground) out.push(['on', '直火OK']);
  else if (site.fire.stand) out.push(['', '焚き火台OK']);
  if (site.facilities.rental) out.push(['', '手ぶら可']);
  if (site.allows.pet) out.push(['on', 'ペット可']);
  if (site.scenery === '海') out.push(['sea', '海']);
  else out.push(['', site.scenery]);
  if (!site.verified) out.push(['unverified', '未確認']);
  return out.map(([cls, text]) => `<span class="badge ${cls}">${text}</span>`).join('');
}

function card(entry, criteria) {
  const { site, rank, contributions } = entry;
  const { plus, minus } = reasonsFor(contributions, criteria);
  const hasCar = criteria.hasCar !== false;
  const minutes = hasCar ? site.car.minutes : site.transit?.minutes;
  const band = accessBand(site, { hasCar });

  return `
    <article class="card" data-rank="${rank}" data-id="${site.id}" tabindex="0">
      <div class="card-head">
        <span class="rank">${rank}位</span>
        <h3>${site.name}</h3>
        <span class="where">${site.area}・${site.city}</span>
      </div>
      <div class="badges">${badges(site, criteria)}</div>
      <ul class="reasons">
        ${plus.map((t) => `<li class="plus">${t}</li>`).join('')}
        ${minus.map((t) => `<li class="minus">${t}</li>`).join('')}
      </ul>
      <div class="card-foot">
        <span><b>${formatPrice(site.price)}</b></span>
        <span>${hasCar ? '車' : '電車とバス'} <b>${formatMinutes(minutes ?? null)}</b>${band ? `（${BAND_TEXT[band]}）` : ''}</span>
        <span>標高 <b>${site.elevation}m</b></span>
      </div>
    </article>`;
}

/**
 * 休んでいる場所。提案には出さないが、存在ごと隠すと
 * 「地図に載っているのに行けない」を利用者が自力で踏むことになる。
 */
function closedSection(closedSites) {
  if (!closedSites || closedSites.length === 0) return '';
  const rows = closedSites
    .map((s) => `<li><b>${s.name}</b><span>${s.area}・${s.city}</span><em>${s.closed}</em></li>`)
    .join('');
  return `
    <section class="closed-list">
      <h4>いま休んでいる場所（${closedSites.length}）</h4>
      <p>地図サービスには残っていますが、現在は泊まれません。</p>
      <ul>${rows}</ul>
    </section>`;
}

export function renderList(root, ranked, criteria, total, closedSites) {
  const tail = closedSection(closedSites);

  if (ranked.length === 0) {
    root.innerHTML = `
      <div class="empty">
        <b>この条件で泊まれる場所は見つかりませんでした</b>
        条件をひとつ緩めてみてください。<br />
        よくあるのは「直火」「犬を連れる」「1月・2月」「予算の上限」です。
      </div>${tail}`;
    return;
  }
  root.innerHTML =
    `<p class="summary">収録 ${total} か所のうち <b>${ranked.length} か所</b>が条件に合いました</p>` +
    ranked.map((e) => card(e, criteria)).join('') +
    tail;
}
