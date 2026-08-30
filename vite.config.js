import { defineConfig } from 'vite';
import { fetchOverpass } from './api/_overpass-upstream.js';

// dev でも本番と同じ /api/overpass を叩けるようにする。
// 経路を1本に揃えておかないと「dev では動くのに本番だけ壊れる」が起きる。
function overpassDev() {
  return {
    name: 'overpass-dev',
    configureServer(server) {
      server.middlewares.use('/api/overpass', async (_req, res) => {
        try {
          const json = await fetchOverpass();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(json));
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String(e && e.message ? e.message : e) }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [overpassDev()],
  server: { port: 5630, strictPort: true },
});
