// Overpass API は vercel.app からのブラウザ直叩きを遮断する（CORS ヘッダを返さない）ので、
// 同一オリジンのここを経由させる。
//
// リクエストボディは受け取らない。クエリは固定（東京都のキャンプ場）なので、
// サーバ側で組み立てたほうが安全だし、ランタイムのボディ解析にも依存しなくて済む。

import { fetchOverpass } from './_overpass-upstream.js';

export default async function handler(req, res) {
  try {
    const json = await fetchOverpass();
    // OSM のデータは頻繁には変わらない。1時間キャッシュして上流への負荷を下げる。
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json(json);
  } catch (e) {
    res.status(502).json({ error: String(e && e.message ? e.message : e) });
  }
}
