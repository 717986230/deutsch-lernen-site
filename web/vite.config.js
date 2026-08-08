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
  // 产物输出到 web/dist（已在 .gitignore 里），**不再直接落到仓库根**。
  // 之前 outDir:'..' 会把仓库根当构建目录，而文件名带内容哈希：每构建一次就留一批
  // 上一版的孤儿文件，仓库根很快堆了几百个没人引用的 assets/*.js，还得手工分辨哪些是死的。
  // emptyOutDir 保持默认(true)，每次构建自清，从源头杜绝孤儿。
  // 上线由 deploy.sh 把 dist/ 拷到仓库根（它本来就按 web/dist 写的，这下两边终于一致）。
  build: {
    outDir: 'dist',
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: { vue: ['vue', 'vue-router', 'pinia'], vant: ['vant'] },
      },
    },
  },
});
