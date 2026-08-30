// 1か所の詳細。アクセス・料金・天気・持ち物を1画面にまとめる。

import { formatPrice, formatMinutes, formatDistance, formatSeason, formatYen } from '../lib/format.js';
import { buildChecklist } from '../lib/checklist.js';
import { VERDICT_LABEL } from '../lib/weather.js';
import { arrivalMargin } from '../lib/access.js';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

function accessSection(site, criteria) {
  const departHour = criteria.departHour ?? 9;
  const margin = arrivalMargin(site, { hasCar: criteria.hasCar !== false, departHour });
  const late = margin !== null && margin < 0;

  const transit = site.transit
    ? `<dt>電車とバス</dt><dd>${site.transit.from}から ${formatMinutes(site.transit.minutes)}
         <ol class="legs">${site.transit.legs.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
         <div class="legs">現地に着ける最終めやす ${site.transit.last_arrival}</div></dd>`
    : '<dt>電車とバス</dt><dd>公共交通では行けない</dd>';

  const car = site.car.available
    ? `<dt>車</dt><dd>${formatMinutes(site.car.minutes)} / ${formatDistance(site.car.distance_km)}・駐車 ${formatYen(site.car.parking_fee)}</dd>`
    : '<dt>車</dt><dd>車では入れない（島など）</dd>';

  return `<section><h4>アクセス</h4><dl class="kv">${transit}${car}</dl>
    ${late ? `<div class="warn-box">${departHour}時に出ると最終到着に間に合いません（${Math.abs(margin)}分の超過）</div>` : ''}</section>`;
}

function weekSection(week) {
  if (week === 'loading') return '<section><h4>この先の夜</h4><p class="bag">天気を読み込んでいます…</p></section>';
  if (week === 'error') return '<section><h4>この先の夜</h4><p class="bag">天気を取得できませんでした（他の情報はそのまま使えます）</p></section>';
  if (!week || week.length === 0) return '';

  const days = week
    .slice(0, 7)
    .map((d) => {
      const md = d.date.slice(5).replace('-', '/');
      const t = d.minTemp === null || d.minTemp === undefined ? '—' : `${Math.round(d.minTemp)}°`;
      return `<div class="day ${d.verdict}"><div class="d">${md}</div><div class="t">${t}</div><div class="v">${VERDICT_LABEL[d.verdict]}</div></div>`;
    })
    .join('');

  const first = week.find((d) => d.sleepingBag !== null);
  const bag = first ? `<p class="bag">夜は予報より冷えます。快適使用温度 ${Math.round(first.sleepingBag)}℃ 以下の寝袋が目安。</p>` : '';
  return `<section><h4>この先の夜（最低気温）</h4><div class="week">${days}</div>${bag}</section>`;
}

function checklistSection(site, criteria, week) {
  const minTemp = Array.isArray(week) && week.length ? week[0].minTemp : null;
  const items = buildChecklist(site, { month: criteria.month, minTemp });
  const byCat = new Map();
  for (const i of items) {
    if (!byCat.has(i.category)) byCat.set(i.category, []);
    byCat.get(i.category).push(i);
  }
  const body = [...byCat]
    .map(([cat, list]) => `<li class="cat">${cat}</li>` + list.map((i) => `<li>${esc(i.text)}${i.note ? `<span class="note">${esc(i.note)}</span>` : ''}</li>`).join(''))
    .join('');
  return `<section><h4>持っていくもの</h4><ul class="checklist">${body}</ul></section>`;
}

export function renderDetail(root, { site, criteria, week, favorite, compareCount }) {
  if (!site) { root.innerHTML = ''; return; }

  const fire = !site.fire.stand ? '不可' : `${site.fire.ground ? '直火OK' : '焚き火台'}${site.fire.wood_sold ? '・薪の現地販売あり' : '・薪は持参'}`;
  const fac = { toilet: 'トイレ', shower: 'シャワー', rental: 'レンタル', shop: '売店', power: '電源' };
  const facText = Object.keys(fac).filter((k) => site.facilities[k]).map((k) => fac[k]).join('・') || 'なし';

  root.innerHTML = `
    <div class="detail-backdrop" data-close="1">
      <div class="detail" role="dialog" aria-label="${esc(site.name)}の詳細">
        <button class="close" data-close="1" aria-label="閉じる">×</button>
        <h2>${esc(site.name)}</h2>
        <div class="where">${esc(site.area)}・${esc(site.city)}　標高 ${site.elevation}m　${esc(site.scenery)}</div>
        <p class="note">${esc(site.note)}</p>
        ${site.closed ? `<div class="warn-box">${esc(site.closed)}</div>` : ''}
        ${!site.verified ? '<div class="warn-box">一次情報での裏取りが未了です。料金と焚き火の可否は公式で確認してください。</div>' : ''}

        <section><h4>基本</h4><dl class="kv">
          <dt>料金</dt><dd>${formatPrice(site.price)}</dd>
          <dt>焚き火</dt><dd>${fire}</dd>
          <dt>設備</dt><dd>${facText}</dd>
          <dt>営業期間</dt><dd>${formatSeason(site.season)}</dd>
          <dt>予約</dt><dd>${site.reservation.required ? '必須' : '不要'}</dd>
        </dl></section>

        ${accessSection(site, criteria)}
        ${weekSection(week)}
        ${checklistSection(site, criteria, week)}

        <div class="actions">
          ${site.reservation.url ? `<a class="btn primary" href="${esc(site.reservation.url)}" target="_blank" rel="noopener">公式・予約を見る</a>` : ''}
          <button class="btn" data-act="fav" aria-pressed="${favorite}">${favorite ? '★ お気に入り' : '☆ お気に入り'}</button>
          <button class="btn" data-act="compare">比較に追加（${compareCount}/2）</button>
        </div>
        ${site.source ? `<p class="bag">出典: ${esc(site.source)}</p>` : ''}
      </div>
    </div>`;
}
