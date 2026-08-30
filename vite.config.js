import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5630,
    strictPort: true,
    // 本番は api/overpass.js のサーバ関数を通す。dev でも同じ URL で叩けるようにする
    // （Overpass はブラウザからの直叩きを遮断するので、経路を1本に揃えておく）。
    proxy: {
      '/api/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: () => '/api/interpreter',
      },
    },
  },
});
