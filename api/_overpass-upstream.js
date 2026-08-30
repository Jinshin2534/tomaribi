// Overpass への実アクセス。api/overpass.js（本番）と vite.config.js（dev）が共有する。
// クエリは src/lib/overpass.js の buildQuery が唯一の出どころ。

import { buildQuery } from '../src/lib/overpass.js';

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

export async function fetchOverpass() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'User-Agent': 'tomaribi/0.1 (https://tomaribi.vercel.app)',
    },
    body: buildQuery(),
  });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  return res.json();
}
