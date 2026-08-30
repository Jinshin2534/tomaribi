// お気に入り。localStorage を直接触らず、{getItem,setItem} を受け取る。
// プライベートモードや容量超過で例外が飛んでも、アプリ全体は落とさない。

export const KEY = 'tomaribi:favorites';

export function toggle(ids, id) {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

export function load(store) {
  if (!store) return [];
  let raw;
  try {
    raw = store.getItem(KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === 'string');
  } catch {
    return [];
  }
}

export function save(store, ids) {
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(ids));
  } catch {
    // 保存できなくても操作は続けられる
  }
}
