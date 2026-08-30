// Overpass API は vercel.app からのブラウザ直叩きを遮断する（CORS ヘッダを返さない）。
// 同一オリジンのサーバ経由にして回避する。dev では vite.config.js の proxy が同じ道を作る。

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST のみ' });
    return;
  }

  const query = typeof req.body === 'string' ? req.body : String(req.body ?? '');
  if (!query.includes('out:json')) {
    res.status(400).json({ error: 'Overpass QL が不正' });
    return;
  }

  try {
    const upstream = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'User-Agent': 'tomaribi/0.1 (https://tomaribi.vercel.app)',
      },
      body: query,
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: `overpass ${upstream.status}` });
      return;
    }

    const json = await upstream.json();
    // OSM のデータは頻繁には変わらないので、1時間キャッシュして上流への負荷を下げる
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(json);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
