// 比較表。勝った側を色で示す。

import { compareRows } from '../lib/compare.js';

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

export function renderCompare(root, a, b) {
  if (!a || !b) { root.innerHTML = ''; return; }
  const rows = compareRows(a, b)
    .map(
      (r) => `<tr>
        <th>${esc(r.label)}</th>
        <td class="${r.winner === 'a' ? 'win' : ''}">${esc(r.a)}</td>
        <td class="${r.winner === 'b' ? 'win' : ''}">${esc(r.b)}</td>
      </tr>`,
    )
    .join('');

  root.innerHTML = `
    <div class="detail-backdrop" data-close="1">
      <div class="detail" role="dialog" aria-label="比較">
        <button class="close" data-close="1" aria-label="閉じる">×</button>
        <h2>くらべる</h2>
        <table class="compare">
          <thead><tr><th></th><th>${esc(a.name)}</th><th>${esc(b.name)}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="actions"><button class="btn" data-act="clear-compare">選び直す</button></div>
      </div>
    </div>`;
}
