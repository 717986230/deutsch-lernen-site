import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import legacy from '@vitejs/plugin-legacy';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from 'unplugin-vue-components/resolvers';
import { cpSync, existsSync } from 'node:fs';

// 构建前把仓库根目录的 data/ 复制进 public/，用户端与旧站共用同一份数据源，
// 避免两套内容各自漂移。数据仍是运行时按需 fetch，不进 JS bundle。
function copyData() {
  return {
    name: 'copy-data',
    buildStart() {
      if (existsSync('../data')) cpSync('../data', 'public/data', { recursive: true });
      // 旧站的静态资源（打赏二维码等）也一并带过来，避免两处各存一份
      for (const f of ['support-qr.png']) {
        if (existsSync('../' + f)) cpSync('../' + f, 'public/' + f);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    copyData(),
    vue(),
    Components({ resolvers: [VantResolver()] }),   // Vant 组件按需引入，不全量打包
    // 微信 X5 / 老 iOS WKWebView 不一定支持 Vue 3 依赖的 Proxy 等特性，
    // legacy 会额外产出一份 ES5 包 + polyfill，由浏览器按能力择一加载。
    legacy({
      targets: ['chrome >= 51', 'ios >= 10', 'android >= 5'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
    }),
  ],
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: { format: { safari10: true }, mangle: { safari10: true } },
    rollupOptions: {
      output: {
        manualChunks: { vue: ['vue', 'vue-router', 'pinia'], vant: ['vant'] },
      },
    },
  },
});
