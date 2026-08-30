// 条件パネル。値の解釈はしない — 変更を criteria として通知するだけ。

import { SCENERIES } from '../lib/data/campsites.js';

const PARTY = [
  ['solo', 'ソロ'],
  ['couple', '2人'],
  ['family', '家族'],
  ['group', 'グループ'],
];
const FIRE = [
  ['none', 'こだわらない'],
  ['stand', '焚き火したい'],
  ['ground', '直火がいい'],
];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function chipGroup(label, name, options, current) {
  const chips = options
    .map(([value, text]) => {
      const pressed = String(current) === String(value);
      return `<button class="chip" type="button" data-name="${name}" data-value="${value}" aria-pressed="${pressed}">${text}</button>`;
    })
    .join('');
  return `<div class="ctl"><label>${label}</label><div class="chips">${chips}</div></div>`;
}

export function renderControls(root, criteria, onChange) {
  root.innerHTML = `
    ${chipGroup('だれと', 'party', PARTY, criteria.party)}
    ${chipGroup('移動', 'hasCar', [['true', '車で行く'], ['false', '電車とバス']], criteria.hasCar)}
    ${chipGroup('焚き火', 'fire', FIRE, criteria.fire)}
    ${chipGroup('景色', 'scenery', [['', 'どこでも'], ...SCENERIES.map((s) => [s, s])], criteria.scenery ?? '')}
    ${chipGroup('いつ', 'month', MONTHS.map((m) => [m, `${m}月`]), criteria.month)}
    <div class="ctl">
      <label>ほかの条件</label>
      <div class="chips">
        <button class="chip" type="button" data-name="pet" data-value="toggle" aria-pressed="${criteria.pet === true}">犬を連れる</button>
        <button class="chip" type="button" data-name="tebura" data-value="toggle" aria-pressed="${criteria.tebura === true}">手ぶらで行く</button>
      </div>
    </div>
    <div class="ctl">
      <label>1人あたりの上限</label>
      <div class="slider">
        <input type="range" id="budget" min="0" max="10000" step="500" value="${criteria.budget ?? 10000}" />
        <output id="budget-out"></output>
      </div>
    </div>
    <div class="ctl">
      <label>出発時刻</label>
      <div class="slider">
        <input type="range" id="depart" min="5" max="18" step="1" value="${criteria.departHour ?? 9}" />
        <output id="depart-out"></output>
      </div>
    </div>
  `;

  const budget = root.querySelector('#budget');
  const budgetOut = root.querySelector('#budget-out');
  const depart = root.querySelector('#depart');
  const departOut = root.querySelector('#depart-out');

  const paintOutputs = () => {
    budgetOut.textContent = Number(budget.value) >= 10000 ? '上限なし' : `${Number(budget.value).toLocaleString('ja-JP')}円まで`;
    departOut.textContent = `${depart.value}時に出発`;
  };
  paintOutputs();

  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const { name, value } = chip.dataset;
    if (value === 'toggle') {
      onChange({ [name]: chip.getAttribute('aria-pressed') !== 'true' });
      return;
    }
    if (name === 'hasCar') onChange({ hasCar: value === 'true' });
    else if (name === 'month') onChange({ month: Number(value) });
    else if (name === 'scenery') onChange({ scenery: value === '' ? null : value });
    else onChange({ [name]: value });
  });

  const onSlide = () => {
    paintOutputs();
    onChange({
      budget: Number(budget.value) >= 10000 ? null : Number(budget.value),
      departHour: Number(depart.value),
    });
  };
  budget.addEventListener('input', onSlide);
  depart.addEventListener('input', onSlide);
}
