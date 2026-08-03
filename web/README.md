# 用户端（Vue 3 + Vant）

面向手机 / 微信内置浏览器。**与旧站 `index.html` 并存**，未切流量前旧站仍是生产。

```bash
cd web && npm install
npm run dev      # 本地开发
npm run build    # 产物在 dist/
```

## 关键决策

- **后端不动**：沿用 `analytics/worker.js`，接口契约完全一致（见 `analytics/README.md`）。
  前端可以独立迁移、灰度切换，后端零改动。
- **微信老内核**：`@vitejs/plugin-legacy` 额外产出一份 ES5 包 + polyfill，
  浏览器按能力择一加载。Vue 3 依赖 `Proxy`，老 X5 / 老 WKWebView 不一定有，这层不能省。
  **上线前必须在真机微信里验一次**，容器里的 Chromium 测不出这个。
- **数据源共用**：构建时把仓库根的 `data/` 复制进 `public/data/`，与旧站同一份内容，
  避免两套各自漂移。数据运行时按需 fetch，不进 JS bundle。
- **Vant 按需引入**：`unplugin-vue-components` + `VantResolver`。
  **不要**再全量 `import 'vant/lib/index.css'` —— 那会让 CSS 从 31KB 涨到 78KB(gz)。
- **hash 路由**：静态托管不用配 rewrite，微信内分享链接也稳。

## 体积（gzip）

现代浏览器首屏相关合计 ≈ 108KB（旧站单文件全量 201KB）。

## 尚未迁移

拼写、测验、对话、语法、发音、数字、连载、徽章、打卡、朗读面板等版块仍只在旧站。
迁移顺序建议见仓库根 `MIGRATION.md`。
