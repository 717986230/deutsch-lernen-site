import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
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
  ],
  // 目标浏览器：现代桌面/移动浏览器。**不再支持微信内置浏览器**（站长 2026-08 决定），
  // 因此不再产出 ES5 legacy 包 —— 那套 polyfill 有 195KB(gz)，比现代包本身还大。
  // 产物直接输出到仓库根 —— GitHub Pages 服务的就是这里，推 main 即上线。
  // 根目录还包含仓库文档和后端目录，不能让 Vite 清空整个仓库。
  build: {
    outDir: '..',
    emptyOutDir: false,
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: { vue: ['vue', 'vue-router', 'pinia'], vant: ['vant'] },
      },
    },
  },
});
