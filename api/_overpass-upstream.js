// Overpass への実アクセス。api/overpass.js（本番）と vite.config.js（dev）が共有する。
// クエリは src/lib/overpass.js の buildQuery が唯一の出どころ。

import { buildQuery } from '../src/lib/overpass.js';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

// 東京都をエリア名で引くクエリは上流で10秒以上かかることがある。
// 関数側の上限は vercel.json で 30 秒に上げ、こちらでも自前の打ち切りを持って
// ゲートウェイのタイムアウト（504）より先に自分で 502 を返せるようにする。
const ABORT_MS = 25000;

export async function fetchOverpass() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ABORT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'User-Agent': 'tomaribi/0.1 (https://tomaribi.vercel.app)',
      },
      body: buildQuery(),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
